// Shared HTTP API: Cloudflare D1 in production, SQLite adapter for standalone Node.
export class ApiError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new ApiError(status,message)};
const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const now=()=>new Date().toISOString();
const branches=['daegu','uiseong'];
const services=['개인 상담','부부 · 가족 상담','트라우마 상담','청소년 상담','아동 · 놀이 상담','집단 프로그램'];
function db(env){if(!env.DB)fail(503,'저장소 연결을 확인하고 다시 시도해 주세요.');return env.DB;}
const stmt=(env,sql,...values)=>db(env).prepare(sql).bind(...values);
const first=(env,sql,...values)=>stmt(env,sql,...values).first();
const run=(env,sql,...values)=>stmt(env,sql,...values).run();
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function isAdmin(request,env){
 if(env.AUTH_MODE==='sites'){
  const email=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  return !!request.headers.get('oai-authenticated-user-id') && !!email && (env.ADMIN_EMAILS||'').toLowerCase().split(',').map(s=>s.trim()).includes(email);
 }
 const expected=env.ADMIN_TOKEN; const actual=request.headers.get('authorization')?.replace(/^Bearer /,'');
 return !!expected&&expected.length>=32&&!!actual&&await sha(actual)===await sha(expected);
}
async function requireAdmin(req,env){if(!await isAdmin(req,env))fail(403,'관리자 인증이 필요합니다.');}
async function body(req){if(!req.headers.get('content-type')?.includes('application/json'))fail(415,'JSON 요청이 필요합니다.');const t=await req.text();if(t.length>12000)fail(413,'입력 내용이 너무 깁니다.');try{return JSON.parse(t)}catch{fail(400,'요청 형식이 올바르지 않습니다.')}}
function text(v,min,max,label){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,`${label}을 확인해 주세요.`);return v.trim();}
function date(v,allowPast=false){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail(400,'날짜를 확인해 주세요.');const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);if((!allowPast&&v<today)||Date.parse(v)>Date.now()+366*86400000)fail(400,'오늘부터 1년 이내 날짜를 선택해 주세요.');return v;}
function money(v){if(!Number.isSafeInteger(v)||v<100||v>10000000)fail(400,'금액은 100원 이상 1천만원 이하의 정수로 입력해 주세요.');return v;}
async function settings(env){const r=await stmt(env,'SELECT key,value FROM settings').all();const o=Object.fromEntries(r.results.map(x=>[x.key,x.value]));return {privacyRetention:o.privacyRetention||env.PRIVACY_RETENTION_TEXT||'',paymentTerms:o.paymentTerms||env.PAYMENT_TERMS_TEXT||''};}
function paymentReady(env,config){return !!env.TOSS_CLIENT_KEY&&!!env.TOSS_SECRET_KEY&&!!config.paymentTerms&&!!env.PUBLIC_ORIGIN;}
async function limited(req,env){const ip=req.headers.get('cf-connecting-ip')||req.headers.get('oai-authenticated-user-id')||'local';const hour=Math.floor(Date.now()/3600000);const id=await sha(`${hour}:${ip}`);const r=await first(env,'INSERT INTO request_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',id,(hour+2)*3600000);if(r.count>20)fail(429,'신청이 많습니다. 잠시 후 다시 시도해 주세요.');await run(env,'DELETE FROM request_limits WHERE expires<?',Date.now());}
async function own(req,env,id){const token=req.headers.get('x-booking-token');if(!token||!/^[a-f0-9]{64}$/.test(token))fail(404,'예약 조회 정보를 확인해 주세요.');const b=await first(env,'SELECT * FROM bookings WHERE id=? AND token_hash=?',id,await sha(token));if(!b)fail(404,'예약 조회 정보를 확인해 주세요.');return b;}
function publicBooking(b){const {token_hash,name,phone,...rest}=b;return rest;}
async function provider(env,path,data,idempotency){const init={method:data?'POST':'GET',headers:{Authorization:`Basic ${btoa(env.TOSS_SECRET_KEY+':')}`,'Content-Type':'application/json',...(idempotency?{'Idempotency-Key':idempotency}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(15000)};const response=await (env.PAYMENT_FETCH||fetch)(`https://api.tosspayments.com/v1/payments${path}`,init);let value;try{value=await response.json()}catch{throw new ApiError(502,'결제기관 응답을 확인하지 못했습니다. 다시 조회해 주세요.');}return {ok:response.ok,value};}
async function markPaid(env,o,p){if(p.status!=='DONE'||p.orderId!==o.id||p.totalAmount!==o.amount||p.currency!=='KRW')fail(409,'결제기관의 승인 정보가 주문과 일치하지 않습니다. 관리자에게 문의해 주세요.');await db(env).batch([stmt(env,"UPDATE orders SET status='paid',payment_key=? WHERE id=?",p.paymentKey,o.id),stmt(env,"UPDATE bookings SET payment_status='paid',updated_at=? WHERE id=?",now(),o.booking_id)]);}
async function reconcile(env,o){if(!o.payment_key)fail(409,'결제 키가 없습니다.');const r=await provider(env,`/${encodeURIComponent(o.payment_key)}`);if(!r.ok)fail(502,'결제기관에서 상태를 조회하지 못했습니다.');if(r.value.status==='DONE'){await markPaid(env,o,r.value);return 'paid';}if(r.value.status==='CANCELED'&&r.value.orderId===o.id&&r.value.totalAmount===o.amount){await db(env).batch([stmt(env,"UPDATE orders SET status='refunded' WHERE id=?",o.id),stmt(env,"UPDATE bookings SET payment_status='refunded',status='cancelled',updated_at=? WHERE id=?",now(),o.booking_id)]);return 'refunded';}if(['ABORTED','EXPIRED'].includes(r.value.status)){await run(env,"UPDATE orders SET status='failed' WHERE id=?",o.id);return 'failed';}return 'processing';}
export async function handleApi(req,env){try{
 const u=new URL(req.url),path=u.pathname,method=req.method;
 if(!['GET','HEAD'].includes(method)){const origin=req.headers.get('origin');if(!origin||origin!==(env.PUBLIC_ORIGIN||u.origin))fail(403,'허용되지 않은 요청입니다.');}
 if(path==='/api/config'&&method==='GET'){const c=await settings(env);return json({...c,bookingEnabled:!!c.privacyRetention,authMode:env.AUTH_MODE||'token',paymentEnabled:paymentReady(env,c),paymentMode:env.TOSS_CLIENT_KEY?.startsWith('test_')?'test':'live'});}
 if(path==='/api/bookings'&&method==='POST'){
  const c=await settings(env);if(!c.privacyRetention)fail(503,'온라인 접수 준비 중입니다. 전화로 문의해 주세요.');
  const b=await body(req);if(b.consent!==true)fail(400,'개인정보 수집·이용 동의가 필요합니다.');
  const name=text(b.name,2,50,'이름'),phone=text(b.phone,9,20,'전화번호').replace(/[-\s]/g,'');if(!/^0\d{8,10}$/.test(phone))fail(400,'전화번호를 확인해 주세요.');
  if(!branches.includes(b.branch)||!services.includes(b.service))fail(400,'지점과 상담 분야를 선택해 주세요.');
  const preferred=date(b.preferredDate);if(!['오전','오후','저녁','협의'].includes(b.preferredTime))fail(400,'희망 시간대를 선택해 주세요.');
  const token=text(b.requestToken,64,64,'요청 키');if(!/^[a-f0-9]{64}$/.test(token))fail(400,'요청 키가 올바르지 않습니다.');const hash=await sha(token);
  const existing=await first(env,'SELECT id FROM bookings WHERE token_hash=?',hash);if(existing)return json({id:existing.id,token},200);
  await limited(req,env);const id=crypto.randomUUID(),time=now();await run(env,'INSERT INTO bookings(id,token_hash,name,phone,branch,service,preferred_date,preferred_time,consent_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,hash,name,phone,b.branch,b.service,preferred,b.preferredTime,`v1:${c.privacyRetention}`,time,time);return json({id,token},201);
 }
 let m=path.match(/^\/api\/bookings\/([a-z0-9-]+)$/);
 if(m&&method==='GET')return json({booking:publicBooking(await own(req,env,m[1]))});
 m=path.match(/^\/api\/bookings\/([a-z0-9-]+)\/order$/);
 if(m&&method==='POST'){
  const b=await own(req,env,m[1]),c=await settings(env);if(!paymentReady(env,c))fail(503,'온라인 결제 준비 중입니다. 전화로 문의해 주세요.');
  if(b.status!=='confirmed'||b.payment_status!=='unpaid'||!b.amount)fail(409,'일정과 금액 확인 후 결제할 수 있습니다.');
  const current=await first(env,"SELECT * FROM orders WHERE booking_id=? AND status IN ('ready','processing','paid','refunding')",b.id);
  if(current&&current.status!=='ready')fail(409,'결제 상태를 확인 중입니다. 중복 결제하지 말고 관리자에게 문의해 주세요.');
  let order=current;if(!order){const id='order_'+crypto.randomUUID().replaceAll('-','');await run(env,"INSERT OR IGNORE INTO orders(id,booking_id,amount,status,created_at) SELECT ?,id,amount,'ready',? FROM bookings WHERE id=? AND status='confirmed' AND payment_status='unpaid'",id,now(),b.id);order=await first(env,"SELECT * FROM orders WHERE booking_id=? AND status='ready'",b.id);}
  if(!order)fail(409,'예약이 변경되었습니다. 새로고침해 주세요.');
  return json({orderId:order.id,amount:order.amount,orderName:'상담 예약',customerKey:b.id,clientKey:env.TOSS_CLIENT_KEY,origin:env.PUBLIC_ORIGIN,terms:c.paymentTerms});
 }
 if(path==='/api/payments/confirm'&&method==='POST'){
  const x=await body(req),b=await own(req,env,text(x.bookingId,1,64,'예약번호'));
  const o=await first(env,'SELECT * FROM orders WHERE id=? AND booking_id=?',text(x.orderId,6,64,'주문번호'),b.id);if(!o||o.amount!==Number(x.amount))fail(400,'주문 금액이 일치하지 않습니다.');
  const key=text(x.paymentKey,1,200,'결제 키');if(o.status==='paid')return json({status:'paid'});
  if(!env.TOSS_SECRET_KEY)fail(503,'결제 연결을 확인해 주세요.');
  if(o.status==='processing'){if(o.payment_key!==key)fail(409,'진행 중인 결제가 있습니다.');const state=await reconcile(env,o);if(state!=='processing')return json({status:state});const retry=await provider(env,'/confirm',{paymentKey:key,orderId:o.id,amount:o.amount},o.id);if(retry.ok){await markPaid(env,o,retry.value);return json({status:'paid'});}fail(409,'결제 상태를 확인 중입니다. 관리자에게 문의해 주세요.');}
  if(o.status!=='ready'||b.status!=='confirmed'||b.payment_status!=='unpaid'||b.amount!==o.amount)fail(409,'결제할 수 없는 주문입니다.');
  const claim=await run(env,"UPDATE orders SET status='processing',payment_key=? WHERE id=? AND status='ready'",key,o.id);if(!claim.meta.changes)fail(409,'결제가 처리 중입니다.');
  const result=await provider(env,'/confirm',{paymentKey:key,orderId:o.id,amount:o.amount},o.id);
  if(!result.ok){const current=await first(env,'SELECT * FROM orders WHERE id=?',o.id);const status=await reconcile(env,current);if(status==='paid')return json({status});fail(409,'결제가 완료되지 않았습니다. 관리자에게 상태 확인을 요청해 주세요.');}
  await markPaid(env,o,result.value);return json({status:'paid'});
 }
 if(path.startsWith('/api/admin')){
  await requireAdmin(req,env);
  if(path==='/api/admin/me'&&method==='GET')return json({admin:true,authMode:env.AUTH_MODE||'token'});
  if(path==='/api/admin/settings'&&method==='GET')return json({...await settings(env),keysConfigured:!!env.TOSS_CLIENT_KEY&&!!env.TOSS_SECRET_KEY});
  if(path==='/api/admin/settings'&&method==='POST'){const x=await body(req);const a=text(x.privacyRetention,0,1000,'보유 기간'),b=text(x.paymentTerms,0,3000,'취소·환불 기준');await db(env).batch([stmt(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','privacyRetention',a),stmt(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','paymentTerms',b)]);return json({saved:true});}
  if(path==='/api/admin/bookings'&&method==='GET'){const page=Math.max(0,Math.min(100000,parseInt(u.searchParams.get('page')||'0')||0));const branch=u.searchParams.get('branch');const where=branches.includes(branch)?' WHERE branch=?':'';const values=where?[branch]:[];const r=await stmt(env,`SELECT id,name,phone,branch,service,preferred_date,preferred_time,status,scheduled_date,scheduled_time,amount,payment_status,created_at FROM bookings${where} ORDER BY created_at DESC LIMIT 51 OFFSET ?`,...values,page*50).all();return json({items:r.results.slice(0,50),hasMore:r.results.length>50,page});}
  m=path.match(/^\/api\/admin\/bookings\/([a-z0-9-]+)$/);
  if(m&&method==='PATCH'){
   const x=await body(req),b=await first(env,'SELECT * FROM bookings WHERE id=?',m[1]);if(!b)fail(404,'예약을 찾을 수 없습니다.');
   if(!['requested','confirmed','completed','cancelled'].includes(x.status))fail(400,'예약 상태를 확인해 주세요.');
   const busy=await first(env,"SELECT id FROM orders WHERE booking_id=? AND status IN ('ready','processing','refunding')",b.id);if(busy)fail(409,'결제 주문이 진행 중입니다. 결제 상태를 확인한 후 변경해 주세요.');
   if(b.payment_status==='paid'&&x.status==='cancelled')fail(409,'결제된 예약은 환불 처리로 취소해 주세요.');
   if(b.status==='cancelled'&&x.status!=='cancelled')fail(409,'취소된 예약은 새로 신청해 주세요.');
   let d=null,t=null,amount=null;
   if(['confirmed','completed'].includes(x.status)){d=date(x.scheduledDate,x.status==='completed'||x.scheduledDate===b.scheduled_date);t=text(x.scheduledTime,5,5,'확정 시간');if(!/^(0[9]|1\d|20):00$/.test(t))fail(400,'확정 시간은 09~20시 정각으로 선택해 주세요.');amount=money(x.amount);}
   if(b.payment_status==='paid'&&amount!==b.amount)fail(409,'결제된 금액은 변경할 수 없습니다.');
   try{const updated=await run(env,"UPDATE bookings SET status=?,scheduled_date=?,scheduled_time=?,amount=?,updated_at=? WHERE id=? AND updated_at=? AND NOT EXISTS(SELECT 1 FROM orders WHERE booking_id=? AND status IN ('ready','processing','refunding'))",x.status,d,t,amount,now(),b.id,b.updated_at,b.id);if(!updated.meta.changes)fail(409,'다른 변경 또는 결제 요청이 있습니다. 새로고침해 주세요.');}catch(e){if(String(e).includes('UNIQUE'))fail(409,'해당 지점의 시간에 이미 확정된 예약이 있습니다.');throw e;}return json({saved:true});
  }
  m=path.match(/^\/api\/admin\/bookings\/([a-z0-9-]+)\/release-order$/);
  if(m&&method==='POST'){const r=await run(env,"UPDATE orders SET status='void' WHERE booking_id=? AND status='ready'",m[1]);if(!r.meta.changes)fail(409,'닫을 수 있는 미승인 주문이 없습니다. 승인 처리 중인 주문은 결제 상태를 조회해 주세요.');return json({saved:true});}
  m=path.match(/^\/api\/admin\/bookings\/([a-z0-9-]+)\/reconcile$/);
  if(m&&method==='POST'){const o=await first(env,"SELECT * FROM orders WHERE booking_id=? AND status IN ('processing','refunding','paid') ORDER BY created_at DESC LIMIT 1",m[1]);if(!o)fail(409,'조회할 결제가 없습니다.');return json({status:await reconcile(env,o)});}
  m=path.match(/^\/api\/admin\/bookings\/([a-z0-9-]+)\/refund$/);
  if(m&&method==='POST'){
   const x=await body(req);const reason=text(x.reason,2,100,'환불 사유');if(x.confirm!==true)fail(400,'전액 환불 확인이 필요합니다.');const o=await first(env,"SELECT * FROM orders WHERE booking_id=? AND status='paid'",m[1]);if(!o)fail(409,'환불할 결제가 없습니다.');if(!env.TOSS_SECRET_KEY)fail(503,'결제 키가 필요합니다.');
   const claim=await run(env,"UPDATE orders SET status='refunding' WHERE id=? AND status='paid'",o.id);if(!claim.meta.changes)fail(409,'환불 처리가 진행 중입니다.');
   const r=await provider(env,`/${encodeURIComponent(o.payment_key)}/cancel`,{cancelReason:reason},'refund_'+o.id);if(!r.ok)fail(502,'환불 상태를 확인하지 못했습니다. 결제 상태 조회를 눌러 확인해 주세요.');return json({status:await reconcile(env,o)});
  }
  m=path.match(/^\/api\/admin\/bookings\/([a-z0-9-]+)\/anonymize$/);
  if(m&&method==='POST'){const x=await body(req);if(x.confirm!==true)fail(400,'연락정보 삭제 확인이 필요합니다.');const b=await first(env,'SELECT * FROM bookings WHERE id=?',m[1]);if(!b||!['completed','cancelled'].includes(b.status))fail(409,'종료 또는 취소된 예약만 연락정보를 삭제할 수 있습니다.');await run(env,"UPDATE bookings SET name='삭제됨',phone='',updated_at=? WHERE id=?",now(),b.id);return json({saved:true});}
 }
 fail(404,'요청한 기능을 찾을 수 없습니다.');
}catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);console.error('API request failed',e.name);return json({error:'요청을 처리하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요.'},503);}}

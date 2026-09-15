import {api,bookingLink} from './shared.js';
const p=new URLSearchParams(location.search),message=document.querySelector('#result-message');let pending;try{pending=JSON.parse(sessionStorage.getItem('pending-payment'));}catch{}
const back=document.querySelector('#back-booking');if(pending)back.href=bookingLink(pending.id,pending.token);
async function confirm(){document.querySelector('#retry-confirm').hidden=true;if(!pending){message.textContent='이 브라우저에서 예약 조회 정보를 찾지 못했습니다. 보관한 조회 링크에서 예약 상태를 확인해 주세요.';return;}
 if(p.has('failed')){message.textContent='결제가 완료되지 않았습니다. 예약 상태를 확인하고 다시 시도해 주세요.';return;}
 if(!p.get('paymentKey')||!p.get('orderId')||!p.get('amount')){message.textContent='결제 결과 정보가 없습니다. 예약 조회 화면에서 다시 확인해 주세요.';return;}
 try{const r=await api('/api/payments/confirm',{method:'POST',headers:{'X-Booking-Token':pending.token},body:JSON.stringify({bookingId:pending.id,paymentKey:p.get('paymentKey'),orderId:p.get('orderId'),amount:Number(p.get('amount'))})});message.textContent=r.status==='paid'?'결제가 완료되었습니다. 예약 조회 화면에서 확정된 일정을 확인해 주세요.':'결제기관의 처리 상태를 확인 중입니다. 중복 결제하지 말고 잠시 후 다시 확인해 주세요.';if(r.status!=='paid')document.querySelector('#retry-confirm').hidden=false;else{history.replaceState(null,'','/payment-result');sessionStorage.removeItem('pending-payment');}}catch(e){message.textContent=e.message;document.querySelector('#retry-confirm').hidden=false;}}
document.querySelector('#retry-confirm').addEventListener('click',confirm);await confirm();

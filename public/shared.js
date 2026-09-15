export async function api(path,options={}){const r=await fetch(path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});let data;try{data=await r.json()}catch{throw new Error('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');}if(!r.ok)throw new Error(data.error||'요청을 처리하지 못했습니다.');return data;}
export const statusLabel={requested:'접수 대기',confirmed:'예약 확정',completed:'상담 종료',cancelled:'예약 취소'};
export const payLabel={unpaid:'미결제',paid:'결제 완료',refunded:'환불 완료'};
export const branchLabel={daegu:'대구',uiseong:'의성점'};
export const won=n=>n===null?'확인 중':Number(n).toLocaleString('ko-KR')+'원';
export function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
export function bookingLink(id,token){return `${new URL("booking.html",location.href).href.split("#")[0]}#id=${encodeURIComponent(id)}&token=${token}`;}
export async function copy(value,message){try{await navigator.clipboard.writeText(value);message.textContent='복사했습니다.';}catch{message.textContent='자동 복사를 사용할 수 없습니다. 주소창의 링크를 직접 복사해 주세요.';}}

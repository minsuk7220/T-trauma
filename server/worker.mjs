import { handleApi } from './api.mjs';
import { assets } from './assets.mjs';
export default {async fetch(request,env){
 const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return handleApi(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const route={'/':'/index.html','/reservation':'/reservation.html','/booking':'/booking.html','/payment-result':'/payment-result.html','/admin':'/admin.html'}[url.pathname]||url.pathname;
 const a=assets[route];if(!a)return new Response('페이지를 찾을 수 없습니다.',{status:404});
 const data=Uint8Array.from(atob(a.data),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:data,{headers:{'Content-Type':a.type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}});
}};

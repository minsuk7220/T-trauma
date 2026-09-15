import http from 'node:http';import fs from 'node:fs';import worker from '../dist/server/index.js';import {openDB} from './sqlite-adapter.mjs';
fs.mkdirSync('.data',{recursive:true});const DB=openDB('.data/reservations.sqlite');
const port=Number(process.env.PORT||3000);const env={...process.env,AUTH_MODE:'token',DB};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,process.env.PUBLIC_ORIGIN||`http://localhost:${port}`);const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v&&!k.startsWith('oai-')&&!k.startsWith('cf-'))headers.set(k,Array.isArray(v)?v.join(','):v);
 let payload; if(!['GET','HEAD'].includes(req.method)){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>20000){res.writeHead(413);res.end('Request too large');return;}chunks.push(c);}payload=Buffer.concat(chunks);}
 const r=await worker.fetch(new Request(url,{method:req.method,headers,body:payload}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Server error');}
}).listen(port,'127.0.0.1',()=>console.log(`http://localhost:${port} — use HTTPS reverse proxy for public hosting.`));

import fs from 'node:fs';import path from 'node:path';
// All browser assets are embedded so the Worker is portable without an asset binding.
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const assets={};for(const file of fs.readdirSync('public')){const ext=path.extname(file);if(types[ext])assets['/'+file]={type:types[ext],data:fs.readFileSync('public/'+file).toString('base64')};}
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist/server',{recursive:true});
fs.writeFileSync('dist/server/assets.mjs','export const assets='+JSON.stringify(assets)+';\n');
fs.copyFileSync('server/api.mjs','dist/server/api.mjs');fs.copyFileSync('server/worker.mjs','dist/server/index.js');
fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built Worker and '+Object.keys(assets).length+' browser assets.');

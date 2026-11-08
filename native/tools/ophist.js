const c=require('./arbcap.js').read(require('fs').readFileSync(process.argv[2]));const h={};for(const o of c.ops)h[o.name]=(h[o.name]||0)+1;console.log(c.ops.length,JSON.stringify(h));
const sh=c.ops.filter(o=>o.name==='shaderSource');console.log('shaders',sh.length);

// Turns the game's WebGL2 (GLSL ES 3.00) shaders found in one or more captures into Vulkan SPIR-V + a manifest ("shaders.pack").
// usage: node gen-vk-shaders.js <glslang binary> <out.pack> <capture.arbcap> [more captures]
const fs=require('fs'),cp=require('child_process'),path=require('path'),os=require('os');
const {read}=require('./arbcap.js');
let ARGS=process.argv.slice(2),JSOUT=null;{const j=ARGS.indexOf('--js');if(j>=0){JSOUT=ARGS[j+1];ARGS.splice(j,2)}}
const [GLSLANG,OUT,...CAPS]=ARGS;
if(!GLSLANG||!OUT||!CAPS.length){console.error('usage: node gen-vk-shaders.js <glslang> <out.pack> <capture...> [--js manifest.js]');process.exit(1)}
const MASK=(1n<<64n)-1n;
function fnv(s){let h=0xcbf29ce484222325n;for(const b of Buffer.from(s,'utf8')){h^=BigInt(b);h=(h*0x100000001b3n)&MASK}return h}
const TYPES={float:{id:0,sz:4,al:4,n:1},int:{id:1,sz:4,al:4,n:1},bool:{id:1,sz:4,al:4,n:1},vec2:{id:2,sz:8,al:8,n:2},vec3:{id:3,sz:12,al:16,n:3},vec4:{id:4,sz:16,al:16,n:4},
 ivec2:{id:5,sz:8,al:8,n:2},ivec3:{id:6,sz:12,al:16,n:3},ivec4:{id:7,sz:16,al:16,n:4},mat3:{id:8,sz:48,al:16,n:9},mat4:{id:9,sz:64,al:16,n:16},uint:{id:10,sz:4,al:4,n:1}};
const SAMP={sampler2D:0,sampler2DArray:1,sampler3D:2};
function parse(src,stage){
 // blank the version line and precision statements
 let s=src.replace(/#version[^\n]*\n/,'\n').replace(/\bprecision\s+(lowp|mediump|highp)\s+\w+\s*;/g,'');
 const uni=[],ins=[],outs=[];
 // walk the text at brace depth 0 and cut out global declarations
 let out='',depth=0,i=0;
 const declRe=/^\s*(flat\s+|smooth\s+)?(uniform|in|out)\s+((?:lowp|mediump|highp)\s+)?(\w+)\s+([^;{}()]+);/;
 while(i<s.length){
  const c=s[i];
  if(c==='{'){depth++;out+=c;i++;continue}
  if(c==='}'){depth--;out+=c;i++;continue}
  if(depth===0){
   const m=declRe.exec(s.slice(i,i+600));
   // only accept at a statement start: previous non-space char must be ; or } or start
   if(m&&m.index===0){
    let j=out.length-1;while(j>=0&&/\s/.test(out[j]))j--;
    if(j<0||out[j]===';'||out[j]==='}'||out[j]==='\n'){
     const kind=m[2],flat=!!m[1]&&/flat/.test(m[1]),type=m[4];
     for(const part of m[5].split(',')){const mm=/^\s*(\w+)\s*(?:\[\s*(\d+)\s*\])?\s*$/.exec(part);if(!mm)throw new Error('cannot parse declaration: '+m[0]);
      const d={name:mm[1],type,arr:mm[2]?+mm[2]:0,flat};
      if(kind==='uniform')uni.push(d);else if(kind==='in')ins.push(d);else outs.push(d)}
     i+=m[0].length;continue}
   }
  }
  out+=c;i++}
 return {body:out,uni,ins,outs}}
function genProgram(vsrc,fsrc){
 const V=parse(vsrc,'vert'),F=parse(fsrc,'frag');
 const uni=new Map();
 const addU=d=>{const o=uni.get(d.name);if(o){if(o.type!==d.type||o.arr!==d.arr)throw new Error('uniform '+d.name+' differs between stages')}else uni.set(d.name,d)};
 for(const d of V.uni)addU(d);for(const d of F.uni)addU(d);
 addU({name:'uJit',type:'vec2',arr:0});addU({name:'uVP',type:'vec4',arr:0});
 const hasProj=/\bvec4\s+proj\s*\(\s*vec3\s+p\s*\)/.test(V.body)&&uni.has('uP')&&uni.has('uD')&&uni.has('uK');
 if(hasProj){addU({name:'uPP',type:'vec2',arr:0});addU({name:'uPD',type:'vec2',arr:0});addU({name:'uPK',type:'vec4',arr:0})}
 // layout
 const members=[],samplers=[];let off=0;
 for(const d of uni.values()){
  if(SAMP[d.type]!==undefined){samplers.push({name:d.name,type:d.type,stype:SAMP[d.type],binding:samplers.length+1});continue}
  const t=TYPES[d.type];if(!t)throw new Error('unsupported uniform type '+d.type);
  let al=d.arr?16:t.al,sz=d.arr?Math.max(16,Math.ceil(t.sz/16)*16)*d.arr:t.sz;
  if(d.type==='mat3'||d.type==='mat4')al=16;
  off=Math.ceil(off/al)*al;members.push({...d,t,offset:off,size:sz});off+=sz}
 const uboSize=Math.ceil(off/16)*16||16;
 const uboDecl='layout(std140,set=0,binding=0) uniform ArbU {\n'+members.map(m=>m.type+' '+m.name+(m.arr?'['+m.arr+']':'')+';').join('\n')+'\n};\n'
  +samplers.map(s=>`layout(set=0,binding=${s.binding}) uniform highp ${s.type} ${s.name};`).join('\n')+'\n';
 // attributes / varyings
 const attrs=V.ins.map((d,i)=>({...d,loc:i,comps:+(d.type.replace('vec','')||1)||1}));
 const vary=V.outs.map((d,i)=>({...d,loc:i}));
 const vsl=attrs.map(a=>`layout(location=${a.loc}) in ${a.type} ${a.name};`).join('\n')+'\n'+vary.map(v=>`layout(location=${v.loc}) ${v.flat?'flat ':''}out ${v.type} ${v.name}${v.arr?'['+v.arr+']':''};`).join('\n')+'\n';
 const fin=F.ins.map(d=>{const v=vary.find(x=>x.name===d.name);if(!v)throw new Error('fragment input '+d.name+' has no vertex output');return `layout(location=${v.loc}) ${v.flat?'flat ':''}in ${d.type} ${d.name}${d.arr?'['+d.arr+']':''};`}).join('\n')+'\n';
 if(F.outs.length!==1)throw new Error('expected one fragment output');
 const fout=`layout(location=0) out ${F.outs[0].type} ${F.outs[0].name};\n`;
 const fix=b=>b.replace(/\bgl_VertexID\b/g,'gl_VertexIndex').replace(/\bgl_InstanceID\b/g,'gl_InstanceIndex');
 let vb=fix(V.body);if(!/\bvoid\s+main\s*\(/.test(vb))throw new Error('no main');
 vb=vb.replace(/\bvoid\s+main\s*\(/,'void arb_main(');
 let projExtra='';
 if(hasProj){
  const m=/\bvec4\s+proj\s*\(\s*vec3\s+p\s*\)\s*\{/.exec(vb);let i=m.index+m[0].length,d=1;while(d>0){const c=vb[i++];if(c==='{')d++;else if(c==='}')d--}
  const fn=vb.slice(m.index,i);const prevFn=fn.replace(/\bproj\b/,'arb_projp').replace(/\buP\b/g,'uPP').replace(/\buD\b/g,'uPD').replace(/\buK\b/g,'uPK');
  const curFn=fn.replace(/\bproj\b/,'arb_projc');
  vb=vb.slice(0,m.index)+'vec3 arb_lp=vec3(0.);float arb_has=0.;\n'+curFn+'\n'+prevFn+'\nvec4 proj(vec3 p){arb_lp=p;arb_has=1.;return arb_projc(p);}\n'+vb.slice(i)}
 const nv=vary.length;
 const vs='#version 450\n'+uboDecl+vsl+`layout(location=${nv}) out vec4 vArbC;\nlayout(location=${nv+1}) out vec4 vArbP;\n`+(hasProj?'':'float arb_has=0.;vec3 arb_lp=vec3(0.);\nvec4 arb_projp(vec3 p){return vec4(0.,0.,0.,1.);}\n')+vb+
  `\nvoid main(){arb_main();vec4 c0=gl_Position;vArbC=arb_has>.5?vec4(c0.xy,0.,c0.w):vec4(0.,0.,0.,1.);vArbP=arb_has>.5?arb_projp(arb_lp):vec4(0.,0.,0.,1.);gl_Position.z=(gl_Position.z+gl_Position.w)*0.5;gl_Position.xy+=uJit*gl_Position.w;}\n`;
 const fb=fix(F.body).replace(/\bvoid\s+main\s*\(/,'void arb_fmain(');
 const fs_='#version 450\n'+uboDecl+fin+`layout(location=${nv}) in vec4 vArbC;\nlayout(location=${nv+1}) in vec4 vArbP;\nlayout(location=1) out vec2 arbMV;\n`+fout+fb+
  '\nvoid main(){arb_fmain();vec2 a=vArbC.xy/vArbC.w,b=vArbP.xy/vArbP.w;arbMV=(b-a)*0.5*uVP.xy;}\n';
 return {vs,fs:fs_,members,samplers,attrs,uboSize}}
const progs=new Map();
for(const f of CAPS){
 const c=read(fs.readFileSync(f));const src=new Map(),sty=new Map();const attach=new Map();
 // shader id -> source; the shader type comes from createShader's argument (35633 vertex, 35632 fragment)
 for(const o of c.ops){
  if(o.name==='createShader')sty.set(o.ret,o.args[0]);
  else if(o.name==='shaderSource')src.set(o.args[0].id,o.args[1]);
  else if(o.name==='attachShader'){const a=attach.get(o.args[0].id)||[];a.push(o.args[1].id);attach.set(o.args[0].id,a)}
  else if(o.name==='linkProgram'){const sh=attach.get(o.args[0].id);let v,fr;for(const s of sh){if(sty.get(s)===35633)v=src.get(s);else fr=src.get(s)}progs.set(fnv(v+'\0'+fr),{v,fr})}}}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'arbshd-'));
const blobs=[];let n=0;
for(const [key,{v,fr}] of progs){
 const g=genProgram(v,fr);const base=path.join(tmp,'p'+n++);fs.writeFileSync(base+'.vert',g.vs);fs.writeFileSync(base+'.frag',g.fs);
 for(const st of ['vert','frag']){const r=cp.spawnSync(GLSLANG,['-V','--target-env','vulkan1.1','-S',st,'-o',base+'.'+st+'.spv',base+'.'+st],{encoding:'utf8'});
  if(r.status!==0){console.error('glslang failed for program '+(n-1)+' '+st+'\n'+r.stdout+r.stderr);fs.copyFileSync(base+'.'+st,'/tmp/arb_failed.'+st);process.exit(2)}}
 blobs.push({key,g,vs:fs.readFileSync(base+'.vert.spv'),fs:fs.readFileSync(base+'.frag.spv')})}
// pack
const parts=[];const w8=v=>parts.push(Buffer.from([v]));const w16=v=>{const b=Buffer.alloc(2);b.writeUInt16LE(v);parts.push(b)};const w32=v=>{const b=Buffer.alloc(4);b.writeUInt32LE(v>>>0);parts.push(b)};const w64=v=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(v);parts.push(b)};
const ws=s=>{const b=Buffer.from(s);w8(b.length);parts.push(b)};
parts.push(Buffer.from('ARBSHD1\0'));w32(blobs.length);
for(const b of blobs){w64(b.key);w32(b.g.uboSize);
 w32(b.g.members.length);for(const m of b.g.members){ws(m.name);w8(m.t.id);w16(m.arr);w32(m.offset)}
 w32(b.g.samplers.length);for(const s of b.g.samplers){ws(s.name);w8(s.stype);w8(s.binding)}
 w32(b.g.attrs.length);for(const a of b.g.attrs){ws(a.name);w8(a.loc);w8(a.comps)}
 w32(b.vs.length);parts.push(b.vs);w32(b.fs.length);parts.push(b.fs)}
fs.writeFileSync(OUT,Buffer.concat(parts));
console.log('wrote',OUT,blobs.length,'programs,',Buffer.concat(parts).length,'bytes');

if(JSOUT){const man={};
 for(const b of blobs){man[b.key.toString(16).padStart(16,'0')]={u:[...b.g.members.filter(m=>!['uJit','uVP','uPP','uPD','uPK'].includes(m.name)).map(m=>[m.arr?m.name+'[0]':m.name,m.arr||1]),...b.g.samplers.map(s=>[s.name,1])],a:b.g.attrs.map(a=>a.name)}}
 fs.writeFileSync(JSOUT,'/* generated by native/tools/gen-vk-shaders.js - the shader list the native renderer was built for */\nwindow.ARBN_MANIFEST='+JSON.stringify(man)+';\n');console.log('wrote',JSOUT)}

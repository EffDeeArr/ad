/* GL call recorder (browser side). Wraps the WebGL2 context, and writes every state-changing call to a compact
   binary stream. The native renderer (arb-rt) replays that stream in Vulkan.
   Use: load before the game (addInitScript), call __REC.mark() at the end of each rendered frame, then __REC.save(). */
(function(){
if(window.__REC)return;
const R={chunks:[],cur:null,pos:0,names:new Map(),ids:new Map(),next:1,frames:0,expected:[],shots:true,bytes:0};
window.__REC=R;
const FUN=['createBuffer','deleteBuffer','bindBuffer','bufferData','createTexture','deleteTexture','bindTexture','activeTexture','texImage2D','texImage3D','texSubImage3D','texStorage3D','texParameteri','texParameterf','generateMipmap','pixelStorei','createFramebuffer','bindFramebuffer','framebufferTexture2D','framebufferRenderbuffer','deleteFramebuffer','createRenderbuffer','bindRenderbuffer','renderbufferStorageMultisample','deleteRenderbuffer','blitFramebuffer','createVertexArray','bindVertexArray','enableVertexAttribArray','disableVertexAttribArray','vertexAttribPointer','vertexAttribDivisor','createShader','shaderSource','createProgram','attachShader','linkProgram','useProgram','getUniformLocation','getAttribLocation','uniform1f','uniform1i','uniform2f','uniform3f','uniform4f','uniform3fv','uniform4fv','uniformMatrix3fv','enable','disable','blendFunc','depthMask','depthFunc','polygonOffset','viewport','clear','clearColor','clearDepth','drawArrays','drawArraysInstanced'];
const SET=new Set(FUN),MK=new Set(['createBuffer','createTexture','createFramebuffer','createRenderbuffer','createVertexArray','createShader','createProgram','getUniformLocation']);
function room(n){if(!R.cur||R.pos+n>R.cur.length){if(R.cur)R.chunks.push(R.cur.subarray(0,R.pos));R.cur=new Uint8Array(Math.max(1<<22,n+16));R.pos=0;R.dv=new DataView(R.cur.buffer)}}
function u8(v){room(1);R.cur[R.pos++]=v}
function u16(v){room(2);R.dv.setUint16(R.pos,v,true);R.pos+=2}
function u32(v){room(4);R.dv.setUint32(R.pos,v>>>0,true);R.pos+=4}
function f64(v){room(8);R.dv.setFloat64(R.pos,v,true);R.pos+=8}
function bytes(b){room(b.length);R.cur.set(b,R.pos);R.pos+=b.length}
function str(s){const b=new TextEncoder().encode(s);u32(b.length);bytes(b)}
function idOf(o){let i=R.ids.get(o);if(!i){i=R.next++;R.ids.set(o,i)}return i}
const KIND=[[Uint8Array,0],[Int8Array,1],[Uint16Array,2],[Int16Array,3],[Uint32Array,4],[Int32Array,5],[Float32Array,6],[Float64Array,7],[Uint8ClampedArray,0]];
function arg(a){
 if(a===null||a===undefined){u8(0);return}
 const t=typeof a;
 if(t==='number'){u8(1);f64(a);return}
 if(t==='boolean'){u8(a?5:6);return}
 if(t==='string'){u8(3);str(a);return}
 if(ArrayBuffer.isView(a)){let k=0;for(const[C,n]of KIND)if(a instanceof C){k=n;break}u8(4);u8(k);const b=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);u32(b.length);bytes(b);return}
 if(Array.isArray(a)){u8(7);u32(a.length);for(const x of a)f64(+x);return}
 if(t==='object'){u8(2);u32(idOf(a));return}
 throw new Error('recorder: cannot encode argument '+(a&&a.constructor&&a.constructor.name))}
function rec(name,args,ret){
 let ni=R.names.get(name);if(ni===undefined){ni=R.names.size;R.names.set(name,ni);u16(0xFFFF);u16(ni);const b=new TextEncoder().encode(name);u8(b.length);bytes(b)}
 u16(ni);u8(args.length);u32(ret?idOf(ret):0);for(const a of args)arg(a);R.bytes=R.pos}
function wrapCtx(gl){
 return new Proxy(gl,{get(t,p){const v=t[p];if(typeof v!=='function')return v;
  if(typeof p==='string'&&SET.has(p)){return function(...a){
    const r=v.apply(t,a);rec(p,p==='getAttribLocation'?[...a,r]:a,MK.has(p)?r:null);return r}}
  return function(...a){return v.apply(t,a)}},
  set(t,p,v){t[p]=v;return true}})}
const orig=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(type,opt){const c=orig.call(this,type,opt);if(type==='webgl2'&&c){R.canvas=this;const w=wrapCtx(c);R.gl=c;return w}return c};
R.mark=function(){rec('frame',[R.frames++],null);
 if(R.shots&&R.canvas){try{const cv=R.canvas,c2=document.createElement('canvas');c2.width=cv.width;c2.height=cv.height;c2.getContext('2d').drawImage(cv,0,0);R.expected.push(c2.toDataURL('image/png').split(',')[1])}catch(e){R.expected.push('')}}};
R.size=function(){let n=R.pos;for(const c of R.chunks)n+=c.length;return n};
R.finish=function(){if(R.cur){R.chunks.push(R.cur.subarray(0,R.pos));R.cur=null}const head=new TextEncoder().encode('ARBCAP1\0');R.chunks.unshift(head);let n=0;for(const c of R.chunks)n+=c.length;R.total=n;return n};
R.slice=function(off,len){let o=0;const out=new Uint8Array(Math.min(len,R.total-off));let w=0,pos=0;for(const c of R.chunks){const s=Math.max(off,pos)-pos,e=Math.min(off+out.length,pos+c.length)-pos;if(e>s){out.set(c.subarray(s,e),w);w+=e-s}pos+=c.length;if(pos>=off+out.length)break}
 let s='';const CH=0x8000;for(let i=0;i<out.length;i+=CH)s+=String.fromCharCode.apply(null,out.subarray(i,i+CH));return btoa(s)};
})();

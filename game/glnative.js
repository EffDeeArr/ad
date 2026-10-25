/* Native renderer link (optional). When the desktop app has started the native Vulkan renderer (arb-rt), the game's WebGL calls are not sent to
   the browser's graphics stack at all: a stand-in "GL" records them, ships each frame's calls to arb-rt over a local WebSocket, and paints the
   picture that comes back. If anything goes wrong the game switches back to normal WebGL. */
window.ARBN=(function(){
const A={state:'off',url:String(window.ARBN_URL||''),err:'',pending:0,ms:0,frames:0,onFail:null};
const GLC=typeof WebGL2RenderingContext!=='undefined'?WebGL2RenderingContext:{};
/* ---------- encoder ---------- */
let buf=new Uint8Array(1<<20),dv=new DataView(buf.buffer),pos=0;const names=new Map();let nextId=1;
function room(n){if(pos+n>buf.length){let l=buf.length;while(l<pos+n)l*=2;const b=new Uint8Array(l);b.set(buf.subarray(0,pos));buf=b;dv=new DataView(buf.buffer)}}
const te=new TextEncoder();
function u8(v){room(1);buf[pos++]=v}function u16(v){room(2);dv.setUint16(pos,v,true);pos+=2}function u32(v){room(4);dv.setUint32(pos,v>>>0,true);pos+=4}function f64(v){room(8);dv.setFloat64(pos,v,true);pos+=8}
function bytes(b){room(b.length);buf.set(b,pos);pos+=b.length}
const KIND=[[Uint8Array,0],[Int8Array,1],[Uint16Array,2],[Int16Array,3],[Uint32Array,4],[Int32Array,5],[Float32Array,6],[Float64Array,7],[Uint8ClampedArray,0]];
function arg(a){if(a===null||a===undefined){u8(0);return}const t=typeof a;
 if(t==='number'){u8(1);f64(a);return}if(t==='boolean'){u8(a?5:6);return}
 if(t==='string'){u8(3);const b=te.encode(a);u32(b.length);bytes(b);return}
 if(ArrayBuffer.isView(a)){let k=0;for(const[C,n]of KIND)if(a instanceof C){k=n;break}u8(4);u8(k);const b=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);u32(b.length);bytes(b);return}
 if(Array.isArray(a)){u8(7);u32(a.length);for(const x of a)f64(+x);return}
 if(t==='object'&&a.__id){u8(2);u32(a.__id);return}
 throw new Error('native link: cannot encode an argument')}
function rec(name,args,ret){let ni=names.get(name);if(ni===undefined){ni=names.size;names.set(name,ni);u16(0xFFFF);u16(ni);const b=te.encode(name);u8(b.length);bytes(b)}
 u16(ni);u8(args.length);u32(ret?ret.__id:0);for(const x of args)arg(x)}
/* ---------- the stand-in GL ---------- */
function hash64(s){let h=0xcbf29ce484222325n;const M=(1n<<64n)-1n;const b=te.encode(s);for(let i=0;i<b.length;i++){h^=BigInt(b[i]);h=(h*0x100000001b3n)&M}return h.toString(16).padStart(16,'0')}
const REC1=['deleteBuffer','bindBuffer','bufferData','deleteTexture','bindTexture','activeTexture','texImage2D','texImage3D','texSubImage3D','texStorage3D','texParameteri','texParameterf','generateMipmap','pixelStorei','bindFramebuffer','framebufferTexture2D','framebufferRenderbuffer','deleteFramebuffer','bindRenderbuffer','renderbufferStorageMultisample','deleteRenderbuffer','blitFramebuffer','bindVertexArray','enableVertexAttribArray','disableVertexAttribArray','vertexAttribPointer','vertexAttribDivisor','shaderSource','attachShader','linkProgram','useProgram','uniform1f','uniform1i','uniform2f','uniform3f','uniform4f','uniform3fv','uniform4fv','uniformMatrix3fv','enable','disable','blendFunc','depthMask','depthFunc','polygonOffset','viewport','clear','clearColor','clearDepth','drawArrays','drawArraysInstanced'];
const MK1=['createBuffer','createTexture','createFramebuffer','createRenderbuffer','createVertexArray','createShader','createProgram'];
function makeGL(){
 const g={__fake:true,canvas:null};
 for(const k in GLC)if(typeof GLC[k]==='number')g[k]=GLC[k];
 let on=true;g.__on=v=>{on=v};
 const progInfo=new WeakMap(),shSrc=new WeakMap();
 for(const n of REC1)g[n]=function(...a){if(on)rec(n,a,null)};
 for(const n of MK1)g[n]=function(...a){const o={__id:nextId++};if(n==='createShader')shSrc.set(o,{t:a[0],s:''});if(on)rec(n,a,o);return o};
 const base=g.shaderSource;g.shaderSource=function(h,s){const e=shSrc.get(h);if(e)e.s=s;base(h,s)};
 g.compileShader=function(){};g.getShaderParameter=function(){return true};g.getShaderInfoLog=function(){return ''};g.getProgramInfoLog=function(){return ''};
 const attach=new WeakMap();const baseAt=g.attachShader;g.attachShader=function(p,s){let l=attach.get(p);if(!l){l=[];attach.set(p,l)}l.push(s);baseAt(p,s)};
 const baseLink=g.linkProgram;g.linkProgram=function(p){const l=attach.get(p)||[];let v='',f='';for(const s of l){const e=shSrc.get(s);if(e.t===g.VERTEX_SHADER)v=e.s;else f=e.s}
  const key=hash64(v+'\0'+f);const m=(window.ARBN_MANIFEST||{})[key];progInfo.set(p,m||null);if(!m)A.err='the game\'s shaders are not in the native shader list ('+key+')';baseLink(p)};
 g.getProgramParameter=function(p,q){const m=progInfo.get(p);if(q===g.LINK_STATUS)return !!m;if(q===g.ACTIVE_UNIFORMS)return m?m.u.length:0;if(q===g.ACTIVE_ATTRIBUTES)return m?m.a.length:0;return 0};
 g.getActiveUniform=function(p,i){const m=progInfo.get(p);return{name:m.u[i][0],size:m.u[i][1],type:0}};
 g.getActiveAttrib=function(p,i){const m=progInfo.get(p);return{name:m.a[i],size:1,type:0}};
 g.getUniformLocation=function(p,name){const m=progInfo.get(p);if(!m)return null;const nm=name.replace(/\[0\]$/,'');if(!m.u.some(u=>u[0].replace(/\[0\]$/,'')===nm))return null;const o={__id:nextId++};if(on)rec('getUniformLocation',[p,name],o);return o};
 g.getAttribLocation=function(p,name){const m=progInfo.get(p);const r=m?m.a.indexOf(name):-1;if(on)rec('getAttribLocation',[p,name,r],null);return r};
 g.getParameter=function(q){if(q===g.MAX_SAMPLES)return 0;if(q===g.VERSION)return 'WebGL 2.0 (Arberia native renderer)';if(q===g.RENDERER)return 'Arberia native renderer';return 0};
 g.getExtension=function(){return null};
 return g}
/* ---------- the link ---------- */
let ws=null,gl=null,ncv=null,nctx=null,sentFrames=0;
A.cv=null;
A.configure=function(url){A.url=url||''};
A.use=function(){if(!A.url||A.state==='failed')return false;if(A.state==='off')return start();return true};
function start(){
 if(!A.url||typeof WebSocket==='undefined'){A.state='failed';return false}
 try{ncv=document.createElement('canvas');ncv.width=2;ncv.height=2;nctx=ncv.getContext('2d');A.cv=ncv;
  gl=makeGL();A.state='connecting';ws=new WebSocket(A.url);ws.binaryType='arraybuffer';
  ws.onmessage=e=>{if(typeof e.data==='string'){if(e.data.startsWith('ready'))A.state='ready';else if(e.data.startsWith('error'))fail(e.data);return}
   const d=new DataView(e.data),w=d.getUint32(8,true),h=d.getUint32(12,true);A.ms=d.getUint32(16,true)/1000;A.pending=Math.max(0,A.pending-1);A.frames++;
   if(ncv.width!==w||ncv.height!==h){ncv.width=w;ncv.height=h}
   nctx.putImageData(new ImageData(new Uint8ClampedArray(e.data,20,w*h*4),w,h),0,0)};
  ws.onerror=()=>fail('could not connect to the native renderer');
  ws.onclose=()=>{if(A.state!=='failed'&&A.state!=='off')fail('the native renderer closed the connection')};
  return true}catch(e){fail(String(e&&e.message||e));return false}}
function fail(m){if(A.state==='failed')return;A.state='failed';A.err=A.err||m;try{if(ws)ws.close()}catch(e){}ws=null;if(A.onFail)try{A.onFail(m)}catch(e){}}
A.fail=fail;
A.gl=function(){return gl};
A.canSend=function(){return !!ws&&ws.readyState===1&&A.state==='ready'&&A.pending<2};
A.endFrame=function(){rec('frame',[sentFrames++],null);const b=buf.slice(0,pos);pos=0;try{ws.send(b);A.pending++}catch(e){fail(String(e))}};
A.stop=function(){A.state='off';A.url='';try{if(ws)ws.close()}catch(e){}ws=null};
return A})();

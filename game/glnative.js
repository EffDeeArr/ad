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
const newSt=()=>({n:0,skip:0,hm:0,hs:0,gap:0,last:0,t0:0,sent:0,sgap:0,slast:0});
let st=newSt(),ws=null,gl=null,ncv=null,nctx=null,sentFrames=0,vgl=null,vw=0,vh=0;
A.direct=!!window.ARBN_DIRECT;                 // true: the renderer draws into its own window behind this (transparent) one
A.caps={present:false,dlss:false,dlssnote:'',rt:false};A.dlssState='off';A.dlssBad=false;A.rtState='off';A.rtBad=false;A.rtOn=function(){return A.rtState==='on'};A.rw=0;A.rh=0;A.rFor='';A.sentKey='';A.shown=false;A.cleared=false;A.lastEnd=0;
A.cfg=function(){let on=0,q=2,rt=0;try{on=localStorage.getItem('ld_dlss')==='1'?1:0;q=+localStorage.getItem('ld_dlssq');if(!(q>=0&&q<=5))q=2;rt=localStorage.getItem('ld_rt')==='1'?1:0}catch(e){}return{on,q,rt}};
A.setRt=function(on){try{localStorage.setItem('ld_rt',on?'1':'0')}catch(e){}A.rtBad=false};
A.setDlss=function(on,q){try{localStorage.setItem('ld_dlss',on?'1':'0');localStorage.setItem('ld_dlssq',String(q))}catch(e){}A.dlssBad=false};
// Size the game should draw at for an output of W x H: smaller than that while DLSS is on (DLSS then fills in the rest).
A.size=function(W,H){const c=A.cfg(),on=c.on&&!A.dlssBad&&A.caps.dlss?1:0,rt=c.rt&&!A.rtBad&&A.caps.rt?1:0,key=W+'x'+H+':'+on+':'+c.q+':'+rt;
 if(A.state==='ready'&&A.sentKey!==key&&ws&&ws.readyState===1){A.sentKey=key;try{ws.send('init '+W+' '+H+' '+on+' '+c.q+' '+rt)}catch(e){}}
 return A.rFor===key?[A.rw,A.rh]:[W,H]};
// The frames come back as plain pixels when the renderer has no window of its own; showing them through a small WebGL texture is much cheaper than copying them into a 2D canvas.
function initView(){try{vgl=ncv.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});if(!vgl)throw 0;
 const mk=(t,s)=>{const o=vgl.createShader(t);vgl.shaderSource(o,s);vgl.compileShader(o);if(!vgl.getShaderParameter(o,vgl.COMPILE_STATUS))throw 1;return o};
 const p=vgl.createProgram();vgl.attachShader(p,mk(vgl.VERTEX_SHADER,'#version 300 es\nout vec2 uv;void main(){vec2 q=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);uv=vec2(.5+.5*q.x,.5-.5*q.y);gl_Position=vec4(q,0.,1.);}'));
 vgl.attachShader(p,mk(vgl.FRAGMENT_SHADER,'#version 300 es\nprecision mediump float;in vec2 uv;uniform sampler2D t;out vec4 o;void main(){o=vec4(texture(t,uv).rgb,1.);}'));vgl.linkProgram(p);if(!vgl.getProgramParameter(p,vgl.LINK_STATUS))throw 2;vgl.useProgram(p);
 const t=vgl.createTexture();vgl.bindTexture(vgl.TEXTURE_2D,t);vgl.texParameteri(vgl.TEXTURE_2D,vgl.TEXTURE_MIN_FILTER,vgl.NEAREST);vgl.texParameteri(vgl.TEXTURE_2D,vgl.TEXTURE_MAG_FILTER,vgl.NEAREST);vgl.texParameteri(vgl.TEXTURE_2D,vgl.TEXTURE_WRAP_S,vgl.CLAMP_TO_EDGE);vgl.texParameteri(vgl.TEXTURE_2D,vgl.TEXTURE_WRAP_T,vgl.CLAMP_TO_EDGE);
 vgl.bindVertexArray(vgl.createVertexArray())}catch(e){vgl=null;ncv=document.createElement('canvas');ncv.width=2;ncv.height=2;A.cv=ncv;nctx=ncv.getContext('2d')}}
function directStyle(on){let e=document.getElementById('arbn-direct');if(on&&!e){e=document.createElement('style');e.id='arbn-direct';e.textContent='html,body{background:transparent!important}canvas{background:transparent!important}';document.head.appendChild(e)}else if(!on&&e)e.remove()}
A.cv=null;
A.configure=function(url){A.url=url||''};
A.use=function(){if(!A.url||A.state==='failed')return false;if(A.state==='off')return start();return true};
function onText(t){
 if(t.startsWith('ready')){A.state='ready';if(A.direct)directStyle(true);return}
 if(t.startsWith('error')){fail(t);return}
 if(t.startsWith('caps')){const m=/present=(\d) dlss=(\d) dlssnote=(.*) rt=(\d)\s*$/.exec(t);if(m){A.caps={present:m[1]==='1',dlss:m[2]==='1',dlssnote:m[3],rt:m[4]==='1'};if(A.direct&&!A.caps.present)fail('the renderer could not open its window')}return}
 if(t.startsWith('size')){const p=t.split(' ');A.rw=+p[1]|0;A.rh=+p[2]|0;A.rFor=A.sentKey;return}
if(t.startsWith('rt ')){A.rtState=t.slice(3);A.rtBad=/^(failed|unavailable)/.test(A.rtState);return}
 if(t.startsWith('dlss ')){A.dlssState=t.slice(5);A.dlssBad=/^(failed|unavailable)/.test(A.dlssState);return}}
function start(){
 if(!A.url||typeof WebSocket==='undefined'){A.state='failed';return false}
 try{ncv=document.createElement('canvas');ncv.width=2;ncv.height=2;A.cv=ncv;if(!A.direct)initView();
  gl=makeGL();A.state='connecting';ws=new WebSocket(A.url);ws.binaryType='arraybuffer';
  ws.onopen=()=>{if(vgl)try{ws.send('rgb')}catch(e){}};
  ws.onmessage=e=>{const tm=performance.now();if(st.last)st.gap=Math.max(st.gap,tm-st.last);st.last=tm;if(!st.t0)st.t0=tm;try{onMsg(e)}finally{const d=performance.now()-tm;st.hs+=d;st.hm=Math.max(st.hm,d);st.n++;if(tm-st.t0>2000&&ws&&ws.readyState===1){try{ws.send('stat got '+st.n+' msgs, game-side: skipped '+st.skip+' (renderer busy), sent '+st.sent+', longest gap between frames '+st.gap.toFixed(0)+' ms, longest gap between sends '+st.sgap.toFixed(0)+' ms, handler avg '+(st.hs/st.n).toFixed(1)+' ms max '+st.hm.toFixed(1)+' ms, dlss '+A.dlssState)}catch(x){}st=newSt();st.last=tm;st.t0=tm}}};
  function onMsg(e){if(typeof e.data==='string'){onText(e.data);return}
   const d=new DataView(e.data),w=d.getUint32(8,true),h=d.getUint32(12,true),fmt=d.getUint32(20,true);A.ms=d.getUint32(16,true)/1000;A.pending=Math.max(0,A.pending-1);A.frames++;
   if(fmt===0){if(!A.shown){A.shown=true;try{if(window.native&&native.arbnOk)native.arbnOk()}catch(x){}}return}
   if(ncv.width!==w||ncv.height!==h){ncv.width=w;ncv.height=h}
   if(fmt===3&&vgl){vgl.viewport(0,0,w,h);vgl.pixelStorei(vgl.UNPACK_ALIGNMENT,1);const px=new Uint8Array(e.data,24,w*h*3);if(vw===w&&vh===h)vgl.texSubImage2D(vgl.TEXTURE_2D,0,0,0,w,h,vgl.RGB,vgl.UNSIGNED_BYTE,px);else{vgl.texImage2D(vgl.TEXTURE_2D,0,vgl.RGB8,w,h,0,vgl.RGB,vgl.UNSIGNED_BYTE,px);vw=w;vh=h}vgl.drawArrays(vgl.TRIANGLES,0,3);return}
   if(!nctx)return;nctx.putImageData(new ImageData(new Uint8ClampedArray(e.data,24,w*h*4),w,h),0,0)}
  ws.onerror=()=>fail('could not connect to the native renderer');
  ws.onclose=()=>{if(A.state!=='failed'&&A.state!=='off')fail('the native renderer closed the connection')};
  if(A.direct&&!A.tm)A.tm=setInterval(()=>{if(A.state==='ready'&&ws&&ws.readyState===1&&sentFrames>0&&!A.cleared&&performance.now()-A.lastEnd>500){A.cleared=true;try{ws.send('clear')}catch(x){}}},250);
  return true}catch(e){fail(String(e&&e.message||e));return false}}
function fail(m){if(A.state==='failed')return;A.state='failed';A.err=A.err||m;try{if(ws)ws.close()}catch(e){}ws=null;if(A.tm){clearInterval(A.tm);A.tm=0}directStyle(false);A.direct=false;if(A.onFail)try{A.onFail(m)}catch(e){}}
A.fail=fail;
A.gl=function(){return gl};
A.canSend=function(){const ok=!!ws&&ws.readyState===1&&A.state==='ready'&&A.pending<2;if(!ok&&A.state==='ready')st.skip++;return ok};
A.endFrame=function(){rec('frame',[sentFrames++],null);const b=buf.slice(0,pos);pos=0;A.cleared=false;A.lastEnd=performance.now();try{ws.send(b);A.pending++;st.sent++;const t=performance.now();if(st.slast)st.sgap=Math.max(st.sgap,t-st.slast);st.slast=t}catch(e){fail(String(e))}};
A.stop=function(){A.state='off';A.url='';try{if(ws)ws.close()}catch(e){}ws=null;directStyle(false)};
return A})();

/* ===== Hardware (WebGL2) world renderer =====
   Draws the normal levels on the graphics card instead of the processor: the level is built once into a mesh (walls, floors, risers,
   low arches), and everything else (sprites, 3D props, decals, smoke, acid) is drawn every frame on top. The picture is then copied
   into the game canvas, so the HUD, the weapon and everything else keep working unchanged. 3D-world levels (the space station, imported maps) are uploaded as triangles. It reads the same level data (grid, floor heights, textures) the software renderer does, so both look alike. */
window.GLR=(function(){
const cvs=document.createElement('canvas');
let gl=null,tried=0,good=0,bad='';let msaa=0;try{const q=+localStorage.getItem('ld_msaa');if(q==2||q==4||q==8)msaa=q}catch(e){}
let want=true;try{localStorage.removeItem('ld_glr')}catch(e){}
const NEAR=.05,FAR=120,PA=(FAR+NEAR)/(FAR-NEAR),PB=-2*FAR*NEAR/(FAR-NEAR);
const P_={};let fbo=null,fbC=null,fbD=null,fb2=null,fbC2=null,fbD2=null,fbW=0,fbH=0,fbS=0,fbRC=null,fbRD=null,vaoE=null,whiteT=null;
let texC=new WeakMap();const fin=typeof FinalizationRegistry=='function'?new FinalizationRegistry(t=>{try{gl.deleteTexture(t)}catch(e){}}):null;
const PROJ=`uniform vec2 uP;uniform vec2 uD;uniform vec4 uK;
vec4 proj(vec3 p){vec2 d=p.xy-uP;float ty=dot(d,uD);float lat=uD.x*d.y-uD.y*d.x;return vec4(lat/uK.w,uK.z*(-2.*uK.y*ty-2.*(uK.x-p.z)),${PA.toFixed(6)}*ty+(${PB.toFixed(6)}),ty);}`;
/* Dynamic lights: up to 12 point lights; the nearest few cast ray-traced shadows (the ray walks a 3D grid of solid cells built from the level) */
const LIGHT=`uniform vec4 uLP[12];uniform vec4 uLC[12];uniform vec4 uLD[12];uniform int uLN;uniform int uSh;uniform float uAmb;uniform vec3 uEyeP;uniform vec4 uOc0;uniform vec3 uOcN;uniform highp sampler3D uOcc;
float tmx(float p0,float d,float nx){return abs(d)<1e-6?1e9:(nx-p0)/d;}
float shRay(vec3 a,vec3 b){vec3 g0=(a-uOc0.xyz)/uOc0.w,g1=(b-uOc0.xyz)/uOc0.w,d=g1-g0;float L=length(d);if(L<1e-3)return 1.;d/=L;ivec3 c=ivec3(floor(g0)),st=ivec3(d.x>0.?1:-1,d.y>0.?1:-1,d.z>0.?1:-1);ivec3 sz=ivec3(uOcN);
if(any(lessThan(c,ivec3(0)))||any(greaterThanEqual(c,sz)))return 1.;vec3 td=vec3(abs(d.x)<1e-6?1e9:1./abs(d.x),abs(d.y)<1e-6?1e9:1./abs(d.y),abs(d.z)<1e-6?1e9:1./abs(d.z));
vec3 nb=vec3(c)+vec3(st.x>0?1.:0.,st.y>0?1.:0.,st.z>0?1.:0.);vec3 tm=vec3(tmx(g0.x,d.x,nb.x),tmx(g0.y,d.y,nb.y),tmx(g0.z,d.z,nb.z));float t=0.;
for(int i=0;i<96;i++){if(i>0&&texelFetch(uOcc,c,0).r>.002)return 0.;if(tm.x<tm.y&&tm.x<tm.z){t=tm.x;tm.x+=td.x;c.x+=st.x;}else if(tm.y<tm.z){t=tm.y;tm.y+=td.y;c.y+=st.y;}else{t=tm.z;tm.z+=td.z;c.z+=st.z;}
if(t>=L-.6)break;if(any(lessThan(c,ivec3(0)))||any(greaterThanEqual(c,sz)))break;}return 1.;}
vec3 lit(vec3 p,vec3 n){vec3 acc=vec3(0.);for(int i=0;i<12;i++){if(i>=uLN)break;vec3 lv=uLP[i].xyz-p;float d2=dot(lv,lv),r=uLP[i].w;if(d2>=r*r)continue;vec3 ld=uLD[i].xyz;if(dot(ld,ld)>.1&&dot(p-uLP[i].xyz,ld)<-.4)continue;float d=sqrt(d2);vec3 l=lv/d;float nl=dot(n,l);if(nl<=.02)continue;float a=1.-d/r;a*=a;float v=1.;if(i<uSh&&a>.02)v=shRay(p+n*.1,uLP[i].xyz);acc+=uLC[i].rgb*(a*(.3+.7*nl)*v);}return acc;}
`;
const NRM=`vec3 nrm(vec3 p){vec3 n=cross(dFdx(p),dFdy(p));float l=length(n);if(l<1e-12)return vec3(0.,0.,1.);n/=l;if(dot(n,uEyeP-p)<0.)n=-n;return n;}
`;
const SRC={
world:[`#version 300 es
precision highp float;in vec3 aPos;in vec2 aUV;in vec2 aF;out vec2 vUV;out float vTy;out vec2 vF;out vec3 vW;${PROJ}
void main(){vec4 c=proj(aPos);gl_Position=c;vTy=c.w;vUV=aUV;vF=aF;vW=aPos;}`,
`#version 300 es
precision highp float;uniform sampler2D uTex;uniform float uFK;uniform float uAT;uniform float uCF;in vec2 vUV;in float vTy;in vec2 vF;in vec3 vW;out vec4 o;${LIGHT}${NRM}
void main(){vec3 n=nrm(vW);vec4 c=texture(uTex,vUV);if(c.a<uAT)discard;if(uCF!=0.&&(gl_FrontFacing?1.:-1.)!=uCF)discard;float f=max(vF.y,256./(1.+vTy*uFK))*vF.x/256.;vec3 col=c.rgb*f;if(uLN>0||uAmb<.999)col=col*uAmb+c.rgb*lit(vW,n);o=vec4(min(col,vec3(1.)),1.);}`],
bsp:[`#version 300 es
precision highp float;in vec3 aPos;in vec2 aUV;in vec3 aF;in vec4 aN;out vec2 vUV;out float vTy;out vec3 vF;out vec3 vW;uniform vec3 uEye;uniform vec2 uCu;uniform float uCuOn;uniform mat3 uMR;uniform vec3 uMP;uniform vec3 uMO;uniform float uMOn;${PROJ}
void main(){vec3 p=aPos;if(uMOn>.5)p=uMP+uMR*(aPos-uMP)+uMO;vec4 c=proj(p);
if(uCuOn>.5&&(aN.x!=0.||aN.y!=0.||aN.z!=0.)){float s=dot(aN.xyz,uEye)-aN.w;if(uCu.x*s<uCu.y)c=vec4(2.,2.,2.,1.);}
gl_Position=c;vTy=c.w;vUV=aUV;vF=aF;vW=p;}`,
`#version 300 es
precision highp float;uniform sampler2D uTex;uniform float uFK;uniform float uAl;in vec2 vUV;in float vTy;in vec3 vF;in vec3 vW;out vec4 o;${LIGHT}${NRM}
void main(){vec3 n=nrm(vW);vec4 c=texture(uTex,vUV);if(c.a<.5)discard;if(vF.z>.5&&mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y),2.)>.5)discard;float f=max(vF.y,256./(1.+vTy*uFK))*vF.x/256.;vec3 col=c.rgb*f;if(uLN>0||uAmb<.999)col=col*uAmb+c.rgb*lit(vW,n);o=vec4(min(col,vec3(1.)),uAl);}`],
flat:[`#version 300 es
precision highp float;void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`,
`#version 300 es
precision highp float;uniform vec3 uC;out vec4 o;void main(){o=vec4(uC,1.);}`],
mesh:[`#version 300 es
precision highp float;in vec3 aPos;in vec4 aCol;in vec3 aUV;out vec4 vCol;out vec3 vUV;out vec3 vW;${PROJ}
void main(){gl_Position=proj(aPos);vCol=aCol;vUV=aUV;vW=aPos;}`,
`#version 300 es
precision highp float;precision highp sampler2DArray;uniform sampler2DArray uMat;uniform sampler2DArray uSk;in vec4 vCol;in vec3 vUV;in vec3 vW;out vec4 o;${LIGHT}${NRM}
void main(){vec3 n=nrm(vW);vec4 c=vCol;if(vUV.z>99.5){vec3 t=texture(uSk,vec3(vUV.xy,floor(vUV.z-99.5))).rgb;c.rgb=min(c.rgb*t*1.35,vec3(1.));}else if(vUV.z>1.5){vec3 t=texture(uMat,vec3(vUV.xy,floor(vUV.z-1.5))).rgb;c.rgb=min(c.rgb*t*1.35,vec3(1.));}else if(vUV.z>.5){bool ln=fract(vUV.x*8.)<.1||fract(vUV.y*6.)<.1;c.a=(ln?.6:.2)+vCol.a;}if(vUV.z>-.5&&c.a>.99&&(uLN>0||uAmb<.999)){vec3 al=min(c.rgb*1.6,vec3(1.));c.rgb=c.rgb*uAmb+al*lit(vW,n);c.rgb=min(c.rgb,vec3(1.));}o=c;}`],
spr:[`#version 300 es
precision highp float;in vec3 aA;in vec4 aB;in float aO;out vec2 vUV;out vec4 vB;out float vO;out vec3 vL;uniform vec2 uWH;${PROJ}${LIGHT}
void main(){int id=gl_VertexID;vec2 cn=vec2((id&1)==0?-.5:.5,id<2?0.:1.);
vec2 d=aA.xy-uP;float ty=dot(d,uD);float lat=uD.x*d.y-uD.y*d.x;float tx=lat/uK.w;
float hp=max(aB.x*uK.z*uWH.y/max(ty,.05),1.);float pad=aO>.5?min(1.5,1.+3./hp):1.;
float y0=uK.z*(-2.*uK.y*ty-2.*(uK.x-aA.z));
float cxo=(cn.x*pad)*(2.*uWH.y*aB.x*uK.z/uWH.x);float cyo=(cn.y*pad-(pad-1.)*.5)*(2.*aB.x*uK.z);
gl_Position=vec4(tx+cxo,y0+cyo,${PA.toFixed(6)}*ty+(${PB.toFixed(6)}),ty);
vUV=vec2(cn.x*pad+.5,1.-(cn.y*pad-(pad-1.)*.5));vB=aB;vO=aO;vL=vec3(0.);if(uLN>0){vec3 cen=vec3(aA.xy,aA.z+aB.x*.5);vL=lit(cen,normalize(uEyeP-cen));}}`,
`#version 300 es
precision highp float;uniform sampler2D uTex;uniform vec3 uOL[2];uniform float uAmb;in vec2 vUV;in vec4 vB;in float vO;in vec3 vL;out vec4 o;
bool ins(vec2 q){return q.x>=0.&&q.x<=1.&&q.y>=0.&&q.y<=1.;}
void main(){vec2 uv=vUV;vec2 w=fwidth(uv);vec4 c=vec4(0.);if(ins(uv))c=texture(uTex,uv);
float f=vB.y;float fl=vB.z;
if(c.a>.505){o=vec4(min(c.rgb*f*mix(uAmb,1.,.4)+fl+c.rgb*vL,vec3(1.)),vB.w);return;}
if(vO>.5){float m=0.;for(int i=0;i<8;i++){vec2 off=vec2(i==0||i==4||i==5?-1.:(i==1||i==6||i==7?1.:0.),i==2||i==4||i==6?-1.:(i==3||i==5||i==7?1.:0.));vec2 q=uv+off*w;if(ins(q)&&texture(uTex,q).a>.505)m=1.;}
if(m>.5){vec3 oc=vO>1.5?uOL[1]:uOL[0];o=vec4(oc*max(f,.547),1.);return;}}
discard;}`],
bg:[`#version 300 es
precision highp float;void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,1.,1.);}`,
`#version 300 es
precision highp float;uniform sampler2D uCL;uniform sampler2D uFL;uniform sampler2D uSky;uniform vec4 uB;uniform vec4 uD;uniform float uCQ;out vec4 o;
void main(){float yy=floor(uB.x-gl_FragCoord.y);float xx=floor(gl_FragCoord.x);float hH=uB.y;vec4 c;
if(yy<hH){int idx=int(clamp(trunc(yy-(hH-uB.x*.5)),0.,uB.x*.5));c=texelFetch(uCL,ivec2(idx,0),0);
if(uCQ>.5){float sc=uB.x*.4/128.;float cx=2.*xx/uB.w-1.;float a=atan(uD.y+uD.w*cx,uD.x+uD.z*cx);float u=floor(fract(a/6.2832)*1024.);float r=127.-trunc((hH-yy-.5)/sc);if(r>=0.&&r<128.){vec4 s=texelFetch(uSky,ivec2(int(u),int(r)),0);if(s.a>.5)c=s;}}}
else{int idx=int(clamp(max(yy,floor(uB.x*.5)),0.,uB.x-1.));c=texelFetch(uFL,ivec2(idx,0),0);}
o=vec4(c.rgb,1.);}`],
acid:[`#version 300 es
precision highp float;in vec3 aPos;in vec4 aA;out vec2 vW;out vec4 vA;${PROJ}
void main(){gl_Position=proj(aPos);vW=aPos.xy;vA=aA;}`,
`#version 300 es
precision highp float;in vec2 vW;in vec4 vA;uniform float uT;out vec4 o;
void main(){vec2 d=vW-vA.xy;float r=vA.z*(.88+.12*sin(vW.x*7.)*sin(vW.y*7.+1.5708));float dd=length(d);if(dd>=r)discard;
float k=1.-dd/r;float q=min(1.,(.45+k*1.2)*vA.w);float sh=.85+.15*sin(uT*3.+vW.x*6.+vW.y*5.);o=vec4(vec3(70.,235.,40.)/255.*sh,q*.8);}`],
shadow:[`#version 300 es
precision highp float;in vec3 aPos;in vec4 aA;out vec4 vA;${PROJ}
void main(){gl_Position=proj(aPos);vA=aA;}`,
`#version 300 es
precision highp float;in vec4 vA;out vec4 o;
void main(){o=vec4(.02,.03,.09,vA.x);}`],
post:[`#version 300 es
precision highp float;void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`,
`#version 300 es
precision highp float;uniform sampler2D uC;uniform sampler2D uZ;uniform vec4 uD;uniform vec4 uB;uniform vec4 uS[8];uniform vec4 uS2[8];uniform int uSN;uniform vec4 uP3;uniform float uT;uniform float uCe;out vec4 o;
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return vn(p)*.55+vn(p*2.03+7.1)*.3+vn(p*4.1+3.3)*.15;}
float dens(vec3 p,vec3 c,float R,float Hh,float sd,float w){vec3 u=(p-c)/vec3(R,R,Hh);float r=length(u);if(r>1.45)return 0.;
vec3 q=p*1.15+vec3(sd,sd*.7,sd*1.3)+vec3(sin(uT*.23+sd),cos(uT*.19+sd),-uT*.12);float n=fbm(q);return smoothstep(.95,.3,r*1.1-(n-.5)*1.9)*w;}
void main(){ivec2 ip=ivec2(gl_FragCoord.xy);vec4 c=texelFetch(uC,ip,0);float d0=texelFetch(uZ,ip,0).r;o=c;gl_FragDepth=d0;
{float dz=d0*2.-1.;float ty=${PB.toFixed(6)}/(dz-(${PA.toFixed(6)}));float W=uB.w,H=uB.x;float cx=2.*float(ip.x)/W-1.;
vec2 rd=vec2(uD.x+uD.z*cx,uD.y+uD.w*cx);float hH=uB.y,hc=H*.5;float yy=H-1.-float(ip.y);float yp=hc+(yy+.5-hc)/uB.z;float sz=-(yp-hH)/H;
float lim=ty;if(sz<-1e-4)lim=min(lim,uP3.z/(-sz));if(uCe>.5&&sz>1e-4)lim=min(lim,(uP3.w-uP3.z)/sz);
float a=dot(rd,rd);float ds=sqrt(a+sz*sz);float TT=1.,tOp=-1.;vec3 col=vec3(0.);vec3 L=normalize(vec3(.35,.2,.9));
float jit=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
for(int i=0;i<8;i++){if(i>=uSN)break;vec4 s=uS[i];float R=s.z*.8,Hh=.78;vec3 cc=vec3(s.xy,.42);
vec3 B=vec3(s.z*1.05,s.z*1.05,Hh*1.45);vec3 o3=(vec3(uP3.xy,uP3.z)-cc)/B,d3=vec3(rd,sz)/B;float qa=dot(d3,d3),qb=dot(o3,d3),qc=dot(o3,o3)-1.;float disc=qb*qb-qa*qc;if(disc<=0.)continue;
float sq=sqrt(disc);float t1=max((-qb-sq)/qa,0.),t2=min((-qb+sq)/qa,lim);if(t2<=t1)continue;
float dt=(t2-t1)/20.;float t=t1+dt*jit;float dl=dt*ds;
for(int k=0;k<20;k++){vec3 p=vec3(uP3.xy+rd*t,uP3.z+sz*t);float d=dens(p,cc,R,Hh,uS2[i].x,s.w);
if(d>.004){float al=1.-exp(-d*3.3*dl);float dd=dens(p+L*.45,cc,R,Hh,uS2[i].x,s.w);float sh=mix(.32,1.1,exp(-dd*2.6));
float hgt=clamp((p.z-.0)/1.2,0.,1.);vec3 sc=vec3(.68,.685,.71)*sh*(.8+.3*hgt);col+=TT*al*sc;TT*=1.-al;if(tOp<0.&&TT<.3)tOp=t;if(TT<.02)break;}
t+=dt;}
}
if(TT<.999){o=vec4(c.rgb*TT+col,1.);if(TT<.2&&tOp>0.){float l2=tOp+.25;if(l2<ty)gl_FragDepth=(${PA.toFixed(6)}+(${PB.toFixed(6)})/l2)*.5+.5;}}}}`]
};
function mkSh(t,s){const h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);if(!gl.getShaderParameter(h,gl.COMPILE_STATUS)){bad=gl.getShaderInfoLog(h)||'shader';return null}return h}
function mkProg(name){const s=SRC[name],v=mkSh(gl.VERTEX_SHADER,s[0]),f=mkSh(gl.FRAGMENT_SHADER,s[1]);if(!v||!f)return null;const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){bad=gl.getProgramInfoLog(p)||'link';return null}
const o={p,u:{},a:{}};const nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<nu;i++){const in_=gl.getActiveUniform(p,i),nm=in_.name.replace(/\[0\]$/,'');o.u[nm]=gl.getUniformLocation(p,in_.name)}
const na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<na;i++){const in_=gl.getActiveAttrib(p,i);o.a[in_.name]=gl.getAttribLocation(p,in_.name)}return o}
function init(){if(tried)return good;tried=1;try{const nat=!!(window.ARBN&&ARBN.use());gl=nat?ARBN.gl():cvs.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance',desynchronized:false});if(!gl){bad='no webgl2';return 0}
if(!nat&&!window.GLR_FORCE){let rn='';try{const e=gl.getExtension('WEBGL_debug_renderer_info');rn=String(e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER))}catch(e){}if(/swiftshader|llvmpipe|software|basic render|softpipe/i.test(rn)){bad='no graphics card is available to the game (it needs a GPU with WebGL 2 support)';gl=null;return 0}}
if(!nat&&!cvs.__l){cvs.__l=1;cvs.addEventListener('webglcontextlost',e=>{e.preventDefault();good=0;bad='graphics context lost'});
cvs.addEventListener('webglcontextrestored',()=>{hardReset()})}
for(const n of['world','mesh','spr','bg','acid','shadow','post','bsp','flat']){P_[n]=mkProg(n);if(!P_[n]){bad=n+': '+bad;return 0}}
vaoE=gl.createVertexArray();whiteT=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,whiteT);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);good=1;return 1}catch(e){bad=String(e&&e.message||e);good=0;return 0}}
function texOf(arr,w,h,repeat){let t=texC.get(arr);if(t)return t;let a=arr;if(!(a instanceof Uint32Array))a=Uint32Array.from(a);const n=a.length;if(!w){w=Math.round(Math.sqrt(n));h=Math.ceil(n/w)}
t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(a.buffer,a.byteOffset,w*h*4));
if(w>=256&&w==h&&repeat!==false){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)}else{gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST)}const wr=repeat===false?gl.CLAMP_TO_EDGE:gl.REPEAT;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wr);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wr);
texC.set(arr,t);if(fin)fin.register(arr,t);return t}
const lineT={cl:null,fl:null};
function lineTex(key,arr,n,fallback,srcN){if(!lineT[key]){lineT[key]=gl.createTexture()}const u=new Uint32Array(n),sn=srcN||n;for(let i=0;i<n;i++){const v=arr[sn===n?i:Math.min(sn-1,Math.floor((i+.5)*sn/n))];u[i]=v===undefined?fallback:v}
gl.bindTexture(gl.TEXTURE_2D,lineT[key]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,n,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(u.buffer));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return lineT[key]}
const msS=()=>msaa?Math.min(msaa,gl.getParameter(gl.MAX_SAMPLES)|0):0;
function setFbo(w,h){const ns=msS()>=2?msS():0;if(fbo&&fbW==w&&fbH==h&&fbS==ns)return;if(fbo){gl.deleteFramebuffer(fbo);if(fbC)gl.deleteTexture(fbC);if(fbD)gl.deleteTexture(fbD);if(fbRC)gl.deleteRenderbuffer(fbRC);if(fbRD)gl.deleteRenderbuffer(fbRD);fbC=fbD=fbRC=fbRD=null;gl.deleteFramebuffer(fb2);gl.deleteTexture(fbC2);gl.deleteTexture(fbD2)}fbS=ns;
if(ns){fbRC=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,fbRC);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,ns,gl.RGBA8,w,h);fbRD=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,fbRD);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,ns,gl.DEPTH_COMPONENT24,w,h);fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,fbRC);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,fbRD)}else{fbC=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,fbC);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
fbD=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,fbD);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fbC,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,fbD,0)}
fbC2=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,fbC2);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
fbD2=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,fbD2);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
fb2=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb2);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fbC2,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,fbD2,0);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);fbW=w;fbH=h}
/* ---------- the level mesh ---------- */
function hardReset(){matArr=null;matReal=0;BS=null;texC=new WeakMap();lineT.cl=null;lineT.fl=null;fbo=null;fb2=null;fbC=fbD=fbRC=fbRD=null;fbS=0;WK=null;WB=null;dynBuf=null;sprBuf=null;tried=0;good=0;gl=null;for(const k in P_)delete P_[k]}
let WK=null,WB=null;let LCF=-1;let FKU=1;
function sig(){let s=N*7+(WHT*10|0)+(GR&&GR.shop?fl*1009+7:0)+(typeof ROOFH!='undefined'?(ROOFH*100|0)*17:0);for(let i=0,n=N*N;i<n;i++)s=(s*31+g[i]*7+((FH[i]*100)|0)*3+((CZ[i]*100)|0)*13+ct[i]*5+pit[i]*11+brg[i])|0;return s}
function buildWorld(){const bk=new Map(),cw=new Map(),lk=new Map();const top=GR&&GR.cq?GATE_TOP:WHT;
const put=(map,tex,fmin,vs)=>{const k=tex;let b=map.get(k);if(!b){b={tex,fmin,v:[]};map.set(k,b)}for(const x of vs)b.v.push(x)};
const q=(p,u,sh,fmin)=>{/* p: 4 points [x,y,z], u: 4 uv, order a,b,c,d around the quad */const o=[];for(const i of[0,1,2,0,2,3])o.push(p[i][0],p[i][1],p[i][2],u[i][0],u[i][1],sh,fmin);return o};
const G=(x,y)=>x<0||y<0||x>=N||y>=N?1:g[y*N+x];
const FHg=(x,y)=>FH[y*N+x];
/* face on the boundary of cell (x,y) towards direction dir (0:-x 1:+x 2:-y 3:+y), from z0 to z1. tv0/tv1 are the texture rows at z0 and z1. */
const face=(x,y,dir,z0,z1,tv0,tv1,flip)=>{let a,b;if(dir==0){a=[x,y,0];b=[x,y+1,0]}else if(dir==1){a=[x+1,y,0];b=[x+1,y+1,0]}else if(dir==2){a=[x,y,0];b=[x+1,y,0]}else{a=[x,y+1,0];b=[x+1,y+1,0]}
const u0=flip?1:0,u1=flip?0:1;const p=[[a[0],a[1],z0],[b[0],b[1],z0],[b[0],b[1],z1],[a[0],a[1],z1]],uv=[[u0,tv0],[u1,tv0],[u1,tv1],[u0,tv1]];return{p,uv}};
/* u flip rules (matches the software renderer): x-facing faces: -x side keeps u, +x side flips; y-facing: +y side keeps u, -y side flips */
const flipOf=dir=>dir==1||dir==2;
const sideX=dir=>dir<2;
for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;
if(!g[i]){/* floor */const fh=FH[i];const tx=ct[i]&&CT[ct[i]]?CT[ct[i]]:brg[i]?BT:FT;const pf=pit[i]?(fh<-1?.1:.28):1;
put(bk,tx,20,q([[x,y,fh],[x+1,y,fh],[x+1,y+1,fh],[x,y+1,fh]],[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],pf,20));if(GR&&GR.shop&&typeof CEIL!='undefined'&&CEIL)put(bk,((x*7+y*13)%4==0)?CEIL[1]:CEIL[0],20,q([[x,y,WHT],[x,y+1,WHT],[x+1,y+1,WHT],[x+1,y,WHT]],[[x,y],[x,y+1],[x+1,y+1],[x+1,y]],.92,20));
/* low arches / lintels: outward faces */const cz=CZ[i];if(cz<.99||(cz>1&&cz<top-.01)){const tp=GR&&GR.cq?Math.min(cz+WHT,GATE_TOP):WHT;for(let d=0;d<4;d++){const f=face(x,y,d,cz,tp,1,1-(tp-cz),flipOf(d));let e=f.p,uv=f.uv;const ou=[[-1,0],[1,0],[0,-1],[0,1]][d];const e1=[e[1][0]-e[0][0],e[1][1]-e[0][1],e[1][2]-e[0][2]],e2=[e[2][0]-e[0][0],e[2][1]-e[0][1],e[2][2]-e[0][2]];const nx_=e1[1]*e2[2]-e1[2]*e2[1],ny_=e1[2]*e2[0]-e1[0]*e2[2];if(nx_*ou[0]+ny_*ou[1]<0){e=[e[0],e[3],e[2],e[1]];uv=[uv[0],uv[3],uv[2],uv[1]]}
const vs=q(e,uv,sideX(d)?1:.7,26);if(CW[i]){put(cw,'a',26,vs)}else put(lk,(GR&&GR.cq&&TX&&TX[3])||PT,26,vs)}}
/* risers: from this (lower) cell up to higher neighbours */
const nb=[[x-1,y,0],[x+1,y,1],[x,y-1,2],[x,y+1,3]];for(const[nx,ny,d]of nb){if(G(nx,ny))continue;const fn=FHg(nx,ny);if(fn>fh+.001){const f=face(x,y,d,fh,fn,1-fh,1-fn,!flipOf(d));const rt=(RTS&&RTS[Math.round(fn*100)])||RT;put(bk,rt,20,q(f.p,f.uv,sideX(d)?.85:.6,20))}}
}else{/* wall: faces towards non-wall neighbours */const nb=[[x-1,y,0],[x+1,y,1],[x,y-1,2],[x,y+1,3]];const t0=TX[g[i]-1],t1=TU?TU[g[i]-1]:t0;
for(const[nx,ny,d]of nb){if(G(nx,ny))continue;const z0=FHg(nx,ny);/* the wall cell's face points at the neighbour: boundary dir seen from the wall cell is the opposite side */
const wd=d;const f0=Math.min(z0,WHT);if(z0<1||WHT<=1){const zt=Math.min(1,WHT);const f=face(x,y,wd,z0,zt,1-z0,1-zt,flipOf(wd));put(bk,t0,26,q(f.p,f.uv,sideX(wd)?1:.7,26))}
if(WHT>1){const za=Math.max(1,z0);const f=face(x,y,wd,za,WHT,1-za,1-WHT,flipOf(wd));put(bk,t1,26,q(f.p,f.uv,sideX(wd)?1:.7,26))}if(ROOFH>0&&BLD){const sp=roofSpan(i,wd>=2?1:0);if(sp){const c0=wd<2?y:x,xf=wd==1?x+1:x,yf=wd==3?y+1:y,fp=flipOf(wd),bp=[c0,c0+1];const m=(sp[0]+sp[1])/2;if(m>c0&&m<c0+1)bp.splice(1,0,m);
for(let k=0;k<bp.length-1;k++){const s0=bp[k],s1=bp[k+1],h0=roofH(sp[0],sp[1],s0),h1=roofH(sp[0],sp[1],s1);if(h0+h1<.01)continue;const P3=(s,z)=>wd<2?[xf,s,z]:[s,yf,z],u0=fp?1-(s0-c0):s0-c0,u1=fp?1-(s1-c0):s1-c0;
put(bk,t1,26,q([P3(s0,WHT),P3(s1,WHT),P3(s1,WHT+h1),P3(s0,WHT+h0)],[[u0,1-WHT],[u1,1-WHT],[u1,1-WHT-h1],[u0,1-WHT-h0]],sideX(wd)?1:.7,26))}}}}}}
const out=[];const mkB=(map,pre)=>{for(const b of map.values()){const arr=new Float32Array(b.v);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);out.push({tex:b.tex,n:arr.length/7,buf,cw:pre})}};
mkB(bk,0);mkB(lk,3);mkB(cw,1);return out}
/* 2.79.0: the battle royale world as triangles - smooth terrain, wall tops, roofs, decks, lintels and the faces between cells */
function buildWorldBR(){const bk=new Map(),vk=N+1;
const put=(tex,vs)=>{let b=bk.get(tex);if(!b){b={tex,v:[]};bk.set(tex,b)}for(let i=0;i<vs.length;i++)b.v.push(vs[i])};
const quad=(tex,p,u,sh,fmin)=>{const o=[];for(const i of[0,1,2,0,2,3])o.push(p[i][0],p[i][1],p[i][2],u[i][0],u[i][1],sh,fmin);put(tex,o)};
const cor=(ci,cx,cy,i,j)=>{const f=SF[ci];return f>-90?f:VH[(cy+j)*vk+cx+i]};
const wallTex=ci=>WTX[ci]?TX[WTX[ci]-1]:RT,faceTex=ci=>{const k=SK[ci];return(k>=2&&k<=4&&WTX[ci])?TX[WTX[ci]-1]:RIS[ci]?TX[RIS[ci]-1]:RT};
const plank=CT[4];
for(let cy=0;cy<N;cy++)for(let cx=0;cx<N;cx++){const ci=cy*N+cx,sk=SK[ci];
const h00=cor(ci,cx,cy,0,0),h10=cor(ci,cx,cy,1,0),h11=cor(ci,cx,cy,1,1),h01=cor(ci,cx,cy,0,1);
if(!(sk==4&&WTP[ci]>=3.7)){const tx=sk==3?wallTex(ci):(ct[ci]&&CT[ct[ci]]?CT[ct[ci]]:FT);quad(tx,[[cx,cy,h00],[cx+1,cy,h10],[cx+1,cy+1,h11],[cx,cy+1,h01]],[[cx,cy],[cx+1,cy],[cx+1,cy+1],[cx,cy+1]],SHD[ci]/100,20)}
const s1=SL1[ci],s2=SL2[ci],sq=(z,tx,sh)=>quad(tx,[[cx,cy,z],[cx+1,cy,z],[cx+1,cy+1,z],[cx,cy+1,z]],[[cx,cy],[cx+1,cy],[cx+1,cy+1],[cx,cy+1]],sh,24);
if(s1){if(sk==1){sq(s1+.004,plank,1);sq(s1-.004,plank,.78)}else if(sk==2||sk==3)sq(s1-.004,sk==3?wallTex(ci):plank,.8)}
if(s2){sq(s2+.004,CT[STX[ci]]||FT,1);if(sk==1||sk==5)sq(s2-.004,plank,.72)}
/* faces to the +x and +y neighbours */
for(let d=0;d<2;d++){const nx=cx+(d==0?1:0),ny=cy+(d==1?1:0);if(nx>=N||ny>=N)continue;const nc=ny*N+nx;
let a0,a1,b0,b1,p0,p1;if(d==0){a0=h10;a1=h11;b0=cor(nc,nx,ny,0,0);b1=cor(nc,nx,ny,0,1);p0=[cx+1,cy];p1=[cx+1,cy+1]}else{a0=h01;a1=h11;b0=cor(nc,nx,ny,0,0);b1=cor(nc,nx,ny,1,0);p0=[cx,cy+1];p1=[cx+1,cy+1]}
const lo0=Math.min(a0,b0),hi0=Math.max(a0,b0),lo1=Math.min(a1,b1),hi1=Math.max(a1,b1);
if(hi0-lo0>.003||hi1-lo1>.003){const hiC=(a0+a1)>(b0+b1)?ci:nc,sh=d==0?.9:.75;quad(faceTex(hiC),[[p0[0],p0[1],lo0],[p1[0],p1[1],lo1],[p1[0],p1[1],hi1],[p0[0],p0[1],hi0]],[[0,1-lo0],[1,1-lo1],[1,1-hi1],[0,1-hi0]],sh,26)}
/* lintels over doors and windows */
for(const[A,B,pp0,pp1,sd]of[[ci,nc,p0,p1,d==0?.9:.75],[nc,ci,p0,p1,d==0?.9:.75]]){const ka=SK[A],kb=SK[B];if((ka==2||ka==3)&&!(kb>=2&&kb<=4)&&SL1[A]&&SL2[A]>SL1[A]){quad(wallTex(A),[[pp0[0],pp0[1],SL1[A]],[pp1[0],pp1[1],SL1[A]],[pp1[0],pp1[1],SL2[A]],[pp0[0],pp0[1],SL2[A]]],[[0,1-SL1[A]],[1,1-SL1[A]],[1,1-SL2[A]],[0,1-SL2[A]]],sd,26)}}}}
const out=[];for(const b of bk.values()){const arr=new Float32Array(b.v);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);out.push({tex:b.tex,n:arr.length/7,buf,cw:0})}return out}
function worldBatches(){const br=typeof BRV!='undefined'&&BRV,k=br?'br'+BRVER:sig();if(!WK||WK.k!=k||WK.gr!==GR||WK.fl!==FT||WK.tx!==TX||WK.tsz!=TSZ){if(WB)for(const b of WB)gl.deleteBuffer(b.buf);WB=br?buildWorldBR():buildWorld();WK={k,gr:GR,fl:FT,tx:TX,tsz:TSZ}}return WB}

/* ---------- 3D-world levels (the space station, imported maps): the triangles are uploaded once and the graphics card does the rest ---------- */
let BS=null;
function bspBuild(S){
if(S.bfc===2&&!S.FCP&&window.swCullInit)swCullInit(S);
if(!BWT.length)for(let i=0;i<BWBASE.length;i++)BWT.push(bwMkTex(i));
const FCP=S.FCP,GN=S.FGn,sg=S.FSg||1,TPo=S.TPo,TUv=S.TUv,FNx=S.FNx,nF=S.FT0.length,mvf=new Set();
if(S.mv)for(const M of S.mv)for(const f of M.faces)mvf.add(f);
const seen=new Uint8Array(nF),ids=[];
const addF=f=>{if(f<0||f>=nF||seen[f]||mvf.has(f))return;seen[f]=1;ids.push(f)};
for(let i=0;i<S.FRe.length;i++)addF(S.FRe[i]);
for(const pr of S.PRo)for(let t=pr[0];t<pr[0]+pr[1];t++)addF(S.TFc[t]);
const texFor=f=>{let tex=BWT[S.FCls[f]];if(S.FMat){const mi=S.FMat[f];if(mi!==65535){const mt=S.MT[mi];if(mt)tex=mt}}return tex};
const emit=(v,f,wet)=>{const t0=S.FT0[f],tn=S.FTn[f],fl=S.FFl[f],sh0=S.FSh[f]||1,mode=(fl&2)?1:0;let nx=0,ny=0,nz=0,nd=0;
if(S.bfc&&!(fl&10)){if(FCP){if(FCP[f]){nx=GN[f*4];ny=GN[f*4+1];nz=GN[f*4+2];nd=GN[f*4+3]}}else{nx=FNx[f*3];ny=FNx[f*3+1];nz=FNx[f*3+2];nd=nx*TPo[t0*9]+ny*TPo[t0*9+1]+nz*TPo[t0*9+2]}}
for(let t=t0;t<t0+tn;t++)for(let k=0;k<3;k++){const o=t*9+k*3,u=t*6+k*2;v.push(TPo[o],TPo[o+1],TPo[o+2],TUv[u],TUv[u+1],sh0/256,24*256/sh0,mode,nx,ny,nz,nd)}};
const mkB=(v,tex)=>{const arr=new Float32Array(v),buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);return{tex,n:arr.length/12,buf}};
const by=new Map(),water=new Map();
for(const f of ids){const fl=S.FFl[f],cls=S.FCls[f];if(cls==6&&!(fl&4)){const tx=texFor(f);let e=water.get(tx);if(!e)water.set(tx,e=[]);emit(e,f);continue}const tx=texFor(f);let e=by.get(tx);if(!e)by.set(tx,e=[]);emit(e,f)}
const out={op:[],wa:[],mv:[],S};for(const[tx,v]of by)out.op.push(mkB(v,tx));for(const[tx,v]of water)out.wa.push(mkB(v,tx));
if(S.mv)for(const M of S.mv){const by2=new Map();for(const f of M.faces){const tx=texFor(f);let e=by2.get(tx);if(!e)by2.set(tx,e=[]);emit(e,f)}const bs=[];for(const[tx,v]of by2)bs.push(mkB(v,tx));out.mv.push({M,bs})}
return out}
function bspDrop(){if(!BS)return;for(const b of BS.op.concat(BS.wa))gl.deleteBuffer(b.buf);for(const m of BS.mv)for(const b of m.bs)gl.deleteBuffer(b.buf);BS=null}
function bspDraw(dX,dY,plX,plY,ps){const S=SW;if(!BS||BS.S!==S){bspDrop();BS=bspBuild(S)}
const pr=P_.bsp;setCam(pr,dX,dY,ps);gl.uniform1f(pr.u.uFK,FKU);gl.uniform1i(pr.u.uTex,0);gl.uniform1f(pr.u.uAl,1);gl.uniform3f(pr.u.uEye,P.x,P.y,EZ);
const fc=!!S.FCP;gl.uniform1f(pr.u.uCuOn,S.bfc?1:0);gl.uniform2f(pr.u.uCu,fc?(S.FSg||1):1,fc?-.02:1e-6);
gl.uniform1f(pr.u.uMOn,0);gl.activeTexture(gl.TEXTURE0);
const dr=bs=>{for(const b of bs){{const tz=b.tex.length==65536?256:b.tex.length==4096?64:128;gl.bindTexture(gl.TEXTURE_2D,texOf(b.tex,tz,tz))}gl.bindBuffer(gl.ARRAY_BUFFER,b.buf);bindAttr(pr,'aPos',3,12,0);bindAttr(pr,'aUV',2,12,3);bindAttr(pr,'aF',3,12,5);bindAttr(pr,'aN',4,12,8);gl.drawArrays(gl.TRIANGLES,0,b.n)}};
dr(BS.op);
for(const m of BS.mv){const M=m.M,rt=M.rot&&M.ra;gl.uniform1f(pr.u.uMOn,1);gl.uniform3f(pr.u.uMO,M.x,M.y,M.z);if(rt){const R=M.R,pv=M.rot.pv;gl.uniformMatrix3fv(pr.u.uMR,false,[R[0],R[3],R[6],R[1],R[4],R[7],R[2],R[5],R[8]]);gl.uniform3f(pr.u.uMP,pv[0],pv[1],pv[2])}else{gl.uniformMatrix3fv(pr.u.uMR,false,[1,0,0,0,1,0,0,0,1]);gl.uniform3f(pr.u.uMP,0,0,0)}dr(m.bs)}
gl.uniform1f(pr.u.uMOn,0);
if(BS.wa.length){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.uniform1f(pr.u.uAl,.25);dr(BS.wa);gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(pr.u.uAl,1)}}
function bspWet(){if(!window.bwWet||!SW||!SW.nWB||!bwWet(P.x,P.y,EZ))return;const pr=P_.flat;gl.useProgram(pr.p);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.DST_COLOR,gl.ZERO);gl.uniform3f(pr.u.uC,.45,.72,.9);gl.drawArrays(gl.TRIANGLES,0,3);gl.blendFunc(gl.ONE,gl.ONE);gl.uniform3f(pr.u.uC,0,0,40/255);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST)}
/* ---------- dynamic geometry buffers ---------- */
let mV=new Float32Array(1<<16),mN=0,mBV=new Float32Array(1<<14),mBN=0;const mBuf=null;let mGl=null,sGl=null,tGl=null;
function pushV(arr,n,vals){return arr}
function grow(a,need){if(a.length>=need)return a;let l=a.length;while(l<need)l*=2;const b=new Float32Array(l);b.set(a);return b}
function meshFaces(faces,ox,oy,base,k,yaw,col,fl){const MX=TSZ==256;if(MX)matPrep(faces);const dd0=(ox-P.x)**2+(oy-P.y)**2,fog=Math.max(30,256/(1+Math.sqrt(dd0)*FKU)|0),Lx=-.4,Ly=-.3,Lz=.86,yc=Math.cos(yaw),ys=Math.sin(yaw);
for(const f of faces){const n0=f.n[0],n2=f.n[2],nx=n0*yc+n2*ys,ny=-n0*ys+n2*yc,nz=f.n[1];const q=f.p[0],wx=ox+(q[0]*yc+q[2]*ys)*k,wy=oy+(-q[0]*ys+q[2]*yc)*k,wz=base+q[1]*k;
if(!f.bl&&!SHOPF&&nx*(P.x-wx)+ny*(P.y-wy)+nz*(EZ-wz)<=0)continue;
const c=f.t?col:f.c;if(!c)continue;const np=f.p.length;if(np<3)continue;
let r,g_,b,a;const bl=f.bl;
if(bl){r=c[0]/255;g_=c[1]/255;b=c[2]/255;a=bl}else{const lit=Math.max(0,nx*Lx+ny*Ly+nz*Lz),ff=f.em?255:f.e?Math.min(255,fog*1.5|0):(fog*(.5+.6*lit)|0);r=Math.min(255,((c[0]*ff)>>8)+fl)/255;g_=Math.min(255,((c[1]*ff)>>8)+fl)/255;b=Math.min(255,((c[2]*ff)>>8)+fl)/255;a=1}
const dst=bl?1:0;const A=bl?mBV:mV;let nn=bl?mBN:mN;const need=nn+(np-2)*3*10;const AA=grow(A,need);if(bl)mBV=AA;else mV=AA;
const sk_=!bl&&f.sk!==undefined&&f.uv,tx=sk_||(MX&&!bl&&f.uv&&f.mt!==undefined);for(let t=1;t<np-1;t++){for(const pi of[0,t,t+1]){const p=f.p[pi];AA[nn++]=ox+(p[0]*yc+p[2]*ys)*k;AA[nn++]=oy+(-p[0]*ys+p[2]*yc)*k;AA[nn++]=base+p[1]*k;AA[nn++]=r;AA[nn++]=g_;AA[nn++]=b;AA[nn++]=a;if(tx){const q=f.uv[pi];AA[nn++]=q[0];AA[nn++]=q[1];AA[nn++]=sk_?100+f.sk:2+f.mt}else{AA[nn++]=0;AA[nn++]=0;AA[nn++]=f.em?-1:0}}}
if(bl)mBN=nn;else mN=nn}}
/* ---------- the frame ---------- */
let sprCnt=0,sprBuf=null,sprData=new Float32Array(4096);
let SPG=null,LF=null,occT=null,occDum=null,occVer=-1;
/* the 3D grid of solid cells the shadow rays walk (texture unit 5); a 1-cell empty one stands in when there is none */
function occBind(){gl.activeTexture(gl.TEXTURE5);const V=LF&&LF.occ&&LF.sh>0?LF.occ:null;
if(V){if(!occT||occVer!==V.ver){if(occT)gl.deleteTexture(occT);occT=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,occT);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,V.nx,V.ny,V.nz,0,gl.RED,gl.UNSIGNED_BYTE,V.data);for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_3D,k,v);occVer=V.ver}else gl.bindTexture(gl.TEXTURE_3D,occT)}
else{if(!occDum){occDum=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,occDum);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,1,1,1,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array(1));gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.NEAREST)}else gl.bindTexture(gl.TEXTURE_3D,occDum)}
gl.activeTexture(gl.TEXTURE0)}
function setLights(pr){const u=pr.u,L=LF,sp=pr===P_.spr;/* sprites (monsters etc.) get the same ambient darkening and light strength as the 3D surfaces: their shader dims by mix(amb,1,.4) and adds the light unboosted, so it is compensated here */
gl.uniform1i(u.uLN,L?L.n:0);gl.uniform1f(u.uAmb,L?(sp?Math.max(0,Math.min(1,(L.amb-.4)/.6)):L.amb):1);gl.uniform3f(u.uEyeP,P.x,P.y,EZ);if(L&&L.n){gl.uniform4fv(u.uLP,L.pos);if(sp){if(!SPG||SPG.length!==L.col.length)SPG=new Float32Array(L.col.length);for(let i=0;i<L.col.length;i++)SPG[i]=L.col[i]*1.6;gl.uniform4fv(u.uLC,SPG)}else gl.uniform4fv(u.uLC,L.col);gl.uniform4fv(u.uLD,L.dir)}
const V=L&&L.occ&&L.sh>0?L.occ:null;gl.uniform1i(u.uSh,V?Math.min(L.sh,L.n):(window.ARBN&&ARBN.rtOn&&ARBN.rtOn()&&L&&L.sh>0?Math.min(L.sh,L.n):0));if(V){gl.uniform4f(u.uOc0,V.ox,V.oy,V.oz,V.cs);gl.uniform3f(u.uOcN,V.nx,V.ny,V.nz)}gl.uniform1i(u.uOcc,5)}
function setCam(pr,dX,dY,ps){gl.useProgram(pr.p);gl.uniform2f(pr.u.uP,P.x,P.y);gl.uniform2f(pr.u.uD,dX,dY);gl.uniform4f(pr.u.uK,EZ,P.pt||0,ZV,ps);if(pr.u.uLN!==undefined||pr.u.uAmb!==undefined)setLights(pr)}
function bindAttr(pr,name,size,stride,off,div){const l=pr.a[name];if(l===undefined||l<0)return;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride*4,off*4);gl.vertexAttribDivisor(l,div||0)}
let dynBuf=null;
let matArr=null,matReal=0;
function bindMat(pr){const need=TSZ==256;if(!matArr||(need&&!matReal)){if(matArr)gl.deleteTexture(matArr);matArr=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,matArr);if(need){const M=matInit(),L=M.a.length;gl.texStorage3D(gl.TEXTURE_2D_ARRAY,9,gl.RGBA8,256,256,L);for(let i=0;i<L;i++)gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,256,256,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(M.a[i].buffer));gl.generateMipmap(gl.TEXTURE_2D_ARRAY);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);try{const e=gl.getExtension('EXT_texture_filter_anisotropic');if(e)gl.texParameterf(gl.TEXTURE_2D_ARRAY,e.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(e.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))}catch(e){}matReal=1}else{gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA8,1,1,1);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,0,1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.NEAREST);matReal=0}gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT)}
gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D_ARRAY,matArr);gl.uniform1i(pr.u.uMat,3);bindSk(pr);gl.activeTexture(gl.TEXTURE0)}
let skArr=null,skVer=-1;
/* the skin pictures of the 3D people: one texture-array layer each */
function bindSk(pr){if(!skArr){skArr=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,skArr);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,9,gl.RGBA8,256,256,SKN.MAXL);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const z=new Uint8Array(256*256*4);for(let i=0;i<SKN.MAXL;i++)gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,256,256,1,gl.RGBA,gl.UNSIGNED_BYTE,z);skVer=-1}
gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,skArr);
if(skVer!==SKN.ver){let up=0;SKN.list.forEach((l,i)=>{if(!l.up){gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,256,256,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(l.a.buffer));l.up=1;up=1}});if(up)gl.generateMipmap(gl.TEXTURE_2D_ARRAY);skVer=SKN.ver}
gl.uniform1i(pr.u.uSk,4)}
function drawDyn(pr,data,n,layout){if(pr===P_.mesh)bindMat(pr);if(!dynBuf)dynBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,n),gl.STREAM_DRAW);for(const l of layout)bindAttr(pr,l[0],l[1],l[2],l[3],0);gl.drawArrays(gl.TRIANGLES,0,n/layout[0][2])}
function resetAttrs(){for(let i=0;i<8;i++){gl.disableVertexAttribArray(i);gl.vertexAttribDivisor(i,0)}}
function render(dX,dY,plX,plY,inv,hH,ps){
if(!want||!init())return false;if(gl.__fake&&!ARBN.canSend())return true;FKU=SW?SW.FKS:FK;LF=window.ltFrame?window.ltFrame():null;occBind();
let w=W,h=H;if(gl.__fake){const rs=ARBN.size(W,H);w=rs[0];h=rs[1];hH=hH*h/H}else if(cvs.width!=w||cvs.height!=h){cvs.width=w;cvs.height=h}
setFbo(w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,w,h);gl.bindVertexArray(vaoE);resetAttrs();
gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.clearColor(0,0,0,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
/* background: gradient above and below the horizon (and the tower skyline in the colosseum) */
{const pr=P_.bg;gl.useProgram(pr.p);gl.disable(gl.DEPTH_TEST);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,lineTex('cl',CL,h,0xff000000,H));gl.uniform1i(pr.u.uCL,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,lineTex('fl',FL,h,0xff000000,H));gl.uniform1i(pr.u.uFL,1);
const cq=GR&&GR.cq;if(cq){if(!SKYT)SKYT=mkTowers();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,texOf(SKYT,1024,128,false));gl.uniform1i(pr.u.uSky,2)}else{gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,whiteT);gl.uniform1i(pr.u.uSky,2)}
gl.uniform4f(pr.u.uB,h,hH,0,w);gl.uniform4f(pr.u.uD,dX,dY,plX,plY);gl.uniform1f(pr.u.uCQ,cq?1:0);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);gl.activeTexture(gl.TEXTURE0)}
/* the level */
if(SW)bspDraw(dX,dY,plX,plY,ps);else{if(BS)bspDrop();const pr=P_.world;setCam(pr,dX,dY,ps);gl.uniform1f(pr.u.uFK,FKU);gl.uniform1f(pr.u.uAT,0);gl.uniform1i(pr.u.uTex,0);gl.activeTexture(gl.TEXTURE0);
for(const b of worldBatches()){let tx=b.tex;if(b.cw==1)tx=(((T*8)|0)&1)?PTr:PT;gl.uniform1f(pr.u.uCF,b.cw?LCF:0);gl.bindTexture(gl.TEXTURE_2D,texOf(tx));gl.bindBuffer(gl.ARRAY_BUFFER,b.buf);bindAttr(pr,'aPos',3,7,0);bindAttr(pr,'aUV',2,7,3);bindAttr(pr,'aF',2,7,5);gl.drawArrays(gl.TRIANGLES,0,b.n)}}
/* acid puddles on the floor */
if((!SW||SW.g3d)&&AP&&AP.length){const pr=P_.acid;setCam(pr,dX,dY,ps);gl.uniform1f(pr.u.uT,T);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-2);
const d=[];for(const a of AP){const z=FHc(a.x,a.y)+.003,r=a.r*1.15,lf=a.life>=1.5?1:a.life/1.5;const c=[[a.x-r,a.y-r],[a.x+r,a.y-r],[a.x+r,a.y+r],[a.x-r,a.y+r]];for(const i of[0,1,2,0,2,3])d.push(c[i][0],c[i][1],z,a.x,a.y,a.r,lf>1?1:lf)}
const arr=new Float32Array(d);drawDyn(pr,arr,arr.length,[['aPos',3,7,0],['aA',4,7,3]]);gl.disable(gl.POLYGON_OFFSET_FILL);gl.depthMask(true);gl.disable(gl.BLEND)}
/* sun shadows */
if((!SW||SW.br)&&typeof BRV!='undefined'&&BRV&&typeof SHDON!='undefined'&&SHDON){const T3=brShadowBuild(dX,dY,30),nv=T3.length/4;if(nv>=3){const pr=P_.shadow;setCam(pr,dX,dY,ps);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-2);
const arr=new Float32Array(nv*7);for(let i=0;i<nv;i++){arr[i*7]=T3[i*4];arr[i*7+1]=T3[i*4+1];arr[i*7+2]=T3[i*4+2];arr[i*7+3]=T3[i*4+3]}drawDyn(pr,arr,arr.length,[['aPos',3,7,0],['aA',4,7,3]]);gl.disable(gl.POLYGON_OFFSET_FILL);gl.depthMask(true);gl.disable(gl.BLEND)}}
/* smoke (applied to the level, then sprites in front of it are drawn on top) */
decals(dX,dY,plX,plY,ps);
if(SMK.length){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,fb2);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
const pr=P_.post;gl.useProgram(pr.p);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.ALWAYS);gl.depthMask(true);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fbC2);gl.uniform1i(pr.u.uC,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,fbD2);gl.uniform1i(pr.u.uZ,1);
const sm=SMK.slice(0,8);const sv=new Float32Array(32);sm.forEach((s,i)=>{sv[i*4]=s.x;sv[i*4+1]=s.y;sv[i*4+2]=smkR(s);sv[i*4+3]=Math.min(1,s.t/1.5)});gl.uniform4fv(pr.u.uS,sv);const sv2=new Float32Array(32);sm.forEach((s,i)=>{sv2[i*4]=smkSeed(s)});gl.uniform4fv(pr.u.uS2,sv2);gl.uniform1f(pr.u.uCe,GR&&(GR.city||GR.cq)?0:1);gl.uniform1i(pr.u.uSN,sm.length);
gl.uniform4f(pr.u.uD,dX,dY,plX,plY);gl.uniform4f(pr.u.uB,h,hH,ZV,w);gl.uniform4f(pr.u.uP3,P.x,P.y,EZ,WHT);gl.uniform1f(pr.u.uT,T);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthFunc(gl.LEQUAL);gl.activeTexture(gl.TEXTURE0)}
/* sprites, props and everything else in the list */
mN=0;mBN=0;const L=buildL();for(const s of L)s.d=(s.x-P.x)**2+(s.y-P.y)**2;
const sb=new Map(),sblend=[];const shields=[];const cull=[];
const prevMesh=window.__glMesh;window.__glMesh=meshFaces;
try{for(const s of L){if(s.q){if(s.q==1){shields.push(s);continue}
try{s.q==11?drawHum(s,dX,dY,plX,plY,inv,hH,null):s.q==10?drawRoof(s.rf,dX,dY,plX,plY,inv,hH,null):s.q==5?drawProp(s.pm,dX,dY,plX,plY,inv,hH,null):s.q==6?drawTurret(s.tu,s.hs,dX,dY,plX,plY,inv,hH,null):s.q==4?drawGate(s,dX,dY,plX,plY,inv,hH,null):s.q==3?drawMed(s.mk,dX,dY,plX,plY,inv,hH,null):s.q==7?drawChest(s.ch,dX,dY,plX,plY,inv,hH,null):s.q==8?drawPortal(s,dX,dY,plX,plY,inv,hH,null):s.q==9?drawShopObj(s.o,dX,dY,plX,plY,inv,hH,null):s.q==2?drawDsp(s.dsp,dX,dY,plX,plY,inv,hH,null):0}catch(e){if(!window.__glErr){window.__glErr=1;console.error('GL item',e)}};continue}
const dx=s.x-P.x,dy=s.y-P.y,ty=dx*dX+dy*dY;if(ty<.15)continue;
let list=sb.get(s.t);if(!list){list=[];sb.set(s.t,list)}list.push(s)}}
finally{window.__glMesh=prevMesh}
{const pr=P_.spr;setCam(pr,dX,dY,ps);gl.uniform2f(pr.u.uWH,w,h);gl.uniform3fv(pr.u.uOL,[(OLR&255)/255,(OLR>>8&255)/255,(OLR>>16&255)/255,(OLB&255)/255,(OLB>>8&255)/255,(OLB>>16&255)/255]);gl.uniform1i(pr.u.uTex,0);gl.activeTexture(gl.TEXTURE0);
const bsz=8;const flush=(arr,t,blend)=>{const n=arr.length;if(!n)return;if(sprData.length<n*bsz)sprData=new Float32Array(Math.max(sprData.length*2,n*bsz));let o=0;
for(const s of arr){const ty=(s.x-P.x)*dX+(s.y-P.y)*dY;const f=(s.fb?256:Math.max(30,256/(1+Math.sqrt(s.d)*FKU)|0))/256;const zb=SW?s.zb:(s.nh?0:FHc(s.x,s.y))+s.fl;
sprData[o++]=s.x;sprData[o++]=s.y;sprData[o++]=zb;sprData[o++]=SW?s.s*SW.SS:s.s;sprData[o++]=f;sprData[o++]=s.fh?90/255:0;sprData[o++]=s.al?.8:1;sprData[o++]=s.ol?s.ol:0}
if(!sprBuf)sprBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sprBuf);gl.bufferData(gl.ARRAY_BUFFER,sprData.subarray(0,n*bsz),gl.STREAM_DRAW);
/* aA = (x,y,z), aB = (size, fog, flash, alpha), aC = (0,0,0,outline) */
const A=pr.a;const l1=A.aA,l2=A.aB,l3=A.aO;gl.enableVertexAttribArray(l1);gl.enableVertexAttribArray(l2);gl.enableVertexAttribArray(l3);gl.vertexAttribPointer(l1,3,gl.FLOAT,false,32,0);gl.vertexAttribPointer(l2,4,gl.FLOAT,false,32,12);gl.vertexAttribPointer(l3,1,gl.FLOAT,false,32,28);gl.vertexAttribDivisor(l1,1);gl.vertexAttribDivisor(l2,1);gl.vertexAttribDivisor(l3,1);
gl.bindTexture(gl.TEXTURE_2D,texOf(t,0,0,false));gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);gl.vertexAttribDivisor(l1,0);gl.vertexAttribDivisor(l2,0);gl.vertexAttribDivisor(l3,0)};
gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
for(const[t,arr]of sb){const opq=arr.filter(s=>!s.al),bl=arr.filter(s=>s.al);if(opq.length)flush(opq,t);if(bl.length)sblend.push([t,bl])}
gl.depthMask(false);const flat=[];for(const[t,arr]of sblend)for(const s of arr)flat.push([t,s]);flat.sort((a,b)=>b[1].d-a[1].d);for(const[t,s]of flat)flush([s],t);gl.depthMask(true);gl.disable(gl.BLEND)}
/* 3D meshes */
if(mN>0||mBN>0){const pr=P_.mesh;setCam(pr,dX,dY,ps);const lay=[['aPos',3,10,0],['aCol',4,10,3],['aUV',3,10,7]];
if(mN>0)drawDyn(pr,mV,mN,lay);if(mBN>0){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);drawDyn(pr,mBV,mBN,lay);gl.depthMask(true);gl.disable(gl.BLEND)}}
if(shields.length)drawShields(shields,dX,dY,plX,plY,ps);
if(SHOPF){mN=0;mBN=0;window.__glMesh=meshFaces;try{if(!SHOPF.bk)drawBasket3D(dX,dY,plX,plY,inv,hH)}finally{window.__glMesh=prevMesh}
if(mN>0||mBN>0){gl.clear(gl.DEPTH_BUFFER_BIT);const pr=P_.mesh;setCam(pr,dX,dY,ps);const lay=[['aPos',3,10,0],['aCol',4,10,3],['aUV',3,10,7]];if(mN>0)drawDyn(pr,mV,mN,lay)}}
resetAttrs();
if(SW)bspWet();
/* copy to the screen buffer */
let src=fbo;if(fbS){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,fb2);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);src=fb2}
gl.bindFramebuffer(gl.READ_FRAMEBUFFER,src);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,w,h,0,0,W,H,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
if(gl.__fake)ARBN.endFrame();
return true}
function decals(dX,dY,plX,plY,ps){let any=false;for(const d of DEC)if(d.wall||d.flat){any=true;break}if(!any)return;const pr=P_.world;setCam(pr,dX,dY,ps);gl.uniform1f(pr.u.uFK,FKU);gl.uniform1f(pr.u.uAT,.505);gl.uniform1f(pr.u.uCF,0);gl.uniform1i(pr.u.uTex,0);gl.activeTexture(gl.TEXTURE0);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-2);
const kw=ZV*2*Math.hypot(plX,plY)*H/W;const tmp=new Float32Array(42);
for(const d of DEC){if(!d.wall&&!d.flat)continue;const dx=d.x-P.x,dy=d.y-P.y;if(d.wall&&dx*d.nx+dy*d.ny>=-.01)continue;const ty=dx*dX+dy*dY;if(ty<(d.flat?-.6:.2)||ty>28)continue;
let P4;if(d.flat){/* blood on the ground: a flat quad lying on the floor, turned to the direction it was sprayed */const h=d.sz/2,cr=Math.cos(d.rot||0)*h,sr=Math.sin(d.rot||0)*h,q=(u,v)=>[d.x+u*cr-v*sr,d.y+u*sr+v*cr,d.z];P4=[q(-1,-1),q(1,-1),q(1,1),q(-1,1)]}else{const hw=d.sz*kw/2,hh=d.sz/2,rx=d.ny,ry=-d.nx,ox=d.nx*.004,oy=d.ny*.004;
const a=[d.x-rx*hw+ox,d.y-ry*hw+oy,d.z+hh],b=[d.x+rx*hw+ox,d.y+ry*hw+oy,d.z+hh],c=[d.x+rx*hw+ox,d.y+ry*hw+oy,d.z-hh],e=[d.x-rx*hw+ox,d.y-ry*hw+oy,d.z-hh];P4=[a,b,c,e]}
const UV=[[0,0],[1,0],[1,1],[0,1]];let o=0;for(const i of[0,1,2,0,2,3]){tmp[o++]=P4[i][0];tmp[o++]=P4[i][1];tmp[o++]=P4[i][2];tmp[o++]=UV[i][0];tmp[o++]=UV[i][1];tmp[o++]=1;tmp[o++]=40}
/* aF = (shade multiplier, fog floor); the fog factor uses the distance like the software renderer */
for(let i=0;i<6;i++){tmp[i*7+5]=1;tmp[i*7+6]=40}
gl.uniform1f(pr.u.uFK,FKU);gl.bindTexture(gl.TEXTURE_2D,texOf(d.t,0,0,false));drawDyn(pr,tmp,42,[['aPos',3,7,0],['aUV',2,7,3],['aF',2,7,5]])}
gl.disable(gl.POLYGON_OFFSET_FILL);gl.uniform1f(pr.u.uAT,0)}
function drawShields(list,dX,dY,plX,plY,ps){const pr=P_.mesh;setCam(pr,dX,dY,ps);const d=[];
for(const s of list){const nx=-Math.sin(s.sh.a),ny=Math.cos(s.sh.a),sh=s.sh;const cr=1-sh.hp/sh.mhp,en=DM&&sh.o&&!wAlly(sh),rc=en?255:80+cr*175,gc=en?110-cr*70:230-cr*150,bc=en?90-cr*60:255-cr*200;const fz=SW?(()=>{const f=swNearFloor(sh.x,sh.y,P.z);return f===f?f:P.z})():FHc(sh.x,sh.y);
const A=[sh.x-nx*.8,sh.y-ny*.8],B=[sh.x+nx*.8,sh.y+ny*.8];const P4=[[A[0],A[1],fz+.9,0,0],[B[0],B[1],fz+.9,1,0],[B[0],B[1],fz,1,1],[A[0],A[1],fz,0,1]];const ex=sh.fl>0?.25:0;
for(const i of[0,1,2,0,2,3]){const p=P4[i];d.push(p[0],p[1],p[2],rc/255,gc/255,bc/255,ex,p[3],p[4],1)}}
const arr=new Float32Array(d);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);drawDyn(pr,arr,arr.length,[['aPos',3,10,0],['aCol',4,10,3],['aUV',3,10,7]]);gl.depthMask(true);gl.disable(gl.BLEND)}
if(window.ARBN)ARBN.onFail=m=>{bad='native renderer: '+m;try{console.warn(bad)}catch(e){}hardReset()};
return{get cv(){return gl&&gl.__fake?ARBN.cv:cvs},get native(){return !!(gl&&gl.__fake)},get direct(){return !!(gl&&gl.__fake&&ARBN.direct)},use(){return want&&init()},off(){want=false},setLCF(v){LCF=v},render,get want(){return want},set want(v){want=!!v},get ok(){return init()},get msaaActive(){return fbS},get msaa(){return msaa},set msaa(v){v=+v;msaa=v==2||v==4||v==8?v:0;try{localStorage.setItem('ld_msaa',String(msaa))}catch(e){}},maxMsaa(){return init()?gl.getParameter(gl.MAX_SAMPLES)|0:0},get err(){return bad},info(){init();return gl?gl.getParameter(gl.VERSION):bad}};
})();

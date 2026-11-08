/* ===== The apocalypse cutscene in real 3D (hardware rendering) =====
   Its own small WebGL2 renderer: a lit planet with atmosphere, the alien station as a faceted mesh, a city of extruded towers,
   billboarded fire / smoke / dust, a shockwave and a mushroom cloud. draw(t,W,H) renders time t (seconds) into APC3D.cv; the game then
   copies that picture into its canvas and adds the subtitles, flash and title on top. Returns false if WebGL2 is unavailable. */
window.APC3D=(function(){
const cv=document.createElement('canvas');let gl=null,state=0,M={},PM=null,PB=null,bbBuf=null,CITY=null,rt=null;
const cl=(v,a,b)=>v<a?a:v>b?b:v,ss=(a,b,x)=>{const k=cl((x-a)/(b-a),0,1);return k*k*(3-2*k)},lerp=(a,b,k)=>a+(b-a)*k;
const mixc=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
/* ---- tiny matrix library (column-major) ---- */
const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o};
const persp=(fov,asp,n,f)=>{const t=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o};
const look=(e,t,u)=>{let zx=e[0]-t[0],zy=e[1]-t[1],zz=e[2]-t[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*e[0]+xy*e[1]+xz*e[2]),-(yx*e[0]+yy*e[1]+yz*e[2]),-(zx*e[0]+zy*e[1]+zz*e[2]),1])};
const model=(x,y,z,sx,sy,sz,ry,rx,rz)=>{const cy=Math.cos(ry||0),sy_=Math.sin(ry||0),cx=Math.cos(rx||0),sx_=Math.sin(rx||0),cz=Math.cos(rz||0),sz_=Math.sin(rz||0);
/* R = Ry * Rx * Rz */
const rz3=[cz,sz_,0,-sz_,cz,0,0,0,1],rx3=[1,0,0,0,cx,sx_,0,-sx_,cx],ry3=[cy,0,-sy_,0,1,0,sy_,0,cy];
const m3=(a,b)=>{const o=new Array(9);for(let c=0;c<3;c++)for(let r=0;r<3;r++){let s=0;for(let k=0;k<3;k++)s+=a[k*3+r]*b[c*3+k];o[c*3+r]=s}return o};
const R=m3(ry3,m3(rx3,rz3));return new Float32Array([R[0]*sx,R[1]*sx,R[2]*sx,0,R[3]*sy,R[4]*sy,R[5]*sy,0,R[6]*sz,R[7]*sz,R[8]*sz,0,x,y,z,1])};
/* ---- geometry builders: flat arrays of [pos(3) normal(3) colour(3) glow(1)] ---- */
function Geo(){const a=[];return{a,tri(p,q,r,c,e){const ux=q[0]-p[0],uy=q[1]-p[1],uz=q[2]-p[2],vx=r[0]-p[0],vy=r[1]-p[1],vz=r[2]-p[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;for(const v of[p,q,r])a.push(v[0],v[1],v[2],nx,ny,nz,c[0],c[1],c[2],e||0)},
triS(p,q,r,np,nq,nr,c,e){const L=[[p,np],[q,nq],[r,nr]];for(const[v,n]of L)a.push(v[0],v[1],v[2],n[0],n[1],n[2],c[0],c[1],c[2],e||0)},
quad(p,q,r,s,c,e){this.tri(p,q,r,c,e);this.tri(p,r,s,c,e)},
box(cx,cy,cz,sx,sy,sz,c,e){const x=sx/2,y=sy/2,z=sz/2,P=(a,b,d)=>[cx+a*x,cy+b*y,cz+d*z];this.quad(P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1),c,e);this.quad(P(1,-1,-1),P(-1,-1,-1),P(-1,1,-1),P(1,1,-1),c,e);this.quad(P(1,-1,1),P(1,-1,-1),P(1,1,-1),P(1,1,1),c,e);this.quad(P(-1,-1,-1),P(-1,-1,1),P(-1,1,1),P(-1,1,-1),c,e);this.quad(P(-1,1,1),P(1,1,1),P(1,1,-1),P(-1,1,-1),c,e);this.quad(P(-1,-1,-1),P(1,-1,-1),P(1,-1,1),P(-1,-1,1),c,e)},
lathe(pr,seg,col,e){for(let i=0;i<pr.length-1;i++)for(let k=0;k<seg;k++){const a0=k/seg*6.2832,a1=(k+1)/seg*6.2832,P=(p,a)=>[Math.cos(a)*p[0],p[1],Math.sin(a)*p[0]],c=col(i,k);this.quad(P(pr[i],a0),P(pr[i],a1),P(pr[i+1],a1),P(pr[i+1],a0),c,e)}},
cone(b,d,rad,len,seg,c,e){let ax=d[0],ay=d[1],az=d[2];const l=Math.hypot(ax,ay,az);ax/=l;ay/=l;az/=l;let ux=0,uy=1,uz=0;if(Math.abs(ay)>.9){ux=1;uy=0}let sx=ay*uz-az*uy,sy=az*ux-ax*uz,sz=ax*uy-ay*ux;const sl=Math.hypot(sx,sy,sz);sx/=sl;sy/=sl;sz/=sl;const tx=ay*sz-az*sy,ty=az*sx-ax*sz,tz=ax*sy-ay*sx,tip=[b[0]+ax*len,b[1]+ay*len,b[2]+az*len];
for(let k=0;k<seg;k++){const a0=k/seg*6.2832,a1=(k+1)/seg*6.2832,P=a=>[b[0]+(sx*Math.cos(a)+tx*Math.sin(a))*rad,b[1]+(sy*Math.cos(a)+ty*Math.sin(a))*rad,b[2]+(sz*Math.cos(a)+tz*Math.sin(a))*rad];this.tri(P(a0),P(a1),tip,c,e)}}}}
function sphereGeo(R,la,lo,colFn){const g=[];const P=(i,j)=>{const th=i/la*Math.PI,ph=j/lo*6.2832,x=Math.sin(th)*Math.cos(ph),y=Math.cos(th),z=Math.sin(th)*Math.sin(ph);return[x,y,z]};
const V=(i,j)=>{const n=P(i,j),c=colFn?colFn(n):[1,1,1,0];g.push(n[0]*R,n[1]*R,n[2]*R,n[0],n[1],n[2],c[0],c[1],c[2],c[3]||0)};
for(let i=0;i<la;i++)for(let j=0;j<lo;j++){V(i,j);V(i+1,j);V(i+1,j+1);V(i,j);V(i+1,j+1);V(i,j+1)}return g}
function noise3(){const h=(x,y,z)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1274126177);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296};
const sm=t=>t*t*(3-2*t);const v=(x,y,z)=>{const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),fx=sm(x-xi),fy=sm(y-yi),fz=sm(z-zi);const L=(a,b,c)=>h(xi+a,yi+b,zi+c);
return lerp(lerp(lerp(L(0,0,0),L(1,0,0),fx),lerp(L(0,1,0),L(1,1,0),fx),fy),lerp(lerp(L(0,0,1),L(1,0,1),fx),lerp(L(0,1,1),L(1,1,1),fx),fy),fz)};
return(x,y,z)=>v(x,y,z)*.55+v(x*2.1,y*2.1,z*2.1)*.3+v(x*4.3,y*4.3,z*4.3)*.15}
/* ---- shaders ---- */
const MVS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec3 aC;layout(location=3) in float aE;
uniform mat4 uVP;uniform mat4 uM;out vec3 vW;out vec3 vN;out vec3 vC;out float vE;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM)*aN;vC=aC;vE=aE;gl_Position=uVP*w;}`;
const MFS=`#version 300 es
precision highp float;in vec3 vW;in vec3 vN;in vec3 vC;in float vE;out vec4 o;
uniform int uMode;uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uAmb;uniform vec3 uPL;uniform vec3 uPC;uniform float uPR;uniform vec3 uCam;uniform float uHeat;uniform float uLit;uniform float uChar;
uniform vec3 uTop;uniform vec3 uHor;uniform vec3 uGD;uniform vec3 uGC;uniform vec3 uAtm;uniform vec4 uFog;uniform float uFl;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);vec3 col=vC;if(dot(N,V)<0.){if(uMode==2)discard;if(uMode!=1)N=-N;}
if(uMode==5){vec3 d=normalize(vW-uCam);float y=d.y;col=y>0.?mix(uHor,uTop,pow(clamp(y,0.,1.),.5)):uHor*.45;col+=uGC*pow(max(dot(d,uGD),0.),5.);o=vec4(col,1.);return;}
if(uMode==6){o=vec4(vC*uFl,1.);return;}
if(uMode==2){float f=pow(1.-max(dot(N,V),0.),2.6);o=vec4(uAtm*f*1.5,1.);return;}
float lam=max(dot(N,uSun),0.);vec3 L=uAmb+uSunC*lam;vec3 dp=uPL-vW;float r=length(dp);L+=uPC*max(dot(N,dp/r),0.)*uPR/(1.+r*r*.0006);
if(uMode==1){float sl=dot(N,uSun);col=vC*(.05+max(sl,0.)*1.05);col+=vec3(1.,.78,.4)*vE*smoothstep(.04,-.2,sl)*.9;float f=pow(1.-max(dot(N,V),0.),3.);col+=uAtm*f*.5;o=vec4(col,1.);return;}
if(uMode==3){if(abs(N.y)<.5){vec2 q=vec2((vW.x+vW.z)*.55,vW.y*.32);vec2 c=floor(q),f=fract(q);float w=step(.2,f.x)*step(f.x,.8)*step(.25,f.y)*step(f.y,.8)*step(2.5,vW.y);float h=hs(c+vec2(floor(vC.r*97.),0.));float lit=step(h,uLit)*w;col=vC*(.7+.3*hs(c+3.))*(1.-.7*w);col=lit(col,L);col=mix(col,vec3(1.,.78,.38)*.85,lit*.9);}else{col=vC*.6;col=col*L;}col*=uChar;}
else if(uMode==4){float rd=step(abs(fract(vW.x/24.+.5)-.5),.03)+step(abs(fract(vW.z/24.+.5)-.5),.03);col=vec3(.07,.065,.07)+vec3(.12,.1,.05)*rd*.5;col=col*L*uChar;}
else{col=col*L;float g=vE>1.5?uHeat:min(vE,1.);col+=vC*g*1.5;col*=uChar;}
if(uFog.a>0.){float f=1.-exp(-uFog.a*length(uCam-vW));col=mix(col,uFog.rgb,clamp(f,0.,1.));}
o=vec4(col,1.);}`.replace('col=lit(col,L);','col=col*L;');
const BVS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec2 aU;layout(location=2) in vec4 aC;uniform mat4 uVP;out vec2 vU;out vec4 vC;
void main(){vU=aU;vC=aC;gl_Position=uVP*vec4(aP,1.);}`;
const BFS=`#version 300 es
precision highp float;in vec2 vU;in vec4 vC;uniform int uAdd;out vec4 o;
void main(){float d=dot(vU,vU);if(d>1.)discard;float a=1.-d;a*=a;float n=.8+.2*sin(vU.x*9.+vC.a*40.)*sin(vU.y*7.+vC.a*23.);a*=n;
if(uAdd==1)o=vec4(vC.rgb*vC.a*a,1.);else o=vec4(vC.rgb,vC.a*a);}`;
function prog(vs,fs){const mk=(t,s)=>{const h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(h));return h};
const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i);u[a.name]=gl.getUniformLocation(p,a.name)}return{p,u}}
function upload(a){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);
const S=40;gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,S,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,S,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,S,24);gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,1,gl.FLOAT,false,S,36);return{vao,n:a.length/10}}
/* ---- one-time scene assets ---- */
function build(){const nz=noise3(),r=rng(5);
M.earth=upload(sphereGeo(100,64,128,n=>{const h=nz(n[0]*3+9,n[1]*3,n[2]*3),cd=nz(n[0]*5+40,n[1]*5,n[2]*5);let c;if(h<.5)c=mixc([.02,.08,.26],[.05,.2,.45],h*2);else c=mixc([.12,.3,.12],[.45,.38,.2],cl((h-.5)*3,0,1));if(cd>.58)c=mixc(c,[.92,.94,.98],cl((cd-.58)*6,0,.9));
const lights=h>.5&&nz(n[0]*30,n[1]*30,n[2]*30)>.66?1:0;return[c[0],c[1],c[2],lights]}));
M.atm=upload(sphereGeo(105,40,80,null));
{const g=Geo();let sk=rng(9);const col=(i,k)=>{const v=.8+sk()*.4;return[.14*v,.09*v,.22*v]};
g.lathe([[0,.62],[.3,.58],[.62,.45],[.9,.2],[1,.04],[.96,-.1],[.78,-.28],[.5,-.42],[.22,-.6],[0,-.78]],30,col,0);
g.lathe([[0,.95],[.2,.88],[.4,.76],[.52,.62]],24,()=>[.1,.07,.17],0);
for(let k=0;k<12;k++){const a=k/12*6.2832+.2,ln=.34+sk()*.3,dy=(sk()-.5)*.5;g.cone([Math.cos(a)*.93,.02,Math.sin(a)*.93],[Math.cos(a),dy,Math.sin(a)],.07,ln,5,[.04,.03,.06],0)}
for(let k=0;k<40;k++){const a=k/40*6.2832;g.box(Math.cos(a)*1.0,.05,Math.sin(a)*1.0,.045,.035,.045,k&1?[1,.25,.8]:[.3,1,.55],1)}
for(let k=0;k<16;k++){const a=sk()*6.2832,rr=.25+sk()*.65,y=.58-.55*rr*rr*.9,ang=sk()*6.2832;g.box(Math.cos(a)*rr,y,Math.sin(a)*rr,.022+sk()*.02,.02,.2+sk()*.18,[1,.5,.12],2)}
for(let k=0;k<5;k++){const a=k/5*6.2832;g.cone([Math.cos(a)*.12,-.7,Math.sin(a)*.12],[Math.cos(a)*.3,-1,Math.sin(a)*.3],.05,.4+sk()*.2,5,[.07,.04,.1],0)}
M.stn=upload(g.a);
const eg=sphereGeo(.2,10,16,()=>[1,.3,.85,1]);for(let i=0;i<eg.length;i+=10)eg[i+1]-=.66;M.eye=upload(eg)}
{const g=Geo();g.box(0,.5,0,1,1,1,[.34,.34,.38],0);M.cube=upload(g.a)}
{const g=Geo(),sk=rng(21);
g.lathe([[0,.06],[.96,.06],[1,0],[.96,-.1],[.7,-.16],[0,-.2]],20,(i,k)=>{const v=.8+((k*7+i*3)%5)*.07;return[.06*v,.045*v,.1*v]},0);
for(const[rr,col]of[[.34,[.2,.9,1]],[.62,[1,.3,.85]],[.88,[.2,.9,1]]])g.lathe([[rr-.012,.064],[rr+.012,.064]],48,()=>col,1);
for(let k=0;k<36;k++){const a=k/36*6.2832;g.box(Math.cos(a)*.74,.07,Math.sin(a)*.74,.04,.012,.03,[1,.3,.85],1)}
g.lathe([[.05,.066],[.12,.066]],14,()=>[1,.3,.85],1);
for(let k=0;k<8;k++){const a=k/8*6.2832+.2,c=Math.cos(a),s=Math.sin(a),ln=(k==2||k==5)?.25:.7;g.box(c*.93,.12,s*.93,.07,.12,.07,[.03,.02,.05],0);g.cone([c*.93,.17,s*.93],[c*.22,1,s*.22],.045,ln,5,[.04,.03,.07],0);g.box(c*(.93+.22*ln),.17+ln,s*(.93+.22*ln),.04,.04,.04,k&1?[1,.3,.85]:[.2,.9,1],1)}
for(let k=0;k<24;k++){const a=k/24*6.2832;g.box(Math.cos(a)*.97,.09,Math.sin(a)*.97,.09,.05,.05,[.03,.025,.05],0)}
for(let k=0;k<11;k++){const a=k/11*6.2832+.35;g.box(Math.cos(a)*.5,.07,Math.sin(a)*.5,.9,.012,.025,[1,.5,.12],2)}
M.plat=upload(g.a)}
{const g=Geo();g.lathe([[0,0],[.34,.02],[.4,.2],[.33,.5],[.22,.8],[.06,1.0],[0,1.04]],14,(i)=>[.5,.52,.58],0);g.box(0,.5,.35,.2,.3,.03,[.8,1,.9],1);M.podS=upload(g.a)}
{const g=[],n=48;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,P=(rr,a)=>[Math.cos(a)*rr,0,Math.sin(a)*rr];const A=P(.9,a0),B=P(1,a0),C=P(1,a1),D=P(.9,a1);for(const v of[A,B,C,A,C,D])g.push(v[0],v[1],v[2],0,1,0,1,1,1,0)}M.ring=upload(g)}
{const g=Geo();g.quad([-3000,0,-3000],[-3000,0,3000],[3000,0,3000],[3000,0,-3000],[.2,.2,.2],0);M.ground=upload(g.a)}
M.sky=upload(sphereGeo(1500,16,32,null));
const rb=rng(77);CITY=[];for(let x=-136;x<=136;x+=17)for(let z=24;z<=230;z+=17){if(Math.abs(x)<9||rb()<.22)continue;const cx=Math.abs(x)/140,h=10+rb()*rb()*60+(1-cx)*18,w=8+rb()*6,d=8+rb()*6,tone=.28+rb()*.2;CITY.push({x:x+(rb()-.5)*3,z:z+(rb()-.5)*3,w,d,h,c:[tone+rb()*.1,tone,tone*.9],id:rb()})}
bbBuf=gl.createBuffer();
/* debris / embers seeds */
rt={deb:Array.from({length:14},(_,i)=>({a:r()*6.2832,v:[(r()-.5)*5,(r()-.2)*4,(r()-.5)*5],sz:.3+r()*.5,ts:2.6+i*.55,sp:[r()*3,r()*3,r()*3]})),
blast:Array.from({length:110},()=>{const th=Math.acos(2*r()-1),ph=r()*6.2832;return{d:[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)],k:r(),s:r()}}),
stem:Array.from({length:46},()=>({a:r()*6.2832,k:r(),s:r()})),cap:Array.from({length:110},()=>({th:Math.acos(2*r()-1),ph:r()*6.2832,s:r()})),
dust:Array.from({length:70},()=>({a:r()*6.2832,s:r(),h:r()})),cld:Array.from({length:44},()=>({a:r()*6.2832,rr:r(),h:r(),s:r()})),
chunks:Array.from({length:90},()=>{const a=r()*6.2832;return{a,v:25+r()*95,vy:30+r()*70,sz:.8+r()*2.6,rot:r()*6}}),fires:Array.from({length:22},()=>({x:(r()-.5)*260,z:30+r()*190,s:r(),h:r()})),
ash:Array.from({length:120},()=>({x:r(),y:r(),z:r(),s:r()})),stars:Array.from({length:260},()=>{const th=Math.acos(2*r()-1),ph=r()*6.2832;return{d:[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)],s:r()}}),
sc:Array.from({length:60},()=>({s:r(),a:r()*6.2832,k:r()}))}}
function init(){if(state)return state==1;state=2;try{gl=cv.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:false});if(!gl)return false;PM=prog(MVS,MFS);PB=prog(BVS,BFS);build();state=1;return true}catch(e){state=2;gl=null;console.warn('APC3D',e&&e.message);return false}}
/* ---- per-frame ---- */
let bbA=[],bbS=[],eye=[0,0,0],V=null,right=[1,0,0],up=[0,1,0];
const addB=(list,p,sz,c,a)=>list.push({p,sz,c,a});
function flush(list,add,sortIt){if(!list.length)return;if(sortIt)for(const q of list)q.d=(q.p[0]-eye[0])*-V[2]+(q.p[1]-eye[1])*-V[6]+(q.p[2]-eye[2])*-V[10];if(sortIt)list.sort((a,b)=>b.d-a.d);
const f=new Float32Array(list.length*54);let i=0;for(const q of list){const rx=right[0]*q.sz,ry=right[1]*q.sz,rz=right[2]*q.sz,ux=up[0]*q.sz,uy=up[1]*q.sz,uz=up[2]*q.sz,x=q.p[0],y=q.p[1],z=q.p[2],c=q.c;
const C=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];for(const[a,b]of C){f[i++]=x+rx*a+ux*b;f[i++]=y+ry*a+uy*b;f[i++]=z+rz*a+uz*b;f[i++]=a;f[i++]=b;f[i++]=c[0];f[i++]=c[1];f[i++]=c[2];f[i++]=q.a}}
gl.useProgram(PB.p);gl.uniformMatrix4fv(PB.u.uVP,false,VP);gl.uniform1i(PB.u.uAdd,add?1:0);gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,bbBuf);gl.bufferData(gl.ARRAY_BUFFER,f,gl.DYNAMIC_DRAW);
const S=36;gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,S,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,S,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,S,20);gl.enableVertexAttribArray(3);gl.disableVertexAttribArray(3);
gl.depthMask(false);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);if(add)gl.blendFunc(gl.ONE,gl.ONE);else gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,list.length*6);gl.disable(gl.BLEND);gl.depthMask(true);list.length=0}
let VP=null;
const U1=(n,v)=>{const l=U.u[n];if(l!=null)gl.uniform1f(l,v)},U3=(n,v)=>{const l=U.u[n];if(l!=null)gl.uniform3f(l,v[0],v[1],v[2])};let U=null;
function drawMesh(m,mode,mat){gl.uniform1i(U.u.uMode,mode);gl.uniformMatrix4fv(U.u.uM,false,mat);gl.bindVertexArray(m.vao);gl.drawArrays(gl.TRIANGLES,0,m.n)}
const IDM=model(0,0,0,1,1,1,0,0,0);
function stationPos1(t){const p=cl(t/12.4,0,1),alt=6+49*Math.pow(1-p,1.6);return[-alt*.12,100+alt,0]}
function stationPos2(t){const u=cl((t-12.4)/4.8,0,1),u2=Math.pow(u,1.7),k=1-u2;return[30*k,25+305*k,110+150*k]}
function draw(t,W,H,v){if(!init())return false;if(v==1)return doomed(t,W,H);if(v==2)return ending(t,W,H);try{
if(cv.width!=W||cv.height!=H){cv.width=W;cv.height=H}gl.viewport(0,0,W,H);const asp=W/H;
const space=t<12.4,q=t-17.2,post=t>=17.2,E=[0,0,110];
let camP,camT,fov=.96,sk=t<7?.3+t*.08:t<12.4?.8+(t-7)*.35:t<17.2?2.8+(t-12.4)*.3:t<21?11*(1-(t-17.2)/3.8)+.5:t<26?1.2:.2;
let heat=0,S=[0,0,0],sz=5.5;
if(space){const p=t/12.4;S=stationPos1(t);const a=.7+.9*p,d=21-5*p;camP=[S[0]+Math.cos(a)*d,S[1]+3.5+(1-p)*2,S[2]+Math.sin(a)*d];camT=[S[0],S[1]-1.5-p*3-13*(1-p),S[2]];heat=ss(6.5,10.5,t);fov=.95}
else{S=stationPos2(Math.min(t,17.2));sz=38;const u=cl((t-12.4)/4.8,0,1);const ex=ss(22,31,t);camP=[-30*ex,2.6+11*ex,-8+u*10-(q>0?Math.min(q,8)*5:0)-12*ex];camT=[0,(q>0?55+ss(1,9,q)*55:20+80*(1-u)),110];fov=1.05;heat=.6+.4*u}
const j=space?sk*.03:sk*.07;eye=[camP[0]+(Math.random()-.5)*j,camP[1]+(Math.random()-.5)*j,camP[2]+(Math.random()-.5)*j];
const View=look(eye,camT,[0,1,0]);V=View;VP=mul(persp(fov,asp,space?.2:.5,space?6000:4000),View);right=[View[0],View[4],View[8]];up=[View[1],View[5],View[9]];
gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
U=PM;gl.useProgram(PM.p);gl.uniformMatrix4fv(U.u.uVP,false,VP);U3('uCam',eye);U1('uHeat',heat);U1('uLit',.45);U1('uChar',1);U1('uFl',1);
const sunD=space?[.6,.35,.7]:[-.3,.5,.6],sl=Math.hypot(...sunD);U3('uSun',[sunD[0]/sl,sunD[1]/sl,sunD[2]/sl]);
let ash=post?ss(2.2,7,q):0;
if(space){U3('uSunC',[1.1,1.0,.9]);U3('uAmb',[.05,.05,.09]);U3('uPL',[0,0,0]);U3('uPC',[0,0,0]);U1('uPR',0);gl.uniform4f(U.u.uFog,0,0,0,0);
const at=mixc([.25,.5,1],[1,.4,.12],heat);U3('uAtm',at);U3('uTop',[0,0,.01]);U3('uHor',[0,0,.01]);U3('uGD',[0,1,0]);U3('uGC',[0,0,0]);
gl.depthMask(false);gl.disable(gl.CULL_FACE);drawMesh(M.sky,5,model(eye[0],eye[1],eye[2],1,1,1,0,0,0));gl.depthMask(true);
for(const s of rt.stars)addB(bbA,[eye[0]+s.d[0]*1400,eye[1]+s.d[1]*1400,eye[2]+s.d[2]*1400],2+s.s*3,[.8,.85,1],.5+.5*Math.abs(Math.sin(t*1.5+s.s*9)));
drawMesh(M.earth,1,IDM);
const sM=model(S[0],S[1],S[2],sz,sz,sz,t*.12,.34+.1*Math.sin(t*.8),0);U1('uChar',1);U1('uHeat',heat);drawMesh(M.stn,0,sM);drawMesh(M.eye,0,sM);
for(const d of rt.deb){const age=t-d.ts;if(age<0||age>7)continue;const sp=stationPos1(d.ts),ps=[sp[0]+Math.cos(d.a)*sz*.8+d.v[0]*age+0,sp[1]+d.v[1]*age*.4+age*age*.4*0,sp[2]+Math.sin(d.a)*sz*.8+d.v[2]*age];
/* chunks fall slower than the station, so they trail upward in the view */
const pp=[ps[0],ps[1]+age*3.2,ps[2]];drawMesh(M.cube,0,model(pp[0],pp[1],pp[2],d.sz*2,d.sz*1.4,d.sz*2,d.sp[0]*age,d.sp[1]*age,d.sp[2]*age));addB(bbA,pp,d.sz*3.4,[1,.45,.1],.8*(1-age/7))}
/* atmosphere shell, additive */
gl.blendFunc(gl.ONE,gl.ONE);gl.enable(gl.BLEND);gl.depthMask(false);drawMesh(M.atm,2,IDM);gl.depthMask(true);gl.disable(gl.BLEND);
if(heat>0){for(let k=0;k<44;k++){const f=k/44,jx=Math.sin(k*12.9+t*18)*sz*.25*(1-f*.4),jz=Math.cos(k*7.7+t*16)*sz*.25;addB(bbA,[S[0]+jx,S[1]+sz*.3+f*sz*2.8,S[2]+jz],sz*(1.05-.8*f),mixc([1,.85,.4],[1,.25,.05],f),.5*heat*(1-f))}
addB(bbA,[S[0],S[1]-sz*.1,S[2]],sz*2.6,[1,.7,.35],.6*heat);for(let k=0;k<20;k++){const f=k/20;addB(bbS,[S[0]+Math.sin(k*3.1)*sz*.5,S[1]+sz*(2+f*5),S[2]+Math.cos(k*2.3)*sz*.5],sz*(.9+f*1.2),[.12,.09,.09],.35*heat*(1-f*.6))}}
flush(bbS,false,true);flush(bbA,true,false)}
else{/* ----- the city, seen from the ground ----- */
const u=cl((t-12.4)/4.8,0,1),sPos=S;U3('uSunC',[0,0,0]);const dusk=mixc([.34,.12,.1],[.1,.05,.05],ash);U3('uAmb',[dusk[0]*.5,dusk[1]*.5,dusk[2]*.55]);U3('uSun',[0,1,0]);
const fl=post?(.5+.5*Math.sin(t*13)*Math.sin(t*5.3)):0;U3('uPL',post?[0,45,110]:sPos);U3('uPC',[1,.5,.2]);U1('uPR',post?(260*(1-ss(0,7,q))+30)*(.85+.15*fl):45+260*u);
const top=mixc(mixc([.05,.02,.08],[.16,.04,.05],u),[.02,.008,.015],ash),hor=mixc(mixc([.9,.45,.2],[1,.7,.3],u),[.24,.08,.05],ash);
gl.uniform4f(U.u.uFog,hor[0]*.7,hor[1]*.6,hor[2]*.6,post?.0034:.0022);U3('uAtm',[0,0,0]);U3('uTop',top);U3('uHor',hor);const gd=[E[0]-eye[0],20-eye[1],E[2]-eye[2]],gl_=Math.hypot(...gd);U3('uGD',[gd[0]/gl_,gd[1]/gl_,gd[2]/gl_]);U3('uGC',post?[1.1*(1-ash*.8),.5*(1-ash*.8),.2*(1-ash*.8)]:[.9*u,.4*u,.12*u]);
gl.depthMask(false);gl.disable(gl.CULL_FACE);drawMesh(M.sky,5,model(eye[0],eye[1],eye[2],1,1,1,0,0,0));gl.depthMask(true);
U1('uLit',post?0:.4);U1('uChar',1);drawMesh(M.ground,4,IDM);
const ring=post?ss(0,5,q)*330:-100;
for(const b of CITY){const dx=b.x-E[0],dz=b.z-E[2],d0=Math.hypot(dx,dz),k=post?ss(0,1,(ring-d0)/55):0,ang=Math.atan2(dx,dz),push=k*d0*.1;
U1('uChar',1-.6*k);U1('uLit',post?0:.42);gl.uniform1i(U.u.uMode,3);
drawMesh(M.cube,3,model(b.x+Math.sin(ang)*push,0,b.z+Math.cos(ang)*push,b.w,b.h*(1-.88*k),b.d,ang,k*1.25,0));}
U1('uChar',1);
if(post){for(const c of rt.chunks){const g_=Math.min(q,2+c.vy/18),x=E[0]+Math.sin(c.a)*c.v*q*.5,z=E[2]+Math.cos(c.a)*c.v*q*.5,y=Math.max(.5,3+c.vy*q-14*q*q);U1('uChar',.7);drawMesh(M.cube,0,model(x,y,z,c.sz*2,c.sz*1.6,c.sz*2,c.rot+q*2,q*1.3,q*.7));if(y>1)addB(bbA,[x,y,z],c.sz*1.6,[1,.45,.1],.7*(1-ss(2,8,q)))}U1('uChar',1)}
/* the falling station */
if(!post){U3('uAmb',[.42,.2,.15]);const sm=model(sPos[0],sPos[1],sPos[2],sz,sz,sz,t*.1,.25,0);U1('uHeat',1);drawMesh(M.stn,0,sm);drawMesh(M.eye,0,sm);U3('uAmb',[dusk[0]*.5,dusk[1]*.5,dusk[2]*.55]);
const dx=30,dy=305,dz=150,dl=Math.hypot(dx,dy,dz),ux=dx/dl,uy=dy/dl,uz=dz/dl;
for(let k=0;k<70;k++){const f=k/70,pp=[sPos[0]+ux*f*sz*5+Math.sin(k*5+t*14)*sz*.2,sPos[1]+uy*f*sz*5,sPos[2]+uz*f*sz*5+Math.cos(k*3+t*12)*sz*.2];addB(bbA,pp,sz*(1-.7*f),mixc([1,.9,.5],[1,.25,.05],f),.6*(1-f));if(k%3==0)addB(bbS,[pp[0],pp[1]+sz*.5,pp[2]],sz*(1.1+f*.8),[.1,.07,.07],.4*(1-f))}
addB(bbA,sPos,sz*3,[1,.7,.35],.7)}
/* the blast */
if(post){const rf=75*ss(0,2.6,q)+20*ss(2.6,8,q),rise=ss(0,6,q)*40,fa=1-ss(1.2,7.5,q);
for(const b of rt.blast){const rad=rf*(.3+.7*b.k),c=mixc(mixc([1,1,.85],[1,.65,.2],ss(0,1.6,q)),[.7,.12,.04],ss(1.6,6,q));addB(bbA,[E[0]+b.d[0]*rad,10+Math.abs(b.d[1])*rad*.9+rise*b.s,E[2]+b.d[2]*rad],18+b.s*32,c,.55*fa)}
addB(bbA,[E[0],25,E[2]],rf*2.6,[1,.75,.4],.9*(1-ss(0,2.4,q)));
const Hh=190*ss(.4,7,q),Rc=75*ss(.7,8,q),hot=1-ss(.5,6,q),grey=[.26,.2,.18];
for(const s of rt.stem){const f=s.k,y=f*Hh,sw=Math.sin(q*.9+f*6+s.a)*4,rr=(7+10*(1-f)+4*s.s)*(.6+.4*ss(.3,3,q));addB(bbS,[E[0]+Math.cos(s.a)*rr+sw,y+6,E[2]+Math.sin(s.a)*rr],16+10*s.s,mixc(mixc(grey,[1,.55,.2],hot*(1-f*.6)),[.14,.1,.09],ss(4,9,q)*.5),.75*ss(.2,1.2,q))}
for(const c of rt.cap){const th=c.th,ph=c.ph+q*.3,rr=Rc*(.7+.3*c.s),p=[E[0]+Math.sin(th)*Math.cos(ph)*rr,Hh+10+Math.cos(th)*rr*.5,E[2]+Math.sin(th)*Math.sin(ph)*rr],lowSide=cl(-Math.cos(th),0,1);addB(bbS,p,24+16*c.s,mixc(mixc(grey,[1,.55,.2],hot*(.3+.7*lowSide)),[.13,.09,.08],ss(4,9,q)*.55),.78*ss(.6,2,q))}
const dr=ring;for(const d of rt.dust){const a=d.a,rr=dr*(.9+.1*d.s);addB(bbS,[E[0]+Math.cos(a)*rr,4+d.h*14,E[2]+Math.sin(a)*rr],14+18*d.s,[.42,.32,.26],.5*(1-ss(2.5,5.5,q)))}
for(const c of rt.cld){const a=c.a,rr=40+c.rr*420*ss(1,10,q);addB(bbS,[E[0]+Math.cos(a)*rr,130+c.h*60,E[2]+Math.sin(a)*rr],70+60*c.s,[.12,.08,.07],.4*ss(3,10,q))}
for(const f of rt.fires){const fa2=ss(2,5,q)*(.7+.3*Math.sin(t*9+f.s*30));addB(bbA,[f.x,6+f.h*10,f.z],9+8*f.s,[1,.5,.12],.55*fa2);addB(bbS,[f.x,16+f.h*22,f.z],12+9*f.s,[.1,.08,.07],.5*fa2)}
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);gl.disable(gl.CULL_FACE);U1('uFl',cl(1.2-ss(0,5,q),0,1)*1.1);drawMesh(M.ring,6,model(E[0],1.8,E[2],ring,1,ring,0,0,0));gl.depthMask(true);gl.disable(gl.BLEND)}
/* ash and embers */
for(const a of rt.ash){const x=eye[0]+(a.x-.5)*90,z=eye[2]+8+a.z*120,y=((a.y*70-t*(2+a.s*5))%70+70)%70;addB(a.s>.85?bbA:bbS,[x+Math.sin(t*.7+a.s*20)*3,y,z],.35+a.s*.3,a.s>.85?[1,.5,.15]:[.6,.58,.56],a.s>.85?.7:.35)}
flush(bbS,false,true);flush(bbA,true,false)}
gl.bindVertexArray(null);return true}catch(e){console.warn('APC3D draw',e&&e.message);state=2;return false}}
/* the version where you miss the pod: eight seconds on the doomed platform at the top of the station while it tears itself apart */
function doomed(tt,W,H){try{if(cv.width!=W||cv.height!=H){cv.width=W;cv.height=H}gl.viewport(0,0,W,H);const asp=W/H,S=stationPos1(0),sz=5.5,heat=ss(0,5,tt),py=S[1]+.88*sz;
const sk=(.5+tt*.5)*.05,eye=[S[0]+(Math.random()-.5)*sk,py+.75+(Math.random()-.5)*sk,S[2]+2.9-tt*.05+(Math.random()-.5)*sk],tg=[S[0],py+.3+.15*ss(3,8,tt),S[2]-.2];
const View=look(eye,tg,[0,1,0]);V=View;VP=mul(persp(1.0,asp,.05,6000),View);right=[View[0],View[4],View[8]];up=[View[1],View[5],View[9]];this_eye(eye);
gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
U=PM;gl.useProgram(PM.p);gl.uniformMatrix4fv(U.u.uVP,false,VP);U3('uCam',eye);U1('uHeat',heat);U1('uLit',.45);U1('uChar',1);U1('uFl',1);
U3('uSun',[.6,.35,.7]);U3('uSunC',[.5,.45,.5]);const fl=.6+.4*Math.sin(tt*17)*Math.sin(tt*5.3);U3('uAmb',[.1+.1*fl*heat,.05,.09]);U3('uPL',[S[0],py+.5,S[2]]);U3('uPC',[1,.45,.9]);U1('uPR',1.3+2*heat*fl);gl.uniform4f(U.u.uFog,0,0,0,0);U3('uAtm',mixc([.25,.5,1],[1,.4,.12],heat));U3('uTop',[0,0,.01]);U3('uHor',[.02,.01,.03]);U3('uGD',[0,1,0]);U3('uGC',[0,0,0]);
gl.depthMask(false);drawMesh(M.sky,5,model(eye[0],eye[1],eye[2],1,1,1,0,0,0));gl.depthMask(true);
for(const s of rt.stars)addB(bbA,[eye[0]+s.d[0]*1400,eye[1]+s.d[1]*1400,eye[2]+s.d[2]*1400],2+s.s*3,[.8,.85,1],.5+.5*Math.abs(Math.sin(tt*1.5+s.s*9)));
drawMesh(M.earth,1,IDM);const sM=model(S[0],S[1],S[2],sz,sz,sz,0,0,0);drawMesh(M.stn,0,sM);
const pm=model(S[0],py,S[2],sz*.42,sz*.42,sz*.42,0,0,0);U1('uHeat',heat);drawMesh(M.plat,0,pm);
const pod=model(S[0]-1.2,py,S[2]+1.0,1.1,1.1,1.1,.4,0,0);drawMesh(M.podS,0,pod);
for(let k=0;k<14;k++){const age=tt-(1.5+k*.35);if(age<0)continue;const a=k*2.4,r=.9+(k%3)*.5;drawMesh(M.cube,0,model(S[0]+Math.cos(a)*r+Math.cos(a)*age*.8,py-age*age*1.6,S[2]+Math.sin(a)*r+Math.sin(a)*age*.8,.5,.3,.5,age*2,age*1.3,0));addB(bbA,[S[0]+Math.cos(a)*r,py-age*age*1.6+.1,S[2]+Math.sin(a)*r],.4,[1,.45,.1],.6)}
gl.blendFunc(gl.ONE,gl.ONE);gl.enable(gl.BLEND);gl.depthMask(false);drawMesh(M.atm,2,IDM);gl.depthMask(true);gl.disable(gl.BLEND);
for(let k=0;k<11;k++){const a=k/11*6.2832+.35,x=S[0]+Math.cos(a)*1.15,z=S[2]+Math.sin(a)*1.15,g=cl(heat*1.3-k*.03,0,1);if(g<=0)continue;for(let m=0;m<6;m++){const f=m/6,rise=(f*2.6+((tt*1.6+k*.37)%1)*.5);addB(bbA,[x*(1-f*.1)+Math.sin(tt*6+k+m)*.15,py+.1+rise*g*(1+ss(4,8,tt)*2),z+Math.cos(tt*5+k)*.15],.35+f*.5+ss(4,8,tt)*.8,mixc([1,.9,.5],[1,.3,.06],f),.55*g*(1-f*.7))}addB(bbS,[x,py+1.6*g+tt*.1,z],.9+ss(3,8,tt)*1.6,[.1,.08,.08],.35*g)}
if(tt>5.4){const e=ss(5.4,7.6,tt);for(let k=0;k<26;k++){const a=k*2.4;addB(bbA,[S[0]+Math.cos(a)*.9*(k/26),py+.3+e*(1+(k%5)),S[2]+Math.sin(a)*.9*(k/26)],1.2+e*3.6,[1,.75,.4],.7*e)}}
flush(bbS,false,true);flush(bbA,true,false);gl.bindVertexArray(null);return true}catch(e){console.warn('APC3D doomed',e&&e.message);state=2;return false}}

/* ===== the ending (accepted the alien rule): the station's eye fires a beam straight down at a village, then the ground view of the village being erased ===== */
let VIL=null;
function ensureVil(){if(VIL)return;const r=rng(33);VIL=[];const VC=[0,70];
{const g=Geo();g.cone([0,0,0],[0,1,0],.72,.55,4,[.42,.2,.14],0);M.roof=upload(g.a)}
{const g=Geo();g.box(0,.5,0,.18,1,.18,[.28,.18,.1],0);g.cone([0,.8,0],[0,1,0],.55,1.7,7,[.1,.32,.12],0);g.cone([0,1.7,0],[0,1,0],.4,1.4,7,[.12,.38,.14],0);M.tree=upload(g.a)}
{const g=Geo();g.box(0,.5,0,1,1,1,[1,.4,.92],0);M.beamA=upload(g.a)}{const g=Geo();g.box(0,.5,0,1,1,1,[1,.96,1],0);M.beamB=upload(g.a)}
{const g=Geo();g.quad([-3000,0,-3000],[-3000,0,3000],[3000,0,3000],[3000,0,-3000],[.1,.24,.09],0);M.grass=upload(g.a)}
{const g=Geo();g.quad([-3,.02,-3],[-3,.02,3],[3,.02,3],[3,.02,-3],[.34,.28,.2],0);M.dirt=upload(g.a)}
for(let i=0;i<13;i++){const a=i/13*6.2832+r()*.4,rr=9+r()*26;VIL.push({k:'h',x:VC[0]+Math.cos(a)*rr,z:VC[1]+Math.sin(a)*rr*.8,w:4.5+r()*3,d:4.5+r()*3,h:3.5+r()*2.5,rot:(r()-.5)*.6})}
VIL.push({k:'h',x:VC[0]+4,z:VC[1]-3,w:5,d:6,h:6.5,rot:.1,ch:1});
for(let i=0;i<22;i++){const a=r()*6.2832,rr=14+r()*50;VIL.push({k:'t',x:VC[0]+Math.cos(a)*rr*1.3,z:VC[1]+Math.sin(a)*rr*.9,s:1.4+r()*1.2})}
}
function ending(t,W,H){try{ensureVil();if(cv.width!=W||cv.height!=H){cv.width=W;cv.height=H}gl.viewport(0,0,W,H);const asp=W/H,space=t<6.5,u=t-6.5,VC=[0,0,70];
gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
if(space){const S=[0,128,0],sz=5.5,a=-.7+t*.07,eyeP=[Math.sin(a)*27,119+t*.1,Math.cos(a)*27],tg=[0,116,0],sk=t>3.2?(.12*Math.min(1,t-3.2)):0;
eye=[eyeP[0]+(Math.random()-.5)*sk,eyeP[1]+(Math.random()-.5)*sk,eyeP[2]+(Math.random()-.5)*sk];const View=look(eye,tg,[0,1,0]);V=View;VP=mul(persp(.95,asp,.2,6000),View);right=[View[0],View[4],View[8]];up=[View[1],View[5],View[9]];
U=PM;gl.useProgram(PM.p);gl.uniformMatrix4fv(U.u.uVP,false,VP);U3('uCam',eye);U1('uHeat',0);U1('uLit',.45);U1('uChar',1);U1('uFl',1);
U3('uSun',[.55,.3,.75]);U3('uSunC',[1.1,1.0,.9]);U3('uAmb',[.05,.05,.09]);U3('uPL',[0,0,0]);U3('uPC',[0,0,0]);U1('uPR',0);gl.uniform4f(U.u.uFog,0,0,0,0);U3('uAtm',[.25,.5,1]);U3('uTop',[0,0,.01]);U3('uHor',[0,0,.01]);U3('uGD',[0,1,0]);U3('uGC',[0,0,0]);
gl.depthMask(false);drawMesh(M.sky,5,model(eye[0],eye[1],eye[2],1,1,1,0,0,0));gl.depthMask(true);
for(const s of rt.stars)addB(bbA,[eye[0]+s.d[0]*1400,eye[1]+s.d[1]*1400,eye[2]+s.d[2]*1400],2+s.s*3,[.8,.85,1],.5+.5*Math.abs(Math.sin(t*1.5+s.s*9)));
drawMesh(M.earth,1,IDM);
const sM=model(S[0],S[1],S[2],sz,sz,sz,t*.1,0,0);drawMesh(M.stn,0,sM);drawMesh(M.eye,0,sM);
const eyeY=S[1]-.66*sz,charge=ss(.6,3.2,t),fire=t>3.2?Math.min(1,(t-3.2)*3):0,hit=100.15;
if(fire>0){const w=(.5+.5*Math.sin(t*40))*.15+.9*fire,len=eyeY-hit;U1('uFl',1.1);drawMesh(M.beamA,6,model(S[0],hit,S[2],w*1.9,len,w*1.9,0,0,0));drawMesh(M.beamB,6,model(S[0],hit,S[2],w*.8,len,w*.8,0,0,0));
const q=t-3.2;gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);U1('uFl',cl(1.5-q*.4,0,1.2));drawMesh(M.ring,6,model(S[0],hit+.05,S[2],3+q*14,1,3+q*14,0,0,0));gl.depthMask(true);gl.disable(gl.BLEND)}
gl.blendFunc(gl.ONE,gl.ONE);gl.enable(gl.BLEND);gl.depthMask(false);drawMesh(M.atm,2,IDM);gl.depthMask(true);gl.disable(gl.BLEND);
addB(bbA,[S[0],eyeY-.2,S[2]],.5+charge*2.2+fire*1.6,[1,.45,.95],.4+.5*charge);
for(let k=0;k<18;k++){const f=((t*.9+k/18)%1),an=k*2.4+t*.4,rr=(1-f)*4*(1-fire*.5)*charge;if(charge>.05)addB(bbA,[S[0]+Math.cos(an)*rr,eyeY-.2+Math.sin(an*1.3)*rr*.5,S[2]+Math.sin(an)*rr],.12+.1*f,[1,.6,1],.6*charge)}
if(fire>0){addB(bbA,[S[0],hit+.6,S[2]],5+fire*5,[1,.7,1],.8);for(let k=0;k<30;k++){const f=k/30,an=k*2.1+t*3;addB(bbA,[S[0]+Math.cos(an)*f*8*Math.min(1,(t-3.2)),hit+.4+f*1.5*Math.abs(Math.sin(k*3.3+t*8)),S[2]+Math.sin(an)*f*8*Math.min(1,(t-3.2))],.5+.5*(1-f),[1,.4,.2],.7*(1-f))}}
flush(bbS,false,true);flush(bbA,true,false)}
else{/* ----- the village ----- */
const q=u-3.6,post=q>0,ring=post?ss(0,5,q)*230:-100,shake=post?Math.max(0,1.6-q*.2)*(q<9?1:0):0;
const eyeP=[-12+u*.4,5.5,26];eye=[eyeP[0]+(Math.random()-.5)*shake*.2,eyeP[1]+(Math.random()-.5)*shake*.2,eyeP[2]];
const View=look(eye,[2,10+(post?ss(0,6,q)*12:0),VC[2]],[0,1,0]);V=View;VP=mul(persp(1.02,asp,.5,5000),View);right=[View[0],View[4],View[8]];up=[View[1],View[5],View[9]];
U=PM;gl.useProgram(PM.p);gl.uniformMatrix4fv(U.u.uVP,false,VP);U3('uCam',eye);U1('uHeat',1);U1('uLit',post?0:.5);U1('uChar',1);U1('uFl',1);
const ash=post?ss(2.5,8,q):0,dusk=mixc([.46,.3,.3],[.1,.05,.05],ash);U3('uSun',[.35,.3,.9]);U3('uSunC',post?[.1,.05,.03]:[1,.62,.35]);U3('uAmb',[dusk[0]*.6,dusk[1]*.6,dusk[2]*.75]);
const fl=post?(.5+.5*Math.sin(u*13)*Math.sin(u*5.3)):0;U3('uPL',[VC[0],45,VC[2]]);U3('uPC',[1,.5,.25]);U1('uPR',post?(70*(1-ss(0,7,q))+8)*(.85+.15*fl):0);
const top=mixc([.07,.09,.2],[.02,.008,.015],ash),hor=mixc([1,.6,.34],[.24,.08,.05],ash);gl.uniform4f(U.u.uFog,hor[0]*.7,hor[1]*.62,hor[2]*.6,post?.0032:.0018);U3('uAtm',[0,0,0]);U3('uTop',top);U3('uHor',hor);
const gd=[VC[0]-eye[0],20-eye[1],VC[2]-eye[2]],gl_=Math.hypot(...gd);U3('uGD',[gd[0]/gl_,gd[1]/gl_,gd[2]/gl_]);U3('uGC',post?[1.1*(1-ash*.8),.5*(1-ash*.8),.2*(1-ash*.8)]:[.55,.32,.12]);
gl.depthMask(false);drawMesh(M.sky,5,model(eye[0],eye[1],eye[2],1,1,1,0,0,0));gl.depthMask(true);
/* the faint speck of the station high in the dusk sky */
if(!post){addB(bbA,[eye[0]+10,eye[1]+330,eye[2]+700],5.5,[1,.5,.95],.5+.4*Math.sin(u*3))}
U1('uChar',post?1-.4*ash:1);drawMesh(M.grass,0,IDM);drawMesh(M.dirt,0,model(VC[0],0,VC[2],5,1,5,0,0,0));
for(const b of VIL){const dx=b.x-VC[0],dz=b.z-VC[2],d0=Math.hypot(dx,dz),k=post?ss(0,1,(ring-d0)/40):0,ang=Math.atan2(dx,dz),push=k*d0*.1;
if(b.k=='h'){const hh=b.h*(1-.9*k);U1('uChar',1-.65*k);U1('uLit',post?0:.55);drawMesh(M.cube,3,model(b.x+Math.sin(ang)*push,0,b.z+Math.cos(ang)*push,b.w,hh,b.d,b.rot+k*1.1,k*1.2,0));
if(k<.95)drawMesh(M.roof,0,model(b.x+Math.sin(ang)*push,hh,b.z+Math.cos(ang)*push,b.w*1.25,2.4*(1-k),b.d*1.25,b.rot+Math.PI/4+k*1.1,k*1.2,0))}
else{U1('uChar',1-.7*k);drawMesh(M.tree,0,model(b.x+Math.sin(ang)*push,0,b.z+Math.cos(ang)*push,b.s,b.s*(1-.8*k),b.s,0,k*1.2,0))}}
U1('uChar',1);
/* warm lights in the windows and chimney smoke before the strike */
if(!post)for(const b of VIL){if(b.k!='h')continue;addB(bbA,[b.x+(b.w*.5-1)*Math.cos(b.rot),1.7,b.z-b.d*.5-.2],.9,[1,.75,.35],.55);if(b.ch)for(let k=0;k<7;k++)addB(bbS,[b.x+1.5+Math.sin(u*.8+k)*.5,b.h+2.5+k*1.6+((u*2.4)%1.6),b.z],.9+k*.35,[.5,.5,.52],.3*(1-k/8))}
/* the beam: a thin streak falls out of the sky, then the whole column ignites */
const bh=u<3.2?-1:u<3.6?1-(u-3.2)/.4:0,col=u>=3.2&&q<5.5;
if(col){const wd=q<0?.45:(1.2+ss(0,.5,q)*9)*(1-ss(2.2,5.5,q)),top_=q<0?bh*1400+30:1400;U1('uFl',1.15);gl.depthMask(true);drawMesh(M.beamA,6,model(VC[0],0,VC[2],wd*2.2,top_,wd*2.2,0,0,0));drawMesh(M.beamB,6,model(VC[0],0,VC[2],wd*.9,top_,wd*.9,0,0,0));U1('uFl',1)}
if(post){const rf=24*ss(0,2.6,q)+9*ss(2.6,8,q),rise=ss(0,6,q)*20,fa=1-ss(1.2,7.5,q);
for(const b of rt.blast){const rad=rf*(.3+.7*b.k),c=mixc(mixc([1,1,.85],[1,.65,.2],ss(0,1.6,q)),[.7,.12,.04],ss(1.6,6,q));addB(bbA,[VC[0]+b.d[0]*rad,5+Math.abs(b.d[1])*rad*.9+rise*b.s*.6,VC[2]+b.d[2]*rad],6+b.s*10,c,.4*fa)}
addB(bbA,[VC[0],12,VC[2]],rf*1.7,[1,.75,.4],.6*(1-ss(0,2.4,q)));
const Hh=95*ss(.4,7,q),Rc=34*ss(.7,8,q),hot=1-ss(.5,6,q),grey=[.26,.2,.18];
for(const s of rt.stem){const f=s.k,y=f*Hh,sw=Math.sin(q*.9+f*6+s.a)*3,rr=(5+7*(1-f)+3*s.s)*(.6+.4*ss(.3,3,q));addB(bbS,[VC[0]+Math.cos(s.a)*rr+sw,y+4,VC[2]+Math.sin(s.a)*rr],11+7*s.s,mixc(mixc(grey,[1,.55,.2],hot*(1-f*.6)),[.14,.1,.09],ss(4,9,q)*.5),.75*ss(.2,1.2,q))}
for(const c of rt.cap){const th=c.th,ph=c.ph+q*.3,rr=Rc*(.7+.3*c.s),p=[VC[0]+Math.sin(th)*Math.cos(ph)*rr,Hh+8+Math.cos(th)*rr*.5,VC[2]+Math.sin(th)*Math.sin(ph)*rr],lowSide=cl(-Math.cos(th),0,1);addB(bbS,p,16+11*c.s,mixc(mixc(grey,[1,.55,.2],hot*(.3+.7*lowSide)),[.13,.09,.08],ss(4,9,q)*.55),.78*ss(.6,2,q))}
for(const d of rt.dust){const a=d.a,rr=ring*(.9+.1*d.s);addB(bbS,[VC[0]+Math.cos(a)*rr,3+d.h*10,VC[2]+Math.sin(a)*rr],10+13*d.s,[.42,.32,.26],.5*(1-ss(2.5,5.5,q)))}
for(const c of rt.cld){const a=c.a,rr=30+c.rr*300*ss(1,10,q);addB(bbS,[VC[0]+Math.cos(a)*rr,95+c.h*40,VC[2]+Math.sin(a)*rr],50+42*c.s,[.12,.08,.07],.4*ss(3,10,q))}
for(const f of VIL){if(f.k!='h')continue;const fa2=ss(1.5,4,q)*(.7+.3*Math.sin(u*9+f.x));addB(bbA,[f.x,3+f.h*.4,f.z],5+3*((f.x*7)%1+1)%1*3,[1,.5,.12],.6*fa2);addB(bbS,[f.x,10+f.h,f.z],7,[.1,.08,.07],.5*fa2)}
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);gl.disable(gl.CULL_FACE);U1('uFl',cl(1.2-ss(0,5,q),0,1)*1.1);drawMesh(M.ring,6,model(VC[0],1.2,VC[2],ring,1,ring,0,0,0));gl.depthMask(true);gl.disable(gl.BLEND);U1('uFl',1)}
for(const a of rt.ash){const x=eye[0]+(a.x-.5)*90,z=eye[2]+8+a.z*120,y=((a.y*60-u*(2+a.s*5))%60+60)%60;if(post)addB(a.s>.85?bbA:bbS,[x+Math.sin(u*.7+a.s*20)*3,y,z],.35+a.s*.3,a.s>.85?[1,.5,.15]:[.6,.58,.56],a.s>.85?.7:.35)}
flush(bbS,false,true);flush(bbA,true,false)}
gl.bindVertexArray(null);return true}catch(e){console.warn('APC3D ending',e&&e.message);state=2;return false}}
function this_eye(e){eye=e}
return{cv,draw,ok:()=>init()}})();

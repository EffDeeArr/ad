/* ===== The alien homeworld cutscene in real 3D (hardware rendering) =====
   A small WebGL2 renderer of its own: a violet sky with a ringed gas giant and two moons, a luminous cloud sea, and a handful of floating
   cities (inverted rock islands crowned with pearl spires, mushroom towers, domes, arches, spiral ramps and orbiting rings) joined by light
   bridges, with sky-ships gliding between them. draw(t,W,H) renders time t (seconds) into ALN3D.cv; returns false if WebGL2 is unavailable. */
window.ALN3D=(function(){
const cv=document.createElement('canvas');let gl=null,state=0,PM=null,PS=null,PP=null,VB=null,nA=0,nB=0,SHIPS=[],MOTE=null,VAO=null,SVAO=null;
const cl=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,k)=>a+(b-a)*k,ss=(a,b,x)=>{const k=cl((x-a)/(b-a),0,1);return k*k*(3-2*k)};
const mixc=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
/* ---- tiny matrix helpers (column-major) ---- */
const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o};
const persp=(fov,asp,n,f)=>{const t=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o};
function basis(e,t){let fx=t[0]-e[0],fy=t[1]-e[1],fz=t[2]-e[2],l=Math.hypot(fx,fy,fz)||1;fx/=l;fy/=l;fz/=l;let rx=-fz,ry=0,rz=fx;l=Math.hypot(rx,rz)||1;rx/=l;rz/=l;const ux=ry*fz-rz*fy,uy=rz*fx-rx*fz,uz=rx*fy-ry*fx;return{f:[fx,fy,fz],r:[rx,0,rz],u:[ux,uy,uz]}}
function view(e,B){const o=new Float32Array(16),r=B.r,u=B.u,f=B.f;o[0]=r[0];o[4]=r[1];o[8]=r[2];o[12]=-(r[0]*e[0]+r[1]*e[1]+r[2]*e[2]);o[1]=u[0];o[5]=u[1];o[9]=u[2];o[13]=-(u[0]*e[0]+u[1]*e[1]+u[2]*e[2]);o[2]=-f[0];o[6]=-f[1];o[10]=-f[2];o[14]=(f[0]*e[0]+f[1]*e[1]+f[2]*e[2]);o[15]=1;return o}
const modelM=(x,y,z,a)=>{const c=Math.cos(a),s=Math.sin(a),o=new Float32Array(16);o[0]=c;o[2]=-s;o[5]=1;o[8]=s;o[10]=c;o[12]=x;o[13]=y;o[14]=z;o[15]=1;return o};
const I4=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
/* ---- shaders ---- */
const VS=`#version 300 es
in vec3 a_p;in vec3 a_n;in vec3 a_c;in float a_e;uniform mat4 u_vp;uniform mat4 u_m;out vec3 v_c;out vec3 v_n;out float v_e;out vec3 v_w;
void main(){vec4 w=u_m*vec4(a_p,1.);v_w=w.xyz;v_n=mat3(u_m)*a_n;v_c=a_c;v_e=a_e;gl_Position=u_vp*w;}`;
const FS=`#version 300 es
precision highp float;in vec3 v_c;in vec3 v_n;in float v_e;in vec3 v_w;uniform vec3 u_cam;uniform float u_t;uniform vec3 u_fc;out vec4 o;
void main(){vec3 n=normalize(v_n);vec3 L=normalize(vec3(.55,.6,.45)),L2=normalize(vec3(-.6,.15,-.5));
float d=max(dot(n,L),0.),d2=max(dot(n,L2),0.);vec3 amb=mix(vec3(.46,.32,.6),vec3(.66,.6,.84),n.y*.5+.5);
vec3 col=v_c*(amb+d*vec3(1.,.82,.66)*.95+d2*vec3(.45,.3,.8)*.45);
col+=v_c*v_e*(1.1+.35*sin(u_t*2.2+v_w.x*.07+v_w.y*.11+v_w.z*.05));
float dist=length(v_w-u_cam);float f=1.-exp(-dist*dist*.0000026);f=max(f,1.-exp(-dist*.0011));
float hf=clamp((-70.-v_w.y)/80.,0.,1.);col=mix(col,vec3(.55,.34,.66),hf*.55);col=mix(col,u_fc,clamp(f,0.,1.)*.92);o=vec4(col,1.);}`;
const SVS=`#version 300 es
out vec2 v_u;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);v_u=p*2.-1.;gl_Position=vec4(v_u,0.,1.);}`;
const SFS=`#version 300 es
precision highp float;in vec2 v_u;uniform vec3 u_cam,u_f,u_r,u_u;uniform float u_th,u_asp,u_t;out vec4 o;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){vec3 r=normalize(u_f+v_u.x*u_asp*u_th*u_r+v_u.y*u_th*u_u);
vec3 hor=vec3(1.,.62,.62),mid=vec3(.55,.30,.62),top=vec3(.06,.05,.2);float y=r.y;
vec3 sky=mix(hor,mid,smoothstep(0.,.22,y));sky=mix(sky,top,smoothstep(.15,.85,y));
float sun=pow(max(dot(r,normalize(vec3(.55,.18,.45))),0.),90.);sky+=vec3(1.,.8,.55)*sun*1.2+vec3(1.,.55,.4)*pow(max(dot(r,normalize(vec3(.55,.18,.45))),0.),6.)*.35;
/* stars */
vec2 sp=vec2(atan(r.z,r.x)*70.,r.y*140.);vec2 id=floor(sp),lf=fract(sp)-.5;float st=h21(id);vec2 off=vec2(h21(id+3.1),h21(id+7.7))-.5;float sd=length(lf-off*.6);sky+=vec3(1.,.95,1.)*step(.972,st)*smoothstep(.22,0.,sd)*smoothstep(.05,.4,y)*(.6+.4*sin(u_t*3.+st*60.));
/* a ringed gas giant */
vec3 pd=normalize(vec3(-.45,.34,.8));float dp=dot(r,pd);
if(dp>0.){vec3 q=r/dp-pd;vec3 e1=normalize(cross(pd,vec3(0.,1.,0.))),e2=cross(pd,e1);vec2 xy=vec2(dot(q,e1),dot(q,e2));float R=.2;
float ca=.42,sa=sin(.42);vec2 rr=vec2(xy.x*cos(ca)+xy.y*sa,-xy.x*sa+xy.y*cos(ca));float ring=length(vec2(rr.x/(2.1*R),rr.y/(2.1*R*.22)));
float disc=length(xy)/R;vec3 pc=mix(vec3(.82,.56,.78),vec3(.32,.55,.78),smoothstep(-.6,.6,xy.y/R+.15*sin(xy.y*40.)));pc+=.07*sin(xy.y/R*18.+vn(xy*30.)*3.);pc*=.35+.75*smoothstep(1.,-.3,dot(normalize(vec2(xy.x,xy.y)),vec2(-.7,.5))*disc*.9+.2*disc);
float rm=smoothstep(.62,.66,ring)*(1.-smoothstep(.93,1.,ring))*(.55+.45*sin(ring*70.));
bool behind=rr.y>0.&&disc<1.;
if(ring>.6&&ring<1.&&!(rr.y<0.&&disc<1.)){sky=mix(sky,vec3(.9,.75,.85),rm*.75);}
if(disc<1.)sky=mix(sky,pc,smoothstep(1.,.97,disc));
if(rr.y<0.&&disc<1.&&ring>.6&&ring<1.)sky=mix(sky,vec3(.95,.8,.9),rm*.8);
sky+=vec3(.5,.3,.7)*exp(-max(disc-1.,0.)*6.)*.18*step(1.,disc);}
/* two moons */
for(int k=0;k<2;k++){vec3 md=k==0?normalize(vec3(.8,.4,-.35)):normalize(vec3(.05,.55,.82));float R=k==0?.045:.028;float dm=dot(r,md);if(dm>0.){float a=length(r/dm-md)/R;if(a<1.)sky=mix(sky,(k==0?vec3(.95,.9,.98):vec3(.75,.9,1.))*(.55+.5*(1.-a)*(1.-a)),smoothstep(1.,.9,a))+vec3(0.);sky+=(k==0?vec3(.8,.6,1.):vec3(.5,.8,1.))*exp(-max(a-1.,0.)*5.)*.08*step(1.,a);}}
/* ribbons of aurora */
float au=smoothstep(.12,.32,y)*smoothstep(.75,.35,y);vec2 ap=vec2(atan(r.z,r.x)*3.,y*6.);float av=fbm(ap+vec2(u_t*.05,0.));sky+=vec3(.2,.9,.8)*au*pow(av,3.)*.5+vec3(.9,.3,.8)*au*pow(fbm(ap*1.3+7.),4.)*.35;
/* the cloud sea */
if(y<-.0004){float t=(-110.-u_cam.y)/y;vec3 hp=u_cam+r*t;vec2 cp=hp.xz*.0045+vec2(u_t*.01,0.);float n=fbm(cp),n2=fbm(cp*2.7+4.);vec3 cc=mix(vec3(.33,.16,.44),vec3(.95,.56,.72),n);cc=mix(cc,vec3(.25,.85,.85),smoothstep(.62,.78,n2)*.55);cc*=.75+.35*fbm(cp*9.);float k=exp(-t*.00055);sky=mix(hor*.95,cc,k);}
o=vec4(sky,1.);}`;
const PVS=`#version 300 es
in vec3 a_p;in float a_s;uniform mat4 u_vp;uniform float u_t;uniform float u_h;out float v_a;void main(){vec3 p=a_p;p.y+=sin(u_t*.4+a_p.x*.2)*2.;p.x+=cos(u_t*.3+a_p.z*.3)*2.;vec4 c=u_vp*vec4(p,1.);gl_Position=c;gl_PointSize=clamp(a_s*u_h/(c.w+1.),1.,26.);v_a=smoothstep(900.,200.,c.w);}`;
const PFS=`#version 300 es
precision highp float;in float v_a;out vec4 o;void main(){vec2 d=gl_PointCoord*2.-1.;float r=dot(d,d);if(r>1.)discard;o=vec4(vec3(.7,1.,.95),(1.-r)*(1.-r)*.9*v_a);}`;
function prog(vs,fs){const mk=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(s.slice(17,60)+' :: '+gl.getShaderInfoLog(x));return x};const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
/* ---- geometry ---- */
let V=[];
const P3=(x,y,z)=>[x,y,z];
function face(pts,col,e,hint){/* a convex quad or triangle (pts: 3 or 4 points); the normal is turned to face away from hint */
const a=pts[0],b=pts[1],c=pts[2];let ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;let l=Math.hypot(nx,ny,nz);if(l<1e-9&&pts.length>3){const d=pts[3];vx=d[0]-a[0];vy=d[1]-a[1];vz=d[2]-a[2];nx=uy*vz-uz*vy;ny=uz*vx-ux*vz;nz=ux*vy-uy*vx;l=Math.hypot(nx,ny,nz)}if(l<1e-9)return;nx/=l;ny/=l;nz/=l;
if(hint){let mx=0,my=0,mz=0;for(const p of pts){mx+=p[0];my+=p[1];mz+=p[2]}mx/=pts.length;my/=pts.length;mz/=pts.length;if((mx-hint[0])*nx+(my-hint[1])*ny+(mz-hint[2])*nz<0){nx=-nx;ny=-ny;nz=-nz}}
const pv=p=>V.push(p[0],p[1],p[2],nx,ny,nz,col[0],col[1],col[2],e);pv(pts[0]);pv(pts[1]);pv(pts[2]);if(pts.length>3){pv(pts[0]);pv(pts[2]);pv(pts[3])}}
function lathe(x,y,z,prof,n,rot,jit,rs){/* prof: [r,h,[rgb],emissive] bottom to top; rs seeds colour variation */const R=rs||rng(7);rot=rot||0;
for(let i=0;i<n;i++){const a0=rot+i/n*6.2832,a1=rot+(i+1)/n*6.2832,k=1+(jit?(R()-.5)*jit:0);
for(let j=0;j<prof.length-1;j++){const A=prof[j],B=prof[j+1],v=.9+.2*R();const c=A[2]||[.8,.8,.9],c2=B[2]||c;const col=mixc(c,c2,.5).map(q=>q*v);const e=Math.max(A[3]||0,B[3]||0);
const p=(r,h,a)=>[x+Math.cos(a)*r*k,y+h,z+Math.sin(a)*r*k];face([p(A[0],A[1],a0),p(A[0],A[1],a1),p(B[0],B[1],a1),p(B[0],B[1],a0)],col,e,[x,y+(A[1]+B[1])/2,z])}}}
function disc(x,y,z,r,col,e,n,up){for(let i=0;i<n;i++){const a0=i/n*6.2832,a1=(i+1)/n*6.2832;face([[x,y,z],[x+Math.cos(a0)*r,y,z+Math.sin(a0)*r],[x+Math.cos(a1)*r,y,z+Math.sin(a1)*r]],col,e,[x,y-(up?1:-1)*10,z])}}
function box(x,y,z,w,h,d,col,e,rot){/* centred on x,z with the base at y */rot=rot||0;const c=Math.cos(rot),s=Math.sin(rot),pt=(px,py,pz)=>[x+px*c-pz*s,y+py,z+px*s+pz*c],hw=w/2,hd=d/2;
const P=[pt(-hw,0,-hd),pt(hw,0,-hd),pt(hw,0,hd),pt(-hw,0,hd),pt(-hw,h,-hd),pt(hw,h,-hd),pt(hw,h,hd),pt(-hw,h,hd)],ct=[x,y+h/2,z];
for(const q of[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])face(q.map(i=>P[i]),col,e,ct)}
function torus(x,y,z,R,r,n,m,col,e,tiltX,tiltZ,a0,a1){a0=a0||0;a1=a1===undefined?6.2832:a1;const tx=tiltX||0,tz=tiltZ||0,ct=Math.cos(tx),st=Math.sin(tx),cz=Math.cos(tz),sz=Math.sin(tz);
const pt=(u,v)=>{let px=(R+r*Math.cos(v))*Math.cos(u),py=r*Math.sin(v),pz=(R+r*Math.cos(v))*Math.sin(u);let qy=py*ct-pz*st,qz=py*st+pz*ct;let qx=px*cz-qy*sz,qy2=px*sz+qy*cz;return[x+qx,y+qy2,z+qz]};
const cen=u=>{let px=R*Math.cos(u),pz=R*Math.sin(u);let qy=-pz*st,qz=pz*ct;let qx=px*cz-qy*sz,qy2=px*sz+qy*cz;return[x+qx,y+qy2,z+qz]};
for(let i=0;i<n;i++){const u0=a0+(a1-a0)*i/n,u1=a0+(a1-a0)*(i+1)/n;for(let j=0;j<m;j++){const v0=j/m*6.2832,v1=(j+1)/m*6.2832;face([pt(u0,v0),pt(u1,v0),pt(u1,v1),pt(u0,v1)],col,e,cen((u0+u1)/2))}}}
function tube(pts,r,col,e,m){/* a square-ish tube along a polyline */m=m||4;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];let dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;let sx=dz,sz=-dx,sl=Math.hypot(sx,sz)||1;sx/=sl;sz/=sl;const ux=dy*sz,uy=dz*sx-dx*sz,uz=-dy*sx;
const ring=(p)=>{const o=[];for(let k=0;k<m;k++){const q=k/m*6.2832,c=Math.cos(q)*r,s=Math.sin(q)*r;o.push([p[0]+sx*c+ux*s,p[1]+uy*s,p[2]+sz*c+uz*s])}return o};const ra=ring(a),rb=ring(b);for(let k=0;k<m;k++){const k2=(k+1)%m;face([ra[k],ra[k2],rb[k2],rb[k]],col,e,a)}}}
const PEARL=[.93,.9,.98],LAV=[.72,.62,.92],AME=[.5,.36,.78],TEAL=[.25,.95,.92],ROSE=[.98,.5,.78],GOLD=[.98,.8,.46],ROCK=[.44,.35,.6],ROCK2=[.58,.45,.7],TURF=[.28,.55,.62];
/* ---- alien architecture ---- */
function spire(x,y,z,h,w,R,pal){const c1=pal[0],c2=pal[1],ac=pal[2];const prof=[[w*.0,0,c1,0],[w,0,c1,0],[w*1.12,h*.06,c1,0],[w*.9,h*.16,c2,0],[w*.55,h*.3,c1,0],[w*.58,h*.31,ac,1],[w*.85,h*.4,c2,0],[w*1.0,h*.46,c1,0],[w*.78,h*.55,c2,0],[w*.38,h*.7,c1,0],[w*.4,h*.71,ac,1],[w*.52,h*.78,c2,0],[w*.3,h*.9,c1,0],[w*.06,h,ac,.6]];
lathe(x,y,z,prof,10,R()*6,.0,R);for(let k=0;k<3;k++){const hh=h*(.3+.22*k+R()*.05);torus(x,y+hh,z,w*(1.35-.12*k)+.6,.18+.05*w,24,5,ac,1,R()*.5-.25,R()*.5-.25)}}
function blade(x,y,z,h,w,R,pal){const prof=[[0,0,pal[0],0],[w,h*.04,pal[0],0],[w*.7,h*.3,pal[1],0],[w*.22,h*.78,pal[0],0],[w*.2,h*.8,pal[2],1],[0,h,pal[2],1]];lathe(x,y,z,prof,4,R()*2,0,R)}
function mushroom(x,y,z,h,w,R,pal){lathe(x,y,z,[[w*.28,0,pal[0],0],[w*.2,h*.5,pal[1],0],[w*.3,h*.78,pal[0],0]],8,0,0,R);const t=y+h*.78;lathe(x,t,z,[[w*.3,0,pal[1],0],[w*1.05,h*.07,pal[0],0],[w*1.5,h*.17,pal[0],0],[w*1.5,h*.2,pal[2],1],[w*1.15,h*.26,pal[1],0],[w*.5,h*.33,pal[0],0],[w*.0,h*.36,pal[2],.5]],12,0,0,R)}
function dome(x,y,z,w,R,pal){const prof=[];for(let i=0;i<=5;i++){const a=i/5*1.5708;prof.push([w*Math.cos(a),w*.8*Math.sin(a),i==0?pal[1]:pal[0],i==0?.6:0])}lathe(x,y,z,prof,14,0,0,R);box(x,y,z,w*.35,w*.2,w*2.2,pal[2],.8,R()*3)}
function ringTower(x,y,z,h,w,R,pal){const n=Math.max(3,h/5|0);for(let i=0;i<n;i++){const yy=y+i*h/n,ww=w*(1-.5*i/n);torus(x,yy+1,z,ww,.7,18,5,i&1?pal[2]:pal[1],i&1?1:0,0,0);lathe(x,yy,z,[[ww*.5,0,pal[0],0],[ww*.5,h/n*.8,pal[0],0]],6,i,0,R)}lathe(x,y+h,z,[[w*.3,0,pal[0],0],[w*.05,w,pal[2],1]],6,0,0,R)}
function arch(x1,z1,x2,z2,y,h,t,pal){const mx=(x1+x2)/2,mz=(z1+z2)/2,dx=x2-x1,dz=z2-z1,l=Math.hypot(dx,dz),ang=Math.atan2(dz,dx);
/* an arch standing in the plane of the two feet: half a torus */torus(mx,y,mz,l/2,t,18,5,pal[0],0,0,0,0,3.1416);}
function spiralRamp(x,y,z,R0,h,turns,col,e){const n=60;for(let i=0;i<n;i++){const a=i/n*turns*6.2832,ra=R0*(1-.35*i/n),yy=y+h*i/n;box(x+Math.cos(a)*ra,yy,z+Math.sin(a)*ra,3.2,.5,2.4,col,e*(i%6==0?1:0),-a)}}
function island(x,y,z,Rr,seed,hero){const R=rng(seed),pal=[[PEARL,LAV,TEAL],[LAV,PEARL,ROSE],[PEARL,AME,GOLD],[LAV,AME,TEAL]][seed%4];
/* the hanging rock */const prof=[[Rr,0,ROCK2,0],[Rr*.96,-Rr*.07,ROCK,0],[Rr*.82,-Rr*.3,ROCK2,0],[Rr*.6,-Rr*.55,ROCK,0],[Rr*.42,-Rr*.85,ROCK2,0],[Rr*.2,-Rr*1.3,ROCK,0],[Rr*.05,-Rr*1.55,ROCK2,0],[Rr*.1,-Rr*1.6,TEAL,.9],[0,-Rr*1.95,TEAL,1]];
lathe(x,y,z,prof,22,R()*3,.28,R);disc(x,y,z,Rr,TURF,.12,22,true);
/* a glowing rim and a ring road */torus(x,y+.15,z,Rr*.98,.35,36,4,TEAL,1);torus(x,y+.25,z,Rr*.62,.22,30,4,[.9,.7,.95],.5);
const items=[];const N=hero?34:Math.max(4,Rr*.55|0);
if(hero){spire(x,y,z,78,7.5,R,pal);torus(x,y+58,z,13,.5,30,5,TEAL,1,.25,.1);torus(x,y+66,z,10,.4,30,5,ROSE,1,-.2,.3)}else spire(x,y,z,Rr*1.6+8,Rr*.17+1.2,R,pal);
const place=(i)=>{for(let t=0;t<30;t++){const a=R()*6.2832,rr=(hero?9:Rr*.25)+R()*(Rr*.8-(hero?9:Rr*.25));const px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr;if(items.every(q=>Math.hypot(q[0]-px,q[1]-pz)>q[2]+4.2)){return[px,pz,a,rr]}}return null};
for(let i=0;i<N;i++){const p=place(i);if(!p)continue;const k=R(),hh=hero?(10+R()*40):(4+R()*Rr*.9);let w=2+R()*3.5;
if(k<.25){spire(p[0],y,p[1],hh,w,R,pal);w+=2}else if(k<.45){blade(p[0],y,p[1],hh*1.1,w*1.3,R,pal);w*=1.4}else if(k<.62){mushroom(p[0],y,p[1],hh*.8,w*1.2,R,pal);w*=1.7}else if(k<.8){dome(p[0],y,p[1],w*1.6,R,pal);w*=1.8}else if(k<.92&&hero){ringTower(p[0],y,p[1],hh*.9,w*1.2,R,pal);w*=1.4}else if(hero){spiralRamp(p[0],y+.2,p[1],w*2.2,hh*.5,2.2,pal[0],.6);w*=2.4}else blade(p[0],y,p[1],hh,w,R,pal);
items.push([p[0],p[1],w])}
/* a few floating rings drifting around the tallest spire and slim lights along the rim */
for(let i=0;i<(hero?5:2);i++){const a=R()*6.2832,rr=Rr*(.55+R()*.4);torus(x+Math.cos(a)*rr,y+8+R()*30,z+Math.sin(a)*rr,2.5+R()*3,.25,18,4,i&1?TEAL:ROSE,1,R()*1.2,R()*1.2)}}
function bridge(a,b,sag){const pts=[];for(let i=0;i<=14;i++){const k=i/14;pts.push([lerp(a[0],b[0],k),lerp(a[1],b[1],k)+Math.sin(k*3.1416)*sag,lerp(a[2],b[2],k)])}tube(pts,.5,[.9,.85,1],.35,4);const pts2=pts.map(p=>[p[0],p[1]+1.3,p[2]]);tube(pts2,.22,TEAL,1,4)}
function ship(R){V=[];const L=14,W=2.8;const prof=[[0,-L,[.95,.92,1],0],[W*.7,-L*.7,[.95,.92,1],0],[W,-L*.2,[.72,.62,.92],0],[W*.8,L*.4,[.95,.92,1],0],[W*.3,L*.8,[.72,.62,.92],0],[0,L,TEAL,1]];
/* a leaf-shaped hull: a lathe about the vertical axis, then turned so its length lies along z */
lathe(0,0,0,prof,8,.4,0,R);const hull=V;V=[];for(let i=0;i<hull.length;i+=10)V.push(hull[i],hull[i+2],hull[i+1],hull[i+3],hull[i+5],hull[i+4],hull[i+6],hull[i+7],hull[i+8],hull[i+9]);
box(0,-.2,-5,W*5.5,.25,4,[.62,.5,.9],0,0);box(0,-.1,-9,W*3.5,.2,3,[.7,.6,.95],.2,0);torus(0,0,L+1.5,1.5,.35,12,4,TEAL,1,1.5708,0);torus(0,0,-L-.5,1.2,.3,12,4,ROSE,1,1.5708,0);return V}
/* ---- build the whole scene once ---- */
function build(){const R=rng(2026);V=[];
island(0,0,0,38,1,true);
const ISL=[[-120,22,-70,22],[110,-14,-110,26],[-60,48,150,18],[170,10,60,24],[-200,-6,-30,28],[40,70,-230,20],[-150,60,-180,16],[230,38,-70,18],[90,-30,230,20],[-250,36,130,22],[0,-6,-360,34]];
ISL.forEach((q,i)=>island(q[0],q[1],q[2],q[3],i+2,false));
/* light bridges between the hero city and its neighbours */
const H=[0,2,0];bridge([30,1,-10],[-103,23,-65],14);bridge([-28,1,12],[-48,49,142],-6);bridge([34,1,8],[155,11,50],10);bridge([-110,23,-80],[-188,-5,-35],8);
/* tall crystalline needles rising out of the cloud sea */
for(let i=0;i<46;i++){const a=R()*6.2832,rr=300+R()*900,x=Math.cos(a)*rr,z=Math.sin(a)*rr,h=60+R()*220;lathe(x,-130,z,[[10+R()*14,0,ROCK2,0],[5+R()*6,h*.5,ROCK,0],[0,h,i%4?ROCK2:TEAL,i%4?0:.7]],5,R()*3,.2,R)}
nA=V.length/10;const scene=V.slice();
const ships=[];for(let i=0;i<4;i++){SHIPS.push({r:70+i*40,y:10+i*14,sp:.07+.03*i,ph:i*1.7,tilt:i&1?1:-1})}
const sv=ship(R);nB=nA+sv.length/10;const all=new Float32Array(scene.length+sv.length);all.set(scene);all.set(sv,scene.length);V=[];return all}
function init(){if(state)return state==1;state=2;try{gl=cv.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true});if(!gl)return false;
PM=prog(VS,FS);PS=prog(SVS,SFS);PP=prog(PVS,PFS);
const data=build();VB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,VB);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
VAO=gl.createVertexArray();gl.bindVertexArray(VAO);const L=n=>gl.getAttribLocation(PM,n);
gl.enableVertexAttribArray(L('a_p'));gl.vertexAttribPointer(L('a_p'),3,gl.FLOAT,false,40,0);gl.enableVertexAttribArray(L('a_n'));gl.vertexAttribPointer(L('a_n'),3,gl.FLOAT,false,40,12);gl.enableVertexAttribArray(L('a_c'));gl.vertexAttribPointer(L('a_c'),3,gl.FLOAT,false,40,24);gl.enableVertexAttribArray(L('a_e'));gl.vertexAttribPointer(L('a_e'),1,gl.FLOAT,false,40,36);
const R=rng(9),m=new Float32Array(700*4);for(let i=0;i<700;i++){m[i*4]=(R()-.5)*700;m[i*4+1]=-40+R()*170;m[i*4+2]=(R()-.5)*700;m[i*4+3]=.5+R()*2.4}
MOTE=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,MOTE);gl.bufferData(gl.ARRAY_BUFFER,m,gl.STATIC_DRAW);SVAO=gl.createVertexArray();gl.bindVertexArray(SVAO);
const pl=gl.getAttribLocation(PP,'a_p'),ps=gl.getAttribLocation(PP,'a_s');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,3,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(ps);gl.vertexAttribPointer(ps,1,gl.FLOAT,false,16,12);
gl.bindVertexArray(null);state=1;return true}catch(e){console.warn('ALN3D',e);state=3;gl=null;return false}}
/* ---- the camera flight ---- */
const KEYS=[
[0,[70,-92,-330],[0,-8,0],62],[4.5,[48,-70,-215],[0,5,0],60],[8.5,[22,-25,-118],[0,34,0],58],[11.5,[-22,16,-58],[0,42,0],62],
[14.5,[-46,30,-6],[6,44,0],64],[17.5,[-14,42,46],[0,52,0],62],[20.5,[70,70,150],[-20,40,-30],58],[24,[160,118,300],[-60,40,-120],52]];
const D=24;
function cam(t){t=cl(t,0,D);let i=0;while(i<KEYS.length-2&&t>KEYS[i+1][0])i++;const a=KEYS[i],b=KEYS[i+1],p0=KEYS[Math.max(0,i-1)],p3=KEYS[Math.min(KEYS.length-1,i+2)];let u=(t-a[0])/(b[0]-a[0]);u=u*u*(3-2*u)*.5+u*.5;
const cr=(p0,p1,p2,p3,u)=>{const u2=u*u,u3=u2*u;return.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u2+(-p0+3*p1-3*p2+p3)*u3)};
const pos=[0,1,2].map(k=>cr(p0[1][k],a[1][k],b[1][k],p3[1][k],u)),tg=[0,1,2].map(k=>cr(p0[2][k],a[2][k],b[2][k],p3[2][k],u));return{pos,tg,fov:lerp(a[3],b[3],u)}}
function draw(t,W,H){if(!init())return false;W=W|0||640;H=H|0||400;if(cv.width!=W||cv.height!=H){cv.width=W;cv.height=H}
const c=cam(t),B=basis(c.pos,c.tg),fov=c.fov*Math.PI/180,asp=W/H,vp=mul(persp(fov,asp,.5,4000),view(c.pos,B));
gl.viewport(0,0,W,H);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
gl.useProgram(PS);const U=(p,n)=>gl.getUniformLocation(p,n);gl.uniform3fv(U(PS,'u_cam'),c.pos);gl.uniform3fv(U(PS,'u_f'),B.f);gl.uniform3fv(U(PS,'u_r'),B.r);gl.uniform3fv(U(PS,'u_u'),B.u);gl.uniform1f(U(PS,'u_th'),Math.tan(fov/2));gl.uniform1f(U(PS,'u_asp'),asp);gl.uniform1f(U(PS,'u_t'),t);
gl.bindVertexArray(SVAO);gl.drawArrays(gl.TRIANGLES,0,3);
gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(PM);gl.uniformMatrix4fv(U(PM,'u_vp'),false,vp);gl.uniform3fv(U(PM,'u_cam'),c.pos);gl.uniform1f(U(PM,'u_t'),t);gl.uniform3fv(U(PM,'u_fc'),[.98,.62,.66]);
gl.bindVertexArray(VAO);gl.uniformMatrix4fv(U(PM,'u_m'),false,I4);gl.drawArrays(gl.TRIANGLES,0,nA);
/* sky-ships drifting on slow circles around the hero city */
for(const s of SHIPS){const a=t*s.sp+s.ph,x=Math.cos(a)*s.r,z=Math.sin(a)*s.r*1.15;gl.uniformMatrix4fv(U(PM,'u_m'),false,modelM(x,s.y+Math.sin(t*.6+s.ph)*2,z,-a+(s.tilt>0?0:3.1416)));gl.drawArrays(gl.TRIANGLES,nA,nB-nA)}
/* drifting motes of light */
gl.useProgram(PP);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.uniformMatrix4fv(U(PP,'u_vp'),false,mul(persp(fov,asp,.5,4000),view(c.pos,B)));gl.uniform1f(U(PP,'u_t'),t);gl.uniform1f(U(PP,'u_h'),H*.9);gl.bindVertexArray(SVAO);gl.drawArrays(gl.POINTS,0,700);gl.depthMask(true);gl.bindVertexArray(null);
return true}
return{cv,draw,D,init}})();

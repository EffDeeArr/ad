/* ===== Floor 25: the castle, the siege waves and the mecha bird (0.19) =====
   Everything for the floor lives in this file. It runs in the same global scope as index.html, so it can use the game's own
   helpers; index.html only calls into it (casBuild / startCastle / casStep / casHud / casList / mbAI / mbGeo / bmStepC). */
let CAS=null,CASF=0,CASM=null,CASMT=null;

/* ---------- 256x256 textures (twice the detail of the 128 tiles used elsewhere) ---------- */
const CASL={};
function casRng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
function casHash(a,b,c){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul((c|0)+17,2147483647);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
function casVN(lat,L,x,y){const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),xa=((x0%L)+L)%L,xb=(xa+1)%L,ya=((y0%L)+L)%L,yb=(ya+1)%L;
const a=lat[ya*L+xa],b=lat[ya*L+xb],c=lat[yb*L+xa],d=lat[yb*L+xb];return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy}
/* tileable fractal noise; x,y in 0..256, 'base' lattice cells across the tile, ax/ay stretch the lattice for streaky textures */
function casFbm(seed,x,y,oct,base,ax,ay){let v=0,amp=.5,tot=0,L=base;ax=ax||1;ay=ay||1;for(let o=0;o<oct;o++){const k=seed+'_'+L,lat=CASL[k]||(CASL[k]=(()=>{const r=casRng(seed*7919+L*131),a=new Float32Array(L*L);for(let i=0;i<a.length;i++)a[i]=r();return a})());
v+=amp*casVN(lat,L,x/256*L*ax,y/256*L*ay);tot+=amp;amp*=.5;L*=2;if(L>256)break}return v/tot}
const casC=(v)=>v<0?0:v>255?255:v|0;
const casPack=(r,g,b,a)=>((a===undefined?255:a)<<24|casC(b)<<16|casC(g)<<8|casC(r))>>>0;
const casMix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function casTile(fn){const t=new Uint32Array(65536);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const c=fn(x,y);t[y*256+x]=casPack(c[0],c[1],c[2],c[3])}return t}
function casCanvas(draw,post){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');draw(c);const d=c.getImageData(0,0,256,256),u=new Uint32Array(d.data.buffer.slice(0));
if(post)for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=y*256+x,v=u[i],r=v&255,g=(v>>8)&255,b=(v>>16)&255,a=v>>>24,o=post(x,y,r,g,b,a);u[i]=casPack(o[0],o[1],o[2],o[3]===undefined?a:o[3])}return u}
/* running-bond stone brick with bevelled edges, grout, cracks and moss */
function casBrick(o){const sd=o.seed,rh=o.rh||32,bw=o.bw||64,stack=o.stack,base=o.base,mor=o.mortar,moss=o.moss===undefined?.5:o.moss;
return casTile((x,y)=>{const row=(y/rh)|0,off=stack?0:(row&1)?bw/2:0,xo=(x+off)%256,bi=(xo/bw)|0,u=xo-bi*bw,v=y-row*rh,blk=casHash(sd,row,bi),d=Math.min(u,bw-1-u,v,rh-1-v);
const n1=casFbm(sd,x,y,4,8),n2=casFbm(sd+3,x,y,3,32),n3=casFbm(sd+7,x,y,2,64);
const grout=u<2||v<2;
if(grout){const k=.7+.5*n2;return[mor[0]*k,mor[1]*k,mor[2]*k]}
let k=.8+.38*blk+(n1-.5)*.4+(n2-.5)*.2+(n3-.5)*.12;
if(d<7)k*=.74+.26*(d/7);if(v<5&&u>2&&u<bw-3)k*=1.1;if(u<5&&v>2)k*=1.05;if(v>rh-5)k*=.9;
if(d<4&&n2>.6)k*=.78;
let c=[base[0]*k,base[1]*k,base[2]*k];const tint=(blk-.5)*14;c[0]+=tint;c[2]-=tint*.6;
const rg=Math.abs(casFbm(sd+11,x,y,3,10)-.5);if(rg<.009&&blk>.45)c=[c[0]*.45,c[1]*.45,c[2]*.45];
const mm=casFbm(sd+5,x,y,3,6)+(y/256-.5)*.0+(d<9?.07:0);if(moss>0&&mm>.6){const t=Math.min(1,(mm-.6)/.16)*moss*(.6+.7*n2);c=casMix(c,[64+n1*40,92+n2*50,44],t)}
return c})}
/* round cobbles (worley cells) */
function casCobble(sd,base,cells){const pts=[];const r=casRng(sd);for(let i=0;i<cells*cells;i++)pts.push([r(),r()]);
return casTile((x,y)=>{const cs=256/cells,cx=(x/cs)|0,cy=(y/cs)|0;let d1=1e9,d2=1e9,bi=0,bx=0,by=0;
for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const gx=cx+i,gy=cy+j,wx=((gx%cells)+cells)%cells,wy=((gy%cells)+cells)%cells,p=pts[wy*cells+wx],px=(gx+p[0])*cs,py=(gy+p[1])*cs,dd=Math.hypot(x-px,y-py);if(dd<d1){d2=d1;d1=dd;bi=wy*cells+wx;bx=px;by=py}else if(dd<d2)d2=dd}
const e=d2-d1,n=casFbm(sd,x,y,4,16),h=casHash(sd,bi,3);if(e<2.4)return[28+n*20,26+n*18,24+n*16];
let k=.72+.5*h+(n-.5)*.4;const dome=Math.min(1,e/(cs*.32));k*=.7+.3*dome;const lx=(x-bx)/cs,ly=(y-by)/cs;k*=1+(-lx-ly)*.22;
const c=[base[0]*k+(h-.5)*16,base[1]*k+(h-.5)*8,base[2]*k];if(casFbm(sd+4,x,y,3,8)>.66&&e<cs*.4)return casMix(c,[58,86,42],.5);return c})}
function casGrass(){return casTile((x,y)=>{const n=casFbm(21,x,y,5,6),m=casFbm(22,x,y,3,3),st=casFbm(23,x,y,3,48,1,.25),sp=casHash(x,y,5);let t=n*.9+(st-.5)*.5;
let c=casMix([38,78,30],[112,152,58],Math.max(0,Math.min(1,t)));if(m>.62)c=casMix(c,[150,148,70],Math.min(1,(m-.62)*4)*.55);
const k=.88+sp*.24;c=[c[0]*k,c[1]*k,c[2]*k];if(casHash((x>>1)|0,(y>>1)|0,9)>.9993)c=[250,246,210];else if(casHash((x>>1)|0,(y>>1)|0,10)>.9994)c=[245,205,60];
if(casHash(x,(y>>2)|0,12)>.965)c=[c[0]*1.18,c[1]*1.18,c[2]*1.1];return c})}
function casDirt(){const r=casRng(33),pts=[];for(let i=0;i<22*22;i++)pts.push([r(),r()]);
return casTile((x,y)=>{const n=casFbm(31,x,y,5,5),m=casFbm(32,x,y,3,24);let c=casMix([96,72,48],[148,116,80],n);const sp=casHash(x,y,6);const k=.9+sp*.2;c=[c[0]*k,c[1]*k,c[2]*k];
const cs=256/22,cx=(x/cs)|0,cy=(y/cs)|0;let d1=1e9,pi=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const gx=cx+i,gy=cy+j,wx=((gx%22)+22)%22,wy=((gy%22)+22)%22,p=pts[wy*22+wx],dd=Math.hypot(x-(gx+p[0])*cs,y-(gy+p[1])*cs);if(dd<d1){d1=dd;pi=wy*22+wx}}
const pr=2.2+casHash(pi,1,1)*2.4;if(casHash(pi,2,2)>.55&&d1<pr){const hh=casHash(pi,3,3);c=casMix([122,112,100],[178,168,150],hh);c=[c[0]*(1-d1/pr*.4),c[1]*(1-d1/pr*.4),c[2]*(1-d1/pr*.4)]}
const rut=Math.exp(-Math.pow((x-62)/20,2))+Math.exp(-Math.pow((x-194)/20,2));c=[c[0]*(1-.28*rut),c[1]*(1-.28*rut),c[2]*(1-.28*rut)];if(m>.66)c=casMix(c,[70,94,44],Math.min(1,(m-.66)*3)*.4);return c})}
function casWood(){return casTile((x,y)=>{const pl=(x/32)|0,u=x%32,h=casHash(41,pl,1),n=casFbm(42,x,y,4,8,1,.4);if(u<1.4||u>30.6)return[26,16,8];
const gr=Math.sin(y/256*6.2832*(2+(h*4|0))+n*9+h*20)*.5+.5;let k=.74+.3*h+gr*.18+(n-.5)*.3;if(u<4)k*=.9;let c=[148*k,98*k,56*k];
for(let q=0;q<2;q++){const kx=16+casHash(pl,q,7)*0,ky=(casHash(pl,q+9,8)*210+20),kd=Math.hypot(u-kx,y-ky);if(casHash(pl,q,5)>.6&&kd<9){const ring=Math.sin(kd*1.4)*.5+.5;c=[c[0]*(.55+.25*ring),c[1]*(.55+.25*ring),c[2]*(.55+.25*ring)]}}
if((y<14&&y>9||y>242&&y<247)&&Math.abs(u-16)<2)c=[96,96,104];return c})}
function casIron(){return casCanvas(c=>{c.clearRect(0,0,256,256);const bar=(x,y,w,h,vert)=>{const g=vert?c.createLinearGradient(x,0,x+w,0):c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#15171c');g.addColorStop(.35,'#6a707c');g.addColorStop(.6,'#3a3e48');g.addColorStop(1,'#101216');c.fillStyle=g;c.fillRect(x,y,w,h)};
for(let x=14;x<256;x+=48)bar(x,0,14,256,true);for(const y of[58,190])bar(0,y,256,12,false);c.fillStyle='#8a909c';for(let x=14;x<256;x+=48)for(const y of[58,190]){c.beginPath();c.arc(x+7,y+6,3,0,7);c.fill()}},(x,y,r,g,b,a)=>{if(!a)return[0,0,0,0];const n=casFbm(51,x,y,3,16);return[r*(.8+n*.4),g*(.8+n*.4)*(.96),b*(.8+n*.4)*.98,255]})}
function casLabPanel(){return casTile((x,y)=>{const px=(x/64)|0,py=(y/64)|0,u=x%64,v=y%64,h=casHash(61,px,py),n=casFbm(62,x,y,4,10),d=Math.min(u,63-u,v,63-v);
if(u<2||v<2){const g=.55+.45*Math.sin((u+v)*.2);return[40,150,162].map(q=>q*(.8+g*.4))}
let k=.9+h*.06+(n-.5)*.12+(v<5?.05:0)+(d<4?-.06:0);let c=[226*k,234*k,238*k];
if(h>.7){const s=(v-16)%8;if(v>14&&v<50&&s<3&&u>12&&u<52)c=[60,70,80]}
if((u==6||u==57)&&(v==6||v==57))c=[80,240,240];if(h>.35&&h<.5&&u>20&&u<44&&v>26&&v<38){c=[40,60,70];if(u>22&&u<42&&v>28&&v<36)c=casMix([30,200,210],[60,255,240],(u-22)/20)}
return c})}
function casLabGlow(){return casTile((x,y)=>{const n=casFbm(71,x,y,3,12),band=Math.exp(-Math.pow((x-128)/46,2)),core=Math.exp(-Math.pow((x-128)/12,2)),sc=(y%8<2)?.82:1;let t=Math.min(1,band*.9+core*.5)*sc*(.9+n*.2);
if(x<5||x>250)return[20,90,98];return casMix([8,34,44],[120,255,244],t)})}
function casLabMetal(){return casTile((x,y)=>{const st=casFbm(81,x,y,3,6,.5,12),n=casFbm(82,x,y,4,10),px=(x/128)|0,py=(y/128)|0,u=x%128,v=y%128;let k=.74+(st-.5)*.45+(n-.5)*.18+casHash(81,px,py)*.1;
if(u<2||v<2)k*=.45;if(u==2||v==2)k*=1.4;let c=[62*k,70*k,82*k];for(const[rx,ry]of[[12,12],[116,12],[12,116],[116,116]])if(Math.hypot(u-rx,v-ry)<3.2)c=[150,160,174];
if(casHash(81,px,py)>.82&&u>40&&u<88&&v>56&&v<66)c=casMix([30,60,70],[60,240,230],(u-40)/48);return c})}
function casLabGlass(){return casCanvas(c=>{const g=c.createLinearGradient(0,0,256,256);g.addColorStop(0,'#53d6e6');g.addColorStop(.5,'#1e7f9c');g.addColorStop(1,'#0e3a58');c.fillStyle=g;c.fillRect(0,0,256,256);c.fillStyle='rgba(255,255,255,.22)';c.beginPath();c.moveTo(30,0);c.lineTo(90,0);c.lineTo(10,256);c.lineTo(-50,256);c.fill();c.fillStyle='rgba(255,255,255,.12)';c.beginPath();c.moveTo(120,0);c.lineTo(150,0);c.lineTo(70,256);c.lineTo(40,256);c.fill();
c.strokeStyle='rgba(180,255,255,.25)';c.lineWidth=1.4;for(let i=0;i<256;i+=32){c.beginPath();c.moveTo(i,0);c.lineTo(i,256);c.moveTo(0,i);c.lineTo(256,i);c.stroke()}c.strokeStyle='#1a2230';c.lineWidth=14;c.strokeRect(0,0,256,256);c.strokeStyle='#8aa0b4';c.lineWidth=2;c.strokeRect(8,8,240,240)},(x,y,r,g,b)=>{const n=casFbm(91,x,y,3,12);return[r*(.92+n*.16),g*(.92+n*.16),b*(.92+n*.16)]})}
function casLabFloor(){return casTile((x,y)=>{const u=x%64,v=y%64,n=casFbm(101,x,y,4,10),h=casHash(101,(x/64)|0,(y/64)|0);let k=.8+h*.15+(n-.5)*.2;let c=[34*k,46*k,60*k];if(u<2||v<2)c=[16,24,32];
const cx=Math.min(Math.abs(u-32),Math.abs(v-32));if(cx<1.6&&((u>10&&u<54)||(v>10&&v<54)))c=casMix(c,[60,230,225],.85);if(Math.hypot(u-32,v-32)<4)c=[110,255,240];return c})}
function casBanner(){return casCanvas(c=>{const g=c.createLinearGradient(0,0,256,0);g.addColorStop(0,'#701018');g.addColorStop(.5,'#b02030');g.addColorStop(1,'#701018');c.fillStyle=g;c.fillRect(0,0,256,256);c.fillStyle='#e6b84a';c.fillRect(0,0,256,20);c.fillRect(0,236,256,20);c.fillStyle='#b8862a';c.fillRect(0,20,256,4);c.fillRect(0,232,256,4);
c.fillStyle='#e6b84a';c.strokeStyle='#7a5418';c.lineWidth=3;c.beginPath();c.rect(88,90,80,92);c.fill();c.stroke();for(let i=0;i<4;i++){c.beginPath();c.rect(88+i*22,70,16,24);c.fill();c.stroke()}c.fillStyle='#701018';c.beginPath();c.moveTo(112,182);c.lineTo(112,148);c.arc(128,148,16,Math.PI,0);c.lineTo(144,182);c.fill();c.fillStyle='#e6b84a';c.beginPath();c.arc(128,56,0,0,7);c.fill()},(x,y,r,g,b)=>{const f=Math.sin(x*.11+casFbm(111,x,y,2,4)*6)*.5+.5,w=((x+y)&3)==0?.93:1;const k=(.84+f*.2)*w;return[r*k,g*k,b*k]})}
function casFire(){return casTile((x,y)=>{const n=casFbm(121,x,y,4,6,1,1.6),t=1-y/256+(n-.5)*.7;return casMix([200,40,0],[255,235,120],Math.max(0,Math.min(1,t)))})}
function casRock(){return casTile((x,y)=>{const st=casFbm(131,x,y,4,5,.25,6),n=casFbm(132,x,y,4,12);let k=.7+st*.5+(n-.5)*.35;const band=Math.sin(y/256*6.2832*7+n*5)*.06;k+=band;let c=[118*k,106*k,92*k];const rg=Math.abs(casFbm(133,x,y,3,8)-.5);if(rg<.01)c=[c[0]*.5,c[1]*.5,c[2]*.5];if(casFbm(134,x,y,3,4)>.68)c=casMix(c,[72,92,54],.45);return c})}
function casLeaves(){const r=casRng(141),pts=[];for(let i=0;i<14*14;i++)pts.push([r(),r()]);
return casTile((x,y)=>{const cs=256/14,cx=(x/cs)|0,cy=(y/cs)|0;let d1=1e9,pi=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const gx=cx+i,gy=cy+j,wx=((gx%14)+14)%14,wy=((gy%14)+14)%14,p=pts[wy*14+wx],dd=Math.hypot(x-(gx+p[0])*cs,y-(gy+p[1])*cs);if(dd<d1){d1=dd;pi=wy*14+wx}}
const h=casHash(pi,4,4),n=casFbm(142,x,y,4,10);let k=.55+h*.55+(n-.5)*.3;k*=.78+.3*(1-d1/(cs*.8));return[34*k,92*k,34*k]})}
function casBark(){return casTile((x,y)=>{const st=casFbm(151,x,y,4,16,1,.14),n=casFbm(152,x,y,3,6);let k=.6+st*.7+(n-.5)*.2;if(casFbm(153,x,y,3,18,1,.2)<.3)k*=.55;return[82*k,56*k,36*k]})}
const CAS_T={brick:0,flag:1,cobble:2,grass:3,dirt:4,wood:5,labPanel:6,labGlow:7,labMetal:8,labGlass:9,labFloor:10,banner:11,fire:12,rock:13,leaves:14,bark:15,iron:16,brickDk:17,roof:18};
function casTextures(){if(CASMT)return CASMT;const T=CAS_T,MT=[];
MT[T.brick]=casBrick({seed:1,base:[158,152,142],mortar:[84,80,74],moss:.55});
MT[T.brickDk]=casBrick({seed:2,base:[112,108,104],mortar:[56,54,52],rh:32,bw:64,moss:.35});
MT[T.flag]=casBrick({seed:3,base:[176,170,158],mortar:[70,66,60],rh:64,bw:64,stack:1,moss:.7});
MT[T.cobble]=casCobble(5,[142,136,128],12);
MT[T.grass]=casGrass();MT[T.dirt]=casDirt();MT[T.wood]=casWood();MT[T.iron]=casIron();
MT[T.labPanel]=casLabPanel();MT[T.labGlow]=casLabGlow();MT[T.labMetal]=casLabMetal();MT[T.labGlass]=casLabGlass();MT[T.labFloor]=casLabFloor();
MT[T.banner]=casBanner();MT[T.fire]=casFire();MT[T.rock]=casRock();MT[T.leaves]=casLeaves();MT[T.bark]=casBark();
MT[T.roof]=casBrick({seed:9,base:[88,96,112],mortar:[34,38,48],rh:16,bw:32,moss:0});
return CASMT=MT}

/* ---------- the map ---------- */
const CAS_C={WX:170,WY:170,CX:85,CY:40,HW:17,TW:3.2,WZ:6,LX:85,LY:128};
function casBuild(){
const {WX,WY,CX,CY,HW,TW,WZ,LX,LY}=CAS_C,ZB=-14,ZT=80,T=CAS_T,MT=casTextures(),Gh=400/64/2;
let sd=25;const rn=()=>{sd=(Math.imul(sd,1103515245)+12345)>>>0;return sd/4294967296};
const TPo=[],TUv=[],TFc=[],FCls=[],FSh=[],FNx=[],FT0=[],FTn=[],FFl=[],FMt=[];let nTri=0;
const quad=(P,U,mat,sh,n)=>{const fid=FCls.length;FCls.push(0);FSh.push(sh);FNx.push(n[0],n[1],n[2]);FT0.push(nTri);FTn.push(2);FFl.push(0);FMt.push(mat);for(const t of[[0,1,2],[0,2,3]]){for(const k of t)TPo.push(P[k][0],P[k][1],P[k][2]);for(const k of t)TUv.push(U[k][0],U[k][1]);TFc.push(fid);nTri++}};
const BPl=[],B0=[0],BBb=[],BCl=[],BOXES=[];
const box=(x0,y0,z0,x1,y1,z1,m,o)=>{o=o||{};BPl.push(1,0,0,x1,-1,0,0,-x0,0,1,0,y1,0,-1,0,-y0,0,0,1,z1,0,0,-1,-z0);B0.push(BPl.length/4);BBb.push(x0,y0,z0,x1,y1,z1);BCl.push(0);BOXES.push([x0,y0,z0,x1,y1,z1,m,o])};
const inSolid=(x,y,z,self)=>{for(let k=0;k<BOXES.length;k++){if(k===self)continue;const b=BOXES[k];if(x>b[0]+.001&&x<b[3]-.001&&y>b[1]+.001&&y<b[4]-.001&&z>b[2]+.001&&z<b[5]-.001)return true}return false};
const emit=self=>{const[x0,y0,z0,x1,y1,z1,m,o]=BOXES[self],mm=f=>typeof m=='number'?m:(m[f]!==undefined?m[f]:(m.a!==undefined?m.a:0)),sc=o.sc||2,dx=(x1-x0)/sc,dy=(y1-y0)/sc,dz=(z1-z0)/sc,S=o.sh===undefined?1:o.sh,sh=k=>Math.round(255*Math.min(1,k*S));
const hid=(pts,nx,ny,nz)=>{for(const p of pts)if(!inSolid(p[0]+nx*.02,p[1]+ny*.02,p[2]+nz*.02,self))return false;return true};
const sm=(a0,a1,b0,b1,f)=>{const o2=[];for(const u of[.2,.5,.8])for(const v of[.2,.5,.8])o2.push(f(a0+(a1-a0)*u,b0+(b1-b0)*v));return o2};
if(!hid(sm(x0,x1,y0,y1,(a,b)=>[a,b,z1]),0,0,1))quad([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],[[0,0],[dx,0],[dx,dy],[0,dy]],mm('t'),sh(1),[0,0,1]);
if(!o.nb&&!hid(sm(x0,x1,y0,y1,(a,b)=>[a,b,z0]),0,0,-1))quad([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],[[0,0],[dx,0],[dx,dy],[0,dy]],mm('b'),sh(.6),[0,0,-1]);
if(!hid(sm(y0,y1,z0,z1,(a,b)=>[x0,a,b]),-1,0,0))quad([[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]],[[dy,dz],[0,dz],[0,0],[dy,0]],mm('w'),sh(.74),[-1,0,0]);
if(!hid(sm(y0,y1,z0,z1,(a,b)=>[x1,a,b]),1,0,0))quad([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],[[0,dz],[dy,dz],[dy,0],[0,0]],mm('e'),sh(.88),[1,0,0]);
if(!hid(sm(x0,x1,z0,z1,(a,b)=>[a,y0,b]),0,-1,0))quad([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],[[dx,dz],[0,dz],[0,0],[dx,0]],mm('s'),sh(.8),[0,-1,0]);
if(!hid(sm(x0,x1,z0,z1,(a,b)=>[a,y1,b]),0,1,0))quad([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],[[0,dz],[dx,dz],[dx,0],[0,0]],mm('n'),sh(.7),[0,1,0])};
const st=(m,sc,sh)=>[m,sc,sh];
/* ---- ground and the mountain ring that closes the valley ---- */
box(0,0,-6,WX,WY,0,{t:T.grass,b:T.rock,a:T.rock},{sc:8});
for(let side=0;side<4;side++){const n=Math.ceil(WX/11);for(let i=0;i<n;i++){const a=i*11,len=Math.min(11,WX-a)+.2,h=16+rn()*16,d=7+rn()*4;
if(side==0)box(a,0,0,a+len,d,h,T.rock,{sc:10,nb:1});else if(side==1)box(a,WY-d,0,a+len,WY,h,T.rock,{sc:10,nb:1});else if(side==2)box(0,a,0,d,a+len,h,T.rock,{sc:10,nb:1});else box(WX-d,a,0,WX,a+len,h,T.rock,{sc:10,nb:1})}}
/* ---- the castle: walls with a walkway on top, merlons along the outside, gates north and south, corner turrets ---- */
const X0=CX-HW,X1=CX+HW,Y0=CY-HW,Y1=CY+HW,GW=2.7,wm={t:T.flag,b:T.brick,a:T.brick};
box(X0,Y0,0,CX-GW,Y0+TW,WZ,wm,{sc:4});box(CX+GW,Y0,0,X1,Y0+TW,WZ,wm,{sc:4});box(CX-GW,Y0,4.5,CX+GW,Y0+TW,WZ,wm,{sc:4});
box(X0,Y1-TW,0,CX-GW,Y1,WZ,wm,{sc:4});box(CX+GW,Y1-TW,0,X1,Y1,WZ,wm,{sc:4});box(CX-GW,Y1-TW,4.5,CX+GW,Y1,WZ,wm,{sc:4});
box(X0,Y0+TW,0,X0+TW,Y1-TW,WZ,wm,{sc:4});box(X1-TW,Y0+TW,0,X1,Y1-TW,WZ,wm,{sc:4});
/* gate details: dark arch frames, raised portcullis, banners */
for(const gy of[Y0,Y1-TW]){box(CX-GW-.5,gy-.1,0,CX-GW+.12,gy+TW+.1,WZ-.2,{a:T.brickDk,t:T.brickDk},{sc:3});box(CX+GW-.12,gy-.1,0,CX+GW+.5,gy+TW+.1,WZ-.2,{a:T.brickDk,t:T.brickDk},{sc:3});box(CX-GW,gy+TW/2-.2,3.5,CX+GW,gy+TW/2+.2,4.5,T.iron,{sc:5.4,sh:1});}
/* merlons: a parapet of stone teeth on the outer edge of every wall */
const mer=(x0,y0,x1,y1)=>box(x0,y0,WZ,x1,y1,WZ+1.9,{a:T.brick,t:T.flag},{sc:2});
for(let x=X0+.2;x<X1-1.2;x+=2.7){mer(x,Y0,x+1.5,Y0+.9);mer(x,Y1-.9,x+1.5,Y1)}
for(let y=Y0+1.6;y<Y1-1.6;y+=2.7){mer(X0,y,X0+.9,y+1.5);mer(X1-.9,y,X1,y+1.5)}
/* corner turrets: broader platforms with a ring of merlons and a flag pole */
for(const[cx,cy,sx,sy]of[[X0,Y0,-1,-1],[X1,Y0,1,-1],[X0,Y1,-1,1],[X1,Y1,1,1]]){const x0=cx-(sx>0?1.6:4.2),y0=cy-(sy>0?1.6:4.2);box(x0,y0,0,x0+5.8,y0+5.8,WZ+.5,{t:T.flag,a:T.brickDk,b:T.brickDk},{sc:4});
for(let i=0;i<4;i++){box(x0+i*1.5,y0,WZ+.5,x0+i*1.5+.9,y0+.9,WZ+2,{a:T.brickDk,t:T.flag},{sc:2});box(x0+i*1.5,y0+4.9,WZ+.5,x0+i*1.5+.9,y0+5.8,WZ+2,{a:T.brickDk,t:T.flag},{sc:2});if(i>0&&i<3){box(x0,y0+i*1.5,WZ+.5,x0+.9,y0+i*1.5+.9,WZ+2,{a:T.brickDk,t:T.flag},{sc:2});box(x0+4.9,y0+i*1.5,WZ+.5,x0+5.8,y0+i*1.5+.9,WZ+2,{a:T.brickDk,t:T.flag},{sc:2})}}
box(x0+2.7,y0+2.7,WZ+.5,x0+3.1,y0+3.1,WZ+6.5,T.wood,{sc:2});box(x0+3.1,y0+2.75,WZ+4.2,x0+3.18,y0+3.05,WZ+6.2,T.banner,{sc:2});}
/* stairs up to the walkway along the inside of the east and west walls */
const SR=.25,SN=Math.round(WZ/SR);for(const sx of[0,1]){const xa=sx?X1-TW-2.6:X0+TW,xb=sx?X1-TW:X0+TW+2.6;for(let i=0;i<SN;i++){const ya=Y0+TW+.7+i*.55;box(xa,ya,0,xb,ya+.55,SR*(i+1),{t:T.flag,a:T.brickDk,b:T.brickDk},{sc:2.6,nb:1})}}
/* the courtyard: cobbles, the keep at the back, a well, barrels, crates, torch pillars and banners */
box(X0+TW,Y0+TW,0,X1-TW,Y1-TW,.03,{t:T.cobble,a:T.cobble,b:T.cobble},{sc:5,nb:1});
{const kx=CX-6,ky=Y0+TW;box(kx,ky,.03,kx+12,ky+8.6,5.2,{a:T.brickDk,t:T.flag,b:T.brick},{sc:4});for(let i=0;i<4;i++)box(kx+.4+i*3,ky+8.3,5.2,kx+1.6+i*3,ky+8.6,6.6,{a:T.brick,t:T.flag},{sc:2});
box(CX-1.1,ky+8.55,.03,CX+1.1,ky+8.72,3.2,{a:T.wood,t:T.wood},{sc:2});box(kx+.9,ky+8.58,2.2,kx+2.9,ky+8.68,4.7,T.banner,{sc:2.4});box(kx+9.1,ky+8.58,2.2,kx+11.1,ky+8.68,4.7,T.banner,{sc:2.4});
/* the north gate is shut: a lowered wooden portcullis, braced with iron */
box(CX-GW,Y0+.5,0,CX+GW,Y0+1.5,3.5,{a:T.wood,t:T.wood,b:T.wood},{sc:2.4});for(const zz of[.7,2.2])box(CX-GW,Y0+.4,zz,CX+GW,Y0+.5,zz+.3,T.iron,{sc:4,sh:1});}
box(CX-2.2,CY-1.2,.03,CX+2.2,CY+3.2,1.1,{a:T.brickDk,t:T.brick},{sc:2});box(CX-1.5,CY-.5,1.1,CX+1.5,CY+2.5,1.16,{t:T.labGlass,a:T.labGlass},{sc:2,sh:1.2});
for(const[bx_,by_]of[[X0+TW+.4,Y0+TW+1],[X0+TW+3.4,Y1-TW-3],[X1-TW-1.6,Y1-TW-2],[X1-TW-4.2,Y0+TW+1.2]])box(bx_,by_,.03,bx_+1.2,by_+1.2,1.4,{a:T.wood,t:T.wood},{sc:1.2});
for(const[cx_,cy_]of[[CX+7,CY+4],[CX-8,CY-3],[CX+8.6,CY-5.8]]){box(cx_,cy_,.03,cx_+1.6,cy_+1.6,1.6,{a:T.wood,t:T.wood},{sc:1.6});box(cx_+.3,cy_+.3,1.6,cx_+1.3,cy_+1.3,2.5,{a:T.wood,t:T.wood},{sc:1.2})}
for(const[tx,ty]of[[X0+TW+.4,CY-4],[X1-TW-.4-.5,CY-4],[CX-5,Y0+TW+.5],[CX+5,Y0+TW+.5],[CX-9,Y1-TW-.5],[CX+9,Y1-TW-.5]]){box(tx,ty,.03,tx+.5,ty+.5,1.6,{a:T.brickDk,t:T.flag},{sc:2});box(tx+.06,ty+.06,1.6,tx+.44,ty+.44,2.2,{a:T.fire,t:T.fire},{sc:1,sh:4})}
for(const by of[CY-8,CY+9]){box(X0+TW+.02,by,2.1,X0+TW+.08,by+2,5,T.banner,{sc:2.4});box(X1-TW-.08,by,2.1,X1-TW-.02,by+2,5,T.banner,{sc:2.4})}
for(const gx of[CX-GW-3.6,CX+GW+1.2])box(gx,Y0-.12,2.4,gx+2.4,Y0-.04,5.6,T.banner,{sc:2.8});
/* the road from the north gate to the lab, and a short one south */
box(CX-2.6,Y1,0,CX+2.6,LY-8.2,.03,{t:T.dirt,a:T.dirt,b:T.dirt},{sc:5,nb:1});box(CX-2.6,6,0,CX+2.6,Y0,.03,{t:T.dirt,a:T.dirt,b:T.dirt},{sc:5,nb:1});
/* trees and rocks, kept off the road, the castle and the lab */
const clear=(x,y)=>(Math.abs(x-CX)<HW+9&&Math.abs(y-CY)<HW+9)||(Math.abs(x-CX)<7&&y>CY&&y<LY)||(Math.abs(x-LX)<20&&Math.abs(y-LY)<16)||x<12||y<12||x>WX-12||y>WY-12;
const trees=[];for(let k=0;k<420&&trees.length<64;k++){const x=12+rn()*(WX-24),y=12+rn()*(WY-24);if(clear(x,y)||trees.some(t=>Math.hypot(t[0]-x,t[1]-y)<6))continue;trees.push([x,y])}
for(const[x,y]of trees){const h=3+rn()*1.2,w=3.6+rn()*1.6;box(x-.45,y-.45,0,x+.45,y+.45,h,{a:T.bark,t:T.bark},{sc:1.6});box(x-w/2,y-w/2,h-.6,x+w/2,y+w/2,h+1.8,{a:T.leaves,t:T.leaves,b:T.leaves},{sc:3});box(x-w*.36,y-w*.36,h+1.8,x+w*.36,y+w*.36,h+3.4,{a:T.leaves,t:T.leaves},{sc:3})}
for(let k=0,n=0;k<300&&n<26;k++){const x=12+rn()*(WX-24),y=12+rn()*(WY-24);if(clear(x,y))continue;const w=1.6+rn()*2.6,d=1.4+rn()*2.4,h=.9+rn()*1.8;box(x-w/2,y-d/2,0,x+w/2,y+d/2,h,T.rock,{sc:3});n++}
/* ---- the lab: a pale ceramic hall with glowing teal seams, a glass dome, tanks and a landing pad ---- */
{const lx0=LX-11,lx1=LX+11,ly0=LY-7,ly1=LY+7,wh=5.4,dw=2.3,lm={a:T.labPanel,t:T.labMetal,b:T.labMetal};
box(lx0-.5,ly0-.5,0,lx1+.5,ly1+.5,.7,{a:T.labMetal,t:T.labMetal},{sc:5});
for(let i=0;i<3;i++)box(LX-dw-.4,ly0-2.1+i*.55,0,LX+dw+.4,ly0-.5,.23*(i+1),{t:T.labMetal,a:T.labMetal,b:T.labMetal},{sc:3,nb:1});
box(lx0,ly0,.7,LX-dw,ly0+1,wh,lm,{sc:5});box(LX+dw,ly0,.7,lx1,ly0+1,wh,lm,{sc:5});box(LX-dw,ly0,3.6,LX+dw,ly0+1,wh,lm,{sc:5});box(lx0,ly1-1,.7,lx1,ly1,wh,lm,{sc:5});box(lx0,ly0+1,.7,lx0+1,ly1-1,wh,lm,{sc:5});box(lx1-1,ly0+1,.7,lx1,ly1-1,wh,lm,{sc:5});
box(lx0+1,ly0+1,.7,lx1-1,ly1-1,.78,{t:T.labFloor,a:T.labFloor},{sc:4,nb:1});
box(LX-dw,ly0-.5,.7,LX+dw,ly0+1.1,.78,{t:T.labFloor,a:T.labFloor,b:T.labMetal},{sc:4,nb:1});
box(lx0-.3,ly0-.3,wh,lx1+.3,ly1+.3,wh+.6,{t:T.labMetal,a:T.labMetal,b:T.labPanel},{sc:5});
box(lx0-.32,ly0-.32,wh+.12,lx1+.32,ly1+.32,wh+.3,{a:T.labGlow,t:T.labGlow},{sc:2,sh:3});
box(LX-dw-.15,ly0-.08,.7,LX-dw+.05,ly0+1.08,3.7,{a:T.labGlow,t:T.labGlow},{sc:2,sh:3});box(LX+dw-.05,ly0-.08,.7,LX+dw+.15,ly0+1.08,3.7,{a:T.labGlow,t:T.labGlow},{sc:2,sh:3});box(LX-dw-.15,ly0-.08,3.6,LX+dw+.15,ly0+1.08,3.78,{a:T.labGlow,t:T.labGlow},{sc:2,sh:3});
for(const z of[1.6,3.3]){/* the front strips stop at the doorway so they do not form a solid bar across it */box(lx0-.06,ly0-.06,z,LX-dw,ly0+.02,z+.22,{a:T.labGlow,t:T.labGlow},{sc:3,sh:3});box(LX+dw,ly0-.06,z,lx1+.06,ly0+.02,z+.22,{a:T.labGlow,t:T.labGlow},{sc:3,sh:3});box(lx0-.06,ly1-.02,z,lx1+.06,ly1+.06,z+.22,{a:T.labGlow,t:T.labGlow},{sc:3,sh:3})}
box(lx0+3,ly0+2,wh+.6,lx1-3,ly1-2,wh+2.6,{a:T.labPanel,t:T.labMetal,b:T.labMetal},{sc:5});
box(LX-4,LY-3,wh+2.6,LX+4,LY+3,wh+3.8,{a:T.labGlass,t:T.labGlass},{sc:4,sh:1.4});box(LX-2.7,LY-2,wh+3.8,LX+2.7,LY+2,wh+4.8,{a:T.labGlass,t:T.labGlass},{sc:3,sh:1.4});box(LX-1.2,LY-1.2,wh+4.8,LX+1.2,LY+1.2,wh+5.6,{a:T.labGlow,t:T.labGlow},{sc:2,sh:3});
box(LX+7,LY+3.4,wh+2.6,LX+7.35,LY+3.75,wh+11,T.labMetal,{sc:2});box(LX+6.95,LY+3.3,wh+11,LX+7.4,LY+3.8,wh+11.5,{a:T.labGlow,t:T.labGlow},{sc:1,sh:3});box(LX-7,LY-3.4,wh+2.6,LX-6.65,LY-3.05,wh+8.5,T.labMetal,{sc:2});
for(let i=0;i<3;i++){const tx=lx1+2.2,ty=LY-5+i*4.2;box(tx-1.5,ty-1.5,0,tx+1.5,ty+1.5,.5,T.labMetal,{sc:3});box(tx-1.3,ty-1.3,.5,tx+1.3,ty+1.3,4.6,{a:T.labGlass,t:T.labMetal},{sc:3,sh:1.3});box(tx-.5,ty-.5,.5,tx+.5,ty+.5,4.4,{a:T.labGlow,t:T.labGlow},{sc:2,sh:3});box(lx1,ty-.3,1.2,tx-1.3,ty+.3,1.8,T.labMetal,{sc:1.5})}
{const px0=lx0-12,py0=LY-9,px1=lx0-2,py1=LY+1;
box(px0-.9,py0-.9,-1,px1+.9,py1+.9,.25,{t:T.labMetal,a:T.labMetal,b:T.labMetal},{sc:5,nb:1});
box(px0,py0,-1,px1,py1,.7,{t:T.labMetal,a:T.labMetal,b:T.labMetal},{sc:5,nb:1});
box(px0+.9,py0+.9,.7,px1-.9,py1-.9,.78,{t:T.labGlow,a:T.labGlow},{sc:5,sh:3});
box(px0+2.4,py0+2.4,.78,px1-2.4,py1-2.4,.88,{t:T.labFloor,a:T.labMetal,b:T.labMetal},{sc:3});}
box(LX-2.6,ly0-5,0,LX+2.6,ly0-.5,.12,{t:T.labFloor,a:T.labMetal},{sc:3,nb:1});
/* inside: a containment column, consoles along the back wall */
/* the prototype teleporter: a stepped platform, a ring gate built from segmented plates with glowing spokes, side pylons, four coil towers, a crown of emitter blocks, a control pedestal and capacitor racks */
{const MT_={a:T.labMetal,t:T.labMetal,b:T.labMetal},GL_={a:T.labGlow,t:T.labGlow,b:T.labGlow},PY=LY+2.65,RY0=PY-.35,RY1=PY+.35,cz=1.03+1.5,CS=.375;
box(LX-4.3,LY-2.4,.78,LX+4.3,LY+4.7,.9,MT_,{sc:3,nb:1});box(LX-3.7,LY-1.9,.9,LX+3.7,LY+4.2,1.03,{t:T.labFloor,a:T.labMetal,b:T.labMetal},{sc:3,nb:1});
box(LX-4.4,LY-2.5,.88,LX+4.4,LY-2.4,.94,GL_,{sc:3,sh:3});box(LX-4.4,LY+4.7,.88,LX+4.4,LY+4.8,.94,GL_,{sc:3,sh:3});box(LX-4.4,LY-2.4,.88,LX-4.3,LY+4.7,.94,GL_,{sc:3,sh:3});box(LX+4.3,LY-2.4,.88,LX+4.4,LY+4.7,.94,GL_,{sc:3,sh:3});
box(LX-.5,LY-1.9,1.03,LX+.5,LY+4.2,1.06,GL_,{sc:2,sh:3});box(LX-1.2,LY+1.6,1.03,LX+1.2,LY+3.7,1.05,{t:T.labGlow,a:T.labGlow},{sc:3,sh:3});
for(let i=-6;i<=6;i++)for(let j=-6;j<=6;j++){const x=i*CS,z=cz+j*CS,r=Math.hypot(x,z-cz);if(r<1.5||r>2.3||z-CS/2<1.03)continue;const ang=Math.atan2(z-cz,x),spoke=Math.abs(Math.round(ang/(Math.PI/4))*(Math.PI/4)-ang)<.2;
const inner=r<1.85;box(LX+x-CS/2,RY0,z-CS/2,LX+x+CS/2,RY1,z+CS/2,inner?GL_:spoke?{a:T.labPanel,t:T.labPanel,b:T.labPanel}:MT_,{sc:1.5,sh:inner?3:undefined})}
for(const sx of[-1,1]){const px0=sx>0?2.35:-3.15;box(LX+px0,PY-.6,1.03,LX+px0+.8,PY+.6,cz+.7,MT_,{sc:2});box(LX+px0+.35,PY-.62,1.2,LX+px0+.45,PY+.62,cz+.5,GL_,{sc:2,sh:3})}
box(LX-.9,PY-.5,cz+2.3,LX+.9,PY+.5,cz+2.55,MT_,{sc:2});box(LX-.5,PY-.35,cz+2.55,LX+.5,PY+.35,cz+2.7,GL_,{sc:2,sh:3});
for(const[cx_,cy_]of[[-3.3,-1.4],[3.3,-1.4],[-3.3,3.7],[3.3,3.7]]){const x=LX+cx_,y=LY+cy_;box(x-.3,y-.3,1.03,x+.3,y+.3,3.7,MT_,{sc:2});for(const zz of[1.5,2.1,2.7,3.3])box(x-.34,y-.34,zz,x+.34,y+.34,zz+.14,GL_,{sc:2,sh:3});box(x-.2,y-.2,3.7,x+.2,y+.2,4.2,{a:T.labGlass,t:T.labGlass},{sc:2,sh:1.4});box(x-.08,y-.08,4.2,x+.08,y+.08,4.55,GL_,{sc:1,sh:3})}
box(LX-6.2,LY,.78,LX-4.8,LY+1.8,1.35,{a:T.labMetal,t:T.labMetal},{sc:2});box(LX-6.0,LY+.1,1.35,LX-5.0,LY+1.7,1.6,{a:T.labMetal,t:T.labGlow},{sc:2,sh:1.4});box(LX-5.9,LY+.2,1.6,LX-5.1,LY+.9,1.95,{t:T.labGlow,a:T.labMetal},{sc:2,sh:3});
for(let i=0;i<3;i++){const y=LY+.3+i*1.2,x=LX+5.1;box(x,y,.78,x+.8,y+.8,2.6,MT_,{sc:2});box(x-.03,y+.1,1.1,x+.83,y+.7,1.3,GL_,{sc:1.5,sh:3});box(x-.03,y+.1,1.8,x+.83,y+.7,2.0,GL_,{sc:1.5,sh:3})}
box(LX-4.8,LY+.7,.78,LX-4.3,LY+.9,.86,GL_,{sc:1,sh:3});box(LX+3.7,LY+.8,.78,LX+5.1,LY+1,.86,GL_,{sc:1,sh:3});}
for(let i=0;i<4;i++){const cx=lx0+3.5+i*4.6;box(cx,ly1-2.4,.78,cx+2.8,ly1-1.05,1.7,{a:T.labMetal,t:T.labGlow},{sc:2,sh:1.4})}}
/* ---- build the 3D map the engine uses ---- */
for(let k=0;k<BOXES.length;k++)emit(k);
const nB=B0.length-1,GS=2,gw=Math.ceil(WX/GS)+1,gh=Math.ceil(WY/GS)+1,BP=Float32Array.from(BPl),BB=Float32Array.from(BBb),B0a=Int32Array.from(B0);
const csB=new Int32Array(gw*gh+1),csT=new Int32Array(gw*gh+1),GT=.5,gtw=Math.ceil(WX/GT)+1,gth=Math.ceil(WY/GT)+1,csF=new Int32Array(gtw*gth+1);
const cr=(a,b,c,d)=>[Math.max(0,Math.floor(a/GS)),Math.min(gw-1,Math.floor(c/GS)),Math.max(0,Math.floor(b/GS)),Math.min(gh-1,Math.floor(d/GS))];
let gB;for(let pass=0;pass<2;pass++){const lst=pass?new Int32Array(csB[gw*gh]):null,pb=pass?csB.slice():null;
for(let b=0;b<nB;b++){const r=cr(BB[b*6],BB[b*6+1],BB[b*6+3],BB[b*6+4]);for(let cy=r[2];cy<=r[3];cy++)for(let cx=r[0];cx<=r[1];cx++){const ci=cy*gw+cx;if(pass)lst[pb[ci]++]=b;else csB[ci+1]++}}
if(!pass){for(let i=0;i<gw*gh;i++){csB[i+1]+=csB[i];csT[i+1]+=csT[i]}for(let i=0;i<gtw*gth;i++)csF[i+1]+=csF[i]}else gB=lst}
const FRe=[],FRs=[];for(let id=0;id<FCls.length;id++){let a=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(let t=FT0[id];t<FT0[id]+FTn[id];t++)for(let v=0;v<3;v++)for(let q=0;q<3;q++){const w=TPo[t*9+v*3+q];a[q]=Math.min(a[q],w);a[3+q]=Math.max(a[3+q],w)}FRe.push(id);FRs.push((a[0]+a[3])/2,(a[1]+a[4])/2,(a[2]+a[5])/2,Math.hypot(a[3]-a[0],a[4]-a[1],a[5]-a[2])/2)}
const LFo=new Int32Array(1),LBB=new Float32Array(0),LCl=new Int16Array(0),isWorld=new Uint8Array(0),NPa=new Int32Array(0),NC=new Int32Array(0),PLa=new Float32Array(0);
const sw={BCl:Uint8Array.from(BCl),C:64,UN:1/64,SC:1,wx:WX,wy:WY,wz0:ZB,GS,gw,gh,BP,B0:B0a,BB,gB,csB,CT:new Float32Array(0),gT:new Int32Array(0),csT,TB:new Float32Array(0),gF:new Int32Array(0),csF,GT,gtw,gth,WBP:new Float32Array(0),WB0:new Int32Array([0]),WBB:new Float32Array(0),nB,nWB:0,
EYE:54/64,HH:56/64,STEP:18/64,G:Gh,JV:270/64,VT:1800/64,PR:15/64,SPD:5,SS:66/64,FKS:.003,hz:0,hk:3,lim:1e9,stamp:0,stampB:new Int32Array(Math.max(1,nB)),stampT:new Int32Array(1),nx:0,ny:0,nz:1,
TPo:Float32Array.from(TPo),TUv:Float32Array.from(TUv),TFc:Int32Array.from(TFc),FCls:Uint8Array.from(FCls),FSh:Uint8Array.from(FSh),FNx:Float32Array.from(FNx),FT0:Int32Array.from(FT0),FTn:Int32Array.from(FTn),FFl:Uint8Array.from(FFl),
FMat:Uint16Array.from(FMt),mats:MT.map((_,i)=>'castle#'+i),MT,noTex:1,bfc:1,ftb:1,sky:1,
nTri,nFace:FCls.length,PRo:[],FRe:Int32Array.from(FRe),FRs:Float32Array.from(FRs),LFo,LFl:new Int32Array(0),LBB,LCl,nl:0,nClu:0,visOfs:null,visU:new Uint8Array(0),isWorld,NP:NPa,NC,PL:PLa,nn:0,OX:0,OY:0,head:0,fstamp:new Int32Array(FCls.length),visCache:new Map(),lastClu:-1,ox:0,oy:0,
so:null,f:null,fl:null,c:null,n:0,zmin:0,zmax:0,reach:null,mv:null};
sw.mv=bwMoversInit([],BBb);sw.trg=[];sw.rel={};sw.q3={pads:[],tele:[]};
const sp=[[CX,CY+4,.03,-Math.PI/2]];
const prev=SW;SW=sw;const ok=[];for(const c of sp)if(!bwHit(c[0],c[1],c[2],sw.PR,sw.HH))ok.push(c);
sw.n=Math.ceil(Math.max(WX,WY))+1;sw.rq={qu:[],seen:new Map(),qi:0,body:{x:0,y:0,z:0,vz:0,gr:1},done:false,last:0,dirty:true};
for(const q of[[CX,CY+4,.03],[CX,CY-HW-8,.03],[CX,CY+HW+8,.03],[LX,LY-12,.03],[LX,LY-4.6,.82]]){const k=bwReachKey(q[0],q[1],q[2]);if(!sw.rq.seen.has(k)){sw.rq.seen.set(k,sw.rq.qu.length);sw.rq.qu.push(q)}}
bwMoversPose(sw,true);bwReachRun(sw,1800);bwReachSpans(sw);bwMoversPose(sw,false);SW=prev;
return{name:'Siege',n:sw.n,C:64,S:{o:sw.so,f:sw.f,fl:sw.fl},sp:ok,ts:[ok,ok],flags:null,ctf:null,bomb:{s:[]},zmin:sw.zmin,zmax:sw.zmax,sw,castle:1,
cas:{CX,CY,HW,TW,WZ,LX,LY,door:{x:LX,y:LY-12},trees},info:{movers:0,spawns:ok.length,tris:nTri,brushes:nB,cells:sw.rq.qu.length,size:sw.n}}}
const casMap=()=>CASM||(CASM=casBuild());

/* ---------- running the floor: five siege waves, the walk to the lab, then the mecha bird ---------- */
const CAS_WAVES=[14,20,26,32,40],CAS_HUES=[0,28,52,130,200,285];
function startCastle(){const m=curMap(),c=m.cas;E=[];B=[];K=[];bossFl=true;PRP=[];CH=[];SH=[];DSP=[];TUR=[];RTU=[];MK=[];WELL=[];SMK=[];PTC=[];DEC=[];BOLT=[];ET=[];AP=[];ACM=null;acT=0;P.acIn=0;GN=[];P.fo=0;CZ.fill(1);CW.fill(0);CR=[];crT=0;
const s0=m.sp[0];P.x=s0[0];P.y=s0[1];P.z=s0[2];P.vz=0;P.gr=1;P.cz=P.z;P.pt=0;P.a=s0[3];P.jx=P.jy=0;ex={x:c.LX,y:c.LY,z:.8};open=false;
CAS={m,c,ph:'intro',t:0,wave:0,wt:0,gt:0,msg:'THE SIEGE BEGINS',msgT:4.5,q:[],bm:[],won:0,spr:{},fix:0};
try{if(!ORS.st)orsLoad()}catch(er){}cfInit();state='play';P.dv=0;P.inv=0;P.falling=0;EZ=P.cz+SW.EYE*(1-.3*(P.cr||0))}
function casMsg(t,s){CAS.msg=t;CAS.msgT=s||3.5}
/* one weak wave monster: a normal monster for this floor with 50% less health and damage and no modifiers */
function casSpawnOne(near){const C=CAS,c=C.c;for(let t=0;t<60;t++){let x,y;if(near){const a=Math.random()*6.2832,r=9+Math.random()*6;x=P.x+Math.cos(a)*r;y=P.y+Math.sin(a)*r}else{const a=Math.random()*6.2832,r=34+Math.random()*24;x=c.CX+Math.cos(a)*r;y=c.CY+Math.sin(a)*r*.95}
if(x<14||x>156||y<14||y>100)continue;if(Math.hypot(x-c.CX,y-c.CY)<26)continue;if(bwHit(x,y,.03,.4,SW.HH))continue;
const e=genEnemy(x,y,fl,1),arm=e.traits.includes('armored')?1.8:1,sw_=e.traits.includes('swift')?1.6:1;
e.traits=[];e.hp=e.mhp=Math.max(1,Math.round(e.hp/arm*.5));e.spd=e.spd/sw_;e.dmg*=.5;e.z=.03;e.aggro=1;e.cd=.4+Math.random()*1.2;e.cw=1;e.noReg=1;
const h=CAS_HUES[(Math.random()*CAS_HUES.length)|0];e.spr=C.spr[h]||(C.spr[h]=enemySpr2(h,[]));E.push(e);return e}return null}
function casStartWave(k){const C=CAS,n=CAS_WAVES[k-1];C.wave=k;C.ph='wave';C.wt=0;C.q=[];for(let i=0;i<n;i++)C.q.push(i/n*7+Math.random()*.8);
casMsg('WAVE '+k+' / 5',3);snd(160,.5,'sawtooth',.12,-60);if(k==1)bmStart()}
function casSpawnBoss(){const C=CAS,c=C.c;const e=mkMecha(c.LX+(Math.random()-.5)*10,c.LY+8,26);E.push(e);C.ph='boss';C.boss=e;casMsg('SOMETHING DESCENDS FROM THE SKY',4.5);
snd(50,1.6,'sawtooth',.2,-20);snd(260,.9,'square',.06,-200);try{bmBossHit()}catch(er){}}
function casStep(dt){const C=CAS;if(!C||state!='play')return;C.t+=dt;if(C.msgT>0)C.msgT-=dt;
for(const b of C.bm)casBombStep(b,dt);C.bm=C.bm.filter(b=>!b.dead);
/* the lab is sealed by a force field until the Warden is destroyed */
if(!C.won){const c=C.c,dn=Math.hypot(P.x-c.LX,P.y-c.LY);if(dn<40){const dz=2.3;if(Math.random()<dt*45){const x=c.LX+(Math.random()*2-1)*dz,z=Math.random()*3;ptcPush({x,y:c.LY-7.25,z:z,vx:0,vy:0,vz:(Math.random()-.5)*.5,life:.4,l0:.4,t:S.spark,s:.11,g:0},.78)}}
if(P.z<4.6&&P.y<c.LY+7.2&&((Math.abs(P.x-c.LX)<2.6&&P.y>c.LY-7.35)||(Math.abs(P.x-c.LX)<10.5&&P.y>c.LY-6.5))){P.y=c.LY-7.7;P.jy=Math.min(0,P.jy||0);if(!(C.sealT>0)){C.sealT=3;casMsg('THE LAB IS SEALED',2.2);snd(180,.3,'sawtooth',.1,-80)}}
if(C.sealT>0)C.sealT-=dt}
if(C.ph=='intro'){if(C.t>=4.5)casStartWave(1);return}
const alive=E.filter(e=>!e.dead&&e.cw).length;
if(C.ph=='wave'){C.wt+=dt;while(C.q.length&&C.q[0]<=C.wt){C.q.shift();casSpawnOne(false)}
if(!C.q.length&&!alive){if(C.wave<5){C.ph='gap';C.gt=6.5;P.hp=Math.min(P.mhp,P.hp+P.mhp*.08);casMsg('WAVE '+C.wave+' CLEARED',3.2);snd(520,.4,'triangle',.08,260)}else{C.ph='walk';casMsg('THE SIEGE IS BROKEN',3.5);C.hint=6;snd(520,.5,'triangle',.1,300)}}
/* anything still alive long after the wave began is dragged to the player so a wave can never stall */
else if(C.wt>75){C.fix-=dt;if(C.fix<=0){C.fix=8;const far=E.filter(e=>!e.dead&&e.cw&&Math.hypot(e.x-P.x,e.y-P.y)>22);for(const e of far.slice(0,4)){const q=casSpawnOne(true);if(q){e.dead=1;E=E.filter(z=>z!==e)}}}}}
else if(C.ph=='gap'){C.gt-=dt;if(C.gt<=0)casStartWave(C.wave+1)}
else if(C.ph=='walk'){if(C.hint>0){C.hint-=dt;if(C.hint<=0)casMsg('GO TO THE LAB TO THE NORTH',4)}if(Math.hypot(P.x-C.c.LX,P.y-C.c.LY)<30)casSpawnBoss()}
else if(C.ph=='boss'){if(!E.some(e=>e.mb&&!e.dead)){C.ph='won';C.won=1;open=false;ex={x:C.c.LX,y:C.c.LY+2.65,z:1.03};C.bm=[];casMsg('THE TELEPORTER IS ONLINE',4.5);snd(440,.6,'triangle',.1,400)}}
if(C.won&&!C.tele)casTele(dt)}
let CASGL=null;
/* the teleporter ring swirls with light once the Warden is down; stepping into it starts the trip */
function casTele(dt){const C=CAS,c=C.c,PY=c.LY+2.65,cz=2.53;if(!CASGL)CASGL=mk(g=>{const r=g.createRadialGradient(32,32,1,32,32,30);r.addColorStop(0,'#fff');r.addColorStop(.25,'#8ff');r.addColorStop(.6,'rgba(60,200,255,.4)');r.addColorStop(1,'rgba(0,120,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
if(Math.hypot(P.x-c.LX,P.y-c.LY)<16){const n=Math.random()<dt*90?1:0;for(let i=0;i<n;i++){const a=Math.random()*6.2832,r=Math.random()*1.45;ptcPush({x:c.LX+Math.cos(a)*r,y:PY+(Math.random()-.5)*.3,z:(cz+Math.sin(a)*r)/1.03,vx:-Math.sin(a)*1.2,vy:0,vz:Math.cos(a)*1.2,life:.5,l0:.5,t:CASGL,s:.28,g:0},0)}}
if(Math.hypot(P.x-c.LX,P.y-PY)<.85&&P.z>.85&&P.z<1.5&&!(P.deadT>0)){C.tele=1;if(typeof alcStart=='function')alcStart();else nextFloor()}}
function casHud(){const C=CAS;if(!C||state!='play')return;const c=ctx;c.save();c.textAlign='center';c.textBaseline='alphabetic';c.font='8px "DotGothic16",monospace';
if(C.ph=='wave'||C.ph=='gap'){const left=E.filter(e=>!e.dead&&e.cw).length+C.q.length;c.fillStyle='#fff';c.globalAlpha=.92;c.fillText(C.ph=='wave'?'WAVE '+C.wave+'/5    '+left+' left':'WAVE '+C.wave+'/5 cleared    next in '+Math.ceil(C.gt),LW/2,18)}
else if(C.ph=='walk'){const dx=C.c.LX-P.x,dy=C.c.LY-P.y,d=Math.hypot(dx,dy),cs=Math.cos(P.a),sn=Math.sin(P.a),a=Math.atan2(-dx*sn+dy*cs,dx*cs+dy*sn);c.fillStyle='#8cf';c.globalAlpha=.95;c.fillText('REACH THE LAB   '+Math.round(d)+' m',LW/2,18);c.translate(LW/2,32);c.rotate(a);c.fillStyle='#8cf';c.beginPath();c.moveTo(0,-6);c.lineTo(5,5);c.lineTo(0,2);c.lineTo(-5,5);c.closePath();c.fill()}
c.restore();if(C.msgT>0&&C.msg){c.save();c.textAlign='center';c.font='bold 13px "DotGothic16",monospace';const a=Math.min(1,C.msgT*1.2);c.globalAlpha=a;c.fillStyle='#000';c.fillText(C.msg,LW/2+1,61);c.fillStyle='#ffe9b0';c.fillText(C.msg,LW/2,60);c.restore()}}
function casList(L){const C=CAS;if(!C)return;for(const b of C.bm){L.push({x:b.x,y:b.y,t:S.orb,s:.62+.08*Math.sin(T*30),zb:b.z-.32,fb:1,al:1})}}
/* the bird's bombs fall under gravity, mark where they will land, and blow up on whatever they hit */
function casBomb(x,y,z,vx,vy,dmg){const t=Math.max(.3,(Math.sqrt(2*Math.max(1,z)/16)));CAS.bm.push({x,y,z,vx,vy,vz:0,dmg,lx:x+vx*t,ly:y+vy*t,tm:0})}
function casBombStep(b,dt){b.tm+=dt;b.vz-=16*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;if(Math.random()<dt*9)ptcPush({x:b.x,y:b.y,z:0,vx:0,vy:0,vz:0,life:.12,l0:.12,t:S.spark,s:.5,g:0},0);
if(Math.random()<dt*14)ptcPush({x:b.x,y:b.y,z:0,vx:(Math.random()-.5)*.6,vy:(Math.random()-.5)*.6,vz:.3,life:.35,l0:.35,t:S.spark,s:.16,g:0},b.z);
let fz=swNearFloor(b.x,b.y,b.z+.5);if(fz!==fz)fz=0;if(b.z<=fz+.15||!swOpen(b.x,b.y,b.z)){b.dead=1;const ez=Math.max(0,fz);boom(b.x,b.y,3.6,ez);snd(50,.7,'sawtooth',.24,-30);snd(150,.25,'square',.09,-90);
for(let i=0;i<22;i++){const a=Math.random()*6.2832,v=2+Math.random()*5;ptcPush({x:b.x,y:b.y,z:.2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:1.5+Math.random()*3,life:.9,l0:.9,t:S.spark,s:.22,g:9},ez)}
const d=Math.hypot(P.x-b.x,P.y-b.y);if(state=='play'&&d<3.6&&Math.abs(P.z+.5-ez)<2.6){hurt(b.dmg*(1-d/5));push(P,(P.x-b.x)/(d||1),(P.y-b.y)/(d||1),2.6)}}}

/* ---------- the mecha bird ---------- */
function mbFrames(s2){const sp={mb:1,s2:s2?1:0,pw:[],skin:null,tc:'',gun:'',hue:0,c:{},cap:900},fr=[];for(let ph=0;ph<4;ph++){let v=null;Object.defineProperty(fr,ph,{get:()=>v||(v=hmRender(sp,ph,0)),enumerable:true})}fr.spec=sp;return fr}
function mkMecha(x,y,z){const hp=Math.round(7*65*(1+.3*fl)*fScl(fl)),dm=17*(1+.15*fl)*fScl(fl);
return{x,y,z,hp,mhp:hp,spd:7,dmg:dm,sc:7,r:1.3,hr:2.1,traits:['flying'],name:'Skyfall Warden',spr:null,fr:mbFrames(0),fr2:mbFrames(1),cd:1.5,aggro:1,burn:0,slow:0,flash:0,tp:3,boss:1,mb:1,fly:1,mk:0,mt:0,oa:Math.random()*6.2832,od:Math.random()<.5?1:-1,bcd:3.2,scd:2,dcd:6,fa:0,wf:0,hc:0}}
function mbV(e){return(e.mk==1||e.mk==2)?1:e.bb>0?3:e.sh>0?2:0}
function mbGeo(sp,ph,v,H){const{F,Q,tube,ball}=H,S2=sp.s2,K=.78;
const SIL=S2?[206,196,198]:[214,220,232],SI2=S2?[168,154,160]:[168,177,194],DK=[50,56,70],DK2=[30,34,46],GL=S2?[255,120,50]:[64,232,255],GL2=S2?[255,196,90]:[170,250,255],GD=[232,178,62];
const pit=v==1?.78:v==3?-.08:v==2?-.05:0,cp=Math.cos(pit),sp_=Math.sin(pit);
const M=p=>{const dx=p[0]*K,dy=(p[1]-32)*K,dz=p[2]*K;return[dx,32+dy*cp-dz*sp_,dz*cp+dy*sp_]};
const em=fn=>{const n0=F.length;fn();for(let i=n0;i<F.length;i++)F[i].em=1};
const tb=(pts,rd,n,col,cap)=>tube(pts.map(M),rd.map(r=>[r[0]*K,r[1]*K]),n,col,null,cap||0),ba=(c,rx,ry,rz,n,m,col)=>ball(M(c),rx*K,ry*K,rz*K,n,m,col),qd=(vs,col,cen)=>Q(vs.map(M),col,M(cen),null,0);
/* hull: a long streamlined body, armour ridge, belly hatch, head with a visor and a gold beak */
tb([[0,32,-19],[0,32,-12],[0,32,-4],[0,32,5],[0,32,12],[0,32.4,17]],[[1.6,1.6],[4.4,4.6],[7,7.4],[7.4,7.4],[5.6,5.8],[3.2,3.4]],14,SIL,3);
tb([[0,34.6,-10],[0,35.6,-2],[0,35.2,8]],[[2.6,1.4],[3.4,1.8],[2.8,1.4]],8,DK,3);
tb([[0,24.8,-5],[0,24.4,0],[0,24.8,6]],[[3.4,1.6],[3.8,1.8],[3.2,1.6]],8,v==3?GL:DK2,3);if(v==3)em(()=>tb([[0,24,-4],[0,23.8,0],[0,24,5]],[[3,1.2],[3.4,1.4],[2.8,1.2]],8,[255,170,60],3));
tb([[0,34,12],[0,37.4,17],[0,38.6,22]],[[3.4,3.4],[3.2,3.4],[2.9,3]],10,SI2,3);ba([0,38.6,23.5],3.5,3.7,4.2,12,8,SIL);
qd([[-3.4,38.4,27.6],[3.4,38.4,27.6],[2.6,40.6,27],[-2.6,40.6,27]],DK2,[0,38,22]);em(()=>{qd([[-3,39,27.9],[3,39,27.9],[2.4,40.2,27.4],[-2.4,40.2,27.4]],GL,[0,38,22])});
for(const s of[-1,1])em(()=>ba([s*2.9,39.6,25.4],1,1,1.2,8,6,GL2));
tb([[0,37.6,27],[0,36.6,31],[0,35.4,35.6]],[[2.1,1.5],[1.5,1],[.2,.2]],8,GD,3);tb([[0,36.5,26.5],[0,35.4,29.6],[0,34.7,32]],[[1.4,.8],[1,.6],[.2,.2]],6,DK,3);
if(v==2)em(()=>ba([0,35.4,35.8],1.8,1.8,2.2,8,6,[255,255,255]));
for(let k=0;k<3;k++){const o=(k-1)*2.4;em(()=>qd([[o-.5,40.6,21],[o+.5,40.6,21],[o+.8,44+k%2*2,12+k*1.4],[o-.1,44+k%2*2,12+k*1.4]],GL,[0,38,22]))}
/* tail fan and thrusters */
for(let k=-3;k<=3;k++){const a=k*.2,L=15+(3-Math.abs(k))*1.8;qd([[k*.8-.7,32,-18],[k*.8+.7,32,-18],[k*.8+Math.sin(a)*L+1,31.4,-18-Math.cos(a)*L],[k*.8+Math.sin(a)*L-1,31.4,-18-Math.cos(a)*L]],k&1?SI2:SIL,[0,32,-6]);em(()=>qd([[k*.8-.2,32.1,-19],[k*.8+.2,32.1,-19],[k*.8+Math.sin(a)*L*.96+.3,31.6,-18-Math.cos(a)*L*.96],[k*.8+Math.sin(a)*L*.96-.3,31.6,-18-Math.cos(a)*L*.96]],GL,[0,32,-6]))}
for(const s of[-1,1]){tb([[s*3.8,29.4,-9],[s*3.9,29.4,-16],[s*3.9,29.4,-21]],[[2.7,2.7],[2.5,2.5],[2.2,2.2]],10,DK,3);em(()=>ba([s*3.9,29.4,-21.6],1.8,1.8,1.4,8,6,v==1?GL2:GL))}
/* talons */
for(const s of[-1,1]){const f=v==1?1:0;tb([[s*2.8,27,1],[s*3.4,22-f*1,3+f*6],[s*3.4,17.6-f*2,6+f*9]],[[1.6,1.6],[1.3,1.3],[.9,.9]],6,DK,3);for(const t of[-1,0,1])tb([[s*3.4+t*.9,17.8-f*2,6.4+f*9],[s*3.4+t*1.3,16-f*2.6,9.2+f*10.5]],[[.7,.7],[.1,.1]],4,GD,3)}
/* wings: arm, forearm, hand, then two ranks of long feathers with glowing edges */
const fl=v==1?-.3:[.62,.2,-.38,.2][ph],sw=v==1?.78:v==2?.12:.34,B1=.18+sw*.7,B2=.32+sw*.9,B3=.5+sw*1.1;
for(const s of[-1,1]){const dirv=(A,B)=>[s*Math.cos(A)*Math.cos(B),Math.sin(A),-Math.cos(A)*Math.sin(B)],add=(p,d,L)=>[p[0]+d[0]*L,p[1]+d[1]*L,p[2]+d[2]*L];
const S0=[s*5.4,34.4,4],d1=dirv(fl,B1),P1=add(S0,d1,10),d2=dirv(fl*.55-.12,B2),P2=add(P1,d2,12.5),d3=dirv(fl*.25-.3,B3),P3=add(P2,d3,9.5);
tb([S0,P1,P2,P3],[[3.8,3.2],[3.3,2.8],[2.5,2.2],[1.5,1.4]],10,SIL,3);ba(P1,3.2,3.2,3.2,8,6,DK);ba(P2,2.6,2.6,2.6,8,6,DK);
em(()=>{tb([add(S0,d1,1.5),P1,P2],[[.6,.6],[.55,.55],[.5,.5]],4,GL,0)});
const bones=[[S0,P1],[P1,P2],[P2,P3]];
for(let k=0;k<11;k++){const bi=k<4?0:k<8?1:2,t=(k<4?k/4:k<8?(k-4)/4:(k-8)/3),a=bones[bi][0],b=bones[bi][1],base=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const L=(10+k*1.25)*(k>7?1.1:1),dr=[s*(.28+.06*k/10)*Math.cos(fl*.8),Math.sin(fl*.5)*.26-.1-sw*.12,-1],dl=Math.hypot(dr[0],dr[1],dr[2]),tip=[base[0]+dr[0]/dl*L,base[1]+dr[1]/dl*L,base[2]+dr[2]/dl*L],w=2.6-k*.08;
const cen=[base[0],base[1]-6,base[2]-6];
qd([[base[0]-w*.5,base[1]+.1,base[2]],[base[0]+w*.5,base[1]+.1,base[2]],[tip[0]+w*.2,tip[1]+.1,tip[2]],[tip[0]-w*.2,tip[1]+.1,tip[2]]],k&1?SI2:SIL,[base[0],base[1]-4,base[2]-3]);
em(()=>qd([[base[0]+(s>0?-.4:-.1)*.3,base[1]+.15,base[2]-.3],[base[0]+w*.35,base[1]+.15,base[2]-.3],[tip[0]+w*.2*.6,tip[1]+.15,tip[2]+.5],[tip[0]-w*.2*.6,tip[1]+.15,tip[2]+.5]],GL,[base[0],base[1]-4,base[2]-3]))}}
return F}

/* ---------- the mecha bird's brain: circle above the player dropping bombs and firing bolt fans, and every ~6 s dive down for a low strafing run ---------- */
function mbBolts(e,n,sp,dm,spread){const a0=Math.atan2(P.y-e.y,P.x-e.x),z0=e.z+e.sc*.35,tz=P.z+SW.HH*.55,dd=Math.hypot(P.x-e.x,P.y-e.y)||1;
for(let j=0;j<n;j++){const a=a0+(j-(n-1)/2)*spread,vz=(tz-z0)*sp/dd+(Math.random()-.5)*.6;B.push({x:e.x+Math.cos(a)*1.2,y:e.y+Math.sin(a)*1.2,z:z0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,vz,dmg:dm,life:2.6,src:e})}
snd(520,.22,'square',.07,-300,e);snd(210,.3,'sawtooth',.05,-120,e)}
function mbAI(e,dt,ts,d,ux,uy,los,SCF){const dd=dt*ts,C=CAS;if(state!='play'||!C)return;const s2=!!e.s2,tzp=P.z,WX=C.m.sw.wx,WY=C.m.sw.wy;
if(!s2&&e.hp<e.mhp*.5){e.s2=1;e.fr=e.fr2;snd(70,1.2,'sawtooth',.22,-30,e);snd(300,.8,'square',.07,-220,e);casMsg('THE WARDEN OVERCLOCKS',3.5);try{bmPhaseC()}catch(er){}}
if(e.slow>0||e.snz>0)ts*=.6;
e.wf+=dd*(e.mk==2?3:e.mk==1?10:7);e.af=(e.wf|0)&3;if(e.bb>0)e.bb-=dd;if(e.sh>0)e.sh-=dd;e.mt+=dd;
const toP=Math.atan2(P.y-e.y,P.x-e.x);
if(e.mk==0){
/* hover: orbit the player at height, always looking at them */
e.oa+=e.od*dd*(s2?.5:.36);if(Math.random()<dd*.08)e.od=-e.od;const R=(s2?10:12.5)+Math.sin(T*.7)*2.2,tx=P.x+Math.cos(e.oa)*R,ty=P.y+Math.sin(e.oa)*R,dx=tx-e.x,dy=ty-e.y,dl=Math.hypot(dx,dy)||1,sp=Math.min(dl*1.6,s2?11:9);
e.x+=dx/dl*sp*dd;e.y+=dy/dl*sp*dd;const tz=tzp+8.2+Math.sin(T*1.3)*1.2;e.z+=(tz-e.z)*Math.min(1,dd*2.2);e.fa=toP;
e.bcd-=dd;e.scd-=dd;e.dcd-=dd;
if(e.bcd<=0&&e.z>tzp+4){e.bcd=s2?1.8:2.7;e.bb=.5;const n=s2?2:1,fall=Math.sqrt(2*Math.max(1,e.z)/16)+.1;for(let i=0;i<n;i++){const lead=i?(Math.random()-.5)*7:.35,px=P.x+(P.jx||0)*lead*fall,py=P.y+(P.jy||0)*lead*fall,sx=i?(Math.random()-.5)*5:0,sy=i?(Math.random()-.5)*5:0;casBomb(e.x,e.y,e.z-1,(px+sx-e.x)/fall,(py+sy-e.y)/fall,e.dmg*1.05)}snd(380,.35,'triangle',.08,-260,e)}
if(e.scd<=0&&los!==false&&d<46){e.scd=s2?1.15:1.6;e.sh=.45;mbBolts(e,s2?7:5,9.5,e.dmg*.42,.17)}
if(e.dcd<=0){e.mk=1;e.mt=0;e.dcd=s2?5.4:6.2;e.bb=0;snd(90,.9,'sawtooth',.16,200,e);snd(700,.5,'square',.05,-500,e)}}
else if(e.mk==1){
/* dive in */
const dx=P.x-e.x,dy=P.y-e.y,dl=Math.hypot(dx,dy)||1,sp=Math.min(16,dl*2.2+6);e.fa=toP;e.da=toP;e.x+=dx/dl*sp*dd;e.y+=dy/dl*sp*dd;const tz=tzp+.25;e.z+=(tz-e.z)*Math.min(1,dd*4.2);
if(e.mt>=.95||dl<5){e.mk=2;e.mt=0;e.ch=0}}
else if(e.mk==2){
/* low strafing run: straight along the dive line, hitting anything it passes through */
const sp=s2?15:12.5,c=Math.cos(e.da),s=Math.sin(e.da);e.x+=c*sp*dd;e.y+=s*sp*dd;e.fa=e.da;e.z+=(tzp+.2-e.z)*Math.min(1,dd*5);e.ch-=dd;
if(Math.random()<dd*30)ptcPush({x:e.x,y:e.y,z:.2,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,vz:.8,life:.5,l0:.5,t:S.spark,s:.3,g:0},e.z);
const dp=Math.hypot(P.x-e.x,P.y-e.y);if(e.ch<=0&&dp<2.2&&Math.abs(P.z-e.z)<2){e.ch=.9;hurt(e.dmg*1.1);push(P,-s*0+(P.x-e.x)/(dp||1),(P.y-e.y)/(dp||1),3.2);snd(120,.4,'sawtooth',.2,-60,e)}
if(e.mt>=(s2?2.4:2.9)||e.x<10||e.y<10||e.x>WX-10||e.y>WY-10){e.mk=3;e.mt=0}}
else{
/* climb back up and turn around */
e.z+=(tzp+8.5-e.z)*Math.min(1,dd*2.6);e.x+=Math.cos(e.da)*5*dd;e.y+=Math.sin(e.da)*5*dd;e.fa=toP;if(e.mt>=1.1){e.mk=0;e.mt=0;e.oa=Math.atan2(e.y-P.y,e.x-P.x);e.bcd=Math.max(e.bcd,1);e.scd=Math.max(e.scd,.8)}}
e.x=Math.max(8,Math.min(WX-8,e.x));e.y=Math.max(8,Math.min(WY-8,e.y))}

/* ---------- the siege theme: a real-instrument orchestral battle march in C minor (BM.th 3), 16 bars, ~150 bpm ---------- */
const CAS_CH={Cm:{p:[48,55,60,63,67],r:36},Ab:{p:[44,51,56,60,63],r:32},Eb:{p:[51,58,63,67,70],r:39},Bb:{p:[46,53,58,62,65],r:34},Fm:{p:[41,48,53,56,60],r:29},G:{p:[43,50,55,59,62],r:31}};
const CAS_BR=['Cm','Cm','Ab','Ab','Eb','Bb','Fm','G','Cm','Ab','Eb','Bb','Fm','Ab','G','G'];
const CAS_ML=[
[[0,67,6],[8,72,4],[12,70,2],[14,67,2]],[[0,63,6],[8,67,6],[14,70,2]],[[0,68,6],[8,72,4],[12,75,4]],[[0,74,6],[8,72,4],[12,68,2],[14,67,2]],
[[0,70,4],[4,67,2],[6,70,2],[8,75,6],[14,74,2]],[[0,74,4],[4,70,2],[6,74,2],[8,77,6],[14,75,2]],[[0,77,4],[4,75,2],[6,72,2],[8,75,4],[12,72,4]],[[0,74,4],[4,71,4],[8,74,2],[10,77,2],[12,79,4]],
[[0,79,6],[6,75,2],[8,72,4],[12,75,4]],[[0,80,6],[6,77,2],[8,72,4],[12,75,4]],[[0,82,4],[4,79,2],[6,75,2],[8,79,4],[12,82,4]],[[0,84,6],[6,82,2],[8,77,4],[12,74,4]],
[[0,80,4],[4,77,2],[6,80,2],[8,84,6],[14,82,2]],[[0,80,4],[4,79,2],[6,77,2],[8,75,4],[12,72,4]],[[0,74,2],[2,77,2],[4,79,4],[8,83,4],[12,79,2],[14,74,2]],[[0,86,8],[8,83,4],[12,79,2],[14,74,2]]];
function bmStepC(s,t){const bar=s>>4,b=s&15,c=CAS_CH[CAS_BR[bar]],D=BM.dt,q=D*4,p2=BM.p2,bs=BM.bs,mid=bar>=4,hi=bar>=8,ev=!(bar&1),tm=c.r<38?c.r+12:c.r,ev8=!(b&1);
const tim=v=>{ors('timpani',tm,t,.08,v,{a:.001,r:1.1});if(v>.5)ors('timpani',tm-12,t,.08,v*.6,{a:.001,r:1.3})};
/* the bed: sustained strings and double bass, with a deep choir under the big sections */
if(b==0){c.p.slice(1).forEach((m,i)=>ors('string_ensemble_1',m,t,q*4.05,.5+(mid?.1:0)+(hi?.1:0)+(bs?.08:0),{a:.45,r:.7,p:i*.3-.45}));ors('contrabass',c.r,t,q*4,.85,{a:.08,r:.5});ors('cello',c.r+12,t,q*4,.5,{a:.1,r:.5,p:.2})}
/* driving ostinato: cellos and basses chug eighths, violins race sixteenths when it gets serious */
if(mid&&ev8){const m=c.p[[0,2,1,2,0,2,3,2][(b>>1)&7]];ors('cello',m,t,D*1.5,.62+(hi?.1:0),{a:.008,r:.08,p:.25});if(ev8&&(b&3)==0)ors('contrabass',c.r,t,D*1.6,.7,{a:.01,r:.1})}
if((hi||p2||bs)&&mid){const m=c.p[[2,3,4,3][(b>>0)&3]]+12;if(!(b&1)||p2)ors('violin',m,t,D*.8,.26+(p2?.06:0),{a:.006,r:.07,p:-.35})}
/* harp arpeggios, tubular bells on the downbeats of phrases */
if(ev8){const m=c.p[[1,2,3,4,3,2,1,0][(b>>1)&7]]+12;ors('orchestral_harp',m,t,D*.5,hi?.6:.5,{a:.002,r:.9,p:-.35})}
if(b==0&&!(bar&3))ors('tubular_bells',c.p[4]+12,t,.1,hi?.25:.32,{a:.002,r:1.7,p:.2});
/* brass punches: horns and trombones on the offbeats, low stabs */
if(mid&&(b==0||b==3||b==6||b==10||b==12)){const v=b==0?.9:.6;ors('trombone',c.r+12,t,D*(b==0?3:1.6),v*(hi?.9:.65),{a:.02,r:.2,p:.15});ors('french_horn',c.p[1]+(c.r<30?12:0),t,D*(b==0?3:1.6),v*.7,{a:.02,r:.25,p:.3})}
if((hi||bs)&&b==0&&ev)for(const m of c.p.slice(1,4))ors('french_horn',m,t,q*7.6,.5,{a:.3,r:.6,p:.35});
if(b==0&&ev&&mid){for(const m of[c.p[2],c.p[3],c.p[4]])ors('choir_aahs',m,t,q*7.8,hi?.6:.4,{a:.6,r:.8});if(hi||bs)ors('choir_aahs',c.p[2]+12,t,q*7.8,.34,{a:.6,r:.8})}
/* timpani: the war drum; rolls into the last bars of each section */
const roll=bar==3||bar==7||bar==15;
if(roll){if(b>=8)tim(.25+(b-8)*.075);else{if(b==0)tim(.95);if(b==4)tim(.6)}}
else if(!mid){if(b==0)tim(.8);if(b==6||b==10)tim(.5);if(b==12)tim(.55)}
else{if(b==0)tim(1);if(b==3||b==10)tim(.55);if(b==6)tim(.5);if(b==8)tim(.7);if(hi||bs){if(b==14)tim(.55);if(b==12)tim(.6)}}
if(b==0&&!(bar&3))bmCr(t,bar==8||bar==0?.1:.06);
if(b==0&&bar==8)bmCr(t,.14);
if(b==12&&roll)bmSw(t,q,.06);
/* the tune: horns call (1st phrase), violins + horns carry it (2nd), trumpets, horns, violins and choir soar (3rd) */
const mm=CAS_ML[bar];for(const[sb,m,len]of mm)if(sb==b){const dd=len*D*.97;
if(bar<4){ors('french_horn',m,t,dd,.88,{a:.1,r:.4,p:.25});ors('french_horn',m-12,t,dd,.55,{a:.12,r:.4,p:.3});if(bs)ors('trumpet',m,t,dd,.4,{a:.06,r:.3,p:.1})}
else if(bar<8){ors('violin',m,t,dd,.78,{a:.06,r:.3,p:-.3});ors('french_horn',m,t,dd,.55,{a:.08,r:.3,p:.3});ors('cello',m-12,t,dd,.55,{a:.07,r:.3,p:.3});if(bs)ors('trumpet',m,t,dd,.45,{a:.05,r:.3,p:.1})}
else{ors('trumpet',m,t,dd,.7,{a:.04,r:.28,p:.1});ors('french_horn',m-12,t,dd,.85,{a:.05,r:.3,p:.35});ors('violin',m,t,dd,.62,{a:.05,r:.3,p:-.35});ors('trombone',m-24,t,dd,.55,{a:.06,r:.3});ors('choir_aahs',m,t,dd,.38,{a:.25,r:.5})}}}
/* boss arrives: a huge hit; phase 2: faster, with a roll and crash */
function bmBossHit(){if(!BM.on||BM.th!=3)return;BM.bs=1;BM.dt=60/158/4;if(ORS.st!=2)return;const t=AC.currentTime+.05;bmCr(t,.3);bmSw(t,.8,.1);ors('timpani',36,t,.1,1,{a:.001,r:1.5});ors('timpani',24,t,.1,.9,{a:.001,r:1.7});
for(const m of[36,48,55,60,63,67])ors('trombone',m,t,1.1,.8,{a:.03,r:.5});for(const m of[55,60,63,67,72])ors('french_horn',m,t,1.1,.7,{a:.03,r:.5});ors('tubular_bells',72,t,.1,.4,{a:.002,r:2.2});ors('choir_aahs',60,t,1.8,.5,{a:.2,r:.8});ors('choir_aahs',67,t,1.8,.5,{a:.2,r:.8});BM.st=(BM.st&~15)}
function bmPhaseC(){if(!BM.on||BM.th!=3)return;BM.p2=1;BM.bs=1;BM.dt=60/170/4;if(ORS.st!=2)return;const t=AC.currentTime+.05;bmCr(t,.34);bmSw(t,.6,.12);for(let i=0;i<8;i++)ors('timpani',i&1?31:36,t+i*.075,.1,.5+i*.07,{a:.001,r:1.1});
for(const m of[36,43,48,51,55])ors('trombone',m,t+.3,1.2,.8,{a:.03,r:.5});for(const m of[55,60,63,67,72])ors('french_horn',m,t+.3,1.2,.7,{a:.03,r:.5});ors('trumpet',79,t+.3,1.2,.6,{a:.03,r:.4});ors('choir_aahs',63,t+.3,2,.55,{a:.2,r:.8});ors('choir_aahs',72,t+.3,2,.5,{a:.2,r:.8})}

/* ===== The alien world: floors 26+ (and the cutscene that takes you there) =====
   Same level themes as before, but grown out of pearl stone and living crystal: violet-teal textures with glowing veins,
   a floating-spire skyline, alien props, hover-pods instead of cars, and no humans. */
const alienOn=()=>fl>25&&!DM&&!BN.on&&!MAPT&&!SHOPF&&!isCm()&&!(typeof CASF!='undefined'&&CASF)&&!(typeof SPCF!='undefined'&&SPCF)&&!(typeof TH!='undefined'&&TH&&(TH.shop||TH.hide));
let ALNSKY=null,ALNSKY0=null,ALNAMB=null;
const aln_px=(r,g,b)=>(255<<24|(b>255?255:b<0?0:b|0)<<16|(g>255?255:g<0?0:g|0)<<8|(r>255?255:r<0?0:r|0))>>>0;
/* recolour a texture: shadows go indigo, mid-tones teal-violet, highlights pearl, then panel seams and a few glowing veins */
function alnRecolor(a,k,floor){const n=Math.round(Math.sqrt(a.length)),o=new Uint32Array(a.length);let s=(fl*2713+k*7919+11)>>>0;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
let lo=255,hi=0;for(let i=0;i<a.length;i+=3){const v=a[i];if((v>>>24)<255)continue;const l=(v&255)*.3+(v>>8&255)*.59+(v>>16&255)*.11;if(l<lo)lo=l;if(l>hi)hi=l}if(hi-lo<30){lo=Math.max(0,lo-20);hi=lo+60}
const MD=[[120,84,215],[60,185,205],[96,128,235]][k%3],DKc=floor?[14,10,38]:[26,18,62],PE=floor?[170,170,225]:[240,238,255];
for(let i=0;i<a.length;i++){const v=a[i];if((v>>>24)<255){o[i]=v;continue}const r=v&255,g=(v>>8)&255,b=(v>>16)&255,lum=r*.3+g*.59+b*.11;
if(g>140&&g>r*1.5&&g>b*1.3){o[i]=v;continue}
if(!floor&&r>190&&g>130&&b<150&&r-b>70){o[i]=aln_px(130,255,235);continue}
const l=Math.min(1,Math.max(0,(lum-lo)/(hi-lo)));let R_,G_,B_;if(l<.55){const q=l/.55;R_=DKc[0]+(MD[0]-DKc[0])*q;G_=DKc[1]+(MD[1]-DKc[1])*q;B_=DKc[2]+(MD[2]-DKc[2])*q}else{const q=(l-.55)/.45;R_=MD[0]+(PE[0]-MD[0])*q;G_=MD[1]+(PE[1]-MD[1])*q;B_=MD[2]+(PE[2]-MD[2])*q}
o[i]=aln_px(R_,G_,B_)}
const px=(x,y,r,g,b,m)=>{x|=0;y|=0;if(x<0||y<0||x>=n||y>=n)return;const i=y*n+x,v=o[i];if((v>>>24)<255)return;const R_=v&255,G_=(v>>8)&255,B_=(v>>16)&255;o[i]=aln_px(R_+(r-R_)*m,G_+(g-G_)*m,B_+(b-B_)*m)};
const cell=Math.max(8,n>>2);for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(x%cell==0||y%cell==0)px(x,y,12,8,34,.55);else if(x%cell==1||y%cell==1)px(x,y,235,235,255,.16)}
const col=k%3==0?[90,255,225]:k%3==1?[200,120,255]:[110,200,255];
for(let c=0,N_=1+(rnd()*2|0);c<N_;c++){let x=rnd()*n,y=rnd()*n,an=rnd()*6.283;for(let q=0,L=n*(.5+rnd()*.5);q<L;q++){px(x,y,col[0],col[1],col[2],.95);px(x+1,y,col[0],col[1],col[2],.35);px(x-1,y,col[0],col[1],col[2],.35);px(x,y+1,col[0],col[1],col[2],.35);x+=Math.cos(an);y+=Math.sin(an);an+=(rnd()-.5)*.55;if(x<0)x+=n;if(y<0)y+=n;if(x>=n)x-=n;if(y>=n)y-=n}}
return o}
let ROOFH=0,BLD=null,ROOFS=[],RFM=0;
/* real 3D spires: a pearl cone of stacked, narrowing tiers on each building, a ring of light floating round it and a glowing crystal tip */
function alnRoofMesh(w,d,k){const PE=[255,250,255],VI=[150,118,225],TE=[110,255,230],MG=[255,130,225],BL=[130,200,255],tip=[TE,MG,BL][k%3],s=Math.min(w,d),R=Math.min(w,d)*.5+.05,H=1.6+.75*Math.max(w,d)+(k%3)*.35,f=[];
f.push(...vmBox(0,.05,0,w+.12,.3,d+.12,VI),...vmBox(0,.19,0,w+.14,.04,d+.14,tip,{e:1}));
f.push(...vmCyl(0,.24,0,R*.94,H*.34,PE,{ax:'y',n:12,r2:R*.55}),...vmCyl(0,.24+H*.34,0,R*.55,H*.3,PE,{ax:'y',n:12,r2:R*.27}),...vmCyl(0,.24+H*.64,0,R*.27,H*.3,PE,{ax:'y',n:12,r2:R*.06}));
for(const y of[.34,.64])f.push(...vmCyl(0,.24+H*y,0,R*(y<.5?.56:.28),.06,[190,160,255],{ax:"y",n:12,e:1}));
const ry=.24+H*.5,rr=R*.62;for(let i=0;i<14;i++){const a=i/14*6.2832;f.push(...vmBox(Math.cos(a)*rr,ry,Math.sin(a)*rr,.3*R,.07,.07,tip,{ry:-a+1.5708,e:1}))}
f.push(...vmCyl(0,.24+H*.94,0,R*.1,.3,tip,{ax:'y',n:4,r2:0,e:1}),...vmCyl(0,.24+H*.94-.12,0,R*.1,.12,tip,{ax:'y',n:4,r2:R*.1,e:1}));return f}
function alnRoofs(){ROOFS=[];if(!BLD)return;const seen=new Map(),M=new Map();for(let i=0;i<N*N;i++){const id=BLD.bid[i];if(!id||!g[i]||seen.has(id))continue;seen.set(id,1);const b=BLD.bs[id-1],w=b.xb-b.xa+1,d=b.yb-b.ya+1,key=w+'x'+d+'/'+(id%3);let m=M.get(key);if(!m){m=alnRoofMesh(w,d,id);M.set(key,m)}ROOFS.push({x:(b.xa+b.xb+1)/2,y:(b.ya+b.yb+1)/2,mesh:m})}}
function drawRoof(r,dX,dY,plX,plY,inv,hH,Z){const dx=r.x-P.x,dy=r.y-P.y,ty=inv*(-plY*dx+plX*dy);if(ty<-3||ty>44)return;const tx=inv*(dY*dx-dX*dy);if(Math.abs(tx)>ty*1.6+5)return;RFM=1;try{drawMesh(r.mesh,r.x,r.y,WHT,1,0,null,0,dX,dY,plX,plY,inv,hH,Z)}finally{RFM=0}}
/* one big pointed roof per building: a tall gable over each face, peaking at the middle of the building's whole frontage */
function roofSpan(ci,side){const id=BLD&&BLD.bid[ci];if(!id)return null;const b=BLD.bs[id-1];return side?[b.xa,b.xb+1]:[b.ya,b.yb+1]}
function roofH(a,b,c){const L=b-a;return(.7*L+.4)*Math.max(0,1-Math.abs(2*(c-a)/L-1))}
function roofAt(ci,side,c){const s=roofSpan(ci,side);return s?roofH(s[0],s[1],c):0}
function alnTex(city){const mp=new Map(),d=(a,fl_)=>{if(!(a instanceof Uint32Array))return a;let r=mp.get(a);if(!r){r=alnRecolor(a,mp.size,fl_);mp.set(a,r)}return r};
if(city){TX=CB.map(c=>alnFacade(c.n,HP[c.h],c.open));TU=CB.map(c=>alnUpper(HP[c.h]))}else{TX=TX.map(a=>d(a));TU=TU.map(a=>d(a))}RT=d(RT);if(RTS)for(const k in RTS)RTS[k]=d(RTS[k]);FT=d(FT,1);BT=d(BT);CT=(Array.isArray(CT)?CT:[]).map(a=>d(a,1))}
/* gibberish alien script: every building gets a plaque of made-up glyphs, so only the green door sign tells you which one you can enter */
function alnGlyphs(g,x,y,w,h,seed,col){let q=seed>>>0||1;const rn=()=>{q=(Math.imul(q,1664525)+1013904223)>>>0;return q/4294967296};const n=Math.max(3,Math.min(6,(w/7)|0)),cw=w/n;g.strokeStyle=col;g.fillStyle=col;g.lineWidth=1;
for(let i=0;i<n;i++){const cx=x+i*cw+cw/2,cy=y+h/2,r=Math.min(cw*.38,h*.4),k=3+(rn()*3|0);g.beginPath();for(let j=0;j<k;j++){const t=rn();if(t<.3){g.moveTo(cx+(rn()-.5)*2*r,cy-r);g.lineTo(cx+(rn()-.5)*2*r,cy+r)}else if(t<.55){g.moveTo(cx-r,cy+(rn()-.5)*2*r);g.lineTo(cx+r,cy+(rn()-.5)*2*r)}else if(t<.8){g.moveTo(cx+r*(rn()-.2),cy);g.arc(cx,cy+(rn()-.5)*r,r*(.4+rn()*.5),rn()*6,rn()*6+2.4)}else{g.moveTo(cx+(rn()-.5)*r,cy+(rn()-.5)*r);g.lineTo(cx+(rn()-.5)*2*r,cy+(rn()-.5)*2*r)}}g.stroke();if(rn()<.5){g.fillRect(cx+(rn()-.5)*r*1.6,cy-r-1.5,1.4,1.4)}}}
const ALN_TINT=[[236,226,250],[222,240,248],[240,230,244],[226,236,252],[232,244,240],[244,236,250],[226,230,248],[236,242,250]];
function alnFacade(name,hue,opn){const tint=ALN_TINT[Math.abs(hue|0)%8],seed=name?[...name].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7):0;return mkT(g=>{const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,`rgb(${tint[0]},${tint[1]},${tint[2]})`);gr.addColorStop(1,`rgb(${tint[0]*.55|0},${tint[1]*.5|0},${tint[2]*.7|0})`);g.fillStyle=gr;g.fillRect(0,0,64,64);
g.fillStyle='rgba(60,40,120,.18)';for(let x=0;x<64;x+=16)g.fillRect(x,0,1,64);g.fillStyle='rgba(120,255,230,.55)';g.fillRect(0,1,64,1);g.fillRect(0,62,64,1);
if(name){g.fillStyle='rgba(30,20,70,.85)';g.fillRect(8,5,48,15);g.strokeStyle='rgba(130,255,235,.9)';g.lineWidth=1;g.strokeRect(8.5,5.5,47,14);alnGlyphs(g,11,7,42,11,seed,'#aaffee')}
g.fillStyle='#120c2c';g.beginPath();g.moveTo(14,64);g.lineTo(14,38);g.quadraticCurveTo(14,26,32,22);g.quadraticCurveTo(50,26,50,38);g.lineTo(50,64);g.fill();g.strokeStyle='rgba(150,255,235,.9)';g.lineWidth=1.3;g.stroke();
g.fillStyle='rgba(150,120,255,.25)';g.fillRect(20,40,24,24);
if((name=='BOOKS'||opn)&&!NET&&!DM){g.fillStyle='#16c455';g.fillRect(26,38,12,10);g.strokeStyle='#d8ffe4';g.lineWidth=.8;g.strokeRect(26.4,38.4,11.2,9.2);alnGlyphs(g,27.5,40,9,6,seed+99,'#eafff0')}})}
function alnUpper(hue){const tint=ALN_TINT[Math.abs(hue|0)%8];return mkT(g=>{const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,`rgb(${tint[0]*.8|0},${tint[1]*.8|0},${tint[2]*.9|0})`);gr.addColorStop(1,`rgb(${tint[0]*.95|0},${tint[1]*.95|0},${tint[2]})`);g.fillStyle=gr;g.fillRect(0,0,64,64);g.fillStyle='rgba(60,40,120,.2)';for(let x=0;x<64;x+=16)g.fillRect(x,0,1,64);g.fillStyle='rgba(120,255,230,.35)';g.fillRect(31,0,2,64);for(let y=10;y<64;y+=18){g.fillStyle='rgba(120,255,230,.5)';g.fillRect(0,y,64,1)}})}
/* the far skyline: floating spires of pearl with cyan windows */
function alnSky(on){if(on){if(!ALNSKY0)ALNSKY0=SKYT||mkTowers();if(!ALNSKY){const S=ALNSKY0;ALNSKY=new Uint32Array(S.length);for(let i=0;i<S.length;i++){const v=S[i];if((v>>>24)<128){ALNSKY[i]=v;continue}const r=v&255,g=(v>>8)&255,b=(v>>16)&255,l=r*.3+g*.59+b*.11;
ALNSKY[i]=aln_px(26+Math.min(l,110)*.3,18+Math.min(l,110)*.25,60+Math.min(l,110)*.45)}}SKYT=ALNSKY}else if(ALNSKY0&&SKYT===ALNSKY)SKYT=ALNSKY0}
/* ceiling and floor gradients (called right after the normal ones are built) */
const alnGradOk=()=>alienOn()||(fl>25&&!DM&&typeof TH!='undefined'&&TH&&TH.shop);
function alnGrad(){if(!alnGradOk())return;for(let y=0;y<H/2;y++){const t=y/(H/2),k=t*t,r=26+60*k|0,g=14+50*k|0,b=64+90*k|0;CL[y]=(255<<24|b<<16|g<<8|r)>>>0;const d=Math.max(.14,(H/2-y)/(H/2));FL[H-1-y]=sh(hsl(262,.3,.14),256*d)}}
/* drifting light motes and a faint aurora tint over the whole view */
function alnFx(){const t=T;ctx.save();for(let i=0;i<12;i++){const a=(i*0.6180339)%1,b=(i*0.3819660+i*i*.013)%1,x=(a*LW+Math.sin(t*.4+i)*9)%LW,y=((b*LH-t*(3+(i%5)*1.5))%LH+LH)%LH,m=i%3,c=m==0?'110,255,230':m==1?'210,140,255':'140,200,255';ctx.fillStyle=`rgba(${c},${.1+.12*Math.sin(t*2+i*3)**2})`;ctx.fillRect(x,y,1,1)}
const g=ctx.createRadialGradient(LW/2,LH/2,LH*.45,LW/2,LH/2,LH*1.1);g.addColorStop(0,'rgba(60,0,120,0)');g.addColorStop(1,'rgba(40,10,90,.1)');ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);ctx.restore()}
/* ---- alien props: they replace the usual crates, barrels, pillars... slot for slot, so sizes and collision stay the same ---- */
function alnProps(){const PE=[238,238,252],PS_=[170,160,210],IN=[40,28,78],VI=[120,70,200],TE=[90,255,225],MG=[255,110,220],BL=[120,200,255],M={};
/* 0: seed pod */
{const f=[];f.push(...vmCyl(0,0,0,.2,.08,IN,{ax:'y',n:8,r2:.26}),...vmCyl(0,.08,0,.26,.2,PE,{ax:'y',n:8,r2:.34}),...vmCyl(0,.28,0,.34,.14,PE,{ax:'y',n:8,r2:.2}),...vmCyl(0,.42,0,.2,.12,PS_,{ax:'y',n:8,r2:.05}),...vmCyl(0,.27,0,.345,.025,TE,{ax:'y',n:8,e:1}),...vmCyl(0,.08,0,.265,.02,TE,{ax:'y',n:8,e:1}));M[0]=f}
/* 1: spore jar */
{const f=[];f.push(...vmCyl(0,0,0,.2,.1,IN,{ax:'y',n:10,r2:.28}),...vmCyl(0,.1,0,.28,.3,VI,{ax:'y',n:10,r2:.34}),...vmCyl(0,.4,0,.34,.14,VI,{ax:'y',n:10,r2:.2}),...vmCyl(0,.54,0,.2,.06,PE,{ax:'y',n:10,r2:.14}),...vmCyl(0,.34,0,.345,.03,MG,{ax:'y',n:10,e:1}),...vmCyl(0,.6,0,.1,.08,BL,{ax:'y',n:6,r2:.02,e:1}));M[1]=f}
/* 2: crystal spire */
{const f=[];f.push(...vmCyl(0,0,0,.34,.1,PS_,{ax:'y',n:6,r2:.3}),...vmCyl(0,.1,0,.2,.62,PE,{ax:'y',n:6,r2:.14}),...vmCyl(0,.72,0,.14,.3,TE,{ax:'y',n:6,r2:.0,e:1}));for(const y of[.3,.52]){f.push(...vmCyl(0,y,0,.3,.025,TE,{ax:'y',n:12,e:1}))}M[2]=f}
/* 3: floating slab on a glow disc */
{const f=[];f.push(...vmCyl(0,.02,0,.34,.02,TE,{ax:'y',n:12,e:1}),...vmBox(0,.5,0,.92,.05,.6,PE),...vmBox(0,.46,0,.82,.035,.5,VI),...vmBox(0,.545,0,.7,.012,.4,TE,{e:1}),...vmBox(.1,.58,0,.1,.1,.08,MG,{e:1}));M[3]=f}
/* 4: data obelisk */
{const f=[];f.push(...vmBox(0,.05,0,.7,.1,.36,IN),...vmBox(0,.52,0,.5,.84,.2,[58,44,110],{}),...vmBox(0,.98,0,.34,.1,.14,PS_));for(let r=0;r<6;r++){const y=.2+r*.13;f.push(...vmBox(r&1?-.08:.08,y,.105,.22,.035,.01,r%3==0?MG:TE,{e:1}))}f.push(...vmBox(0,.52,.105,.02,.7,.01,BL,{e:1}));M[4]=f}
/* 5: plasma orb on a three-pronged cradle */
{const f=[];for(let k=0;k<3;k++){const a=k*2.094;f.push(...vmBox(Math.cos(a)*.17,.2,Math.sin(a)*.17,.045,.4,.045,IN,{rz:Math.cos(a)*.0}))}f.push(...vmCyl(0,.3,0,.2,.06,PS_,{ax:'y',n:6,r2:.14}),...vmCyl(0,.38,0,.12,.14,MG,{ax:'y',n:8,r2:.2,e:1}),...vmCyl(0,.52,0,.2,.14,MG,{ax:'y',n:8,r2:.12,e:1}),...vmCyl(0,.46,0,.08,.2,[255,235,255],{ax:'y',n:6,r2:.03,e:1}));M[5]=f}
/* 6: glow-cap fungus */
{const f=[];f.push(...vmCyl(0,0,0,.08,.3,[130,110,190],{ax:'y',n:7,r2:.06}),...vmCyl(0,.28,0,.26,.1,TE,{ax:'y',n:9,r2:.14,e:1}),...vmCyl(0,.26,0,.08,.05,PE,{ax:'y',n:7}));for(const[x,z]of[[.18,.1],[-.14,.16],[.02,-.2]])f.push(...vmCyl(x,0,z,.03,.18,[130,110,190],{ax:'y',n:5}),...vmCyl(x,.17,z,.09,.05,BL,{ax:'y',n:6,r2:.05,e:1}));M[6]=f}
/* 7: stasis capsule */
{const f=[];f.push(...vmCyl(0,0,0,.34,.08,IN,{ax:'y',n:8}),...vmCyl(0,.08,0,.26,.05,PS_,{ax:'y',n:8}),...vmCyl(0,.13,0,.2,.42,[120,255,235],{ax:'y',n:8,r2:.2,e:1}),...vmCyl(0,.55,0,.2,.05,PS_,{ax:'y',n:8,r2:.26}),...vmCyl(0,.3,0,.08,.16,[255,255,255],{ax:'y',n:5,r2:.06,e:1}));for(let k=0;k<4;k++){const a=k*1.5708+.78;f.push(...vmBox(Math.cos(a)*.21,.33,Math.sin(a)*.21,.03,.42,.03,PE))}M[7]=f}
/* 8-13: hover-pods for the city streets */
{const CC=[[120,255,230],[220,130,255],[130,200,255],[255,140,200],[200,255,150],[255,225,140]];for(let i=0;i<6;i++){const f=[],c=CC[i];f.push(...vmCyl(0,.22,0,.2,.14,PE,{ax:'z',n:10,r2:.2}),...vmBox(0,.2,0,.5,.12,.9,PE),...vmCyl(0,.3,-.05,.2,.16,[40,28,80],{ax:'y',n:8,r2:.14}),...vmBox(0,.12,0,.46,.025,.86,c,{e:1}));for(const sx of[-1,1])f.push(...vmBox(sx*.26,.24,0,.04,.04,.86,c,{e:1}));f.push(...vmBox(0,.22,.46,.3,.05,.02,[255,255,255],{e:1}),...vmBox(0,.2,-.46,.34,.05,.02,c,{e:1}));M[8+i]=f}}
/* 14: crystal cluster, 15: a fallen halo ring */
{const f=[];let q=5;const rn=()=>{q=(Math.imul(q,1103515245)+12345)>>>0;return q/4294967296};for(let k=0;k<7;k++){const a=rn()*6.283,d=rn()*.2,h=.25+rn()*.4,r=.05+rn()*.06;f.push(...vmCyl(Math.cos(a)*d,0,Math.sin(a)*d,r,h,k%2?TE:BL,{ax:'y',n:5,r2:0,e:1}))}f.push(...vmCyl(0,0,0,.34,.06,IN,{ax:'y',n:8,r2:.26}));M[14]=f}
{const f=[];for(let k=0;k<9;k++){const a=k/9*6.283;f.push(...vmBox(Math.cos(a)*.3,.09,Math.sin(a)*.3,.2,.1,.1,k%3==0?TE:PE,{ry:-a,e:k%3==0?1:0}))}f.push(...vmBox(0,.02,0,.5,.04,.5,IN));M[15]=f}
return M}
/* extra crystal clusters and halo rings scattered about (never blocks the way to the exit) */
function alnScatter(){const put=[],free=(x,y)=>x>0&&y>0&&x<N-1&&y<N-1&&!g[y*N+x]&&!blk[y*N+x]&&!pit[y*N+x]&&(!brg[y*N+x]||TH.mine)&&Math.hypot(x+.5-P.x,y+.5-P.y)>3&&Math.hypot(x+.5-ex.x,y+.5-ex.y)>2&&!E.some(e=>Math.hypot(x+.5-e.x,y+.5-e.y)<1.2);
for(let k=N>>1,tr=0;k>0&&tr<400;tr++){const x=ri(2,N-3),y=ri(2,N-3);if(!free(x,y))continue;const m=14+(R()<.5?1:0);blk[y*N+x]=1;put.push({x:x+.5+rr(-.1,.1),y:y+.5+rr(-.1,.1),t:PS[0],s:.62,fl:0,fb:0,cell:y*N+x,m,yaw:rr(0,6.283),h:PROP_H[m],pr:PROP_R[m]});k--}
while(put.length&&!pathOk()){const p=put.pop();blk[p.cell]=0}for(const p of put)PRP.push(p)}
/* ===== the cutscene: through the prototype teleporter to the alien home world ===== */
const ALC_D=26,ALC_SUB=[[2.6,6.4,'Beyond the ring: a world that has never known a human.'],[7.2,11.2,'Its cities do not stand on the ground. They float.'],[12,16,'Pearl towers, grown rather than built, joined by bridges of light.'],[17,21.6,'This is where Vhaloru’s people came from.'],[22,25.4,'Welcome to the home world.']];
let ALC=null;
function alcStart(){if(ALC)return;ALC={t:0,sk:0};keys.Space=false;P.inv=99;try{bmStop(0)}catch(e){}alcAmbStart()}
function alcEnd(){if(!ALC)return;ALC=null;alcAmbStop();keys.Space=false;if(window.CVV)return cvDone();P.inv=1.5;nextFloor()}
function alcStep(dt){const e=ALC;e.t+=dt;const t=e.t;
if(!e.a&&t>.1){e.a=1;snd(80,1.4,'sawtooth',.2,600);snd(1800,1.2,'sine',.06,-1500)}
if(!e.b&&t>1.9){e.b=1;snd(220,3,'sine',.1,300);snd(330,3.4,'sine',.07,300)}
if(!e.c&&t>12){e.c=1;snd(165,4,'triangle',.08,0);snd(247,4,'sine',.06,0)}
if(!e.d&&t>22.4){e.d=1;snd(70,3,'sawtooth',.14,500);snd(1200,2,'sine',.05,-800)}
if(t>2&&keys.Space&&t>e.sk){e.sk=t;if(t>3)return alcEnd()}
if(t>=ALC_D)alcEnd()}
function alcDraw(){const e=ALC,t=e.t,w=LW,h=LH,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),ss=(a,b,x)=>{const k=cl((x-a)/(b-a),0,1);return k*k*(3-2*k)};
const g3=window.ALN3D;ctx.setTransform(U,0,0,U,0,0);
if(g3&&ALN3D.draw(t,W,H))ctx.drawImage(ALN3D.cv,0,0,w,h);else alcDraw2D(t,w,h);
/* white flash out of the teleporter, then back to white at the end */
/* cinematic bars + captions */
const bar=h*.1;ctx.fillStyle='#000';ctx.fillRect(0,0,w,bar*Math.min(1,t/1.5));ctx.fillRect(0,h-bar*Math.min(1,t/1.5),w,bar);
for(const[a,b,s]of ALC_SUB)if(t>a&&t<b){const k=Math.min(ss(a,a+.6,t),1-ss(b-.6,b,t));ctx.globalAlpha=k;ctx.fillStyle='#e8fff8';ctx.font=`${Math.max(8,h*.045)|0}px sans-serif`;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(s,w/2,h-bar*.4);ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.textAlign='left'}
if(t>7&&t<11.6){const k=Math.min(ss(7,8,t),1-ss(10.6,11.6,t));ctx.globalAlpha=k*.9;ctx.fillStyle='#bff';ctx.font=`bold ${Math.max(10,h*.07)|0}px sans-serif`;ctx.textAlign='center';ctx.shadowColor='#7af';ctx.shadowBlur=10;ctx.fillText('THE HOME WORLD',w/2,bar+h*.12);ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.textAlign='left'}
if(t>2.5){ctx.globalAlpha=.4;ctx.fillStyle='#fff';ctx.font=`${Math.max(7,h*.032)|0}px sans-serif`;ctx.textAlign='right';ctx.fillText('Space: skip',w-6,bar-4);ctx.textAlign='left';ctx.globalAlpha=1}
const fa=Math.max(1-ss(0,2.2,t),ss(ALC_D-2.2,ALC_D,t));if(fa>0){ctx.fillStyle=`rgba(235,250,255,${fa})`;ctx.fillRect(0,0,w,h)}}
/* no WebGL2: a painted version of the same scene (a ringed planet, floating spires and bridges of light) */
function alcDraw2D(t,w,h){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#10062a');g.addColorStop(.6,'#4a2a7a');g.addColorStop(1,'#b86ac0');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
for(let i=0;i<60;i++){ctx.fillStyle=`rgba(255,255,255,${.3+.4*Math.sin(t*2+i)**2})`;ctx.fillRect((i*97.3)%w,(i*53.7)%(h*.6),1,1)}
const px=w*.72-t*2,py=h*.28,pr=h*.16;const pg=ctx.createRadialGradient(px-pr*.3,py-pr*.3,pr*.1,px,py,pr);pg.addColorStop(0,'#fff0d8');pg.addColorStop(1,'#8a4a9a');ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px,py,pr,0,7);ctx.fill();ctx.strokeStyle='rgba(255,230,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px,py,pr*1.7,pr*.4,-.3,0,7);ctx.stroke();
for(let i=0;i<7;i++){const x=((i*0.17+0.08+t*.004*(i%3+1))%1.2-.1)*w,y=h*(.5+((i*37)%30)/100)+Math.sin(t*.7+i)*3,s=h*(.05+((i*13)%7)/100);ctx.fillStyle='#d8d4f0';ctx.beginPath();ctx.ellipse(x,y,s*2.4,s*.4,0,0,7);ctx.fill();ctx.fillStyle='#e6e6ff';for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(x+k*s*.6-s*.15,y);ctx.lineTo(x+k*s*.6,y-s*(1.4-Math.abs(k)*.3));ctx.lineTo(x+k*s*.6+s*.15,y);ctx.fill()}ctx.fillStyle='rgba(120,255,230,.8)';ctx.fillRect(x-s*2.4,y,s*4.8,1.5)}}
/* soft, sparkling ambience under the cutscene */
function alcAmbStart(){try{initAudio();if(!AC||ALNAMB)return;const t=AC.currentTime,out=AC.createGain();out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(.5,t+3);out.connect(audMus());const nodes=[out];
const osc=(f,type,gn,det)=>{const o=AC.createOscillator(),gg=AC.createGain();o.type=type;o.frequency.value=f;o.detune.value=det||0;gg.gain.value=gn;o.connect(gg);gg.connect(out);o.start();nodes.push(o,gg)};
osc(55,'sine',.05);osc(110,'sine',.03,6);osc(164.8,'triangle',.014,-5);osc(329.6,'sine',.01,9);osc(494.4,'sine',.006,-8);
let n=0;const sc=[0,3,7,10,14,17,19,22],iv=setInterval(()=>{n++;if(!ALNAMB)return;if(n%3==0){const f=330*Math.pow(2,sc[(n*5+(n>>2))%8]/12);snd(f,1.6,'sine',.03,0)}},420);ALNAMB={out,nodes,iv}}catch(e){}}
function alcAmbStop(){const a=ALNAMB;if(!a)return;ALNAMB=null;clearInterval(a.iv);try{const t=AC.currentTime;a.out.gain.cancelScheduledValues(t);a.out.gain.setValueAtTime(a.out.gain.value,t);a.out.gain.linearRampToValueAtTime(0,t+.8);setTimeout(()=>{for(const n of a.nodes){try{n.stop&&n.stop()}catch(e){}try{n.disconnect()}catch(e){}}},1000)}catch(e){}}

/* ---- alien shop (floors 26+): same shop, pearl-and-violet, all the writing replaced with alien script, and an alien at the till ---- */
function alnScribble(c,text,x,y){const fs=parseFloat((c.font.match(/([\d.]+)px/)||[0,8])[1])||8,w=c.measureText(text).width,a=c.textAlign,x0=a=='center'?x-w/2:a=='right'||a=='end'?x-w:x,mid=c.textBaseline=='middle',h=fs*.75;c.save();c.shadowBlur=0;alnGlyphs(c,x0,mid?y-h/2:y-h,Math.max(w,fs),h,[...String(text)].reduce((q,ch)=>q*31+ch.charCodeAt(0)>>>0,5),typeof c.fillStyle=='string'?c.fillStyle:'#fff');c.restore()}
function alnTextOn(){const P_=CanvasRenderingContext2D.prototype,f=P_.fillText,s=P_.strokeText;P_.fillText=function(t,x,y){alnScribble(this,t,x,y)};P_.strokeText=function(){};return()=>{P_.fillText=f;P_.strokeText=s}}
function alnShopTex(){const mp=new Map(),d=(a,fl_)=>{if(!(a instanceof Uint32Array))return a;let r=mp.get(a);if(!r){r=alnRecolor(a,mp.size,fl_);mp.set(a,r)}return r};TX=TX.map(a=>d(a));TU=TX;RT=TX[0];CT=(Array.isArray(CT)?CT:[]).map(a=>d(a,1));FT=d(FT,1);BT=d(BT);if(CEIL)CEIL=CEIL.map(a=>d(a))}
function alnCashier(S){const PE=[245,242,255],VI=[130,96,215],IN=[44,30,92],TE=[110,255,230],MG=[255,130,225],wv=S.wave>0?Math.sin(T*14)*.5:0,id=Math.sin(T*2)*.012,f=[];
f.push(...vmCyl(0,0,0,.15,.3,[150,115,240],{ax:'y',n:8,r2:.1,e:1}),...vmCyl(0,.3,0,.1,.22,[200,185,250],{ax:'y',n:8,r2:.075,e:1}),...vmBox(0,.38,.07,.05,.05,.02,MG,{e:1}),...vmCyl(0,.0,0,.16,.03,TE,{ax:'y',n:8,e:1}),
...vmBox(-.13,.34,0,.04,.3,.05,PE),...vmBox(.13,.36,0,.04,.3,.05,PE,{rz:S.wave>0?2.6+wv:0}),...vmBox(-.13,.18,0,.05,.04,.06,TE,{e:1}),
...vmCyl(0,.52,0,.035,.1,[225,220,250],{ax:'y',n:6,e:1}),...vmCyl(0,.6+id,0,.08,.06,[225,220,250],{ax:'y',n:10,r2:.115,e:1}),...vmCyl(0,.66+id,0,.115,.1,[225,220,250],{ax:'y',n:10,r2:.1,e:1}),...vmCyl(0,.76+id,0,.1,.1,[225,220,250],{ax:'y',n:10,r2:.02,e:1}),
...vmBox(-.05,.7+id,.095,.055,.03,.012,TE,{e:1,rz:.35}),...vmBox(.05,.7+id,.095,.055,.03,.012,TE,{e:1,rz:-.35}),...vmBox(0,.65+id,.1,.02,.012,.01,IN));
for(let i=0;i<10;i++){const a=i/10*6.2832+T*.8;f.push(...vmBox(Math.cos(a)*.14,.95+id+Math.sin(T*1.5)*.01,Math.sin(a)*.14,.06,.02,.02,MG,{ry:-a,e:1}))}return f}

/* the kiosk sign is built from little boxes in a 3x5 pixel font; on alien floors every letter becomes an invented glyph in the same font */
function alnLetters(txt,yc,p,c){let out='';for(let i=0;i<txt.length;i++){const ch=txt[i],code=256+((ch.charCodeAt(0)*7+i*5)%40);if(!TIXF[String.fromCharCode(code)]){let q=code*2654435761>>>0;const rows=[];for(let r=0;r<5;r++){q=(Math.imul(q,1664525)+1013904223)>>>0;let b=(q>>>12)&7;if(r==0||r==4)b|=2;rows.push((b|1<<((q>>>20)%3)).toString(2).padStart(3,'0'))}TIXF[String.fromCharCode(code)]=rows}out+=String.fromCharCode(code)}return tixLetters(out,yc,p,c)}

/* alien shop furniture: the wooden shelves, counter, side counter, cabinet and scratch-off stand get pearl and violet panels with glowing trim and crystal tops (same shapes, so items still sit where they should) */
function alnFurn(faces,kind){const VI=[124,92,214],PE=[236,232,255],IN=[46,32,98],MG=[255,130,225],TE=[110,255,230],CR=[222,216,250];
const M=new Map([['150,104,62',[VI]],['198,150,94',[PE]],['92,60,36',[IN]],['232,224,200',[PE]],['242,234,208',[CR]],['218,90,100',[MG,1]],['210,48,66',[MG,1]],['218,60,70',[MG,1]],['210,48,52',[MG,1]],['255,208,60',[TE,1]],['232,184,60',[TE,1]],['255,214,70',[TE,1]],['255,244,200',[TE,1]]]);
const out=faces.map(f=>{if(!f.c||f.e)return f;const k=f.c.join(','),m=M.get(k);let c=null,e=0;if(m){c=m[0];e=m[1]||0}else{const r=f.c[0],g=f.c[1],b=f.c[2];if(r>g+12&&g>b+12&&r<225&&r-b>30&&r>70){const l=(r+g)/2/200;c=[60+l*150|0,45+l*130|0,120+l*120|0]}}
if(!c)return f;const n=Object.assign({},f);n.c=c;if(e)n.e=1;return n});
const add=[];
if(kind=='shelf'||kind=='bshelf'){for(const sx of[-.4,.4])add.push(...vmCyl(sx,.96,0,.035,.12,TE,{ax:"y",n:4,r2:0,e:1}));add.push(...vmBox(0,.96,.2,.7,.02,.02,MG,{e:1}))}
else if(kind=='counter'){add.push(...vmBox(0,.33,.362,3.9,.03,.01,TE,{e:1}),...vmBox(0,.47,.37,3.9,.012,.012,MG,{e:1}));for(const sx of[-1.9,1.9])add.push(...vmCyl(sx,.48,0,.035,.12,TE,{ax:"y",n:4,r2:0,e:1}))}
else if(kind=='cside'){add.push(...vmBox(.36,.3,0,.012,.03,1.9,TE,{e:1}))}
else if(kind=='cabinet'){add.push(...vmBox(0,.95,.27,3,.02,.02,TE,{e:1}));for(const sx of[-1.4,1.4])add.push(...vmCyl(sx,.96,0,.035,.14,MG,{ax:"y",n:4,r2:0,e:1}))}
else if(kind=='tix'){add.push(...vmCyl(0,1.32,0,.1,.22,MG,{ax:'y',n:4,r2:0,e:1}),...vmBox(0,.2,.205,.56,.02,.01,TE,{e:1}))}
return out.concat(add)}

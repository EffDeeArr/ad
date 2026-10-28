/* ===== crates.js - small physics objects (crates, boxes, planks, barrels, buckets, stools, clay pots) lying around the singleplayer levels =====
   Press the use key to pick one up (it floats in front of you), the use key again to put it down, click to throw it.
   They push around when you or monsters walk into them, stack, soak up a shot or two (yours and the monsters') and break into little
   pieces that tumble about too. Only in the true 3D levels of a singleplayer run. */
var CRT=[],CRP=[],CRC=null,CRM=null;
const CR_MAXP=160;
/* per kind: name, size range of the unit mesh (k), half footprint and height in mesh units, hit points, throw speed, spawn weight, break pieces */
const CRK={
  crate:{n:'crate',k:[.44,.52],hx:.5,hh:1,hp:55,th:6.5,w:30,pc:'wood'},
  box:{n:'box',k:[.34,.44],hx:.5,hh:1,hp:28,th:9,w:22,pc:'card'},
  plank:{n:'plank',k:[.8,1.05],hx:.24,hh:.08,hp:16,th:10,w:16,pc:'wood'},
  barrel:{n:'barrel',k:[.46,.54],hx:.5,hh:1.15,hp:70,th:5.5,w:12,pc:'wood'},
  bucket:{n:'bucket',k:[.38,.46],hx:.5,hh:.85,hp:40,th:9,w:8,pc:'metal'},
  stool:{n:'stool',k:[.46,.54],hx:.5,hh:.9,hp:30,th:8,w:6,pc:'wood'},
  pot:{n:'clay pot',k:[.4,.5],hx:.46,hh:1,hp:14,th:9,w:6,pc:'clay'}};
function crOn(){try{return !!(SW&&SW.g3d&&!NET&&!DM&&!SHOPF&&!INTRO&&!(GR&&(GR.cq||GR.br)))}catch(e){return false}}
function crClear(){CRT=[];CRP=[];CRC=null}
function crNew(kind,x,y,z){const K=CRK[kind],k=K.k[0]+Math.random()*(K.k[1]-K.k[0]);
  return{x,y,z,vx:0,vy:0,vz:0,yaw:Math.random()*6.283,vyaw:0,kind,k,r:K.hx*k,h:K.hh*k,hp:K.hp,mhp:K.hp,rest:0,gr:0,flash:0,rt:0}}
function crMesh(){if(CRM)return CRM;const W=[214,150,80],D=[104,62,28],L=[240,186,112],C=[226,194,140],TP=[246,232,190],Cd=[184,154,108];
  const oct=(y,h,w,c,o)=>[...vmBox(0,y,0,w,h,w,c,o),...vmBox(0,y,0,w,h,w,c,Object.assign({ry:.7854},o||{}))];
  const crate=[...vmBox(0,.5,0,.98,.98,.98,W)];
  for(const sx of[-1,1])for(const sz of[-1,1])crate.push(...vmBox(sx*.44,.5,sz*.44,.13,1,.13,D));
  for(const sz of[-1,1])for(const y of[.045,.955]){crate.push(...vmBox(0,y,sz*.44,1,.11,.13,D));crate.push(...vmBox(sz*.44,y,0,.13,.11,1,D))}
  for(const sz of[-1,1]){crate.push(...vmBox(0,.5,sz*.495,.84,.1,.02,L,{rz:.72}));crate.push(...vmBox(sz*.495,.5,0,.02,.1,.84,L,{rx:-.72}))}
  const box=[...vmBox(0,.5,0,.98,.98,.98,C),...vmBox(0,.5,0,1.0,1.0,.16,TP),...vmBox(0,.985,0,.98,.02,.98,Cd),...vmBox(0,.5,0,.16,1.0,1.0,TP)];
  /* a rough plank: two boards' worth of colour, a nail head at each end, a darker edge */
  const PL=[196,146,86],PD=[142,98,52],NL=[70,66,64];
  const plank=[...vmBox(0,.04,0,1,.08,.2,PL),...vmBox(0,.082,0,.98,.012,.18,[222,172,108]),...vmBox(0,.04,.096,1,.07,.012,PD),...vmBox(-.43,.085,0,.04,.02,.04,NL),...vmBox(.43,.085,0,.04,.02,.04,NL),...vmBox(.18,.04,0,.012,.081,.2,PD)];
  /* barrel: eight-sided body that bulges a little in the middle, dark metal hoops */
  const BW=[168,112,56],BH=[58,52,50];
  const barrel=[...oct(.14,.28,.82,BW),...oct(.575,.6,.98,BW),...oct(1.01,.28,.82,BW),...oct(.2,.07,.86,BH),...oct(.575,.07,1.02,BH),...oct(.95,.07,.86,BH),...oct(1.145,.02,.7,[120,84,44])];
  /* bucket: tapered metal pail with a rim and a bail handle */
  const MT=[132,140,150],MD=[84,90,100];
  const bucket=[...oct(.15,.3,.7,MT),...oct(.45,.3,.84,MT),...oct(.72,.26,.96,MT),...oct(.84,.05,1.0,MD),...vmBox(0,.82,0,.9,.02,.9,[40,44,50]),...vmBox(0,1.05,0,.03,.03,.9,MD,{rz:0})];
  /* stool: round-ish seat on four slanted-looking legs with a rung */
  const SD=[150,100,52],SL=[200,150,90];
  const stool=[...vmBox(0,.82,0,1,.14,1,SL),...vmBox(0,.9,0,.96,.02,.96,[226,178,112])];
  for(const sx of[-1,1])for(const sz of[-1,1])stool.push(...vmBox(sx*.36,.38,sz*.36,.13,.76,.13,SD));
  stool.push(...vmBox(0,.28,.36,.72,.06,.06,SD),...vmBox(0,.28,-.36,.72,.06,.06,SD),...vmBox(.36,.28,0,.06,.06,.72,SD),...vmBox(-.36,.28,0,.06,.06,.72,SD));
  /* clay pot: round belly, narrow neck, wide lip */
  const CL=[196,98,58],CD=[150,68,40],CT=[222,128,84];
  const pot=[...oct(.1,.2,.5,CD),...oct(.34,.3,.86,CL),...oct(.6,.28,.92,CL),...oct(.82,.2,.6,CL),...oct(.95,.1,.72,CT),...oct(.5,.04,.93,CD)];
  const chip=n=>[...vmBox(0,.5,0,1,1,1,n)];
  const mk=a=>a.map(chip);
  CRM={crate,box,plank,barrel,bucket,stool,pot,
    chips:{wood:mk([[158,112,62],[120,84,46],[190,146,90]]),card:mk([[200,172,126],[226,210,170]]),metal:mk([[120,128,138],[84,90,100],[150,156,166]]),clay:mk([[196,98,58],[150,68,40],[222,128,84]])}};return CRM}
function crPick(){let t=0;for(const k in CRK)t+=CRK[k].w;let r=Math.random()*t;for(const k in CRK){r-=CRK[k].w;if(r<=0)return k}return'crate'}
function crSpawn(){crClear();if(!crOn()||bossFl||fl==15)return;try{
  const used=[];const ok=(x,y)=>{const i=y*N+x;if(x<1||y<1||x>=N-1||y>=N-1)return false;if(g[i]||blk[i]||pit[i]||(CZ[i]<.99)||brg[i])return false;if(GR&&GR.city&&(ct[i]==1||ct[i]==4||ct[i]==5))return false;/* never out on the roads of a city */
    if(Math.hypot(x+.5-P.x,y+.5-P.y)<3)return false;if(ex&&Math.hypot(x+.5-ex.x,y+.5-ex.y)<2.5)return false;for(const c of CH)if(Math.hypot(c.x-x-.5,c.y-y-.5)<1.6)return false;
    for(const u of used)if(Math.hypot(u[0]-x,u[1]-y)<1.4)return false;return true};
  const add=(x,y)=>{used.push([x,y]);const f=FH[y*N+x]||0;CRT.push(crNew(crPick(),x+.3+Math.random()*.4,y+.3+Math.random()*.4,f+.002))};
  const R_=typeof rooms!='undefined'&&rooms?rooms:[];
  for(let ri=0;ri<R_.length;ri++){const r=R_[ri];if(!r||r.w<3||r.h<3)continue;const n=(ri==0?1:r.w*r.h>=36?2:1)+(Math.random()<.35?1:0);
    for(let k=0,t=0;k<n&&t<40;t++){const x=r.x+1+Math.floor(Math.random()*(r.w-2)),y=r.y+1+Math.floor(Math.random()*(r.h-2));if(!ok(x,y))continue;add(x,y);k++}}
  if(!CRT.length){for(let t=0;t<400&&CRT.length<8;t++){const x=1+Math.floor(Math.random()*(N-2)),y=1+Math.floor(Math.random()*(N-2));if(ok(x,y))add(x,y)}}
  /* only a few per floor: 0 to 5 in all */
  const cap=Math.floor(Math.random()*6);for(let i=CRT.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[CRT[i],CRT[j]]=[CRT[j],CRT[i]]}CRT.length=Math.min(CRT.length,cap);
  /* now and then something small on top of a crate or barrel */
  for(const c of CRT.slice())if(CRT.length<cap&&(c.kind=='crate'||c.kind=='barrel')&&Math.random()<.25){const t=crNew(['box','bucket','pot','plank'][(Math.random()*4)|0],c.x+(Math.random()-.5)*.08,c.y+(Math.random()-.5)*.08,c.z+c.h+.02);CRT.push(t)}
  }catch(e){CRT=[];console.error('crates',e)}}
/* ---- damage and breaking ---- */
function crHurt(c,dmg,dx,dy){if(!c||c.dead)return;c.hp-=dmg;c.flash=.12;const m=Math.hypot(dx||0,dy||0)||1;if(c!==CRC){c.rest=0;const k=Math.min(2.2,dmg*.03);c.vx+=(dx||0)/m*k;c.vy+=(dy||0)/m*k;c.vyaw+=(Math.random()-.5)*4}
  try{const mt=CRK[c.kind].pc=='metal';snd(c.hp<=0?(mt?520:150):(mt?640:230),.07,mt?'triangle':'square',.05,-110,c)}catch(e){}
  if(c.hp<=0)crBreak(c,dx||0,dy||0)}
function crBreak(c,dx,dy){if(c.dead)return;c.dead=1;if(CRC===c)CRC=null;CRT=CRT.filter(q=>q!==c);const m=Math.hypot(dx,dy)||1,K=CRK[c.kind],sz=Math.max(c.r*2,c.h),n=Math.round(4+sz*10)+(Math.random()*3|0),list=crMesh().chips[K.pc];
  for(let i=0;i<n;i++){const big=i<2,s=(big?.34:.12+Math.random()*.14)*sz*(K.pc=='metal'?.8:1),a=Math.random()*6.283,sp=1+Math.random()*3.4;
    CRP.push({x:c.x+(Math.random()-.5)*c.r*1.4,y:c.y+(Math.random()-.5)*c.r*1.4,z:c.z+.05+Math.random()*c.h*.8,vx:Math.cos(a)*sp+dx/m*1.2,vy:Math.sin(a)*sp+dy/m*1.2,vz:1.2+Math.random()*3.2,yaw:Math.random()*6.283,vyaw:(Math.random()-.5)*16,s,life:10+Math.random()*6,mesh:list[(Math.random()*list.length)|0],gr:0})}
  while(CRP.length>CR_MAXP)CRP.shift();
  try{const mt=K.pc=='metal',cl=K.pc=='clay';snd(cl?900:mt?420:120,.22,cl?'square':mt?'triangle':'sawtooth',.09,-70,c);snd(cl?1300:300,.12,'square',.05,-200,c);for(let k=0;k<5;k++)ptcPush({x:c.x+(Math.random()-.5)*.4,y:c.y+(Math.random()-.5)*.4,z:.1+Math.random()*.2,vx:(Math.random()-.5)*1.2,vy:(Math.random()-.5)*1.2,vz:.6+Math.random()*.6,life:.5,l0:.5,t:S.spark,s:.22,g:0},c.z)}catch(e){}}
/* ---- shots ---- */
function crateRay(ox,oy,oz,cs,sn,sl,maxd){let best=maxd,hit=null;for(const c of CRT){if(c===CRC)continue;const dx=c.x-ox,dy=c.y-oy,t0=dx*cs+dy*sn,r=c.r*1.25;if(t0<=0||t0-r>=best)continue;const lat=Math.abs(-dx*sn+dy*cs);if(lat>=r)continue;
    let t=t0-Math.sqrt(r*r-lat*lat);if(t<.02)t=Math.max(.02,t0);if(t>=best)continue;const zr=oz+sl*t;if(zr<c.z-.03||zr>c.z+c.h+.03)continue;best=t;hit=c}return hit?{t:best,c:hit}:null}
function crBul(b){if(!CRT.length||b.z===undefined)return false;for(const c of CRT){if(c===CRC)continue;const dx=b.x-c.x,dy=b.y-c.y;if(Math.abs(dx)<c.r*1.1&&Math.abs(dy)<c.r*1.1&&b.z>=c.z-.02&&b.z<=c.z+c.h+.02){crHurt(c,Math.max(18,b.dmg||18),b.vx,b.vy);return true}}return false}
function crMelee(dmg,range,c0,s0){if(!CRT.length)return;for(const c of CRT.slice()){if(c===CRC)continue;const dx=c.x-P.x,dy=c.y-P.y,d=Math.hypot(dx,dy)||.01;if(d-c.r>range+.1)continue;if((dx*c0+dy*s0)/d<.45&&d>c.r*2)continue;if(EZ<c.z-.6||EZ>c.z+c.h+.8)continue;crHurt(c,dmg,dx,dy)}}
/* ---- picking up, carrying, throwing ---- */
function crAim(){let best=null,bs=1e9;const fx=Math.cos(P.a),fy=Math.sin(P.a);for(const c of CRT){const dx=c.x-P.x,dy=c.y-P.y,d=Math.hypot(dx,dy);if(d>2.0+c.r)continue;const dot=d<.05?1:(dx*fx+dy*fy)/d;if(dot<.82&&d>c.r*1.6)continue;const zr=EZ+(P.pt||0)*d;if(zr<c.z-.45||zr>c.z+c.h+.45)continue;const sc=d*(2.2-dot);if(sc<bs){bs=sc;best=c}}return best}
function crUse(){if(!crOn()||state!='play'||P.deadT>0)return false;if(CRC){crDrop(false);return true}const c=crAim();if(!c)return false;CRC=c;c.rest=0;c.vx=c.vy=c.vz=0;try{snd(300,.06,'triangle',.05,120)}catch(e){}return true}
function crDrop(thr){const c=CRC;if(!c)return;CRC=null;c.rest=0;const fx=Math.cos(P.a),fy=Math.sin(P.a),sp=CRK[c.kind].th;
  if(thr){c.vx=fx*sp+(P.mvx||0)*.4;c.vy=fy*sp+(P.mvy||0)*.4;c.vz=1.4+(P.pt||0)*8;c.vyaw=(Math.random()-.5)*14;try{snd(400,.12,'sawtooth',.05,-250)}catch(e){}}
  else{c.vx=(P.mvx||0)*.5;c.vy=(P.mvy||0)*.5;c.vz=0}}
function crThrow(){crDrop(true)}
/* ---- physics ---- */
function crSupported(c){if(bwHit(c.x,c.y,c.z-.04,c.r,c.h))return true;for(const b of CRT){if(b===c||b===CRC)continue;if(Math.abs(b.x-c.x)<b.r+c.r&&Math.abs(b.y-c.y)<b.r+c.r&&Math.abs(c.z-(b.z+b.h))<.05)return true}return false}
function crBody(c,dt){const r=c.r,h=c.h;
  if(c===CRC){/* held out in front of you, at the spot your crosshair is pointing at: look up and it rises, look down and it lowers */
    const a=P.a,pt=Math.max(-.9,Math.min(.9,P.pt||0)),d=.7+c.r*1.2+Math.max(0,-pt)*.2,tx=P.x+Math.cos(a)*d,ty=P.y+Math.sin(a)*d,tz=Math.max(P.z+.02,EZ-.3-h*.5+pt*d*1.15);
    const k=22,cl=v=>Math.max(-16,Math.min(16,v));
    bwMoveAxis(c,2,cl((tz-c.z)*k)*dt,r,h);bwMoveAxis(c,0,cl((tx-c.x)*k)*dt,r,h);bwMoveAxis(c,1,cl((ty-c.y)*k)*dt,r,h);let dy=a-c.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));c.yaw+=dy*Math.min(1,dt*9);c.vx=c.vy=c.vz=0;
    if(Math.hypot(tx-c.x,ty-c.y)>1.9||Math.abs(tz-c.z)>1.9)crDrop(false);return}
  if(c.rest){c.rt-=dt;if(c.rt>0)return;c.rt=.3;if(crSupported(c))return;c.rest=0}
  c.vz-=SW.G*dt;if(c.vz<-SW.VT)c.vz=-SW.VT;
  let d=c.vx*dt,got=bwMoveAxis(c,0,d,r,h);if(d&&Math.abs(got)<Math.abs(d)-1e-6){const sp=Math.hypot(c.vx,c.vy);if(sp>6)crHurt(c,(sp-4)*13,c.vx,c.vy);c.vx*=-.3}
  d=c.vy*dt;got=bwMoveAxis(c,1,d,r,h);if(d&&Math.abs(got)<Math.abs(d)-1e-6){const sp=Math.hypot(c.vx,c.vy);if(sp>6)crHurt(c,(sp-4)*13,c.vx,c.vy);c.vy*=-.3}
  if(c.dead)return;
  d=c.vz*dt;got=bwMoveAxis(c,2,d,r,h);
  if(Math.abs(got)<Math.abs(d)-1e-6){if(c.vz<0){c.gr=1;if(c.vz<-5)crHurt(c,(-c.vz-4)*10,0,0);try{if(c.vz<-1.5)snd(110,.07,'sine',.07,-40,c)}catch(e){}c.vz=c.vz<-2?-c.vz*.2:0}else c.vz=0}else c.gr=0;
  if(c.dead)return;
  if(c.gr){const f=Math.exp(-6.5*dt);c.vx*=f;c.vy*=f;c.vyaw*=f}else{c.vx*=Math.exp(-.2*dt);c.vy*=Math.exp(-.2*dt)}
  c.yaw+=c.vyaw*dt;if(c.flash>0)c.flash-=dt;
  if(c.gr&&Math.abs(c.vx)+Math.abs(c.vy)<.12&&Math.abs(c.vz)<.15){c.vx=c.vy=c.vz=c.vyaw=0;c.rest=1;c.rt=.3}
  if(c.z<SW.zmin-14){c.dead=1}}
function crPiece(p,dt){const r=p.s*.5;p.vz-=SW.G*dt;p.life-=dt;
  let d=p.vx*dt,got=bwMoveAxis(p,0,d,r,p.s);if(d&&Math.abs(got)<Math.abs(d)-1e-6)p.vx*=-.4;
  d=p.vy*dt;got=bwMoveAxis(p,1,d,r,p.s);if(d&&Math.abs(got)<Math.abs(d)-1e-6)p.vy*=-.4;
  d=p.vz*dt;got=bwMoveAxis(p,2,d,r,p.s);if(Math.abs(got)<Math.abs(d)-1e-6){if(p.vz<0){p.gr=1;p.vz=p.vz<-1.4?-p.vz*.35:0}else p.vz=0}else p.gr=0;
  if(p.gr){const f=Math.exp(-5*dt);p.vx*=f;p.vy*=f;p.vyaw*=f}p.yaw+=p.vyaw*dt}
function crStep(dt){if(!crOn()){if(CRT.length||CRP.length||CRC)crClear();return}if(state!='play')return;dt=Math.min(dt,.05);
  for(const c of CRT)crBody(c,dt);CRT=CRT.filter(c=>!c.dead);
  for(const p of CRP){if(p.life>0)crPiece(p,dt)}CRP=CRP.filter(p=>p.life>0&&p.z>SW.zmin-14);
  /* objects against each other: pushed apart, and stacked when one lands on another */
  const L=CRT;for(let i=0;i<L.length;i++){const a=L[i];if(a===CRC)continue;for(let j=i+1;j<L.length;j++){const b=L[j];if(b===CRC)continue;
    const ox=a.r+b.r-Math.abs(a.x-b.x),oy=a.r+b.r-Math.abs(a.y-b.y);if(ox<=0||oy<=0)continue;const ovz=Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z);if(ovz<=0)continue;
    if(ovz<Math.min(ox,oy)&&ovz<.12){const up=a.z>b.z?a:b,lo=up===a?b:a;up.z=lo.z+lo.h;if(up.vz<0)up.vz=0;up.gr=1}
    else if(ox<oy){const s=a.x<b.x?-1:1;a.x+=s*ox/2;b.x-=s*ox/2;const t=a.vx;a.vx=b.vx*.6;b.vx=t*.6;a.rest=b.rest=0}
    else{const s=a.y<b.y?-1:1;a.y+=s*oy/2;b.y-=s*oy/2;const t=a.vy;a.vy=b.vy*.6;b.vy=t*.6;a.rest=b.rest=0}}}
  /* you and the monsters shove things out of the way */
  const push=(o,rad,hh,isP)=>{for(const c of L){if(c===CRC)continue;const oz=o===P?P.z:swEZ(o);if(oz>c.z+c.h-.02||oz+hh<c.z+.04)continue;const dx=c.x-o.x,dy=c.y-o.y,d=Math.hypot(dx,dy)||.001,mn=rad+c.r;if(d>=mn)continue;
      const nx=dx/d,ny=dy/d,pen=mn-d,x0=c.x,y0=c.y;c.rest=0;bwMoveAxis(c,0,nx*pen,c.r,c.h);bwMoveAxis(c,1,ny*pen,c.r,c.h);c.vx+=nx*pen*4;c.vy+=ny*pen*4;
      if(isP){const rx=pen-((c.x-x0)*nx+(c.y-y0)*ny);if(rx>.01){bwMoveAxis(P,0,-nx*rx,SW.PR,SW.HH);bwMoveAxis(P,1,-ny*rx,SW.PR,SW.HH)}}}};
  if(L.length){push(P,SW.PR,SW.HH,true);for(const e of E){if(e.dead||e.fly)continue;const dx=e.x-P.x,dy=e.y-P.y;if(dx*dx+dy*dy>400)continue;push(e,Math.min(.35,(e.r||.3)*.9),SW.HH,false)}}}
/* ---- drawing ---- */
function drawCrate(c,dX,dY,plX,plY,inv,hH,Z){const dx=c.x-P.x,dy=c.y-P.y,ty=inv*(-plY*dx+plX*dy);if(ty<.12||ty>30)return;const M=crMesh();let s=c.mesh?c.s:c.k;if(c.mesh&&c.life<1.4)s=c.s*Math.max(.05,c.life/1.4);
  drawMesh(c.mesh?c.mesh:M[c.kind],c.x,c.y,c.z,s*SW.SS,c.yaw||0,null,c.flash>0?90:0,dX,dY,plX,plY,inv,hH,Z)}
function crList(L){for(const c of CRT)L.push({q:12,cr:c,x:c.x,y:c.y});for(const p of CRP)L.push({q:12,cr:p,x:p.x,y:p.y})}
function crHud(){if(!crOn()||state!='play'||P.deadT>0||SHOPF)return;let t='';const uk=typeof kbName=='function'?kbName(KBC('use')):'F';if(CRC)t='['+uk+'] Drop    [Click] Throw';else{const a=crAim();if(a)t='['+uk+'] Pick up '+CRK[a.kind].n}if(!t)return;
  ctx.save();ctx.font='8px "DotGothic16",monospace';ctx.textAlign='center';ctx.textBaseline='alphabetic';const w=ctx.measureText(t).width+12,x=LW/2,y=LH/2+34;ctx.fillStyle='#000b';ctx.fillRect(x-w/2,y-10,w,14);ctx.fillStyle='#ffe27a';ctx.fillText(t,x,y);ctx.restore()}

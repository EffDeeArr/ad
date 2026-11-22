/* ===== crates.js - small physics objects (crates, boxes, planks, barrels, buckets, stools, clay pots) lying around the singleplayer levels =====
   Press the use key to pick one up (it floats in front of you), the use key again to put it down, click to throw it.
   They push around when you or monsters walk into them, stack, soak up a shot or two (yours and the monsters') and break into little
   pieces that tumble about too. Only in the true 3D levels of a singleplayer run. */
var CRT=[],CRP=[],CRC=null,CRM=null,CRA=null,CRHL={};
/* battle royale boxes are part of the world's solids (bwHit): BXS is the list, BXSELF the box being moved (it does not block itself) */
var BXS=[],BXSELF=null;
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
function crOn(){try{return !!(SW&&SW.g3d&&!SHOPF&&!INTRO&&((!NET&&!DM&&!(GR&&(GR.cq||GR.br)))||(typeof BRON=='function'&&BRON())))}catch(e){return false}}
function crClear(){CRT=[];CRP=[];CRC=null;CRA=null}
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
function crSpawn(){crClear();if(!crOn()||bossFl||fl==15||(typeof BRV!='undefined'&&BRV))return;try{
  const used=[];const ok=(x,y)=>{const i=y*N+x;if(x<1||y<1||x>=N-1||y>=N-1)return false;if(g[i]||blk[i]||pit[i]||(CZ[i]<.99)||brg[i])return false;if(GR&&GR.city&&(ct[i]==1||ct[i]==4||ct[i]==5))return false;/* never out on the roads of a city */
    /* never in a hallway or doorway: the cell and all eight around it must be open floor, so a corridor one or two cells wide can never be plugged */
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const j=(y+dy)*N+x+dx;if(g[j]||blk[j]||pit[j]||CZ[j]<.99)return false}
    if(Math.hypot(x+.5-P.x,y+.5-P.y)<3)return false;if(ex&&Math.hypot(x+.5-ex.x,y+.5-ex.y)<2.5)return false;for(const c of CH)if(Math.hypot(c.x-x-.5,c.y-y-.5)<1.6)return false;
    for(const u of used)if(Math.hypot(u[0]-x,u[1]-y)<1.4)return false;return true};
  const add=(x,y)=>{used.push([x,y]);const f=FH[y*N+x]||0;CRT.push(crNew(crPick(),x+.3+Math.random()*.4,y+.3+Math.random()*.4,f+.002))};
  const R_=typeof rooms!='undefined'&&rooms?rooms:[];
  for(let ri=0;ri<R_.length;ri++){const r=R_[ri];if(!r||r.w<3||r.h<3)continue;const n=(ri==0?1:r.w*r.h>=36?2:1)+(Math.random()<.35?1:0);
    for(let k=0,t=0;k<n&&t<40;t++){const x=r.x+1+Math.floor(Math.random()*(r.w-2)),y=r.y+1+Math.floor(Math.random()*(r.h-2));if(!ok(x,y))continue;add(x,y);k++}}
  if(!CRT.length){for(let t=0;t<400&&CRT.length<8;t++){const x=1+Math.floor(Math.random()*(N-2)),y=1+Math.floor(Math.random()*(N-2));if(ok(x,y))add(x,y)}}
  /* only a few per floor: 0 to 5 in all */
  const cap=Math.floor(Math.random()*6);for(let i=CRT.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[CRT[i],CRT[j]]=[CRT[j],CRT[i]]}CRT.length=Math.min(CRT.length,cap);
  /* last safety net: with every object counted as solid, the start must still reach the exit and every enemy; if not, drop objects (last placed first) until it does */
  if(CRT.length&&typeof pathOk=='function'&&typeof ex!='undefined'&&ex){const cells=CRT.map(c=>(c.y|0)*N+(c.x|0)),was=cells.map(i=>blk[i]);const setAll=n=>{for(let k=0;k<CRT.length;k++)blk[cells[k]]=k<n?1:was[k]};let n=CRT.length;
    try{setAll(n);while(n>0&&!pathOk()){n--;setAll(n)}}finally{for(let k=0;k<cells.length;k++)blk[cells[k]]=was[k]}
    CRT.length=n}
  /* now and then something small on top of a crate or barrel */
  for(const c of CRT.slice())if(CRT.length<cap&&(c.kind=='crate'||c.kind=='barrel')&&Math.random()<.25){const t=crNew(['box','bucket','pot','plank'][(Math.random()*4)|0],c.x+(Math.random()-.5)*.08,c.y+(Math.random()-.5)*.08,c.z+c.h+.02);CRT.push(t)}
  }catch(e){CRT=[];console.error('crates',e)}}
/* ---- damage and breaking ---- */
function crHurt(c,dmg,dx,dy,rem){if(!c||c.dead)return;if(!rem&&c.id!==undefined){c.own=bxMe();bxSend({t:'bxh',b:c.id,d:Math.round(dmg),vx:+(dx||0).toFixed(2),vy:+(dy||0).toFixed(2)})}c.hp-=dmg;c.flash=.12;const m=Math.hypot(dx||0,dy||0)||1;if(c!==CRC){c.rest=0;const k=Math.min(2.2,dmg*.03);c.vx+=(dx||0)/m*k;c.vy+=(dy||0)/m*k;c.vyaw+=(Math.random()-.5)*4}
  try{const mt=CRK[c.kind].pc=='metal';snd(c.hp<=0?(mt?520:150):(mt?640:230),.07,mt?'triangle':'square',.05,-110,c)}catch(e){}
  if(c.hp<=0)crBreak(c,dx||0,dy||0,rem)}
function crBreak(c,dx,dy,rem){if(c.dead)return;if(!rem&&c.id!==undefined)bxSend({t:'bxb',b:c.id,vx:+(dx||0).toFixed(2),vy:+(dy||0).toFixed(2)});c.dead=1;if(CRC===c)CRC=null;CRT=CRT.filter(q=>q!==c);const m=Math.hypot(dx,dy)||1,K=CRK[c.kind],sz=Math.max(c.r*2,c.h),n=Math.round(4+sz*10)+(Math.random()*3|0),list=crMesh().chips[K.pc];
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
  if(thr){c.thr=1;c.ox=c.x;c.oy=c.y;c.vx=fx*sp+(P.mvx||0)*.4;c.vy=fy*sp+(P.mvy||0)*.4;c.vz=1.4+(P.pt||0)*8;c.vyaw=(Math.random()-.5)*14;try{snd(400,.12,'sawtooth',.05,-250)}catch(e){}}
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
  BXS=BRON()?CRT.filter(c=>c.id!==undefined&&!c.dead):[];
  for(const c of CRT){if(c.id!==undefined&&c.own!==bxMe()&&T-(c.netT||-9)<.6){/* another player is moving this box: follow their updates */const k=Math.min(1,dt*14);c.x+=(c.tx-c.x)*k;c.y+=(c.ty-c.y)*k;c.z+=(c.tz-c.z)*k;if(c.tyaw!==undefined){const d=c.tyaw-c.yaw;c.yaw+=Math.atan2(Math.sin(d),Math.cos(d))*k}c.vx=c.vy=c.vz=0;c.rest=0;continue}BXSELF=c;try{crBody(c,dt)}finally{BXSELF=null}}CRT=CRT.filter(c=>!c.dead);BXS=BRON()?CRT.filter(c=>c.id!==undefined):[];
  bxSync(dt);
  /* a thrown prop that smacks an enemy hurts it: 20 to 200 damage, more the faster it is going and the further it has flown */
  for(const c of CRT){if(!c.thr)continue;const spd=Math.hypot(c.vx,c.vy,c.vz);if(c.rest||c===CRC||spd<3){c.thr=0;continue}
    for(const e of E){if(e.dead||e.tur||e.pup||e.rp||e.rtu||e.dsp||e.fell)continue;const dx=e.x-c.x,dy=e.y-c.y,rad=c.r+Math.min(.4,(e.r||.3));if(dx*dx+dy*dy>=rad*rad)continue;const oz=swEZ(e);if(oz>=c.z+c.h||oz+SW.HH<=c.z)continue;
      const dist=Math.hypot(c.x-(c.ox||c.x),c.y-(c.oy||c.y)),sn=Math.max(0,Math.min(1,(spd-2)/8)),dn=Math.min(1,dist/10),dmg=Math.round(20+180*Math.min(1,.6*sn+.4*dn));
      c.thr=0;hit(e,dmg,{k:'Prop',name:'a thrown '+CRK[c.kind].n,perk:''});try{snd(170,.09,'square',.08,-90,e)}catch(_){}
      const m=Math.hypot(dx,dy)||1;c.vx=-dx/m*1.4;c.vy=-dy/m*1.4;c.vz=Math.max(c.vz,1.2);c.vyaw+=(Math.random()-.5)*8;c.rest=0;crHurt(c,8+dmg*.06,dx,dy);break}}
  CRA=(!CRC&&!(P.deadT>0))?crAim():null;
  for(const p of CRP){if(p.life>0)crPiece(p,dt)}CRP=CRP.filter(p=>p.life>0&&p.z>SW.zmin-14);
  /* objects against each other: pushed apart, and stacked when one lands on another */
  const L=CRT;for(let i=0;i<L.length;i++){const a=L[i];if(a===CRC)continue;for(let j=i+1;j<L.length;j++){const b=L[j];if(b===CRC)continue;
    const ox=a.r+b.r-Math.abs(a.x-b.x),oy=a.r+b.r-Math.abs(a.y-b.y);if(ox<=0||oy<=0)continue;const ovz=Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z);if(ovz<=0)continue;
    if(ovz<Math.min(ox,oy)&&ovz<.12){const up=a.z>b.z?a:b,lo=up===a?b:a;up.z=lo.z+lo.h;if(up.vz<0)up.vz=0;up.gr=1}
    else if(ox<oy){const s=a.x<b.x?-1:1;a.x+=s*ox/2;b.x-=s*ox/2;const t=a.vx;a.vx=b.vx*.6;b.vx=t*.6;a.rest=b.rest=0}
    else{const s=a.y<b.y?-1:1;a.y+=s*oy/2;b.y-=s*oy/2;const t=a.vy;a.vy=b.vy*.6;b.vy=t*.6;a.rest=b.rest=0}}}
  /* you and the monsters shove things out of the way */
  const push=(o,rad,hh,isP)=>{for(const c of L){if(c===CRC||c.id!==undefined)continue;const oz=o===P?P.z:swEZ(o);if(oz>c.z+c.h-.02||oz+hh<c.z+.04)continue;const dx=c.x-o.x,dy=c.y-o.y,d=Math.hypot(dx,dy)||.001,mn=rad+c.r;if(d>=mn)continue;
      const nx=dx/d,ny=dy/d,pen=mn-d,x0=c.x,y0=c.y;c.rest=0;if(isP&&c.id!==undefined)c.own=bxMe();bwMoveAxis(c,0,nx*pen,c.r,c.h);bwMoveAxis(c,1,ny*pen,c.r,c.h);c.vx+=nx*pen*4;c.vy+=ny*pen*4;
      if(isP){const rx=pen-((c.x-x0)*nx+(c.y-y0)*ny);if(rx>.01){bwMoveAxis(P,0,-nx*rx,SW.PR,SW.HH);bwMoveAxis(P,1,-ny*rx,SW.PR,SW.HH)}}}};
  if(L.length){push(P,SW.PR,SW.HH,true);for(const e of E){if(e.dead||e.fly)continue;const dx=e.x-P.x,dy=e.y-P.y;if(dx*dx+dy*dy>400)continue;push(e,Math.min(.35,(e.r||.3)*.9),SW.HH,false)}}}
/* ---- drawing ---- */
/* the thin white outline on the thing you are looking at: the same shape pushed outwards a hair and turned inside out, so only a rim of it shows behind the real one */
function crHull(kind){if(CRHL[kind])return CRHL[kind];const W=[255,255,255],e=.05,B=(x,y,z,w,h,d,o)=>vmBox(x,y,z,w+e,h+e,d+e,W,o),O=(y,h,w)=>[...B(0,y,0,w,h,w),...B(0,y,0,w,h,w,{ry:.7854})];let b;
  if(kind=='crate'||kind=='box')b=B(0,.5,0,1,1,1);else if(kind=='plank')b=B(0,.045,0,1,.09,.2);
  else if(kind=='barrel')b=[...O(.14,.28,.82),...O(.575,.6,.98),...O(1.01,.28,.82)];else if(kind=='bucket')b=[...O(.15,.3,.7),...O(.45,.3,.84),...O(.72,.26,.96)];
  else if(kind=='pot')b=[...O(.1,.2,.5),...O(.34,.3,.86),...O(.6,.28,.92),...O(.82,.2,.6),...O(.95,.1,.72)];
  else{b=B(0,.82,0,1,.14,1);for(const sx of[-1,1])for(const sz of[-1,1])b.push(...B(sx*.36,.38,sz*.36,.13,.76,.13))}
  const H=b.map(f=>({p:f.p.slice().reverse(),n:f.n.map(v=>-v),c:W,e:1,em:1,g:0}));return CRHL[kind]=H}
function drawCrate(c,dX,dY,plX,plY,inv,hH,Z){const dx=c.x-P.x,dy=c.y-P.y,ty=inv*(-plY*dx+plX*dy);if(ty<.12||ty>30)return;const M=crMesh();let s=c.mesh?c.s:c.k;if(c.mesh&&c.life<1.4)s=c.s*Math.max(.05,c.life/1.4);
  if(c===CRA&&!c.mesh&&!CRC)drawMesh(crHull(c.kind),c.x,c.y,c.z,s*SW.SS,c.yaw||0,null,0,dX,dY,plX,plY,inv,hH,Z);
  const mf=c.mesh?c.mesh:M[c.kind],fl=c.flash>0?90:0;/* on the graphics card a crate that is not flashing or moving is kept on the card */if(!fl&&window.__glMesh&&window.GLR&&GLR.pcObj&&GLR.pcObj(c,mf,c.z,s*SW.SS,c.yaw||0))return;
  drawMesh(mf,c.x,c.y,c.z,s*SW.SS,c.yaw||0,null,fl,dX,dY,plX,plY,inv,hH,Z)}
function crList(L){for(const c of CRT)L.push({q:12,cr:c,x:c.x,y:c.y});for(const p of CRP)L.push({q:12,cr:p,x:p.x,y:p.y})}
function crHud(){if(!crOn()||state!='play'||P.deadT>0||SHOPF)return;let t='';const uk=typeof kbName=='function'?kbName(KBC('use')):'F';if(CRC)t='['+uk+'] Drop    [Click] Throw';else{const a=crAim();if(a)t=a.id!==undefined?'['+uk+'] Pick up the box'+((P.bx|0)>=BX_MAX?' (you carry '+BX_MAX+', the most)':''):'['+uk+'] Pick up '+CRK[a.kind].n}if(!t)return;
  ctx.save();ctx.font='8px "DotGothic16",monospace';ctx.textAlign='center';ctx.textBaseline='alphabetic';const w=ctx.measureText(t).width+12,x=LW/2,y=LH/2+34;ctx.fillStyle='#000b';ctx.fillRect(x-w/2,y-10,w,14);ctx.fillStyle='#ffe27a';ctx.fillText(t,x,y);ctx.restore()}

/* ===== battle royale wooden boxes (0.9.230) =====
   Punch a tree down with your fists and it drops two or three wooden boxes. They are the same physics objects as the crates in the
   singleplayer levels (they fall, stack, get shoved about, soak up shots and break), only bigger and sturdier. The use key picks one up
   into your pocket (9 at most, counted at the bottom right), P puts one down in front of you.
   Online: each box has a number; whoever last moved it (put it down, shoved it, shot it) works out its physics and sends where it is ten
   times a second while it moves, and everyone else follows. Hits and breaks are sent to everyone; picking one up and cutting a tree down
   are first come, first served at the server, so two people can never get the same box or the same tree's boxes. */
const BX_MAX=9;let BXN=0,BXQ=0,BXPT=-9;
function bxMe(){return typeof myId!='undefined'&&myId?myId:0}
function bxNet(){return typeof NET!='undefined'&&!!NET&&DM}
function bxSend(o){try{if(bxNet())netSend(o)}catch(e){}}
function bxNew(id,x,y,z,yaw,own){const c=crNew('crate',x,y,z);c.k=.8;c.r=CRK.crate.hx*c.k;c.h=CRK.crate.hh*c.k;c.hp=c.mhp=110;c.yaw=yaw||0;c.id=id;c.own=own;CRT.push(c);if(BRON())BXS.push(c);return c}
function bxFind(id){for(const c of CRT)if(c.id===id)return c;return null}
function bxSpawnMine(x,y,z,yaw,vx,vy,vz){const id=bxMe()*100000+(++BXN);const c=bxNew(id,x,y,z,yaw,bxMe());c.vx=vx||0;c.vy=vy||0;c.vz=vz||0;c.rest=0;
  bxSend({t:'bxn',b:id,x:+x.toFixed(3),y:+y.toFixed(3),z:+z.toFixed(3),yw:+(yaw||0).toFixed(2),vx:+c.vx.toFixed(2),vy:+c.vy.toFixed(2),vz:+c.vz.toFixed(2)});return c}
/* the boxes this player is moving: where they are, ten times a second, and once more when they come to rest */
function bxSync(dt){if(!bxNet()||!BRON())return;BXQ-=dt;if(BXQ>0)return;BXQ=.1;const me=bxMe();
  for(const c of CRT){if(c.id===undefined||c.own!==me)continue;const mv=!c.rest;if(mv||!c.sentRest){bxSend({t:'bx',b:c.id,x:+c.x.toFixed(3),y:+c.y.toFixed(3),z:+c.z.toFixed(3),yw:+c.yaw.toFixed(2)});c.sentRest=!mv}}}
/* the use key in battle royale: the box you are looking at goes in your pocket */
function bxPick(){if(!BRON()||state!='play'||P.deadT>0||P.hp<=0)return false;const c=crAim();if(!c||c.id===undefined)return false;
  if((P.bx|0)>=BX_MAX){try{snd(180,.08,'square',.05,-60)}catch(e){}return true}
  c.dead=1;CRT=CRT.filter(q=>q!==c);if(CRA===c)CRA=null;
  if(bxNet())bxSend({t:'bxd',b:c.id});else bxGot();return true}
function bxGot(){P.bx=Math.min(BX_MAX,(P.bx|0)+1);try{snd(330,.06,'triangle',.05,160);snd(500,.08,'triangle',.04,120)}catch(e){}}
/* P: put a box down in front of you */
function bxPlace(){if(!BRON()||state!='play'||!P||P.deadT>0||P.hp<=0||!((P.bx|0)>0)||T-BXPT<.25)return;const a=P.a,c0=Math.cos(a),s0=Math.sin(a),r=CRK.crate.hx*.8,h=CRK.crate.hh*.8;
  for(const d of[1.05,.85,1.35,.7])for(const up of[.08,.3,.55]){const x=P.x+c0*d,y=P.y+s0*d,f=swNearFloor(x,y,P.z+.5),z=(f===f?f:P.z)+up;if(Math.abs(z-P.z)>1.4)continue;if(bwHit(x,y,z,r,h))continue;/* a little above the ground (it settles by itself) so a slope under one corner does not count as blocked */
    if(CRT.some(o=>Math.abs(o.x-x)<o.r+r&&Math.abs(o.y-y)<o.r+r&&z<o.z+o.h&&z+h>o.z))continue;
    BXPT=T;P.bx--;bxSpawnMine(x,y,z,a,0,0,0);try{snd(150,.08,'square',.06,-40);snd(110,.1,'sine',.06,-30)}catch(e){}return}
  try{snd(180,.08,'square',.05,-60)}catch(e){}}
/* the pocket of boxes: bottom right of the screen */
function bxHud(){if(!BRON()||state!='play'||!P||SPEC)return;const n=P.bx|0,x=LW-58,y=LH-26,AN=typeof UICL=='undefined'||!UICL;
  ctx.save();ctx.fillStyle=AN?'#d8ccb4':'#000a';ctx.strokeStyle=AN?'#1a1424':'#ffffff44';ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,52,18,3);else ctx.rect(x,y,52,18);ctx.fill();ctx.stroke();
  /* a little crate */const bx=x+4,by=y+3;ctx.fillStyle='#c8904e';ctx.fillRect(bx,by,12,12);ctx.strokeStyle='#5c3816';ctx.lineWidth=1.2;ctx.strokeRect(bx+.5,by+.5,11,11);ctx.beginPath();ctx.moveTo(bx+1,by+1);ctx.lineTo(bx+11,by+11);ctx.moveTo(bx+11,by+1);ctx.lineTo(bx+1,by+11);ctx.stroke();
  ctx.font='9px "DotGothic16",monospace';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=AN?'#1a1424':(n?'#ffe9a0':'#9a92b0');ctx.fillText(n+'/'+BX_MAX,x+21,y+9.5);
  ctx.font='6px "DotGothic16",monospace';ctx.fillStyle=AN?'#5b4f78':'#9a92b0';ctx.textAlign='right';ctx.fillText('['+(typeof kbName=='function'?kbName(KBC('boxp')):'P')+']',x+50,y+14);ctx.restore()}
/* everything another player's game says about boxes and trees */
function bxMsg(o){if(!BRON())return;const me=bxMe();switch(o.t){
  case'bxn':{if(bxFind(o.b))return;const c=bxNew(o.b,o.x,o.y,o.z,o.yw,o.id);c.vx=o.vx||0;c.vy=o.vy||0;c.vz=o.vz||0;c.rest=0;break}
  case'bx':{const c=bxFind(o.b);if(!c)return;c.own=o.id;c.netT=T;c.tx=o.x;c.ty=o.y;c.tz=o.z;c.tyaw=o.yw;break}
  case'bxd':{const c=bxFind(o.b);if(c){c.dead=1;CRT=CRT.filter(q=>q!==c)}if(o.by===me&&P)bxGot();break}
  case'bxh':{const c=bxFind(o.b);if(c)crHurt(c,o.d,o.vx,o.vy,1);break}
  case'bxb':{const c=bxFind(o.b);if(c)crBreak(c,o.vx||0,o.vy||0,1);break}
  case'btr':{if(typeof brFell=='function')brFell(o.i,o.by===me);break}}}


/* ===== 0.9.325: crypt zombies =====
   On Crypt floors some of the monsters are the walking dead instead: shambling humanoid corpses, arms out, no weapon.
   They start the floor shut in coffins lying about the crypt. When you come near (and can see the coffin), shoot the coffin, or when everything
   else on the floor is dead, the lid bursts off and the corpse climbs out. A zombie's hit leaves rot in the wound: damage over the next 3 seconds
   (a quarter of the hit per second; another hit starts the 3 seconds again, it does not stack).
   index.html calls genZombie (from genEnemy), zombAI (from aiStep), zWake (from hit), cryptCoffins (from startFloor), zDot (from mhurt),
   zombStep / zombHud every frame; the coffins are props numbered from 4000 (cryptMeshes). */
let ZDORM=0,CRYPTM=null;
const ZNAME1=['Rotting','Shambling','Hollow','Grave-Born','Moldering','Gaunt','Pallid','Withered'],ZNAME2=['Corpse','Ghoul','Revenant','Dead','Cadaver'];
function cryptOn(){return typeof TH!='undefined'&&TH&&TH.n=='Crypt'}
function genZombie(x,y,f){const e=genHuman(x,y,f),sp=e.fr.spec;
 /* the body: grey-green skin, torn dull clothes, no hat, no weapon, arms reaching (spec.zb) */
 sp.zbp=1;sp.pw=[];sp.hat=0;sp.cape=0;sp.sk=[150,176,124];sp.cl=pk([[128,120,104],[116,104,92],[100,116,104],[134,118,96]]);sp.dk=[70,76,62];sp.pn=pk([[90,84,76],[80,74,86],[100,90,74]]);sp.hair=[60,64,52];if(sp.an)sp.eye=[226,236,120];
 sp.gun='Pistol';/* the model's hands stay empty (zbp draws no gun); the swing timing comes from e.gun */sp.gm=null;sp.m3=null;sp.c={};
 const hp=ri(55,90)*(1+.3*f)*fHp(f)*(typeof F6HP=='function'?F6HP(f):1);
 Object.assign(e,{hp,mhp:hp,spd:rr(.95,1.25),dmg:ri(12,20)*(1+.15*f)*fScl(f),gun:'Twin daggers',melee:1,swD:HM_SWD['Twin daggers']||.35,melr:.8,traits:['undead','brawler'],shd:0,rev:0,ls:0,zomb:1,name:pk(ZNAME1)+' '+pk(ZNAME2)});
 if(ZDORM)e.dorm=1;return e}
/* the coffins, laid down where the dormant dead are (after the floor's props are placed) */
function cryptCoffins(){for(const e of E){if(!e.zomb||!e.dorm)continue;const ci=(e.y|0)*N+(e.x|0);if(g[ci]){e.dorm=0;continue}
  e.x=(e.x|0)+.5;e.y=(e.y|0)+.5;e.cx=e.x;e.cy=e.y;const yaw=((Math.random()*4)|0)*Math.PI/2+rr(-.15,.15);e.fa=yaw;
  const p={x:e.x,y:e.y,t:PS[0],s:.62,fl:0,fb:0,cell:ci,m:4000,yaw,h:.3,pr:.3,nb:1};PRP.push(p);e.cof=p}}
const zSeen=(e)=>{try{if(SW&&typeof swLosPt=='function')return swLosPt(P.x,P.y,(P.z||0)+SW.EYE,e.x,e.y,(e.z||0)+.3);const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;return dda(P.x,P.y,dx/d,dy/d).d>=d-.4}catch(er){return true}};
/* the lid bursts off and the corpse starts climbing out */
function zWake(e){if(!e.dorm)return;e.dorm=0;e.rise=1.1;e.aggro=1;if(SW)e.z0=e.z!==undefined?e.z:0;
 const p=e.cof;if(p){const i=PRP.indexOf(p),q=Object.assign({},p,{m:4001});if(i>=0)PRP[i]=q;else PRP.push(q);e.cof=q;
  const a=p.yaw+Math.PI/2*(Math.random()<.5?1:-1),lx=p.x+Math.sin(a)*.62,ly=p.y+Math.cos(a)*.62,lc=(ly|0)*N+(lx|0);if(!g[lc])PRP.push({x:lx,y:ly,t:PS[0],s:.62,fl:0,fb:0,cell:lc,m:4002,yaw:p.yaw+rr(-.4,.4),h:.1,pr:.2,nb:1})}
 snd(70,.35,'sawtooth',.1,-30,e);snd(180,.5,'sawtooth',.05,-120,e);setTimeout(()=>snd(110,.9,'sawtooth',.05,-40,e),250);
 for(let i=0;i<16;i++){const a=Math.random()*6.28,v=rr(.6,2.2);ptcPush({x:e.x,y:e.y,z:.25,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rr(.4,1.8),life:.8,l0:.8,t:i%3?S.dust:S.spark,s:i%3?.3:.1,g:4},SW?(e.z0||0):undefined)}}
/* a dormant or rising zombie does nothing else this frame (true) */
function zombAI(e,dt){
 if(e.dorm){let wake=false;const d=Math.hypot(P.x-e.x,P.y-e.y);if(d<5.5*(SW?SW.SC:1)&&state=='play'&&zSeen(e))wake=true;
  if(!wake&&e.pup&&e.cx!==undefined&&Math.hypot(e.x-e.cx,e.y-e.cy)>.3)wake=true;/* co-op guest: the host's copy has already got up */
  if(!wake&&typeof RP!='undefined')for(const q of RP){if(!q.dead&&Math.hypot(q.x-e.x,q.y-e.y)<5.5)wake=true}
  if(!wake&&!E.some(o=>!o.dead&&!o.dorm&&!o.pac))wake=true;/* the rest of the floor is dead: the dead rise */
  if(wake)zWake(e);else{e.af=0;return true}}
 if(e.rise>0){e.rise-=dt;const k=Math.max(0,e.rise/1.1);if(SW&&e.z0!==undefined)e.z=e.z0-.62*k*SW.HH;e.af=0;if(e.rise<=0&&SW&&e.z0!==undefined)e.z=e.z0;return true}
 return false}
/* a zombie's hit: 3 seconds of rot */
function zDot(e){P.zdT=3;P.zdD=Math.max(P.zdD&&P.zdT>0?P.zdD:0,e.dmg*.25);P.zdK=.5;snd(140,.25,'sawtooth',.04,-60)}
function zombStep(dt){if(!(P.zdT>0)||state!='play')return;if(P.deadT>0||P.hp<=0){P.zdT=0;return}P.zdT-=dt;P.zdK=(P.zdK||.5)-dt;if(P.zdK<=0){P.zdK+=.5;hb(null);cause='zombie rot';hurt(P.zdD*.5);if(Math.random()<.8)ptcPush({x:P.x+rr(-.2,.2),y:P.y+rr(-.2,.2),z:.5,vx:0,vy:0,vz:.3,life:.5,l0:.5,t:S.spark,s:.08,g:-.2},undefined)}if(P.zdT<=0)P.zdD=0}
function zombHud(){const c=ctx,a=Math.min(1,P.zdT)*.16*(.75+.25*Math.sin(T*9));c.save();c.fillStyle='rgba(70,150,40,'+a+')';c.fillRect(0,0,LW,LH);c.font='8px "DotGothic16",monospace';c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#000';c.fillText('ROTTING  '+P.zdT.toFixed(1)+'s',LW/2+1,LH-55);c.fillStyle='#b4f07a';c.fillText('ROTTING  '+P.zdT.toFixed(1)+'s',LW/2,LH-56);c.restore()}
/* 4000 a closed coffin lying down (head toward -z), 4001 the same with its lid gone and the inside dark, 4002 the lid lying where it landed */
function cryptMeshes(){if(CRYPTM)return CRYPTM;const B=(...a)=>vmBox(...a),M=[],W=[70,46,34],W2=[52,34,26],L=[88,58,42],SV=[196,186,160],IN=[30,22,22];
 const sides=m=>{m.push(...B(-.23,.14,0,.04,.28,1.0,W),...B(.23,.14,0,.04,.28,1.0,W),...B(0,.14,-.5,.5,.28,.04,W2),...B(0,.14,.5,.42,.28,.04,W2),...B(0,.02,0,.46,.04,1.0,W2));for(const z of[-.3,.3])for(const x of[-.26,.26])m.push(...B(x,.15,z,.02,.04,.12,SV))};
 {const m=[];sides(m);m.push(...B(0,.29,0,.52,.04,1.04,L),...B(0,.315,-.1,.05,.012,.5,SV),...B(0,.315,-.2,.24,.012,.05,SV));M.push(m)}
 {const m=[];sides(m);m.push(...B(0,.06,0,.42,.02,.92,IN),...B(0,.1,-.4,.3,.06,.12,[120,110,100]));M.push(m)}
 {const m=[];m.push(...B(0,.02,0,.52,.04,1.04,L),...B(0,.045,-.1,.05,.012,.5,SV),...B(0,.045,-.2,.24,.012,.05,SV),...B(.15,.05,.3,.18,.01,.03,W2,{ry:.6}));M.push(m)}
 return CRYPTM=M}

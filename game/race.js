/* ===== 0.9.350: the horse race, ridden in the game itself =====
   The rider waiting at the town's south-west corner challenges you. You are put on the spare horse at the start line of the track (a loop of road
   round a butte, walled off from the town by mesas: west.js westRaceGen), he lines up beside you, and it is two laps: over the hill on the east
   side, across the chasm bridge on the south side. You look and steer with the mouse as usual (A / D steer too), W rides, S reins in, Space
   cracks the whip (a burst of speed, then it needs a moment). Off the road the sand slows you; running into a cactus, a rock or a hay bale
   nearly stops you. No shooting from the saddle. In co-op the others see you as away (like inside a building) and see neither horse nor rider.
   raceStart({done(win)}) */
var RACE=null;
const RC={TOP:7.2,WHIP:9.8,ACC:3.4,DEC:2.6,BRK:8,TURN:2.2,OFF:.58,LAPS:2,SEAT:.5,LANE:.8,
 KEEP:new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Enter','Tab','Backquote','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'])};
function raceStart(opt){const W=WEST;if(RACE||!W)return false;const home={x:P.x,y:P.y,z:P.z,a:P.a,pt:P.pt};if(!raceCellIn()||!W.rq){raceCellOut();return false}const R_=W.rq;
 const s=R_.s0-2.2,p=raceAt(s);
 P.x=p.x-p.dy*RC.LANE;P.y=p.y+p.dx*RC.LANE;P.a=Math.atan2(p.dy,p.dx);P.pt=-.08;P.vz=0;P.gr=1;P.mvx=P.mvy=0;P.jz=P.jv=0;P.dv=0;
 P.z=FH[(P.y|0)*N+(P.x|0)]||0;P.cz=P.z;try{keys={}}catch(er){}
 let e;{/* made with throwaway randomness, so the floor's seeded numbers (shared in co-op) are not used up */const r0=R;R=Math.random;try{e=riderMk(P.x,P.y)}finally{R=r0}}E.push(e);
 RACE={opt,fl,home,e,st:'count',t:-3.4,cd:0,v:0,wh:1,whT:0,stum:0,ps:s,lx:P.x,ly:P.y,rs:s,rv:0,rl:-RC.LANE,rwT:0,rwCd:3,fr:0,rfr:0,hoof:0,rhoof:0,res:null,mv:1,ez:RC.SEAT,shk:0,lap:1};
 const kd=ev=>{if(!RACE||(typeof CHATOPEN!='undefined'&&CHATOPEN)||(typeof PZ!='undefined'&&PZ))return;if(ev.code=='Space'){ev.preventDefault();ev.stopImmediatePropagation();if(!ev.repeat)raceWhip();return}if(!RC.KEEP.has(ev.code)){ev.preventDefault();ev.stopImmediatePropagation()}},
  ku=ev=>{if(!RACE||(typeof CHATOPEN!='undefined'&&CHATOPEN))return;if(ev.code=='Space'||!RC.KEEP.has(ev.code)){ev.preventDefault();ev.stopImmediatePropagation()}},
  wh=ev=>{if(RACE){ev.stopImmediatePropagation()}};
 addEventListener('keydown',kd,true);addEventListener('keyup',ku,true);addEventListener('wheel',wh,true);
 RACE.un=()=>{removeEventListener('keydown',kd,true);removeEventListener('keyup',ku,true);removeEventListener('wheel',wh,true)};
 return true}
function raceWhip(){const R_=RACE;if(!R_||R_.st!='go'||R_.wh<1)return;R_.wh=0;R_.whT=1.2;R_.v=Math.max(R_.v,RC.TOP*.8);snd(1500,.05,'square',.07,-1300);setTimeout(()=>snd(950,.05,'sawtooth',.05,-600),40)}
/* the point on the track nearest the player, searched a little behind and ahead of where they were */
function raceNear(R_,x,y){let best=1e9,bs=R_.ps;for(let s=R_.ps-3;s<=R_.ps+6;s+=.2){const p=raceAt(s),d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;bs=s}}return{s:bs,d:Math.sqrt(best)}}
const raceFloor=(x,y)=>{const i=(y|0)*N+(x|0);return FH[i]||0};
function raceStep(dt){const R_=RACE,W=WEST;if(!R_)return;if(!W||!W.rq||R_.fl!==fl){raceQuit();return}const T_=W.rq,GOAL=T_.s0+RC.LAPS*T_.L,e=R_.e,CH_=typeof CHATOPEN!='undefined'&&CHATOPEN;
 R_.t+=dt;P.inv=Math.max(P.inv||0,.3);if(R_.shk>0)R_.shk-=dt;
 if(R_.st=='count'){R_.v=0;if(R_.t>=0){R_.st='go';snd(880,.35,'square',.08,0)}else{const c=Math.ceil(-R_.t);if(c!==R_.cd&&c<=3){R_.cd=c;snd(440,.15,'square',.07,0)}}}
 const go=R_.st=='go';
 /* the player's horse: a hard stop when it runs into something */
 {const moved=Math.hypot(P.x-R_.lx,P.y-R_.ly);if(go&&R_.v>2.6&&(R_.exp||0)>.02&&moved<R_.exp*.35&&R_.stum<=0){R_.stum=.7;R_.v*=.35;R_.shk=.3;snd(90,.25,'sawtooth',.12,-40);snd(300,.15,'square',.05,200)}R_.lx=P.x;R_.ly=P.y}
 if(R_.stum>0)R_.stum-=dt;if(R_.whT>0)R_.whT-=dt;if(R_.wh<1)R_.wh=Math.min(1,R_.wh+dt/3);
 const i=(P.y|0)*N+(P.x|0),off=ct[i]!==1&&ct[i]!==3,ahead=raceFloor(P.x+Math.cos(P.a)*.6,P.y+Math.sin(P.a)*.6)-raceFloor(P.x,P.y);
 const cap=(R_.whT>0?RC.WHIP:RC.TOP)*(off?RC.OFF:1)*(R_.stum>0?.4:1)*(1-Math.max(0,ahead)*.5);
 if(go){const th=(keys.KeyW||keys.ArrowUp)&&!CH_,br=(keys.KeyS||keys.ArrowDown)&&!CH_;
  if(br)R_.v=Math.max(0,R_.v-RC.BRK*dt);else if(th)R_.v=R_.v<cap?Math.min(cap,R_.v+RC.ACC*dt*(R_.v<2?1.6:1)):Math.max(cap,R_.v-5*dt);else R_.v=Math.max(0,R_.v-RC.DEC*dt);
  const tn=((keys.KeyD?1:0)-(keys.KeyA?1:0))*(CH_?0:1);P.a+=tn*RC.TURN*dt*(.55+.45*Math.min(1,R_.v/RC.TOP))}
 else if(R_.st=='done')R_.v=Math.max(0,R_.v-4*dt);
 R_.exp=R_.v*dt;/* how far the horse should carry you this frame (checked next frame) */
 const gait=Math.min(1,R_.v/RC.TOP);R_.fr+=dt*(gait>.04?3+gait*9:0);R_.ez=RC.SEAT+(gait>.04?Math.abs(Math.sin(R_.fr*Math.PI/2))*.045*gait:0)+(R_.shk>0?(Math.random()-.5)*.05:0);
 if(gait>.05){R_.hoof-=dt;if(R_.hoof<=0){R_.hoof=.34-gait*.18;snd(70+Math.random()*30,.06,'square',.05+gait*.04,-30);setTimeout(()=>snd(90,.04,'square',.03,-20),55)}}
 /* how far round: the nearest point of the road, never jumping ahead faster than you could ride there */
 {const q=raceNear(R_,P.x,P.y);if(q.s>R_.ps)R_.ps=Math.min(q.s,R_.ps+R_.v*dt+.6);else if(q.s<R_.ps-.5)R_.ps=q.s+.5}
 /* the rival: down his lane at a steady gallop, a little faster when he is behind, a little slower when he is well ahead; round the hay */
 if(go||R_.st=='done'){const d=R_.ps-R_.rs;let tv=RC.TOP*1.06+(d>0?Math.min(.4,d*.04):Math.max(-.6,d*.05));
  R_.rwCd-=dt;if(R_.rwT>0){R_.rwT-=dt;tv+=1.5}else if(d>3&&R_.rwCd<=0&&go){R_.rwT=1.1;R_.rwCd=4.5+Math.random()*2;snd(1300,.05,'square',.03,-1000)}
  const rp=raceAt(R_.rs),rx=rp.x-rp.dy*R_.rl,ry=rp.y+rp.dx*R_.rl,up=raceFloor(rx+rp.dx*.6,ry+rp.dy*.6)-raceFloor(rx,ry);tv*=1-Math.max(0,up)*.45;
  if(R_.st=='done'&&R_.rs>=GOAL)tv=0;R_.rv+=(tv-R_.rv)*Math.min(1,dt*(R_.rv<tv?.9:3));{/* round a bend his lane is shorter or longer than the middle of the road */const q0=raceAt(R_.rs),q1=raceAt(R_.rs+1),k=q0.dx*q1.dy-q0.dy*q1.dx;R_.rs+=R_.rv*dt/Math.max(.6,1-R_.rl*k)}
  const a0_=raceAt(R_.rs+1),a1_=raceAt(R_.rs+4);let want=a0_.dx*a1_.dy-a0_.dy*a1_.dx>.05?RC.LANE:-RC.LANE;/* the inside of a bend, the outside on the straights */for(const[bs,bo]of T_.bales||[]){const k=((bs-R_.rs)%T_.L+T_.L)%T_.L;if(k<5&&Math.sign(bo)==Math.sign(want))want=-want}R_.rl+=(want-R_.rl)*Math.min(1,dt*2.2)}
 {const p=raceAt(R_.rs);R_.rx=p.x-p.dy*R_.rl;R_.ry=p.y+p.dx*R_.rl;R_.ra=Math.atan2(p.dy,p.dx);const rg=Math.min(1,R_.rv/RC.TOP);R_.rbob=Math.abs(Math.sin(R_.rfr*Math.PI/2))*.045*rg;
  R_.rfr+=dt*(rg>.04?3+rg*9:0);if(rg>.05&&Math.hypot(R_.rx-P.x,R_.ry-P.y)<9){R_.rhoof-=dt;if(R_.rhoof<=0){R_.rhoof=.34-rg*.18;snd(60+Math.random()*25,.05,'square',.035,-30)}}}
 if(e){e.x=e.cx=R_.rx;e.y=e.cy=R_.ry;e.fa=R_.ra;e.z=raceFloor(e.x,e.y)+RIDE_DZ+R_.rbob}
 /* shoulder to shoulder: the horses push each other apart */
 {const dx=P.x-R_.rx,dy=P.y-R_.ry,d=Math.hypot(dx,dy);if(d<.75&&d>1e-4){const k=(.75-d)*.6;P.x+=dx/d*k;P.y+=dy/d*k}}
 R_.lap=Math.min(RC.LAPS,1+Math.max(0,Math.floor((R_.ps-T_.s0)/T_.L)));
 if(R_.st=='go'){if(R_.ps>=GOAL||R_.rs>=GOAL){R_.st='done';R_.res=R_.ps>=GOAL&&R_.ps-GOAL>=R_.rs-GOAL?'win':'lose';R_.t=0;if(R_.res=='win'){snd(660,.18,'square',.08,0);setTimeout(()=>snd(880,.3,'square',.08,0),160)}else snd(220,.5,'sawtooth',.07,-80)}}
 else if(R_.st=='done'&&R_.t>2.8)raceEnd()}
/* back to town (where you were standing) and the result */
function raceEnd(){const R_=RACE;if(!R_)return;raceBack(R_);try{typeof ledMg=='function'&&ledMg('race',R_.res=='win')}catch(er){}try{R_.opt.done&&R_.opt.done(R_.res=='win')}catch(er){console.error(er)}}
function raceQuit(){const R_=RACE;if(!R_)return;raceBack(R_)}
function raceBack(R_){RACE=null;try{R_.un()}catch(er){}const W=WEST;if(W&&R_.fl===fl){try{raceCellOut()}catch(er){window.__rcoerr=er}const h=R_.home;P.x=h.x;P.y=h.y;P.z=h.z;P.cz=h.z;P.a=h.a;P.pt=h.pt;P.vz=0;P.gr=1;P.mvx=P.mvy=0;
}E=E.filter(q=>q!==R_.e);try{keys={}}catch(er){}}
/* the horses: yours under you, his beside you */
function raceList(L){const R_=RACE;if(!R_)return;const fr=k=>'rh'+(((Math.floor(k)%4)+4)%4);
 const pg=Math.min(1,R_.v/RC.TOP),c=Math.cos(P.a),s=Math.sin(P.a);L.push({q:14,wo:pg>.04?'rhv'+(((Math.floor(R_.fr)%4)+4)%4):'rhvs',x:P.x+c*.3,y:P.y+s*.3,yaw:Math.PI/2-P.a,k:1,z:R_.ez+SW.EYE-.25});
 if(R_.rx!==undefined)L.push({q:14,wo:R_.rv>.2?fr(R_.rfr):'rh0',x:R_.rx,y:R_.ry,yaw:Math.PI/2-R_.ra,k:1,z:R_.rbob||0})}
/* the panel: the way round (both laps), your place, the lap, the whip, the countdown and the result */
function raceHud(c){const R_=RACE,W=WEST;if(!R_||!W||!W.rq)return;const T_=W.rq,G=RC.LAPS*T_.L,pz=Math.max(0,Math.min(1,(R_.ps-T_.s0)/G)),rz=Math.max(0,Math.min(1,(R_.rs-T_.s0)/G));
 const tx=(t,x,y,sz,col,al)=>{c.font=sz+'px "DotGothic16",monospace';c.textAlign=al||'center';c.lineJoin='round';c.lineWidth=Math.max(2,sz/5);c.strokeStyle='#000';c.strokeText(t,x,y);c.fillStyle=col;c.fillText(t,x,y)};
 c.save();c.textBaseline='middle';
 const bw=Math.min(180,LW*.42),bx=LW/2-bw/2,by=14;c.fillStyle='#000a';c.fillRect(bx-2,by-4,bw+4,8);c.fillStyle='#f4ead0';c.fillRect(bx,by-1,bw,2);c.fillStyle='#f4ead080';c.fillRect(bx+bw/2-.5,by-4,1,8);
 c.fillStyle='#e0483a';c.fillRect(bx+rz*bw-2,by-3,4,6);c.fillStyle='#4a8ae8';c.fillRect(bx+pz*bw-2,by-3,4,6);
 tx('LAP '+R_.lap+'/'+RC.LAPS,LW/2,by+12,8,'#f4ead0');
 const first=R_.st=='done'?R_.res=='win':R_.ps>=R_.rs;tx(first?'1ST':'2ND',bx-20,by,10,first?'#ffd24a':'#f4ead0');
 {const wx=bx+bw+10,wy=by-3;c.fillStyle='#000a';c.fillRect(wx-1,wy-1,34,8);c.fillStyle=R_.wh>=1?'#ffd24a':'#8a6a3a';c.fillRect(wx,wy,32*R_.wh,6);tx('WHIP',wx+16,wy+15,7,R_.wh>=1?'#ffd24a':'#c8b898')}
 if(R_.st=='count'){const n=Math.ceil(-R_.t);tx(n>3?'READY':String(n),LW/2,LH*.36,n>3?16:26,'#ffd24a')}
 else if(R_.st=='go'&&R_.t<.8)tx('GO!',LW/2,LH*.36,26,'#7aff7a');
 else if(R_.st=='done')tx(R_.res=='win'?'YOU WIN!':'HE WINS',LW/2,LH*.36,22,R_.res=='win'?'#ffd24a':'#ff7a6a');
 if(R_.st=='count'||R_.st=='go'&&R_.t<5)tx('W ride  A/D steer  SPACE whip',LW/2,LH*.36+24,8,'#f4ead0');
 c.restore()}

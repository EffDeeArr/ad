/* ===== 0.9.364: Deathmatch and Team Deathmatch: 30 seconds to pick any gun and any two powers (or two of one that stacks) =====
   Every gun is rolled once from the match seed, so everyone sees (and gets) exactly the same numbers. When the time runs out, anything left
   empty is filled at random. Then it is a free-for-all (Deathmatch) or Red against Blue (Team Deathmatch), like the Arberia modes.
   (0.9.365) While dead you can press R to pick again; you respawn once you are done. Phoenix Heart is not offered, and the melee-only powers
   (Deflect, Bulwark) are crossed out unless the gun picked is a melee weapon. Hovering anything shows what it does next to the pointer. */
let DMLOAD=null,DMREPICK=0;
function dmPickCss(){if(document.getElementById('dmpcss'))return;const s=document.createElement('style');s.id='dmpcss';s.textContent=`
#dmp button{all:unset;box-sizing:border-box}
#dmp{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;gap:1.4vmin;padding:2.4vmin 3vmin 2vmin;box-sizing:border-box;font-family:"DotGothic16",monospace;color:#efe3c4;
 background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.035) 0 1px,transparent 1.5px) 0 0/9px 9px,radial-gradient(ellipse at 30% 0%,#3b2d5c,#16101f 70%)}
#dmp .hd{display:flex;align-items:center;gap:2.4vmin}
#dmp h1{margin:0 0 .8vmin;font-size:min(5.4vmin,44px);color:#fff4e2;-webkit-text-stroke:2px #1a1424;paint-order:stroke fill;filter:drop-shadow(0 2px 0 #1a1424) drop-shadow(5px 5px 0 #d9ac34);transform:rotate(-1.6deg);letter-spacing:.02em}
#dmp .sub{font-size:min(2.1vmin,16px);color:#d8cce6;text-shadow:0 2px 0 #1a1424}
#dmp .sub b{padding:.1vmin 1vmin;border:2px solid #1a1424;border-radius:.6vmin;box-shadow:2px 2px 0 #1a1424;color:#1a1424}
#dmp .tmr{margin-left:auto;position:relative;width:min(10vmin,80px);height:min(10vmin,80px);border-radius:50%;background:conic-gradient(#ffd24a var(--p),#2a2140 0);box-shadow:0 0 0 3px #1a1424,5px 5px 0 #1a1424;display:grid;place-items:center}
#dmp .tmr i{position:absolute;inset:14%;border-radius:50%;background:#1a1424}
#dmp .tmr b{position:relative;font-size:min(4.2vmin,34px);color:#fff4e2}
#dmp .tmr.low{background:conic-gradient(#ff5a5a var(--p),#2a2140 0)}
#dmp .ld{display:flex;gap:1.6vmin;align-items:stretch}
#dmp .sl{flex:1;min-width:0;display:flex;align-items:center;gap:1.2vmin;padding:.9vmin 1.4vmin;background:#e0d6c0;color:#1a1424;border:2.5px solid #1a1424;border-radius:1.4vmin .5vmin 1.6vmin .5vmin/.5vmin 1.4vmin .5vmin 1.4vmin;box-shadow:5px 5px 0 #5e4f86;transform:rotate(var(--r,-.6deg));cursor:pointer;position:relative}
#dmp .sl:nth-child(2){--r:.7deg}#dmp .sl:nth-child(3){--r:-.3deg}
#dmp .sl.em{background:#2a2140;color:#8a7fa8;border-style:dashed;border-color:#6b5c90;box-shadow:none;cursor:default}
#dmp .sl small{display:block;font-size:min(1.5vmin,11px);color:#5b4f78;letter-spacing:.08em}
#dmp .sl.em small{color:#8a7fa8}
#dmp .sl b{display:block;font-size:min(2.2vmin,17px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dmp .sl .nb{flex:none;width:min(4.6vmin,36px);height:min(4.6vmin,36px);display:grid;place-items:center;border-radius:50%;background:#d9ac34;border:2px solid #1a1424;font-size:min(2.2vmin,17px)}
#dmp .sl img{height:min(5.4vmin,42px);flex:none;image-rendering:pixelated}
#dmp .sl.gun img{height:min(4.6vmin,36px);max-width:40%;object-fit:contain}
#dmp .sl .x{position:absolute;right:.8vmin;top:.4vmin;font-size:min(1.7vmin,13px);opacity:.5}
#dmp .go{flex:none;display:grid;place-items:center;text-align:center;min-width:min(19vmin,150px);font:inherit;font-size:min(2.8vmin,22px);color:#1a1424;background:linear-gradient(transparent 0 58%,#c8741a59 58%),#ffd24a;border:2.5px solid #1a1424;border-radius:1.2vmin .4vmin 1.4vmin .4vmin;box-shadow:5px 5px 0 #1a1424;cursor:pointer;transform:rotate(1deg)}
#dmp .go:hover{transform:rotate(0) translateY(-.4vmin)}
#dmp .go.on{background:#7dff9a}
#dmp .bd{flex:1;min-height:0;display:flex;gap:2vmin}
#dmp .pn{display:flex;flex-direction:column;min-height:0;background:rgba(10,6,18,.55);border:2px solid #1a1424;border-radius:1.2vmin;box-shadow:inset 0 0 0 1px #3b2d5c}
#dmp .pn h2{margin:0;padding:.9vmin 1.4vmin .4vmin;font-size:min(2.2vmin,17px);letter-spacing:.12em;color:#ffd24a;text-shadow:2px 2px 0 #1a1424}
#dmp .pn h2 small{color:#a99cc4;letter-spacing:0;font-size:min(1.6vmin,12px);margin-left:1vmin}
#dmp .gr{flex:1;overflow-y:auto;display:grid;gap:1.2vmin;padding:1vmin 1.4vmin 1.6vmin;align-content:start;scrollbar-width:thin;scrollbar-color:#6b5c90 transparent}
#dmp .gw{flex:1.15}#dmp .gw .gr{grid-template-columns:repeat(auto-fill,minmax(min(21vmin,170px),1fr))}
#dmp .gp{flex:1}#dmp .gp .gr{grid-template-columns:repeat(auto-fill,minmax(min(14vmin,112px),1fr))}
#dmp .wc,#dmp .pc{position:relative;text-align:left;font:inherit;color:#1a1424;background:linear-gradient(158deg,transparent 0 63%,#6b58a02a 63% 100%),#e0d6c0;border:2px solid #1a1424;border-radius:1vmin .4vmin 1.2vmin .4vmin/.4vmin 1vmin .4vmin 1vmin;box-shadow:3px 3px 0 #1a1424;cursor:pointer;padding:.8vmin 1vmin;transition:transform .08s}
#dmp .wc:hover,#dmp .pc:hover{transform:translateY(-.4vmin);box-shadow:4px 6px 0 #5e4f86;background-color:#fffaf0}
#dmp .wc.sel,#dmp .pc.sel{background:linear-gradient(158deg,transparent 0 63%,#c8741a33 63% 100%),#ffe9a6;box-shadow:0 0 0 2.5px #ffd24a,4px 4px 0 #1a1424}
#dmp .pc.dim{opacity:.45}
#dmp .wc .nm{display:inline-block;font-size:min(1.7vmin,13px);background:linear-gradient(transparent 0 58%,#c8741a59 58%),#d9ac34;border:2px solid #1a1424;border-radius:8px 3px 9px 3px/3px 8px 3px 8px;padding:.1vmin .8vmin;margin:-.2vmin 0 .3vmin -.4vmin;transform:rotate(-1.5deg);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}
#dmp .wc img{display:block;width:100%;height:min(6vmin,48px);object-fit:contain;transform:rotate(-3deg);pointer-events:none}
#dmp .wc .tx{position:absolute;right:-.6vmin;top:-.8vmin;font-size:min(1.9vmin,15px);padding:0 .7vmin;border:2px solid #1a1424;border-radius:.5vmin;box-shadow:2px 2px 0 #1a1424;transform:rotate(5deg);z-index:1}
#dmp .wc .tx.v3{background:#7dff9a}#dmp .wc .tx.v2{background:#ffd24a}#dmp .wc .tx.v1{background:#ff8a8a}
#dmp .bars{display:grid;grid-template-columns:auto 1fr;gap:.25vmin .7vmin;align-items:center;font-size:min(1.35vmin,10px);color:#5b4f78;margin-top:.3vmin}
#dmp .bars i{display:block;height:.75vmin;min-height:4px;background:#2a2140;border-radius:1px;overflow:hidden}
#dmp .bars i u{display:block;height:100%;background:#d9ac34}
#dmp .pc{display:flex;flex-direction:column;align-items:center;gap:.3vmin;text-align:center;padding:.8vmin .4vmin .7vmin}
#dmp .pc img{width:min(5.2vmin,40px);height:min(5.2vmin,40px);pointer-events:none}
#dmp .pc .nb{width:min(5.2vmin,40px);height:min(5.2vmin,40px);display:grid;place-items:center;border-radius:50%;background:#d9ac34;border:2px solid #1a1424;font-size:min(2.4vmin,18px)}
#dmp .pc span{font-size:min(1.6vmin,12px);line-height:1.15;color:#1a1424;opacity:1}
#dmp .bars span{color:#5b4f78;opacity:1}
#dmp .pc em{position:absolute;right:-.6vmin;top:-.8vmin;font-style:normal;font-size:min(1.6vmin,12px);background:#ffd24a;border:2px solid #1a1424;border-radius:.5vmin;padding:0 .5vmin;box-shadow:2px 2px 0 #1a1424;transform:rotate(6deg)}
#dmp .pc em.two{background:#7dff9a}
#dmp .pc.max{filter:grayscale(1);opacity:.6;background:#cfc8bc;box-shadow:3px 3px 0 #1a1424}
#dmp .pc.max em{filter:none}
#dmp .pc.no{opacity:.55;cursor:not-allowed}
#dmp .pc.no::after{content:'';position:absolute;inset:12%;background:linear-gradient(45deg,transparent 45%,#d8262e 45% 55%,transparent 55%),linear-gradient(-45deg,transparent 45%,#d8262e 45% 55%,transparent 55%);pointer-events:none}
#dmtip{position:fixed;z-index:60;max-width:min(42vmin,330px);padding:.9vmin 1.2vmin;background:#fffaf0;color:#1a1424;border:2px solid #1a1424;border-radius:.8vmin .3vmin .9vmin .3vmin;box-shadow:4px 4px 0 #5e4f86;font:min(1.8vmin,14px)/1.35 "DotGothic16",monospace;pointer-events:none}
#dmtip b{display:inline-block;background:#d9ac34;padding:0 .6vmin;border:1.5px solid #1a1424;border-radius:.4vmin;margin-bottom:.4vmin}
#dmtip small{display:block;color:#5b4f78;margin-top:.3vmin}
#dmtip small.no{color:#d8262e}
#dmp .inf{min-height:min(5.6vmin,44px);padding:.8vmin 1.4vmin;background:#e0d6c0;color:#1a1424;border:2px solid #1a1424;border-radius:.8vmin;box-shadow:4px 4px 0 #5e4f86;font-size:min(1.8vmin,14px);line-height:1.35}
#dmp .inf b{background:#d9ac34;padding:0 .6vmin;border:1.5px solid #1a1424;border-radius:.4vmin;margin-right:.8vmin}
#dmp .inf small{color:#5b4f78;margin-left:.8vmin}`;document.head.appendChild(s)}

/* (0.9.368) o: Brighton uses this picker too, with one power, its own fresh rolls, every weapon and Phoenix Heart allowed */
function dmPick(pre,done,re,o){o=o||{};const NP=o.np||2;dmPickCss();if(!re)state='pre';document.exitPointerLock?.();
 const ws=o.free?WT:WT.filter(b=>b.t!='Hands'),R0=R,rolls=ws.map((b,i)=>{if(o.free){const w=genW(b);w.name=b.t;return w}R=mul(((seed>>>0)^Math.imul(i+1,0x9e3779b9))>>>0);let w;try{w=genW(b)}finally{R=R0}return w});
 /* which powers each gun allows (some are melee only, some gun only), worked out as if you held it with no powers yet */
 const okFor=[],ev=i=>{if(okFor[i])return okFor[i];const s0=Wp,s1=W2,s2=P.pw;Wp=rolls[i];W2=null;P.pw={};try{return okFor[i]=new Set(POW.filter(p=>!p.stat&&!p.shop&&!ARSX.includes(p.id)&&(o.free||p.id!='phoenix')&&powOk(p)).map(p=>p.id))}finally{Wp=s0;W2=s1;P.pw=s2}};
 const all=new Set();rolls.forEach((w,i)=>{for(const id of ev(i))all.add(id)});
 const ps=POW.filter(p=>all.has(p.id)),two=p=>{if(NP<2)return false;const m=powMaxN(p);return m===0||m>=2},mel=p=>/^Melee only/.test(p.d||''),okP=p=>wi<0?!mel(p):ev(wi).has(p.id);
 let wi=-1,pk=[],left=pre|0,ready=0,hov=null;
 /* picking again while dead: start from what you had */if(re&&DMLOAD){wi=DMLOAD.wi;pk=DMLOAD.pk.slice()}
 const e=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const pic=f=>{try{return f()}catch(er){return''}},tm=TM()?myTeam():-1;
 /* the stat bars: each gun against the best of the lot */
 const dps=w=>w.m?w.dmg*w.rate:w.dmg*(w.pel||1)*w.rate,rng=w=>w.m?(w.range||1):(WF[w.k]?WF[w.k][1]:10),mx={d:Math.max(...rolls.map(w=>w.dmg*(w.pel||1))),r:Math.max(...rolls.map(w=>w.rate)),s:Math.max(...rolls.map(dps)),g:Math.max(...rolls.filter(w=>!w.m).map(rng),1)};
 const bar=(l,v)=>`<span>${l}</span><i><u style="width:${Math.max(4,Math.min(100,v*100))|0}%"></u></i>`;
 ov.style.display='none';{const o=document.getElementById('dmp');if(o)o.remove()}const host=document.createElement('div');document.body.appendChild(host);host.outerHTML=`<div id="dmp"><div class="hd"><div><h1>${o.title||(re?'New loadout':CFG.mode=='tdm'?'Team Deathmatch':'Deathmatch')}</h1><div class="sub">${tm>=0?`You're on <b style="background:${TEAMC[tm]}">${TEAMN[tm]}</b> &nbsp;`:''}${o.sub||(re?'You respawn when you are done.':'Pick a gun and two powers.')}</div></div>${pre?`<div class="tmr" id="dmt" style="--p:100%"><i></i><b id="dmtn">${left}</b></div>`:''}</div>
 <div class="ld"><div class="sl gun em" id="dms0"></div>${Array.from({length:NP},(_,k)=>`<div class="sl em" id="dms${k+1}"></div>`).join('')}<button class="go" id="dmgo">${pre?'Ready':re?'Done':'Fight!'}</button></div>
 <div class="bd"><div class="pn gw"><h2>${o.free?'WEAPONS':'GUNS'}<small>${o.tax?'Points a kill: fewer the more players use it':o.free?'Your own rolls':'Same rolls for everyone'}</small></h2><div class="gr" id="dmw"></div></div><div class="pn gp"><h2>POWERS<small>${NP<2?'Pick one':'Pick two, or one twice if it stacks'}</small></h2><div class="gr" id="dmpw"></div></div></div></div>`;
 const $=id=>document.getElementById(id),W_=$('dmw'),PW=$('dmpw');
 rolls.forEach((w,i)=>{const b=document.createElement('button');b.className='wc';const ip=pic(()=>wPic(w));
  b.innerHTML=`${o.tax?'<div class="tx"></div>':''}<div class="nm">${e(w.name)}</div>${ip?`<img alt="" src="${ip}">`:''}<div class="bars">${w.m?bar('DMG',w.dmg/mx.d)+bar('SPD',w.rate/mx.r)+bar('RANGE',Math.sqrt(rng(w)/mx.g))+bar('DPS',dps(w)/mx.s):bar('DMG',w.dmg*(w.pel||1)/mx.d)+bar('RATE',w.rate/mx.r)+bar('RANGE',Math.sqrt(rng(w)/mx.g))+bar('DPS',dps(w)/mx.s)}</div>`;
  b.onclick=()=>{if(ready)return;wi=i;pk=pk.filter(j=>okP(ps[j]));tick(800);draw()};tipOn(b,()=>({w:i}));W_.appendChild(b)});
 if(o.tax){const iv=setInterval(()=>{if(!document.getElementById('dmp')){clearInterval(iv);return}draw()},1000)}
 ps.forEach((p,i)=>{const b=document.createElement('button');b.className='pc';const ip=pic(()=>pPic(p.id));b.innerHTML=`${ip?`<img alt="" src="${ip}">`:`<div class="nb">${e((p.n||'?')[0])}</div>`}<span>${e(p.n)}</span>`;
  b.onclick=()=>{if(ready)return;if(!okP(p)){tick(220);return}const n=pk.filter(j=>j==i).length;if(NP==1&&n==0){pk=[i];tick(1000)}else if(pk.length<NP&&(n==0||n==1&&two(p))){pk.push(i);tick(1000)}else if(n>0){pk.splice(pk.lastIndexOf(i),1);tick(500)}else{tick(220);return}draw()};
  b.oncontextmenu=ev=>{ev.preventDefault();if(ready)return;const k=pk.lastIndexOf(i);if(k>=0){pk.splice(k,1);tick(500);draw()}};
  tipOn(b,()=>({p:i}));PW.appendChild(b)});
 const tick=f=>{try{snd(f,.04,'square',.03,-200)}catch(er){}};
 /* what the thing under the pointer does, in a card beside it */
 function tipOn(b,f){b.onmouseenter=ev=>{hov=f();tipShow(ev)};b.onmousemove=ev=>tipMove(ev);b.onmouseleave=()=>{hov=null;tipHide()}}
 function tipShow(ev){let t=document.getElementById('dmtip');if(!t){t=document.createElement('div');t.id='dmtip';document.body.appendChild(t)}let h='';
  if(hov&&hov.w!=null){const w=rolls[hov.w];h=`<b>${e(w.name)}</b><br>${e(typeof wdesc=='function'?wdesc(w):'')}${o.tax?(()=>{const n=brTax(w.k,1).n;return`<small>${n?n+' other'+(n>1?'s':'')+' using it.':'Nobody else is using it.'}</small>`})():''}`}
  else if(hov&&hov.p!=null){const p=ps[hov.p];let d='';try{d=powD(p)}catch(er){d=p.d}h=`<b>${e(p.n)}</b><br>${e(d)}${okP(p)?'':`<small class="no">${mel(p)?'Needs a melee weapon.':'Not with this weapon.'}</small>`}`}
  t.innerHTML=h;t.style.display=h?'block':'none';tipMove(ev)}
 function tipMove(ev){const t=document.getElementById('dmtip');if(!t)return;const r=t.getBoundingClientRect(),x=ev.clientX+16+r.width>innerWidth?ev.clientX-r.width-12:ev.clientX+16,y=Math.min(innerHeight-r.height-6,ev.clientY+14);t.style.left=x+'px';t.style.top=Math.max(4,y)+'px'}
 function tipHide(){const t=document.getElementById('dmtip');if(t)t.remove()}
 const info=()=>{};
 const slot=(k,html,empty,lab)=>{const s=$('dms'+k);s.classList.toggle('em',empty);s.innerHTML=empty?`<div><small>${lab}</small><b>${k?'Empty':o.free?'Pick a weapon':'Pick a gun'}</b></div>`:html};
 const draw=()=>{[...W_.children].forEach((b,i)=>{b.classList.toggle('sel',i==wi);const x=b.querySelector('.tx');if(x){const v=brTax(rolls[i].k).v;x.textContent='+'+v;x.className='tx v'+v;x.title=''}});
  [...PW.children].forEach((b,i)=>{const n=pk.filter(j=>j==i).length;b.classList.toggle('sel',n>0);b.classList.toggle('dim',NP>1&&pk.length>=NP&&n==0);b.classList.toggle('no',!okP(ps[i]));b.classList.toggle('max',NP>1&&n>0&&(n>1||!two(ps[i])));let t=b.querySelector('em');if(n){if(!t){t=document.createElement('em');b.appendChild(t)}t.textContent=n>1?'×2':'✓';t.className=n>1?'two':''}else if(t)t.remove()});
  if(wi>=0){const w=rolls[wi],ip=pic(()=>wPic(w));slot(0,`${ip?`<img alt="" src="${ip}">`:''}<div style="min-width:0"><small>${o.free?'WEAPON':'GUN'}</small><b>${e(w.name)}</b></div>`,false)}else slot(0,'',true,o.free?'WEAPON':'GUN');
  for(let k=0;k<NP;k++){const i=pk[k];if(i==null){slot(k+1,'',true,NP>1?'POWER '+(k+1):'POWER');continue}const p=ps[i],ip=pic(()=>pPic(p.id));slot(k+1,`${ip?`<img alt="" src="${ip}">`:`<div class="nb">${e((p.n||'?')[0])}</div>`}<div style="min-width:0"><small>POWER${NP>1?' '+(k+1):''}</small><b>${e(p.n)}</b></div><span class="x">✕</span>`,false)}
  const g=$('dmgo');if(g){g.classList.toggle('on',!!ready);g.textContent=ready?'Ready ✓':pre?'Ready':re?'Done':'Fight!'}};
 for(let k=1;k<=NP;k++)$('dms'+k).onclick=()=>{if(ready||pk[k-1]==null)return;pk.splice(k-1,1);tick(500);draw()};
 const fin=()=>{tipHide();if(!re){clearInterval(preTimer);if(!DM||state!='pre')return}
  if(wi<0)wi=Math.floor(Math.random()*rolls.length);pk=pk.filter(j=>okP(ps[j]));
  while(pk.length<NP){const ok=ps.map((p,i)=>i).filter(i=>{const n=pk.filter(j=>j==i).length;return okP(ps[i])&&(n==0||n==1&&two(ps[i]))});if(!ok.length)break;pk.push(ok[Math.floor(Math.random()*ok.length)])}
  if(!o.free)DMLOAD={wi,pk:pk.slice()};{const o=document.getElementById('dmp');if(o)o.remove()}
  if(re){dmLoadout(rolls[wi],pk.map(i=>ps[i]));DMREPICK=0;lockPtr();return}
  Wp=Object.assign({},rolls[wi]);W2=null;CURS=0;P.ammo=MG();for(const i of pk)give(ps[i]);ov.style.display='none';lockPtr();done()};
 $('dmgo').onclick=()=>{if(!pre){if(re&&wi<0){tick(220);return}fin();return}ready=!ready;tick(ready?1300:600);draw()};
 info();draw();
 if(pre)preTimer=setInterval(()=>{left--;const t=$('dmtn'),r=$('dmt');if(t)t.textContent=Math.max(0,left);if(r){r.style.setProperty('--p',Math.max(0,left/pre*100)+'%');r.classList.toggle('low',left<=5)}if(left>0&&left<=5)tick(900);if(left<=0)fin()},1000)}

/* ---- picking again while dead ---- */
const dmRepickOk=()=>DM&&(CFG.mode=='dm'||CFG.mode=='tdm'||CFG.mode=='brighton')&&!SPEC&&state=='play'&&P&&P.deadT>0&&!POTGV&&!DMREPICK;
function dmRepickOpen(){if(!dmRepickOk())return;DMREPICK=1;keys={};mdown=0;try{dmPick(0,()=>{},1,CFG.mode=='brighton'?brOpt(1):undefined)}catch(er){DMREPICK=0;console.error(er)}}
/* the new loadout replaces the old one: powers are taken away by starting the player over from the base numbers, then given again */
function dmLoadout(w,pows){const o=P,keep=['x','y','z','cz','a','pt','vz','gr','deadT','killedBy','lastBy','lastByT','lv','sf','sh','team'];
 P={x:0,y:0,a:0,hp:100,mhp:100,dm:1,rf:1,sp:1,pw:{},cd:0,kick:0,hurt:0,last:0,hit:0,dash:0,chrono:0,chronoCd:0,nova:0,novaCd:0,dv:0,inv:0,bob:0,adr:0,ag:0,rl:1,mm:1,cdr:1,reload:0,sf:0,sh:0,zoom:0,pt:0,deadT:0};
 for(const k of keep)if(o[k]!==undefined)P[k]=o[k];Wp=Object.assign({},w);W2=null;CURS=0;for(const p of pows)give(p);P.ammo=MG();P.hp=0;try{snd(780,.1,'triangle',.05,200)}catch(er){}}
addEventListener('keydown',e=>{if(e.code!=='KeyR'||e.repeat||CHATOPEN||CONOPEN||PZ)return;if(dmRepickOk()){e.preventDefault();dmRepickOpen()}},true);
function dmRepickHud(){if(!dmRepickOk())return;ctx.save();ctx.font='8px "DotGothic16",monospace';ctx.textBaseline='top';ctx.textAlign='left';
 const t='Change loadout',tw=ctx.measureText(t).width,w=Math.round(tw+27),h=14,x=Math.round(LW/2-w/2),y=Math.round(LH*.68);
 ctx.fillStyle='#1a1424';ctx.fillRect(x+2,y+2,w,h);ctx.fillStyle='#e0d6c0';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#1a1424';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);
 ctx.fillStyle='#d9ac34';ctx.fillRect(x+3,y+2.5,10,9);ctx.strokeRect(x+3,y+2.5,10,9);ctx.fillStyle='#1a1424';ctx.fillText('R',x+5.5,y+3.5);ctx.fillText(t,x+18,y+3.5);ctx.restore()}

/* ===== 0.9.353: the ledger: every run you play is written down, and the undertaker keeps the book =====
   When a run ends (you die, the co-op party falls, the run is completed, or you leave a run you had been playing for a while) a short
   record is saved on this computer: when it was, how it ended, the floor, kills, time, damage, every weapon used and every power taken.
   The book stands on a lectern in Frontier Town's undertaker's; it opens as a real two-page book you leaf through (A / D or the arrow keys,
   or click a page), newest run first. Esc, E or Tab closes it. */
const LED_KEY='ld_ledger',LED_MAX=300;
function ledLoad(){try{const a=JSON.parse(localStorage.getItem(LED_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function ledStore(a){try{localStorage.setItem(LED_KEY,JSON.stringify(a.slice(-LED_MAX)))}catch(e){}}
/* res: 'died' | 'won' | 'fell' (co-op party) | 'left'; o: {by, boss, cause, floor, kills, dmg} */
function ledSave(res,o){o=o||{};const S=typeof RUNST!='undefined'?RUNST:null;if(!S||S.saved)return;const coop=typeof CFG=='object'&&CFG.mode=='coop';
 if(!(coop||typeof CFG!='object'||CFG.mode=='classic'))return;if(typeof DBGT!='undefined'&&DBGT)return;
 if(res=='left'&&!((S.t||0)>15))return;S.saved=1;
 const cnt={},pw=[];for(const p of S.pw||[]){if(!cnt[p.id]){cnt[p.id]=[p.id,p.n,0,p.r?1:0];pw.push(cnt[p.id])}cnt[p.id][2]++}
 const held=new Set([typeof Wp=='object'&&Wp&&Wp.name,typeof W2=='object'&&W2&&W2.name].filter(Boolean));
 const r={v:1,d:Date.now(),m:coop?'coop':'solo',np:coop&&typeof DMS=='object'&&DMS&&DMS.scores?DMS.scores.length:1,res,by:o.by||'',boss:o.boss?1:0,cause:o.cause||'',
  fl:o.floor!=null?o.floor:(typeof fl=='number'?fl:0),k:o.kills!=null?o.kills:(typeof kills=='number'?kills:0),t:Math.round(S.t||0),dmg:Math.round(o.dmg!=null?o.dmg:S.dmg||0),
  best:Math.round(S.best||0),bestW:S.bestW||'',mg:S.mg||{},sd:typeof seed=='number'?seed:0,pw,wp:(S.wp||[]).map(w=>[w.n,w.k,w.hue||0,held.has(w.n)?1:0,w.f|0])};
 const a=ledLoad();a.push(r);ledStore(a)}
addEventListener('beforeunload',()=>{try{ledSave('left')}catch(e){}});
/* (0.9.356) minigames: how many times each has been played and won, kept for good (ld_mg), and the ones won in this run (written into its record) */
const LED_MG=[['race','Horse Race'],['duel','Duel'],['hock','Air Hockey'],['hack','Lab Hack'],['roul','Roulette'],['tix','Scratch-Offs']];
function ledMgLoad(){try{const o=JSON.parse(localStorage.getItem('ld_mg')||'{}');return o&&typeof o=='object'?o:{}}catch(e){return{}}}
function ledMg(k,win){const o=ledMgLoad(),c=o[k]||(o[k]={p:0,w:0});c.p++;if(win)c.w++;try{localStorage.setItem('ld_mg',JSON.stringify(o))}catch(e){}
 const S=typeof RUNST!='undefined'?RUNST:null;if(S&&win){S.mg=S.mg||{};S.mg[k]=(S.mg[k]|0)+1}}

/* ---- the book ---- */
let LED=null;
function ledCss(){if(document.getElementById('ledcss'))return;const s=document.createElement('style');s.id='ledcss';s.textContent=`
#ledger{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(20,12,8,.72),rgba(6,3,2,.92));font-family:'IM Fell English',Georgia,serif;color:#2a1a10;user-select:none}
#ledger .bk{position:relative;width:min(94vw,128vh,1180px);aspect-ratio:1.5;padding:1.6%;box-sizing:border-box;border-radius:1.2% / 1.8%;background:linear-gradient(135deg,#4a1814,#2a0c0a 60%,#3a1210);box-shadow:0 2vmin 6vmin rgba(0,0,0,.7),inset 0 0 0 .35vmin #8a5a2a,inset 0 0 2vmin rgba(0,0,0,.6);perspective:260vmin}
#ledger .sp{position:absolute;inset:1.6%;display:flex}
#ledger .pg{position:relative;flex:1;overflow:hidden;background:#efe2c2;background-image:radial-gradient(ellipse at 50% 40%,rgba(255,250,232,.65),rgba(0,0,0,0) 70%),linear-gradient(90deg,rgba(120,80,30,.0),rgba(120,80,30,.0)),repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 3.1vmin,rgba(90,110,150,.16) 3.1vmin 3.2vmin);padding:4% 6% 4% 7%;box-sizing:border-box}
#ledger .pg.l{border-radius:.6vmin 0 0 .6vmin;box-shadow:inset -3vmin 0 3vmin -1.5vmin rgba(60,30,10,.45),inset 0 0 3vmin rgba(120,80,30,.35)}
#ledger .pg.r{border-radius:0 .6vmin .6vmin 0;box-shadow:inset 3vmin 0 3vmin -1.5vmin rgba(60,30,10,.45),inset 0 0 3vmin rgba(120,80,30,.35);padding:4% 7% 4% 6%}
#ledger .lf{position:absolute;top:1.6%;bottom:1.6%;width:48.4%;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.45,.05,.3,1);z-index:3}
#ledger .lf>.pg{position:absolute;inset:0;backface-visibility:hidden}
#ledger .lf>.bkf{transform:rotateY(180deg)}
#ledger .n{display:flex;justify-content:space-between;font-size:min(1.9vmin,15px);opacity:.75;font-style:italic;border-bottom:1px solid rgba(80,40,20,.35);padding-bottom:.6vmin}
#ledger h2{font-family:'IM Fell English SC','IM Fell English',Georgia,serif;font-weight:normal;font-size:min(4.2vmin,36px);margin:1.6vmin 0 .2vmin;color:#3a140c;line-height:1.05}
#ledger .by{font-style:italic;font-size:min(2.2vmin,18px);color:#5a2a18;min-height:1.2em}
#ledger .st{display:flex;gap:1.2vmin;margin:1.6vmin 0 1.2vmin}
#ledger .st div{flex:1;text-align:center;border:1px solid rgba(80,40,20,.35);padding:.6vmin 0 .4vmin;background:rgba(255,248,226,.35)}
#ledger .st b{display:block;font-size:min(3.2vmin,26px);font-weight:normal;color:#2a1208}
#ledger .st small{font-size:min(1.5vmin,12px);text-transform:uppercase;letter-spacing:.08em;opacity:.7}
#ledger h3{font-family:'IM Fell English SC','IM Fell English',Georgia,serif;font-weight:normal;font-size:min(2.3vmin,19px);margin:1vmin 0 .5vmin;border-bottom:1px dashed rgba(80,40,20,.35);color:#4a1a10}
#ledger .ls{display:flex;flex-wrap:wrap;gap:.35vmin 1.4vmin;font-size:min(1.85vmin,15px);line-height:1.25}
#ledger .ls span{display:inline-flex;align-items:center;gap:.5vmin;white-space:nowrap}
#ledger .ls img{height:min(3.4vmin,28px);image-rendering:pixelated;filter:sepia(.35) contrast(1.05)}
#ledger .ls .h{font-weight:bold;color:#3a120a}
#ledger .ls .rr{color:#8a4a08}
#ledger .ft{position:absolute;left:7%;right:7%;bottom:6.5%;font-size:min(1.5vmin,12px);opacity:.55;font-style:italic;display:flex;justify-content:space-between}
#ledger .tt{text-align:center;padding-top:5%}#ledger .tt table.mg{font-size:min(1.9vmin,15px)}#ledger .tt table.mg td{padding:.3vmin 1.6vmin}
#ledger .tt h1{font-family:'IM Fell English SC','IM Fell English',Georgia,serif;font-weight:normal;font-size:min(7vmin,60px);margin:0;color:#3a140c;letter-spacing:.06em}
#ledger .tt .sub{font-style:italic;font-size:min(2.2vmin,18px);opacity:.8;margin:.6vmin 0 4vmin}
#ledger .tt .orn{font-size:min(3vmin,24px);opacity:.6;margin:2vmin 0}
#ledger .tt table{margin:0 auto;font-size:min(2.2vmin,18px);border-collapse:collapse}
#ledger .tt td{padding:.5vmin 1.6vmin;border-bottom:1px dotted rgba(80,40,20,.35)}
#ledger .tt td:last-child{text-align:right;font-weight:bold}
#ledger .em{text-align:center;font-style:italic;opacity:.6;margin-top:30%;font-size:min(2.4vmin,20px)}
#ledger .pn{position:absolute;bottom:2.4%;font-size:min(1.6vmin,13px);opacity:.5}
#ledger .pg.l .pn{left:6%}#ledger .pg.r .pn{right:6%}
#ledger .nav{margin-top:1.8vmin;display:flex;justify-content:center;gap:2vmin;font-family:"DotGothic16",monospace;font-size:min(1.9vmin,15px);color:#f4e6c8}
#ledger .nav button{all:unset;cursor:pointer;padding:.6vmin 1.8vmin;border:1px solid rgba(244,230,200,.5);border-radius:.4vmin;background:rgba(40,20,12,.6)}
#ledger .nav button:hover{background:rgba(120,60,30,.7)}
#ledger .nav button:disabled{opacity:.3;cursor:default}
#ledger .stain{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(120,70,20,0) 55%,rgba(120,70,20,.18) 62%,rgba(120,70,20,0) 70%)}`;document.head.appendChild(s);
 if(!document.getElementById('ledfont')){const l=document.createElement('link');l.id='ledfont';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap';document.head.appendChild(l)}}
const ledEsc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function ledDate(d){const x=new Date(d);return x.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+'  ·  '+x.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}
function ledHead(r){if(r.res=='won')return'Run complete on floor '+r.fl;if(r.res=='fell')return'The party fell on floor '+r.fl;if(r.res=='left')return'Left on floor '+r.fl;return(r.cause||'Died')+' on floor '+r.fl}
function ledPage(r,no){if(!r)return'';const e=ledEsc,num=v=>typeof rsNum=='function'?rsNum(v):String(v),tm=v=>typeof rsTime=='function'?rsTime(v):v+'s';
 let h=`<div class="n"><span>No. ${no}</span><span>${e(ledDate(r.d))}</span></div><h2>${e(ledHead(r))}</h2><div class="by">${r.res=='died'&&r.by?'Killed by '+e(r.by)+(r.boss?' (boss)':''):''}</div>`;
 h+=`<div class="st"><div><b>${r.fl}</b><small>Floor</small></div><div><b>${num(r.k)}</b><small>Kills</small></div><div><b>${tm(r.t)}</b><small>Time</small></div><div><b>${num(r.dmg)}</b><small>Damage</small></div></div>`;
 const wp=(r.wp||[]).map(w=>{let pic='';try{pic=wPic({k:w[1],hue:w[2]})}catch(er){}return`<span${w[3]?' class="h" title="Carried at the end"':''}>${pic?`<img alt="" src="${pic}">`:''}${e(w[0])}</span>`}).join('');
 h+=`<h3>Weapons</h3><div class="ls">${wp||'<i>None</i>'}</div>`;
 const pw=(r.pw||[]).map(p=>{let pic='';try{pic=pPic(p[0])}catch(er){}return`<span${p[3]?' class="rr"':''}>${pic?`<img alt="" src="${pic}">`:''}${e(p[1])}${p[2]>1?' ×'+p[2]:''}</span>`}).join('');
 h+=`<h3>Powers</h3><div class="ls">${pw||'<i>None</i>'}</div>`;
 const mg=LED_MG.filter(([k])=>r.mg&&r.mg[k]>0).map(([k,n])=>`<span>${n}${r.mg[k]>1?' ×'+r.mg[k]:''}</span>`).join('');if(mg)h+=`<h3>Minigames won</h3><div class="ls">${mg}</div>`;
 h+=`<div class="ft"><span>${r.m=='coop'?'Co-op'+(r.np>1?', '+r.np+' players':''):'Solo'}</span><span>${r.best?'Best hit '+num(r.best)+(r.bestW?' ('+e(r.bestW)+')':''):''}</span></div>`;
 return h}
function ledTitle(a){const MG=ledMgLoad(),runs=a.length,deaths=a.filter(r=>r.res=='died'||r.res=='fell').length,mk=a.reduce((m,r)=>Math.max(m,r.k|0),0),best=a.reduce((m,r)=>Math.max(m,r.fl|0),0),k=a.reduce((m,r)=>m+(r.k|0),0),t=a.reduce((m,r)=>m+(r.t|0),0);
 const num=v=>typeof rsNum=='function'?rsNum(v):String(v),tm=v=>typeof rsTime=='function'?rsTime(v):v+'s';
 return`<div class="tt"><h1>Ledger</h1><div class="sub">Kept by the undertaker. Every run you've made.</div><div class="orn">✠</div><table><tr><td>Runs</td><td>${runs}</td></tr><tr><td>Buried</td><td>${deaths}</td></tr><tr><td>Most kills in a run</td><td>${num(mk)}</td></tr><tr><td>Deepest floor</td><td>${best}</td></tr><tr><td>Kills</td><td>${num(k)}</td></tr><tr><td>Time</td><td>${tm(t)}</td></tr></table><div class="orn" style="margin:2.4vmin 0 1vmin;font-size:min(2.1vmin,17px)">Minigames won</div><table class="mg">${LED_MG.map(([k,n])=>{const c=MG[k]||{p:0,w:0};return`<tr><td>${n}</td><td>${c.w}<small style="font-weight:normal;opacity:.6"> of ${c.p}</small></td></tr>`}).join('')}</table></div>`}
/* the book as spreads: [title, newest], [2nd, 3rd], ... (newest first) */
function ledSpread(i){const a=LED.a,N_=a.length,at=j=>{const k=N_-1-j;return k>=0?ledPage(a[k],k+1):''};if(i==0)return[ledTitle(a),N_?at(0):'<div class="em">No runs written down yet.</div>'];return[at(2*i-1),at(2*i)]}
function ledSpreads(){return Math.max(1,1+Math.ceil(Math.max(0,LED.a.length-1)/2))}
function ledStain(seed){let h='';for(let i=0;i<2;i++){const r=(Math.sin(seed*91.7+i*13.1)*43758.5453)%1,q=Math.abs(r);if(q<.55)continue;const s=8+q*14;h+=`<div class="stain" style="width:${s}vmin;height:${s}vmin;left:${(q*70)|0}%;top:${((q*137)%70)|0}%"></div>`}return h}
function ledPg(side,html,pn,seed){return`<div class="pg ${side}">${html}${ledStain(seed)}${pn?`<div class="pn">${pn}</div>`:''}</div>`}
function ledDraw(){const bk=LED.el.querySelector('.bk'),[l,r]=ledSpread(LED.i);bk.querySelector('.sp').innerHTML=ledPg('l',l,LED.i?2*LED.i:0,LED.i*2)+ledPg('r',r,2*LED.i+1,LED.i*2+1);
 const nv=LED.el.querySelector('.nav');nv.querySelector('#ledp').disabled=LED.i<=0;nv.querySelector('#ledn').disabled=LED.i>=ledSpreads()-1}
/* turning a page: a leaf swings round the spine, the old page on its front and the new one on its back */
function ledTurn(d){if(!LED||LED.busy)return;const n=LED.i+d;if(n<0||n>=ledSpreads())return;LED.busy=1;const bk=LED.el.querySelector('.bk'),sp=bk.querySelector('.sp'),[ol,or]=ledSpread(LED.i),[nl,nr]=ledSpread(n);
 const lf=document.createElement('div');lf.className='lf';
 if(d>0){sp.innerHTML=ledPg('l',ol,LED.i?2*LED.i:0,LED.i*2)+ledPg('r',nr,2*n+1,n*2+1);lf.style.left='50%';lf.style.transformOrigin='0 50%';lf.innerHTML=ledPg('r',or,2*LED.i+1,LED.i*2+1)+ledPg('l bkf',nl,2*n,n*2)}
 else{sp.innerHTML=ledPg('l',nl,n?2*n:0,n*2)+ledPg('r',or,2*LED.i+1,LED.i*2+1);lf.style.left='1.6%';lf.style.transformOrigin='100% 50%';lf.innerHTML=ledPg('l',ol,LED.i?2*LED.i:0,LED.i*2)+ledPg('r bkf',nr,2*n+1,n*2+1)}
 bk.appendChild(lf);void lf.offsetWidth;lf.style.transform=`rotateY(${d>0?-180:180}deg)`;
 try{for(let k=0;k<3;k++)setTimeout(()=>snd(2200+Math.random()*1800,.05,'sawtooth',.012,-1500),k*70)}catch(er){}
 LED.i=n;setTimeout(()=>{lf.remove();if(LED){LED.busy=0;ledDraw()}},580)}
function ledOpen(){if(LED)return;ledCss();const W=typeof WEST!='undefined'?WEST:null;if(W)W.live=1;state='pick';document.exitPointerLock?.();try{keys={};mdown=0}catch(er){}
 const el=document.createElement('div');el.id='ledger';el.innerHTML=`<div class="bk"><div class="sp"></div></div><div class="nav"><button id="ledp">◀ Back  (A)</button><button id="ledx">Close  (Esc)</button><button id="ledn">Next  (D) ▶</button></div>`;document.body.appendChild(el);
 LED={el,a:ledLoad(),i:0,busy:0};ledDraw();
 el.querySelector('#ledp').onclick=e=>{e.stopPropagation();ledTurn(-1)};el.querySelector('#ledn').onclick=e=>{e.stopPropagation();ledTurn(1)};el.querySelector('#ledx').onclick=e=>{e.stopPropagation();ledClose()};
 el.querySelector('.sp').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();ledTurn(e.clientX>r.left+r.width/2?1:-1)};
 el.addEventListener('mousedown',e=>e.stopPropagation());el.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();ledTurn(e.deltaY>0?1:-1)},{passive:false});
 LED.kd=e=>{if(!LED)return;const c=e.code;if(c=='KeyD'||c=='ArrowRight'||c=='PageDown'){ledTurn(1)}else if(c=='KeyA'||c=='ArrowLeft'||c=='PageUp'){ledTurn(-1)}else if(c=='Escape'||c=='KeyE'||c=='Tab'||c=='KeyF'){ledClose()}else return;e.preventDefault();e.stopImmediatePropagation()};
 addEventListener('keydown',LED.kd,true);try{snd(180,.18,'triangle',.05,-60)}catch(er){}}
function ledClose(){if(!LED)return;removeEventListener('keydown',LED.kd,true);LED.el.remove();LED=null;if(state=='pick')state='play';try{keys={};mdown=0}catch(er){}try{lockPtr()}catch(er){}}

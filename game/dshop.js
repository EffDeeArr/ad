/* ---------- the dungeon shop: on about half of the ordinary dungeon floors one small room holds a table of three powers for $50 each and a skull-masked shopkeeper ---------- */
let DSH=null,DSHS=null;
const DSH_PRICE=50;
function dshSprites(){if(DSHS)return DSHS;
const table=mk(g=>{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(32,60,27,4,0,0,7);g.fill();
for(const x of[9,49]){g.fillStyle='#4a2c10';g.fillRect(x,40,6,20);g.fillStyle='#6d4421';g.fillRect(x,40,2,20)}
g.fillStyle='#5e3b1a';g.fillRect(6,34,52,10);g.fillStyle='#8a5a2b';g.fillRect(6,34,52,4);g.fillStyle='#3a2208';g.fillRect(6,43,52,2);
g.fillStyle='#b8202c';g.fillRect(14,38,36,7);g.fillStyle='#e8c35a';for(let i=0;i<7;i++)g.fillRect(14+i*5.5,43,2.4,3);
const orbs=[[18,'#ffd24a'],[32,'#6cf'],[46,'#ff6a8a']];for(const[x,c]of orbs){const gr=g.createRadialGradient(x,27,1,x,27,12);gr.addColorStop(0,c);gr.addColorStop(.4,c);gr.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=.55;g.fillStyle=gr;g.beginPath();g.arc(x,27,12,0,7);g.fill();g.globalAlpha=1;g.fillStyle='#2a1d12';g.fillRect(x-4,31,8,4);g.fillStyle=c;g.beginPath();g.arc(x,27,5,0,7);g.fill();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(x-1.5,25.5,1.8,0,7);g.fill()}});
const keeper=mk(g=>{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(32,61,16,3,0,0,7);g.fill();
g.fillStyle='#2a1a3e';g.beginPath();g.moveTo(32,22);g.lineTo(48,34);g.lineTo(53,62);g.lineTo(11,62);g.lineTo(16,34);g.closePath();g.fill();
g.fillStyle='#3d2859';g.beginPath();g.moveTo(32,24);g.lineTo(43,34);g.lineTo(40,62);g.lineTo(32,62);g.closePath();g.fill();
g.fillStyle='#c79a3a';g.fillRect(20,44,24,3);g.fillStyle='#e8c35a';g.fillRect(29,43,6,5);
g.fillStyle='#2a1a3e';g.beginPath();g.arc(32,17,13,0,7);g.fill();g.fillStyle='#1b1029';g.beginPath();g.arc(32,17,10.5,0,7);g.fill();
g.fillStyle='#ece8da';g.beginPath();g.ellipse(32,17,8,9.4,0,0,7);g.fill();g.fillStyle='#d4cfbd';g.beginPath();g.ellipse(34.5,18,4.5,8,0,0,7);g.fill();
g.fillStyle='#0b0612';g.beginPath();g.ellipse(28.5,15.5,2.6,3.2,0,0,7);g.fill();g.beginPath();g.ellipse(35.5,15.5,2.6,3.2,0,0,7);g.fill();
g.beginPath();g.moveTo(32,19);g.lineTo(30.4,22.5);g.lineTo(33.6,22.5);g.closePath();g.fill();
g.fillStyle='#0b0612';g.fillRect(26.5,24,11,1.4);for(let i=0;i<5;i++)g.fillRect(27.5+i*2.2,24,.9,3.4);
g.fillStyle='#e0c24a';g.fillRect(29,9.5,6,1.2);
g.fillStyle='#3d2859';g.fillRect(12,36,8,18);g.fillRect(44,36,8,18);g.fillStyle='#e6d9c2';g.beginPath();g.arc(16,56,3.6,0,7);g.arc(48,56,3.6,0,7);g.fill()});
const fire=[0,1,2].map(f=>mk(g=>{g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(32,58,18,4,0,0,7);g.fill();
g.fillStyle='#4a2c10';g.save();g.translate(32,56);g.rotate(.35);g.fillRect(-16,-3,32,6);g.rotate(-.7);g.fillRect(-16,-3,32,6);g.restore();
g.fillStyle='#6d4421';g.fillRect(16,55,32,3);
const fl=[[0,0],[2,-3],[-2,2]][f];const fs=[['#d02800',22,18],['#ff7a10',17,13],['#ffd24a',11,8]];
for(const[c,h,w]of fs){g.fillStyle=c;g.beginPath();g.moveTo(32-w+fl[0],56);g.quadraticCurveTo(32-w*.9,56-h*.6,32+fl[0]*1.5,56-h-fl[1]);g.quadraticCurveTo(32+w*.9,56-h*.6,32+w+fl[0],56);g.closePath();g.fill()}
g.globalAlpha=.25;const gr=g.createRadialGradient(32,46,2,32,46,26);gr.addColorStop(0,'#ffb040');gr.addColorStop(1,'rgba(255,120,0,0)');g.fillStyle=gr;g.fillRect(0,20,64,44)}));
return DSHS={table,keeper,fire}}
function dshopInit(skip){DSH=null;if(skip||DM||NET||SW||MAPT||bossFl||cq0()||TH.n!='Dungeon'||R()>=.5)return;
const ok=(x,y)=>x>0&&y>0&&x<N-1&&y<N-1&&!g[y*N+x]&&!pit[y*N+x]&&(TH.mine||!brg[y*N+x])&&!CH.some(c=>(c.x|0)==x&&(c.y|0)==y)&&!PRP.some(p=>(p.x|0)==x&&(p.y|0)==y&&(p.hk||p.m===undefined&&p.id===undefined&&!p.rock&&0));
const ins=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
let pool=rooms.slice(1).filter(r=>!r.gap&&r.w>=4&&r.h>=4&&!ins(r,P.x|0,P.y|0)&&!ins(r,ex.x|0,ex.y|0)&&!PRP.some(p=>p.hk));
if(!pool.length)return;const sm=pool.filter(r=>r.w>=5&&r.h>=5&&r.w*r.h<=64),rest=pool.filter(r=>!sm.includes(r));
for(const r of sample(sm,sm.length).concat(sample(rest,rest.length)))for(let si=0;si<4;si++){
/* the back of the shop is the side of the room with the fewest openings */
const sides=[[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>{let n=0;if(dy)for(let x=r.x;x<r.x+r.w;x++){const yy=dy<0?r.y-1:r.y+r.h;if(!g[yy*N+x])n++}else for(let y=r.y;y<r.y+r.h;y++){const xx=dx<0?r.x-1:r.x+r.w;if(!g[y*N+xx])n++}return{dx,dy,n}}).sort((a,b)=>a.n-b.n);
const b=sides[si],cx=r.x+(r.w>>1),cy=r.y+(r.h>>1);let kx,ky,tx,ty,f1,f2;
if(b.dy){ky=b.dy<0?r.y:r.y+r.h-1;kx=cx;ty=ky-b.dy*-1;ty=ky+(b.dy<0?1:-1);tx=cx;f1=[tx-1,ty];f2=[tx+1,ty]}
else{kx=b.dx<0?r.x:r.x+r.w-1;ky=cy;tx=kx+(b.dx<0?1:-1);ty=cy;f1=[tx,ty-1];f2=[tx,ty+1]}
if(!ok(kx,ky)||!ok(tx,ty)||!ok(f1[0],f1[1])||!ok(f2[0],f2[1]))continue;
if(!ins(r,f1[0],f1[1])||!ins(r,f2[0],f2[1]))continue;
if(E.some(e=>ins(r,e.x|0,e.y|0)&&Math.hypot(e.x-kx-.5,e.y-ky-.5)<1.6))continue;
const cells=[[kx,ky],[tx,ty],f1,f2],saveP=PRP,saveB=cells.map(([x,y])=>blk[y*N+x]);PRP=PRP.filter(p=>!cells.some(([x,y])=>(p.x|0)==x&&(p.y|0)==y));for(const[x,y]of cells)blk[y*N+x]=0;blk[ky*N+kx]=1;blk[ty*N+tx]=1;const undo=()=>{PRP=saveP;cells.forEach(([x,y],i)=>blk[y*N+x]=saveB[i])};if(!pathOk()){undo();continue}if(false){}
const items=sampleRew(POW.filter(p=>!p.stat&&powOk(p)),3);if(items.length<1){undo();return}
DSH={r,k:{x:kx+.5,y:ky+.5},t:{x:tx+.5,y:ty+.5},f:[{x:f1[0]+.5,y:f1[1]+.5},{x:f2[0]+.5,y:f2[1]+.5}],items:items.map(p=>({p,sold:0})),msg:'',mt:0};return}}
function dshList(L){if(!DSH||SHOPF)return;const S=dshSprites(),D=DSH;L.push({x:D.k.x,y:D.k.y,t:S.keeper,s:.98,fl:0,fb:0});L.push({x:D.t.x,y:D.t.y,t:S.table,s:.78,fl:0,fb:0});
for(let i=0;i<2;i++){const f=D.f[i];L.push({x:f.x,y:f.y,t:S.fire[((T*7+i*1.3)|0)%3],s:.5,fl:0,fb:1})}}
function dshNear(){return DSH&&!SHOPF&&state=='play'&&Math.hypot(P.x-DSH.t.x,P.y-DSH.t.y)<2}
function dshUse(){if(!DSH||!dshNear())return false;const D=DSH,left=D.items.filter(i=>!i.sold);keys={};
if(!left.length){D.msg='Sold out!';D.mt=2.2;snd(200,.12,'square',.05,-60);return true}
snd(620,.12,'triangle',.06,200);
const cards=left.map(i=>Object.assign({},i.p,{n:i.p.n+'  —  $'+DSH_PRICE}));cards.push({n:'Leave',d:'Keep your money.'});
choose('Shop','You have $'+(P.money|0)+'. Each power costs $'+DSH_PRICE+'.',cards,k=>{state='play';if(k>=left.length)return;
if((P.money|0)<DSH_PRICE){D.msg='Not enough money.';D.mt=2.2;snd(160,.2,'square',.06,-60);return}
P.money-=DSH_PRICE;give(left[k].p);left[k].sold=1;D.msg="It's dangerous to go alone! Take this";D.mt=4.2;snd(520,.12,'triangle',.08,300);setTimeout(()=>snd(780,.2,'triangle',.08,200),110)});return true}
function dshHud(){const D=DSH;if(!D||SHOPF||state!='play')return;if(D.mt>0)D.mt-=1/60;const c=ctx;c.save();c.textAlign='center';c.font='8px "DotGothic16",monospace';
if(D.mt>0&&D.msg&&Math.hypot(P.x-D.k.x,P.y-D.k.y)<9){c.globalAlpha=Math.min(1,D.mt*1.5);c.fillStyle='#000';c.fillText(D.msg,LW/2+1,LH*.3+1);c.fillStyle='#ffe9b0';c.fillText(D.msg,LW/2,LH*.3)}
else if(dshNear()){c.fillStyle='#000';c.fillText('[F] SHOP  -  $'+DSH_PRICE+' EACH',LW/2+1,LH*.3+1);c.fillStyle='#ffe9b0';c.fillText('[F] SHOP  -  $'+DSH_PRICE+' EACH',LW/2,LH*.3)}c.restore()}

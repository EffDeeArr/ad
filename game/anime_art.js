/* ===== anime_art.js - the level textures painted like a 90s cel-animation background =====
   The painting style follows the hand-painted backgrounds of 90s TV anime: poster-paint / gouache colour laid in flat, a soft airbrushed
   light-to-shadow gradient over each surface, a mottled, slightly streaky paint texture, thin hand-drawn line work in a dark shade of the
   local colour (never pure black, and a little wobbly), hard-edged flat shadows, and a pale highlight line on lit edges. Shadows lean
   blue-violet. Walls get weathering: rain streaks under ledges, cracks, chipped plaster.
   Each texture keeps the layout of the one it replaces (where the door, the sign, the stripes are), and nothing here uses the game's
   random numbers. Everything is painted in the game's 64-unit space on a 256x256 canvas. */
window.ANIMEART=(function(){
const AA={};
/* ---------- colour ---------- */
const HXC=new Map();let HXG=null;
function hx(c){if(Array.isArray(c))return c;let r=HXC.get(c);if(r)return r;
 if(c[0]=='#'){let s=c.slice(1);if(s.length==3)s=s.split('').map(q=>q+q).join('');r=[parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]}
 else{if(!HXG){const cv=document.createElement('canvas');cv.width=cv.height=1;HXG=cv.getContext('2d',{willReadFrequently:true})}HXG.clearRect(0,0,1,1);HXG.fillStyle='#808080';HXG.fillStyle=c;HXG.fillRect(0,0,1,1);const d=HXG.getImageData(0,0,1,1).data;r=[d[0],d[1],d[2]]}
 HXC.set(c,r);return r}
const K=v=>v<0?0:v>255?255:v;
const mix=(a,b,t)=>{a=hx(a);b=hx(b);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};
const css=(c,a)=>{c=hx(c);return`rgba(${K(c[0])|0},${K(c[1])|0},${K(c[2])|0},${a===undefined?1:a})`};
const SHT=[48,40,98],LTT=[255,246,226],INK=[32,24,52];
/* shadow of a colour: darker and pushed toward blue-violet; light: toward warm cream; ink: a dark shade of the colour itself */
const dk=(c,k)=>{c=hx(c);return mix(c,[c[0]*.36+SHT[0]*.6,c[1]*.36+SHT[1]*.6,c[2]*.42+SHT[2]*.68],k)};
const lt=(c,k)=>mix(c,LTT,k);
const ik=(c,k)=>mix(c,INK,k===undefined?.72:k);
const H=(h,s,l)=>hx(`hsl(${((h%360)+360)%360},${Math.round(s*100)}%,${Math.round(l*100)}%)`);
const vary=(c,k)=>{c=hx(c);return[c[0]*(1+k),c[1]*(1+k),c[2]*(1+k)]};
function rnd(sd){let t=sd|0;return()=>{t=t+0x6D2B79F5|0;let r=Math.imul(t^t>>>15,1|t);r=r+Math.imul(r^r>>>7,61|r)^r;return((r^r>>>14)>>>0)/4294967296}}
let SD=1;const ns=()=>(SD=(Math.imul(SD,1103515245)+12345)&0x7fffffff);
/* ---------- the canvas ---------- */
/* the finish: the painting is softened a touch (as a background painting looks on film), given a faint paper grain, and its darks are pulled toward the blue-violet of the shadows */
let FIN=null;
function finish(c,g){if(!FIN){FIN=document.createElement('canvas');FIN.width=FIN.height=256}const f=FIN.getContext('2d');f.clearRect(0,0,256,256);f.drawImage(c,0,0);g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,256,256);g.filter='blur(0.55px)';g.drawImage(FIN,0,0);g.filter='none';
 const id=g.getImageData(0,0,256,256),d=id.data;let s=12345;for(let i=0;i<d.length;i+=4){s=(Math.imul(s,1103515245)+12345)>>>0;const n=((s>>>16)&255)/255-.5,ny=(((i>>2)>>8)&1)?1:.6,l=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)/255,k=Math.pow(1-l,2.2)*.32,gr=n*7*ny;
  d[i]=d[i]+(SHT[0]-d[i])*k+gr;d[i+1]=d[i+1]+(SHT[1]-d[i+1])*k+gr;d[i+2]=d[i+2]+(SHT[2]+20-d[i+2])*k+gr}return id}
function paint(f){SD=1;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.scale(4,4);g.lineJoin='round';g.lineCap='round';f(g);g.filter='none';
 const a=new Uint32Array(finish(c,g).data.buffer);a.__ap=1;return a}
AA.paint=paint;
/* paint a batch of soft shapes on a scratch layer, then lay the whole layer down blurred in one step (much faster than blurring each shape) */
const SCR=[];let SCD=0;
function soft(g,px,draw){const k=SCD++;let c=SCR[k];if(!c){c=document.createElement('canvas');c.width=c.height=256;SCR[k]=c}const s=c.getContext('2d');s.setTransform(1,0,0,1,0,0);s.clearRect(0,0,256,256);s.setTransform(g.getTransform());s.lineCap='round';
 try{draw(s)}finally{SCD--}g.save();g.setTransform(1,0,0,1,0,0);g.filter=px>0?`blur(${px}px)`:'none';g.drawImage(c,0,0);g.restore()}
function tile9(g,f){for(const dx of[-64,0,64])for(const dy of[-64,0,64]){g.save();g.translate(dx,dy);f(dx,dy);g.restore()}}
function fillR(g,x,y,w,h,c,a){g.fillStyle=css(c,a);g.fillRect(x,y,w,h)}
function pathP(g,pts){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()}
function fillP(g,pts,c,a){pathP(g,pts);g.fillStyle=css(c,a);g.fill()}
function clipR(g,x,y,w,h,f){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();f();g.restore()}
function clipP(g,pts,f){g.save();pathP(g,pts);g.clip();f();g.restore()}
function vgr(g,x,y,w,h,st,a){const q=g.createLinearGradient(0,y,0,y+h);for(const[t,c]of st)q.addColorStop(t,css(c,a));g.fillStyle=q;g.fillRect(x,y,w,h)}
function glow(g,x,y,r,c,a){const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,css(c,a));q.addColorStop(1,css(c,0));g.fillStyle=q;g.fillRect(x-r,y-r,2*r,2*r)}
const RECT=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
/* ---------- line work: a hand-drawn line, slightly wobbly, with a little pressure change along it ---------- */
function hl(g,pts,col,lw,o){o=o||{};const R=rnd(ns()),amp=o.amp===undefined?.14:o.amp,step=o.step||1.1;if(o.close)pts=pts.concat([pts[0]]);
 const P=[];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L/step));for(let k=0;k<n;k++){const t=k/n;P.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}P.push(pts[pts.length-1]);
 let off=0;const Q=P.map((p,i)=>{const a=P[Math.max(0,i-1)],b=P[Math.min(P.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;off=off*.72+(R()-.5)*amp;return[p[0]-dy/l*off,p[1]+dx/l*off]});
 g.strokeStyle=typeof col=='string'?col:css(col);g.lineCap='round';let wv=.5,gap=0;const N=Q.length-1;
 for(let i=0;i<N;i++){wv=wv*.78+R()*.22;if(o.gap&&gap<=0&&R()<o.gap)gap=1+(R()*3|0);if(gap>0){gap--;continue}let w=lw*(.62+wv*.76);if(o.taper)w*=Math.min(1,(i+1)/3,(N-i)/3);g.lineWidth=w;g.beginPath();g.moveTo(Q[i][0],Q[i][1]);g.lineTo(Q[i+1][0],Q[i+1][1]);g.stroke()}}
const hrect=(g,x,y,w,h,col,lw,o)=>hl(g,RECT(x,y,w,h),col,lw,Object.assign({close:1},o||{}));
/* ---------- paint ---------- */
/* soft blotches of lighter and darker paint (the mottled gouache look); wrap:1 makes them tile */
function mottle(g,x,y,w,h,c,o){o=o||{};const R=rnd(ns()),n=o.n||Math.max(6,(w*h/55)|0),a=o.a===undefined?.16:o.a,s=o.s||1;
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 const offs=o.wrap?[[0,0],[w,0],[-w,0],[0,h],[0,-h],[w,h],[-w,-h],[w,-h],[-w,h]]:[[0,0]];
 soft(g,o.blur===undefined?6:o.blur,q=>{for(let i=0;i<n;i++){const px=x+R()*w,py=y+R()*h,rx=(1.5+R()*Math.min(w,h)*.22)*s,ry=rx*(.3+R()*.6),rot=o.rot===undefined?R()*3.14:o.rot+(R()-.5)*.3,d=R()<(o.dark===undefined?.5:o.dark);
  q.fillStyle=css(d?dk(c,.5):lt(c,.42),a*(.4+R()*.8));for(const[ox,oy]of offs){q.beginPath();q.ellipse(px+ox,py+oy,rx,ry,rot,0,7);q.fill()}}});
 g.restore()}
/* long faint brush strokes (vertical on walls, horizontal with hz:1) */
function streaks(g,x,y,w,h,c,o){o=o||{};const R=rnd(ns()),n=o.n||Math.max(3,(w/4)|0);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 soft(g,3,q=>{for(let i=0;i<n;i++){const sw=.5+R()*2.2,d=R()<.55;q.fillStyle=css(d?dk(c,.5):lt(c,.45),(o.a||.09)*(.5+R()));if(o.hz)q.fillRect(x,y+R()*h,w,sw);else q.fillRect(x+R()*w,y,sw,h)}});g.restore()}
/* rain-water stains running down a wall from under a ledge */
function drips(g,x,y,w,len,c,a){const R=rnd(ns());const n=2+(w/4|0);soft(g,2.5,s=>{for(let i=0;i<n;i++){const dx=x+R()*w,L=len*(.35+R()*.85),q=s.createLinearGradient(0,y,0,y+L);q.addColorStop(0,css(dk(c,.75),a||.3));q.addColorStop(1,css(dk(c,.75),0));s.fillStyle=q;s.fillRect(dx,y,.5+R()*1.8,L)}})}
/* the airbrushed light-to-shadow gradient over a surface (lit at the top) */
/* dry-brush texture: many short, faint strokes of lighter and darker paint */
function brush(g,x,y,w,h,c,o){o=o||{};const R=rnd(ns()),n=o.n||Math.max(10,(w*h/14)|0),a=o.a||.07,ang=o.ang||0;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 soft(g,1,q=>{for(let i=0;i<n;i++){const px=x+R()*w,py=y+R()*h,L=1.5+R()*4,t=ang+(R()-.5)*.5,d=R()<.5;q.strokeStyle=css(d?dk(c,.55):lt(c,.5),a*(.5+R()));q.lineWidth=.3+R()*.7;q.beginPath();q.moveTo(px,py);q.lineTo(px+Math.cos(t)*L,py+Math.sin(t)*L);q.stroke()}});g.restore()}
function air(g,x,y,w,h,c,o){o=o||{};const q=g.createLinearGradient(0,y,0,y+h);q.addColorStop(0,css(lt(c,.6),o.top===undefined?.26:o.top));q.addColorStop(.45,css(c,0));q.addColorStop(1,css(dk(c,.9),o.bot===undefined?.3:o.bot));g.fillStyle=q;g.fillRect(x,y,w,h)}
function wash(g,x,y,w,h,c,o){o=o||{};fillR(g,x,y,w,h,c);if(o.air!==0){air(g,x,y,w,h,c,{top:o.top===undefined?.32:o.top,bot:o.bot===undefined?.5:o.bot});
  /* a broad soft light falling across the surface, and a cool shadow pooling in a lower corner */
  clipR(g,x,y,w,h,()=>{glow(g,x+w*.3,y+h*.2,Math.max(w,h)*.7,lt(c,.7),.18);glow(g,x+w*(o.sx||.92),y+h,Math.max(w,h)*.6,dk(c,.9),.28)})}
 mottle(g,x,y,w,h,c,{wrap:o.wrap,a:o.ma,n:o.mn,blur:o.mb,rot:o.mrot});brush(g,x,y,w,h,c,{ang:o.bang||0});if(o.streak)streaks(g,x,y,w,h,c,{a:o.sa,hz:o.shz})}
/* a crack drawn as a dark line with a pale edge beside it */
function crack(g,x,y,len,c,o){o=o||{};const R=rnd(ns());let px=x,py=y,a=o.ang===undefined?Math.PI/2+(R()-.5)*.9:o.ang;const pts=[[px,py]];for(let i=0;i<4;i++){a+=(R()-.5)*1.1;px+=Math.cos(a)*len/4;py+=Math.sin(a)*len/4;pts.push([px,py])}
 hl(g,pts.map(p=>[p[0]+.4,p[1]+.3]),css(lt(c,.55),.75),.28,{amp:.04,taper:1});hl(g,pts,ik(c,.62),.36,{amp:.06,taper:1});
 if(R()<.6){const b=pts[1+(R()*2|0)];hl(g,[b,[b[0]+(R()-.5)*len*.5,b[1]+len*.28]],ik(c,.62),.26,{taper:1})}}
/* chipped plaster: the darker layer underneath, ink along one edge, a pale lip along the other */
function peel(g,cx,cy,r,c){const R=rnd(ns()),pts=[];for(let i=0;i<8;i++){const a=i/8*6.28,q=r*(.5+R()*.65);pts.push([cx+Math.cos(a)*q,cy+Math.sin(a)*q*.75])}
 fillP(g,pts,dk(c,.32));hl(g,pts.slice(4).concat([pts[0]]),ik(c,.58),.34,{amp:.05});hl(g,pts.slice(0,5),css(lt(c,.6),.9),.32,{amp:.05})}
/* a cel-shaded block: flat colour, mottled paint, a hard flat shadow along the bottom and right, a pale edge top and left, wobbly ink outline */
function cblock(g,x,y,w,h,c,o){o=o||{};const s=o.s===undefined?Math.min(1.4,Math.min(w,h)*.16):o.s;fillR(g,x,y,w,h,c);
 if(o.m!==0)mottle(g,x,y,w,h,c,{a:o.ma||.18,n:o.mn||Math.max(3,(w*h/40)|0),blur:o.mb||4});
 if(o.m!==0&&w*h>30)brush(g,x,y,w,h,c,{n:Math.max(4,(w*h/18)|0),a:.06});if(o.air)air(g,x,y,w,h,c,{top:.2,bot:.25});
 if(s>0){fillP(g,[[x+w,y],[x+w,y+h],[x,y+h],[x+s*.5,y+h-s],[x+w-s*.6,y+h-s],[x+w-s*.6,y+s*.4]],dk(c,o.sd||.42));
  hl(g,[[x+.45,y+h-s],[x+.45,y+.45],[x+w-s*.6,y+.45]],css(lt(c,.55),.85),.3,{amp:.05})}
 if(o.ink!==0)hl(g,RECT(x,y,w,h),o.ic||ik(c,.66),o.lw||.42,{close:1,amp:o.amp===undefined?.12:o.amp,gap:o.gap===undefined?.03:o.gap})}
/* a ledge or sill: pale top face, front face, hard cast shadow on the wall below */
function ledge(g,x,y,w,h,c,o){o=o||{};fillP(g,[[x+.4,y+h],[x+w,y+h],[x+w+1,y+h+(o.sh||1.6)],[x+1.4,y+h+(o.sh||1.6)]],SHT,o.sa||.3);
 fillR(g,x,y,w,h,c);fillR(g,x,y,w,Math.min(h*.38,.9),lt(c,.42));fillR(g,x,y+h*.72,w,h*.28,dk(c,.32));
 hl(g,[[x,y],[x+w,y]],ik(c,.55),.28,{amp:.04});hl(g,[[x,y+h],[x+w,y+h]],ik(c,.66),.38,{amp:.05});hl(g,[[x,y],[x,y+h]],ik(c),.28,{amp:0});hl(g,[[x+w,y],[x+w,y+h]],ik(c),.28,{amp:0})}
/* a round pipe: lit band, flat colour, hard shadow third */
function pipe(g,x,y,w,h,c){c=hx(c);fillR(g,x,y,w,h,c);fillR(g,x+w*.12,y,w*.2,h,lt(c,.4));fillR(g,x+w*.62,y,w*.38,h,dk(c,.45));hl(g,[[x,y],[x,y+h]],ik(c),.32,{amp:.05});hl(g,[[x+w,y],[x+w,y+h]],ik(c),.34,{amp:.05});
 for(let yy=y+6;yy<y+h-2;yy+=14){cblock(g,x-.6,yy,w+1.2,1.6,dk(c,.15),{s:.5,m:0,lw:.3})}}
function knot(g,x,y,c){g.beginPath();g.ellipse(x,y,.8,1.5,0,0,7);g.fillStyle=css(dk(c,.45));g.fill();hl(g,[[x,y-2.4],[x+1.3,y-1],[x+1.3,y+1.1],[x,y+2.4],[x-1.3,y+1.1],[x-1.3,y-1]],css(dk(c,.5),.8),.25,{close:1,amp:.05})}
function bolt(g,x,y,c){g.beginPath();g.arc(x,y,.75,0,7);g.fillStyle=css(dk(c,.55));g.fill();g.beginPath();g.arc(x+.15,y+.2,.45,0,Math.PI);g.strokeStyle=css(lt(c,.6));g.lineWidth=.25;g.stroke()}
/* a small stone or pebble with a hard shadow under it */
function pebble(g,x,y,r,c){const R=rnd(ns()),pts=[];for(let i=0;i<6;i++){const a=i/6*6.28+R()*.5,q=r*(.75+R()*.35);pts.push([x+Math.cos(a)*q,y+Math.sin(a)*q*.72])}
 g.beginPath();g.ellipse(x+r*.35,y+r*.55,r*1.05,r*.45,0,0,7);g.fillStyle=css(SHT,.12);g.fill();
 fillP(g,pts,c);clipP(g,pts,()=>{fillP(g,[[x-r*2,y+r*.15],[x+r*2,y-r*.35],[x+r*2,y+r*2],[x-r*2,y+r*2]],dk(c,.32));fillP(g,[[x-r*.7,y-r*.25],[x-r*.1,y-r*.62],[x+r*.1,y-r*.35],[x-r*.45,y-r*.1]],lt(c,.55),.85)});
 hl(g,pts,ik(c,.3),Math.min(.28,r*.22),{close:1,amp:.03,gap:.25})}
/* hand lettering: each letter sits a little differently, with a dark outline in the sign's own ink colour */
function htext(g,txt,cx,cy,maxw,fs,fg,ol,o){o=o||{};const R=rnd(ns());let f=fs;const font=q=>`${o.it?'italic ':''}bold ${q}px "Trebuchet MS",Verdana,Tahoma,"DejaVu Sans",sans-serif`;g.font=font(f);while(g.measureText(txt).width>maxw&&f>2.5){f-=.25;g.font=font(f)}
 const ws=[...txt].map(ch=>g.measureText(ch).width),tot=ws.reduce((a,b)=>a+b,0);let x=cx-tot/2;g.textBaseline='middle';g.textAlign='left';g.lineJoin='round';
 for(let i=0;i<txt.length;i++){g.save();g.translate(x,cy+(R()-.5)*f*.07);g.rotate((R()-.5)*.08);if(ol){g.strokeStyle=css(ol);g.lineWidth=f*(o.olw||.2);g.strokeText(txt[i],0,0)}g.fillStyle=css(fg);g.fillText(txt[i],0,0);g.restore();x+=ws[i]}}
/* a painted sign board */
function sign(g,x,y,w,h,txt,bg,fg,o){o=o||{};bg=hx(bg);fillP(g,[[x+.8,y+h],[x+w+.8,y+h],[x+w+2,y+h+1.8],[x+2,y+h+1.8]],SHT,.3);
 fillR(g,x,y,w,h,bg);air(g,x,y,w,h,bg,{top:.32,bot:.38});mottle(g,x,y,w,h,bg,{a:.14,n:5,blur:5});fillR(g,x,y+h-1,w,1,dk(bg,.45));
 hl(g,RECT(x+1.1,y+1.1,w-2.2,h-2.6),css(lt(bg,.55),.75),.3,{close:1,amp:.05});hrect(g,x,y,w,h,ik(bg,.78),.5,{amp:.09});
 htext(g,txt,x+w/2,y+h/2-.25,w-5,o.fs||h*.6,fg,o.ol||ik(bg,.82));
 clipR(g,x,y,w,h,()=>{fillP(g,[[x+w*.62,y],[x+w*.7,y],[x+w*.55,y+h],[x+w*.47,y+h]],LTT,.13)});
 if(!o.small)for(const bx of[x+1.6,x+w-1.6])bolt(g,bx,y+h/2,bg)}
/* glass: dark blue with sharp painted reflections, or a warmly lit room painted in loose orange blotches */
function glassDark(g,x,y,w,h,o){o=o||{};clipR(g,x,y,w,h,()=>{vgr(g,x,y,w,h,[[0,[20,24,66]],[.55,[38,52,124]],[1,[70,94,170]]]);const R=rnd(ns());
 if(o.interior){soft(g,1.5,q=>{for(let k=0;k<4;k++)fillR(q,x+R()*w*.8,y+h*(.35+R()*.4),2+R()*6,h,[18,20,52],.6)});fillR(g,x,y+h*.62,w,.6,[90,110,180],.6)}
 for(let k=0;k<2;k++){const x0=x+w*(.08+k*.4+R()*.08),sk=Math.min(w,h)*.55,wd=w*(.2-k*.07);fillP(g,[[x0,y+h],[x0+sk,y],[x0+sk+wd,y],[x0+wd*1.2,y+h*.7],[x0+wd,y+h]],[118,148,222],.5-k*.18)}
 fillP(g,[[x+w*.64,y+h*.1],[x+w*.84,y+h*.06],[x+w*.68,y+h*.26]],[205,220,252],.75);fillP(g,[[x+w*.12,y+h*.82],[x+w*.24,y+h*.72],[x+w*.18,y+h*.9]],[160,186,240],.5)})}
function glassLit(g,x,y,w,h,o){o=o||{};clipR(g,x,y,w,h,()=>{vgr(g,x,y,w,h,[[0,[255,214,120]],[.55,[246,156,66]],[1,[208,92,46]]]);const R=rnd(ns());soft(g,2.4,q=>{for(let k=0;k<Math.max(4,w*h/60);k++){const c=R()<.5?[255,236,160]:[190,64,38];fillR(q,x+R()*w-1,y+R()*h-1,1.5+R()*w*.25,1.5+R()*h*.3,c,.45)}});
 if(o.curtain!==0){fillP(g,[[x,y],[x+w*.24,y],[x+w*.14,y+h],[x,y+h]],[176,52,40],.55);fillP(g,[[x+w,y],[x+w*.76,y],[x+w*.86,y+h],[x+w,y+h]],[176,52,40],.55)}
 fillR(g,x,y,w,h*.08,[255,248,210],.5)})}
/* a window: frame with a hard shadow on the wall, glass, mullions, sill, and stains under the sill */
function win(g,x,y,w,h,o){o=o||{};const F=hx(o.frame||[88,88,104]),b=o.b||.85;
 fillP(g,[[x+w,y+.6],[x+w+1.3,y+1.6],[x+w+1.3,y+h+1.2],[x+1,y+h+1.2],[x,y+h]],SHT,.3);
 fillR(g,x,y,w,h,F);fillR(g,x,y,w,b*.45,lt(F,.38));fillR(g,x+w-b*.45,y,b*.45,h,dk(F,.4));
 const gx=x+b,gy=y+b,gw=w-2*b,gh=h-2*b;(o.lit?glassLit:glassDark)(g,gx,gy,gw,gh,o);
 fillP(g,[[gx,gy],[gx+gw,gy],[gx+gw,gy+.9],[gx+.9,gy+.9],[gx+.9,gy+gh],[gx,gy+gh]],SHT,.35);
 const bars=[];if(o.vbar!==0&&w>9)bars.push([x+w/2-.55,gy,1.1,gh]);if(o.hbar)bars.push([gx,y+h*(o.hbar===1?.4:o.hbar)-.55,gw,1.1]);
 for(const q of bars){fillR(g,q[0],q[1],q[2],q[3],F);hrect(g,q[0],q[1],q[2],q[3],ik(F,.6),.22,{amp:.03})}
 hrect(g,gx,gy,gw,gh,ik(F,.78),.3,{amp:.05});hrect(g,x,y,w,h,ik(F,.82),.42,{amp:.08});
 if(o.sill!==0){ledge(g,x-1.2,y+h,w+2.4,1.5,o.sill||lt(F,.55));if(o.wall)drips(g,x,y+h+3,w,o.drip||9,o.wall,.26)}}
/* a panel door with a frame, recessed panels or glass, and a brass knob */
function door(g,x,y,w,h,c,o){o=o||{};c=hx(c);const Fc=o.frame||[74,70,84];
 fillP(g,[[x+w+1.2,y-1],[x+w+2.4,y],[x+w+2.4,y+h],[x+w+1.2,y+h]],SHT,.28);fillR(g,x-1.2,y-1.2,w+2.4,h+1.2,Fc);hrect(g,x-1.2,y-1.2,w+2.4,h+1.2,ik(Fc),.38);
 fillR(g,x,y,w,h,c);air(g,x,y,w,h,c,{top:.2,bot:.35});mottle(g,x,y,w,h,c,{a:.14,n:5,blur:4});fillR(g,x,y,1.1,h,SHT,.3);
 const rec=(px,py,pw,ph)=>{hl(g,[[px,py+ph],[px,py],[px+pw,py]],ik(c,.6),.3,{amp:.04});hl(g,[[px+pw,py],[px+pw,py+ph],[px,py+ph]],css(lt(c,.5),.9),.3,{amp:.04})};
 if(o.glass){const gx=x+2.2,gy=y+2.2,gw=w-4.4,gh=h*.42;(o.lit?glassLit:glassDark)(g,gx,gy,gw,gh,{curtain:0});hrect(g,gx,gy,gw,gh,ik(c,.75),.32,{amp:.04})}
 else rec(x+2.2,y+2.2,w-4.4,h*.38);rec(x+2.2,y+h*.53,w-4.4,h*.4);
 g.beginPath();g.arc(x+w-2.6,y+h*.5,1,0,7);g.fillStyle=css([226,184,74]);g.fill();g.beginPath();g.arc(x+w-2.6,y+h*.5,1,-.3,Math.PI*.8);g.fillStyle=css([150,98,40]);g.fill();g.beginPath();g.arc(x+w-2.6,y+h*.5,1,0,7);g.strokeStyle=css(INK);g.lineWidth=.28;g.stroke();
 hrect(g,x,y,w,h,ik(c,.78),.4,{amp:.06})}
/* an awning: stripes, scalloped hem, lower part in shadow, a hard shadow cast on the wall */
function awning(g,x,y,w,h,c1,c2){c1=hx(c1);c2=hx(c2);const n=Math.round(w/6),sw=w/n;
 g.beginPath();g.moveTo(x,y+h);for(let i=0;i<n;i++)g.arc(x+i*sw+sw/2,y+h+1.2,sw/2,Math.PI,0,true);g.lineTo(x+w,y+h+3.4);g.lineTo(x,y+h+3.4);g.closePath();g.fillStyle=css(SHT,.32);g.fill();
 for(let i=0;i<n;i++){const xx=x+i*sw,c=i&1?c2:c1;g.beginPath();g.moveTo(xx,y);g.lineTo(xx+sw,y);g.lineTo(xx+sw,y+h);g.arc(xx+sw/2,y+h,sw/2,0,Math.PI);g.closePath();g.fillStyle=css(c);g.fill();
  g.save();g.clip();fillR(g,xx,y+h*.62,sw,h,dk(c,.28));fillR(g,xx,y,sw,.8,lt(c,.35));g.restore()}
 const pts=[];for(let i=0;i<n;i++)for(let k=0;k<=6;k++){const a=Math.PI-k/6*Math.PI;pts.push([x+i*sw+sw/2+Math.cos(a)*sw/2,y+h+Math.sin(a)*sw/2])}
 hl(g,pts,ik(c1,.75),.4,{amp:.05});hl(g,[[x,y],[x+w,y]],ik(c1,.75),.4);for(let i=0;i<=n;i++)hl(g,[[x+i*sw,y],[x+i*sw,y+h]],ik(c1,.6),.25,{amp:.04})}
/* ---------- materials ---------- */
function stones(g,x,y,w,h,o){o=o||{};const rows=o.rows||4,cols=o.cols||2,bh=h/rows,bw=w/cols,gap=o.gap||.9,R=rnd(ns()),C=hx(o.col||[200,184,150]);
 fillR(g,x,y,w,h,o.joint||dk(C,.7));clipR(g,x,y,w,h,()=>{for(let r=0;r<rows;r++)for(let c=-1;c<=cols;c++){const xx=x+c*bw+(o.stagger===0?0:(r&1?bw/2:0)),cc=vary(C,(R()-.5)*(o.var||.12)),jx=(R()-.5)*.5,jy=(R()-.5)*.4;
  cblock(g,xx+gap/2+jx,y+r*bh+gap/2+jy,bw-gap,bh-gap,cc,{s:Math.min(1.5,bh*.14),lw:.42,mn:4});
  if(R()<(o.chips===undefined?.3:o.chips)){const cx=xx+3+R()*(bw-6),cy=y+r*bh+bh*(.3+R()*.4);peel(g,cx,cy,1+R()*1.2,cc)}
  if(R()<(o.cracks===undefined?.2:o.cracks))crack(g,xx+3+R()*(bw-6),y+r*bh+1,bh*.7,cc)}});
 if(o.moss)tile9(g,()=>{const R2=rnd(o.moss);for(let i=0;i<4;i++)moss(g,R2()*64,R2()*64,2+R2()*3)})}
function moss(g,x,y,r){const R=rnd(ns()),pts=[];for(let k=0;k<9;k++){const a=k/9*6.28,q=r*(.6+R()*.5);pts.push([x+Math.cos(a)*q,y+Math.sin(a)*q*.55])}fillP(g,pts,[92,132,60]);clipP(g,pts,()=>fillR(g,x-r*2,y+r*.1,r*4,r*2,[60,94,52]));fillP(g,[[x-r*.5,y-r*.2],[x,y-r*.45],[x+r*.3,y-r*.15]],[150,190,90],.8);hl(g,pts,[40,62,40],.3,{close:1,amp:.05,gap:.15})}
function bricks(g,x,y,w,h,o){o=o||{};const rows=o.rows||8,cols=o.cols||4,bh=h/rows,bw=w/cols,R=rnd(ns()),C=hx(o.col||[176,82,62]);fillR(g,x,y,w,h,o.mortar||mix(C,[200,190,176],.5));
 clipR(g,x,y,w,h,()=>{for(let r=0;r<rows;r++)for(let c=-1;c<=cols;c++){const xx=x+c*bw+(r&1?bw/2:0),cc=vary(C,(R()-.5)*.16);cblock(g,xx+.45,y+r*bh+.45,bw-.9,bh-.9,cc,{s:Math.min(1,bh*.18),lw:.32,mn:2,gap:.08});if(R()<.12)peel(g,xx+2+R()*(bw-4),y+r*bh+bh/2,.9,cc)}})}
function planks(g,x,y,w,h,o){o=o||{};const n=o.n||5,v=o.vertical!==false,R=rnd(ns()),C=hx(o.col||[150,98,56]);fillR(g,x,y,w,h,dk(C,.8));
 clipR(g,x,y,w,h,()=>{for(let i=0;i<n;i++){const c=vary(C,(R()-.5)*.16);
  if(v){const bw=w/n,px=x+i*bw;cblock(g,px+.3,y-1,bw-.6,h+2,c,{s:.9,mn:4,gap:.05});for(let j=0;j<2;j++){const gx=px+bw*(.3+j*.38)+(R()-.5);hl(g,[[gx,y],[gx+(R()-.5)*1.4,y+h*.33],[gx+(R()-.5)*1.4,y+h*.66],[gx,y+h]],css(dk(c,.45),.7),.24,{amp:.25,gap:.25})}if(R()<.45)knot(g,px+bw*.5,y+3+R()*(h-6),c)}
  else{const bh=h/n,py=y+i*bh;cblock(g,x-1,py+.3,w+2,bh-.6,c,{s:Math.min(.9,bh*.2),mn:4,gap:.05});const gy=py+bh*.5+(R()-.5);hl(g,[[x,gy],[x+w*.33,gy+(R()-.5)*1.2],[x+w*.66,gy+(R()-.5)*1.2],[x+w,gy]],css(dk(c,.45),.7),.24,{amp:.25,gap:.25});
   if(o.joints!==false){const jx=x+(((i*23+7)%5)/5)*w;fillR(g,jx,py+.3,.7,bh-.6,dk(C,.75));hl(g,[[jx+.7,py+.3],[jx+.7,py+bh-.3]],css(lt(c,.45),.8),.22)}if(R()<.3)knot(g,x+R()*w,py+bh/2,c)}}});
 if(o.nails)for(let i=0;i<n;i++){const p=v?[x+(i+.5)*w/n,y+2.6]:[x+2.6,y+(i+.5)*h/n];bolt(g,p[0],p[1],[200,200,210]);if(v)bolt(g,p[0],y+h-2.6,[200,200,210])}}
function concrete(g,x,y,w,h,c,o){o=o||{};c=hx(c||[168,168,170]);cblock(g,x+.3,y+.3,w-.6,h-.6,c,{s:.8,mn:Math.max(4,w*h/50|0),ma:.2,mb:5,lw:.4,air:o.air});
 if(o.stain)drips(g,x+1,y+.6,w-2,h*.6,c,.22);if(o.crack)crack(g,x+w*.3,y+2,h*.5,c);
 if(o.bolts!==false)for(const[a,b]of[[2.6,2.6],[w-2.6,2.6],[2.6,h-2.6],[w-2.6,h-2.6]])bolt(g,x+a,y+b,c)}
function corrugated(g,x,y,w,h,c,o){o=o||{};c=hx(c);const n=o.n||10;fillR(g,x,y,w,h,c);
 for(let i=0;i<n;i++){const xx=x+i*w/n,bw=w/n;fillR(g,xx,y,bw*.3,h,lt(c,.3));fillR(g,xx+bw*.62,y,bw*.38,h,dk(c,.42));hl(g,[[xx+bw*.62,y],[xx+bw*.62,y+h]],css(dk(c,.55),.6),.2,{amp:.05});hl(g,[[xx+bw,y],[xx+bw,y+h]],ik(c,.7),.28,{amp:.05})}
 air(g,x,y,w,h,c,{top:.2,bot:.3});mottle(g,x,y,w,h,c,{a:.12,n:6,blur:5});if(o.rust)drips(g,x,y,w,h*.8,[150,70,30],.35)}
/* ---------- ground ---------- */
function ground(g,c,o){o=o||{};c=hx(c);fillR(g,0,0,64,64,c);mottle(g,0,0,64,64,c,{wrap:1,a:o.ma||.2,n:o.mn||26,blur:o.mb||10,s:1.2});mottle(g,0,0,64,64,c,{wrap:1,a:.12,n:40,blur:3,s:.35});tile9(g,()=>brush(g,0,0,64,64,c,{n:260,a:.06}))}
function earth(g,c,o){o=o||{};c=hx(c);ground(g,c,o);
 if(o.lines)tile9(g,()=>{const R=rnd(77);for(let i=0;i<4;i++){const y=R()*64;hl(g,[[0,y],[21,y+1.5],[43,y-1.5],[64,y]],css(lt(c,.25),.5),.5,{amp:.3,gap:.2})}});
 tile9(g,()=>{const R=rnd(o.sd||51);const n=o.pebbles===undefined?7:Math.ceil(o.pebbles*.6);for(let i=0;i<n;i++){const r=.9+R()*1.4;pebble(g,R()*64,R()*64,r,o.pc?hx(o.pc):lt(c,.18))}for(let i=0;i<(o.cracks||1);i++){const x=R()*64,y=R()*64;hl(g,[[x,y],[x+3+R()*3,y+R()*3],[x+5+R()*4,y-1+R()*4]],ik(c,.4),.3,{taper:1})}})}
function grass(g,c,o){o=o||{};c=hx(c);ground(g,c,{ma:.22,mn:22});
 tile9(g,()=>{const R=rnd(o.sd||41);for(let i=0;i<(o.n||26);i++){const x=R()*64,y=R()*64,hh=2+R()*2.6,nb=3+(R()*3|0),d=dk(c,.5),l=lt(c,.28);
  for(let b=0;b<nb;b++){const bx=x+(b-nb/2)*.9,tip=[bx+(R()-.5)*2.2,y-hh*(.6+R()*.5)];fillP(g,[[bx-.5,y],[tip[0],tip[1]],[bx+.5,y]],d)}
  if(R()<.6){const tip=[x+(R()-.5)*1.4,y-hh*.8];fillP(g,[[x-.25,y-.3],[tip[0],tip[1]],[x+.35,y-.3]],l)}}
  if(o.flowers!==0)for(let i=0;i<4;i++){const x=R()*64,y=R()*64,fc=[[255,250,230],[255,214,226],[255,226,110]][i%3];for(let k=0;k<5;k++){g.beginPath();g.arc(x+Math.cos(k*1.26)*.7,y+Math.sin(k*1.26)*.5,.45,0,7);g.fillStyle=css(fc);g.fill()}g.beginPath();g.arc(x,y,.3,0,7);g.fillStyle=css([236,160,40]);g.fill()}})}
function roofTiles(g,c,rows){c=hx(c);rows=rows||6;const rh=64/rows,tw=8;fillR(g,0,0,64,64,dk(c,.6));
 for(let r=0;r<rows;r++){const y=r*rh;for(let k=-1;k<9;k++){const x=k*tw+(r&1?tw/2:0),cc=vary(c,((k*7+r*3)%5-2)*.03);g.beginPath();g.moveTo(x,y);g.lineTo(x+tw,y);g.lineTo(x+tw,y+rh-1);g.quadraticCurveTo(x+tw/2,y+rh+.8,x,y+rh-1);g.closePath();g.fillStyle=css(cc);g.fill();g.save();g.clip();fillR(g,x+tw*.62,y,tw,rh+2,dk(cc,.35));fillR(g,x+tw*.12,y,tw*.16,rh,lt(cc,.35));g.restore();
  hl(g,[[x,y],[x,y+rh-1],[x+tw/2,y+rh+.3],[x+tw,y+rh-1]],ik(cc,.65),.32,{amp:.05})}
  fillR(g,0,y,64,1.2,SHT,.35)}mottle(g,0,0,64,64,c,{wrap:1,a:.12,n:12,blur:6})}
function rockFace(g,c){c=hx(c);ground(g,c,{ma:.2,mn:20});tile9(g,()=>{const R=rnd(77);for(let i=0;i<9;i++){const x=R()*64,y=R()*64,r=4+R()*6,pts=[[x-r,y+r*.2],[x-r*.5,y-r*.7],[x+r*.5,y-r*.8],[x+r,y],[x+r*.4,y+r*.7],[x-r*.6,y+r*.6]],cc=vary(c,(R()-.5)*.15);
 fillP(g,pts,cc);clipP(g,pts,()=>{fillP(g,[[x-r*1.2,y+r*.1],[x+r*1.2,y-r*.25],[x+r*1.2,y+r*1.2],[x-r*1.2,y+r*1.2]],dk(cc,.5));fillP(g,[[x-r*.5,y-r*.7],[x+r*.5,y-r*.8],[x+r*.15,y-r*.3],[x-r*.55,y-r*.15]],lt(cc,.3),.8)});hl(g,pts,ik(cc,.65),.42,{close:1,amp:.08,gap:.08})}})}
function hazStripes(g,y0,y1,c2,bg){fillR(g,0,y0,64,y1-y0,bg);clipR(g,0,y0,64,y1-y0,()=>{for(let i=-64;i<64;i+=16){const p=[[i,64],[i+8,64],[i+72,0],[i+64,0]];fillP(g,p,c2);hl(g,[[i+8,64],[i+72,0]],ik(c2,.5),.3,{amp:.04})}mottle(g,0,y0,64,y1-y0,c2,{a:.18,n:10});drips(g,0,y0,64,(y1-y0)*.8,c2,.18)})}

/* ======================= THE CITY ======================= */
const SIGNC={SHOP:[52,92,172],RESTAURANT:[168,46,44],HOTEL:[96,62,150],BAR:[34,112,104],CAFE:[176,104,44],BANK:[38,78,118],PIZZA:[190,64,36],PHARMACY:[40,128,80],CLINIC:[232,236,240],ARCADE:[176,48,142],DINER:[204,150,40],BOOKS:[110,70,44]};
/* building colours: dusty pastels, like painted plaster */
const WALLS=[[214,196,164],[196,170,150],[176,190,186],[204,178,170],[184,184,204],[214,206,176],[170,186,164],[200,160,140],[190,200,214],[220,190,150]];
const wallC=h=>WALLS[(((h%360)+360)%360/36|0)%WALLS.length];
const CACHE=new Map();const cached=(k,f)=>{let v=CACHE.get(k);if(!v){v=f();CACHE.set(k,v)}return v};AA.clearCache=()=>CACHE.clear();
AA.facade=function(name,hue,showOpen){return cached('f'+name+'|'+hue+'|'+showOpen,()=>AA.facade0(name,hue,showOpen))};
AA.facade0=function(name,hue,showOpen){if(name=='~'||name=='~2')name='';const shopN=name=='SHOP'||name=='SHOP+',shopO=name=='SHOP+';if(shopN)name='SHOP';return paint(g=>{
 const W=wallC(hue);wash(g,0,0,64,64,W,{streak:1,top:.28,bot:.32});
 drips(g,3,18,58,12,W,.22);peel(g,61,42,2.4,W);crack(g,1.5,26,9,W);peel(g,6,58,1.6,W);
 const PL=mix(W,[96,92,104],.55);cblock(g,-1,57.5,66,7.5,PL,{s:1.2,mn:6});ledge(g,-1,56.4,66,1.3,lt(PL,.3));
 pipe(g,35.3,-1,2.2,57.5,[124,128,142]);
 if(name){const bg=SIGNC[name]||H(hue+180,.4,.38);sign(g,3,3,58,13.5,name,bg,name=='CLINIC'?[210,40,50]:[255,248,230],{ol:name=='CLINIC'?[255,255,255]:undefined})}
 if(name&&/REST|CAFE|PIZZA|DINER/.test(name))awning(g,1,17.6,62,4.2,name=='CAFE'?[46,120,84]:name=='DINER'?[52,90,170]:[186,52,48],[246,236,220]);
 win(g,4,25.5,29.2,30.5,{lit:!!name,interior:!name,wall:W,frame:mix(H(hue+160,.3,.32),W,.15),hbar:.3,sill:mix(W,[230,226,216],.5),drip:5});
 door(g,39.5,28,18.5,28.5,mix(H(hue+25,.3,.4),[80,70,90],.25),{glass:1,lit:!!name});
 if(showOpen)sign(g,41.2,34.4,15,8.6,'OPEN',[38,142,72],[255,255,236],{fs:5.2,small:1});
 if(shopN)AA.shopFront(g,hue,shopO)})};
AA.shopFront=function(g,hue,op){const W=wallC(hue);clipR(g,0,21,64,43,()=>{wash(g,0,21,64,43,W,{streak:1});drips(g,0,26,64,10,W,.2)});const PL=mix(W,[96,92,104],.55);cblock(g,-1,57.5,66,7.5,PL,{s:1.2,mn:6});
 awning(g,0,21,64,4.6,op?[40,140,80]:[180,50,46],[246,236,220]);
 for(const x0 of[2.5,45]){win(g,x0,30,16.5,26,{lit:1,curtain:0,wall:W,frame:[74,74,92],vbar:0,sill:mix(W,[230,226,216],.5),drip:4});
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){const c=[[230,90,120],[90,170,220],[240,200,70],[120,200,100],[170,110,220],[240,140,60]][(i*2+j+(x0>9?3:0))%6];cblock(g,x0+3+j*5.6,33.5+i*6.6,4.3,4.3,c,{s:.8,mn:1,lw:.3})}}
 door(g,22,28,20,28.5,[112,72,46],{glass:1,lit:op});sign(g,23.2,34.4,17.6,8.6,op?'OPEN':'CLOSED',op?[38,142,72]:[176,40,40],[255,255,236],{fs:4.8,small:1})};
AA.upper=function(hue,Rf){/* Rf: the game's random numbers, called exactly as the classic version called them (one per window, in order) */const L=[];for(let i=0;i<6;i++)L.push(Rf()<.35);return cached('u'+hue+'|'+L.join(''),()=>AA.upper0(hue,L))};
AA.upper0=function(hue,L){let li=0;return paint(g=>{const W=mix(wallC(hue),[230,226,236],.12);wash(g,0,0,64,64,W,{streak:1,top:.22,bot:.25});
 for(const y of[0,30]){ledge(g,-1,y+28.6,66,1.3,mix(W,[236,232,224],.4),{sh:1.2,sa:.22})}
 crack(g,62,8,10,W);peel(g,3,46,2,W);
 for(let r=0;r<2;r++)for(let c=0;c<3;c++){const x=5+c*19.5,y=4.5+r*30,lit=L[li++];win(g,x,y,14,20,{lit,hbar:.36,wall:W,frame:mix(H(hue+160,.25,.36),W,.15),sill:mix(W,[232,228,220],.5),drip:7})}
 /* an air conditioner on a bracket, like the reference */
 cblock(g,44.5,52,11.5,6.4,[226,226,232],{s:1,mn:2,lw:.4});g.beginPath();g.arc(51.5,55.2,2.1,0,7);g.fillStyle=css([150,154,168]);g.fill();g.beginPath();g.arc(51.5,55.2,2.1,0,7);g.strokeStyle=css(INK);g.lineWidth=.3;g.stroke();
 for(let i=0;i<3;i++)hl(g,[[45.6,53.5+i*1.4],[48.4,53.5+i*1.4]],[120,124,140],.3,{amp:.02});drips(g,46,58.6,9,6,W,.3)})};
AA.road=()=>paint(g=>{const C=[78,82,104];ground(g,C,{ma:.22,mn:24});tile9(g,()=>{const R=rnd(61);for(let i=0;i<3;i++){const x=R()*64,y=R()*64;crack(g,x,y,7,C,{ang:R()*6.28})}for(let i=0;i<6;i++){g.beginPath();g.arc(R()*64,R()*64,.4,0,7);g.fillStyle=css(lt(C,.3));g.fill()}})});
AA.roadLine=v=>paint(g=>{const C=[78,82,104];ground(g,C,{ma:.22,mn:24});const Y=[232,196,72];
 const dash=(x,y,w,h)=>{const R=rnd(ns()),pts=[];const n=8;for(let i=0;i<=n;i++)pts.push([x+w*i/n,y+(R()-.5)*.4]);for(let i=n;i>=0;i--)pts.push([x+w*i/n,y+h+(R()-.5)*.4]);fillP(g,pts,Y);clipP(g,pts,()=>{mottle(g,x,y,w,h,Y,{a:.25,n:6,blur:3});fillR(g,x,y+h*.7,w,h,dk(Y,.25))})};
 for(const a of[0,32]){if(v){g.save();g.translate(64,0);g.rotate(Math.PI/2);dash(a+1,29,18,6);g.restore()}else dash(a+1,29,18,6)}});
AA.sidewalk=()=>paint(g=>{const C=[176,168,158];ground(g,C,{ma:.16,mn:18});for(const[x,y]of[[0,0],[32,0],[0,32],[32,32]]){fillR(g,x+.5,y+.5,31,1,lt(C,.35));fillR(g,x+.5,y+.5,1,31,lt(C,.25));fillR(g,x+30.6,y,1.4,32,dk(C,.25))}
 for(const k of[0,32,64]){hl(g,[[k,0],[k,64]],ik(C,.5),.45,{amp:.08});hl(g,[[0,k],[64,k]],ik(C,.5),.45,{amp:.08})}crack(g,14,40,9,C,{ang:.4});drips(g,40,6,6,6,C,.12)});
AA.plaza=()=>paint(g=>{const R=rnd(5);fillR(g,0,0,64,64,[96,70,62]);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=((x+y)&1)?[164,104,78]:[184,128,94];cblock(g,x*8+.35,y*8+.35,7.3,7.3,vary(c,(R()-.5)*.12),{s:1,mn:2,lw:.32,gap:.1})}});
AA.cityRoof=()=>paint(g=>{const C=[150,148,150];ground(g,C,{ma:.18,mn:16});for(const y of[0,32])hl(g,[[0,y],[64,y]],[60,56,70],.8,{amp:.1});for(const x of[0,32])hl(g,[[x,0],[x,64]],[60,56,70],.6,{amp:.1});cblock(g,40,8,15,11,[124,128,140],{s:1.4,mn:3});for(let i=0;i<4;i++)fillR(g,42,10+i*2.2,11,1,[70,74,88])});
AA.car=function(i){const col=hx(['#c8483c','#3a72c0','#e8b830','#3a9466','#9aa0ac','#ecebe6'][i]);return g=>{
 g.beginPath();g.ellipse(32,61,29,2.6,0,0,7);g.fillStyle=css(SHT,.4);g.fill();
 const body=[[4,52],[4,37],[6,32],[12,30],[52,30],[58,32],[60,37],[60,52]],cab=[[13,30],[19,12],[22,10],[42,10],[45,12],[51,30]];
 fillP(g,cab,col);clipP(g,cab,()=>fillR(g,40,0,30,40,dk(col,.3)));fillP(g,body,col);clipP(g,body,()=>{fillR(g,0,42,64,20,dk(col,.35));fillR(g,0,32,64,1.6,lt(col,.55))});
 const ws=[[16,29],[21,14],[43,14],[48,29]];fillP(g,ws,[44,62,128]);clipP(g,ws,()=>{fillP(g,[[22,29],[27,14],[31,14],[26,29]],[150,180,236],.8);fillP(g,[[33,29],[37,14],[39,14],[35,29]],[150,180,236],.5);fillR(g,0,25,64,5,[30,40,90],.5)});
 hl(g,ws,INK,.5,{close:1,amp:.05});hl(g,cab,INK,.75,{close:1,amp:.08});hl(g,body,INK,.85,{close:1,amp:.08});
 for(const x of[6,48]){cblock(g,x,37,10,4.6,[255,240,170],{s:.8,m:0,lw:.5})}cblock(g,20,40,24,6.6,[54,54,66],{s:.8,m:0,lw:.5});for(let k=0;k<3;k++)hl(g,[[22,41.8+k*1.6],[42,41.8+k*1.6]],[110,110,124],.4,{amp:.02});
 cblock(g,3,49,58,4,[86,88,100],{s:1,m:0,lw:.6});cblock(g,26,50,12,3.6,[240,240,236],{s:.6,m:0,lw:.4});
 for(const x of[12,52]){g.beginPath();g.arc(x,56,6.6,0,7);g.fillStyle=css([30,28,38]);g.fill();g.beginPath();g.arc(x,56,3.2,0,7);g.fillStyle=css([180,184,196]);g.fill();g.beginPath();g.arc(x,56,3.2,.2,2.6);g.fillStyle=css([120,124,140]);g.fill();g.beginPath();g.arc(x,56,6.6,0,7);g.strokeStyle=css(INK);g.lineWidth=.7;g.stroke()}
 if(i==2){cblock(g,25,3,14,7,[250,248,236],{s:.8,m:0,lw:.5});htext(g,'TAXI',32,6.6,12,5,[30,26,30],null)}}};

/* ======================= DUNGEON CEILINGS (roofTex) and the shop ceiling ======================= */
AA.roof=function(n,hue,v){return paint(g=>{
 if(n=='lab'||n=='foundry'){const C=n=='lab'?[176,180,190]:[140,128,116];for(let y=0;y<2;y++)for(let x=0;x<2;x++)concrete(g,x*32,y*32,32,32,C,{});if(v){cblock(g,37,5,22,22,[64,68,80],{s:1.4,mn:2});for(let y=8;y<25;y+=3.4)cblock(g,39,y,18,1.8,[128,134,148],{s:.5,m:0,lw:.28})}}
 else if(n=='manor'){planks(g,0,0,64,64,{n:4,vertical:false,col:[128,80,48]});if(v){cblock(g,-1,25,66,13,[84,52,34],{s:2,mn:5});hl(g,[[0,26.4],[64,26.4]],[214,170,80],.4);hl(g,[[0,36.4],[64,36.4]],[214,170,80],.4)}}
 else if(n.includes('cave')||n.includes('mine')){rockFace(g,[112,98,84]);if(v)planks(g,0,27,64,9,{n:1,vertical:false,col:[138,94,56],joints:false})}
 else{stones(g,0,0,64,64,{rows:4,cols:2,col:H(hue,.1,.48),cracks:.1,chips:.15});if(v){cblock(g,-1,27,66,9,[104,74,50],{s:1.6,mn:4});hl(g,[[0,31],[64,31.4]],css([60,40,28],.6),.3,{amp:.3})}}})};
AA.shopCeil=function(litv){return paint(g=>{const C=[232,224,204];for(let y=0;y<2;y++)for(let x=0;x<2;x++)cblock(g,x*32+.3,y*32+.3,31.4,31.4,C,{s:.9,mn:5,lw:.38,ma:.12});
 if(litv){cblock(g,36,4,24,24,[170,164,150],{s:1,mn:2});vgr(g,38,6,20,20,[[0,[255,254,240]],[1,[255,240,196]]]);hrect(g,38,6,20,20,[110,100,90],.34);for(let x=42;x<58;x+=4)hl(g,[[x,6],[x,26]],[220,200,150],.3,{amp:.02});glow(g,48,16,14,[255,250,220],.25)}})};

/* ======================= THE COLISEUM ======================= */
const SAND=[222,198,152],SANDJ=[150,124,90];
function colStoneA(g,base){stones(g,0,0,64,64,{rows:4,cols:2,col:base||SAND,joint:SANDJ,chips:.25,cracks:.15})}
function colArchA(g,x0,x1,top,bot,sky){const r=(x1-x0)/2,cx=(x0+x1)/2,P=()=>{g.beginPath();g.moveTo(x0,bot);g.lineTo(x0,top+r);g.arc(cx,top+r,r,Math.PI,0);g.lineTo(x1,bot);g.closePath()};
 P();g.save();g.clip();if(sky){vgr(g,x0,top,x1-x0,bot-top,[[0,[86,128,206]],[.7,[164,200,236]],[1,[220,232,240]]]);g.fillStyle=css([255,252,246],.92);g.beginPath();g.ellipse(cx-r*.3,top+r*.95,r*.55,r*.2,0,0,7);g.ellipse(cx+r*.25,top+r*.82,r*.38,r*.22,0,0,7);g.fill();g.fillStyle=css([200,206,230],.8);g.beginPath();g.ellipse(cx-r*.2,top+r*1.08,r*.5,r*.08,0,0,7);g.fill()}
 else{vgr(g,x0,top,x1-x0,bot-top,[[0,[44,32,58]],[.6,[30,24,44]],[1,[58,44,52]]]);fillR(g,x0,top,(x1-x0)*.3,bot-top,[20,14,30],.4);glow(g,cx,bot,r*.9,[255,190,110],.18)}g.restore();
 for(let i=0;i<8;i++){const a=Math.PI+i/8*Math.PI,a2=Math.PI+(i+1)/8*Math.PI,c=i%2?[236,218,178]:[224,204,160];g.beginPath();g.arc(cx,top+r,r+3.4,a,a2);g.arc(cx,top+r,r,a2,a,true);g.closePath();g.fillStyle=css(c);g.fill();
  const mx=cx+Math.cos((a+a2)/2)*(r+1.7),my=top+r+Math.sin((a+a2)/2)*(r+1.7);if(i>3){g.save();g.clip();fillR(g,mx-3,my,6,6,dk(c,.3));g.restore()}
  const p=[];for(let k=0;k<=4;k++){const t=a+(a2-a)*k/4;p.push([cx+Math.cos(t)*(r+3.4),top+r+Math.sin(t)*(r+3.4)])}hl(g,p,ik(c),.4,{amp:.04});hl(g,[[cx+Math.cos(a)*r,top+r+Math.sin(a)*r],[cx+Math.cos(a)*(r+3.4),top+r+Math.sin(a)*(r+3.4)]],ik(c),.35)}
 const p=[[x0,bot],[x0,top+r]];for(let k=0;k<=16;k++){const t=Math.PI+k/16*Math.PI;p.push([cx+Math.cos(t)*r,top+r+Math.sin(t)*r])}p.push([x1,bot]);hl(g,p,INK,.6,{amp:.06})}
function colCorniceA(g){ledge(g,-1,0,66,3.2,[240,226,190]);for(let x=1;x<64;x+=4){cblock(g,x,3.2,2,1.6,[200,180,136],{s:.4,m:0,lw:.25})}}
function colShaftA(g){colStoneA(g,[210,190,146]);fillP(g,[[58,0],[60.5,0],[60.5,64],[58,64]],SHT,.3);const C=[232,214,172];fillR(g,6,0,52,64,C);
 for(let x=6;x<58;x+=6.5){fillR(g,x+.8,0,1.4,64,lt(C,.45));fillR(g,x+4.4,0,2.1,64,dk(C,.25));hl(g,[[x+6.5,0],[x+6.5,64]],css(dk(C,.6),.8),.3,{amp:.08})}
 fillR(g,38,0,20,64,dk(C,.38),.85);fillR(g,6,0,3,64,dk(C,.3),.6);mottle(g,6,0,52,64,C,{a:.14,n:10,blur:5});hl(g,[[6,0],[6,64]],INK,.55,{amp:.06});hl(g,[[58,0],[58,64]],INK,.55,{amp:.06})}
AA.coli=function(emp){
 const arcLo=paint(g=>{colStoneA(g);colArchA(g,13,51,10,64,0);cblock(g,-1,60,66,4.5,[180,158,116],{s:1,m:0})}),
 arcUp=paint(g=>{colStoneA(g);colCorniceA(g);colArchA(g,22,42,16,56,1);ledge(g,18,55,28,2.6,[240,226,190]);ledge(g,-1,60,66,4,[214,194,150])}),
 pilLo=paint(g=>{colShaftA(g);cblock(g,2,52,60,12,[198,178,134],{s:2,mn:4});ledge(g,1,50.6,62,1.6,[236,220,184])}),
 pilUp=paint(g=>{colShaftA(g);ledge(g,-1,0,66,5.6,[240,226,190]);const cap=[[4,7],[60,7],[52,17],[12,17]];fillP(g,cap,[232,214,174]);clipP(g,cap,()=>fillR(g,0,13,64,6,dk([232,214,174],.3)));hl(g,cap,INK,.45,{close:1,amp:.05});
  for(const x of[10,54]){g.beginPath();g.arc(x,11,3,0,7);g.fillStyle=css([236,220,182]);g.fill();g.beginPath();g.arc(x,11,3,.3,2.6);g.fillStyle=css(dk([236,220,182],.3));g.fill();const p=[];for(let k=0;k<=24;k++){const t=k/24*6.28*1.5,rr=3-k/24*2;p.push([x+Math.cos(t)*rr,11+Math.sin(t)*rr])}hl(g,p,ik([236,220,182]),.32,{amp:.02})}}),
 rubLo=paint(g=>{stones(g,0,0,64,64,{rows:4,cols:2,col:[196,176,136],joint:[120,100,72],chips:.6,cracks:.6,moss:9});const R=rnd(3);for(let k=0;k<3;k++)crack(g,R()*64,R()*30,18,[196,176,136]);drips(g,0,40,64,20,[196,176,136],.18)}),
 rubUp=paint(g=>{stones(g,0,0,64,64,{rows:4,cols:2,col:[196,176,136],joint:[120,100,72],chips:.4,cracks:.4});const B=[150,44,40];cblock(g,-1,20,66,24,B,{s:2,mn:8});fillR(g,0,20,64,1.6,[226,180,70]);fillR(g,0,42.4,64,1.6,[226,180,70]);
  for(let x=0;x<64;x+=8){hrect(g,x+1.5,26.5,5,5,[226,180,70],.9,{amp:.05});hrect(g,x+3.5,33.5,5,5,[226,180,70],.9,{amp:.05})}drips(g,0,44,64,12,B,.18)}),
 gatLo=paint(g=>{colStoneA(g,[218,196,150]);colArchA(g,12,52,8,64,0);g.save();g.beginPath();g.moveTo(12,64);g.lineTo(12,28);g.arc(32,28,20,Math.PI,0);g.lineTo(52,64);g.closePath();g.clip();
  const M=[96,100,116];for(let x=18;x<=46;x+=7){fillR(g,x-1,8,2,56,M);fillR(g,x+.2,8,.8,56,dk(M,.4));hl(g,[[x-1,8],[x-1,64]],INK,.3);hl(g,[[x+1,8],[x+1,64]],INK,.3)}for(let y=24;y<64;y+=12){fillR(g,12,y-1,40,2,M);fillR(g,12,y+.2,40,.8,dk(M,.4));hrect(g,12,y-1,40,2,INK,.28)}for(let x=18;x<=46;x+=7)for(let y=24;y<64;y+=12)bolt(g,x,y,lt(M,.4));g.restore();
  for(const x of[5,59]){cblock(g,x-1.1,34,2.2,12,[70,48,32],{s:.6,m:0,lw:.35});glow(g,x,29,12,[255,170,70],.55);const fl=[[x,22.5],[x+2.8,28.5],[x+1.6,32.5],[x-1.6,32.5],[x-2.8,28.5]];fillP(g,fl,[255,160,50]);fillP(g,[[x,25.5],[x+1.4,29.6],[x,32.3],[x-1.4,29.6]],[255,236,150]);hl(g,fl,[180,60,30],.3,{close:1,amp:.03})}}),
 gatUp=paint(g=>{colStoneA(g);colCorniceA(g);const B=[166,40,46],bp=[[19,10],[45,10],[45,50],[32,57],[19,50]];fillP(g,[[20.5,11],[46.5,11],[46.5,51],[33.5,58.5],[20.5,51]],SHT,.3);fillP(g,bp,B);clipP(g,bp,()=>{fillR(g,36,0,20,64,dk(B,.35));mottle(g,19,10,26,47,B,{a:.16,n:6})});hl(g,bp,ik(B),.55,{close:1,amp:.06});
  const Y=[232,186,72];g.strokeStyle=css(Y);g.lineWidth=1.5;g.beginPath();g.arc(32,26,7.2,0,7);g.stroke();hl(g,[[32,16.5],[32,50]],Y,1.5,{amp:.03});hl(g,[[24.5,26],[39.5,26]],Y,1.5,{amp:.03});ledge(g,-1,60,66,4,[214,194,150])});
 const med=paint(g=>{earth(g,[226,206,164],{pebbles:3});const T=[176,84,52];g.strokeStyle=css(T);g.lineWidth=3.2;g.strokeRect(4,4,56,56);g.lineWidth=2.4;g.beginPath();g.moveTo(32,11);g.lineTo(53,32);g.lineTo(32,53);g.lineTo(11,32);g.closePath();g.stroke();hrect(g,2.4,2.4,59.2,59.2,ik(T),.35);g.beginPath();g.arc(32,32,6,0,7);g.fillStyle=css([196,104,62]);g.fill();g.beginPath();g.arc(32,32,6,.2,2.9);g.fillStyle=css(dk([196,104,62],.3));g.fill()}),
 bld=paint(g=>{earth(g,[224,196,146],{pebbles:5,lines:1});tile9(g,()=>{const R=rnd(9);for(let k=0;k<6;k++){const x=R()*64,y=R()*64,r=2+R()*4,pts=[];for(let i=0;i<9;i++){const a=i/9*6.28,q=r*(.6+R()*.5);pts.push([x+Math.cos(a)*q,y+Math.sin(a)*q*.6])}fillP(g,pts,[146,36,38]);fillP(g,[[x-r*.4,y-r*.15],[x,y-r*.3],[x+r*.1,y-r*.1]],[220,120,120],.7);hl(g,pts,[80,16,24],.3,{close:1,amp:.03,gap:.2})}})}),
 fgs=paint(g=>{fillR(g,0,0,64,64,[110,104,96]);for(let y=0;y<2;y++)for(let x=-1;x<2;x++)cblock(g,x*32+(y&1?16:0)+.5,y*32+.5,31,31,[186,178,162],{s:1.6,mn:6,lw:.45})}),
 hu=[[150,90,70],[70,110,160],[170,70,70],[90,140,80],[190,160,90],[130,80,150],[220,180,140],[60,80,120]],
 rs=(fh,fn,spec)=>paint(g=>{stones(g,0,0,64,64,{rows:4,cols:2,col:[226,206,164],joint:SANDJ,chips:.15,cracks:.1});const r0=((1-fn)*64)|0,L=Math.ceil((fn-fh)*64)+1;const R=rnd(Math.round(fn*100)+(emp?7:3));
  for(const o of[r0-64,r0,r0+64]){g.save();g.translate(0,o);if(!spec){ledge(g,-1,0,66,4,[240,226,190])}
   else{fillR(g,0,0,64,L,[196,176,134]);vgr(g,0,0,64,10,[[0,[40,30,52]],[1,[70,54,66]]]);
    for(let k=0;k<4;k++){const x=k*16;if(!emp&&R()<.75){const body=hu[(R()*hu.length)|0],skin=[[252,222,196],[234,186,150],[180,126,90],[255,232,210]][(R()*4)|0],hair=[[40,30,40],[120,60,34],[232,196,90],[70,60,130],[196,70,50]][(R()*5)|0];
      cblock(g,x+3,5,10,6,body,{s:1,m:0,lw:.38});g.beginPath();g.arc(x+8,3.6,2.5,0,7);g.fillStyle=css(skin);g.fill();g.beginPath();g.arc(x+8,3.6,2.5,.3,2.6);g.fillStyle=css(dk(skin,.25));g.fill();g.beginPath();g.arc(x+8,3,2.6,Math.PI*1.05,Math.PI*1.95);g.fillStyle=css(hair);g.fill();g.beginPath();g.arc(x+8,3.6,2.5,0,7);g.strokeStyle=css(INK);g.lineWidth=.32;g.stroke();fillR(g,x+7,3.6,.45,.8,INK);fillR(g,x+8.6,3.6,.45,.8,INK)}
     cblock(g,x+1,10,14,3,[[176,52,50],[220,170,64],[140,50,80],[220,170,64]][k],{s:.7,m:0,lw:.32})}ledge(g,-1,13,66,2,[240,226,190])}g.restore()}}),
 riser=rs(0,.55,0),RS=[];for(let k=0;k<4;k++){const f=k?.55+.25*k:.55;RS[Math.round(f*100)]=k?rs(f-.25,f,1):riser}
 const cap=paint(g=>{earth(g,[228,210,170],{pebbles:3});ledge(g,-1,0,66,3,[196,176,134]);ledge(g,-1,61,66,3,[196,176,134])}),
 seatTop=paint(g=>{earth(g,[208,186,140],{pebbles:2});for(let k=0;k<4;k++)cblock(g,k*16+2,20,12,24,[[176,52,50],[220,170,64],[140,50,80],[220,170,64]][k],{s:1.6,mn:3})});
 return{TX:[arcLo,pilLo,rubLo,gatLo],TU:[arcUp,pilUp,rubUp,gatUp],CT:[null,med,bld,fgs,cap,seatTop],RT:riser,RTS:RS}};
AA.coliFloor=()=>paint(g=>earth(g,[228,204,156],{pebbles:3,lines:1}));

/* ======================= THE BANDIT HIDEOUT ======================= */
AA.hide=function(){
 const fence=paint(g=>{planks(g,0,0,64,64,{n:8,col:[136,110,84],nails:1});drips(g,0,0,64,30,[136,110,84],.18);cblock(g,-1,0,66,3,[82,66,56],{s:.8});cblock(g,-1,61,66,3,[82,66,56],{s:.8})}),
 cb=g=>{for(let y=0;y<4;y++)for(let x=-1;x<4;x++)concrete(g,x*16+(y&1?8:0),y*16,16,16,[170,166,156],{bolts:false,stain:y==0,crack:(x+y)%3==0})},
 conc=paint(g=>{cb(g);cblock(g,-1,58,66,6,[96,90,80],{s:1});drips(g,0,0,64,40,[170,166,156],.2)}),
 wood=paint(g=>{planks(g,0,0,64,64,{n:8,vertical:false,col:[150,104,62]});for(const[x,y]of[[6,3],[58,3],[6,35],[58,35]])bolt(g,x,y,[200,196,186])}),
 steel=paint(g=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++)concrete(g,x*32,y*32,32,32,[112,124,146],{stain:1});for(let i=0;i<8;i++){fillP(g,[[i*8,64],[i*8+8,64],[i*8+16,56],[i*8+8,56]],i&1?[36,34,44]:[228,184,48])}hrect(g,0,56,64,8,INK,.45)}),
 cont=paint(g=>{corrugated(g,0,0,64,64,[184,92,52],{n:11,rust:1});cblock(g,-1,0,66,2,[96,48,30],{s:.5,m:0});cblock(g,-1,62,66,2,[96,48,30],{s:.5,m:0});htext(g,'BNDT-04',32,14,40,8,[244,236,214],[96,48,30])}),
 skull=paint(g=>{cb(g);cblock(g,-1,58,66,6,[96,90,80],{s:1});const F=[34,30,40];fillP(g,[[11.5,6.5],[55.5,6.5],[55.5,52.5],[11.5,52.5]],SHT,.35);cblock(g,10,5,44,46,F,{s:1.4,mn:6,ic:[10,8,14]});fillR(g,10,5,44,3,[176,40,46]);fillR(g,10,48,44,3,[176,40,46]);
  const B=[240,232,212];g.beginPath();g.arc(32,23,10.5,0,7);g.fillStyle=css(B);g.fill();g.save();g.beginPath();g.arc(32,23,10.5,0,7);g.clip();fillR(g,34,12,12,24,dk(B,.3));g.restore();cblock(g,25.5,27,13,9,B,{s:1.4,m:0,lw:.5});const ring=[];for(let k=0;k<=20;k++){const t=k/20*6.28;ring.push([32+Math.cos(t)*10.5,23+Math.sin(t)*10.5])}hl(g,ring,INK,.5,{amp:.05});
  for(const ex of[27.8,36.2]){g.beginPath();g.ellipse(ex,23,2.6,3,0,0,7);g.fillStyle=css(F);g.fill();g.beginPath();g.arc(ex+.4,22.5,.8,0,7);g.fillStyle=css([255,80,80]);g.fill()}fillP(g,[[32,26.4],[33.2,29],[30.8,29]],F);for(let i=0;i<4;i++)fillR(g,27.4+i*3,31.5,.8,4,F);
  g.save();g.translate(32,42);for(const s of[-1,1]){g.save();g.rotate(s*.6);cblock(g,-16,1,32,3,B,{s:.8,m:0,lw:.45});g.restore()}g.restore()}),
 dirt=paint(g=>earth(g,[150,126,96],{pebbles:12,cracks:3})),
 slab=paint(g=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++)concrete(g,x*32,y*32,32,32,[160,158,150],{bolts:false,crack:x!=y})}),
 plank=paint(g=>planks(g,0,0,64,64,{n:6,col:[140,96,58]})),
 plate=paint(g=>{for(let y=0;y<8;y++)for(let x=0;x<8;x++)cblock(g,x*8+.3,y*8+.3,7.4,7.4,[100,110,130],{s:.7,mn:1,lw:.3});const Rd=[206,52,54];g.strokeStyle=css(Rd);g.lineWidth=2;g.beginPath();g.arc(32,32,22,0,6.3);g.stroke();fillR(g,30,6,4,52,Rd);fillR(g,6,30,52,4,Rd);
  const ring=r=>{const p=[];for(let k=0;k<=40;k++){const t=k/40*6.28;p.push([32+Math.cos(t)*r,32+Math.sin(t)*r])}return p};hl(g,ring(23),INK,.35,{amp:.03});hl(g,ring(21),INK,.35,{amp:.03})});
 return{fence,conc,wood,steel,cont,skull,dirt,slab,plank,plate}};

/* ======================= THE CORNER SHOP (inside) ======================= */
AA.shop=function(){
 const wallBase=g=>{const P=[240,214,200];wash(g,0,0,64,44,P,{streak:1});for(let x=0;x<64;x+=8){fillR(g,x,0,4,42,[226,186,172],.4);for(let y=4;y<40;y+=9){const cx=x+2,cy=y+((x/8)&1?4:0);fillP(g,[[cx,cy-2],[cx+1.3,cy],[cx,cy+2],[cx-1.3,cy]],[214,140,130])}}
  ledge(g,-1,41.6,66,2.4,[214,170,130]);planks(g,0,44,64,20,{n:4,col:[168,116,74]});cblock(g,-1,59.6,66,4.4,[110,70,44],{s:1})};
 const wall=paint(g=>wallBase(g)),
 frame=paint(g=>{wallBase(g);sign(g,12,8,40,15,'EXIT',[40,150,80],[255,255,236])}),
 sign2=paint(g=>{vgr(g,0,0,64,44,[[0,[48,40,80]],[1,[30,26,54]]]);mottle(g,0,0,64,44,[44,36,70],{a:.2,n:8});planks(g,0,44,64,20,{n:4,col:[168,116,74]});cblock(g,-1,59.6,66,4.4,[110,70,44],{s:1});
  glow(g,32,22,30,[255,110,180],.35);g.strokeStyle=css([255,120,190]);g.lineWidth=1.6;g.strokeRect(4,6,56,32);g.strokeStyle=css([255,226,240]);g.lineWidth=.5;g.strokeRect(4,6,56,32);
  htext(g,'SHOP',32,22,50,14,[255,244,250],[230,60,150],{olw:.18});for(const x of[12,22,32,42,52]){glow(g,x,33,2.4,[255,220,90],.8);g.beginPath();g.arc(x,33,.9,0,7);g.fillStyle=css([255,240,170]);g.fill()}}),
 chk=paint(g=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++)cblock(g,x*16+.3,y*16+.3,15.4,15.4,(x+y)&1?[160,206,194]:[246,238,218],{s:.9,mn:3,lw:.35})}),
 rug=paint(g=>{const Rr=[176,52,64];fillR(g,0,0,64,64,Rr);mottle(g,0,0,64,64,Rr,{wrap:1,a:.18,n:20,blur:6});fillR(g,0,0,64,3,[230,186,96]);fillR(g,0,61,64,3,[230,186,96]);for(let r=0;r<3;r++)for(let c=0;c<8;c++){const cx=c*8+4,cy=14+r*17,p=[[cx,cy-5],[cx+3.4,cy],[cx,cy+5],[cx-3.4,cy]];fillP(g,p,[230,186,96]);hl(g,p,[96,28,40],.3,{close:1,amp:.03});g.beginPath();g.arc(cx,cy,1.2,0,7);g.fillStyle=css([96,28,40]);g.fill()}}),
 poster=p=>paint(g=>{wallBase(g);g.save();g.translate(-64*p,0);const X0=5,Y0=2,W0=118,H0=38;fillP(g,[[X0+1.4,Y0+H0],[X0+W0+1.4,Y0+H0],[X0+W0+1.4,Y0+1.4]],SHT,.3);
  clipR(g,X0,Y0,W0,H0,()=>{fillR(g,X0,Y0,W0,H0,[250,206,70]);for(let i=0;i<22;i++){const a0=i/22*6.2832,a1=(i+.5)/22*6.2832;fillP(g,[[40,17],[40+Math.cos(a0)*120,17+Math.sin(a0)*120],[40+Math.cos(a1)*120,17+Math.sin(a1)*120]],i%2?[240,130,48]:[226,70,52])}mottle(g,X0,Y0,W0,H0,[240,150,60],{a:.2,n:12})});
  htext(g,'SCRATCH',36,10,60,11.5,[255,252,240],[30,20,34],{it:1,olw:.26});htext(g,'-OFFS!',36,22,60,11.5,[255,226,80],[30,20,34],{it:1,olw:.26});htext(g,'SCRATCH. WIN. REGRET.',36,29.6,62,4.6,[30,20,34],null);
  g.save();g.translate(99,16);g.rotate(-.12);cblock(g,-21,-13,40,28,[252,248,232],{s:1,m:0,lw:.5});fillR(g,-20,-12,38,6.4,[200,44,56]);htext(g,'LUCKY STARS',-1,-8.8,36,4.4,[255,255,255],null);
  for(let i=0;i<3;i++){const x=-14+i*12.5;cblock(g,x-5,-3.5,10,10,i==2?[184,188,198]:[255,240,184],{s:.8,m:0,lw:.35});if(i<2)htext(g,'★',x,1.4,9,9,[226,150,20],null);else htext(g,'?',x,1.6,9,6,[100,104,120],null)}
  htext(g,'scratch here with a coin',-1,10.6,38,3.6,[100,104,120],null);g.restore();
  g.beginPath();g.arc(68,8,6.6,0,6.2832);g.fillStyle=css([200,44,56]);g.fill();g.strokeStyle='#fff';g.lineWidth=.8;g.stroke();htext(g,'$10',68,8.4,12,6.6,[255,255,255],null);
  fillR(g,X0+1,Y0+H0-9,W0-2,6.2,[200,44,56]);htext(g,'ASK THE CASHIER  *  FEELING LUCKY, PUNK?',64,Y0+H0-5.9,W0-6,4.8,[255,255,255],null);
  htext(g,'*Limit 10 per customer. Ask the cashier for details.',64,Y0+H0-1.6,W0-10,3,[80,60,50],null);hrect(g,X0,Y0,W0,H0,INK,.7,{amp:.08});g.restore()});
 return{TX:[wall,frame,sign2,poster(0),poster(1)],CT:[null,chk,rug]}};

/* ======================= THE ARCADE ======================= */
AA.arcade=function(t){
 const neon=(g,y,c)=>{g.save();g.filter='blur(3px)';fillR(g,0,y-1.5,64,3,c,.55);g.restore();fillR(g,0,y-.5,64,1,lt(c,.6))};
 const wallA=g=>{const C=[54,40,104];wash(g,0,0,64,44,C,{streak:1,top:.15,bot:.35});for(let x=0;x<64;x+=16)fillR(g,x,0,8,44,[80,64,140],.25);cblock(g,-1,44,66,20,[30,24,56],{s:1.6,mn:4});neon(g,44.5,[255,80,210]);neon(g,61.4,[80,230,255])};
 t.TX[0]=paint(g=>{wallA(g);neon(g,12,[255,80,210]);neon(g,32,[80,230,255]);
  const st=(x,y,c)=>{const p=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*.6283,r=k%2?.7:1.9;p.push([x+Math.cos(a)*r,y+Math.sin(a)*r])}glow(g,x,y,3.5,c,.5);fillP(g,p,c);hl(g,p,lt(c,.7),.2,{close:1,amp:.02})};for(let i=0;i<8;i++)st((i*37)%60+2,19+(i*11)%10,[[255,226,90],[90,230,255],[255,90,210],[140,255,140]][i&3])});
 t.TX[2]=paint(g=>{wallA(g);glow(g,32,23,34,[80,230,255],.3);g.strokeStyle=css([80,230,255]);g.lineWidth=1.8;g.strokeRect(2,8,60,30);g.strokeStyle=css([224,250,255]);g.lineWidth=.5;g.strokeRect(2,8,60,30);
  g.save();g.filter='blur(3px)';htext(g,'ARCADE',32,23,54,12,[255,80,200],null);g.restore();htext(g,'ARCADE',32,23,54,12,[255,236,250],[230,50,170],{olw:.16});for(const x of[10,22,34,46,54]){glow(g,x,40.5,2.4,[255,220,90],.8);g.beginPath();g.arc(x,40.5,.9,0,7);g.fillStyle=css([255,240,170]);g.fill()}});
 const pst=(c1,c2,txt)=>paint(g=>{wallA(g);cblock(g,10,6,44,34,c1,{s:1.4,mn:3});fillR(g,12,8,40,30,[24,18,50]);mottle(g,12,8,40,30,[40,30,80],{a:.3,n:6});htext(g,txt[0],32,16.8,36,8.6,c2,INK);htext(g,txt[1],32,29,36,8.6,c2,INK);fillR(g,14,22.6,36,.8,c1)});
 t.TX[3]=pst([255,220,90],[255,130,190],['HIGH','SCORES']);t.TX[4]=pst([140,255,140],[90,230,255],['INSERT','COIN']);
 t.CT[1]=paint(g=>{const C=[40,30,72];ground(g,C,{ma:.2,mn:16});g.strokeStyle=css([130,100,230],.5);g.lineWidth=.6;for(let k=0;k<=64;k+=16){g.beginPath();g.moveTo(k,0);g.lineTo(k,64);g.moveTo(0,k);g.lineTo(64,k);g.stroke()}
  for(let i=0;i<10;i++){const x=(i*29)%58+3,y=(i*17)%58+3,c=[[255,90,210],[90,230,255],[255,226,90],[140,255,140]][i&3];let p;if(i%3==0){p=[];for(let k=0;k<8;k++)p.push([x+Math.cos(k*.785)*2,y+Math.sin(k*.785)*2])}else if(i%3==1)p=[[x,y-2.2],[x+2,y+1.6],[x-2,y+1.6]];else p=RECT(x-1.7,y-1.7,3.4,3.4);fillP(g,p,c);hl(g,p,lt(c,.6),.3,{close:1,amp:.02})}});
 return t};

/* ======================= HAZARD AREAS, CTF ======================= */
AA.haz=c2=>paint(g=>{hazStripes(g,5,56,hx(c2),[34,32,44]);cblock(g,-1,0,66,5,[132,138,154],{s:1,mn:3});cblock(g,-1,56,66,8,[132,138,154],{s:1.4,mn:3});fillR(g,0,59.4,64,1.4,[64,66,80]);for(const x of[4,20,36,52])bolt(g,x,2.5,[160,164,180])});
AA.hazFloor=()=>paint(g=>{hazStripes(g,0,64,[176,146,40],[38,36,46]);g.strokeStyle=css([228,190,52]);g.lineWidth=2.6;g.strokeRect(1.5,1.5,61,61);hrect(g,.3,.3,63.4,63.4,INK,.4);hrect(g,2.8,2.8,58.4,58.4,INK,.4)});
AA.ctfWall=h=>paint(g=>{bricks(g,0,0,64,64,{rows:4,cols:2,col:H(h,.45,.48),mortar:H(h,.3,.28)});const B=H(h,.7,.55);cblock(g,-1,26,66,12,B,{s:1.8,mn:4});drips(g,0,38,64,14,B,.2)});
AA.ctfFloor=(h,pad)=>paint(g=>{for(let y=0;y<8;y++)for(let x=0;x<8;x++)cblock(g,x*8+.3,y*8+.3,7.4,7.4,H(h,pad?.55:.3,((x+y)&1)?(pad?.5:.34):(pad?.42:.28)),{s:.8,mn:1,lw:.3});
 if(pad){const c=H(h,.85,.75);g.save();g.filter='blur(2px)';g.strokeStyle=css(c,.6);g.lineWidth=3.5;g.strokeRect(6,6,52,52);g.beginPath();g.arc(32,32,14,0,7);g.stroke();g.restore();g.strokeStyle=css(lt(c,.4));g.lineWidth=1.8;g.strokeRect(6,6,52,52);g.beginPath();g.arc(32,32,14,0,7);g.stroke()}});

/* ======================= BATTLE ROYALE ======================= */
AA.br=function(){
 const rock=paint(g=>rockFace(g,[124,124,132])),
 wood=paint(g=>planks(g,0,0,64,64,{n:8,vertical:false,col:[160,110,62]})),
 conc=paint(g=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++)concrete(g,x*32,y*32,32,32,[170,172,178],{stain:y==0});for(let x=-8;x<64;x+=16)fillP(g,[[x,64],[x+8,64],[x+16,56],[x+8,56]],[228,184,48]);hrect(g,-1,56,66,8,INK,.35)}),
 barn=paint(g=>{planks(g,0,0,64,64,{n:8,col:[176,62,50]});const Wt=[244,236,222];g.strokeStyle=css(Wt);g.lineWidth=2.6;g.strokeRect(2,2,60,60);g.beginPath();g.moveTo(2,2);g.lineTo(62,62);g.moveTo(62,2);g.lineTo(2,62);g.stroke();hrect(g,.7,.7,62.6,62.6,INK,.35);drips(g,0,0,64,40,[176,62,50],.15)}),
 stone=paint(g=>stones(g,0,0,64,64,{rows:8,cols:4,col:[172,172,162],joint:[90,90,90],moss:4,chips:.15,cracks:.1})),
 iceW=paint(g=>{bricks(g,0,0,64,64,{rows:4,cols:2,col:[186,222,240],mortar:[120,170,206]});const R=rnd(8);for(let i=0;i<7;i++){const x=R()*64,y=R()*64;hl(g,[[x,y],[x+(R()-.5)*12,y+(R()-.5)*12]],[255,255,255],.45,{taper:1})}}),
 logW=paint(g=>{for(let y=0;y<8;y++){const c=H(26+(y*5)%7,.48,.4+((y*3)%5)*.02);fillR(g,0,y*8,64,8,c);fillR(g,0,y*8+.6,64,1.6,lt(c,.3));fillR(g,0,y*8+5,64,3,dk(c,.4));hl(g,[[0,y*8+4],[30,y*8+4.4],[64,y*8+3.8]],css(dk(c,.5),.6),.25,{amp:.2,gap:.2});hl(g,[[0,y*8+8],[64,y*8+8]],ik(c),.45,{amp:.08});
  g.beginPath();g.arc(1.8,y*8+4,2.8,0,7);g.fillStyle=css([216,172,108]);g.fill();g.beginPath();g.arc(1.8,y*8+4,1.5,0,7);g.strokeStyle=css([140,90,50]);g.lineWidth=.3;g.stroke();g.beginPath();g.arc(1.8,y*8+4,2.8,0,7);g.strokeStyle=css(INK);g.stroke()}}),
 sandW=paint(g=>stones(g,0,0,64,64,{rows:4,cols:3,col:[222,190,136],joint:[150,116,74]})),
 adobeW=paint(g=>{const C=[214,160,110];wash(g,0,0,64,64,C,{streak:1});peel(g,46,30,3,C);crack(g,20,18,14,C);cblock(g,-1,52,66,12,[180,124,78],{s:1.6,mn:4});for(let x=6;x<64;x+=16){g.beginPath();g.arc(x,6,3,0,7);g.fillStyle=css([120,76,44]);g.fill();g.beginPath();g.arc(x,6,3,.2,2.8);g.fillStyle=css([86,52,30]);g.fill();g.beginPath();g.arc(x,6,3,0,7);g.strokeStyle=css(INK);g.lineWidth=.35;g.stroke()}drips(g,0,9,64,14,C,.2)}),
 metalW=paint(g=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++)concrete(g,x*32,y*32,32,32,[124,140,160],{stain:1});cblock(g,-1,56,66,4,[226,124,52],{s:.8,m:0})});
 /* the town (0.9.229): red brick, cream plaster, pale teal plaster */
 const brickW=paint(g=>bricks(g,0,0,64,64,{rows:8,cols:4,col:[176,74,58],mortar:[120,96,84]})),
 creamW=paint(g=>{const C=[236,220,180];wash(g,0,0,64,64,C,{streak:1});crack(g,40,22,10,C)}),
 tealW=paint(g=>{const C=[132,186,180];wash(g,0,0,64,64,C,{streak:1});peel(g,18,40,3,C)});
 const TXa=[rock,wood,conc,barn,stone,iceW,logW,sandW,adobeW,metalW,brickW,creamW,tealW];
 const grassT=paint(g=>grass(g,[96,156,70])),dirt=paint(g=>earth(g,[168,126,84])),gravel=paint(g=>earth(g,[154,150,144],{pebbles:34,pc:[196,192,184]})),dk2=paint(g=>grass(g,[66,118,58],{sd:47})),
 plank=paint(g=>planks(g,0,0,64,64,{n:8,vertical:false,col:[154,104,60]})),conf=paint(g=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++)concrete(g,x*32,y*32,32,32,[166,166,168],{bolts:false})}),
 hay=paint(g=>{const C=[226,186,96];ground(g,C,{ma:.22,mn:18});tile9(g,()=>{const R=rnd(52);for(let i=0;i<70;i++){const x=R()*64,y=R()*64,a=R()*3.14;hl(g,[[x,y],[x+Math.cos(a)*4,y+Math.sin(a)*4]],R()<.5?lt(C,.5):dk(C,.4),.4,{amp:.05,taper:1})}})}),
 riser=paint(g=>{grass(g,[80,136,60],{n:18,flowers:0});ledge(g,-1,0,66,2,[60,100,48])}),
 shing=paint(g=>roofTiles(g,[140,96,64],8)),tin=paint(g=>corrugated(g,0,0,64,64,[156,168,184],{n:8})),rtin=paint(g=>corrugated(g,0,0,64,64,[186,70,54],{n:8,rust:1})),slate=paint(g=>roofTiles(g,[92,104,130],8)),
 snow=paint(g=>{const C=[236,242,252];ground(g,C,{ma:.25,mn:18});tile9(g,()=>{const R=rnd(55);for(let i=0;i<8;i++){g.beginPath();g.ellipse(R()*64,R()*64,5+R()*7,1.6+R()*2,0,0,7);g.fillStyle=css([170,190,236],.3);g.fill()}for(let i=0;i<18;i++){g.beginPath();g.arc(R()*64,R()*64,.4,0,7);g.fillStyle='#fff';g.fill()}})}),
 sand=paint(g=>earth(g,[230,206,156],{pebbles:5,lines:1})),psnow=paint(g=>earth(g,[214,224,240],{pebbles:4,pc:[250,252,255]})),
 iceF=paint(g=>{const C=[176,220,240];ground(g,C,{ma:.2,mn:12});const R=rnd(60);for(let i=0;i<8;i++){const x=R()*64,y=R()*64;hl(g,[[x,y],[x+(R()-.5)*16,y+(R()-.5)*16]],[255,255,255],.5,{taper:1})}fillP(g,[[0,40],[18,0],[28,0],[10,48]],[255,255,255],.25)}),
 dsand=paint(g=>earth(g,[204,166,116],{pebbles:8})),sstF=paint(g=>{fillR(g,0,0,64,64,[140,110,74]);for(let y=0;y<2;y++)for(let x=0;x<2;x++)cblock(g,x*32+.4,y*32+.4,31.2,31.2,[218,190,138],{s:1.4,mn:6})}),
 snRoof=paint(g=>{roofTiles(g,[118,132,164],6);for(let r=0;r<6;r++){const p=[[0,r*10.67]];for(let x=0;x<=64;x+=4)p.push([x,r*10.67+2.2+Math.sin(x*.7+r)*1.1]);p.push([64,r*10.67]);fillP(g,p,[246,250,255]);hl(g,p.slice(1,-1),[150,170,214],.3,{amp:.05})}}),
 tile=paint(g=>roofTiles(g,[206,92,58],8)),adRoof=paint(g=>{fillR(g,0,0,64,64,[150,104,70]);for(let y=0;y<2;y++)for(let x=0;x<2;x++)cblock(g,x*32+.4,y*32+.4,31.2,31.2,[210,160,112],{s:1.2,mn:6})}),mRoof=paint(g=>corrugated(g,0,0,64,64,[110,124,148],{n:6}));
  const cobble=paint(g=>stones(g,0,0,64,64,{rows:8,cols:8,col:[150,144,138],joint:[86,80,78],chips:.1})),pave=paint(g=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++)cblock(g,x*16+.4,y*16+.4,15.2,15.2,(x+y)&1?[196,188,174]:[208,200,186],{s:1,mn:3,lw:.3})});
 return{TX:TXa,RT:riser,CT:[null,dirt,gravel,dk2,plank,conf,hay,shing,tin,rtin,slate,snow,sand,psnow,iceF,dsand,sstF,snRoof,tile,adRoof,mRoof,cobble,pave],FT:grassT}};

/* ======================= DUNGEON WALLS AND FLOORS (tex / tex2 / ftex / btex) ======================= */
AA.wall=function(t,h){return paint(g=>{
 if(t==0)stones(g,0,0,64,64,{rows:4,cols:2,col:H(h,.16,.58),joint:H(h,.16,.28)});
 else if(t==1){for(let y=0;y<2;y++)for(let x=0;x<2;x++){concrete(g,x*32,y*32,32,24,H(h+40,.12,.6),{stain:1,crack:(x+y)&1});cblock(g,x*32+.3,y*32+24.3,31.4,7.4,H(h+40,.14,.46),{s:1,mn:3})}}
 else if(t==2)stones(g,0,0,64,64,{rows:4,cols:4,col:H(h-30,.18,.54),joint:H(h-30,.2,.26),stagger:0});
 else if(t==3)rockFace(g,H(h,.12,.44));
 else if(t==4){bricks(g,0,0,64,64,{rows:4,cols:2,col:H(h,.28,.52),mortar:H(h,.2,.3)});tile9(g,()=>{const R=rnd(4);for(let i=0;i<5;i++){const x=R()*64,y=R()*64,r=4+R()*5;moss(g,x,y,r);for(let d=0;d<2;d++){const dx=x+(R()-.5)*r;hl(g,[[dx,y],[dx+(R()-.5),y+r*.5+R()*5]],[70,120,50],1,{taper:1,amp:.05})}}})}
 else if(t==5){for(let y=0;y<4;y++)for(let x=0;x<4;x++)cblock(g,x*16+.3,y*16+.3,15.4,15.4,(x+y)&1?H(h+200,.16,.8):H(h+200,.12,.86),{s:.9,mn:3,lw:.35});drips(g,0,0,64,50,H(h+200,.12,.8),.15)}
 else if(t==6){hazStripes(g,4,60,[226,184,48],[40,36,48]);cblock(g,-1,0,66,4,[132,138,154],{s:.8,mn:2});cblock(g,-1,60,66,4,[132,138,154],{s:.8,mn:2})}
 else if(t==7){stones(g,0,0,64,64,{rows:4,cols:4,col:[214,196,160],joint:[110,90,70],stagger:0,chips:.1,cracks:.1});for(let y=0;y<4;y++)for(let x=0;x<4;x++){const X=x*16+8,Y=y*16+7,S=[242,232,206],D=[46,34,46];
  /* a niche with a skull in it */fillP(g,[[X-6,Y+7.5],[X-6,Y-2],[X-4,Y-5.5],[X+4,Y-5.5],[X+6,Y-2],[X+6,Y+7.5]],[70,54,58]);fillP(g,[[X+3.5,Y-5.5],[X+6,Y-2],[X+6,Y+7.5],[X+3,Y+7.5]],[46,34,46],.5);
  g.beginPath();g.ellipse(X,Y-.4,3.6,3.5,0,0,7);g.fillStyle=css(S);g.fill();fillP(g,[[X-2.4,Y+1.5],[X+2.4,Y+1.5],[X+2,Y+4.6],[X-2,Y+4.6]],S);
  clipP(g,[[X,Y-5],[X+5,Y-5],[X+5,Y+5],[X,Y+5]],()=>{g.beginPath();g.ellipse(X,Y-.4,3.6,3.5,0,0,7);g.fillStyle=css(dk(S,.3));g.fill();fillP(g,[[X,Y+1.5],[X+2.4,Y+1.5],[X+2,Y+4.6],[X,Y+4.6]],dk(S,.3))});
  g.beginPath();g.ellipse(X-1.5,Y,1.25,1.4,.2,0,7);g.ellipse(X+1.5,Y,1.25,1.4,-.2,0,7);g.fillStyle=css(D);g.fill();fillP(g,[[X,Y+1.4],[X+.7,Y+2.6],[X-.7,Y+2.6]],D);
  for(let k=-1;k<=1;k++)hl(g,[[X+k*.9,Y+3.2],[X+k*.9,Y+4.6]],D,.28,{amp:0});const sk=[];for(let k=0;k<=18;k++){const a=Math.PI*.85+k/18*Math.PI*1.3;sk.push([X+Math.cos(a)*3.6,Y-.4+Math.sin(a)*3.5])}hl(g,sk,INK,.38,{amp:.03});hl(g,[[X-2.4,Y+1.6],[X-2,Y+4.6],[X+2,Y+4.6],[X+2.4,Y+1.6]],INK,.35,{amp:.03})}}
 else if(t==8)planks(g,0,0,64,64,{n:4,col:[168,108,62]});
 else{for(let y=0;y<4;y++)for(let x=0;x<4;x++){cblock(g,x*16+.4,y*16+.4,15.2,15.2,H(h+190,.26,.56),{s:1.2,mn:3});glow(g,x*16+4.3,y*16+4.3,3.5,H(h+190,.9,.7),.6);cblock(g,x*16+2.3,y*16+2.3,4,4,H(h+190,.7,.76),{s:.6,m:0,lw:.32})}}})};
AA.floor=function(f,h){return paint(g=>{
 if(f==0){fillR(g,0,0,64,64,H(h+20,.14,.3));for(let y=0;y<2;y++)for(let x=0;x<2;x++)cblock(g,x*32+.5,y*32+.5,31,31,H(h+20,.14,((x+y)&1)?.48:.54),{s:1.8,mn:8,lw:.5});crack(g,10,8,12,H(h+20,.14,.5));crack(g,44,40,10,H(h+20,.14,.5))}
 else if(f==1)earth(g,H(h+30,.24,.44),{pebbles:10});
 else if(f==2){fillR(g,0,0,64,64,H(h+200,.1,.3));for(let y=0;y<8;y++)for(let x=0;x<8;x++)cblock(g,x*8+.3,y*8+.3,7.4,7.4,H(h+200,.1,((x+y)&1)?.6:.48),{s:.8,mn:1,lw:.3})}
 else if(f==3){const Rd=[168,46,56];fillR(g,0,0,64,64,Rd);for(let y=0;y<4;y++)for(let x=0;x<4;x++)if((x+y)&1)fillR(g,x*16,y*16,16,16,dk(Rd,.2));mottle(g,0,0,64,64,Rd,{wrap:1,a:.16,n:16});g.strokeStyle=css([224,178,80]);g.lineWidth=1.3;for(let k=0;k<=64;k+=16){g.beginPath();g.moveTo(k,0);g.lineTo(k,64);g.moveTo(0,k);g.lineTo(64,k);g.stroke()}
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){const X=x*16+8,Y=y*16+8,p=[[X,Y-3],[X+3,Y],[X,Y+3],[X-3,Y]];fillP(g,p,[240,200,110]);hl(g,p,[100,40,40],.3,{close:1,amp:.02})}}
 else planks(g,0,0,64,64,{n:8,vertical:false,col:[160,104,62]})})};
AA.bridge=()=>paint(g=>{planks(g,2,0,60,64,{n:4,vertical:false,col:[156,104,60],joints:false});for(let y=0;y<4;y++)for(const x of[10,54])bolt(g,x,y*16+8,[200,200,210]);cblock(g,-.5,0,2.9,64,[92,62,38],{s:.6,mn:2});cblock(g,61.6,0,2.9,64,[92,62,38],{s:.6,mn:2})});

/* ======================= DETAIL MAPS FOR 3D OBJECTS (props, furniture, chests) =======================
   Grey maps multiplied onto the flat colours of the 3D models (200 = leave the colour as it is). Painted the cel way: flat, with a few
   drawn grain lines, hard-edged shine bands on metal, chips and cracks on stone, leaf clumps on foliage. */
AA.mats=function(){const G=v=>[v,v,v],B=200,out=[];
 const grey=f=>{SD=7;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.scale(4,4);g.lineJoin='round';g.lineCap='round';fillR(g,0,0,64,64,G(B));f(g);g.filter='none';const d=g.getImageData(0,0,256,256).data,a=new Uint8Array(65536);for(let i=0;i<65536;i++)a[i]=d[i*4];return a};
 /* wood: long grain lines and a knot, a pale streak or two */
 out.push(grey(g=>{tile9(g,()=>{const R=rnd(31);for(let i=0;i<7;i++){const y=R()*64;fillR(g,0,y,64,1.2+R()*2.5,G(B+16),.6)}for(let i=0;i<9;i++){const y=R()*64;hl(g,[[0,y],[16,y+(R()-.5)*1.5],[32,y+(R()-.5)*1.5],[48,y+(R()-.5)*1.5],[64,y]],G(B-60),.28+R()*.25,{amp:.2,gap:.15})}
  for(let k=0;k<2;k++){const x=R()*64,y=R()*64;g.beginPath();g.ellipse(x,y,2.2,1,0,0,7);g.fillStyle=css(G(B-70));g.fill();hl(g,[[x-4.5,y-.2],[x-2,y-1.8],[x+2,y-1.8],[x+4.5,y-.2]],G(B-55),.3,{amp:.04});hl(g,[[x-4.5,y+.2],[x-2,y+1.8],[x+2,y+1.8],[x+4.5,y+.2]],G(B-55),.3,{amp:.04})}})}));
 /* metal: flat, with two hard diagonal shine bands and a few scratches */
 out.push(grey(g=>{tile9(g,()=>{for(const[x0,w,v]of[[6,9,B+52],[20,3,B+40],[40,5,B-24]])fillP(g,[[x0,64],[x0+w,64],[x0+w+64,0],[x0+64,0]],G(v));const R=rnd(33);for(let i=0;i<6;i++){const x=R()*64,y=R()*64;hl(g,[[x,y],[x+3+R()*4,y+(R()-.5)*1.5]],G(B-40),.22,{taper:1,amp:.03})}})}));
 /* stone: soft patches, cracks with a pale edge, a few chips */
 out.push(grey(g=>{mottle(g,0,0,64,64,G(B),{wrap:1,a:.35,n:18,blur:8});tile9(g,()=>{const R=rnd(35);for(let i=0;i<4;i++){const x=R()*64,y=R()*64,pts=[[x,y]];let a=R()*6.28,px=x,py=y;for(let k=0;k<4;k++){a+=(R()-.5);px+=Math.cos(a)*2.5;py+=Math.sin(a)*2.5;pts.push([px,py])}hl(g,pts.map(p=>[p[0]+.35,p[1]+.3]),G(B+30),.3,{taper:1});hl(g,pts,G(B-80),.36,{taper:1})}
  for(let i=0;i<5;i++){const x=R()*64,y=R()*64,r=.8+R()*1.4,pts=[];for(let k=0;k<6;k++){const a=k/6*6.28;pts.push([x+Math.cos(a)*r*(.6+R()*.5),y+Math.sin(a)*r*(.6+R()*.5)])}fillP(g,pts,G(B-40));hl(g,pts.slice(0,4),G(B+30),.25,{amp:.02})}})}));
 /* paint: nearly flat, a faint brush texture and the odd chip */
 out.push(grey(g=>{brush(g,0,0,64,64,G(B),{n:200,a:.12});tile9(g,()=>{const R=rnd(37);for(let i=0;i<3;i++){const x=R()*64,y=R()*64;fillP(g,[[x,y],[x+1.4,y+.3],[x+1,y+1.2],[x-.2,y+.9]],G(B-50))}})}));
 /* foliage: clumps of leaves, light on top, dark underneath */
 out.push(grey(g=>{fillR(g,0,0,64,64,G(B-30));tile9(g,()=>{const R=rnd(39);for(let i=0;i<34;i++){const x=R()*64,y=R()*64,r=2+R()*3;const pts=[];for(let k=0;k<7;k++){const a=k/7*6.28,q=r*(k%2?.7:1);pts.push([x+Math.cos(a)*q,y+Math.sin(a)*q*.8])}fillP(g,pts,G(B+10));clipP(g,pts,()=>fillR(g,x-r,y+r*.15,r*2,r,G(B-35)));fillP(g,[[x-r*.4,y-r*.4],[x+r*.1,y-r*.65],[x+r*.2,y-r*.3]],G(B+50));hl(g,pts,G(B-90),.3,{close:1,amp:.04,gap:.2})}})}));
 return out};

/* ======================= THE CASTLE (castle.js) ======================= */
AA.castle=function(){const O={};
 O.brick=paint(g=>{bricks(g,0,0,64,64,{rows:9,cols:4,col:[176,168,152],mortar:[96,90,82]});tile9(g,()=>{const R=rnd(91);for(let i=0;i<4;i++)moss(g,R()*64,R()*64,2+R()*2.5)})});
 O.brickDk=paint(g=>{bricks(g,0,0,64,64,{rows:8,cols:4,col:[126,122,124],mortar:[62,58,64]});tile9(g,()=>{const R=rnd(92);for(let i=0;i<3;i++)moss(g,R()*64,R()*64,2+R()*2)})});
 O.flag=paint(g=>{stones(g,0,0,64,64,{rows:4,cols:4,col:[196,188,170],joint:[92,86,78],stagger:0,chips:.35,cracks:.3,moss:93})});
 O.roof=paint(g=>roofTiles(g,[92,104,138],8));
 O.cobble=paint(g=>{const C=[156,150,142];fillR(g,0,0,64,64,[84,80,76]);tile9(g,()=>{const R=rnd(94);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const cx=x*8+4+(R()-.5)*2.4,cy=y*8+4+(R()-.5)*2.4,r=3+R()*.8,pts=[];for(let k=0;k<7;k++){const a=k/7*6.28+R()*.3,q=r*(.75+R()*.3);pts.push([cx+Math.cos(a)*q,cy+Math.sin(a)*q])}const cc=vary(C,(R()-.5)*.18);
  fillP(g,pts,cc);clipP(g,pts,()=>{fillP(g,[[cx-r*2,cy+r*.2],[cx+r*2,cy-r*.4],[cx+r*2,cy+r*2],[cx-r*2,cy+r*2]],dk(cc,.42));fillP(g,[[cx-r*.6,cy-r*.3],[cx,cy-r*.65],[cx+r*.2,cy-r*.4]],lt(cc,.45),.8)});hl(g,pts,ik(cc,.6),.38,{close:1,amp:.06,gap:.06})}})});
 O.grass=paint(g=>grass(g,[96,150,64],{n:30}));
 O.dirt=paint(g=>earth(g,[150,112,76],{pebbles:10,lines:1}));
 O.wood=paint(g=>planks(g,0,0,64,64,{n:6,col:[168,108,58],nails:1}));
 O.bark=paint(g=>{const C=[110,72,46];fillR(g,0,0,64,64,C);tile9(g,()=>{const R=rnd(95);for(let i=0;i<14;i++){const x=R()*64,y=R()*64,L=8+R()*14;const pts=[[x,y],[x+(R()-.5)*1.4,y+L*.33],[x+(R()-.5)*1.4,y+L*.66],[x,y+L]];hl(g,pts,dk(C,.55),.9+R()*.8,{amp:.2,taper:1});hl(g,pts.map(p=>[p[0]+.9,p[1]]),lt(C,.3),.35,{amp:.2,taper:1})}
  for(let i=0;i<3;i++){const x=R()*64,y=R()*64;g.beginPath();g.ellipse(x,y,1.3,2.2,0,0,7);g.fillStyle=css(dk(C,.6));g.fill();hl(g,[[x-1.6,y-2.4],[x+1.6,y-2.4]],lt(C,.35),.3)}});mottle(g,0,0,64,64,C,{wrap:1,a:.2,n:14,rot:Math.PI/2})});
 O.leaves=paint(g=>{const C=[62,128,58];fillR(g,0,0,64,64,dk(C,.5));tile9(g,()=>{const R=rnd(96);for(let i=0;i<38;i++){const x=R()*64,y=R()*64,r=3+R()*3.5,pts=[];for(let k=0;k<9;k++){const a=k/9*6.28,q=r*(k%2?.72:1);pts.push([x+Math.cos(a)*q,y+Math.sin(a)*q*.8])}const cc=vary(C,(R()-.5)*.2);
  fillP(g,pts,cc);clipP(g,pts,()=>{fillR(g,x-r,y+r*.1,r*2,r,dk(cc,.4));fillP(g,[[x-r*.6,y-r*.3],[x-r*.1,y-r*.7],[x+r*.3,y-r*.5],[x-r*.1,y-r*.2]],lt(cc,.4),.85)});hl(g,pts,ik(cc,.55),.32,{close:1,amp:.05,gap:.15})}})});
 O.rock=paint(g=>rockFace(g,[136,128,118]));
 O.iron=(()=>{const a=paint(g=>{const M=[92,96,112];for(let x=4;x<64;x+=12){fillR(g,x,0,4,64,M);fillR(g,x+.6,0,.9,64,lt(M,.45));fillR(g,x+2.6,0,1.4,64,dk(M,.45));hl(g,[[x,0],[x,64]],INK,.35,{amp:.04});hl(g,[[x+4,0],[x+4,64]],INK,.35,{amp:.04})}
  for(const y of[12,44]){fillR(g,0,y,64,3.4,M);fillR(g,0,y+.4,64,.8,lt(M,.45));fillR(g,0,y+2.2,64,1.2,dk(M,.45));hrect(g,0,y,64,3.4,INK,.32,{amp:.03});for(let x=6;x<64;x+=12)bolt(g,x,y+1.7,lt(M,.3))}});return a})();
 O.banner=paint(g=>{const Rd=[176,40,52],Gd=[226,180,70];wash(g,0,0,64,64,Rd,{streak:1,top:.2,bot:.4});for(let x=4;x<64;x+=10)fillR(g,x,0,3,64,dk(Rd,.25),.5);fillR(g,0,0,64,6,Gd);fillR(g,0,58,64,6,Gd);fillR(g,0,4.6,64,1.4,dk(Gd,.35));fillR(g,0,58,64,1.4,dk(Gd,.35));hl(g,[[0,6],[64,6]],ik(Gd),.4);hl(g,[[0,58],[64,58]],ik(Gd),.4);
  const tw=[[22,38],[22,24],[24,24],[24,20],[27,20],[27,24],[30.5,24],[30.5,20],[33.5,20],[33.5,24],[37,24],[37,20],[40,20],[40,24],[42,24],[42,38]];fillP(g,tw,Gd);clipP(g,tw,()=>fillR(g,34,18,10,22,dk(Gd,.3)));hl(g,tw,ik(Gd),.5,{close:1,amp:.05});g.beginPath();g.moveTo(29,38);g.lineTo(29,33);g.arc(32,33,3,Math.PI,0);g.lineTo(35,38);g.closePath();g.fillStyle=css([96,20,30]);g.fill()});
 O.fire=paint(g=>{vgr(g,0,0,64,64,[[0,[255,236,140]],[.45,[255,160,50]],[1,[210,50,30]]]);const R=rnd(97);for(let i=0;i<9;i++){const x=R()*64,h=18+R()*30,w=5+R()*6,pts=[[x-w,64],[x-w*.4,64-h*.5],[x+(R()-.5)*3,64-h],[x+w*.4,64-h*.45],[x+w,64]];fillP(g,pts,R()<.5?[255,120,40]:[255,200,80],.8);fillP(g,pts.map(p=>[x+(p[0]-x)*.45,64-(64-p[1])*.7]),[255,246,190],.8)}});
 O.labPanel=paint(g=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){cblock(g,x*16+.3,y*16+.3,15.4,15.4,[214,222,232],{s:1,mn:3,lw:.35});if((x*3+y*5)%4==1)for(let k=0;k<5;k++)hl(g,[[x*16+4,y*16+4+k*1.6],[x*16+12,y*16+4+k*1.6]],[70,78,96],.45,{amp:.02})}glow(g,40,40,4,[90,240,255],.7);cblock(g,37,38.6,6,2.8,[110,236,250],{s:.5,m:0,lw:.3})});
 O.labGlow=paint(g=>{vgr(g,0,0,64,64,[[0,[14,40,52]],[1,[10,30,40]]]);const q=g.createLinearGradient(0,0,64,0);q.addColorStop(0,'rgba(60,220,240,0)');q.addColorStop(.5,'rgba(120,250,255,.95)');q.addColorStop(1,'rgba(60,220,240,0)');g.fillStyle=q;g.fillRect(14,0,36,64);fillR(g,28,0,8,64,[230,255,255],.8);for(let y=0;y<64;y+=4)fillR(g,14,y,36,.5,[20,60,70],.35);hl(g,[[14,0],[14,64]],[20,80,96],.5);hl(g,[[50,0],[50,64]],[20,80,96],.5)});
 O.labMetal=paint(g=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++)concrete(g,x*32,y*32,32,32,[66,74,92],{});cblock(g,14,44,10,2.4,[110,236,250],{s:.5,m:0,lw:.3});glow(g,19,45,6,[90,240,255],.4)});
 O.labGlass=paint(g=>{cblock(g,0,0,64,64,[44,50,66],{s:1.4,mn:3});glassDark(g,3,3,58,58,{});vgr(g,3,3,58,58,[[0,[60,200,230]],[1,[30,120,180]]],.35);for(let k=1;k<6;k++){hl(g,[[3+k*9.7,3],[3+k*9.7,61]],[150,220,245],.3,{amp:.02});hl(g,[[3,3+k*9.7],[61,3+k*9.7]],[150,220,245],.3,{amp:.02})}hrect(g,3,3,58,58,INK,.5)});
 O.labFloor=paint(g=>{fillR(g,0,0,64,64,[26,36,52]);for(let y=0;y<8;y++)for(let x=0;x<8;x++)cblock(g,x*8+.3,y*8+.3,7.4,7.4,[34,46,66],{s:.6,mn:1,lw:.3});g.save();g.filter='blur(2px)';g.strokeStyle=css([80,240,255],.7);g.lineWidth=1.4;for(const k of[0,16,32,48]){g.beginPath();g.moveTo(k+.5,0);g.lineTo(k+.5,64);g.moveTo(0,k+.5);g.lineTo(64,k+.5);g.stroke()}g.restore();g.strokeStyle=css([200,255,255]);g.lineWidth=.45;for(const k of[0,16,32,48]){g.beginPath();g.moveTo(k+.5,0);g.lineTo(k+.5,64);g.moveTo(0,k+.5);g.lineTo(64,k+.5);g.stroke()}});
 return O};

/* ======================= RE-INKING OTHER DRAWING CODE =======================
   For the many smaller texture sets that are drawn by their own canvas code (the space station, the orbital anchor, gates, alien levels...),
   the drawing commands themselves are carried out in the background-painting style instead of as plain vector shapes: every solid shape is
   laid in as paint (mottled, with a hard cel shadow along its lower right edge) and gets a hand-drawn ink outline in a dark shade of its own
   colour, every stroke is drawn as a slightly wobbly hand-inked line, and a full-tile base coat gets the gouache texture. The layout, the
   colours and the text stay exactly as that code draws them. */
const solidCol=s=>typeof s=='string'&&(s[0]=='#'||/^rgba?\([^)]*\)$/.test(s)&&!/,\s*0?\.\d+\)$|,\s*0\)$/.test(s))?hx(s):null;
function wrap(g){const subs=[];let cur=null;const M={};
 const pt=(x,y)=>{if(!cur){cur=[];subs.push(cur)}cur.push([x,y])};
 const arcPts=(cx,cy,rx,ry,rot,a0,a1,ccw)=>{let d=a1-a0;if(!ccw&&d<0)d+=Math.PI*2*Math.ceil(-d/(Math.PI*2));if(ccw&&d>0)d-=Math.PI*2*Math.ceil(d/(Math.PI*2));if(Math.abs(d)>Math.PI*2)d=Math.sign(d)*Math.PI*2;const n=Math.max(6,Math.ceil(Math.abs(d)*Math.max(rx,ry)/1.2)),cr=Math.cos(rot),sr=Math.sin(rot);for(let i=0;i<=n;i++){const a=a0+d*i/n,x=Math.cos(a)*rx,y=Math.sin(a)*ry;pt(cx+x*cr-y*sr,cy+x*sr+y*cr)}};
 M.beginPath=()=>{subs.length=0;cur=null;g.beginPath()};
 M.moveTo=(x,y)=>{cur=[[x,y]];subs.push(cur);g.moveTo(x,y)};
 M.lineTo=(x,y)=>{pt(x,y);g.lineTo(x,y)};
 M.closePath=()=>{if(cur&&cur.length){cur.closed=1;cur.push(cur[0].slice());cur=[cur[0].slice()];subs.push(cur)}g.closePath()};
 M.rect=(x,y,w,h)=>{const r=[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];r.closed=1;subs.push(r);cur=null;g.rect(x,y,w,h)};
 M.arc=(cx,cy,r,a0,a1,ccw)=>{arcPts(cx,cy,r,r,0,a0,a1,ccw);g.arc(cx,cy,r,a0,a1,ccw)};
 M.ellipse=(cx,cy,rx,ry,rot,a0,a1,ccw)=>{arcPts(cx,cy,rx,ry,rot,a0,a1,ccw);g.ellipse(cx,cy,rx,ry,rot,a0,a1,ccw)};
 M.quadraticCurveTo=(qx,qy,x,y)=>{const p0=cur&&cur.length?cur[cur.length-1]:[qx,qy];for(let i=1;i<=6;i++){const t=i/6,u=1-t;pt(u*u*p0[0]+2*u*t*qx+t*t*x,u*u*p0[1]+2*u*t*qy+t*t*y)}g.quadraticCurveTo(qx,qy,x,y)};
 M.bezierCurveTo=(ax,ay,bx,by,x,y)=>{const p0=cur&&cur.length?cur[cur.length-1]:[ax,ay];for(let i=1;i<=8;i++){const t=i/8,u=1-t;pt(u*u*u*p0[0]+3*u*u*t*ax+3*u*t*t*bx+t*t*t*x,u*u*u*p0[1]+3*u*u*t*ay+3*u*t*t*by+t*t*t*y)}g.bezierCurveTo(ax,ay,bx,by,x,y)};
 M.arcTo=(x1,y1,x2,y2,r)=>{pt(x1,y1);g.arcTo(x1,y1,x2,y2,r)};
 const bbox=()=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const sp of subs)for(const q of sp){if(q[0]<a)a=q[0];if(q[1]<b)b=q[1];if(q[0]>c)c=q[0];if(q[1]>d)d=q[1]}return[a,b,c-a,d-b]};
 /* paint the current path's interior: mottle and the hard shadow rim, then ink the outline */
 const paintPath=(col,bb,full)=>{const[x,y,w,h]=bb;if(w<1.2||h<1.2)return;const m=Math.min(w,h);g.save();g.clip();
  if(full){mottle(g,x,y,w,h,col,{wrap:1,a:.18,n:20,blur:8});brush(g,x,y,w,h,col,{n:160,a:.06})}
  else{if(w*h>12)mottle(g,x,y,w,h,col,{a:.16,n:Math.max(3,Math.min(14,w*h/40|0)),blur:4});const s2=Math.min(1.3,m*.16);
   soft(g,0,q=>{q.fillStyle=css(dk(col,.42));q.fillRect(x-1,y-1,w+2,h+2);q.globalCompositeOperation='destination-out';q.translate(-s2,-s2);q.beginPath();for(const sp of subs){sp.forEach((p,i)=>i?q.lineTo(p[0],p[1]):q.moveTo(p[0],p[1]));q.closePath()}q.fill();q.globalCompositeOperation='source-over'});
   soft(g,0,q=>{q.strokeStyle=css(lt(col,.5),.8);q.lineWidth=.35;q.translate(s2*.35,s2*.35);q.beginPath();for(const sp of subs){sp.forEach((p,i)=>i?q.lineTo(p[0],p[1]):q.moveTo(p[0],p[1]))}q.stroke()})}
  g.restore();
  if(!full){const ic=ik(col,.68),lw=Math.min(.5,.18+m*.03);for(const sp of subs)if(sp.length>1)hl(g,sp,ic,lw,{amp:.08,gap:.03})}};
 M.fill=function(){const fs=g.fillStyle,col=solidCol(fs);g.fill.apply(g,arguments);if(!col||!subs.length||g.globalAlpha<.9||g.globalCompositeOperation!='source-over')return;const bb=bbox();paintPath(col,bb,bb[2]>=63&&bb[3]>=63)};
 M.stroke=function(){const col=solidCol(g.strokeStyle);if(!col||!subs.length||g.globalAlpha<.9){g.stroke();return}const lw=g.lineWidth;for(const sp of subs)if(sp.length>1)hl(g,sp,col,lw,{amp:Math.min(.18,.06+lw*.06)});};
 M.fillRect=(x,y,w,h)=>{const col=solidCol(g.fillStyle);if(!col||g.globalAlpha<.9||g.globalCompositeOperation!='source-over'){g.fillRect(x,y,w,h);return}
  if(w<1.6||h<1.6){if(Math.max(w,h)<3){g.fillRect(x,y,w,h);return}const v=w<h,lw=Math.min(w,h);hl(g,v?[[x+w/2,y],[x+w/2,y+h]]:[[x,y+h/2],[x+w,y+h/2]],col,lw*1.15,{amp:.06});return}
  g.fillRect(x,y,w,h);const sv=subs.slice();subs.length=0;subs.push([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]);g.save();g.beginPath();g.rect(x,y,w,h);paintPath(col,[x,y,w,h],w>=63&&h>=63);g.restore();subs.length=0;subs.push(...sv)};
 M.strokeRect=(x,y,w,h)=>{const col=solidCol(g.strokeStyle);if(!col||g.globalAlpha<.9){g.strokeRect(x,y,w,h);return}hrect(g,x,y,w,h,col,g.lineWidth,{amp:.08})};
 return new Proxy(g,{get(t,k){if(k in M)return M[k];const v=t[k];return typeof v=='function'?v.bind(t):v},set(t,k,v){t[k]=v;return true}})}
AA.wrap=wrap;
AA.paintW=f=>paint(g=>f(wrap(g)));
for(const k of['road','sidewalk','plaza','cityRoof','coliFloor','hazFloor','bridge']){const f=AA[k];AA[k]=()=>cached(k,f)}
for(const k of['roadLine','haz','ctfWall']){const f=AA[k];AA[k]=a=>cached(k+a,()=>f(a))}
{const f=AA.ctfFloor;AA.ctfFloor=(h,p)=>cached('cf'+h+'|'+p,()=>f(h,p))}{const f=AA.wall;AA.wall=(t,h)=>cached('w'+t+'|'+h,()=>f(t,h))}{const f=AA.floor;AA.floor=(t,h)=>cached('fl'+t+'|'+h,()=>f(t,h))}{const f=AA.roof;AA.roof=(n,h,v)=>cached('r'+n+'|'+h+'|'+v,()=>f(n,h,v))}{const f=AA.shopCeil;AA.shopCeil=v=>cached('sc'+v,()=>f(v))}

/* ======================= THE SUPPLIED CITY TEXTURE SHEET (anime_city.js) =======================
   The city uses the hand-made texture sheet as it is. Only two things are added on top, both because the game needs them: the OPEN /
   CLOSED sign on the doors of the shops you can walk into (drawn like the OPEN sign on the restaurant), and which upper-floor windows are
   lit (that comes from the game's random numbers, so lit and dark windows from the sheet are swapped in per building). */
const UC={img:{},mask:{},mk:{}};
(function(){const S=window.ANIMECITY_SRC,M=window.ANIMECITY_MASK||{};if(!S)return;for(const k in S){const im=new Image();im.src=S[k];UC.img[k]=im}for(const k in M){const im=new Image();im.src=M[k];UC.mask[k]=im}})();
const ucReady=()=>{const v=Object.values(UC.img).concat(Object.values(UC.mask));return v.length>0&&v.every(i=>i.complete&&i.naturalWidth>0)};
/* the wall mask of a texture as 256x256 weights (0..1) */
function ucMask(k){if(UC.mk[k])return UC.mk[k];const im=UC.mask[k];if(!im)return null;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.drawImage(im,0,0,256,256);const d=g.getImageData(0,0,256,256).data,m=new Float32Array(65536);for(let i=0;i<65536;i++)m[i]=d[i*4]/255;return UC.mk[k]=m}
/* give the building's walls its own colour: each wall pixel keeps its shading and is tinted from the sheet's cream to the chosen colour */
function ucWall(g,key,hue){const M=window.ANIMECITY_META,m=ucMask(key),ref=M.ref&&M.ref[key];if(!m||!ref)return;const W=M.walls[(((hue|0)%360+360)%360/36|0)%M.walls.length],k=[W[0]/ref[0],W[1]/ref[1],W[2]/ref[2]];if(Math.abs(k[0]-1)+Math.abs(k[1]-1)+Math.abs(k[2]-1)<.02)return;
 const id=g.getImageData(0,0,256,256),d=id.data;for(let i=0;i<65536;i++){const w=m[i];if(w<=0)continue;const j=i*4;for(let c=0;c<3;c++){const v=d[j+c];d[j+c]=Math.min(255,v*(1-w)+v*k[c]*w)}}g.putImageData(id,0,0)}
AA.cityReady=ucReady;
/* the city is at dusk: everything is toned down a little and cooled toward blue, except the warm lit windows, which keep glowing */
const DUSK=[.66,.65,.77];
function ucPaint(f){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.imageSmoothingQuality='high';f(g);const id=g.getImageData(0,0,256,256),d=id.data;
 for(let j=0;j<d.length;j+=4){const r=d[j],gg=d[j+1],b=d[j+2];if(r>200&&gg>110&&b<120&&r-b>110)continue;d[j]=r*DUSK[0];d[j+1]=gg*DUSK[1];d[j+2]=b*DUSK[2]}
 const a=new Uint32Array(d.buffer);a.__ap=1;return a}
function hangSign(g,cx,cy,txt){const w=txt.length>4?50:42,h=19,x=cx-w/2,y=cy-h/2;g.save();g.lineCap='round';g.strokeStyle='#3a3a48';g.lineWidth=1.6;g.beginPath();g.moveTo(x+7,y+1);g.lineTo(cx,y-12);g.lineTo(x+w-7,y+1);g.stroke();
 g.fillStyle='#c9a040';g.beginPath();g.arc(cx,y-12,2.2,0,7);g.fill();g.fillStyle='rgba(30,30,50,.25)';g.fillRect(x+2,y+2,w,h);
 g.fillStyle='#f7f5ec';g.strokeStyle='#262a40';g.lineWidth=2;g.beginPath();g.rect(x,y,w,h);g.fill();g.stroke();
 g.fillStyle='#22263a';g.textAlign='center';g.textBaseline='middle';let fs=13;g.font=`bold ${fs}px "DejaVu Sans",Verdana,Arial,sans-serif`;while(g.measureText(txt).width>w-7&&fs>6){fs-=.5;g.font=`bold ${fs}px "DejaVu Sans",Verdana,Arial,sans-serif`}g.fillText(txt,cx,cy+.5);g.restore()}
function ucFacade(name,showOpen,hue){const M=window.ANIMECITY_META,shop=name=='SHOP'||name=='SHOP+',key=shop?(name=='SHOP+'?'SHOPP':'SHOP'):name=='~'?'PLAIN':name=='~2'?'PLAIN2':name&&UC.img[name]?name:'NONE';
 return ucPaint(g=>{g.drawImage(UC.img[key],0,0,256,256);ucWall(g,key,hue);const sp=M.sign[key];if(shop&&sp)hangSign(g,sp[0],sp[1],name=='SHOP+'?'OPEN':'CLOSED');else if(showOpen&&sp)hangSign(g,sp[0],sp[1],'OPEN')})}
function ucUpper(base,L,hue){const M=window.ANIMECITY_META;return ucPaint(g=>{g.drawImage(UC.img[base],0,0,256,256);ucWall(g,base,hue);
 for(let i=0;i<6;i++){if(!!M.lit[base][i]===!!L[i])continue;let src=null;for(const t of[base,base=='UP1'?'UP2':'UP1']){const j=M.lit[t].findIndex((v,k)=>!!v===!!L[i]&&(k%3)==(i%3));const j2=j>=0?j:M.lit[t].findIndex(v=>!!v===!!L[i]);if(j2>=0){src=[t,j2];break}}
  if(!src)continue;const s=M.glass[src[0]][src[1]],d=M.glass[base][i],im=UC.img[src[0]],k=im.naturalWidth/256;g.drawImage(im,s[0]*k,s[1]*k,(s[2]-s[0])*k,(s[3]-s[1])*k,d[0],d[1],d[2]-d[0],d[3]-d[1])}})}
{const f0=AA.facade;AA.facade=(n,h,o)=>ucReady()?cached('uf'+n+'|'+o+'|'+((((h|0)%360+360)%360/36)|0),()=>ucFacade(n,o,h)):f0(n,h,o)}
{const u0=AA.upper;AA.upper=(hue,Rf)=>{if(!ucReady())return u0(hue,Rf);const L=[];for(let i=0;i<6;i++)L.push(Rf()<.35);const base=(Math.abs(hue|0)/37|0)%2?'UP2':'UP1';return cached('uu'+base+L.join('')+'|'+((((hue|0)%360+360)%360/36)|0),()=>ucUpper(base,L,hue))}}
for(const[k,t]of[['road','ROAD'],['sidewalk','SIDE'],['plaza','PLAZA'],['cityRoof','ROOF']]){const f0=AA[k];AA[k]=()=>ucReady()?cached('u'+t,()=>ucPaint(g=>g.drawImage(UC.img[t],0,0,256,256))):f0()}
{const f0=AA.roadLine;AA.roadLine=v=>ucReady()?cached('uLINE'+(v?1:0),()=>ucPaint(g=>g.drawImage(UC.img[v?'LINE1':'LINE0'],0,0,256,256))):f0(v)}
return AA})();

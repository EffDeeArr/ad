/* ===== cel_chars.js - the enemies, drawn and animated like the monsters of a 90s OVA (0.9.246) =====
   None of these is a person-shaped thing with a head on a neck, and none follows the game's old monster pictures.
   HOW THEY ARE DRAWN (no ovals, no even crescents):
   - every form is an irregular, faceted shape: even a "round" mass is a hand-cut polygon whose corners wander;
   - the shadow on a form is its own jagged shape: the lit area is cut back unevenly on the side away from the light (upper left),
     with black wedges biting into it, the way an inker spots blacks; under that a band of shadow colour, then solid black;
   - the outline is thin on the lit side and heavy on the dark side;
   - a few scratchy strokes on each form; dusty, muted colour; glowing eyes with no pupils.
   EACH ENEMY IS ANIMATED: six drawings - three for its movement cycle (played 0-1-2-1), a wind-up and a strike for its attack, and a
   recoil when hit. The game shows them at 8 and 5 drawings a second (cel timing, "on threes"), never tweened. Drawings are made when
   first needed, at 192x192 (the 64-unit sprite space x3), and handed over as finished art (__as).
   sp (the game's body-type roll) picks the enemy; the other rolls pick colour and details. Nothing here rolls the game's dice. */
window.CELCH=(function(){
const C={},SZ=192,SC=3;
const hsl=(h,s,l,a)=>`hsla(${((h%360)+360)%360},${Math.max(0,Math.min(100,s))}%,${Math.max(0,Math.min(100,l))}%,${a===undefined?1:a})`;
const BLK='#140c18',GLOW='#ffd83c',GLOWR='#ff4a3a';
function rnd(sd){let t=sd|0;return()=>{t=t+0x6D2B79F5|0;let r=Math.imul(t^t>>>15,1|t);r=r+Math.imul(r^r>>>7,61|r)^r;return((r^r>>>14)>>>0)/4294967296}}
/* dusty, muted paint: greens and yellows (which glare at full strength) are held back more than reds and violets */
function opal(hue,sat){const h=((hue%360)+360)%360,gy=h>45&&h<170?.72:1,s=Math.min(40,sat*.28+19)*gy;return{base:hsl(hue,s,54),shade:hsl(hue-10,s+6,34),deep:hsl(hue-18,s+8,21),light:hsl(hue+4,s+2,67),ink:BLK,mark:hsl(hue+150,s-4,58)}}
const STEEL={base:'#9aa0b6',shade:'#5c6080',deep:'#34364e',light:'#d6dae8'},DBONE={base:'#e2d8c4',shade:'#a0919c',deep:'#6a5c74',light:'#f6f0e2'},GORE={base:'#8a2c44',shade:'#5c1830',deep:'#340c1c',light:'#b84a5c'},LEAF={base:hsl(104,24,44),shade:hsl(128,28,28),deep:hsl(150,30,17),light:hsl(92,28,58)};
function canvas(){const c=document.createElement('canvas');c.width=c.height=SZ;const g=c.getContext('2d');g.scale(SC,SC);g.lineJoin='miter';g.miterLimit=3;g.lineCap='round';return[c,g]}
function done(c){const a=new Uint32Array(c.getContext('2d').getImageData(0,0,SZ,SZ).data.buffer);a.__as=1;return a}
function poly(q,pts){q.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)q.lineTo(pts[i][0],pts[i][1]);q.closePath()}
/* ---- the inking ---- */
const LX=-.49,LY=-.87;/* the light comes from the upper left */
/* the lit area of a form: its outline pulled toward the light, and on the dark side cut back unevenly, with notches (the wedges of black an inker leaves) */
function cut(pts,R,a0,a1,notch,k){let cx=0,cy=0;for(const p of pts){cx+=p[0];cy+=p[1]}cx/=pts.length;cy/=pts.length;let sz=0;for(const p of pts)sz+=Math.hypot(p[0]-cx,p[1]-cy);sz=sz/pts.length||1;
 const out=[],n=pts.length,mv=p=>{const dx=p[0]-cx,dy=p[1]-cy,l=Math.hypot(dx,dy)||1,s=Math.max(0,-(dx*LX+dy*LY)/sz),pull=Math.min(l*.8,(a0*.35+R()*a1*Math.min(1.2,s))*k);return[p[0]+LX*a0*k-dx/l*pull,p[1]+LY*a0*k-dy/l*pull,s]};
 for(let i=0;i<n;i++){const q=mv(pts[i]);out.push(q);const b=pts[(i+1)%n],m=[(pts[i][0]+b[0])/2,(pts[i][1]+b[1])/2],dx=m[0]-cx,dy=m[1]-cy,s=-(dx*LX+dy*LY)/sz;
  if(notch&&s>.25&&R()<notch){const d=.3+R()*.34;out.push([m[0]-dx*d+LX*a0*k,m[1]-dy*d+LY*a0*k])}}
 return out}
/* a list of forms is drawn in two passes: first every form in black, a little heavier toward the dark side (so the line is thick-and-thin
   and black pools between forms); then each form: black, the shadow colour, the lit colour (both cut as above), a light facet, detail */
function masses(g,M){for(const m of M){g.save();g.translate(.28,.5);g.beginPath();poly(g,m.pts);g.fillStyle=BLK;g.fill();g.strokeStyle=BLK;g.lineWidth=(m.u===undefined?1.9:m.u)*.66;g.stroke();g.restore()}
 for(let i=0;i<M.length;i++){const m=M[i],P=m.P,k=m.k||1,R=rnd(i*7919+m.pts.length*131+17);g.save();g.beginPath();poly(g,m.pts);g.fillStyle=BLK;g.fill();g.clip();
  const c1=m.dark?P.deep:P.shade,c2=m.dark?P.shade:P.base;
  g.beginPath();poly(g,cut(m.pts,R,.5,1.5,.2,k));g.fillStyle=c1;g.fill();
  g.beginPath();poly(g,cut(m.pts,R,1.5,3.6,.5,k));g.fillStyle=c2;g.fill();
  if(m.hl&&!m.dark){/* a facet of lighter colour on the lit shoulder of the form */const q=cut(m.pts,R,4.6,7,0,k),n=q.length;let b=0,bs=-1e9;for(let j=0;j<n;j++){const s=q[j][0]*LX+q[j][1]*LY;if(s>bs){bs=s;b=j}}
   let cx=0,cy=0;for(const p of q){cx+=p[0];cy+=p[1]}cx/=n;cy/=n;const A=q[(b+n-1)%n],B=q[b],D=q[(b+1)%n];g.beginPath();poly(g,[A,B,D,[(D[0]+cx)/2,(D[1]+cy)/2],[(B[0]+cx*1.4)/2.4,(B[1]+cy*1.4)/2.4],[(A[0]+cx)/2,(A[1]+cy)/2]]);g.fillStyle=P.light;g.fill()}
  if(m.in)m.in(g);g.restore();
  g.beginPath();poly(g,m.pts);g.strokeStyle=BLK;g.lineWidth=.42;g.stroke()}}
/* a "round" form: a hand-cut polygon, corners wandering. n = how many corners (fewer = more angular) */
const EL=(M,P,x,y,rx,ry,rot,o)=>{const R=rnd(M.length*977+5),n=(o&&o.n)||9,pts=[],ca=Math.cos(rot||0),sa=Math.sin(rot||0),t0=R()*6.2832;rx=Math.max(.2,rx);ry=Math.max(.2,ry);
 for(let i=0;i<n;i++){const th=t0+(i+(R()-.5)*.5)/n*6.2832,rr=1+(R()-.5)*.26,px=Math.cos(th)*rx*rr,py=Math.sin(th)*ry*rr;pts.push([x+px*ca-py*sa,y+px*sa+py*ca])}M.push(Object.assign({P,pts},o||{}))};
const PG=(M,P,pts,o)=>M.push(Object.assign({P,pts},o||{}));
/* a tapering limb along a line of points: tentacles, stalks, vines, legs */
function tube(M,P,pts,w0,w1,o){const L=[],Rr=[],n=pts.length;for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,w=(w0+(w1-w0)*i/(n-1))*(i%2?1.12:.92);L.push([pts[i][0]+nx*w,pts[i][1]+ny*w]);Rr.push([pts[i][0]-nx*w,pts[i][1]-ny*w])}PG(M,P,L.concat(Rr.reverse()),o)}
const curve=(fn,n)=>Array.from({length:n},(_,i)=>fn(i/(n-1)));
/* scratch strokes: short thin lines that follow a form */
function scr(q,L){q.strokeStyle=BLK;q.lineWidth=.34;q.beginPath();for(const[a,b,c,d]of L){q.moveTo(a,b);q.lineTo(c,d)}q.stroke()}
/* a glowing eye: a black socket with a slanted sliver of light in it. s = which way it slants */
function geye(q,x,y,l,hh,s,glow){q.fillStyle=BLK;q.beginPath();poly(q,[[x-s*l*1.3,y-hh*1.7],[x+s*l*1.3,y-hh*.2],[x+s*l*1.1,y+hh*1.5],[x-s*l*1.2,y+hh*.9]]);q.fill();q.fillStyle=glow;q.beginPath();poly(q,[[x-s*l,y-hh],[x+s*l,y+hh*.2],[x+s*l*.8,y+hh],[x-s*l*.9,y+hh*.3]]);q.fill()}
function teeth(q,x0,x1,y,h,n,up){q.fillStyle='#efe6d2';q.beginPath();for(let i=0;i<n;i++){const a=x0+(x1-x0)*i/n,b=x0+(x1-x0)*(i+1)/n,hh=h*(i%2?.74:1.1);q.moveTo(a,y);q.lineTo(b,y);q.lineTo((a+b)/2+(i%2?.3:-.3),y+(up?-hh:hh))}q.fill();q.strokeStyle=BLK;q.lineWidth=.3;q.stroke()}

/* ---- the eight enemies. ps is the pose: w = where it is in its movement cycle (-1, 0, 1), a = attack (-1 wind-up, 1 strike), h = hit. Each returns its weak spot. ---- */

/* EYE FIEND: one great eye in a knot of flesh, on ragged wings, trailing tentacles */
function eyefiend(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],cy=26+w*1.3+(a>0?3:a<0?-2.4:0)+h*2.4,R=13.4+(a>0?1.8:0),W={base:P.shade,shade:P.deep,deep:BLK,light:P.base};
 const fl=a<0?-1.2:a>0?1:w;/* wings: up on -1, down on 1 */
 for(const s of[-1,1]){const tx=32+s*(29.6-Math.abs(fl)*1.6),ty=cy-10+fl*9.4;
  PG(M,W,[[32+s*10,cy-5],[32+s*19,cy-13+fl*3],[tx,ty],[32+s*(27-fl*.6),ty+7.6],[32+s*24.6,ty+4.4],[32+s*23,cy-3+fl*4.4],[32+s*20.6,cy+3.6+fl*3.4],[32+s*18.6,cy-.4+fl*2.4],[32+s*16.6,cy-1+fl*2],[32+s*13.6,cy+5]],{dark:1,u:1.6,in:q=>{q.strokeStyle=P.base;q.lineWidth=.45;q.beginPath();for(const[x,y]of[[27-fl*.6,ty+7.6],[20.6,cy+3.6+fl*3.4]]){q.moveTo(32+s*11,cy-4);q.lineTo(32+s*x,y)}q.stroke()}});
  PG(M,P,[[32+s*10,cy-4],[32+s*19,cy-13.6+fl*3],[tx,ty-.6],[32+s*(29.6-Math.abs(fl)*1.6-1.6),ty+1.4],[32+s*19.4,cy-11+fl*3],[32+s*11.6,cy-2]],{u:1.2,k:.5})}
 for(let i=0;i<5;i++){const bx=32+(i-2)*5,ex=a>0?32+(i-2)*12.6:bx+(i-2)*2.4,ey=a>0?60-Math.abs(i-2)*3:a<0?cy+R+9:58+((i*7)%3)*1.4,sw=a?0:1;
  tube(M,P,curve(t=>[bx+(ex-bx)*t+Math.sin(t*3.4+i*1.3+w*1.7)*2.8*t*sw+(h?Math.sin(t*9+i)*1.6:0),cy+R*.7+(ey-cy-R*.7)*t],9),2.3,.35,{u:1.3,k:.5})}
 if(o.hn)for(const k of[-1,0,1])PG(M,DBONE,[[32+k*6-1.8,cy-R*.86+Math.abs(k)*1.6],[32+k*6+1.8,cy-R*.86+Math.abs(k)*1.6],[32+k*8,cy-R-7+Math.abs(k)*2]],{u:1.1,k:.4});
 const op=h?.13:a>0?.72:a<0?.36:.56+w*.03;
 /* the body: a rough knot of flesh, with heavy folded lids */
 PG(M,P,[[32-R*.5,cy-R*1.02],[32+R*.36,cy-R*1.08],[32+R*.96,cy-R*.6],[32+R*1.16,cy+R*.06],[32+R*.94,cy+R*.66],[32+R*.4,cy+R*1.04],[32-R*.3,cy+R*1.1],[32-R*.9,cy+R*.74],[32-R*1.14,cy+R*.1],[32-R*1.0,cy-R*.56]],{hl:1,u:1.8,in:q=>{scr(q,[[20.6,cy+5,23,cy+8.6],[43.4,cy+5,41,cy+8.6],[24,cy-9,26.4,cy-6.6],[40,cy-9,37.6,cy-6.6],[22,cy-2,20,cy+2],[42,cy-2,44,cy+2]]);
  /* the eye: an angular socket, the ball, a ring of colour, the light in the middle, and a slit */
  const ew=R*.82,eh=R*op;q.fillStyle=BLK;q.beginPath();poly(q,[[32-ew*1.12,cy+.6-eh*.2],[32-ew*.4,cy+.6-eh*1.3],[32+ew*.5,cy+.6-eh*1.24],[32+ew*1.14,cy+.6],[32+ew*.44,cy+.6+eh*1.22],[32-ew*.5,cy+.6+eh*1.16]]);q.fill();
  q.save();q.beginPath();poly(q,[[32-ew,cy+.6-eh*.1],[32-ew*.36,cy+.6-eh],[32+ew*.44,cy+.6-eh*.96],[32+ew,cy+.6],[32+ew*.4,cy+.6+eh*.96],[32-ew*.44,cy+.6+eh*.92]]);q.clip();q.fillStyle='#e8dcc6';q.fillRect(10,cy-20,44,40);q.fillStyle='rgba(98,70,120,.5)';q.beginPath();poly(q,[[10,cy-20],[54,cy-20],[54,cy-eh*.2],[36,cy-eh*.5],[24,cy-eh*.34],[10,cy-eh*.56]]);q.fill();
  const lx=32+(a?0:w*1.1),ir=R*.43;q.fillStyle=BLK;q.beginPath();q.arc(lx,cy+.8,ir+.6,0,7);q.fill();q.fillStyle=o.glow==GLOWR?'#8a1420':'#b4581c';q.beginPath();q.arc(lx,cy+.8,ir,0,7);q.fill();q.fillStyle=o.glow;q.beginPath();q.arc(lx,cy+.8,ir*.66,0,7);q.fill();
  q.fillStyle=BLK;q.beginPath();poly(q,[[lx,cy+.8-ir*.9],[lx+(a>0?.5:1.3),cy+.8],[lx,cy+.8+ir*.9],[lx-(a>0?.5:1.3),cy+.8]]);q.fill();q.fillStyle='#fff';q.beginPath();poly(q,[[lx-ir*.6,cy+.8-ir*.6],[lx-ir*.2,cy+.8-ir*.56],[lx-ir*.46,cy+.8-ir*.2]]);q.fill();
  q.strokeStyle='#a8324a';q.lineWidth=.3;q.beginPath();for(const s of[-1,1]){q.moveTo(32+s*R*.7,cy+1);q.lineTo(32+s*R*.5,cy-1.4);q.moveTo(32+s*R*.66,cy+2.6);q.lineTo(32+s*R*.46,cy+3.6)}q.stroke();q.restore()}});
 masses(g,M);if(o.ant){g.strokeStyle=BLK;g.lineWidth=.9;g.beginPath();g.moveTo(32,cy-R);g.lineTo(34.6,cy-R-5);g.lineTo(32.6,cy-R-8.4);g.stroke();g.fillStyle=o.glow;g.beginPath();poly(g,[[32.4,cy-R-11],[34,cy-R-9],[32.4,cy-R-7.4],[30.8,cy-R-9]]);g.fill()}
 return[32,cy+R*.62+3.4]}

/* MASK SPIRIT: a horned mask with nothing behind it but torn cloth, and two clawed hands that float beside it */
function maskspirit(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],cx=32+h*3,cy=19+w*1.5+h*2+(a>0?3:a<0?-2:0),CL={base:P.shade,shade:P.deep,deep:BLK,light:P.base},glow=h?P.deep:o.glow;
 for(let i=0;i<5;i++){const bx=cx+(i-2)*4.6,len=38-Math.abs(i-2)*5-(a<0?5:0);tube(M,CL,curve(t=>[bx+(i-2)*2.4*t+Math.sin(t*4.2+i*1.9+w*1.6)*3.2*t,cy+9+len*t],8),3,.6,{dark:1,u:1.4,k:.8})}
 /* the hands */for(const s of[-1,1]){const hx=a>0?cx+s*10.6:a<0?cx+s*23:cx+s*21.4,hy=a>0?cy+27:a<0?cy+2:cy+17-w*s*2.2,k=a>0?1.45:1,dn=a<0?-1:1;
  PG(M,P,[[hx-3.6*k,hy-2.4*k],[hx+3.4*k,hy-2.8*k],[hx+4*k,hy+1.4*k],[hx+1*k,hy+3.2*k],[hx-3.2*k,hy+2.4*k]],{u:1.3,in:q=>scr(q,[[hx-1.6,hy-1,hx-1.6,hy+1.6],[hx+1.4,hy-1,hx+1.4,hy+1.6]])});
  for(let f=-1.5;f<=1.5;f++){const fx=hx+f*2*k;PG(M,P,[[fx-1*k,hy+dn*2*k],[fx+1*k,hy+dn*2*k],[fx-s*.9*k+f*.5*k,hy+dn*8.4*k]],{u:1,k:.4});PG(M,DBONE,[[fx-.55*k-s*.4*k+f*.3*k,hy+dn*6*k],[fx+.55*k-s*.4*k+f*.3*k,hy+dn*6*k],[fx-s*1.1*k+f*.6*k,hy+dn*10.6*k]],{u:.8,k:.3})}
  PG(M,CL,[[hx-3*k,hy-dn*2.4*k],[hx+3*k,hy-dn*2.4*k],[hx+s*1.6*k,hy-dn*8*k],[hx-s*.4*k,hy-dn*5.6*k],[hx-s*2.4*k,hy-dn*8.6*k]],{dark:1,u:1,k:.5})}
 for(const s of[-1,1])PG(M,DBONE,o.hn?[[cx+s*7,cy-9],[cx+s*11.4,cy-8],[cx+s*17,cy-14],[cx+s*17.6,cy-22.6],[cx+s*13,cy-15],[cx+s*8.4,cy-12]]:[[cx+s*7,cy-9],[cx+s*10.6,cy-8.4],[cx+s*12.6,cy-16],[cx+s*8,cy-12]],{u:1.3,k:.5,in:q=>scr(q,[[cx+s*10,cy-10.6,cx+s*11.4,cy-12.6],[cx+s*12.6,cy-12.6,cx+s*14,cy-14.6]])});
 const mo=a>0?5.6:a<0?1.4:2.6+w*.5;
 PG(M,P,[[cx-11,cy-8],[cx-6,cy-11.4],[cx+6,cy-11.4],[cx+11,cy-8],[cx+12.6,cy],[cx+9.4,cy+7.6],[cx+3.6,cy+13.6+mo*.5],[cx-3.6,cy+13.6+mo*.5],[cx-9.4,cy+7.6],[cx-12.6,cy]],{hl:1,u:1.6,in:q=>{
  for(const s of[-1,1])geye(q,cx+s*5.6,cy-1.6,3.6,1.5,s,glow);
  q.fillStyle=BLK;q.beginPath();poly(q,[[cx-8.4,cy+4.6],[cx,cy+3],[cx+8.4,cy+4.6],[cx+5.6,cy+7.4+mo],[cx,cy+8.6+mo],[cx-5.6,cy+7.4+mo]]);q.fill();teeth(q,cx-7,cx+7,cy+4.4,2.6,6);teeth(q,cx-5,cx+5,cy+7.6+mo,2.2,4,1);
  scr(q,[[cx-3.6,cy-8.6,cx-1,cy-5.6],[cx+3.6,cy-8.6,cx+1,cy-5.6],[cx-10,cy+1.6,cx-8.4,cy+4],[cx+10,cy+1.6,cx+8.4,cy+4],[cx,cy-10.6,cx,cy-7.6]]);
  if(o.pat){q.fillStyle=P.mark;q.beginPath();poly(q,[[cx-1.6,cy-10.4],[cx+1.6,cy-10.4],[cx,cy-5.4]]);q.fill()}
  if(h){q.strokeStyle=BLK;q.lineWidth=.6;q.beginPath();q.moveTo(cx+4,cy-11);q.lineTo(cx+1.4,cy-4);q.lineTo(cx+4.4,cy+1);q.stroke()}}});
 masses(g,M);return[cx,cy-7]}

/* SPIDER FIEND */
function spider(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],by=h?3:a>0?-2.6:a<0?2:0,cl=h?.74:1;
 for(const s of[-1,1])for(let k=0;k<4;k++){const al=(k%2?1:-1)*w*(s>0?1:-1),up=a>0&&k<2;const hx=32+s*8,hy=40+k*1.6+by,kx=32+s*(15+k*3.4)*cl,ky=17+k*5.4+by-al*2.4-(up?6:0),ax=32+s*(23+k*2.6)*cl,ay=30+k*6+by-al*1.2-(up?12:0),fx=up?32+s*(15+k*5):32+s*(21.6+k*3.2)*cl+al*1.2,fy=up?14+k*7:(k==0?52:57+k*1.8)-(al>0?2.4:0);
  const seg=(x0,y0,x1,y1,w0,w1,oo)=>{const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;PG(M,P,[[x0+nx*w0,y0+ny*w0],[x1+nx*w1,y1+ny*w1],[x1-nx*w1,y1-ny*w1],[x0-nx*w0,y0-ny*w0]],Object.assign({u:1.3,k:.5},oo||{}))};
  seg(hx,hy,kx,ky,1.9,1.5);seg(kx,ky,ax,ay,1.5,1.2);seg(ax,ay,fx,fy,1.1,.25);PG(M,P,[[kx-2,ky-.6],[kx,ky-2.2],[kx+2,ky-.4],[kx+.4,ky+2]],{u:1.1,k:.4})}
 const ay0=21.6+by*.6-(a>0?2:0);
 PG(M,P,[[32-6,ay0-13.6],[32+5,ay0-13.8],[32+12.6,ay0-8.6],[32+15,ay0-.6],[32+12.4,ay0+8],[32+5.6,ay0+13.4],[32-5,ay0+13.6],[32-12.6,ay0+8.4],[32-15,ay0+.4],[32-12,ay0-8.4]],{hl:1,u:1.8,in:q=>{const y=by*.6-(a>0?2:0);q.fillStyle=BLK;q.beginPath();if(o.pat==1){for(let k=0;k<4;k++)poly(q,[[20,12+k*5.4+y],[32,14.6+k*5.4+y],[44,12+k*5.4+y],[32,16.4+k*5.4+y]])}else poly(q,[[27,12+y],[37,12+y],[33.4,19.4+y],[38.6,28.6+y],[25.4,28.6+y],[30.6,19.4+y]]);q.fill();scr(q,[[20,26+y,22.6,29+y],[44,26+y,41.4,29+y],[23,30+y,26,32.6+y],[41,30+y,38,32.6+y]])}});
 const hy=42.6+by;PG(M,P,[[32-7,hy-8],[32+7,hy-8],[32+11,hy-2],[32+9,hy+5.4],[32+3,hy+9],[32-3,hy+9],[32-9,hy+5.4],[32-11,hy-2]],{u:1.5,in:q=>{for(const s of[-1,1]){geye(q,32+s*5,hy-1.2,2.9,1.3,s,h?P.deep:o.glow);q.fillStyle=h?P.deep:o.glow;q.beginPath();q.arc(32+s*3,hy-5,.9,0,7);q.fill();if(o.n>=3){q.beginPath();q.arc(32+s*6.6,hy-5.6,.75,0,7);q.fill()}}}});
 const fo=a>0?2.6:a<0?.2:.8+w*.3;for(const s of[-1,1])PG(M,DBONE,[[32+s*1,hy+5],[32+s*4.6,hy+5.4],[32+s*(3.6+fo),hy+10],[32+s*(1.4+fo*.6),hy+14.6+(a>0?2:0)],[32+s*1.6,hy+9.4]],{u:1.1,k:.4});
 if(o.hn)for(const s of[-1,1])PG(M,DBONE,[[32+s*8.6,10+by*.6],[32+s*13.6,2.6+by*.6],[32+s*12.6,12+by*.6]],{u:1.1,k:.4});
 masses(g,M);return[32,24+by*.6-(a>0?2:0)]}

/* GIANT CENTIPEDE: rears up out of its coils; plates down its back, rows of legs, hooked jaws */
function centipede(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],N=9,top=a>0?20:a<0?8:12+w*.6,PL2={base:P.shade,shade:P.deep,deep:BLK,light:P.base};
 const pt=t=>[32+Math.sin(t*4.3+.6+w*.55+(h?.8:0))*(13*(1-t)+2.6)+(a>0?(t*t)*-3:0)+h*t*5,55-t*(55-top)+(a>0?Math.sin(t*3.14)*3:0)];
 const pts=curve(pt,N);
 for(let i=0;i<N-1;i++){const p=pts[i],q2=pts[i+1],ang=Math.atan2(q2[1]-p[1],q2[0]-p[0]),t=i/(N-1),rx=8.4-t*2.4,ux=Math.cos(ang),uy=Math.sin(ang),nx=-uy,ny=ux,wg=(i%2?1:-1)*w*1.3;
  for(const s of[-1,1])PG(M,DBONE,[[p[0]+nx*s*rx*.7-ux*.9,p[1]+ny*s*rx*.7-uy*.9],[p[0]+nx*s*rx*.7+ux*.9,p[1]+ny*s*rx*.7+uy*.9],[p[0]+nx*s*(rx+4.2)+ux*(1.6+wg*s),p[1]+ny*s*(rx+4.2)+uy*(1.6+wg*s)+1.6]],{u:.9,k:.3});
  /* a back plate: a wide angular scute, its rear edge notched */
  const A=(u,v)=>[p[0]+ux*u+nx*v,p[1]+uy*u+ny*v];PG(M,i%2?PL2:P,[A(-4.4,-rx*.8),A(-1.4,-rx*1.05),A(3.6,-rx*.74),A(4.8,0),A(3.6,rx*.74),A(-1.4,rx*1.05),A(-4.4,rx*.8),A(-2.8,0)],{hl:!(i%2),u:1.5,k:.7,in:q=>scr(q,[[...A(0,-rx*.5),...A(1.6,-rx*.2)],[...A(0,rx*.3),...A(1.6,rx*.6)]])})}
 const H=pts[N-1],hx=H[0],hy=H[1];
 /* feelers */for(const s of[-1,1])tube(M,PL2,curve(t=>[hx+s*(3+t*9.6+Math.sin(t*3+w*1.4)*1.6),hy-4-t*(a>0?4:9.4)-(1-t)*t*5],6),.7,.2,{dark:1,u:1,k:.3});
 const jo=h?.2:a>0?1.9:a<0?.3:.8+w*.35;
 for(const s of[-1,1])PG(M,DBONE,[[hx+s*2.4,hy+3.6],[hx+s*6.4,hy+3],[hx+s*(6+jo*3.4),hy+8.6],[hx+s*(2.6+jo*1.9),hy+13.6+(a>0?2.4:0)],[hx+s*(3+jo*1.6),hy+8]],{u:1.2,k:.4});
 PG(M,P,[[hx-5,hy-5.8],[hx+5,hy-5.8],[hx+8,hy-1.4],[hx+6.4,hy+4],[hx+2.6,hy+6.4],[hx-2.6,hy+6.4],[hx-6.4,hy+4],[hx-8,hy-1.4]],{hl:1,u:1.6,in:q=>{for(const s of[-1,1])geye(q,hx+s*3.6,hy-.4,2.7,1.25,s,h?P.deep:o.glow);q.fillStyle=BLK;q.beginPath();poly(q,[[hx-3,hy+3.6],[hx+3,hy+3.6],[hx+1.6,hy+5.4+jo],[hx-1.6,hy+5.4+jo]]);q.fill();scr(q,[[hx-5.6,hy+1.6,hx-4.4,hy+3.6],[hx+5.6,hy+1.6,hx+4.4,hy+3.6],[hx,hy-5.6,hx,hy-3.4]]);if(o.pat){q.fillStyle=P.mark;q.beginPath();poly(q,[[hx-1.4,hy-5.6],[hx+1.4,hy-5.6],[hx,hy-2.4]]);q.fill()}}});
 if(o.hn)for(const s of[-1,1])PG(M,DBONE,[[hx+s*4.4,hy-4.6],[hx+s*6.6,hy-3.6],[hx+s*8.6,hy-9.6]],{u:1,k:.3});
 masses(g,M);const W=pts[N-3];return[W[0],W[1]]}

/* MAN-EATER: a toothed pod on a thorned stalk, whipping two vines */
function maneater(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],bx=32+w*4.6+h*6,by=(a>0?31:a<0?13:19)+h*8+Math.abs(w)*.8;
 for(const s of[-1,1])for(const[k,L]of[[.5,15],[1.15,11]])PG(M,LEAF,[[32+s*2,60.6],[32+s*(L*.5),57-k*4],[32+s*(L*.8),57.6-k*6.4],[32+s*(L+3),60.6-k*7-(k<1?w*s*.8:0)],[32+s*(L*.9),60-k*2],[32+s*(L*.7),61.6],[32+s*4,62.6]],{u:1.3,k:.7,in:q=>scr(q,[[32+s*3,60.4,32+s*(L+1),60.6-k*6]])});
 for(const s of[-1,1]){const ex=a>0?32+s*14:32+s*(25+w*s*1.6),ey=a>0?52:a<0?18:30+w*s*6.6;tube(M,LEAF,curve(t=>[32+s*5+(ex-32-s*5)*t+Math.sin(t*3.14)*s*(a>0?9:5),59+(ey-59)*t-Math.sin(t*3.14)*(a>0?-3:5)],9),1.6,.35,{u:1.3,k:.5});
  PG(M,DBONE,[[ex-1.3,ey],[ex+1.3,ey],[ex+s*.6,ey-(a>0?-4:4)]],{u:.9,k:.3})}
 const st=curve(t=>[32+Math.sin(t*2.7)*6.4*(1-t)+(bx-32)*t*t,60+(by+8.6-60)*t],9);
 tube(M,LEAF,st,3.3,2.3,{u:1.6,in:q=>scr(q,st.slice(1,7).map((p,i)=>[p[0]-2,p[1],p[0]+2,p[1]-(i%2?1:-1)]))});
 for(let i=2;i<7;i+=2){const p=st[i],s=i%4?1:-1;PG(M,DBONE,[[p[0]+s*2.4,p[1]-1],[p[0]+s*2.4,p[1]+1],[p[0]+s*5.6,p[1]-1.6]],{u:.8,k:.3})}
 const op=h?.6:a>0?8:a<0?.8:2.4+w*.9;
 /* the throat, then the lower jaw, then the upper */
 PG(M,GORE,[[bx-12.86,by+1.34],[bx-6.7,by-op-1.88],[bx+6.7,by-op-1.88],[bx+12.86,by+1.34],[bx+6.7,by+op+4.56],[bx-6.7,by+op+4.56]],{u:1,k:.5,in:q=>{q.fillStyle='#c8566a';q.beginPath();poly(q,[[bx-4.56,by+op*.5+2.14],[bx,by+1.34],[bx+4.56,by+op*.5+2.14],[bx,by+op+3.22]]);q.fill()}});
 /* fangs: long uneven ones hanging from the upper jaw, shorter ones standing in the lower */
 for(let t=0;t<7;t++){const x=bx-12.6+t*4.2,l=(t%2?3:4.6)+(a>0?1.4:0);PG(M,DBONE,[[x-1.5,by-op*.6+.4],[x+1.5,by-op*.6+.4],[x+(t%2?.5:-.5),by-op*.6+.4+l]],{u:.8,k:.3})}
 for(let t=0;t<6;t++){const x=bx-10.5+t*4.2,l=(t%2?3.6:2.6);PG(M,DBONE,[[x-1.4,by+op*.6+.6],[x+1.4,by+op*.6+.6],[x+(t%2?-.4:.4),by+op*.6+.6-l]],{u:.8,k:.3})}
 PG(M,P,[[bx-14.74,by+op*.6],[bx+14.74,by+op*.6],[bx+13.4,by+op+6.16],[bx+7.5,by+op+11.52],[bx,by+op+12.86],[bx-7.5,by+op+11.52],[bx-13.4,by+op+6.16]],{u:1.5,in:q=>{teeth(q,bx-12.86,bx+12.86,by+op*.6+.2,3,6,1);scr(q,[[bx-8.04,by+op+6.7,bx-5.36,by+op+10.18],[bx+8.04,by+op+6.7,bx+5.36,by+op+10.18]])}});
 PG(M,P,[[bx-16.08,by-op*.6+1.34],[bx-14.74,by-op*.6-7.5],[bx-8.04,by-op*.6-13.94],[bx,by-op*.6-16.08],[bx+8.04,by-op*.6-13.94],[bx+14.74,by-op*.6-7.5],[bx+16.08,by-op*.6+1.34]],{hl:1,u:1.6,in:q=>{const y=by-op*.6;teeth(q,bx-14.2,bx+14.2,y+.8,3.4,7);
  q.fillStyle=h?P.deep:o.glow;for(let i=0;i<Math.max(2,o.n);i++){const x=bx+(i-(Math.max(2,o.n)-1)/2)*4.6,yy=y-4.4-((i%2)*1.4);q.beginPath();poly(q,[[x-1.4,yy-.5],[x+1.2,yy-.9],[x+1.4,yy+.6],[x-1,yy+.8]]);q.fill()}
  if(o.pat){q.fillStyle=P.mark;for(const[x,yy,r]of[[-7,-6,1.3],[6.6,-7,1.1],[-2,-9.6,1],[3,-9,.8]]){q.beginPath();poly(q,[[bx+x-r,y+yy],[bx+x,y+yy-r],[bx+x+r,y+yy],[bx+x,y+yy+r]]);q.fill()}}scr(q,[[bx-12.06,y-4,bx-9.92,y-1.6],[bx+12.06,y-4,bx+9.92,y-1.6]])}});
 if(o.hn)for(const k of[-1,0,1])PG(M,LEAF,[[bx+k*5-1.6,by-op*.6-13.94+Math.abs(k)*1.4],[bx+k*5+1.6,by-op*.6-13.94+Math.abs(k)*1.4],[bx+k*7,by-op*.6-21.44+Math.abs(k)*2]],{u:1,k:.4});
 masses(g,M);const W=st[4];return[W[0],W[1]]}

/* OOZE: a heap of living slime full of eyes and the bones of what it ate */
function ooze(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],rx=h?25:a>0?15.6:a<0?24:20+w*1.2,ry=h?8.6:a>0?24:a<0?10.6:15.6-w*1.2,cy=61-ry,R0=rnd(91);
 const out=curve(t=>{const th=t*6.2832,r=1+Math.sin(th*3+w*1.5)*.08+Math.sin(th*5-w)*.05+(R0()-.5)*.09,up=Math.sin(th)<-.3?1+(R0()-.3)*.16:1;return[32+Math.cos(th)*rx*r,Math.min(61.4,cy+Math.sin(th)*ry*r*up)]},21).slice(0,20);
 /* arms of slime thrown up at the sides */for(const s of[-1,1]){const ex=32+s*(rx+3+(a>0?2:0)),ey=a>0?cy-ry*.5:h?cy-2:cy-ry*.5+w*s*3.4;tube(M,P,curve(t=>[32+s*rx*.6+(ex-32-s*rx*.6)*t,cy+2+(ey-cy-2)*t-Math.sin(t*3.14)*4.4],6),3.2,1.5,{u:1.5,k:.6});PG(M,P,[[ex-2.4,ey-.6],[ex-.4,ey-3],[ex+2.4,ey-1],[ex+1.6,ey+2.4],[ex-1.6,ey+2]],{hl:1,u:1.3,k:.5})}
 PG(M,P,out,{hl:1,u:1.7,k:1.3,in:q=>{
  /* what is inside */q.fillStyle=DBONE.shade;for(const[x,y,l,r]of[[-9,3,6,.5],[8,5,5,-.7],[1,8,4,.2]]){q.save();q.translate(32+x*rx/20,cy+y*ry/16);q.rotate(r+w*.1);q.fillRect(-l/2,-.6,l,1.2);q.fillRect(-l/2-1,-1.2,1.6,2.4);q.fillRect(l/2-.6,-1.2,1.6,2.4);q.restore()}
  const E=[[-9,-5],[6,-7],[-2,-1],[11,-1],[-13,2],[3,4],[-6,7]],ne=Math.min(7,3+o.n);for(let i=0;i<ne;i++){const x=32+E[i][0]*rx/20+Math.sin(w*1.3+i)*1,y=cy+E[i][1]*ry/16+Math.cos(w+i*2)*.7;geye(q,x,y,2.3-(i%3)*.3,1.05,i%2?1:-1,h?P.deep:o.glow)}
  if(a>0){q.fillStyle=BLK;q.beginPath();poly(q,[[32-6,cy-10],[32+5,cy-11.6],[32+8,cy-3],[32+5.6,cy+6.6],[32-4.6,cy+8],[32-8,cy]]);q.fill();q.fillStyle=GORE.shade;q.beginPath();poly(q,[[32-4,cy-4],[32+4,cy-5],[32+4.6,cy+3],[32-3.6,cy+5]]);q.fill();q.strokeStyle=P.base;q.lineWidth=.9;q.beginPath();for(const x of[-4,0,4]){q.moveTo(32+x,cy-11.6);q.lineTo(32+x*.7,cy+7.6)}q.stroke()}
  scr(q,[[32-rx*.7,cy+ry*.4,32-rx*.5,cy+ry*.62],[32+rx*.7,cy+ry*.4,32+rx*.5,cy+ry*.62],[32-rx*.2,cy+ry*.72,32+rx*.2,cy+ry*.74]]);
  if(o.pat){q.fillStyle=P.light;for(const[x,y]of[[-12,-8],[12,-9],[-15,-2]]){q.beginPath();q.arc(32+x*rx/20,cy+y*ry/16,.9,0,7);q.fill()}}}});
 /* drips */for(const[x,l]of[[-rx*.72,3.4],[rx*.5,4.4]])PG(M,P,[[32+x-.9,cy-ry*.5-l-w*1.2],[32+x,cy-ry*.5-l-w*1.2-1.8],[32+x+.9,cy-ry*.5-l-w*1.2],[32+x,cy-ry*.5-l-w*1.2+1.4]],{u:.9,k:.3});
 masses(g,M);return[32,cy+(a>0?ry*.62:ry*.2)]}

/* MAW CRAB: a spiked shell, a mouth that opens sideways, two great pincers */
function mawcrab(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],by=w*.9+(h?3.4:a>0?2:a<0?-2:0),SH={base:P.shade,shade:P.deep,deep:BLK,light:P.base};
 for(const s of[-1,1])for(let k=0;k<3;k++){const al=(k%2?1:-1)*w*s,kx=32+s*(17+k*4.2),ky=38+k*2.6+by-al*1.6,fx=32+s*(21+k*5)+al*1.4,fy=61-(al>0?2.2:0);tube(M,P,[[32+s*11,44+by],[kx,ky],[fx,fy]],2,.35,{u:1.3,k:.5})}
 /* pincers */for(const s of[-1,1]){const px=a>0?32+s*11:a<0?32+s*25:32+s*24.4,py=a>0?52:a<0?19:45-w*s*2.6+by,k=a>0?1.3:1,op=h?.2:a>0?.15:a<0?1.5:.6+w*s*.4,dn=a<0?-1:1;
  tube(M,P,[[32+s*18,40+by],[32+s*(a>0?19:25.6),a<0?32:42+by],[px,py-dn*3*k]],2.6,2.1,{u:1.4,k:.6});
  PG(M,P,[[px-s*4.4*k,py-dn*3.4*k],[px+s*2.6*k,py-dn*4.6*k],[px+s*6*k,py],[px+s*(4.6+op)*k,py+dn*6*k],[px+s*(1+op)*k,py+dn*11*k],[px-s*1*k,py+dn*5.6*k],[px-s*4.6*k,py+dn*2*k]],{hl:1,u:1.5,in:q=>scr(q,[[px-s*2*k,py-dn*1*k,px+s*1*k,py+dn*1.4*k],[px+s*2*k,py+dn*2*k,px+s*3*k,py+dn*5*k]])});
  PG(M,P,[[px-s*4.4*k,py+dn*2.4*k],[px-s*1.6*k,py+dn*5*k],[px-s*(2.6+op*2.2)*k,py+dn*10.4*k],[px-s*(5.6+op)*k,py+dn*5.6*k]],{u:1.3,k:.6})}
 {const n=o.hn?5:3;for(let i=0;i<n;i++){const x=32+(i-(n-1)/2)*(o.hn?8:11),y=18+by+Math.abs(i-(n-1)/2)*(o.hn?2.2:3);PG(M,DBONE,[[x-2.2,y+1.6],[x+2.2,y+1.6],[x+(i-(n-1)/2)*1.4,y-(o.hn?8:5.6)]],{u:1.1,k:.4})}}
 const mo=h?.3:a>0?5:a<0?1:1.9+w*.6,sy=by;
 PG(M,SH,[[8,35+sy],[11.6,25+sy],[21,18.6+sy],[32,16.6+sy],[43,18.6+sy],[52.4,25+sy],[56,35+sy],[50,43+sy],[40,46.4+sy],[24,46.4+sy],[14,43+sy]],{hl:1,u:1.8,k:1.3,in:q=>{
  q.strokeStyle=BLK;q.lineWidth=.5;q.beginPath();for(const s of[-1,1]){q.moveTo(32+s*5,17.6+sy);q.lineTo(32+s*10.6,26+sy);q.lineTo(32+s*9,36+sy);q.moveTo(32+s*14,20.6+sy);q.lineTo(32+s*20,28+sy);q.lineTo(32+s*19,39+sy)}q.stroke();
  for(const s of[-1,1]){geye(q,32+s*7.6,31+sy,2.9,1.3,s,h?P.deep:o.glow);if(o.n>=3){q.fillStyle=h?P.deep:o.glow;q.beginPath();q.arc(32+s*13.6,33.6+sy,.9,0,7);q.fill()}}
  /* the mouth: a slit that opens sideways, teeth meshing */q.fillStyle=BLK;q.beginPath();poly(q,[[32,29.6+sy],[32+2+mo,37+sy],[32,46.4+sy],[32-2-mo,37+sy]]);q.fill();q.fillStyle=GORE.base;q.beginPath();poly(q,[[32,32.6+sy],[32+.6+mo*.7,37+sy],[32,43.4+sy],[32-.6-mo*.7,37+sy]]);q.fill();
  q.fillStyle='#efe6d2';q.strokeStyle=BLK;q.lineWidth=.3;for(const s of[-1,1])for(let k=0;k<4;k++){const y=32.6+k*3.2+sy,xe=32+s*(1.6+mo*(1-Math.abs(k-1.5)/2.6));q.beginPath();poly(q,[[xe,y-1.1],[xe,y+1.1],[xe-s*(1.6+mo*.36),y]]);q.fill();q.stroke()}
  if(o.pat){q.fillStyle=P.mark;for(const[x,y]of[[-17,27],[17,27],[-12,22.6],[12,22.6]]){q.beginPath();poly(q,[[32+x-1.2,y+sy],[32+x,y+sy-1.2],[32+x+1.2,y+sy],[32+x,y+sy+1.2]]);q.fill()}}}});
 masses(g,M);return[32,23.6+sy]}

/* BOAR-BEAST (the Shover): a mountain of shoulder behind a tusked head, seen coming straight at you */
function boar(g,P,o,ps){const w=ps.w||0,a=ps.a||0,h=ps.h||0,M=[],hy=(a>0?45:a<0?31:39.4)+w*.7+h*1.6,hx=32+h*4,k=a>0?1.2:1,MN={base:P.deep,shade:BLK,deep:BLK,light:P.shade};
 for(const s of[-1,1])tube(M,P,[[32+s*17,40],[32+s*20.6,50],[32+s*20,58.6]],3.6,2.6,{u:1.5,k:.7});
 for(const s of[-1,1])PG(M,DBONE,[[32+s*17,58],[32+s*23,58],[32+s*23.6,62.4],[32+s*16.6,62.4]],{u:1.2,k:.5});
 /* the hump, with a ridge of bristles */
 for(let i=-4;i<=4;i++)PG(M,MN,[[32+i*4.2-2.2,13.4+Math.abs(i)*1.7+w*.5],[32+i*4.2+2.2,13.4+Math.abs(i)*1.7+w*.5],[32+i*5,6+Math.abs(i)*2.3+w*.9-(a<0?2:0)]],{dark:1,u:1.2,k:.5});
 const hh=w*.5;PG(M,P,[[32-9,11.6-hh],[32+9,11.6-hh],[32+18,16+hh*.4],[32+23.6,26],[32+22.6,37],[32+16,45],[32,47.4],[32-16,45],[32-22.6,37],[32-23.6,26],[32-18,16+hh*.4]],{hl:1,u:1.9,k:1.4,in:q=>{scr(q,[[14,34,17,38],[50,34,47,38],[20,20,22.6,23.6],[44,20,41.4,23.6],[26,15.6,27.4,19],[38,15.6,36.6,19]]);if(o.pat){q.fillStyle=BLK;for(const s of[-1,1]){q.beginPath();poly(q,[[32+s*12,17],[32+s*17,20],[32+s*13.4,22.6]]);q.fill();q.beginPath();poly(q,[[32+s*17,24],[32+s*21,28],[32+s*17.4,29.6]]);q.fill()}}}});
 /* front legs: one paws the ground */
 for(const s of[-1,1]){const lift=(!a&&!h&&w*s>0)?3.4:0;tube(M,P,[[32+s*10,42],[32+s*12.6,51-lift*.4],[32+s*11.6,58.4-lift]],4.4,3,{u:1.6,k:.8,in:q=>scr(q,[[32+s*10.6,48,32+s*12,52],[32+s*13.4,49,32+s*14,53]])});PG(M,DBONE,[[32+s*7.6,58-lift],[32+s*15.6,58-lift],[32+s*16.4,62.6-lift],[32+s*7,62.6-lift]],{u:1.3,k:.5,in:q=>scr(q,[[32+s*11.6,58.4-lift,32+s*11.6,62.4-lift]])})}
 /* ears, the head, tusks, snout */
 for(const s of[-1,1])PG(M,P,[[hx+s*8*k,hy-7.6*k],[hx+s*15.6*k,hy-12*k],[hx+s*12.6*k,hy-3.6*k]],{u:1.3,k:.5});
 if(o.hn)for(const s of[-1,1])PG(M,DBONE,[[hx+s*6*k,hy-9*k],[hx+s*10*k,hy-8*k],[hx+s*15*k,hy-17*k],[hx+s*9.6*k,hy-12.4*k]],{u:1.2,k:.5});
 PG(M,P,[[hx-7*k,hy-10*k],[hx+7*k,hy-10*k],[hx+13*k,hy-4*k],[hx+12.4*k,hy+4*k],[hx+7*k,hy+10*k],[hx-7*k,hy+10*k],[hx-12.4*k,hy+4*k],[hx-13*k,hy-4*k]],{hl:1,u:1.8,in:q=>{for(const s of[-1,1])geye(q,hx+s*6*k,hy-3*k,3.4*k,1.4*k,s,h?P.deep:o.glow);scr(q,[[hx-2.6*k,hy-7.6*k,hx-1*k,hy-4.4*k],[hx+2.6*k,hy-7.6*k,hx+1*k,hy-4.4*k],[hx-10.6*k,hy+1*k,hx-9*k,hy+4*k],[hx+10.6*k,hy+1*k,hx+9*k,hy+4*k]])}});
 for(const s of[-1,1])PG(M,DBONE,[[hx+s*5*k,hy+6.6*k],[hx+s*8.6*k,hy+5*k],[hx+s*14.6*k,hy-1*k],[hx+s*16.6*k,hy-8.6*k],[hx+s*11.6*k,hy-1.6*k],[hx+s*7.6*k,hy+3*k]],{u:1.3,k:.5,in:q=>scr(q,[[hx+s*9*k,hy+3.6*k,hx+s*10.4*k,hy+1*k]])});
 PG(M,P,[[hx-4.6*k,hy+1.6*k],[hx+4.6*k,hy+1.6*k],[hx+6.6*k,hy+5.6*k],[hx+4*k,hy+10*k],[hx-4*k,hy+10*k],[hx-6.6*k,hy+5.6*k]],{u:1.4,k:.6,in:q=>{q.fillStyle=BLK;for(const s of[-1,1]){q.beginPath();poly(q,[[hx+s*1.4*k,hy+4.4*k],[hx+s*3.4*k,hy+4*k],[hx+s*3.6*k,hy+6.6*k],[hx+s*1.6*k,hy+7*k]]);q.fill()}}});
 masses(g,M);if(a){g.strokeStyle='#efe6d2';g.lineWidth=.6;g.beginPath();for(const s of[-1,1]){g.moveTo(hx+s*5*k,hy+9*k);g.lineTo(hx+s*10*k,hy+(a>0?14:5)*k)}g.stroke()}
 return[32,24+w*.5]}

/* trait extras */
function traitsUnder(g,tr){if(tr.includes('phaser')){g.strokeStyle='rgba(206,120,255,.95)';g.lineWidth=1.4;g.beginPath();g.arc(32,32,30,0,7);g.stroke();g.strokeStyle='rgba(255,220,255,.85)';g.lineWidth=.55;g.beginPath();g.arc(32,32,28,0,7);g.stroke()}
 if(tr.includes('swift')||tr.includes('charger')){g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.2;for(let i=0;i<3;i++){g.beginPath();g.moveTo(0,22+i*10);g.lineTo(9-i*1.5,22+i*10);g.stroke()}}}
function traitsOver(g,tr,ws,ps){const M=[],x=ws[0],y=ws[1];
 if(tr.includes('armored')){for(const s of[-1,1])PG(M,STEEL,[[x+s*6.6,y-4],[x+s*12.6,y-3],[x+s*13.4,y+2],[x+s*11,y+5],[x+s*6.6,y+4]],{u:1.2,k:.5,hl:1,in:q=>{q.fillStyle=BLK;for(const yy of[-1.6,2]){q.beginPath();q.arc(x+s*10.6,y+yy,.5,0,7);q.fill()}}})}
 if(tr.includes('shooter')){const by=y+7,k=ps.a>0?3:0;PG(M,STEEL,[[44,by-3],[59+k,by-2.4],[59+k,by+2.4],[44,by+3]],{u:1.3,k:.6,hl:1});PG(M,{base:'#ff6a5a',shade:'#b81e2c',deep:'#6a1020',light:'#ffb0a0'},[[58.4+k,by-1.8],[61.6+k,by-1.8],[61.6+k,by+1.8],[58.4+k,by+1.8]],{u:1,k:.3})}
 masses(g,M);
 if(tr.includes('volatile')){const pth=()=>{g.beginPath();g.moveTo(x-3,y-10);g.lineTo(x+2,y-3);g.lineTo(x-3.4,y+2);g.lineTo(x+1,y+10)};pth();g.strokeStyle=BLK;g.lineWidth=2.6;g.stroke();pth();g.strokeStyle='#ff8a1e';g.lineWidth=1.6;g.stroke();pth();g.strokeStyle='#fff2a0';g.lineWidth=.6;g.stroke()}}

/* ---- the drawings of one enemy: made when first asked for, kept ---- */
const POSES=[{w:-1},{w:0},{w:1},{a:-1},{a:1},{h:1}],DES=[eyefiend,maskspirit,spider,centipede,maneater,ooze,mawcrab];
function anim(fn,P,o,tr,rune){const F=[];const D={n:6,ws:null,
  frame(i){if(F[i])return F[i];const[c,g]=canvas(),ps=POSES[i];traitsUnder(g,tr);const ws=fn(g,P,o,ps);traitsOver(g,tr,ws,ps);if(rune){g.save();rune(g,ws[0],ws[1]);g.restore()}const a=done(c);a.ws=ws;return F[i]=a},
  withRune(r){const d=anim(fn,P,o,tr,r);return d}};
 /* where the weak spot is in the resting pose */
 try{const[c,g]=canvas();D.ws=fn(g,P,o,POSES[1])}catch(e){D.ws=[32,32]}
 return D}
C.monster=function(hue,sp,nEyes,pat,sat,mo,hn,ant,tr){tr=tr||[];return anim(DES[sp%7],opal(hue,sat),{n:nEyes,pat,hn,ant,mo,glow:tr.includes('shooter')?GLOWR:GLOW},tr,null)};
C.shover=function(){return anim(boar,opal(16,74),{n:2,pat:1,hn:1,glow:GLOW},[],null)};
C.SZ=SZ;
return C})();

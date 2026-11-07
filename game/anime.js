/* ===== anime.js - the cel-shaded 90s anime look =====
   Every picture the game makes for itself (level textures, monster and people sprites, skins) goes through here once, before it
   reaches the graphics card, and comes back redrawn in the style of a hand-painted anime background or a cel-animated character:
   - the pixel noise is smoothed away and the picture is cut into a few flat colour areas (cels), with clean smooth edges at 4x the size
   - colours are brighter and more saturated, like poster paint
   - raised parts (bricks, planks, tiles) get a light painted edge on top and a shadow edge underneath
   - the borders between areas get a dark coloured ink line; characters also get a thick ink outline around their silhouette
   The renderer (glr.js) adds the rest: two-tone light and shadow, ink lines along every edge and corner in the 3D view, and the sky.
   Pixels are 0xAABBGGRR (the byte order WebGL is given). */
window.ANIME=(function(){
const A={on:true};try{if(localStorage.getItem('ld_anime')=='0')A.on=false}catch(e){}
const texC=new WeakMap(),sprC=new WeakMap();
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
/* ---- colour helpers ---- */
function rgb2hsl(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx>mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx==r?(g-b)/d+(g<b?6:0):mx==g?(b-r)/d+2:(r-g)/d+4;h/=6}return[h,s,l]}
function hue2(p,q,t){if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p}
function hsl2rgb(h,s,l){if(s<=0)return[l,l,l];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return[hue2(p,q,h+1/3),hue2(p,q,h),hue2(p,q,h-1/3)]}
/* the anime paint grade: richer colour, lifted darks, a touch of blue in the shadows and warmth in the light */
function grade(r,g,b,o){let[h,s,l]=rgb2hsl(r,g,b);const sat=o&&o.sat||1.22,lift=o&&o.lift!==undefined?o.lift:1;
 s=clamp(s*sat+(s>.04?.04:0),0,.86);l=clamp(.025*lift+1-Math.pow(1-l,1+.24*lift),0,.95);
 let c=hsl2rgb(h,s,l);const sh=1-clamp(l*2.2,0,1);c=[c[0]*(1-.06*sh),c[1]*(1-.02*sh),Math.min(1,c[2]+.05*sh)];
 return c}
const lum=(r,g,b)=>.3*r+.59*g+.11*b;
const pack=(r,g,b,a)=>((a&255)<<24|(clamp(Math.round(b*255),0,255))<<16|(clamp(Math.round(g*255),0,255))<<8|clamp(Math.round(r*255),0,255))>>>0;

/* ---- cut a picture into k flat colours (k-means on the smoothed picture) ---- */
function smooth(R,G,B,Al,w,h,wrap,it){/* edge-keeping smoothing: average with the neighbours of a similar colour */
 for(let t=0;t<it;t++){const r2=new Float32Array(R),g2=new Float32Array(G),b2=new Float32Array(B);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(Al[i]<.5)continue;let sr=0,sg=0,sb=0,sw=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let xx=x+dx,yy=y+dy;if(wrap){xx=(xx+w)%w;yy=(yy+h)%h}else if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx;if(Al[j]<.5)continue;
    const d=Math.abs(R[j]-R[i])+Math.abs(G[j]-G[i])+Math.abs(B[j]-B[i]),k=Math.exp(-d*d/(2*.09*.09));sr+=R[j]*k;sg+=G[j]*k;sb+=B[j]*k;sw+=k}
   r2[i]=sr/sw;g2[i]=sg/sw;b2[i]=sb/sw}R.set(r2);G.set(g2);B.set(b2)}}
function kmeans(R,G,B,Al,n,K){const idx=[];for(let i=0;i<n;i++)if(Al[i]>=.5)idx.push(i);if(!idx.length)return{lab:new Int16Array(n).fill(-1),C:[]};
 /* farthest-point start, so a small bright detail (a window light, a stripe) gets its own colour */
 const C=[];{let s=[0,0,0];for(const i of idx){s[0]+=R[i];s[1]+=G[i];s[2]+=B[i]}C.push(s.map(v=>v/idx.length))}
 const dist=(i,c)=>{const dr=R[i]-c[0],dg=G[i]-c[1],db=B[i]-c[2];return dr*dr*.3+dg*dg*.59+db*db*.11+(.3*dr+.59*dg+.11*db)**2*2};
 while(C.length<K){let bi=-1,bd=0;for(const i of idx){let m=1e9;for(const c of C)m=Math.min(m,dist(i,c));if(m>bd){bd=m;bi=i}}if(bd<.0016||bi<0)break;C.push([R[bi],G[bi],B[bi]])}
 const lab=new Int16Array(n).fill(-1);
 for(let it=0;it<10;it++){const S=C.map(()=>[0,0,0,0]);for(const i of idx){let bk=0,bd=1e9;for(let k=0;k<C.length;k++){const d=dist(i,C[k]);if(d<bd){bd=d;bk=k}}lab[i]=bk;const s=S[bk];s[0]+=R[i];s[1]+=G[i];s[2]+=B[i];s[3]++}
  for(let k=0;k<C.length;k++)if(S[k][3])C[k]=[S[k][0]/S[k][3],S[k][1]/S[k][3],S[k][2]/S[k][3]]}
 return{lab,C}}
function majority(lab,w,h,wrap,K){const o=new Int16Array(lab);const cnt=new Int16Array(K+1);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(lab[i]<0)continue;cnt.fill(0);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let xx=x+dx,yy=y+dy;if(wrap){xx=(xx+w)%w;yy=(yy+h)%h}else if(xx<0||yy<0||xx>=w||yy>=h)continue;const l=lab[yy*w+xx];if(l>=0)cnt[l]++}
  let bl=lab[i],bc=cnt[bl];for(let k=0;k<K;k++)if(cnt[k]>bc+1){bc=cnt[k];bl=k}o[i]=bl}return o}
/* specks: any patch of fewer than m pixels joins the area around it (paint has no grain) */
function despeck(lab,w,h,wrap,m){const n=lab.length,seen=new Int32Array(n).fill(-1),st=[];let id=0;const o=new Int16Array(lab);
 const nb=(i,f)=>{const x=i%w,y=(i/w)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let xx=x+dx,yy=y+dy;if(wrap){xx=(xx+w)%w;yy=(yy+h)%h}else if(xx<0||yy<0||xx>=w||yy>=h)continue;f(yy*w+xx)}};
 for(let s0=0;s0<n;s0++){if(seen[s0]>=0||lab[s0]<0)continue;const comp=[s0];seen[s0]=id;st.length=0;st.push(s0);const L=lab[s0];
  while(st.length){const i=st.pop();nb(i,j=>{if(seen[j]<0&&lab[j]===L){seen[j]=id;st.push(j);comp.push(j)}})}
  if(comp.length<m){const cnt=new Map();for(const i of comp)nb(i,j=>{if(lab[j]!==L&&lab[j]>=0)cnt.set(lab[j],(cnt.get(lab[j])||0)+1)});let bl=L,bc=0;for(const[k,c]of cnt)if(c>bc){bc=c;bl=k}for(const i of comp)o[i]=bl}
  id++}
 return o}
/* the area map doubled with smooth diagonals (Scale2x), which keeps thin strokes such as lettering intact */
function epx(L,w,h,wrap){const W=w*2,o=new Int16Array(W*h*2);const g=(x,y)=>{if(wrap){x=(x+w)%w;y=(y+h)%h}else{x=clamp(x,0,w-1);y=clamp(y,0,h-1)}return L[y*w+x]};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const P_=g(x,y),A_=g(x,y-1),B_=g(x+1,y),C_=g(x-1,y),D_=g(x,y+1);let e0=P_,e1=P_,e2=P_,e3=P_;
  if(C_==A_&&C_!=D_&&A_!=B_)e0=A_;if(A_==B_&&A_!=C_&&B_!=D_)e1=B_;if(D_==C_&&D_!=B_&&C_!=A_)e2=C_;if(B_==D_&&B_!=A_&&D_!=C_)e3=D_;
  o[(2*y)*W+2*x]=e0;o[(2*y)*W+2*x+1]=e1;o[(2*y+1)*W+2*x]=e2;o[(2*y+1)*W+2*x+1]=e3}return o}
function upEpx(lab,w,h,S,wrap,K){let L=lab,ww=w,hh=h;while(ww<w*S){L=epx(L,ww,hh,wrap);ww*=2;hh*=2}return majority(L,ww,hh,wrap,K)}
/* the area map drawn S times bigger with smooth, rounded edges: each area's mask is softened and the biggest one wins at every new pixel */
function upLabels(lab,w,h,S,wrap,K){const W=w*S,H=h*S,soft=[];const T=lab.length;
 for(let k=-1;k<K;k++){const m=new Float32Array(T);for(let i=0;i<T;i++)m[i]=lab[i]==k?1:0;const b=new Float32Array(T);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,sw=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let xx=x+dx,yy=y+dy;if(wrap){xx=(xx+w)%w;yy=(yy+h)%h}else if(xx<0||yy<0||xx>=w||yy>=h)continue;const kw=(dx?1:2)*(dy?1:2);s+=m[yy*w+xx]*kw;sw+=kw}b[y*w+x]=s/sw}soft.push(b)}
 const out=new Int16Array(W*H);const at=(m,x,y)=>{if(wrap){x=(x%w+w)%w;y=(y%h+h)%h}else{x=clamp(x,0,w-1);y=clamp(y,0,h-1)}return m[y*w+x]};
 for(let Y=0;Y<H;Y++){const v=(Y+.5)/S-.5,y0=Math.floor(v),fy=v-y0;for(let X=0;X<W;X++){const u=(X+.5)/S-.5,x0=Math.floor(u),fx=u-x0;let bk=-1,bv=-1;
  for(let k=0;k<soft.length;k++){const m=soft[k];const s=(at(m,x0,y0)*(1-fx)+at(m,x0+1,y0)*fx)*(1-fy)+(at(m,x0,y0+1)*(1-fx)+at(m,x0+1,y0+1)*fx)*fy;if(s>bv){bv=s;bk=k-1}}out[Y*W+X]=bk}}
 return out}

/* ---- level textures: a hand-painted anime background ---- */
function tex(src,w,h,o){o=o||{};const n=w*h,R=new Float32Array(n),G=new Float32Array(n),B=new Float32Array(n),Al=new Float32Array(n);
 for(let i=0;i<n;i++){const v=src[i];R[i]=(v&255)/255;G[i]=(v>>>8&255)/255;B[i]=(v>>>16&255)/255;Al[i]=(v>>>24)/255}
 /* the broad light and dark of the original, kept as a soft airbrushed shading over the flat colours */
 const lo=new Float32Array(n);{for(let i=0;i<n;i++)lo[i]=lum(R[i],G[i],B[i]);for(let t=0;t<4;t++){const c=new Float32Array(lo);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let d=-2;d<=2;d++)s+=c[y*w+(x+d+w)%w]+c[((y+d+h)%h)*w+x];lo[y*w+x]=s/10}}}
 smooth(R,G,B,Al,w,h,true,2);
 const K=o.k||(w>=128?9:6);let{lab,C}=kmeans(R,G,B,Al,n,K);lab=majority(lab,w,h,true,C.length);lab=despeck(lab,w,h,true,Math.max(4,Math.round(n/700)));
 const S=o.S||(w>=256?1:w>=128?2:4),W=w*S,H=h*S;const L=S>1?upEpx(lab,w,h,S,true,C.length):lab;
 const P=C.map(c=>grade(c[0],c[1],c[2],o)),PL=P.map(c=>lum(c[0],c[1],c[2]));
 let mean=0,cn=0;for(let i=0;i<n;i++)if(Al[i]>=.5){mean+=lo[i];cn++}mean/=cn||1;
 const out=new Uint32Array(W*H),ink=Math.max(1,Math.round(S*.55)),bev=Math.max(1,Math.round(S*.9));
 const at=(X,Y)=>L[((Y%H+H)%H)*W+((X%W+W)%W)];
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const k=L[Y*W+X];if(k<0){out[Y*W+X]=0;continue}let c=P[k].slice();const lk=PL[k];
  /* ink: on the darker side of a border with enough contrast */
  let inkd=0,ic=null;for(let d=1;d<=ink&&!inkd;d++)for(const[dx,dy]of[[d,0],[-d,0],[0,d],[0,-d]]){const q=at(X+dx,Y+dy);if(q!==k&&q>=0){const lq=PL[q];if(lq>lk+.07||(Math.abs(lq-lk)>.07&&lq>=lk&&q>k)){inkd=1;ic=P[k];break}}}
  if(inkd){c=[ic[0]*.32+.02,ic[1]*.3+.02,ic[2]*.34+.05]}
  else{/* painted bevel: a light edge where a darker area is just above, a shadow edge where one is just below */
   let up=0,dn=0;for(let d=1;d<=bev;d++){const a=at(X,Y-d),b=at(X,Y+d),l2=at(X-d,Y);if(a!==k&&a>=0&&PL[a]<lk-.05)up=1;if(l2!==k&&l2>=0&&PL[l2]<lk-.05)up=Math.max(up,.6);if(b!==k&&b>=0&&PL[b]<lk-.05)dn=1}
   if(up){c=c.map(v=>Math.min(1,v*1.16+.06*up))}else if(dn){c=c.map(v=>v*.8)}
   /* airbrush: the original's broad light/dark, very soft */
   const li=lo[(Math.floor(Y/S))*w+Math.floor(X/S)]-mean;const f=1+clamp(li*1.1,-.12,.12);c=c.map(v=>Math.min(1,v*f))}
  out[Y*W+X]=pack(c[0],c[1],c[2],255)}
 return{a:out,w:W,h:H}}

/* ---- sprites: a cel-animated character with a thick ink outline ---- */
function scale2x(src,w,h){const o=new Uint32Array(w*h*4),W=w*2;const g=(x,y)=>x<0||y<0||x>=w||y>=h?src[clamp(y,0,h-1)*w+clamp(x,0,w-1)]:src[y*w+x];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const P_=g(x,y),A_=g(x,y-1),B_=g(x+1,y),C_=g(x-1,y),D_=g(x,y+1);let e0=P_,e1=P_,e2=P_,e3=P_;
  if(C_==A_&&C_!=D_&&A_!=B_)e0=A_;if(A_==B_&&A_!=C_&&B_!=D_)e1=B_;if(D_==C_&&D_!=B_&&C_!=A_)e2=C_;if(B_==D_&&B_!=A_&&D_!=C_)e3=D_;
  o[(2*y)*W+2*x]=e0;o[(2*y)*W+2*x+1]=e1;o[(2*y+1)*W+2*x]=e2;o[(2*y+1)*W+2*x+1]=e3}return o}
function spr(src,w,h){const n=w*h,R=new Float32Array(n),G=new Float32Array(n),B=new Float32Array(n),Al=new Float32Array(n);
 for(let i=0;i<n;i++){const v=src[i];R[i]=(v&255)/255;G[i]=(v>>>8&255)/255;B[i]=(v>>>16&255)/255;Al[i]=(v>>>24)/255}
 /* soft see-through parts (glows, rings, shots) are left as they are, apart from the colour grade */
 let semi=0,solid=0;for(let i=0;i<n;i++){if(Al[i]>.04&&Al[i]<.9)semi++;if(Al[i]>=.9)solid++}
 const S=w>=128?2:4;
 if(solid<12||semi>solid*.6){/* a glow or effect: grade only, drawn 1:1 */const o=new Uint32Array(n);for(let i=0;i<n;i++){if(Al[i]<=.004){o[i]=0;continue}const c=grade(R[i],G[i],B[i],{sat:1.3,lift:.5});o[i]=pack(c[0],c[1],c[2],Math.round(Al[i]*255))}return{a:o,w,h}}
 smooth(R,G,B,Al,w,h,false,1);
 const K=Math.min(14,6+Math.round(Math.sqrt(solid)/6));let{lab,C}=kmeans(R,G,B,Al,n,K);
 /* cel shading inside the character: each flat colour gets a lit and a shadow tone, split by the original's light */
 const q=new Uint32Array(n);const P=C.map(c=>grade(c[0],c[1],c[2],{sat:1.35,lift:.6}));
 for(let i=0;i<n;i++){if(lab[i]<0||Al[i]<.5){q[i]=0;continue}const c=P[lab[i]];q[i]=pack(c[0],c[1],c[2],255)}
 let a=q,aw=w,ah=h;for(let s=S;s>1;s>>=1){a=scale2x(a,aw,ah);aw*=2;ah*=2}
 /* ink: a thick outline around the silhouette (outside it) and thin lines between colours of very different brightness */
 const W=aw+0,H=ah,o=new Uint32Array(a);const ow=Math.max(2,Math.round(S*.75)),il=Math.max(1,Math.round(S*.4));
 const L=c=>((c&255)*.3+(c>>>8&255)*.59+(c>>>16&255)*.11)/255;const solidAt=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&(a[y*W+x]>>>24)>128;
 const inkOf=c=>pack((c&255)/255*.22+.03,(c>>>8&255)/255*.2+.02,(c>>>16&255)/255*.25+.07,255);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,c=a[i];
  if((c>>>24)<=128){/* just outside the silhouette: the outline */let near=0,src_=0;for(let dy=-ow;dy<=ow&&!near;dy++)for(let dx=-ow;dx<=ow;dx++){if(dx*dx+dy*dy>ow*ow+.5)continue;if(solidAt(x+dx,y+dy)){near=1;src_=a[(y+dy)*W+x+dx];break}}if(near)o[i]=inkOf(src_);continue}
  const lc=L(c);for(let d=1;d<=il;d++)for(const[dx,dy]of[[d,0],[0,d]]){if(!solidAt(x+dx,y+dy))continue;const c2=a[(y+dy)*W+x+dx];if(c2===c)continue;const l2=L(c2);if(l2-lc>.2){o[i]=inkOf(c);d=99;break}}}
 return{a:o,w:W,h:H}}

/* ---- hand-painted level textures (256x256, tiling), drawn like anime background art ----
   Each one keeps the layout of the original it replaces (same brick rows, same tile grid), so the levels read the same. */
const PT={};
function rng(sd){return()=>((sd=Math.imul(sd^sd>>>15,1|sd)+0x6D2B79F5|0)>>>0)%1e6/1e6}
const hsla=(h,s,l,a)=>`hsla(${((h%360)+360)%360},${Math.round(clamp(s,0,1)*100)}%,${Math.round(clamp(l,0,1)*1000)/10}%,${a===undefined?1:a})`;
function canvas(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.lineJoin='round';g.lineCap='round';return[c,g]}
function done(c){const a=new Uint32Array(c.getContext('2d').getImageData(0,0,256,256).data.buffer);a.__ap=1;return a}
/* draw f nine times so anything crossing an edge continues on the other side (the texture tiles) */
function tile(g,f){for(const dx of[-256,0,256])for(const dy of[-256,0,256]){g.save();g.translate(dx,dy);f();g.restore()}}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
const ink=(h,s,l)=>hsla(h,s*.7+.1,Math.min(.16,l*.3),1);
/* one painted block: flat colour, a light band along the top, a shadow band along the bottom, a soft airbrush, an ink outline */
function block(g,x,y,w,h,c,o){o=o||{};const[hh,ss,ll]=c,r=o.r===undefined?4:o.r,bv=o.bev||Math.max(4,Math.min(10,h*.14));
 rr(g,x,y,w,h,r);g.fillStyle=hsla(hh,ss,ll);g.fill();
 g.save();rr(g,x,y,w,h,r);g.clip();
 g.fillStyle=hsla(hh-6,ss*.95,Math.min(.95,ll+(o.hi||.11)));g.fillRect(x,y,w,bv);g.fillRect(x,y,bv*.6,h);
 g.fillStyle=hsla(hh+8,ss*1.05,ll-(o.sh||.11));g.fillRect(x,y+h-bv,w,bv);g.fillRect(x+w-bv*.6,y,bv*.6,h);
 if(o.air!==0){const gr=g.createLinearGradient(x,y,x+w*.4,y+h);gr.addColorStop(0,hsla(hh,ss,ll+.05,.35));gr.addColorStop(1,hsla(hh,ss,ll-.06,.35));g.fillStyle=gr;g.fillRect(x+bv*.6,y+bv,w-bv*1.2,h-bv*2)}
 if(o.gl){g.fillStyle=hsla(hh,ss*.5,Math.min(.97,ll+.28),.8);g.beginPath();g.ellipse(x+w*.22,y+bv+3,Math.min(w*.12,14),2.2,0,0,6.3);g.fill()}
 g.restore();
 rr(g,x,y,w,h,r);g.strokeStyle=ink(hh,ss,ll);g.lineWidth=o.lw||3;g.stroke()}
function crack(g,R,x,y,len,c,lw){g.beginPath();g.moveTo(x,y);let a=R()*6.28;for(let i=0;i<4;i++){a+=(R()-.5)*1.4;x+=Math.cos(a)*len/4;y+=Math.sin(a)*len/4;g.lineTo(x,y)}g.strokeStyle=c;g.lineWidth=lw||2;g.stroke()}
/* rows of bricks; mortar shows between them */
function bricks(g,h,s,l,o){o=o||{};const R=rng(o.seed||7),rows=o.rows||4,bw=256/(o.cols||2),rh=256/rows,gap=o.gap||7;
 g.fillStyle=hsla(h+10,s*.6,l*.42);g.fillRect(0,0,256,256);
 tile(g,()=>{for(let r=0;r<rows;r++)for(let c=-1;c<=(o.cols||2);c++){const x=c*bw+(r&1?bw/2:0),v=((c+r+9)%3)*.035;block(g,x+gap/2,r*rh+gap/2,bw-gap,rh-gap,[h+(r*7+c*3)%9-4,s,l+v-.02],{r:5,gl:o.gl})}});
 g.save();tile(g,()=>{const R2=rng(o.seed||7);for(let i=0;i<(o.cracks===undefined?5:o.cracks);i++)crack(g,R2,R2()*256,R2()*256,18+R2()*16,ink(h,s,l),1.8)});g.restore()}
const TH0=(h)=>h;
PT.wall=function(t,h){const[c,g]=canvas();const R=rng(t*97+h|0);
 if(t==0){bricks(g,h,.34,.5,{seed:3})}
 else if(t==1){/* riveted metal plates; the bottom quarter of each is a separate kick plate */
  g.fillStyle=hsla(h+40,.2,.18);g.fillRect(0,0,256,256);
  tile(g,()=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++){const X=x*128,Y=y*128;block(g,X+4,Y+4,120,90,[h+40,.2,.5],{r:3,gl:1});block(g,X+4,Y+98,120,26,[h+40,.22,.58],{r:3});
   for(const[bx,by]of[[24,24],[100,24],[24,76],[100,76]]){g.beginPath();g.arc(X+bx,Y+by,5,0,6.3);g.fillStyle=hsla(h+40,.15,.82);g.fill();g.strokeStyle=ink(h+40,.2,.5);g.lineWidth=2;g.stroke()}}})}
 else if(t==2){/* rough stone blocks, checkered light and dark */
  g.fillStyle=hsla(h-30,.25,.2);g.fillRect(0,0,256,256);
  tile(g,()=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){const d=((x+y)&1)?-.05:0;block(g,x*64+3,y*64+3,58,58,[h-30+R()*8,.3,.46+d+R()*.03],{r:9,bev:6})}});
  tile(g,()=>{const R2=rng(5);for(let i=0;i<6;i++)crack(g,R2,R2()*256,R2()*256,20,ink(h-30,.3,.45),1.8)})}
 else if(t==3){/* cave rock: big flat facets, light from above */
  g.fillStyle=hsla(h,.2,.3);g.fillRect(0,0,256,256);const pts=[];const R2=rng(11);for(let i=0;i<22;i++)pts.push([R2()*256,R2()*256]);
  const id=new Int16Array(256*256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){let b=0,bd=1e9;for(let k=0;k<pts.length;k++){let dx=Math.abs(x-pts[k][0]),dy=Math.abs(y-pts[k][1]);dx=Math.min(dx,256-dx);dy=Math.min(dy,256-dy);const d=dx*dx+dy*dy;if(d<bd){bd=d;b=k}}id[y*256+x]=b}
  const im=g.getImageData(0,0,256,256),u=new Uint32Array(im.data.buffer);const col=pts.map((p,k)=>{const l=.34+((k*37)%5)*.035;return hsl2rgb((((h+(k%3)*6)%360)+360)%360/360,.22,l)});
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=id[y*256+x],kU=id[((y+252)&255)*256+x],kD=id[((y+4)&255)*256+x],kL=id[y*256+((x+254)&255)],kR=id[y*256+((x+2)&255)];let cc=col[k];
   if(k!==id[((y+254)&255)*256+x]||k!==id[y*256+((x+254)&255)])cc=[cc[0]*.28,cc[1]*.28,cc[2]*.32];else if(kU!==k)cc=cc.map(v=>Math.min(1,v*1.25+.04));else if(kD!==k)cc=cc.map(v=>v*.78);u[y*256+x]=pack(cc[0],cc[1],cc[2],255)}
  g.putImageData(im,0,0)}
 else if(t==4){/* bricks with moss growing over them */
  bricks(g,h,.3,.46,{seed:9});const R2=rng(4);
  tile(g,()=>{for(let i=0;i<5;i++){const x=R2()*256,y=R2()*256,r=14+R2()*18;g.beginPath();for(let k=0;k<9;k++){const a=k/9*6.28,rr_=r*(.7+R2()*.5);g.lineTo(x+Math.cos(a)*rr_,y+Math.sin(a)*rr_*.75)}g.closePath();g.fillStyle=hsla(100,.5,.36);g.fill();g.strokeStyle=hsla(110,.5,.13);g.lineWidth=2.5;g.stroke();
   g.beginPath();g.ellipse(x-r*.2,y-r*.25,r*.45,r*.22,0,0,6.3);g.fillStyle=hsla(90,.55,.5);g.fill();
   for(let d=0;d<3;d++){const dx=x+(R2()-.5)*r;g.beginPath();g.moveTo(dx,y);g.lineTo(dx,y+r*.6+R2()*22);g.strokeStyle=hsla(100,.5,.3);g.lineWidth=4;g.stroke()}}})}
 else if(t==5){/* lab: glossy ceramic tiles with a screw in the middle */
  g.fillStyle=hsla(h+200,.12,.32);g.fillRect(0,0,256,256);
  tile(g,()=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){const d=((x+y)&1)?.04:0;block(g,x*64+4,y*64+4,56,56,[h+200,.14,.62+d],{r:4,gl:1,bev:5});g.beginPath();g.arc(x*64+32,y*64+32,3.5,0,6.3);g.fillStyle=hsla(h+200,.1,.85);g.fill();g.strokeStyle=hsla(h+200,.2,.2);g.lineWidth=1.5;g.stroke()}})}
 else if(t==6){/* hazard stripes between two dark rails */
  g.fillStyle=hsla(48,.95,.55);g.fillRect(0,0,256,256);g.save();g.beginPath();g.rect(0,16,256,224);g.clip();
  for(let k=-6;k<8;k++){g.beginPath();g.moveTo(k*96,0);g.lineTo(k*96+48,0);g.lineTo(k*96+48+256,256);g.lineTo(k*96+256,256);g.closePath();g.fillStyle=hsla(230,.25,.13);g.fill()}
  g.fillStyle=hsla(50,1,.75,.55);g.fillRect(0,16,256,10);g.restore();
  for(const y of[0,240]){block(g,-8,y,272,16,[220,.12,.3],{r:0,bev:4})}
  g.strokeStyle=hsla(230,.4,.08);g.lineWidth=3;g.beginPath();g.moveTo(0,16);g.lineTo(256,16);g.moveTo(0,240);g.lineTo(256,240);g.stroke()}
 else if(t==7){/* crypt: pale stone courses with burial niches */
  g.fillStyle=hsla(40,.25,.3);g.fillRect(0,0,256,256);
  tile(g,()=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){block(g,x*64+2,y*64+8,60,54,[40,.28,.7],{r:3,bev:5});const X=x*64+4,Y=y*64+26;rr(g,X,Y,22,20,8);g.fillStyle=hsla(260,.25,.12);g.fill();g.strokeStyle=hsla(30,.3,.1);g.lineWidth=3;g.stroke();
   g.beginPath();g.ellipse(X+11,Y+13,6,4.5,0,0,6.3);g.fillStyle=hsla(45,.3,.82);g.fill();g.fillStyle=hsla(260,.3,.1);g.fillRect(X+7,Y+11,3,3);g.fillRect(X+12,Y+11,3,3)}});
  g.fillStyle=hsla(30,.3,.18);for(let y=0;y<4;y++)g.fillRect(0,y*64,256,8);}
 else if(t==8){/* manor wood panelling: vertical planks with grain */
  g.fillStyle=hsla(25,.45,.15);g.fillRect(0,0,256,256);
  tile(g,()=>{for(let x=0;x<4;x++){block(g,x*64+4,-20,56,296,[25+x*2,.55,.42+((x*7)%3)*.03],{r:2,bev:6,air:1});const R2=rng(x+3);g.strokeStyle=hsla(20,.55,.28);g.lineWidth=1.8;
   for(let k=0;k<3;k++){const X=x*64+14+k*14+R2()*6;g.beginPath();g.moveTo(X,0);g.bezierCurveTo(X+6,80,X-6,170,X+3,256);g.stroke()}
   const ky=R2()*200+20;g.beginPath();g.ellipse(x*64+32,ky,6,10,0,0,6.3);g.fillStyle=hsla(20,.5,.25);g.fill();g.stroke()}})}
 else{/* tech panels with a lit indicator in the corner */
  g.fillStyle=hsla(h+190,.3,.18);g.fillRect(0,0,256,256);
  tile(g,()=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){block(g,x*64+4,y*64+4,56,56,[h+190,.38,.44],{r:3,gl:1});rr(g,x*64+9,y*64+9,15,15,3);g.fillStyle=hsla(h+190,.7,.72);g.fill();g.strokeStyle=ink(h+190,.4,.4);g.lineWidth=2;g.stroke()}})}
 return done(c)};
PT.floor=function(f,h){const[c,g]=canvas();
 if(f==0){/* big flagstones */g.fillStyle=hsla(h+20,.2,.16);g.fillRect(0,0,256,256);tile(g,()=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++){const d=((x+y)&1)?.04:0;block(g,x*128+3,y*128+3,122,122,[h+20,.28,.38+d],{r:6,bev:8})}});tile(g,()=>{const R2=rng(21);for(let i=0;i<4;i++)crack(g,R2,R2()*256,R2()*256,26,ink(h+20,.3,.38),2)})}
 else if(f==1){/* packed earth with pebbles */g.fillStyle=hsla(h+30,.32,.33);g.fillRect(0,0,256,256);const R2=rng(31);
  tile(g,()=>{const R3=rng(32);for(let i=0;i<8;i++){g.beginPath();g.ellipse(R3()*256,R3()*256,30+R3()*30,12+R3()*10,R3()*3,0,6.3);g.fillStyle=hsla(h+30,.3,.29,.8);g.fill()}
   for(let i=0;i<22;i++){const x=R2()*256,y=R2()*256,r=3+R2()*6;g.beginPath();g.ellipse(x,y,r,r*.7,0,0,6.3);g.fillStyle=hsla(h+20,.18,.5);g.fill();g.strokeStyle=hsla(h+30,.4,.12);g.lineWidth=1.8;g.stroke();g.beginPath();g.ellipse(x-r*.3,y-r*.25,r*.35,r*.2,0,0,6.3);g.fillStyle=hsla(h+20,.15,.7);g.fill()}})}
 else if(f==2){/* lab floor: small tiles in a checker */g.fillStyle=hsla(h+200,.1,.2);g.fillRect(0,0,256,256);tile(g,()=>{for(let y=0;y<8;y++)for(let x=0;x<8;x++){const d=((x+y)&1)?.08:0;block(g,x*32+2,y*32+2,28,28,[h+200,.1,.4+d],{r:2,bev:3,lw:2,air:0})}});g.strokeStyle=hsla(h+200,.2,.1);g.lineWidth=3;g.strokeRect(1,1,254,254)}
 else if(f==3){/* manor carpet: deep red with a gold lattice and medallions */g.fillStyle=hsla(350,.62,.33);g.fillRect(0,0,256,256);g.fillStyle=hsla(350,.6,.27);for(let y=0;y<4;y++)for(let x=0;x<4;x++)if((x+y)&1)g.fillRect(x*64,y*64,64,64);
  g.strokeStyle=hsla(42,.75,.55);g.lineWidth=6;for(let k=0;k<4;k++){g.beginPath();g.moveTo(k*64,0);g.lineTo(k*64,256);g.moveTo(0,k*64);g.lineTo(256,k*64);g.stroke()}
  tile(g,()=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){const X=x*64+32,Y=y*64+32;g.beginPath();g.moveTo(X,Y-12);g.lineTo(X+12,Y);g.lineTo(X,Y+12);g.lineTo(X-12,Y);g.closePath();g.fillStyle=hsla(42,.8,.6);g.fill();g.strokeStyle=hsla(350,.6,.12);g.lineWidth=2.5;g.stroke()}})}
 else{/* wooden floorboards */g.fillStyle=hsla(28,.5,.14);g.fillRect(0,0,256,256);tile(g,()=>{for(let y=0;y<8;y++){const off=(y&1)?80:0,R2=rng(y+5);for(let k=-1;k<2;k++)block(g,k*160+off+2,y*32+2,156,28,[28+(y%3)*3,.55,.38+((y*5)%3)*.03],{r:2,bev:4,lw:2.5});g.strokeStyle=hsla(25,.5,.26);g.lineWidth=1.5;g.beginPath();const Y=y*32+14+R2()*6;g.moveTo(0,Y);g.bezierCurveTo(90,Y-4,170,Y+4,256,Y);g.stroke()}})}
 return done(c)};
PT.bridge=function(){const[c,g]=canvas();g.fillStyle=hsla(28,.5,.12);g.fillRect(0,0,256,256);
 tile(g,()=>{for(let y=0;y<4;y++){block(g,10,y*64+4,236,56,[28+y*2,.55,.4],{r:3,bev:6});for(const x of[40,168]){g.beginPath();g.arc(x,y*64+32,4,0,6.3);g.fillStyle=hsla(30,.1,.75);g.fill();g.strokeStyle=hsla(28,.4,.1);g.lineWidth=1.5;g.stroke()}}});
 g.fillStyle=hsla(28,.5,.2);g.fillRect(0,0,10,256);g.fillRect(246,0,10,256);return done(c)};

/* ---- a picture painted at 256 by the game's own drawing code: cel it (flat colours, ink, bevels), no upscaling ---- */
function cel(src){const n=src.length,w=Math.round(Math.sqrt(n));if(w*w!==n)return src;if(w<256)return tex(src,w,w);if(w>256)return src;
 const R=new Float32Array(n),G=new Float32Array(n),B=new Float32Array(n),Al=new Float32Array(n);for(let i=0;i<n;i++){const v=src[i];R[i]=(v&255)/255;G[i]=(v>>>8&255)/255;B[i]=(v>>>16&255)/255;Al[i]=(v>>>24)/255}
 /* centres from a subsample, every pixel then takes its nearest */
 const m=[];for(let i=0;i<n;i+=7)m.push(i);const sR=new Float32Array(m.length),sG=new Float32Array(m.length),sB=new Float32Array(m.length),sA=new Float32Array(m.length);m.forEach((i,k)=>{sR[k]=R[i];sG[k]=G[i];sB[k]=B[i];sA[k]=Al[i]});
 const{C}=kmeans(sR,sG,sB,sA,m.length,12);const lab=new Int16Array(n);
 for(let i=0;i<n;i++){if(Al[i]<.5){lab[i]=-1;continue}let bk=0,bd=1e9;for(let k=0;k<C.length;k++){const dr=R[i]-C[k][0],dg=G[i]-C[k][1],db=B[i]-C[k][2],d=dr*dr*.3+dg*dg*.59+db*db*.11+(.3*dr+.59*dg+.11*db)**2*2;if(d<bd){bd=d;bk=k}}lab[i]=bk}
 const L=despeck(majority(lab,w,w,true,C.length),w,w,true,12);
 const P=C.map(c=>grade(c[0],c[1],c[2],{sat:1.12,lift:.5})),PL=P.map(c=>lum(c[0],c[1],c[2]));const out=new Uint32Array(n);const at=(X,Y)=>L[((Y+w)%w)*w+((X+w)%w)];
 for(let Y=0;Y<w;Y++)for(let X=0;X<w;X++){const k=L[Y*w+X];if(k<0){out[Y*w+X]=0;continue}let c=P[k];const lk=PL[k];let ik=0;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[2,0],[0,2],[-2,0],[0,-2]]){const q=at(X+dx,Y+dy);if(q!==k&&q>=0&&PL[q]>lk+.1){ik=1;break}}
  if(ik)c=[c[0]*.3+.02,c[1]*.28+.02,c[2]*.32+.05];else{const a=at(X,Y-3),b=at(X,Y+3);if(a!==k&&a>=0&&PL[a]<lk-.06)c=c.map(v=>Math.min(1,v*1.13+.04));else if(b!==k&&b>=0&&PL[b]<lk-.06)c=c.map(v=>v*.82)}
  out[Y*w+X]=pack(c[0],c[1],c[2],255)}
 out.__ap=1;return out}
A.paint=PT;A.cel=src=>{if(!A.on)return src;if(src&&src.__ap)return src;let r=texC.get(src);if(r)return r.a;try{const o=cel(src);r={a:o.a||o}}catch(e){console.error('anime cel',e);r={a:src}}texC.set(src,r);return r.a};
/* ---- the public side: cached, so each picture is redrawn once ---- */
/* a sprite drawn by the game's own drawing code: redraw it at 4x, then cel-shade it: a shadow side away from the light, a rim of light
   toward it, and a thick ink outline around the silhouette */
function celChar(a,W,H,o){o=o||{};const n=W*H,out=new Uint32Array(a);const al=i=>(a[i]>>>24);const solid=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&al(y*W+x)>140;
 const sx=Math.round(W*.045),sy=Math.round(H*.055),bx=Math.round(W*.085),by=Math.round(H*.095),hx=Math.round(W*.02),hy=Math.round(H*.025),ga=Math.round(W*.04),gb=Math.round(W*.065),ow=o.ow||Math.max(3,Math.round(W/52));
 let y0=H,y1=0;for(let i=0;i<n;i++)if(al(i)>140){const y=(i/W)|0;if(y<y0)y0=y;if(y>y1)y1=y}const ty=y0+(y1-y0)*.45;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,v=a[i],A_=v>>>24;if(A_<=140)continue;let r=(v&255)/255,g=(v>>>8&255)/255,b=(v>>>16&255)/255;
  [r,g,b]=grade(r,g,b,{sat:1.08,lift:.35});
  /* one hard-edged shadow tone on the side away from the light (upper left), bluish like a cel shadow paint */
  if(!solid(x+bx,y+by)||!solid(x+Math.round(bx*.5),y+by)||!solid(x+sx,y+sy)){r=r*.6+.01;g=g*.58+.01;b=b*.68+.07}
  else if(!solid(x-hx,y-hy)){r=Math.min(1,r*1.2+.08);g=Math.min(1,g*1.2+.08);b=Math.min(1,b*1.18+.1)}/* light rim */
  /* a gloss stroke: a thin band just inside the lit edge, in the top half */
  else if(o.shine!==0&&y<ty&&solid(x-ga,y-ga)&&!solid(x-gb,y-gb)&&solid(x+ga*2,y+ga*2)){r=r*.35+.65;g=g*.35+.65;b=b*.3+.7}
  out[i]=pack(r,g,b,A_)}
 /* the outline: transparent pixels within ow of the silhouette become ink (a dark shade of the colour beside them) */
 const res=new Uint32Array(out);
 /* distance to the silhouette (two-pass chamfer), carrying along which solid pixel is nearest */
 const D=new Float32Array(n).fill(1e9),NI=new Int32Array(n).fill(-1);for(let i=0;i<n;i++)if(al(i)>140){D[i]=0;NI[i]=i}
 const rel=(i,j,c)=>{if(D[j]+c<D[i]){D[i]=D[j]+c;NI[i]=NI[j]}};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(x>0)rel(i,i-1,1);if(y>0){rel(i,i-W,1);if(x>0)rel(i,i-W-1,1.414);if(x<W-1)rel(i,i-W+1,1.414)}}
 for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;if(x<W-1)rel(i,i+1,1);if(y<H-1){rel(i,i+W,1);if(x<W-1)rel(i,i+W+1,1.414);if(x>0)rel(i,i+W-1,1.414)}}
 for(let i=0;i<n;i++){if(D[i]<=0||D[i]>ow+.5)continue;const c=a[NI[i]];const e=D[i]>ow-.5?Math.round(255*(ow+.5-D[i])):255;res[i]=pack((c&255)/255*.18+.03,(c>>>8&255)/255*.16+.02,(c>>>16&255)/255*.22+.07,Math.max(e,150))}
 res.__as=1;return res}
/* only the ink outline (for pictures that already have their own cel shading, like the people and monsters drawn by hmRender) */
function outlineOnly(u,W,ow){const n=W*W,al=i=>u[i]>>>24,res=new Uint32Array(u);const D=new Float32Array(n).fill(1e9),NI=new Int32Array(n).fill(-1);for(let i=0;i<n;i++)if(al(i)>140){D[i]=0;NI[i]=i}
 const rel=(i,j,c)=>{if(D[j]+c<D[i]){D[i]=D[j]+c;NI[i]=NI[j]}};
 for(let y=0;y<W;y++)for(let x=0;x<W;x++){const i=y*W+x;if(x>0)rel(i,i-1,1);if(y>0){rel(i,i-W,1);if(x>0)rel(i,i-W-1,1.414);if(x<W-1)rel(i,i-W+1,1.414)}}
 for(let y=W-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;if(x<W-1)rel(i,i+1,1);if(y<W-1){rel(i,i+W,1);if(x<W-1)rel(i,i+W+1,1.414);if(x>0)rel(i,i+W-1,1.414)}}
 for(let i=0;i<n;i++){if(D[i]<=0||D[i]>ow+.5||al(i)>40)continue;const c=u[NI[i]];const e=D[i]>ow-.5?Math.round(255*(ow+.5-D[i])):255;res[i]=pack((c&255)/255*.18+.03,(c>>>8&255)/255*.16+.02,(c>>>16&255)/255*.22+.07,Math.max(e,150))}
 res.__as=1;return res}

/* ---------- line art for 3D models: every hard edge of a model (where two faces meet at a sharp angle, or a face ends) gets a thin ink
   strip painted just inside each face along that edge, like the drawn outlines on a cel. Smooth curves (a barrel's many sides) get none.
   Worked out once per model and kept. ---------- */
const LA=new WeakMap();
A.lineArt=function(F){if(!F||!F.length||F.length>2400)return F;let r=LA.get(F);if(r)return r;try{r=lineArt0(F)}catch(e){r=F}LA.set(F,r);return r};
function lineArt0(F){let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const f of F)if(f.p)for(const q of f.p)for(let k=0;k<3;k++){if(q[k]<mn[k])mn[k]=q[k];if(q[k]>mx[k])mx[k]=q[k]}
 const D=Math.hypot(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2])||1,w=D*.012,eps=D*.0015,Q=D*1e-4,key=q=>Math.round(q[0]/Q)+','+Math.round(q[1]/Q)+','+Math.round(q[2]/Q);
 const nrm=n=>{const l=Math.hypot(n[0],n[1],n[2])||1;return[n[0]/l,n[1]/l,n[2]/l]},E=new Map(),FN=F.map(f=>f.n?nrm(f.n):[0,1,0]);
 F.forEach((f,i)=>{if(!f.p||f.p.length<3||f.bl)return;const n=f.p.length;for(let j=0;j<n;j++){const a=key(f.p[j]),b=key(f.p[(j+1)%n]),k=a<b?a+'|'+b:b+'|'+a;let L=E.get(k);if(!L)E.set(k,L=[]);L.push(i)}});
 const out=F.slice();const cosT=Math.cos(38*Math.PI/180);
 F.forEach((f,i)=>{if(!f.p||f.p.length<3||f.bl||f.em||(!f.c&&!f.t))return;const n=f.p.length,N=FN[i];let cx=0,cy=0,cz=0;for(const q of f.p){cx+=q[0];cy+=q[1];cz+=q[2]}cx/=n;cy/=n;cz/=n;
  let area=0;for(let j=1;j<n-1;j++){const a=f.p[0],b=f.p[j],c=f.p[j+1],u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];area+=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2}
  if(area<D*D*.0025)return;
  for(let j=0;j<n;j++){const A0=f.p[j],B0=f.p[(j+1)%n],a=key(A0),b=key(B0),k=a<b?a+'|'+b:b+'|'+a,L=E.get(k)||[];let hard=L.length<2;for(const o of L){if(o===i)continue;const M=FN[o];if(N[0]*M[0]+N[1]*M[1]+N[2]*M[2]<cosT)hard=true}if(!hard)continue;
   const e=[B0[0]-A0[0],B0[1]-A0[1],B0[2]-A0[2]],el=Math.hypot(e[0],e[1],e[2]);if(el<D*.05)continue;let d=nrm([N[1]*e[2]-N[2]*e[1],N[2]*e[0]-N[0]*e[2],N[0]*e[1]-N[1]*e[0]]);
   const mxp=[(A0[0]+B0[0])/2,(A0[1]+B0[1])/2,(A0[2]+B0[2])/2];if((cx-mxp[0])*d[0]+(cy-mxp[1])*d[1]+(cz-mxp[2])*d[2]<0)d=[-d[0],-d[1],-d[2]];
   const ww=Math.min(w,Math.hypot(cx-mxp[0],cy-mxp[1],cz-mxp[2])*.4),o=[N[0]*eps,N[1]*eps,N[2]*eps],P=(q,s)=>[q[0]+o[0]+d[0]*s,q[1]+o[1]+d[1]*s,q[2]+o[2]+d[2]*s];
   const c=f.c?[f.c[0]*.22+14,f.c[1]*.2+10,f.c[2]*.26+24]:null;const s={p:[P(A0,0),P(B0,0),P(B0,ww),P(A0,ww)],n:f.n,c:c||[30,24,44],uv:[[0,0],[0,0],[0,0],[0,0]],ink:1};if(f.pt!==undefined)s.pt=f.pt;out.push(s)}});
 if(F.B!==undefined)out.B=F.B;if(F.matHint)out.matHint=F.matHint;out.__tx=out.__tn=out.length;return out}
A.outline=(u,W)=>outlineOnly(u,W,Math.max(2,Math.round(W/48)));
A.char=function(arr){if(!A.on||!arr||arr.__as)return arr;let r=sprC.get(arr);if(r)return r;try{
  /* glows, shots, bubbles and rings stay soft: no outline, no cel shadow */
  let semi=0,sol=0;for(let i=0;i<arr.length;i+=3){const a_=arr[i]>>>24;if(a_>=200)sol++;else if(a_>12)semi++}
  if(semi>sol*.35||sol<20){r=new Uint32Array(arr);r.__as=1;sprC.set(arr,r);return r}
  if(arr.__pf&&A.repaint){const big=A.repaint(arr,4);r=celChar(big,256,256)}
  else{const n=arr.length,w=Math.round(Math.sqrt(n));r=celChar(arr,w,w,{ow:Math.max(1,Math.round(w/40))})}}
 catch(e){console.error('anime char',e);r=arr}sprC.set(arr,r);return r};
A.tex=function(arr,w,h,o){if(!A.on||!arr)return null;let r=texC.get(arr);if(r)return r;try{r=tex(arr,w,h,o)}catch(e){console.error('anime tex',e);r={a:arr,w,h}}texC.set(arr,r);return r};
A.spr=function(arr,w,h){if(!A.on||!arr)return null;let r=sprC.get(arr);if(r)return r;try{r=spr(arr,w,h)}catch(e){console.error('anime spr',e);r={a:arr,w,h}}sprC.set(arr,r);return r};
A._grade=grade;A._tex=tex;A._spr=spr;
return A})();

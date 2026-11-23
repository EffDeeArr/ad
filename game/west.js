/* ===== 0.9.308: the Frontier Town floor =====
   A dusty Old West town on one long main street: the sheriff's office, the saloon, the hotel and the corral on the north side, the general store, the gunsmith,
   the bank, the undertaker and the livery stable on the south side, desert lots and mesas behind. Only people here, no monsters.
   - Saloon: people sit at the tables, the bartender and the piano player are working. Nobody minds you until you fire a gun in there.
   - McCassidy, the cowboy at the bar, takes a challenge: a high noon duel out in the street.
   - The wanted poster on the sheriff's office shows an outlaw who is hiding in one of the hotel rooms.
   - The gunsmith sells the Peacemaker.
   - The bank vault can be cracked: the alarm brings a posse, and the gold slows you down until you carry it out through the exit.
   - A runaway stagecoach tears down the street every so often (a gunshot near it sets it off early), tumbleweeds roll through and catch fire,
     and dust storms blow in.
   Everything for the floor lives here; index.html calls genWest / westTex / westSpawn / westProps / westStep / westList / westHud / westFire / westUse.
   The layout and the people come from the seed (every co-op player gets the same town); the duel and the heist are single player only. */
let WEST=null;
const WESTT={n:'Frontier Town',west:1,w:[],f:1,c:32,cl:.1,fk:.07};
const WNAMES_OUT=['Black Bart Morrow','"Snake-Eye" Pete Varga','Dutch Holloway','Cal "the Rattler" Reyes','Mad Jesse Kincaid','One-Ear Abe Turlow','Wild Hank Delano','Lefty Joe Carrow'];
const WNAMES_TOWN=['Dry Gulch','Coyote Springs','Tumbleweed','Redrock','Dead Horse Flats','Copper Creek','Sundown','Rattlesnake Bend'];
function wHash(x,y,k){let h=(Math.imul(x+1,73856093)^Math.imul(y+1,19349663)^Math.imul(k+1,83492791)^Math.imul(((seed|0)+(fl|0)*131)|0,-1640531535))>>>0;h=Math.imul(h^(h>>>15),-2048144777)>>>0;return((h^(h>>>13))>>>0)%10007/10007}

/* ---------------- the layout ---------------- */
function genWest(){const n=N,at=(x,y)=>y*n+x;
 g=new Uint8Array(n*n).fill(1);ct.fill(0);FH.fill(0);rooms=[];
 CMASK=new Uint8Array(n*n);WHM=new Float32Array(n*n);RFH=new Float32Array(n*n);
 const W=WEST={td:[],tdk:{},b:[],T0:T,town:pk(WNAMES_TOWN),out:{name:pk(WNAMES_OUT),reward:25+5*ri(0,3)},jack:null,coach:null,tw:[],storm:{t:0,next:rr(35,55),on:0,k:0},msg:null,
  duel:null,heist:null,gold:0,inter:null,pac:[],vault:null,saloon:null,hotel:null,smith:null,rooms:{},props:[],seats:[],posts:[]};
 /* texture ids: a wall cell's id picks its texture (TX), the part above the first storey (TU) and the side that faces into a building (TIN) */
 const tid=(d)=>{const k=JSON.stringify(d);if(W.tdk[k])return W.tdk[k];W.td.push(d);return W.tdk[k]=W.td.length};
 const MESA=tid({k:'mesa'}),FENCE=tid({k:'fence'});
 /* the mesas all round, a little ragged */
 /* smooth value noise, stepped into flat terraces so the rock reads as mesas and buttes rather than a row of blocks */
 const vn=(x,y,k)=>{const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),h=(a,b)=>wHash(a,b,k);return(h(x0,y0)*(1-sx)+h(x0+1,y0)*sx)*(1-sy)+(h(x0,y0+1)*(1-sx)+h(x0+1,y0+1)*sx)*sy};
 for(let i=0;i<n*n;i++){const x=i%n,y=(i/n)|0;g[i]=MESA;const v=vn(x/7,y/7,1)*.7+vn(x/3,y/3,4)*.3;WHM[i]=2.6+Math.round(v*5)*.55}
 const open=(x0,y0,x1,y1,c,fh)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(x<0||y<0||x>=n||y>=n)continue;const i=at(x,y);g[i]=0;ct[i]=c;FH[i]=fh||0;CMASK[i]=0;WHM[i]=0;RFH[i]=0}};
 const wall=(x,y,id,h)=>{const i=at(x,y);g[i]=id;WHM[i]=h;CMASK[i]=0;RFH[i]=0;ct[i]=0;FH[i]=0};
 /* the desert inside the mesas */
 for(let y=4;y<=n-5;y++){const a=1+(wHash(0,y,2)*2|0),b=n-2-(wHash(1,y,2)*2|0);open(a,y,b,y,2)}
 for(let x=1;x<n-1;x++){const t=4-(wHash(x,0,3)*2|0),u=n-5+(wHash(x,1,3)*2|0);open(x,t,x,4,2);open(x,n-5,x,u,2)}
 /* the main street (dirt) runs from one end of the map to the other, the boardwalks along both sides */
 const SY0=22,SY1=27;W.SY0=SY0;W.SY1=SY1;open(1,SY0,n-2,SY1,1);
 /* buildings: [name, x0, x1, side (n: north of the street, s: south), siding colour, trim colour, wallpaper, floor, doors (x), back door x] */
 const BD=[
  {k:'sheriff',nm:'SHERIFF',x0:4,x1:11,sd:'n',sc:[184,150,104],tc:[110,62,40],wp:'plaster',fl:7,dr:[8],bk:null},
  {k:'saloon',nm:'SALOON',x0:14,x1:27,sd:'n',sc:[168,66,52],tc:[236,204,120],wp:'damask',fl:4,dr:[20,21],bk:25},
  {k:'hotel',nm:'HOTEL',x0:30,x1:43,sd:'n',sc:[86,122,104],tc:[236,226,196],wp:'stripe',fl:5,dr:[36],bk:null},
  {k:'store',nm:'GENERAL STORE',x0:4,x1:12,sd:'s',sc:[198,170,118],tc:[120,70,44],wp:'plank',fl:8,dr:[8],bk:10},
  {k:'smith',nm:'GUNSMITH',x0:15,x1:22,sd:'s',sc:[96,92,104],tc:[214,170,82],wp:'plank',fl:8,dr:[18],bk:null},
  {k:'bank',nm:'BANK',x0:25,x1:35,sd:'s',sc:[150,84,62],tc:[236,226,206],wp:'plaster',fl:6,dr:[30],bk:null},
  {k:'under',nm:'UNDERTAKER',x0:38,x1:43,sd:'s',sc:[62,58,64],tc:[200,196,190],wp:'plank',fl:8,dr:[40],bk:null},
  {k:'livery',nm:'LIVERY',x0:46,x1:51-2,sd:'s',sc:[150,58,44],tc:[236,226,206],wp:'barn',fl:9,dr:[46+1,46+2],bk:null}];
 for(const b of BD){const N0=b.sd=='n',fy=N0?SY0-2:SY1+2,by=N0?fy-8:fy+8,y0=Math.min(fy,by),y1=Math.max(fy,by),bwy=N0?SY0-1:SY1+1;
  b.fy=fy;b.by=by;b.y0=y0;b.y1=y1;b.ix0=b.x0+1;b.ix1=b.x1-1;b.iy0=y0+1;b.iy1=y1-1;b.bwy=bwy;W.b.push(b);W.rooms[b.k]=b;
  const SIDE=tid({k:'side',sc:b.sc,tc:b.tc,wp:b.wp}),fw=b.x1-b.x0+1;
  /* the boardwalk in front, raised a little */
  open(b.x0,bwy,b.x1,bwy,3,.08);
  for(let x=b.x0;x<=b.x1;x++)for(let y=y0;y<=y1;y++){const fr=y==fy,edge=x==b.x0||x==b.x1||y==y0||y==y1;
   if(!edge){open(x,y,x,y,b.fl);CMASK[at(x,y)]=1;RFH[at(x,y)]=1.85;continue}
   if(fr){const ix=x-b.x0;wall(x,y,tid({k:'front',b:b.k,i:ix,w:fw,sc:b.sc,tc:b.tc,wp:b.wp,nm:b.nm,dr:b.dr.includes(x+1)||b.dr.includes(x-1)?1:0,pst:b.k=='sheriff'&&x==b.dr[0]+2?1:0}),2)}
   else wall(x,y,SIDE,1.85)}
  for(const dx of b.dr){const i=at(dx,fy);open(dx,fy,dx,fy,b.fl);CMASK[i]=1;RFH[i]=2}
  if(b.bk!=null){const i=at(b.bk,by);open(b.bk,by,b.bk,by,b.fl);CMASK[i]=1;RFH[i]=1.85}}
 /* inside walls */
 const IW=(b,x,y)=>{wall(x,y,tid({k:'side',sc:b.sc,tc:b.tc,wp:b.wp}),1.85)};
 /* sheriff: two jail cells along the back (the bars are props) */
 {const b=W.rooms.sheriff;b.jail=[];for(let x=b.ix0;x<=b.ix1;x++)b.jail.push([x,b.iy0+2]);IW(b,b.ix0+3,b.iy0);IW(b,b.ix0+3,b.iy0+1)}
 /* hotel: three rooms at the back off a hall, the lobby at the front */
 {const b=W.rooms.hotel,wy=b.iy0+3;b.rm=[];for(let x=b.ix0;x<=b.ix1;x++)IW(b,x,wy);const xs=[b.ix0+3,b.ix0+7];for(const xw of xs)for(let y=b.iy0;y<wy;y++)IW(b,xw,y);
  const R=[[b.ix0,xs[0]-1],[xs[0]+1,xs[1]-1],[xs[1]+1,b.ix1]];for(const[a,c]of R){const dx=a+((c-a)>>1)+1>c?a:a+((c-a)>>1);const i=at(dx,wy);open(dx,wy,dx,wy,b.fl);CMASK[i]=1;RFH[i]=1.85;b.rm.push({x0:a,x1:c,y0:b.iy0,y1:wy-1,door:[dx,wy]})}
  W.hotel=b}
 /* bank: the vault at the back behind a steel wall with the vault door in the middle */
 {const b=W.rooms.bank,wy=b.iy1-3,VW=tid({k:'vault'});for(let x=b.ix0;x<=b.ix1;x++)wall(x,wy,VW,1.85);const vx=b.ix0+((b.ix1-b.ix0)>>1),i=at(vx,wy);open(vx,wy,vx,wy,6);CMASK[i]=1;RFH[i]=1.85;
  for(let y=wy+1;y<=b.iy1;y++)for(let x=b.ix0;x<=b.ix1;x++)ct[at(x,y)]=10;W.vault={x:vx,y:wy,b,inY0:wy+1,inY1:b.iy1}}
 /* the gunsmith: the counter runs across the shop */
 W.smith=W.rooms.smith;W.saloon=W.rooms.saloon;
 /* fences round the corral (north-east) and the back lots */
 for(let x=45;x<=n-4;x++){wall(x,SY0-9,FENCE,.62)}for(let y=SY0-9;y<=SY0-3;y++){if(y==SY0-6)continue;wall(n-3,y,FENCE,.62)}
 for(let x=2;x<=12;x++)if(x!=6&&x!=7)wall(x,SY1+12,FENCE,.62);
 /* the alleys between the buildings stay dirt; the desert behind them is sand */
 for(let i=0;i<n*n;i++){if(g[i]||ct[i]!=2)continue;const x=i%n,y=(i/n)|0;if(y>=SY0-1&&y<=SY1+1)ct[i]=1;else if(wHash(x,y,9)<.08)ct[i]=11}
 /* rooms for the game's general use: the start (west end of the street), the street in pieces, the buildings, the exit (east end) */
 const rc=(x,y,w,h,o)=>Object.assign({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1),gap:0,ch:0,fc:[]},o||{});
 rooms.push(rc(0,SY0,4,SY1-SY0+1));for(let x=5;x<n-6;x+=8)rooms.push(rc(x,SY0,7,SY1-SY0+1,{street:1}));
 for(const b of W.b)rooms.push(rc(b.ix0,b.iy0,b.ix1-b.ix0+1,b.iy1-b.iy0+1,{bk:b.k}));
 rooms.push(rc(n-5,SY0,4,SY1-SY0+1));
 W.start={x:1.6,y:(SY0+SY1)/2+.5,a:0};W.exit={x:n-2.4,y:SY0+.9};
 /* the map */
 mg.fillStyle='#14121c';mg.fillRect(0,0,n,n);for(let i=0;i<n*n;i++){if(g[i]){if(g[i]==FENCE){mg.fillStyle='#6a4a2c';mg.fillRect(i%n,i/n|0,1,1)}continue}
  const c=ct[i];mg.fillStyle=CMASK[i]?'#7a5a3a':c==1?'#b89a6a':c==3?'#8a6440':'#d2b47c';mg.fillRect(i%n,i/n|0,1,1)}}

/* ---------------- the textures (drawn on 64x64 canvases; with the anime look on they are painted and inked like every other surface) ---------------- */
let TIN=null,WTXC=null;
function wRng(s){let x=(s|0)||7;return()=>(x=(Math.imul(x,16807)+11)%2147483647,(x&0x7fffffff)/2147483647)}
const wcss=(c,a)=>a==null?`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`:`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`,wdk=(c,k)=>c.map(v=>v*k),wlt=(c,k)=>c.map(v=>v+(255-v)*k);
/* horizontal clapboards */
function wPlanks(g,y0,y1,c,sd,o){o=o||{};const rn=wRng(sd||3),bh=o.bh||8;for(let y=y0;y<y1;y+=bh){const k=.9+rn()*.18,cc=wdk(c,k);g.fillStyle=wcss(cc);g.fillRect(0,y,64,Math.min(bh,y1-y));
 g.fillStyle=wcss(wdk(c,.55));g.fillRect(0,Math.min(y1,y+bh)-1.2,64,1.2);g.fillStyle=wcss(wlt(cc,.22),.55);g.fillRect(0,y,64,.8);
 if(!o.clean)for(let i=0;i<3;i++){g.fillStyle=wcss(wdk(cc,.8),.5);g.fillRect(rn()*56,y+2+rn()*(bh-4),4+rn()*8,.6)}
 if(o.nails){g.fillStyle='#3a2c22';g.fillRect(2,y+bh/2-.6,1.2,1.2);g.fillRect(61,y+bh/2-.6,1.2,1.2)}}}
/* vertical boards */
function wBoards(g,x0,x1,y0,y1,c,sd,bw){const rn=wRng(sd||5);bw=bw||8;for(let x=x0;x<x1;x+=bw){const cc=wdk(c,.88+rn()*.2);g.fillStyle=wcss(cc);g.fillRect(x,y0,Math.min(bw,x1-x),y1-y0);g.fillStyle=wcss(wdk(c,.5));g.fillRect(Math.min(x1,x+bw)-1,y0,1,y1-y0);
 for(let i=0;i<2;i++){g.fillStyle=wcss(wdk(cc,.78),.5);g.fillRect(x+1+rn()*(bw-3),y0+rn()*(y1-y0-8),.6,4+rn()*8)}}}
/* a sash window: frame in the trim colour, dark glass with the sky in it, the glazing bars, a sill */
function wWin(g,x,y,w,h,tc,o){o=o||{};g.fillStyle=wcss(tc);g.fillRect(x-2,y-2,w+4,h+4);const q=g.createLinearGradient(x,y,x+w,y+h);q.addColorStop(0,'#3a4a6a');q.addColorStop(.55,'#1c2236');q.addColorStop(1,'#2a2030');g.fillStyle=q;g.fillRect(x,y,w,h);
 if(o.lit){g.fillStyle='rgba(255,196,110,.55)';g.fillRect(x+1,y+h*.45,w-2,h*.55-1)}
 if(o.curt){g.fillStyle=wcss(o.curt);g.beginPath();g.moveTo(x,y);g.lineTo(x+w*.42,y);g.quadraticCurveTo(x+w*.18,y+h*.4,x,y+h*.55);g.closePath();g.fill();g.beginPath();g.moveTo(x+w,y);g.lineTo(x+w*.58,y);g.quadraticCurveTo(x+w*.82,y+h*.4,x+w,y+h*.55);g.closePath();g.fill()}
 g.fillStyle='rgba(220,236,255,.28)';g.beginPath();g.moveTo(x+w*.15,y+h);g.lineTo(x+w*.55,y);g.lineTo(x+w*.72,y);g.lineTo(x+w*.32,y+h);g.closePath();g.fill();
 g.fillStyle=wcss(tc);g.fillRect(x+w/2-1,y,2,h);g.fillRect(x,y+h/2-1,w,2);if(o.six){g.fillRect(x+w/3-1,y,2,h);g.fillRect(x+w*2/3-1,y,2,h)}
 g.fillStyle=wcss(wdk(tc,.75));g.fillRect(x-4,y+h+2,w+8,3)}
function wSiding(g,b,sd,up){wPlanks(g,0,64,b.sc,sd,{nails:1});/* corner boards */g.fillStyle=wcss(wdk(b.sc,.7));g.fillRect(0,0,3,64);g.fillRect(61,0,3,64)}
function wWallpaper(g,wp,sd){const rn=wRng(sd||9);
 if(wp=='damask'){g.fillStyle='#6e1a26';g.fillRect(0,0,64,64);g.fillStyle='#8a2432';for(let y=-8;y<64;y+=16)for(let x=-8;x<72;x+=16){const ox=((y/16)&1)?8:0;g.beginPath();g.moveTo(x+ox,y);g.lineTo(x+ox+5,y+8);g.lineTo(x+ox,y+16);g.lineTo(x+ox-5,y+8);g.closePath();g.fill()}
  g.fillStyle='#d4a446';for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){const ox=((y/16)&1)?8:0;g.beginPath();g.arc(x+ox+4,y+8,1.3,0,7);g.fill()}
  g.fillStyle='#3a2418';g.fillRect(0,44,64,20);g.fillStyle='#4e3020';for(let x=2;x<64;x+=16)g.fillRect(x,47,12,14);g.fillStyle='#c89a46';g.fillRect(0,42,64,2.4)}
 else if(wp=='stripe'){g.fillStyle='#4e7a62';g.fillRect(0,0,64,64);for(let x=0;x<64;x+=8){g.fillStyle=(x/8)&1?'#5e8c70':'#466e58';g.fillRect(x,0,4,64)}g.fillStyle='#d8caa0';for(let x=2;x<64;x+=8)g.fillRect(x,0,.8,44);
  g.fillStyle='#5a3a24';g.fillRect(0,44,64,20);g.fillStyle='#6a4630';for(let x=2;x<64;x+=16)g.fillRect(x,47,12,14);g.fillStyle='#e8dcb0';g.fillRect(0,42,64,2.4)}
 else if(wp=='plaster'){g.fillStyle='#d8c8a4';g.fillRect(0,0,64,64);for(let i=0;i<40;i++){g.fillStyle=rn()<.5?'rgba(160,130,90,.16)':'rgba(255,250,230,.2)';g.fillRect(rn()*64,rn()*44,4+rn()*8,2+rn()*4)}
  g.strokeStyle='rgba(120,90,60,.5)';g.lineWidth=.6;g.beginPath();g.moveTo(10,6);g.lineTo(16,14);g.lineTo(14,22);g.stroke();g.fillStyle='#6a4a30';g.fillRect(0,46,64,18);g.fillStyle='#7c583a';for(let x=2;x<64;x+=16)g.fillRect(x,49,12,12);g.fillStyle='#4a3020';g.fillRect(0,44,64,2.2)}
 else if(wp=='barn'){wBoards(g,0,64,0,64,[150,58,44],sd,10);g.fillStyle='rgba(30,20,14,.25)';g.fillRect(0,50,64,14)}
 else if(wp=='stone'){g.fillStyle='#6a6660';g.fillRect(0,0,64,64);for(let r=0;r<4;r++)for(let c=-1;c<3;c++){const x=c*24+(r&1?12:0);g.fillStyle=`rgb(${118+rn()*24|0},${112+rn()*20|0},${104+rn()*18|0})`;g.fillRect(x+1,r*16+1,22,14)}}
 else{wPlanks(g,0,64,[170,128,86],sd,{bh:8});g.fillStyle='#5a3c26';g.fillRect(0,46,64,2)}}
function wSignBoard(g,W,b){/* the painted sign across the false front: a board with a border, the name in big letters, a little picture for some */
 const sw=W-16,sx=8,sy=12,sh=34,bg=b.k=='saloon'?[38,28,26]:b.k=='bank'?[28,52,40]:b.k=='under'?[20,20,24]:b.k=='hotel'?[236,226,196]:b.k=='sheriff'?[236,220,170]:[236,224,190],fg=b.k=='saloon'?[244,206,110]:b.k=='bank'?[236,196,90]:b.k=='under'?[220,220,220]:b.k=='hotel'?[70,40,34]:[60,34,26];
 g.fillStyle=wcss(wdk(bg,.6));g.fillRect(sx-2,sy-2,sw+4,sh+4);g.fillStyle=wcss(bg);g.fillRect(sx,sy,sw,sh);g.strokeStyle=wcss(fg);g.lineWidth=1.2;g.strokeRect(sx+3,sy+3,sw-6,sh-6);
 let txt=b.nm,ic=0;if(b.k=='sheriff')ic=1;if(b.k=='smith')ic=2;if(b.k=='under')ic=3;if(b.k=='livery')txt='LIVERY & FEED';
 const icw=ic?30:0;g.textAlign='center';g.textBaseline='middle';let fs=24;const fnt=s=>`bold ${s}px Georgia, "Times New Roman", serif`;g.font=fnt(fs);while(g.measureText(txt).width>sw-16-icw&&fs>8){fs--;g.font=fnt(fs)}
 const tx=sx+sw/2+icw/2,ty=sy+sh/2+1;g.fillStyle=wcss(wdk(bg,.55));g.fillText(txt,tx+1.2,ty+1.2);g.fillStyle=wcss(fg);g.fillText(txt,tx,ty);
 const ix=sx+18,iy=sy+sh/2;
 if(ic==1){g.fillStyle='#d8b040';g.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k&1?5:12;g.lineTo(ix+Math.cos(a)*r,iy+Math.sin(a)*r)}g.closePath();g.fill();g.fillStyle='#8a6a20';g.beginPath();g.arc(ix,iy,3,0,7);g.fill()}
 if(ic==2){g.save();g.translate(ix,iy);for(const s of[-1,1]){g.save();g.rotate(s*.6);g.fillStyle='#3a3a44';g.fillRect(-12,-2,18,4);g.fillStyle='#6a4a2a';g.fillRect(4,-1,6,9);g.restore()}g.restore()}
 if(ic==3){g.fillStyle='#5a3a28';g.beginPath();g.moveTo(ix-4,iy-12);g.lineTo(ix+4,iy-12);g.lineTo(ix+7,iy-5);g.lineTo(ix+4,iy+12);g.lineTo(ix-4,iy+12);g.lineTo(ix-7,iy-5);g.closePath();g.fill();g.fillStyle='#c8c0b0';g.fillRect(ix-.8,iy-8,1.6,9);g.fillRect(ix-3.5,iy-5,7,1.6)}
 if(b.k=='saloon'){g.fillStyle=wcss(fg);for(const x of[sx+10,sx+sw-10]){g.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k&1?2:4.6;g.lineTo(x+Math.cos(a)*r,iy+Math.sin(a)*r)}g.closePath();g.fill()}}}
function wPoster(g,o){/* the wanted poster: the outlaw's face from his own model, his name and the reward */
 g.save();g.translate(32,30);g.rotate(-.04);g.fillStyle='#e8d6a8';g.fillRect(-15,-24,30,44);g.fillStyle='rgba(120,90,50,.25)';g.fillRect(-15,14,30,6);g.fillRect(-15,-24,4,44);
 g.fillStyle='#2a1a12';g.textAlign='center';g.textBaseline='middle';g.font='bold 8px Georgia, serif';g.fillText('WANTED',0,-19);
 g.fillStyle='#bca478';g.fillRect(-10,-14,20,17);if(o.face)try{g.drawImage(o.face,-10,-14,20,17)}catch(e){}g.strokeStyle='#2a1a12';g.lineWidth=.6;g.strokeRect(-10,-14,20,17);
 g.font='bold 3.6px Georgia, serif';g.fillText('DEAD OR ALIVE',0,6.5);g.font='bold 3px Georgia, serif';g.fillText((o.name||'').toUpperCase().replace(/"/g,''),0,11.5);g.font='bold 5px Georgia, serif';g.fillText('$'+(o.reward||25)+' REWARD',0,17);
 g.fillStyle='#6a5a44';g.fillRect(-1,-24,2,2);g.restore()}
function wFront(d,up,face){/* one cell of a building's street front: the first storey (windows, lamps, the poster) or the false front above it (the sign) */
 const b=WEST.rooms[d.b],sd=d.i*17+d.b.length*3;
 if(!up)return mkT(g=>{wSiding(g,b,sd);if(d.pst){wPoster(g,{face,name:WEST.out.name,reward:WEST.out.reward});return}
  if(d.dr){/* beside the door: a lantern on a bracket */g.fillStyle='#2a2420';g.fillRect(28,12,8,2);g.fillRect(31,12,2,6);g.fillStyle='#3a3430';g.fillRect(28,18,8,12);g.fillStyle='#ffcc66';g.fillRect(29.5,19.5,5,9);g.fillStyle='#3a3430';g.fillRect(27,17,10,2);g.fillRect(27,29,10,2);return}
  const wide=d.b=='store'||d.b=='smith'||d.b=='bank'||d.b=='livery';if(d.i==0||d.i==d.w-1)return;
  if(d.b=='livery'){g.fillStyle='#e8e0cc';g.fillRect(4,10,56,3);g.fillRect(4,10,3,46);g.fillRect(57,10,3,46);g.beginPath();g.moveTo(7,13);g.lineTo(57,53);g.lineTo(57,56);g.lineTo(7,16);g.fill();return}
  if(wide)wWin(g,8,10,48,34,b.tc,{six:1,lit:d.b!='bank'&&(d.i%2==0)});else wWin(g,16,10,32,30,b.tc,{curt:d.b=='saloon'?[150,30,40]:d.b=='hotel'?[230,220,190]:null,lit:d.b=='saloon'})});
 return mkT(g=>{wPlanks(g,0,64,b.sc,sd+5,{nails:1});/* the cornice along the top of the false front */g.fillStyle=wcss(b.tc);g.fillRect(0,0,64,7);g.fillStyle=wcss(wdk(b.tc,.6));for(let x=2;x<64;x+=6)g.fillRect(x,7,3,3);g.fillRect(0,10,64,1.2);
  const s0=Math.max(1,Math.floor((d.w-Math.min(d.w-2,7))/2)),s1=d.w-1-s0;
  if(d.i>=s0&&d.i<=s1){g.save();g.translate(-(d.i-s0)*64,0);wSignBoard(g,(s1-s0+1)*64,b);g.restore()}
  else if(d.i>0&&d.i<d.w-1&&d.b!='livery')wWin(g,22,22,20,24,b.tc,{});
  g.fillStyle=wcss(wdk(b.sc,.7));if(d.i==0)g.fillRect(0,0,3,64);if(d.i==d.w-1)g.fillRect(61,0,3,64)})}
function wFloorTex(){const rn=wRng(77),F={};
 const dirt=(g,c,sd,o)=>{o=o||{};const r=wRng(sd);g.fillStyle=wcss(c);g.fillRect(0,0,64,64);for(let i=0;i<22;i++){g.fillStyle=wcss(wdk(c,.86+r()*.22),.6);g.beginPath();g.ellipse(r()*64,r()*64,4+r()*9,2+r()*5,r()*3,0,7);g.fill()}
  for(let i=0;i<o.peb||0;i++){g.fillStyle=r()<.5?'#8a7a64':'#bca888';g.beginPath();g.ellipse(r()*64,r()*64,.8+r()*1.2,.6+r(),r()*3,0,7);g.fill()}};
 F.road=mkT(g=>{dirt(g,[196,164,112],11,{peb:14});g.fillStyle='rgba(120,92,60,.34)';g.fillRect(0,14,64,5);g.fillRect(0,44,64,5);g.fillStyle='rgba(240,220,180,.22)';g.fillRect(0,12,64,1.5);g.fillRect(0,42,64,1.5);
  g.strokeStyle='rgba(90,66,40,.5)';g.lineWidth=.9;for(const[x,y]of[[10,30],[24,34],[40,28],[54,33]]){g.beginPath();g.arc(x,y,2.2,.2,Math.PI-.2);g.stroke()}});
 F.sand=mkT(g=>{dirt(g,[222,192,138],23,{peb:6});g.strokeStyle='rgba(170,130,80,.35)';g.lineWidth=.8;for(let y=6;y<64;y+=12){g.beginPath();g.moveTo(0,y);for(let x=0;x<=64;x+=8)g.quadraticCurveTo(x+4,y+((x/8)&1?2:-2),x+8,y);g.stroke()}});
 F.sand2=mkT(g=>{dirt(g,[218,188,134],29,{peb:10});g.fillStyle='#8a8a4a';for(let k=0;k<7;k++){g.save();g.translate(40,40);g.rotate(-1.2+k*.4);g.fillRect(0,-.5,9,1.2);g.restore()}g.fillStyle='#ece4d0';g.beginPath();g.ellipse(16,18,4,3,0,0,7);g.fill();g.fillStyle='#2a2420';g.fillRect(14,17,1.2,1.2);g.fillRect(17,17,1.2,1.2)});
 F.boards=mkT(g=>{wBoards(g,0,64,0,64,[150,108,70],31,8);g.fillStyle='#3a2a1c';for(let x=4;x<64;x+=8){g.fillRect(x-.6,3,1.2,1.2);g.fillRect(x-.6,59,1.2,1.2)}});
 F.saloon=mkT(g=>{wPlanks(g,0,64,[112,66,40],41,{bh:8,clean:1});g.fillStyle='rgba(230,200,140,.3)';const r=wRng(5);for(let i=0;i<20;i++)g.fillRect(r()*64,r()*64,1.2,.8)});
 F.hotel=mkT(g=>{g.fillStyle='#7a2430';g.fillRect(0,0,64,64);g.fillStyle='#9a3440';g.fillRect(4,4,56,56);g.fillStyle='#d4a446';g.fillRect(6,6,52,1.5);g.fillRect(6,56.5,52,1.5);g.fillRect(6,6,1.5,52);g.fillRect(56.5,6,1.5,52);
  g.fillStyle='#5a1a24';g.beginPath();g.moveTo(32,14);g.lineTo(50,32);g.lineTo(32,50);g.lineTo(14,32);g.closePath();g.fill();g.fillStyle='#d4a446';g.beginPath();g.moveTo(32,24);g.lineTo(40,32);g.lineTo(32,40);g.lineTo(24,32);g.closePath();g.fill()});
 F.bank=mkT(g=>{for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.fillStyle=(x+y)&1?'#2a2a30':'#e8e2d6';g.fillRect(x*32,y*32,32,32)}g.strokeStyle='rgba(150,140,130,.4)';g.lineWidth=.6;g.beginPath();g.moveTo(4,6);g.lineTo(20,18);g.lineTo(26,14);g.stroke()});
 F.jail=mkT(g=>{g.fillStyle='#5e5a54';g.fillRect(0,0,64,64);const r=wRng(8);for(let k=0;k<6;k++){const x=r()*44,y=r()*44;g.fillStyle=`rgb(${120+r()*30|0},${114+r()*26|0},${104+r()*20|0})`;g.beginPath();g.moveTo(x,y);g.lineTo(x+18+r()*6,y+2);g.lineTo(x+20,y+18);g.lineTo(x+2,y+16);g.closePath();g.fill()}});
 F.store=mkT(g=>{wPlanks(g,0,64,[176,140,96],51,{bh:8,clean:1})});
 F.barn=mkT(g=>{dirt(g,[150,120,84],61,{peb:4});g.strokeStyle='#d8c060';g.lineWidth=.8;const r=wRng(3);for(let i=0;i<30;i++){const x=r()*64,y=r()*64,a=r()*3;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*6,y+Math.sin(a)*6);g.stroke()}});
 F.vault=mkT(g=>{g.fillStyle='#5a5e68';g.fillRect(0,0,64,64);g.fillStyle='#7a808c';for(let y=0;y<64;y+=8)for(let x=((y/8)&1)*4;x<64;x+=8){g.beginPath();g.moveTo(x,y+3);g.lineTo(x+4,y+1);g.lineTo(x+5,y+2);g.lineTo(x+1,y+4);g.closePath();g.fill()}});
 return F}
function westTex(h){const W=WEST;if(!W)return;const k='w'+TSZ+(window.ANIME&&ANIME.on?'a':'');if(!WTXC||WTXC.k!==k)WTXC={k,F:wFloorTex(),m:{}};const C=WTXC,F=C.F,M=C.m;
 const memo=(key,f)=>M[key]||(M[key]=f());
 const mesa=memo('mesa',()=>mkT(g=>{const r=wRng(19),band=[[196,104,70],[214,132,84],[176,86,60],[226,152,98],[188,96,66],[204,120,78]];let y=0,k=0;while(y<64){const h2=6+r()*9;g.fillStyle=wcss(band[k++%band.length]);g.fillRect(0,y,64,h2+1);y+=h2}
  for(let i=0;i<5;i++){const x=r()*64;g.strokeStyle='rgba(80,36,24,.55)';g.lineWidth=.9;g.beginPath();g.moveTo(x,0);g.lineTo(x+r()*6-3,20);g.lineTo(x+r()*8-4,44);g.lineTo(x+r()*6-3,64);g.stroke()}
  g.fillStyle='rgba(255,220,170,.18)';for(let i=0;i<12;i++)g.fillRect(r()*64,r()*64,6+r()*10,1.2)}));
 const fence=memo('fence',()=>mkT(g=>{g.fillStyle='#d8c08a';g.fillRect(0,0,64,64);wBoards(g,0,64,0,64,[132,112,92],13,10);g.fillStyle='#5a4a3a';g.fillRect(0,10,64,4);g.fillRect(0,46,64,4)}));
 const vaultW=memo('vaultw',()=>mkT(g=>{g.fillStyle='#585c66';g.fillRect(0,0,64,64);g.fillStyle='#6c707c';g.fillRect(2,2,28,60);g.fillRect(34,2,28,60);g.fillStyle='#3c3e46';for(const x of[5,27,37,59])for(let y=6;y<62;y+=10)g.fillRect(x-1,y-1,2,2)}));
 const TXa=[],TUa=[],TINa=[];let face=null;try{if(W.outlaw&&W.outlaw.fr){face=wFace(W.outlaw)}}catch(e){face=null}
 for(const d of W.td){let lo,up,inn;
  if(d.k=='mesa'){lo=up=inn=mesa}
  else if(d.k=='fence'){lo=up=inn=fence}
  else if(d.k=='vault'){lo=up=inn=vaultW}
  else if(d.k=='side'){const kk='side'+d.sc+d.wp;lo=up=memo(kk,()=>mkT(g=>wSiding(g,{sc:d.sc},d.sc[0])));inn=memo('wp'+d.wp,()=>mkT(g=>wWallpaper(g,d.wp,d.sc[1])))}
  else if(d.k=='front'){const kl='fl'+d.b+(d.pst?'p':d.dr?'d':(d.i==0||d.i==d.w-1)?'e':'w');lo=d.pst?wFront(d,0,face):memo(kl,()=>wFront(d,0,null));up=wFront(d,1);inn=memo('wp'+d.wp,()=>mkT(g=>wWallpaper(g,d.wp,d.sc[1])))}
  TXa.push(lo);TUa.push(up);TINa.push(inn)}
 TX=TXa;TU=TUa;TIN=TINa;RT=memo('riser',()=>mkT(g=>wPlanks(g,0,64,[150,108,70],7,{clean:1})));
 CT=[null,F.road,F.sand,F.boards,F.saloon,F.hotel,F.bank,F.jail,F.store,F.barn,F.vault,F.sand2];FT=F.sand;
 const roof=memo('roof',()=>mkT(g=>{g.fillStyle='#5a4a42';g.fillRect(0,0,64,64);for(let y=0;y<64;y+=8)for(let x=((y/8)&1)*5;x<64;x+=10){g.fillStyle=`rgb(${88+(x*7+y)%20},${70+(x*3+y)%16},${58+(x+y)%14})`;g.fillRect(x,y,9,7.4)}}));
 const ceil=memo('ceil',()=>mkT(g=>{wBoards(g,0,64,0,64,[128,92,60],23,8);g.fillStyle='#4a3424';g.fillRect(0,26,64,10);g.fillStyle='#5e4430';g.fillRect(0,27,64,3)}));
 CEIL=[ceil,ceil];RAILV={vault:ceil,rock:roof,portal:memo('portal',()=>mkT(g=>wPlanks(g,0,64,[150,120,90],15,{nails:1})))}}
/* the outlaw's face for the poster: the head of his own drawn figure, from the front */
function wFace(e){const sp=e.fr.spec,img=hmRender(sp,0,0);const S=Math.round(Math.sqrt(img.length));const c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const id=x.createImageData(S,S);new Uint32Array(id.data.buffer).set(img);x.putImageData(id,0,0);
 const o=document.createElement('canvas');o.width=40;o.height=34;const q=o.getContext('2d');q.fillStyle='#bca478';q.fillRect(0,0,40,34);q.imageSmoothingEnabled=true;const hs=S*.3;q.drawImage(c,S/2-hs/2,0,hs,hs*.85,0,0,40,34);
 const d=q.getImageData(0,0,40,34),a=d.data;for(let i=0;i<a.length;i+=4){const l=(a[i]*.3+a[i+1]*.59+a[i+2]*.11);a[i]=Math.min(255,l*.9+40);a[i+1]=Math.min(255,l*.78+30);a[i+2]=Math.min(255,l*.55+18)}q.putImageData(d,0,0);return o}

/* ---------------- the props (numbered from 3000, drawn by drawProp; collision from their exact pieces like every other prop) ---------------- */
let WESTM=null;
function westMeshes(){if(WESTM)return WESTM;const M=[],B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a);
 const WD=[112,70,42],WD2=[84,52,32],WD3=[150,104,66],WDL=[190,146,98],BR=[206,160,70],IR=[54,54,62],GR=[62,128,74],GR2=[48,100,58],CL=[226,214,186];
 const f=()=>[];
 /* 0 round saloon table, cards and a bottle on it */
 {const m=f();m.push(...C(0,0,0,.05,.26,WD2,{ax:'y',n:8}),...C(0,0,0,.2,.03,WD2,{ax:'y',n:10}),...C(0,.26,0,.32,.035,WD,{ax:'y',n:14}),...C(0,.295,0,.3,.004,[40,92,62],{ax:'y',n:14}));
  m.push(...C(.1,.3,-.06,.025,.13,[46,110,64],{ax:'y',n:6}),...C(.1,.43,-.06,.01,.04,[46,110,64],{ax:'y',n:5}),...B(-.08,.302,.05,.07,.004,.1,[240,236,226],{ry:.4}),...B(-.02,.303,.1,.07,.004,.1,[240,236,226],{ry:-.3}),...C(-.12,.3,-.08,.03,.01,[200,40,40],{ax:'y',n:8}),...C(-.12,.31,-.08,.03,.01,[40,60,180],{ax:'y',n:8}));M.push(m)}
 /* 1 chair (its back toward -z) */
 {const m=f();m.push(...B(0,.19,0,.26,.03,.26,WD));for(const sx of[-1,1])for(const sz of[-1,1])m.push(...B(sx*.11,.09,sz*.11,.03,.18,.03,WD2));for(const sx of[-1,1])m.push(...B(sx*.11,.36,-.115,.03,.34,.03,WD2));m.push(...B(0,.46,-.115,.24,.06,.025,WD),...B(0,.34,-.115,.24,.04,.02,WD));M.push(m)}
 /* 2 bar counter, one cell long (the customers' side is +z) */
 {const m=f();m.push(...B(0,.22,0,1.0,.44,.4,WD2),...B(0,.455,.01,1.02,.035,.5,WD3));for(const x of[-.3,0,.3])m.push(...B(x,.22,.201,.24,.3,.01,WD));m.push(...C(-.5,.07,.26,.018,1.0,BR,{ax:'x',n:6}),...C(-.5,.0,.26,.012,.07,BR,{ax:'y',n:5}),...C(.5,.0,.26,.012,.07,BR,{ax:'y',n:5}));
  m.push(...C(.25,.47,0,.03,.12,[120,60,30],{ax:'y',n:6}),...C(-.2,.47,.05,.022,.06,[220,230,240],{ax:'y',n:6}));M.push(m)}
 /* 3 upright piano (the keys toward +z) */
 {const m=f();m.push(...B(0,.32,0,.86,.64,.3,[58,34,26]),...B(0,.35,.2,.84,.04,.16,[58,34,26]),...B(0,.375,.2,.78,.012,.14,[244,240,230]));for(let k=0;k<14;k++)if(k%7!=2&&k%7!=6)m.push(...B(-.36+k*.055,.39,.165,.025,.012,.07,[20,18,20]));
  m.push(...B(0,.66,0,.9,.03,.34,[74,44,32]),...B(0,.5,.16,.5,.12,.02,[236,226,196]),...C(-.38,.67,.05,.02,.08,BR,{ax:'y',n:5}),...C(-.38,.75,.05,.012,.06,[250,248,236],{ax:'y',n:5}));M.push(m)}
 /* 4 hitching rail */
 {const m=f();for(const x of[-.42,.42])m.push(...B(x,.25,0,.07,.5,.07,WD2));m.push(...C(-.48,.44,0,.03,.96,WD3,{ax:'x',n:6}));M.push(m)}
 /* 5 water trough */
 {const m=f();m.push(...B(0,.14,0,.8,.28,.36,WD),...B(0,.255,0,.7,.01,.26,[70,110,140]),...B(-.4,.14,0,.03,.3,.38,WD2),...B(.4,.14,0,.03,.3,.38,WD2));for(const z of[-.17,.17])m.push(...B(0,.27,z,.82,.03,.04,WD3));M.push(m)}
 /* 6 saguaro */
 {const m=f();m.push(...C(0,0,0,.1,1.25,GR,{ax:'y',n:8,r2:.085}),...C(0,1.25,0,.085,.06,GR2,{ax:'y',n:8,r2:.03}));m.push(...C(0,.55,0,.06,.2,GR,{ax:'x',n:6}),...C(.2,.55,0,.06,.38,GR,{ax:'y',n:6,r2:.05}),...C(0,.75,0,.055,.18,GR,{ax:'x',n:6,r2:.05}));m.push(...vmCyl(-.18,.75,0,.055,.3,GR,{ax:'y',n:6,r2:.045}),...C(-.18,.75,0,.055,.18,GR,{ax:'x',n:6}));
  for(let k=0;k<4;k++){const a=k*1.57;m.push(...B(Math.cos(a)*.098,.6,Math.sin(a)*.098,.012,1.1,.012,GR2,{ry:a}))}M.push(m)}
 /* 7 hay bale */
 {const m=f();m.push(...B(0,.17,0,.64,.34,.42,[218,186,92]));for(const x of[-.16,.16])m.push(...B(x,.17,0,.03,.35,.43,[150,118,60]));m.push(...B(0,.342,0,.6,.005,.38,[236,206,116]));M.push(m)}
 /* 8 coffin, stood up on its foot */
 {const m=f(),cw=[92,58,40];m.push(...B(0,.48,-.02,.34,.92,.1,cw,{rx:-.08}),...B(0,.48,.035,.3,.86,.02,[120,78,54],{rx:-.08}),...B(0,.62,.05,.03,.24,.01,[214,204,190],{rx:-.08}),...B(0,.66,.05,.13,.03,.01,[214,204,190],{rx:-.08}));M.push(m)}
 /* 9 porch roof over a boardwalk cell: a slanting roof on a beam, a post at the street edge */
 {const m=f();m.push(...B(0,1.0,0,1.02,.035,1.0,[120,96,80],{rx:.12}),...B(0,.95,.48,1.02,.08,.05,WD2),...B(.45,.47,.46,.07,.95,.07,WD3),...B(0,1.035,-.5,1.02,.04,.04,WD2));M.push(m)}
 /* 10 a batwing door leaf, hinged at -x */
 {const m=f(),L=[];L.push(...B(.22,.46,0,.44,.42,.03,[176,120,72]));for(let k=0;k<5;k++)L.push(...B(.22,.31+k*.07,.016,.38,.03,.01,[150,96,58]));L.push(...B(.22,.69,0,.44,.06,.035,WD2));for(const q of L)m.push(q);vmTurn(m,[0,0,0],0,.35,0);for(const q of m)q.p=q.p.map(p=>[p[0]-.48,p[1],p[2]]);M.push(m)}
 /* 11 gun rack on the wall (the wall is -z) */
 {const m=f();m.push(...B(0,.6,-.42,.9,.5,.06,WD));for(const x of[-.28,0,.28]){m.push(...B(x,.62,-.37,.03,.42,.03,IR),...B(x,.43,-.37,.05,.14,.04,WD3))}m.push(...B(0,.4,-.37,.86,.04,.06,WD2),...B(0,.82,-.37,.86,.04,.06,WD2));M.push(m)}
 /* 12 shop counter with a glass top and guns laid out in it (customers' side +z) */
 {const m=f();m.push(...B(0,.2,0,1.0,.4,.42,WD),...B(0,.41,0,1.0,.02,.44,[170,210,220]),...B(0,.43,0,1.02,.018,.46,WD3));for(const x of[-.3,.05,.32])m.push(...B(x,.39,0,.18,.015,.05,IR),...B(x-.07,.39,.03,.04,.015,.06,WD3));M.push(m)}
 /* 13 the vault door, shut */
 {const m=f(),ST=[118,124,138],ST2=[86,90,102];m.push(...B(0,.75,0,1.0,1.5,.2,ST2),...C(0,.72,.1,.44,.1,ST,{ax:'z',n:16}),...C(0,.72,.2,.12,.04,ST2,{ax:'z',n:10}));for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;m.push(...B(Math.cos(a)*.14,.72+Math.sin(a)*.14,.25,.05,.05,.04,BR,{rz:a}))}for(let k=0;k<8;k++){const a=k*Math.PI/4;m.push(...B(Math.cos(a)*.36,.72+Math.sin(a)*.36,.2,.04,.04,.02,[60,62,70]))}m.push(...B(-.42,.5,.17,.08,.12,.05,IR),...B(-.42,.95,.17,.08,.12,.05,IR));M.push(m)}
 /* 14 the vault door, swung open (a frame and the door turned on its hinge) */
 {const m=f(),ST=[118,124,138],ST2=[86,90,102];for(const x of[-.47,.47])m.push(...B(x,.75,0,.06,1.5,.22,ST2));m.push(...B(0,1.47,0,1.0,.06,.22,ST2));const d=[...C(0,.72,.1,.44,.1,ST,{ax:'z',n:16}),...C(0,.72,.2,.12,.04,ST2,{ax:'z',n:10})];for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;d.push(...B(Math.cos(a)*.14,.72+Math.sin(a)*.14,.25,.05,.05,.04,BR,{rz:a}))}
  vmTurn(d,[-.44,0,.12],0,-1.9,0);m.push(...d);M.push(m)}
 /* 15 a sack of gold */
 {const m=f();m.push(...C(0,0,0,.13,.17,[176,146,96],{ax:'y',n:8,r2:.08}),...C(0,.17,0,.04,.05,[150,120,76],{ax:'y',n:6,r2:.06}),...C(0,.165,0,.085,.015,[90,60,40],{ax:'y',n:6}));for(const[x,z]of[[.14,.06],[.1,-.1],[-.12,.1]])m.push(...C(x,0,z,.04,.012,[236,196,72],{ax:'y',n:8}));M.push(m)}
 /* 16 hotel bed (the head toward -z) */
 {const m=f();m.push(...B(0,.12,0,.56,.12,1.0,WD2),...B(0,.21,0,.52,.08,.96,[236,232,220]),...B(0,.255,.12,.54,.03,.7,[150,60,50]),...B(0,.26,-.36,.4,.06,.16,[248,244,236]),...B(0,.35,-.5,.6,.5,.05,WD),...B(0,.25,.5,.6,.3,.05,WD));for(const sx of[-.27,.27])m.push(...C(sx,0,-.5,.025,.62,WD2,{ax:'y',n:5}));M.push(m)}
 /* 17 bottles on shelves against the wall (-z) */
 {const m=f(),BC=[[60,120,60],[140,70,30],[200,200,210],[90,40,30],[40,80,120]];for(const y of[.45,.75,1.05])m.push(...B(0,y,-.4,.96,.025,.16,WD));m.push(...B(0,.75,-.48,.98,.9,.03,WD2));let k=0;for(const y of[.465,.765,1.065])for(let x=-.4;x<=.41;x+=.1){const c=BC[(k++*7)%5];m.push(...C(x,y,-.4,.025,.12,c,{ax:'y',n:5}),...C(x,y+.12,-.4,.01,.05,c,{ax:'y',n:4}))}M.push(m)}
 /* 18 jail bars (floor to ceiling) */
 {const m=f();for(let k=0;k<8;k++)m.push(...C(-.44+k*.125,0,0,.016,1.5,[48,48,56],{ax:'y',n:4}));for(const y of[.06,.75,1.42])m.push(...B(0,y,0,1.0,.05,.04,[48,48,56]));M.push(m)}
 /* 19 a wagon wheel leaning on a wall (-z) */
 {const m=f(),RD=.3;for(let k=0;k<14;k++){const a=k/14*6.283;m.push(...B(Math.cos(a)*RD,RD+Math.sin(a)*RD,0,.15,.05,.05,WD,{rz:a+1.571}))}for(let k=0;k<6;k++){const a=k/6*3.1416;m.push(...B(0,RD,0,RD*2,.025,.025,WD3,{rz:a}))}m.push(...C(0,RD,-.04,.05,.08,IR,{ax:'z',n:8}));vmTurn(m,[0,0,0],-.25,0,0);for(const q of m)q.p=q.p.map(p=>[p[0],p[1],p[2]-.3]);M.push(m)}
 /* 20 a boulder with a barrel cactus */
 {const m=f();m.push(...C(0,0,0,.26,.2,[168,112,80],{ax:'y',n:7,r2:.18}),...C(0,.2,0,.18,.08,[150,98,70],{ax:'y',n:7,r2:.06}),...C(.24,0,.14,.08,.12,GR,{ax:'y',n:8,r2:.07}),...C(.24,.12,.14,.07,.03,[230,90,110],{ax:'y',n:8,r2:.02}));M.push(m)}
 /* 21 the hotel desk, with a bell and the register */
 {const m=f();m.push(...B(0,.22,0,1.0,.44,.4,WD),...B(0,.455,0,1.04,.03,.46,WD3),...C(.25,.47,0,.04,.035,BR,{ax:'y',n:8,r2:.01}),...B(-.15,.48,0,.22,.02,.16,[150,40,36]),...B(-.15,.492,0,.2,.006,.14,[240,232,210]));M.push(m)}
 /* 22 store shelves with goods against the wall (-z) */
 {const m=f(),G=[[200,60,50],[60,120,180],[230,200,90],[90,150,80],[180,140,100],[240,240,230]];m.push(...B(0,.6,-.44,.98,1.2,.04,WD2));for(const y of[.04,.36,.68,1.0])m.push(...B(0,y,-.32,.96,.03,.26,WD3));let k=0;for(const y of[.055,.375,.695,1.015])for(let x=-.38;x<=.39;x+=.152){const c=G[(k++*5)%6];k%3?m.push(...C(x,y,-.32,.045,.16,c,{ax:'y',n:6})):m.push(...B(x,y+.1,-.32,.12,.2,.14,c))}M.push(m)}
 /* 23 a lone street lamp post */
 {const m=f();m.push(...B(0,.6,0,.06,1.2,.06,IR),...B(0,1.22,.08,.04,.04,.2,IR),...B(0,1.12,.16,.12,.16,.12,[40,40,46]),...B(0,1.12,.16,.08,.11,.08,[255,214,120],{e:1}));M.push(m)}
 return WESTM=M}
/* the moving things: the stagecoach and its two horses, the tumbleweed (and a burning one) */
let WESTMV=null;
function westMov(){if(WESTMV)return WESTMV;const B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a),RD=[170,40,36],RD2=[120,26,24],YL=[226,180,70],BK=[34,30,30],WD=[104,66,40];
 /* the coach: front toward +z */
 const coach=[];coach.push(...B(0,.62,0,.66,.5,1.0,RD),...B(0,.9,0,.7,.06,1.04,RD2),...B(0,.4,0,.62,.08,1.1,BK),...B(0,.95,-.05,.6,.08,.8,[90,70,50]),...B(0,1.02,-.05,.5,.08,.6,[150,120,80]));
 for(const sx of[-1,1]){coach.push(...B(sx*.334,.66,.0,.01,.22,.3,[30,40,60]),...B(sx*.336,.66,0,.005,.26,.34,YL))}
 coach.push(...B(0,.72,.62,.5,.06,.3,WD),...B(0,.84,.5,.5,.22,.05,WD),...B(0,.5,.7,.06,.06,.6,BK),...C(-.3,.98,.5,.04,.08,[255,220,140],{ax:'y',n:6,e:1}),...C(.3,.98,.5,.04,.08,[255,220,140],{ax:'y',n:6,e:1}));
 const wheel=(x,z,r)=>{const w=[];for(let k=0;k<12;k++){const a=k/12*6.283;w.push(...B(0,r+Math.sin(a)*r,z+Math.cos(a)*r,.05,.06,r*.55,YL,{rx:-a}))}for(let k=0;k<4;k++)w.push(...B(0,r,z,.03,r*2,.03,YL,{rx:k*.785}));w.push(...C(-.05,r,z,.06,.1,BK,{ax:'x',n:8}));for(const q of w)q.p=q.p.map(p=>[p[0]+x,p[1],p[2]]);return w};
 for(const sx of[-1,1]){coach.push(...wheel(sx*.38,-.36,.26),...wheel(sx*.38,.38,.2))}
 /* a horse: front toward +z; legs in the middle of a gallop */
 const HB=[120,72,40],HD=[80,46,26],horse=[];horse.push(...C(0,.52,-.32,.15,.62,HB,{ax:'z',n:8}),...B(0,.66,.38,.12,.32,.14,HB,{rx:-.7}),...B(0,.78,.52,.12,.12,.28,HB,{rx:-.3}),...B(0,.76,.66,.09,.09,.1,HD),...B(0,.84,.4,.03,.18,.2,BK,{rx:-.7}));
 for(const[x,z,a]of[[-.08,.2,.5],[.08,.16,-.3],[-.08,-.26,-.5],[.08,-.22,.4]])horse.push(...B(x,.28,z,.06,.42,.06,HD,{rx:a,pv:[x,.48,z]}));horse.push(...B(0,.5,-.44,.05,.3,.05,BK,{rx:.7}));horse.push(...B(0,.72,.7,.14,.04,.03,[160,40,30]));
 /* a tumbleweed: a loose ball of twigs */
 const tw=[],twf=[];const r=wRng(5);for(let k=0;k<22;k++){const a=r()*6.283,b=r()*3.14,c=r()*3.14,l=.26+r()*.16;const col=[150+r()*30|0,120+r()*24|0,74+r()*20|0];tw.push(...B(0,0,0,l,.018,.018,col,{rx:a,ry:b,rz:c}));twf.push(...B(0,0,0,l*.92,.024,.024,r()<.5?[255,170,60]:[255,96,40],{rx:a,ry:b,rz:c,e:1}))}
 return WESTMV={coach,horse,tw,twf}}

/* ---------------- the people ---------------- */
const WSHIRT=[[176,58,48],[60,90,140],[206,186,146],[96,116,72],[150,116,84],[226,214,190],[120,60,96],[70,70,80]],WPANTS=[[70,88,126],[104,82,60],[44,42,48],[120,104,80]],WHATC=[[166,112,62],[96,72,52],[44,38,36],[206,184,150],[120,96,80]];
/* someone from the town: a person with a western gun and western clothes. o: {gun, hat, hatc, cl, pn, band, ponch, nm} */
function westHuman(x,y,o){o=o||{};const e=genHuman(x,y,fl);const gun=o.gun||pk(['pistol','pistol','shotgun','rifle']);
 if(e.melee){e.melee=0;e.swD=0;e.melr=0;e.spd/=1.18;e.dmg/=1.2;e.traits=e.traits.map(t=>t=='brawler'?'shooter':t)}
 e.gun=gun;e.traits[0]=gun;const sp=e.fr.spec;sp.gun=gun;sp.gm=null;sp.m3=null;sp.c={};
 sp.hat=o.hat!==undefined?o.hat:pk([3,3,3,3,102,0]);sp.hatc=o.hatc||pk(WHATC);sp.cl=o.cl||pk(WSHIRT);sp.pn=o.pn||pk(WPANTS);if(o.band)sp.band=o.band;if(o.ponch)sp.ponch=o.ponch;if(o.vest!==false&&R()<.5)sp.vest=pk([[60,44,36],[40,40,46],[96,70,44]]);
 if(o.nm)e.name=o.nm;else e.name=pk(['Outlaw','Gunslinger','Desperado','Bandit','Rustler','Hired Gun','Drifter'])+' '+pk(['Jed','Clem','Rufus','Hank','Silas','Zeke','Amos','Wade','Earl','Cole','Luke','Boone']);
 return e}
/* a seated version of someone's figure (the same look, sitting, hands on the table) */
function westSitFr(fr){const sp=Object.assign({},fr.spec,{sit:1,gm:null,m3:null,c:{},av:null}),f=[];for(let ph=0;ph<4;ph++){let v=null;Object.defineProperty(f,ph,{get:()=>v||(v=hmRender(sp,ph,0)),enumerable:true})}f.spec=sp;return f}
function westSpawn(){const W=WEST;if(!W)return;const n=N,ok=(x,y)=>!g[(y|0)*n+(x|0)];
 /* hostile gunmen round the town: on the street behind cover, in the alleys, the back lots, the sheriff's office, the store, the livery and the undertaker's */
 const SP=[[13,23.5],[24.5,26.6],[29,22.8],[36.5,25.3],[44.5,23.4],[12.6,17],[28.6,15],[23.6,33],[36.6,35],[8,8.5],[22,7.5],[38,8],[20,42],[32,43],[44,41],[6.5,18.5],[10.4,18.6],[6.5,33.6],[48,33],[39.6,34.5],[44.8,16.5],[2.6,40.5],[14,10]];
 const sh=SP.slice();for(let i=sh.length-1;i>0;i--){const j=ri(0,i);[sh[i],sh[j]]=[sh[j],sh[i]]}
 const cnt=Math.min(sh.length,Math.max(7,7+Math.floor(fl/2))-(CO()?0:P.pw.thin|0));let k=0;for(const[x,y]of sh){if(k>=cnt)break;if(!ok(x,y))continue;E.push(westHuman(x,y));k++}
 /* the hotel: a guard in the lobby, the wanted man in one of the rooms */
 {const h=W.hotel;E.push(westHuman(h.ix0+2.5,h.iy1-.5,{gun:'shotgun'}));const rm=h.rm[ri(0,h.rm.length-1)];
  const o=westHuman(rm.x0+(rm.x1-rm.x0+1)/2,rm.y0+.8,{gun:'pistol',hat:101,hatc:[34,30,32],cl:[70,40,36],pn:[44,40,44],band:[150,30,34],nm:W.out.name});o.hp*=1.9;o.mhp=o.hp;o.dmg*=1.2;o.sc=.9;o.bty=1;o.fa=Math.PI/2;W.outlaw=o;W.outRoom=rm;E.push(o)}
 /* the saloon: people at the tables, the piano player, the bartender and McCassidy at the bar */
 {const s=W.saloon,X=s.ix0,Y=s.iy0;/* tables and their chairs: [table x,y, chairs [x,y, seated?]] */
  s.tb=[[X+3,Y+1,[[X+2,Y+1,1],[X+4,Y+1,1],[X+3,Y+2,0]]],[X+2,Y+4,[[X+1,Y+4,1],[X+3,Y+4,1],[X+2,Y+5,1],[X+2,Y+3,0]]],[X+6,Y+3,[[X+5,Y+3,1],[X+7,Y+3,1],[X+6,Y+2,0],[X+6,Y+4,0]]]];
  s.bar={x:X+8,y0:Y,y1:Y+3};s.piano=[X,Y];
  const pas=(e,grp)=>{e.pac=1;e.grp=grp;e.aggro=0;W.pac.push(e);E.push(e);return e};
  for(const[tx,ty,chs]of s.tb)for(const[cx,cy,sit]of chs){if(!sit)continue;const e=westHuman(cx+.5,cy+.5,{vest:R()<.6});e.fa=Math.atan2(ty-cy,tx-cx);e.frS=e.fr;e.fr=westSitFr(e.fr);e.sit=1;pas(e,'saloon')}
  {const e=westHuman(X+.5,Y+1.5,{hat:102,hatc:[40,36,34],cl:[236,230,214],pn:[40,38,44],nm:'Piano Player'});e.fa=-Math.PI/2;e.frS=e.fr;e.fr=westSitFr(e.fr);e.sit=1;pas(e,'saloon')}
  {const e=westHuman(s.bar.x+1.5,Y+2.5,{gun:'shotgun',hat:0,cl:[236,232,220],pn:[40,40,46],nm:'Bartender'});e.fa=Math.PI;pas(e,'saloon')}
  {const e=westHuman(s.bar.x-.45,Y+1.2,{gun:'pistol',hat:101,hatc:[30,28,30],cl:[60,46,40],pn:[52,50,58],band:[176,36,40],ponch:[[178,64,40],[236,190,90],[60,90,120]],nm:'McCassidy'});e.fa=0;e.jack=1;e.hp*=2.2;e.mhp=e.hp;e.dmg*=1.3;e.sc=.9;pas(e,'saloon');W.jack=e}}
 /* the gunsmith behind his counter */
 {const s=W.smith,e=westHuman(s.ix0+2.5,s.iy0+4.5,{gun:'rifle',hat:0,cl:[150,120,90],pn:[60,54,50],nm:'Gunsmith'});e.fa=-Math.PI/2;e.pac=1;e.grp='smith';e.aggro=0;W.pac.push(e);E.push(e);W.smithE=e}}
/* a passive person this frame: stays put, looks where they look; true while passive (aiStep stops there) */
function westPas(e,dt){if(!e.pac)return false;e.af=0;if(e.jack&&WEST&&WEST.duel)return duelJack(e,dt);
 if(!e.sit&&!e.jack&&!e.dsp){const dx=P.x-e.x,dy=P.y-e.y;if(dx*dx+dy*dy<9){const a=Math.atan2(dy,dx);let d=a-(e.fa||0);while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;e.fa=(e.fa||0)+d*Math.min(1,dt*3)}}
 if(e.jack){const dx=P.x-e.x,dy=P.y-e.y;if(dx*dx+dy*dy<6){const a=Math.atan2(dy,dx);let d=a-(e.fa||0);while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;e.fa=(e.fa||0)+d*Math.min(1,dt*2)}}
 return true}
/* the group wakes up: everybody in it stands up and fights */
function westWake(e,quiet){const W=WEST;if(!W||!e||!e.pac)return;const grp=e.grp;let any=0;for(const o of W.pac){if(!o.pac||o.dead||o.grp!==grp)continue;o.pac=0;o.aggro=1;if(o.sit){o.sit=0;if(o.frS)o.fr=o.frS}o.cd=rr(.4,1.1);any=1}
 if(any&&!quiet){if(grp=='saloon'){wMsg('SALOON BRAWL!',2.4);snd(220,.5,'sawtooth',.06,-120);for(let i=0;i<3;i++)setTimeout(()=>snd(600+Math.random()*400,.08,'square',.04,-300),i*90)}else wMsg('The gunsmith pulls a rifle!',2.2)}
 if(HOSTCO&&HOSTCO())try{netSend({t:'wwk',fl,g:grp})}catch(er){}}

/* ---------------- the props ---------------- */
function westProps(){const W=WEST;if(!W)return;const n=N,at=(x,y)=>y*n+x;W.gb=[];
 const put=(x,y,m,o)=>{const i=at(x|0,y|0);const p=Object.assign({x:(x|0)+.5,y:(y|0)+.5,t:PS[0],s:.62,fl:0,fb:0,cell:i,m:3000+m,yaw:0,h:.6,pr:.35},o||{});if(!(o&&o.nb))blk[i]=1;PRP.push(p);return p};
 const freeC=(x,y)=>{const i=at(x,y);return !g[i]&&!blk[i]&&Math.hypot(x+.5-P.x,y+.5-P.y)>1.5&&Math.hypot(x+.5-ex.x,y+.5-ex.y)>1.2&&!E.some(e=>Math.hypot(e.x-x-.5,e.y-y-.5)<.7)};
 /* porch roofs over the boardwalks; the north side slopes down toward the street (+y), the south side toward -y */
 for(const b of W.b)for(let x=b.x0;x<=b.x1;x++){if(b.k=='livery')continue;put(x,b.bwy,9,{nb:1,yaw:b.sd=='n'?0:Math.PI,h:1.05,pr:.5})}
 /* the saloon: batwing doors, tables and chairs, the bar, the bottles, the piano */
 {const s=W.saloon;for(const dx of s.dr){const left=dx==s.dr[0];put(dx,s.fy,10,{nb:1,x:dx+.5,y:s.fy+.5,yaw:left?0:Math.PI,h:.7,pr:.3})}
  for(const[tx,ty,chs]of s.tb){put(tx,ty,0,{h:.32,pr:.32});for(const[cx,cy,sit]of chs){const yaw=Math.atan2(tx-cx,ty-cy);put(cx,cy,1,{nb:!!sit,yaw,h:.5,pr:.2})}}
  for(let y=s.bar.y0;y<=s.bar.y1;y++)put(s.bar.x,y,2,{yaw:-Math.PI/2,h:.48,pr:.5});for(let y=s.bar.y0;y<=s.bar.y1;y++)put(s.ix1,y,17,{yaw:-Math.PI/2,h:1.1,pr:.3});
  put(s.piano[0],s.piano[1],3,{yaw:0,h:.7,pr:.45,x:s.piano[0]+.5,y:s.piano[1]+.38});
  W.lamps=[[s.ix0+4,s.iy0+3],[s.ix1-3,s.iy1-1]]}
 {const b=W.rooms.sheriff;W.poster={x:b.dr[0]+2.5,y:b.fy+1.3}}
 /* the sheriff's office: the jail bars (one cell door left open), a desk */
 {const b=W.rooms.sheriff;for(const[x,y]of b.jail){if(g[at(x,y)])continue;if(x==b.ix0+1)continue;put(x,y,18,{h:1.5,pr:.5})}put(b.ix1-1,b.iy1-1,0,{h:.32,pr:.32});put(b.ix1,b.iy1-1,1,{yaw:-Math.PI/2,h:.5,pr:.2})}
 /* the hotel: a bed in each room, the desk in the lobby */
 {const h=W.hotel;for(const r of h.rm){put(r.x0,r.y0,16,{yaw:0,h:.4,pr:.5,x:r.x0+.5,y:r.y0+.55})}put(h.ix1-1,h.iy1-1,21,{yaw:0,h:.5,pr:.5})}
 /* the gunsmith: the counter, the racks on the back wall */
 {const s=W.smith;for(let x=s.ix0;x<s.ix1;x++)put(x,s.iy0+3,12,{yaw:Math.PI,h:.45,pr:.5});for(let x=s.ix0;x<=s.ix1;x++)put(x,s.iy1,11,{yaw:Math.PI,h:1,pr:.4});W.smithC={x:s.ix0+2.5,y:s.iy0+3.5}}
 /* the bank: desks in the lobby, the vault door, the gold inside */
 {const v=W.vault,b=v.b;W.vd=put(v.x,v.y,13,{yaw:Math.PI,h:1.5,pr:.5});put(b.ix0+1,b.iy0+1,21,{yaw:Math.PI,h:.5,pr:.5});put(b.ix1-1,b.iy0+1,21,{yaw:Math.PI,h:.5,pr:.5});
  const gs=[];for(let y=v.inY0;y<=v.inY1;y++)for(let x=b.ix0;x<=b.ix1;x++)if((x!=v.x||y>v.inY0)&&!(y==v.inY1&&(x-b.ix0)%2==0))gs.push([x,y]);for(let i=0;i<5&&gs.length;i++){const[x,y]=gs.splice(ri(0,gs.length-1),1)[0];W.gb.push(put(x,y,15,{nb:1,x:x+.5+rr(-.15,.15),y:y+.5+rr(-.15,.15),yaw:rr(0,6.28),h:.2,pr:.15,gold:1}))}
  for(let x=b.ix0;x<=b.ix1;x+=2)if(!blk[at(x,v.inY1)])put(x,v.inY1,22,{yaw:Math.PI,h:1.2,pr:.4})}
 /* the general store: shelves along the walls, sacks and barrels */
 {const b=W.rooms.store;for(let x=b.ix0;x<=b.ix1;x++)if(x!=b.bk)put(x,b.iy1,22,{yaw:Math.PI,h:1.2,pr:.4});for(let y=b.iy0+1;y<b.iy1;y+=2)put(b.ix0,y,22,{yaw:Math.PI/2,h:1.2,pr:.4});put(b.ix1-1,b.iy0+2,0,{h:.32,pr:.32,m:3000});}
 /* the undertaker: coffins inside and stood up outside */
 {const b=W.rooms.under;for(let x=b.ix0;x<=b.ix1;x+=2)put(x,b.iy1-1,8,{yaw:Math.PI,h:.95,pr:.25});for(const x of[b.x0+1,b.x1-1])if(!blk[at(x,b.bwy)])put(x,b.bwy,8,{yaw:Math.PI,h:.95,pr:.25,y:b.bwy+.62})}
 /* the livery: hay */
 {const b=W.rooms.livery;for(const[x,y]of[[b.ix0,b.iy1],[b.ix0+1,b.iy1],[b.ix1,b.iy1-1],[b.ix1,b.iy0+3]])put(x,y,7,{yaw:rr(-.2,.2),h:.35,pr:.35})}
 /* the street: hitching rails and water troughs by the boardwalks, barrels, a lamp post or two */
 for(const[x,y,m,yw]of[[17,22,4,0],[24,22,4,0],[33,22,4,0],[40,22,4,0],[10,27,4,0],[20,27,4,0],[31,27,4,0],[14,22,5,0],[26,27,5,0],[42,22,5,0],[6,22,5,0]]){if(freeC(x,y))put(x,y,m,{yaw:yw,h:m==4?.5:.3,pr:m==4?.5:.42})}
 for(const[x,y]of[[13,21],[28,21],[12,28],[23,28],[36,28],[44,28]])if(freeC(x,y)){const i=at(x,y);blk[i]=1;PRP.push({x:x+.5,y:y+.5,t:PS[1],s:PD[1],fl:0,fb:0,m:1,yaw:0,h:PROP_H[1],pr:PROP_R[1],cell:i})}
 for(const[x,y]of[[29,22],[3,21],[3,28],[45,27]])if(freeC(x,y))put(x,y,23,{nb:1,h:1.3,pr:.1});
 /* the back lots and the desert: cacti, boulders, hay, a wagon wheel, crates */
 for(let y=4;y<n-4;y++)for(let x=1;x<n-1;x++){const i=at(x,y);if(g[i]||blk[i]||ct[i]!=2&&ct[i]!=11)continue;if(y>=W.SY0-1&&y<=W.SY1+1)continue;if(!freeC(x,y))continue;const v=wHash(x,y,21);if(v>.06)continue;const k=wHash(x,y,22);put(x,y,k<.45?6:k<.8?20:7,{yaw:wHash(x,y,23)*6.28,h:k<.45?1.3:.4,pr:k<.45?.15:.3,x:x+.5+(wHash(x,y,24)-.5)*.3,y:y+.5+(wHash(x,y,25)-.5)*.3})}
 for(const b of W.b){const x=b.x1+1,y=b.sd=='n'?b.y0+3:b.y1-3;if(freeC(x,y))put(x,y,19,{nb:1,yaw:Math.PI/2,h:.6,pr:.3})}
 /* chests: one in the general store, one in the livery */
 for(const[x,y]of[[W.rooms.store.ix1,W.rooms.store.iy0],[W.rooms.livery.ix0,W.rooms.livery.iy1-1]]){const i=at(x,y);if(g[i]||blk[i])continue;blk[i]=1;if(typeof pathOk=='function'&&!pathOk()){blk[i]=0;continue}CH.push({x:x+.5,y:y+.5})}
 /* the stagecoach waits at the east end of the street */
 W.coach={st:'park',x:N-3.4,y:W.SY0+2.5,t:0,wait:rr(30,45),hit:new Set(),a:1};W.storm={t:0,next:rr(30,50),on:0,k:0};W.tw=[];W.twT=rr(2,5)}

/* ---------------- the town at work: messages, prompts, the use key ---------------- */
function wMsg(t,d){if(!WEST)return;WEST.msg=t;WEST.msgT=d||2.5}
const wIn=(b,x,y,pad)=>{pad=pad||0;return x>=b.ix0-pad&&x<b.ix1+1+pad&&y>=b.iy0-pad&&y<b.iy1+1+pad};
const wAng=(a,b)=>{let d=b-a;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return d};
const W_PM_PRICE=40;
/* what the use key would do here, if anything: {k, t (the prompt)} */
function westNear(){const W=WEST;if(!W||state!='play'||W.duel)return null;const px=P.x,py=P.y;
 const j=W.jack;if(j&&j.pac&&!j.dead&&!W.duelDone&&!DM&&Math.hypot(j.x-px,j.y-py)<1.7)return{k:'duel',t:'CHALLENGE MCCASSIDY TO A DUEL'};
 const sm=W.smithE;if(sm&&sm.pac&&!sm.dead&&W.smithC&&Math.hypot(W.smithC.x-px,W.smithC.y-py)<1.6)return{k:'smith',t:W.pmSold?'THE GUNSMITH: "ENJOY IT, PARTNER"':'BUY THE PEACEMAKER  -  $'+W_PM_PRICE};
 if(W.vd&&!W.heist&&!DM&&Math.hypot(W.vd.x-px,W.vd.y-.5-py)<1.5&&py<W.vd.y)return{k:'vault',t:'CRACK THE VAULT'};
 return null}
/* the use key (called from chest()): true if the town took it */
function westUse(){const W=WEST;if(!W||state!='play')return false;const q=westNear();if(!q)return false;keys={};
 if(q.k=='duel'){duelStart();return true}
 if(q.k=='smith'){if(W.pmSold){wMsg('"Take good care of her."',2);return true}
  const cur=Wp&&Wp.name||'your gun';snd(620,.12,'triangle',.06,200);
  choose('Gunsmith','"A Peacemaker. Single action, six shots, and the hardest-hitting iron in the territory. Wait a moment between shots and she never misses." You have $'+(P.money|0)+'.',
   [{n:'Peacemaker  —  $'+W_PM_PRICE,d:'Heavier hits than the Hand cannon. Dead Eye: the first shot after a short pause does 60% more damage and goes exactly where you aim. '+(W2?'Replaces '+cur+'.':'Your '+cur+' goes to your second slot.')},{n:'Leave',d:'Keep your money.'}],
   k=>{state='play';if(k!==0)return;if((P.money|0)<W_PM_PRICE){wMsg('"Come back when you have the money."',2.4);snd(160,.2,'square',.06,-60);return}
    P.money-=W_PM_PRICE;try{moneySync()}catch(er){}const w=westPeacemaker();if(!W2&&Wp){W2=Wp;W2.am=P.ammo}Wp=w;P.ammo=MG();P.reload=0;P.cd=0;W.pmSold=1;wMsg('THE PEACEMAKER',2.6);snd(520,.12,'triangle',.08,300);setTimeout(()=>snd(180,.08,'square',.06,-60),180);setTimeout(()=>snd(240,.06,'square',.05,-60),300)});return true}
 if(q.k=='vault'){W.heist={st:'crack',t:0,tk:0};wMsg('CRACKING THE VAULT... STAY CLOSE',2.2);return true}
 return false}
/* the Peacemaker: a Hand cannon underneath (its sounds, its reload), with its own look and numbers */
function westPeacemaker(){const b=WT.find(x=>x.t=='Hand cannon');const w=genW(b);w.pm=1;w.perk=undefined;w.dmg=Math.round(rr(70,92));w.rate=rr(1.55,1.85);w.spr=.012;w.mag=6;w.rt=WM['Hand cannon'][1]*.8;w.pi=1;w.hue=38;w.name='Peacemaker';return w}
/* Dead Eye: the Peacemaker's first shot after .7 s */
function westDeadEye(w){if(!w||!w.pm)return 1;const k=T-(w.pmT===undefined?-9:w.pmT)>.7?1.6:1;w.pmT=T;return k}

/* gunfire: the saloon wakes if you shoot inside, and the stagecoach horses bolt */
function westFire(){const W=WEST;if(!W||state!='play')return;
 if(W.duel){duelFire();return}
 const s=W.saloon;if(wIn(s,P.x,P.y,.2)){const e=W.pac.find(o=>o.pac&&!o.dead&&o.grp=='saloon');if(e)westWake(e)}
 const sm=W.smith;if(wIn(sm,P.x,P.y,.2)&&W.smithE&&W.smithE.pac&&!W.smithE.dead){wMsg('"Not in my shop!"',2)}
 const c=W.coach;if(c&&c.st=='park'&&Math.hypot(c.x-P.x,c.y-P.y)<7){coachGo('spooked')}}
/* a passive person was hit */
function westHit(e){const W=WEST;if(!W)return;if(W.duel&&e.jack){duelHitJack(e);return}if(e.jack){e.grp='jack'}westWake(e)}
/* someone died */
function westKill(e){const W=WEST;if(!W)return;
 if(e.bty&&!W.btyDone){W.btyDone=1;const v=W.out.reward;P.money=Math.min(MAXM(),(P.money|0)+v);try{moneySync()}catch(er){}wMsg('BOUNTY COLLECTED: '+W.out.name.toUpperCase()+'  +$'+v,4);snd(660,.15,'triangle',.08,200);setTimeout(()=>snd(990,.25,'triangle',.08,200),150)}
 if(e.jack&&!W.duel&&!W.jackDead){W.jackDead=1}}

/* ---------------- the runaway stagecoach ---------------- */
function coachGo(why){const c=WEST.coach;if(!c||c.st!='park')return;c.st='rear';c.t=0;c.hit=new Set();
 snd(700,.35,'sawtooth',.06,600,{x:c.x,y:c.y});setTimeout(()=>snd(900,.3,'sawtooth',.05,-500,{x:c.x,y:c.y}),120);wMsg(why=='spooked'?'THE HORSES BOLT!':'RUNAWAY STAGECOACH!',2.4)}
function coachStep(dt){const W=WEST,c=W.coach;if(!c)return;c.t+=dt;const L=W.SY0+2.5;
 if(c.st=='park'){c.x=N-3.4;c.y=L;c.v=0;if(!W.duel&&c.t>c.wait)coachGo();
  /* a parked coach is solid: push the player out of it */const dx=P.x-(c.x-.9),dy=P.y-c.y;if(Math.abs(dx)<1.9&&Math.abs(dy)<.75){P.y=c.y+(dy<0?-.76:.76)}return}
 if(c.st=='rear'){if(c.t>.9){c.st='run';c.t=0;c.v=2}return}
 if(c.st=='gone'){if(c.t>c.wait){c.st='park';c.t=0;c.wait=rr(32,48);for(let i=0;i<10;i++)ptcPush({x:N-3.4+rr(-1,1),y:L+rr(-.6,.6),z:.1,vx:rr(-.5,.5),vy:rr(-.5,.5),vz:.4,life:1,l0:1,t:S.dust,s:.5,g:0},0)}return}
 /* running: speeds up to 10 tiles a second, westward down the middle of the street */
 c.v=Math.min(10,c.v+dt*9);c.x-=c.v*dt;c.y=L+Math.sin(c.t*3)*.08;
 if(Math.random()<dt*30)ptcPush({x:c.x+rr(.2,1.2),y:c.y+rr(-.5,.5),z:.05,vx:rr(.5,2),vy:rr(-.4,.4),vz:rr(.2,.6),life:.9,l0:.9,t:S.dust,s:rr(.3,.55),g:0},0);
 if(Math.random()<dt*7)snd(90+Math.random()*30,.06,'square',.05,-20,{x:c.x,y:c.y});
 /* the horses' front is at x-1.6, the coach's back at x+.7 */const x0=c.x-1.7,x1=c.x+.75;
 if(!c.hit.has(P)&&P.x>x0&&P.x<x1&&Math.abs(P.y-c.y)<.8&&!(P.deadT>0)&&(P.z||0)+(P.jz||0)<.9){c.hit.add(P);hb(null);cause='a runaway stagecoach';hurt(P.mhp*.45);const s=P.y<c.y?-1:1;push(P,-.35,s,4.2);P.hurt=.5;snd(70,.4,'sawtooth',.12,-30);snd(160,.2,'square',.08,-90)}
 for(const e of E){if(e.dead||c.hit.has(e)||e.x<x0||e.x>x1||Math.abs(e.y-c.y)>.8)continue;c.hit.add(e);if(e.pac)westWake(e,1);e.hp-=Math.max(150,e.mhp*.8);e.flash=.1;e.aggro=1;burst(e,S.blood,12);push(e,-.3,e.y<c.y?-1:1,3);snd(80,.3,'sawtooth',.1,-40,e);if(e.hp<=0)kill(e)}
 for(const t of W.tw)if(!t.dead&&t.x>x0&&t.x<x1&&Math.abs(t.y-c.y)<.9){t.dead=1;twBurst(t)}
 if(c.x<4){c.st='gone';c.t=0;c.wait=rr(14,22);for(let i=0;i<26;i++){const a=Math.random()*6.28,v=rr(1,4);ptcPush({x:c.x,y:c.y,z:.2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rr(.3,1.5),life:1.4,l0:1.4,t:S.dust,s:rr(.4,.8),g:1},0)}snd(60,.6,'sawtooth',.12,-20,{x:c.x,y:c.y});snd(240,.3,'square',.06,-150,{x:c.x,y:c.y})}}

/* ---------------- tumbleweeds ---------------- */
let WFLS=null;
function twStep(dt){const W=WEST;W.wind=W.wind||(wHash(3,3,3)<.5?-1:1);const st=W.storm,sk=st?st.k:0;
 W.twT-=dt*(1+sk*3);if(W.twT<=0&&W.tw.length<(6+sk*6|0)){W.twT=rr(2.5,6);const x=W.wind>0?1.4:N-2.4,y=rr(W.SY0+.4,W.SY1+.6);W.tw.push({x,y,v:rr(1.2,2.4),vy:rr(-.25,.25),r:rr(.85,1.15),ph:0,b:Math.random()*6,burn:0,life:0})}
 if(!WFLS&&S.fl)WFLS=new Set(S.fl);
 for(const t of W.tw){if(t.dead)continue;t.life+=dt;const sp=t.v*(1+sk*1.4)*(t.burn>0?.8:1);t.x+=W.wind*sp*dt;t.y+=t.vy*dt+Math.sin(t.life*1.3+t.b)*.25*dt;t.ph+=sp*dt/(.27*t.r);t.z=Math.abs(Math.sin(t.life*3.1+t.b))*.18*(1+sk);
  const ci=(t.y|0)*N+(t.x|0);if(t.x<.5||t.x>N-.5||g[ci]||(blk[ci]&&(t.y%1)>.25&&(t.y%1)<.75&&(t.x%1)>.25&&(t.x%1)<.75)){if(blk[ci]&&!g[ci]){t.vy=-t.vy;t.x-=W.wind*sp*dt*2;t.y+=t.vy*.2;if(Math.random()<.02)t.dead=1}else{t.dead=1;continue}}
  if(t.y<W.SY0-1.6||t.y>W.SY1+1.6)t.vy=-t.vy;
  /* catching fire: fire on the ground, a burning person, flames in the air, an explosion */
  if(!t.burn){let hot=false;for(const f of FP)if(Math.hypot(f.x-t.x,f.y-t.y)<.9){hot=true;break}
   if(!hot)for(const e of E)if(!e.dead&&(e.burn>0||e.burn2>0)&&Math.hypot(e.x-t.x,e.y-t.y)<.7){hot=true;break}
   if(!hot&&typeof LBX!='undefined'&&LBX&&T-LBX.t<.25&&Math.hypot(LBX.x-t.x,LBX.y-t.y)<LBX.r+.4)hot=true;
   if(!hot&&WFLS)for(const p of PTC)if(WFLS.has(p.t)&&Math.abs(p.x-t.x)<.45&&Math.abs(p.y-t.y)<.45){hot=true;break}
   if(!hot)for(const o of W.tw)if(o!==t&&o.burn>0&&Math.hypot(o.x-t.x,o.y-t.y)<.75){hot=true;break}
   if(hot){t.burn=rr(6,8);snd(220,.35,'sawtooth',.05,-120,{x:t.x,y:t.y})}}
  if(t.burn>0){t.burn-=dt;t.fx=(t.fx||0)+dt*16;while(t.fx>=1&&PTC.length<900){t.fx--;ptcPush({x:t.x+rr(-.2,.2),y:t.y+rr(-.2,.2),z:(t.z||0)+.2,vx:-W.wind*.4,vy:0,vz:rr(.6,1.2),life:.45,l0:.45,t:S.fl[(Math.random()*4)|0],s:rr(.16,.3),g:-.4},0)}
   t.tk=(t.tk||0)-dt;if(t.tk<=0){t.tk=.4;const dm=6+.5*fl;if(Math.hypot(P.x-t.x,P.y-t.y)<.65&&(P.z||0)+(P.jz||0)<.7){hb(null);cause='a burning tumbleweed';hurt(dm);try{igniteP(3+.3*fl,2)}catch(er){}}
    for(const e of E)if(!e.dead&&Math.hypot(e.x-t.x,e.y-t.y)<.65){if(e.pac)westWake(e,1);e.hp-=dm*2;e.burn=Math.max(e.burn||0,2);e.flash=.08;if(e.hp<=0)kill(e)}}
   if(t.burn<=0){t.dead=1;twBurst(t,1)}}}
 W.tw=W.tw.filter(t=>!t.dead)}
function twBurst(t,ash){for(let i=0;i<12;i++){const a=Math.random()*6.28,v=rr(.4,1.6);ptcPush({x:t.x,y:t.y,z:.2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rr(.4,1.4),life:.7,l0:.7,t:ash?S.spark:S.dust,s:ash?.1:.25,g:2},0)}}

/* ---------------- dust storms ---------------- */
function stormStep(dt){const W=WEST,st=W.storm;st.t+=dt;
 if(!st.on){if(st.t>st.next&&!W.duel){st.on=1;st.t=0;st.len=rr(13,16);wMsg('DUST STORM!',2.4);snd(90,1.4,'sawtooth',.04,-30)}}
 else if(st.t>st.len){st.on=0;st.t=0;st.next=rr(55,75)}
 const tgt=st.on?(st.t<2?st.t/2:st.t>st.len-2.5?(st.len-st.t)/2.5:1):0;st.k+=(tgt-st.k)*Math.min(1,dt*1.5);
 if(SW&&W.fk0!==undefined)SW.FKS=W.fk0*(1+st.k*7);
 /* the howl and the grit in the air */
 if(st.k>.05){st.ht=(st.ht||0)-dt;if(st.ht<=0){st.ht=.35;snd(140+Math.random()*80,.5,'sawtooth',.012*st.k,-60)}
  if(PTC.length<700&&Math.random()<dt*40*st.k){const a=P.a+rr(-1,1),r=rr(1,5);ptcPush({x:P.x+Math.cos(a)*r,y:P.y+Math.sin(a)*r,z:rr(.1,1.4),vx:W.wind*rr(3,6),vy:rr(-.5,.5),vz:rr(-.2,.2),life:.8,l0:.8,t:S.dust,s:rr(.25,.55),g:0},0)}}}

/* ---------------- the duel ---------------- */
function duelStart(){const W=WEST,j=W.jack;if(!j||W.duel)return;W.duel={st:'fade',t:0,fd:0};snd(300,.3,'triangle',.06,-100);wMsg("\"Well, it's high noon somewhere.\"",2.6)}
function duelStep(dt){const W=WEST,D=W.duel,j=W.jack;D.t+=dt;const L=W.SY0+2.5,PX=16.5,JX=28.5;
 if(!j||j.dead&&D.st!='won'){W.duel=null;return}
 if(D.st=='fade'){D.fd=Math.min(1,D.t/.7);if(D.t>=.8){/* out in the street: the player at one end, Jack at the other; everything else waits */
   P.x=PX;P.y=L;P.a=0;P.pt=0;P.vx=0;P.vy=0;j.x=JX;j.y=L;j.fa=Math.PI;j.z=SW?0:j.z;B.length=0;W.coach.st='park';W.coach.t=0;W.tw=W.tw.filter(t=>!t.burn);
   W.tw.push({x:W.wind>0?1.4:N-2.4,y:L+rr(-.3,.3),v:2.2,vy:0,r:1,ph:0,b:0,burn:0,life:0});
   D.st='wait';D.t=0;D.toll=0;D.cue=rr(1.4,3.2);D.rt=Math.max(.3,.62-fl*.006)+rr(0,.08)}return}
 D.fd=Math.max(0,D.fd-dt*2);
 if(D.st=='wait'){const k=Math.floor(D.t/1.1);if(k>D.toll&&D.toll<3){D.toll=k;snd(330,1.4,'triangle',.08,-4);snd(660,.9,'sine',.03,-4)}if(D.t>3.7){D.st='cue';D.t=0}return}
 if(D.st=='cue'){if(D.t>D.cue){D.st='draw';D.t=0;snd(1200,.12,'square',.06,-200)}return}
 if(D.st=='draw'){if(D.t>D.rt){/* Jack is faster */D.st='lost';D.t=0;jackShoots(j,.6);W.duelDone=1;setTimeout(()=>wMsg('"Reckon you\'re a mite slow, partner."',3),700)}return}
 if(D.st=='won'||D.st=='lost'||D.st=='foul'){if(D.t>2.6){D.st='out';D.t=0}return}
 if(D.st=='out'){D.fd=Math.min(1,D.t/.5);if(D.t>.6){if(j&&!j.dead&&j.pac){const s=W.saloon;j.x=s.bar.x-.45;j.y=s.iy0+1.2;j.fa=0}W.duel=null}}}
function jackShoots(j,k){snd(260,.14,'sawtooth',.1,-120,j);snd(90,.2,'square',.08,-40,j);try{ltPush(j.x,j.y,.7,3,[1,.8,.5],.12)}catch(er){}for(let i=0;i<6;i++)ptcPush({x:j.x+Math.cos(j.fa)*.35,y:j.y+Math.sin(j.fa)*.35,z:.62,vx:Math.cos(j.fa)*rr(1,3),vy:Math.sin(j.fa)*rr(1,3)+rr(-.5,.5),vz:rr(-.2,.4),life:.2,l0:.2,t:S.spark,s:.12,g:0},0);
 P.inv=0;hb(j);cause='McCassidy';hurt(P.mhp*k);P.hurt=.6}
function duelFire(){const W=WEST,D=W.duel,j=W.jack;if(!D)return;
 if(D.st=='wait'||D.st=='cue'){/* drew early */D.st='foul';D.t=0;wMsg('"Justice don\'t wait for cheats."',2.6);jackFlash(j);for(let i=0;i<3;i++)setTimeout(()=>{if(j&&!j.dead&&state=='play')jackShoots(j,.17)},450+i*110);setTimeout(()=>{if(j&&!j.dead){j.pac=0;j.grp='jack';j.aggro=1}},800);W.duelDone=1}}
/* a flashbang: a bang, a white-out, and your hands shake for a moment */
function jackFlash(j){const W=WEST;W.flash=1;snd(1800,.25,'square',.08,-1600,j);snd(80,.3,'sawtooth',.1,-40,j);P.cd=Math.max(P.cd||0,.7);for(let i=0;i<14;i++){const a=Math.random()*6.28,v=rr(1,3);ptcPush({x:j.x+Math.cos(j.fa)*.6,y:j.y+Math.sin(j.fa)*.6,z:.5,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rr(0,1),life:.3,l0:.3,t:S.spark,s:.2,g:0},0)}}
/* Jack in a straight fight: every few seconds he rolls to one side and comes up with a fresh cylinder */
function westJackAI(e,dt){if(e.pac||e.dead||!e.aggro)return;e.rlT=(e.rlT===undefined?rr(2,4):e.rlT)-dt;if(e.rlT>0)return;e.rlT=rr(3.5,5.5);const a=Math.atan2(P.y-e.y,P.x-e.x)+(Math.random()<.5?1:-1)*Math.PI/2;let d=0;for(let k=0;k<10;k++){const nx=e.x+Math.cos(a)*.15,ny=e.y+Math.sin(a)*.15,ci=(ny|0)*N+(nx|0);if(g[ci]||blk[ci])break;e.x=nx;e.y=ny;d++}if(d){e.cd=Math.min(e.cd||0,.25);snd(160,.15,'triangle',.05,-60,e);for(let i=0;i<6;i++)ptcPush({x:e.x,y:e.y,z:.05,vx:rr(-.6,.6),vy:rr(-.6,.6),vz:.3,life:.6,l0:.6,t:S.dust,s:.3,g:0},0)}}
function duelHitJack(j){const W=WEST,D=W.duel;if(D.st=='draw'){D.st='won';D.t=0;j.pac=0;j.hp=Math.min(j.hp,1);W.duelDone=1;
  const v=80;P.money=Math.min(MAXM(),(P.money|0)+v);try{moneySync()}catch(er){}let hat=0;try{hat=secretGive(HAT_JACK);if(hat)HATNEW=HAT_JACK}catch(er){}wMsg('"Huh. Didn\'t see that comin\'."',2.4);setTimeout(()=>wMsg('YOU WIN THE DUEL  +$'+v,3.5),2400);if(hat)setTimeout(()=>wMsg("MCCASSIDY'S BANDANA UNLOCKED",4),5600);setTimeout(()=>snd(523,.2,'triangle',.08,0),200);setTimeout(()=>snd(784,.4,'triangle',.08,0),380)}
 else if(D.st=='foul'){j.pac=0;j.aggro=1}}
/* Jack during the duel: stands his ground facing you */
function duelJack(e,dt){const W=WEST,D=W.duel;if(D&&(D.st=='wait'||D.st=='cue'||D.st=='draw'||D.st=='lost')){e.fa=Math.atan2(P.y-e.y,P.x-e.x)}return true}

/* ---------------- the bank job ---------------- */
function heistStep(dt){const W=WEST,H=W.heist,v=W.vault;H.t+=dt;
 if(H.st=='crack'){const d=Math.hypot(W.vd.x-P.x,W.vd.y-.5-P.y);if(d>1.9){H.st=null;W.heist=null;wMsg('YOU WALKED AWAY FROM THE VAULT',2);return}
  H.p=(H.p||0)+dt;H.tk-=dt;if(H.tk<=0){H.tk=.32;snd(1400+Math.random()*300,.03,'square',.03,-200)}
  if(H.p>=5){/* the door swings open and the alarm goes */const vd=W.vd,i=vd.cell;PRP=PRP.filter(p=>p!==vd);blk[i]=0;try{if(SW&&SW.g3d)g3dFreeCell(i)}catch(er){}
   PRP.push(Object.assign({},vd,{m:3014,nb:1}));W.vd=null;H.st='alarm';H.t=0;H.w=0;snd(200,.4,'square',.08,-60);wMsg('THE VAULT IS OPEN! THE ALARM IS RINGING',3.2);
   for(const e of E)if(!e.dead&&!e.pac)e.aggro=1}
  return}
 if(H.st=='alarm'){H.bt=(H.bt||0)-dt;if(H.bt<=0&&H.t<50){H.bt=.5;snd(880,.18,'square',.04,0,{x:v.x+.5,y:v.y+.5});setTimeout(()=>snd(660,.18,'square',.04,0,{x:v.x+.5,y:v.y+.5}),200)}
  const WV=[3,20,40];while(H.w<WV.length&&H.t>=WV[H.w]){heistPosse(H.w);H.w++}}}
function heistPosse(k){const W=WEST,L=W.SY0+2.5;const src=[[2.2,L-1],[2.2,L+1],[N-3,L-1.5],[N-3,L+1.5],[10.5,42],[40.5,42],[22,8],[47,10]];const n=k==2?5:3+(fl>12?1:0);
 if(k==0)wMsg('THE POSSE IS HERE!',2.6);else wMsg('MORE DEPUTIES!',2.2);snd(500,.25,'sawtooth',.05,300);
 for(let i=0;i<n;i++){const[x,y]=src[(k*3+i)%src.length];if(g[(y|0)*N+(x|0)])continue;const e=westHuman(x+rr(-.3,.3),y+rr(-.3,.3),{gun:pk(['rifle','shotgun','pistol']),hat:3,hatc:[214,196,160],cl:[110,96,80],pn:[60,60,70],vest:[[40,40,46]],nm:'Deputy '+pk(['Hollis','Pike','Barlow','Tate','McCoy','Briggs','Fenton','Quill'])});e.aggro=1;e.posse=1;e.vest=1;if(SW&&SW.g3d)e.z=FH[(e.y|0)*N+(e.x|0)]||0;E.push(e)}
 open=false}
/* the gold: picked up by walking over it, it slows you down, and it is paid out at the exit */
function goldStep(dt){const W=WEST;if(!W.gb)return;
 for(const p of W.gb){if(p.taken)continue;if(Math.hypot(p.x-P.x,p.y-P.y)<.6&&!W.vd){p.taken=1;PRP=PRP.filter(q=>q!==p);W.gold++;snd(880,.08,'triangle',.06,200);setTimeout(()=>snd(1320,.12,'triangle',.06,100),70);wMsg('GOLD x'+W.gold+'  (TAKE IT TO THE EXIT)',2.2)}}
 if(W.gold>0&&typeof ex!='undefined'&&ex&&Math.hypot(ex.x-P.x,ex.y-P.y)<2.6){const v=W.gold*(14+(fl>>2));P.money=Math.min(MAXM(),(P.money|0)+v);try{moneySync()}catch(er){}wMsg('GOLD CASHED IN  +$'+v,3.5);W.gold=0;snd(660,.15,'triangle',.08,200);setTimeout(()=>snd(990,.25,'triangle',.08,200),150)}}
/* the player's speed: gold is heavy; nobody moves in a duel */
function westSpd(){const W=WEST;if(!W)return 1;if(W.duel)return 0;return Math.max(.6,1-.07*(W.gold|0))}

/* ---------------- every frame ---------------- */
function westStep(dt){const W=WEST;if(!W||state!='play')return;W.t=(W.t||0)+dt;if(W.msgT>0)W.msgT-=dt;if(SW&&W.fk0===undefined)W.fk0=SW.FKS;
 if(W.duel)duelStep(dt);
 if(!W.duel||W.duel.st=='fade'||W.duel.st=='out')coachStep(dt);twStep(dt);stormStep(dt);
 if(W.heist)heistStep(dt);goldStep(dt);
 /* the jail's open cell, the hotel's guard: nothing to do; the wanted man reacts if you come into his room */
 const o=W.outlaw;if(o&&!o.dead&&!o.aggro&&W.outRoom){const r=W.outRoom;if(P.x>=r.x0&&P.x<r.x1+1&&P.y>=r.y0&&P.y<r.y1+1.6){o.aggro=1;wMsg('"YOU\'LL NEVER TAKE ME ALIVE!"',2.2)}}
 W.near=westNear()}

/* ---------------- drawing ---------------- */
let WTWF=null;
function twFrames(){if(WTWF)return WTWF;const M=westMov(),cp=F=>F.map(q=>Object.assign({},q,{p:q.p.map(p=>p.slice())})),out={tw:[],twf:[]};
 for(const k of['tw','twf'])for(let i=0;i<8;i++){const F=cp(M[k]);vmTurn(F,[0,0,0],i/8*6.2832,0,0);out[k].push(F)}return WTWF=out}
function westList(L){const W=WEST;if(!W)return;const c=W.coach;
 if(c&&c.st!='gone'){const rear=c.st=='rear'?Math.sin(c.t*7)*.08:0;L.push({q:14,wo:'coach',x:c.x+.15,y:c.y,yaw:-Math.PI/2,k:1.25,z:rear*.3});for(const s of[-1,1])L.push({q:14,wo:'horse',x:c.x-1.25,y:c.y+s*.24,yaw:-Math.PI/2,k:1.2,z:c.st=='run'?Math.abs(Math.sin(c.t*9+s))*.06:rear})}
 for(const t of W.tw)L.push({q:14,wo:t.burn>0?'twf':'tw',x:t.x,y:t.y,yaw:W.wind>0?Math.PI/2:-Math.PI/2,k:t.r*1.5,z:(t.z||0)+.36*t.r,ph:t.ph})}
function westDraw(s,dX,dY,plX,plY,inv,hH,Z){const M=westMov();let F;if(s.wo=='tw'||s.wo=='twf'){const fr=twFrames()[s.wo],i=((Math.floor(s.ph/6.2832*8)%8)+8)%8;F=fr[i]}else F=M[s.wo];if(!F)return;
 let base=0;if(SW){const f=swNearFloor(s.x,s.y,P.z+.5);base=f===f?f:0}else base=FHc(s.x,s.y);drawMesh(F,s.x,s.y,base+(s.z||0),s.k||1,s.yaw||0,null,0,dX,dY,plX,plY,inv,hH,Z)}
function westHud(){const W=WEST;if(!W||state!='play')return;const c=ctx;c.save();c.textAlign='center';c.textBaseline='alphabetic';
 /* the dust storm: a sandy wash over everything */
 const sk=W.storm?W.storm.k:0;if(sk>.02){c.globalAlpha=Math.min(.42,sk*.42);c.fillStyle='#c89a5c';c.fillRect(0,0,LW,LH);c.globalAlpha=1}
 const D=W.duel;if(D){/* letterbox bars, the title, the cue */const bh=Math.round(LH*.11);c.fillStyle='#000';c.fillRect(0,0,LW,bh);c.fillRect(0,LH-bh,LW,bh);
  c.font='bold 16px "DotGothic16",monospace';const T_=D.st=='wait'?"IT'S HIGH NOON":D.st=='cue'?'...':D.st=='draw'?'DRAW!':D.st=='won'?'YOU WIN':D.st=='lost'?'TOO SLOW':D.st=='foul'?'FOUL!':'';
  if(T_){c.fillStyle='#000';c.fillText(T_,LW/2+1,bh+25);c.fillStyle=D.st=='draw'?'#ff5a3a':'#ffe9b0';c.fillText(T_,LW/2,bh+24)}
  if(D.st=='wait'){c.font='8px "DotGothic16",monospace';c.fillStyle='#ffe9b0';c.fillText('WAIT FOR THE SIGNAL. FIRE TOO SOON AND IT IS A FOUL.',LW/2,LH-bh-6)}
  if(D.fd>0){c.globalAlpha=D.fd;c.fillStyle='#000';c.fillRect(0,0,LW,LH);c.globalAlpha=1}}
 c.font='8px "DotGothic16",monospace';
 const q=W.near;if(q&&!D){const t='['+kbName(KBC('use'))+'] '+q.t;c.fillStyle='#000';c.fillText(t,LW/2+1,LH*.3+1);c.fillStyle='#ffe9b0';c.fillText(t,LW/2,LH*.3)}
 /* the wanted poster, read when you stand at it */
 if(!D&&W.poster&&Math.hypot(W.poster.x-P.x,W.poster.y-P.y)<1.4&&!W.btyDone){const t1='WANTED: '+W.out.name.toUpperCase()+'  -  $'+W.out.reward+' REWARD',t2='LAST SEEN AT THE HOTEL';c.fillStyle='#000';c.fillText(t1,LW/2+1,LH*.36+1);c.fillText(t2,LW/2+1,LH*.36+11);c.fillStyle='#f0d890';c.fillText(t1,LW/2,LH*.36);c.fillText(t2,LW/2,LH*.36+10)}
 if(W.heist&&W.heist.st=='crack'){const w=80,x=LW/2-w/2,y=LH*.38;c.fillStyle='#000';c.fillRect(x-1,y-1,w+2,6);c.fillStyle='#d8b050';c.fillRect(x,y,w*Math.min(1,(W.heist.p||0)/5),4)}
 if(W.gold>0){const t='GOLD x'+W.gold+'  (-'+Math.round((1-westSpd())*100)+'% SPEED)';c.textAlign='right';c.fillStyle='#000';c.fillText(t,LW-7,LH*.2+1);c.fillStyle='#ffd24a';c.fillText(t,LW-8,LH*.2);c.textAlign='center'}
 if(W.flash>0){c.globalAlpha=Math.min(1,W.flash);c.fillStyle='#fff';c.fillRect(0,0,LW,LH);c.globalAlpha=1;W.flash-=.02}
 c.restore();
 if(W.msgT>0&&W.msg){c.save();c.textAlign='center';c.font='bold 13px "DotGothic16",monospace';c.globalAlpha=Math.min(1,W.msgT*1.2);c.fillStyle='#000';c.fillText(W.msg,LW/2+1,61);c.fillStyle='#ffe9b0';c.fillText(W.msg,LW/2,60);c.restore()}}
/* the lights: a high noon sun, oil lamps inside every building, the street lamps */
function westLights(){const W=WEST;const az=-1.1,el=1.18,D=70,c0=N/2;LT.push({x:c0+Math.cos(az)*D*Math.cos(el),y:c0+Math.sin(az)*D*Math.cos(el),z:D*Math.sin(el),r:2000,c:[1,.92,.78],k:.7,dx:0,dy:0,fk:0,ph:0,sun:1});
 const dx4=[1,-1,0,0],dy4=[0,0,1,-1];for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){const i=y*N+x;if(g[i]||!CMASK[i])continue;
  for(let d=0;d<4;d++){const dx=dx4[d],dy=dy4[d];if(!g[(y+dy)*N+x+dx]||blk[i])continue;const lx=x+.5+dx*.34,ly=y+.5+dy*.34;let ok=LT.length<34;for(const l of LAMPS)if(Math.hypot(l.x-lx,l.y-ly)<4.2){ok=false;break}if(!ok)continue;
   LAMPS.push({x:x+.5+dx*.46,y:y+.5+dy*.46,yaw:Math.atan2(-dx,-dy),cool:0,hi:0});LT.push({x:lx,y:ly,z:1.05,r:5.5,c:[1,.66,.34],k:1.15,dx:-dx,dy:-dy,fk:.08,ph:wHash(x,y,d)*30})}}
 for(const p of PRP)if(p.m===3023)LT.push({x:p.x,y:p.y+.16,z:1.12,r:3.5,c:[1,.75,.4],k:.9,dx:0,dy:0,fk:.05,ph:p.x})}

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
/* the buildings: [name, x0, x1, side (n: north of the street, s: south), siding colour, trim colour, wallpaper, floor, doors (x), back door x]; fixed, so their textures can be made ahead of time */
const WBD=[
  {k:'sheriff',nm:'SHERIFF',x0:4,x1:11,sd:'n',sc:[184,150,104],tc:[110,62,40],wp:'plaster',fl:7,dr:[8],bk:null},
  {k:'saloon',nm:'SALOON',x0:14,x1:27,sd:'n',sc:[168,66,52],tc:[236,204,120],wp:'damask',fl:4,dr:[20,21],bk:25},
  {k:'hotel',nm:'HOTEL',x0:30,x1:43,sd:'n',sc:[86,122,104],tc:[236,226,196],wp:'stripe',fl:5,dr:[36],bk:null},
  {k:'store',nm:'GENERAL STORE',x0:4,x1:12,sd:'s',sc:[198,170,118],tc:[120,70,44],wp:'plank',fl:8,dr:[8],bk:10},
  {k:'smith',nm:'GUNSMITH',x0:15,x1:22,sd:'s',sc:[96,92,104],tc:[214,170,82],wp:'plank',fl:8,dr:[18],bk:null},
  {k:'bank',nm:'BANK',x0:25,x1:35,sd:'s',sc:[150,84,62],tc:[236,226,206],wp:'plaster',fl:6,dr:[30],bk:null},
  {k:'under',nm:'UNDERTAKER',x0:38,x1:43,sd:'s',sc:[62,58,64],tc:[200,196,190],wp:'plank',fl:8,dr:[40],bk:null},
  {k:'livery',nm:'LIVERY',x0:46,x1:51-2,sd:'s',sc:[150,58,44],tc:[236,226,206],wp:'barn',fl:9,dr:[46+1,46+2],bk:null}];
const WESTT={n:'Frontier Town',west:1,w:[],f:1,c:32,cl:.1,fk:.07};
const WNAMES_OUT=['Black Bart Morrow','"Snake-Eye" Pete Varga','Dutch Holloway','Cal "the Rattler" Reyes','Mad Jesse Kincaid','One-Ear Abe Turlow','Wild Hank Delano','Lefty Joe Carrow'];
const WNAMES_TOWN=['Dry Gulch','Coyote Springs','Tumbleweed','Redrock','Dead Horse Flats','Copper Creek','Sundown','Rattlesnake Bend'];
function wHash(x,y,k){let h=(Math.imul(x+1,73856093)^Math.imul(y+1,19349663)^Math.imul(k+1,83492791)^Math.imul(((seed|0)+(fl|0)*131)|0,-1640531535))>>>0;h=Math.imul(h^(h>>>15),-2048144777)>>>0;return((h^(h>>>13))>>>0)%10007/10007}

/* ---------------- the layout ---------------- */
function genWest(){const n=N,at=(x,y)=>y*n+x;
 g=new Uint8Array(n*n).fill(1);ct.fill(0);FH.fill(0);rooms=[];
 CMASK=new Uint8Array(n*n);WHM=new Float32Array(n*n);RFH=new Float32Array(n*n);
 const W=WEST={td:[],tdk:{},b:[],T0:T,town:pk(WNAMES_TOWN),out:{name:wNm(pk(WNAMES_OUT)),reward:25+5*ri(0,3)},jack:null,coach:null,tw:[],storm:{t:0,next:rr(35,55),on:0,k:0},msg:null,
  doors:[],brk:[],duel:null,heist:null,gold:0,inter:null,pac:[],vault:null,saloon:null,hotel:null,smith:null,rooms:{},props:[],seats:[],posts:[]};
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
 const BD=WBD.map(b=>Object.assign({},b,{dr:b.dr.slice()}));
 for(const b of BD){const N0=b.sd=='n',fy=N0?SY0-2:SY1+2,by=N0?fy-8:fy+8,y0=Math.min(fy,by),y1=Math.max(fy,by),bwy=N0?SY0-1:SY1+1;
  b.fy=fy;b.by=by;b.y0=y0;b.y1=y1;b.ix0=b.x0+1;b.ix1=b.x1-1;b.iy0=y0+1;b.iy1=y1-1;b.bwy=bwy;W.b.push(b);W.rooms[b.k]=b;
  const SIDE=tid({k:'side',sc:b.sc,tc:b.tc,wp:b.wp}),fw=b.x1-b.x0+1;
  /* the boardwalk in front, raised a little */
  open(b.x0,bwy,b.x1,bwy,3,.08);
  for(let x=b.x0;x<=b.x1;x++)for(let y=y0;y<=y1;y++){const fr=y==fy,edge=x==b.x0||x==b.x1||y==y0||y==y1;
   if(!edge){open(x,y,x,y,b.fl);CMASK[at(x,y)]=1;RFH[at(x,y)]=1.85;continue}
   if(fr){/* the sign is painted a slice per cell, left to right as you face the building: on the south side that is from the east end */const ix=N0?x-b.x0:b.x1-x;wall(x,y,tid({k:'front',b:b.k,i:ix,w:fw,sc:b.sc,tc:b.tc,wp:b.wp,nm:b.nm,dr:b.dr.includes(x+1)||b.dr.includes(x-1)?1:0,pst:b.k=='sheriff'&&x==b.dr[0]+2?1:0}),2)}
   else wall(x,y,SIDE,1.85)}
  for(const dx of b.dr){const i=at(dx,fy);open(dx,fy,dx,fy,b.fl);CMASK[i]=1;RFH[i]=2;/* 0.9.313: the doorway is a storey tall; above it the false front (and its sign) carries on */W.doors.push({i,sd:b.sd,id:tid({k:'front',b:b.k,i:N0?dx-b.x0:b.x1-dx,w:fw,sc:b.sc,tc:b.tc,wp:b.wp,nm:b.nm,dr:0,pst:0})})}
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
 /* the boot hill graveyard in the north-west corner: a fence with a gate on the town side, rows of graves, one dug open */
 {const x0=2,x1=10,y0=5,y1=10;open(x0,y0,x1,y1,1);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){if(x>x0&&x<x1&&y>y0&&y<y1)continue;if(y==y1&&x==6)continue;wall(x,y,FENCE,.62)}
  const og=[7,9],i=at(og[0],og[1]);FH[i]=-.42;ct[i]=12;W.grave={x0,x1,y0,y1,open:og,stones:[[3,6],[5,6],[7,6],[9,6],[3,8],[5,8],[7,8],[9,8]]}}
 /* the old mine cave in the south-east corner: a block of rock with a winding tunnel cut through it, lined with explosive traps, a chamber at the end */
 {for(let y=40;y<=50;y++)for(let x=35;x<=50;x++){if(x<0||y<0||x>=n||y>=n)continue;const i=at(x,y);g[i]=MESA;WHM[i]=3.4+wHash(x,y,41)*1.1;CMASK[i]=0;RFH[i]=0;ct[i]=0;FH[i]=0}
  const path=[[44,40],[44,41],[44,42],[44,43],[45,43],[46,43],[47,43],[47,44],[47,45],[47,46],[46,46],[45,46],[44,46],[43,46],[42,46],[41,46]],cham=[];for(let y=43;y<=47;y++)for(let x=37;x<=40;x++)cham.push([x,y]);
  W.caveSet=new Set();for(const[x,y]of path.concat(cham)){const i=at(x,y);g[i]=0;ct[i]=13;FH[i]=0;CMASK[i]=1;RFH[i]=3.4+wHash(x,y,42)*.8;WHM[i]=0;W.caveSet.add(i)}
  W.cave={path,cham,ent:[44,40],traps:[[44,41,'w','y'],[46,43,'p','x'],[47,45,'w','y'],[45,46,'p','x'],[43,46,'w','x'],[42,46,'p','x'],[41,46,'w','x']],chests:[[37,43],[37,45],[37,47]]}}
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
 if(wAlien()&&typeof alnGlyphs=='function'){const seed=[...b.nm].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7);g.lineWidth=1.6;alnGlyphs(g,sx+8,sy+6,sw-16,sh-12,seed,wcss(fg));return}
 let txt=b.nm,ic=0;if(b.k=='sheriff')ic=1;if(b.k=='smith')ic=2;if(b.k=='under')ic=3;if(b.k=='livery')txt='LIVERY & FEED';
 const icw=ic?30:0;g.textAlign='center';g.textBaseline='middle';let fs=24;const fnt=s=>`bold ${s}px Georgia, "Times New Roman", serif`;g.font=fnt(fs);while(g.measureText(txt).width>sw-16-icw&&fs>8){fs--;g.font=fnt(fs)}
 const tx=sx+sw/2+icw/2,ty=sy+sh/2+1;g.fillStyle=wcss(wdk(bg,.55));g.fillText(txt,tx+1.2,ty+1.2);g.fillStyle=wcss(fg);g.fillText(txt,tx,ty);
 const ix=sx+18,iy=sy+sh/2;
 if(ic==1){g.fillStyle='#d8b040';g.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k&1?5:12;g.lineTo(ix+Math.cos(a)*r,iy+Math.sin(a)*r)}g.closePath();g.fill();g.fillStyle='#8a6a20';g.beginPath();g.arc(ix,iy,3,0,7);g.fill()}
 if(ic==2){g.save();g.translate(ix,iy);for(const s of[-1,1]){g.save();g.rotate(s*.6);g.fillStyle='#3a3a44';g.fillRect(-12,-2,18,4);g.fillStyle='#6a4a2a';g.fillRect(4,-1,6,9);g.restore()}g.restore()}
 if(ic==3){g.fillStyle='#5a3a28';g.beginPath();g.moveTo(ix-4,iy-12);g.lineTo(ix+4,iy-12);g.lineTo(ix+7,iy-5);g.lineTo(ix+4,iy+12);g.lineTo(ix-4,iy+12);g.lineTo(ix-7,iy-5);g.closePath();g.fill();g.fillStyle='#c8c0b0';g.fillRect(ix-.8,iy-8,1.6,9);g.fillRect(ix-3.5,iy-5,7,1.6)}
 if(b.k=='saloon'){g.fillStyle=wcss(fg);for(const x of[sx+10,sx+sw-10]){g.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k&1?2:4.6;g.lineTo(x+Math.cos(a)*r,iy+Math.sin(a)*r)}g.closePath();g.fill()}}}
function wPoster(g,o){/* the wanted poster: the outlaw's face from his own model, his name and the reward; every line is sized to fit inside the paper */
 g.save();g.translate(32,31);g.rotate(-.03);const PW=40,PH=54,hw=PW/2,hh=PH/2;g.fillStyle='#e8d6a8';g.fillRect(-hw,-hh,PW,PH);g.fillStyle='rgba(120,90,50,.22)';g.fillRect(-hw,hh-7,PW,7);g.fillRect(-hw,-hh,4,PH);
 g.fillStyle='#2a1a12';g.textAlign='center';g.textBaseline='middle';
 const fit=(t,y,mx,max)=>{let f=mx;g.font='bold '+f+'px Georgia, serif';while(f>2.2&&g.measureText(t).width>max){f-=.2;g.font='bold '+f+'px Georgia, serif'}g.fillText(t,0,y)};
 const AL=wAlien()&&typeof alnGlyphs=='function';if(AL){const gl=(y,h,sd)=>alnGlyphs(g,-hw+4,y-h/2,PW-8,h,sd,'#2a1a12');gl(-hh+6,8,11)}else fit('WANTED',-hh+6,9,PW-5);
 g.fillStyle='#bca478';g.fillRect(-12,-hh+11,24,20);if(o.face)try{g.drawImage(o.face,-12,-hh+11,24,20)}catch(e){}g.strokeStyle='#2a1a12';g.lineWidth=.7;g.strokeRect(-12,-hh+11,24,20);g.fillStyle='#2a1a12';
 if(AL){alnGlyphs(g,-hw+5,-hh+32,PW-10,5,23,'#2a1a12');alnGlyphs(g,-hw+4,-hh+39,PW-8,5,(o.name||'').length*97+5,'#2a1a12');alnGlyphs(g,-hw+7,-hh+46,PW-14,6,41,'#2a1a12')}else{fit('DEAD OR ALIVE',-hh+35,4.6,PW-6);const nm=(o.name||'').toUpperCase().replace(/"/g,'');fit(nm,-hh+41.5,4.4,PW-5);fit('$'+(o.reward||25)+' REWARD',-hh+48.5,6,PW-6)}
 g.fillStyle='#6a5a44';g.fillRect(-1,-hh,2,2);g.restore()}
function wFront(d,up,face){/* one cell of a building's street front: the first storey (windows, lamps, the poster) or the false front above it (the sign) */
 const b=WBD.find(x=>x.k==d.b),s0=Math.max(1,Math.floor((d.w-Math.min(d.w-2,7))/2)),s1=d.w-1-s0,inS=d.i>=s0&&d.i<=s1,sd=up&&!inS?d.b.length*3:d.i*17+d.b.length*3;
 if(!up)return mkT(g=>{wSiding(g,b,sd);if(d.pst){wPoster(g,{face,name:WEST.out.name,reward:WEST.out.reward});return}
  if(d.dr){/* beside the door: a lantern on a bracket */g.fillStyle='#2a2420';g.fillRect(28,12,8,2);g.fillRect(31,12,2,6);g.fillStyle='#3a3430';g.fillRect(28,18,8,12);g.fillStyle='#ffcc66';g.fillRect(29.5,19.5,5,9);g.fillStyle='#3a3430';g.fillRect(27,17,10,2);g.fillRect(27,29,10,2);return}
  const wide=d.b=='store'||d.b=='smith'||d.b=='bank'||d.b=='livery';if(d.i==0||d.i==d.w-1)return;
  if(d.b=='livery'){g.fillStyle='#e8e0cc';g.fillRect(4,10,56,3);g.fillRect(4,10,3,46);g.fillRect(57,10,3,46);g.beginPath();g.moveTo(7,13);g.lineTo(57,53);g.lineTo(57,56);g.lineTo(7,16);g.fill();return}
  if(wide)wWin(g,8,10,48,34,b.tc,{six:1,lit:d.b!='bank'&&(d.i%2==0)});else wWin(g,16,10,32,30,b.tc,{curt:d.b=='saloon'?[150,30,40]:d.b=='hotel'?[230,220,190]:null,lit:d.b=='saloon'})});
 return mkT(g=>{wPlanks(g,0,64,b.sc,sd+5,{nails:1});/* the cornice along the top of the false front */g.fillStyle=wcss(b.tc);g.fillRect(0,0,64,7);g.fillStyle=wcss(wdk(b.tc,.6));for(let x=2;x<64;x+=6)g.fillRect(x,7,3,3);g.fillRect(0,10,64,1.2);
  if(inS){g.save();g.translate(-(d.i-s0)*64,0);wSignBoard(g,(s1-s0+1)*64,b);g.restore()}
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
 F.grave=mkT(g=>{g.fillStyle='#5a4030';g.fillRect(0,0,64,64);const r=wRng(91);for(let i=0;i<90;i++){g.fillStyle=r()<.5?'rgba(40,26,18,.5)':'rgba(130,100,70,.4)';g.fillRect(r()*64,r()*64,1+r()*3,1+r()*2)}for(let i=0;i<5;i++){g.strokeStyle='rgba(30,20,14,.6)';g.lineWidth=.8;g.beginPath();const y=r()*64;g.moveTo(0,y);g.lineTo(64,y+r()*6-3);g.stroke()}});
 F.cave=mkT(g=>{g.fillStyle='#6a4a3a';g.fillRect(0,0,64,64);const r=wRng(57);for(let i=0;i<26;i++){const x=r()*64,y=r()*64,s=3+r()*7;g.fillStyle=`rgb(${90+r()*30|0},${64+r()*22|0},${50+r()*18|0})`;g.beginPath();g.ellipse(x,y,s,s*.7,r()*3,0,7);g.fill()}for(let i=0;i<60;i++){g.fillStyle='rgba(30,18,12,.5)';g.fillRect(r()*64,r()*64,1.5,1.5)}});
 return F}
function westTex(h){const W=WEST;if(!W)return;const k='w'+TSZ+(window.ANIME&&ANIME.on?'a':'')+(wAlien()?'x':'');if(!WTXC||WTXC.k!==k)WTXC={k,F:null,m:{}};if(!WTXC.F)WTXC.F=wFloorTex();const C=WTXC,F=C.F,M=C.m;
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
  else if(d.k=='front'){const kl=wLoKey(d);lo=d.pst?wFront(d,0,face):memo(kl,()=>wFront(d,0,null));up=memo(wUpKey(d),()=>wFront(d,1));inn=memo('wp'+d.wp,()=>mkT(g=>wWallpaper(g,d.wp,d.sc[1])))}
  TXa.push(lo);TUa.push(up);TINa.push(inn)}
 TX=TXa;TU=TUa;TIN=TINa;RT=memo('riser',()=>mkT(g=>wPlanks(g,0,64,[150,108,70],7,{clean:1})));
 CT=[null,F.road,F.sand,F.boards,F.saloon,F.hotel,F.bank,F.jail,F.store,F.barn,F.vault,F.sand2,F.grave,F.cave];FT=F.sand;RTS={0:F.grave};
 const roof=memo('roof',()=>mkT(g=>{g.fillStyle='#5a4a42';g.fillRect(0,0,64,64);for(let y=0;y<64;y+=8)for(let x=((y/8)&1)*5;x<64;x+=10){g.fillStyle=`rgb(${88+(x*7+y)%20},${70+(x*3+y)%16},${58+(x+y)%14})`;g.fillRect(x,y,9,7.4)}}));
 const ceil=memo('ceil',()=>mkT(g=>{wBoards(g,0,64,0,64,[128,92,60],23,8);g.fillStyle='#4a3424';g.fillRect(0,26,64,10);g.fillStyle='#5e4430';g.fillRect(0,27,64,3)}));
 CEIL=[ceil,ceil];RAILV={vault:ceil,rock:roof,portal:memo('portal',()=>mkT(g=>wPlanks(g,0,64,[150,120,90],15,{nails:1})))}
 westLook()}
/* textures are kept for the whole session (they depend only on the fixed buildings), keyed by what they show: a slice of a sign, or the plain left/middle/right of a false front */
function wUpKey(d){const s0=Math.max(1,Math.floor((d.w-Math.min(d.w-2,7))/2)),s1=d.w-1-s0;return 'up'+d.b+(d.i>=s0&&d.i<=s1?d.i:d.i==0?'L':d.i==d.w-1?'R':'M')}
function wLoKey(d){return 'fl'+d.b+(d.dr?'d':(d.i==0||d.i==d.w-1)?'e':'w')}
/* every texture the town will need, as [key, maker] jobs */
function westTexJobs(){const J=[];const k='w'+TSZ+(window.ANIME&&ANIME.on?'a':'')+(wAlien()?'x':'');
 for(const b of WBD){const w=b.x1-b.x0+1;for(let x=b.x0;x<=b.x1;x++){const d={k:'front',b:b.k,i:x-b.x0,w,sc:b.sc,tc:b.tc,wp:b.wp,nm:b.nm,dr:b.dr.includes(x+1)||b.dr.includes(x-1)?1:0,pst:0};const N0=b.sd=='n';d.i=N0?x-b.x0:b.x1-x;J.push([wUpKey(d),()=>wFront(d,1)]);J.push([wLoKey(d),()=>wFront(d,0,null)])}
  J.push(['side'+b.sc+b.wp,()=>mkT(g=>wSiding(g,{sc:b.sc},b.sc[0]))]);J.push(['wp'+b.wp,()=>mkT(g=>wWallpaper(g,b.wp,b.sc[1]))])}
 return{k,J}}
/* made ahead: while the player is picking a power before a Frontier Town floor, the textures are made a few at a time so entering the town doesn't stall */
let WWARM=null;
function westWarm(){if(WWARM)return;let jobs;try{jobs=westTexJobs()}catch(er){return}if(!WTXC||WTXC.k!==jobs.k)WTXC={k:jobs.k,F:null,m:{}};const C=WTXC,J=jobs.J;let i=0;WWARM=1;
 const step=()=>{if(!WTXC||WTXC!==C){WWARM=null;return}const t0=performance.now();if(!C.F){C.F=wFloorTex()}while(i<J.length&&performance.now()-t0<12){const[key,f]=J[i++];if(!C.m[key])try{C.m[key]=f()}catch(er){}}if(i<J.length)setTimeout(step,8);else WWARM=null};setTimeout(step,30)}
/* the outlaw's face for the poster: the head of his own drawn figure, from the front */
function wFace(e){const sp=e.fr.spec,img=hmRender(sp,0,0);const S=Math.round(Math.sqrt(img.length));const c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const id=x.createImageData(S,S);new Uint32Array(id.data.buffer).set(img);x.putImageData(id,0,0);
 const o=document.createElement('canvas');o.width=40;o.height=34;const q=o.getContext('2d');q.fillStyle='#bca478';q.fillRect(0,0,40,34);q.imageSmoothingEnabled=true;const hs=S*.3;q.drawImage(c,S/2-hs/2,0,hs,hs*.85,0,0,40,34);
 const d=q.getImageData(0,0,40,34),a=d.data;for(let i=0;i<a.length;i+=4){const l=(a[i]*.3+a[i+1]*.59+a[i+2]*.11);a[i]=Math.min(255,l*.9+40);a[i+1]=Math.min(255,l*.78+30);a[i+2]=Math.min(255,l*.55+18)}q.putImageData(d,0,0);return o}

/* ---------------- the props (numbered from 3000, drawn by drawProp; collision from their exact pieces like every other prop) ---------------- */
let WESTM=null;
function westMeshes(){const b=westMeshes0();return wAlien()?(WESTMA||(WESTMA=wAlienKit(wAlienMesh(b)))):b}
function westMeshes0(){if(WESTM)return WESTM;const M=[],B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a);
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

 /* 24 a dartboard on the wall (-z), three darts in it */
 {const m=f();m.push(...B(0,.78,-.47,.5,.5,.04,WD2),...C(0,.78,-.45,.21,.02,[34,30,30],{ax:'z',n:16}),...C(0,.78,-.43,.17,.012,[232,220,190],{ax:'z',n:16}),...C(0,.78,-.42,.12,.012,[44,120,64],{ax:'z',n:14}),...C(0,.78,-.41,.08,.012,[232,220,190],{ax:'z',n:12}),...C(0,.78,-.4,.04,.012,[190,40,40],{ax:'z',n:10}),...C(0,.78,-.39,.015,.012,[34,30,30],{ax:'z',n:8}));
  for(const[x,y]of[[.05,.82],[-.07,.74],[.02,.7]])m.push(...B(x,y,-.34,.012,.012,.1,[210,210,220]),...B(x,y,-.28,.03,.03,.02,[220,60,50]));M.push(m)}
 /* 25-27 a hotel room door with its number (a little brass plate, the digit in seven bars), the frame and the transom over it */
 const SEG={1:'bc',2:'abged',3:'abgcd'};
 for(const num of[1,2,3]){const m=f(),DW=[128,82,50],DW2=[96,60,36];m.push(...B(0,1.55,0,1.0,.6,.14,[150,110,76]),...B(-.47,.62,0,.06,1.24,.16,DW2),...B(.47,.62,0,.06,1.24,.16,DW2),...B(0,1.26,0,1.0,.05,.16,DW2),...B(0,.62,0,.88,1.22,.06,DW));
  for(const[y,h]of[[.95,.42],[.36,.46]])for(const x of[-.2,.2])m.push(...B(x,y,.035,.3,h,.012,DW2));m.push(...C(.34,.58,.04,.03,.04,BR,{ax:'z',n:8}));
  const px=0,py=.98;m.push(...B(px,py,.052,.22,.3,.014,BR),...B(px,py,.046,.26,.34,.01,DW2));const K=1.5,sg={a:[0,.07*K,.08*K,.02],b:[.035*K,.035*K,.02,.07*K],c:[.035*K,-.035*K,.02,.07*K],d:[0,-.07*K,.08*K,.02],e:[-.035*K,-.035*K,.02,.07*K],f:[-.035*K,.035*K,.02,.07*K],g:[0,0,.08*K,.02]};
  for(const k of SEG[num]){const q=sg[k];m.push(...B(px+q[0],py+q[1],.061,q[2],q[3],.006,[40,26,18]))}M.push(m)}
 /* 28 what is left of a kicked-in door: the frame, the transom, a splintered strip on the hinge side */
 {const m=f(),DW=[128,82,50],DW2=[96,60,36];m.push(...B(0,1.55,0,1.0,.6,.14,[150,110,76]),...B(-.47,.62,0,.06,1.24,.16,DW2),...B(.47,.62,0,.06,1.24,.16,DW2),...B(0,1.26,0,1.0,.05,.16,DW2),...B(-.38,.5,.2,.12,.9,.05,DW,{ry:-.9,rz:.05}),...B(-.2,.04,.3,.3,.04,.12,DW,{ry:.6}),...B(.15,.03,.25,.22,.03,.1,DW2,{ry:-.3}));M.push(m)}

 /* 29 a headstone (the face toward +z) */
 {const m=f(),ST=[150,146,140],ST2=[110,106,102];m.push(...B(0,.27,-.25,.42,.54,.1,ST),...C(0,.54,-.3,.21,.1,ST,{ax:'z',n:12}),...B(0,.04,-.22,.52,.08,.18,ST2),...B(0,.42,-.199,.04,.2,.004,[70,66,64]),...B(0,.46,-.198,.14,.04,.004,[70,66,64]),...B(0,.2,-.199,.26,.03,.004,[90,86,84]),...B(0,.14,-.199,.2,.03,.004,[90,86,84]));M.push(m)}
 /* 30 a wooden grave marker */
 {const m=f(),WW=[120,92,64];m.push(...B(0,.38,-.25,.06,.76,.06,WW,{rz:.06}),...B(0,.58,-.25,.34,.06,.06,WW,{rz:.06}),...B(0,.04,-.25,.2,.08,.2,[100,76,56]));M.push(m)}
 /* 31 a grave's mound of earth */
 {const m=f(),DT=[118,88,60];m.push(...B(0,.05,.05,.46,.1,.84,DT),...B(0,.11,.05,.34,.05,.7,[132,100,70]));M.push(m)}
 /* 32 the earth dug out of the open grave, a shovel stuck in it */
 {const m=f(),DT=[118,88,60];m.push(...C(0,0,0,.36,.22,DT,{ax:'y',n:8,r2:.12}),...C(.1,0,.12,.22,.14,[132,100,70],{ax:'y',n:7,r2:.06}),...B(-.05,.45,0,.03,.6,.03,WD,{rz:.25}),...B(.03,.12,0,.13,.18,.02,IR,{rz:.25}),...B(-.12,.74,0,.12,.03,.03,WD,{rz:.25}));M.push(m)}

 /* 33 a tripwire across the cell (along x), a stake at each end */
 {const m=f();for(const x of[-.46,.46])m.push(...B(x,.12,0,.04,.24,.04,WD2));m.push(...B(0,.17,0,.92,.008,.008,[200,200,190]));M.push(m)}
 /* 34 a bundle of dynamite against the wall (-z), the fuse hanging down */
 {const m=f(),Y=.6;for(const[x,y]of[[-.06,Y-.03],[.06,Y-.03],[0,Y+.03]])m.push(...C(-.11,y,-.42+x*.3,.035,.22,[196,40,36],{ax:'x',n:6}));m.push(...B(0,Y,-.4,.05,.1,.12,[214,196,150]),...B(.13,Y-.12,-.4,.008,.2,.008,[40,34,30]),...B(0,Y,-.46,.32,.2,.03,[90,70,50]));M.push(m)}
 /* 35 a pressure plate, a little raised */
 {const m=f();m.push(...B(0,.015,0,.52,.03,.52,[96,86,78]),...B(0,.035,0,.42,.012,.42,[118,108,98]),...B(.12,.043,-.05,.18,.004,.02,[60,52,48],{ry:.5}));M.push(m)}
 /* 36 the timber frame at a mine entrance (faces +z) */
 {const m=f(),TB=[112,80,52];for(const x of[-.44,.44])m.push(...B(x,.9,.42,.12,1.8,.12,TB));m.push(...B(0,1.78,.42,1.04,.14,.16,TB),...B(.2,1.62,.5,.36,.12,.02,[214,196,150],{rz:-.05}),...B(.2,1.62,.51,.2,.03,.005,[160,40,36],{rz:-.05}));M.push(m)}

 /* 37 the roulette table (0.9.334: the whole layout, see roulCells) */
 M.push(roulTableMesh(false));
 /* 38 the piano stool: a round padded seat on a turned post */
 {const m=f();m.push(...C(0,0,0,.12,.02,WD3,{ax:'y',n:8}),...C(0,.02,0,.03,.2,WD2,{ax:'y',n:6}),...C(0,.21,0,.13,.04,[110,30,34],{ax:'y',n:10}),...C(0,.25,0,.125,.012,[140,44,46],{ax:'y',n:10}));M.push(m)}
 return WESTM=M}
/* the moving things: the stagecoach and its two horses, the tumbleweed (and a burning one) */
let WESTMV=null;
function westMov(){const b=westMov0();if(!wAlien())return b;if(!b.__a){const a=Object.fromEntries(Object.entries(b).filter(([k])=>k!='__a').map(([k,v])=>[k,wAlienMesh([v])[0]]));Object.assign(a,wAlienMov());b.__a=a}return b.__a}
function westMov0(){if(WESTMV)return WESTMV;const B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a),RD=[170,40,36],RD2=[120,26,24],YL=[226,180,70],BK=[34,30,30],WD=[104,66,40];
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
 /* the roulette wheel: a wooden bowl, a ring of red and black pockets (and the green zero), the silver turret in the middle */
 const rwh=[],RRD=[176,30,36],BKc=[26,24,28];rwh.push(...C(0,0,0,.22,.05,[96,60,36],{ax:'y',n:18}),...C(0,.05,0,.2,.012,[150,104,62],{ax:'y',n:18}));for(let k=0;k<37;k++){const a=k/37*6.2832,n=WSEQ[k];rwh.push(...B(Math.cos(a)*.15,.064,Math.sin(a)*.15,.024,.006,.05,n==0?[40,150,70]:WR_RED.has(n)?RRD:BKc,{ry:-a}),...B(Math.cos(a+.085)*.15,.07,Math.sin(a+.085)*.15,.004,.012,.05,[200,190,170],{ry:-a-.085}))}
 rwh.push(...C(0,.06,0,.09,.01,[120,80,50],{ax:'y',n:12}),...C(0,.07,0,.02,.06,[210,214,224],{ax:'y',n:6}));for(let k=0;k<4;k++)rwh.push(...B(0,.12,0,.12,.012,.012,[210,214,224],{ry:k*.785}));
 return WESTMV={coach,horse,tw,twf,wheel:rwh}}

/* ---------------- the people ---------------- */
const WSHIRT=[[176,58,48],[60,90,140],[206,186,146],[96,116,72],[150,116,84],[226,214,190],[120,60,96],[70,70,80]],WPANTS=[[70,88,126],[104,82,60],[44,42,48],[120,104,80]],WHATC=[[166,112,62],[96,72,52],[44,38,36],[206,184,150],[120,96,80]];
/* someone from the town: a person with a western gun and western clothes. o: {gun, hat, hatc, cl, pn, band, ponch, nm} */
function westHuman(x,y,o){o=o||{};const e=genHuman(x,y,fl);const gun=o.gun||pk(['pistol','pistol','shotgun','rifle']);
 if(e.melee){e.melee=0;e.swD=0;e.melr=0;e.spd/=1.18;e.dmg/=1.2;e.traits=e.traits.map(t=>t=='brawler'?'shooter':t)}
 e.gun=gun;e.traits[0]=gun;const sp=e.fr.spec;sp.gun=gun;sp.gm=null;sp.m3=null;sp.c={};
 sp.hat=o.hat!==undefined?o.hat:pk([3,3,3,3,102,0]);sp.hatc=o.hatc||pk(WHATC);sp.cl=o.cl||pk(WSHIRT);sp.pn=o.pn||pk(WPANTS);if(o.band)sp.band=o.band;if(o.ponch)sp.ponch=o.ponch;if(o.vest!==false&&R()<.5)sp.vest=pk([[60,44,36],[40,40,46],[96,70,44]]);
 if(wRuin()){for(const k of['cl','pn','hatc'])if(sp[k])sp[k]=sp[k].map(v=>v*.62+30)}
 /* 0.9.329: past floor 25 the townsfolk are aliens of the home world, the alien shopkeeper's people: pearl skin, a big egg head with glowing teal eyes,
    a floating ring of light instead of a hat, and lavender robes (spec.aln; hmGeo draws the head) */
 if(wAlien()){sp.aln=1;sp.hat=0;sp.cape=0;delete sp.band;delete sp.ponch;delete sp.vest;sp.sk=pk([[225,220,250],[232,226,252],[218,214,246]]);
  sp.cl=pk([[150,115,240],[138,104,228],[164,128,246],[200,185,250]]);sp.pn=pk([[130,96,215],[118,88,200],[146,112,226]]);sp.dk=[96,70,170];sp.hair=sp.sk}
/* 0.9.330: on the alien world every name is written in the alien glyphs (wNm) */
 if(wAlien()&&!o.nm)e.name=pk(o.pas?['Settler','Drifter','Trader','Prospector','Watcher','Herder']:['Raider','Gunner','Marauder','Rustler','Reaver','Hired Gun'])+' '+pk(['Zyx','Ql\'orr','Vael','Xunn','Ozzik','Threm','Iyyo','Krell','Nuu\'ta','Sarrq','Ylo','Phex']);
 else if(o.nm)e.name=o.nm;else e.name=pk(o.pas?['Rancher','Cowpoke','Prospector','Card Sharp','Cattleman','Homesteader','Townsman','Mule Skinner']:['Outlaw','Gunslinger','Desperado','Bandit','Rustler','Hired Gun','Drifter'])+' '+pk(['Jed','Clem','Rufus','Hank','Silas','Zeke','Amos','Wade','Earl','Cole','Luke','Boone']);
 if(wAlien())e.name=wNm(e.name);return e}
/* a seated version of someone's figure (the same look, sitting, hands on the table) */
function westSitFr(fr){const sp=Object.assign({},fr.spec,{sit:1,gm:null,m3:null,c:{},av:null}),f=[];for(let ph=0;ph<4;ph++){let v=null;Object.defineProperty(f,ph,{get:()=>v||(v=hmRender(sp,ph,0)),enumerable:true})}f.spec=sp;return f}
function westSpawn(){const W=WEST;if(!W)return;const n=N,ok=(x,y)=>!g[(y|0)*n+(x|0)]&&!(W.caveSet&&W.caveSet.has((y|0)*n+(x|0)));
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
  for(const[tx,ty,chs]of s.tb)for(const[cx,cy,sit]of chs){if(!sit)continue;const e=westHuman(cx+.5,cy+.5,{vest:R()<.6,pas:1});e.fa=Math.atan2(ty-cy,tx-cx);e.frS=e.fr;e.fr=westSitFr(e.fr);e.sit=1;pas(e,'saloon')}
  {const e=westHuman(X+.5,Y+PNO_Y,{hat:102,hatc:[40,36,34],cl:[236,230,214],pn:[40,38,44],nm:'Piano Player'});e.fa=-Math.PI/2;e.frS=e.fr;e.fr=westSitFr(e.fr);e.sit=1;e.piano=1;pas(e,'saloon');W.pianist=e}
  {const e=westHuman(s.bar.x+1.5,Y+2.5,{gun:'shotgun',hat:0,cl:[236,232,220],pn:[40,40,46],nm:'Bartender'});e.fa=Math.PI;pas(e,'saloon')}
  {const e=westHuman(s.bar.x-.45,Y+1.2,{gun:'pistol',hat:101,hatc:[30,28,30],cl:[60,46,40],pn:[52,50,58],band:[176,36,40],ponch:[[178,64,40],[236,190,90],[60,90,120]],nm:'McCassidy'});e.fa=0;e.jack=1;e.hp*=2.2;e.mhp=e.hp;e.dmg*=1.3;e.sc=.9;pas(e,'saloon');W.jack=e}
  /* the dart player in the front corner by the bar: for hire */
  {const bx=s.ix1,by=s.iy1-1,e=westHuman(bx-2.4,by+.5,{gun:'rifle',hat:3,hatc:[120,84,56],cl:[90,110,140],pn:[70,62,54],nm:ALLY_NAME});e.fa=0;e.darts=1;e.shd=0;e.fr.spec.pw=[];e.fr.spec.ng=1;e.traits=['rifle','shooter'];e.dT=rr(1,2.5);pas(e,'saloon');W.darts=e;W.dboard={x:bx,y:by}}}
 /* the gunsmith behind his counter */
 {const s=W.smith,e=westHuman(s.ix0+2.5,s.iy0+4.5,{gun:'rifle',hat:0,cl:[150,120,90],pn:[60,54,50],nm:'Gunsmith'});e.fa=-Math.PI/2;e.pac=1;e.grp='smith';e.aggro=0;W.pac.push(e);E.push(e);W.smithE=e}
 /* the storekeeper behind his counter */
 {const b=W.rooms.store,e=westHuman(b.ix0+2.5,b.iy0+4.5,{gun:'shotgun',hat:102,hatc:[60,52,46],cl:[226,220,200],pn:[70,64,58],nm:'Storekeeper'});e.vest=0;if(!wAlien())e.fr.spec.vest=[96,40,40];e.fa=-Math.PI/2;e.pac=1;e.grp='store';e.aggro=0;W.pac.push(e);E.push(e);W.storeE=e}
 /* the townsfolk carry none of the fighters' powers (no shield bubbles in the saloon) */
 for(const e of W.pac){e.shd=0;e.rev=0;e.ls=0;e.traits=[e.gun,'shooter'];for(const f of[e.fr,e.frS])if(f&&f.spec){f.spec.pw=[];f.spec.gm=null;f.spec.m3=null;f.spec.c={}}}}
/* a passive person this frame: stays put, looks where they look; true while passive (aiStep stops there) */
function westPas(e,dt){if(!e.pac)return false;e.af=0;if(e.darts){westDarts(e,dt);return true}if(e.jack&&WEST&&WEST.duel)return duelJack(e,dt);
 /* 0.9.326: the townsfolk keep to what they are doing: nobody turns to watch the player */
 return true}
/* the group wakes up: everybody in it stands up and fights */
function westWake(e,quiet){const W=WEST;if(!W||!e||!e.pac)return;const grp=e.grp;let any=0;for(const o of W.pac){if(!o.pac||o.dead||o.grp!==grp)continue;o.pac=0;o.aggro=1;if(o.sit){o.sit=0;if(o.frS)o.fr=o.frS}o.cd=rr(.4,1.1);any=1}
 if(any&&!quiet){if(grp=='saloon'){wMsg('SALOON BRAWL!',2.4);snd(220,.5,'sawtooth',.06,-120);for(let i=0;i<3;i++)setTimeout(()=>snd(600+Math.random()*400,.08,'square',.04,-300),i*90)}else if(grp=='store')wMsg('The storekeeper reaches for his scattergun!',2.2);else wMsg('The gunsmith pulls a rifle!',2.2)}
 if(!W.netIn&&typeof CO=='function'&&CO())try{netSend({t:'wwk',fl,g:grp})}catch(er){}}

/* ---------------- co-op (0.9.338) ----------------
   Everyone's game builds the same town (the same seeded dice). The host's game owns the people in it, like every other monster; on top of that:
   a wake-up (a brawl) goes from whoever starts it to everyone (wwk); a hit on a door, the vault or a dynamite stick goes to the host, who keeps the
   count and tells everyone (wbd / wbh); a trap set off (wtp), a sack of gold picked up (wgd) and the wanted man flushed out (wof) go to everyone;
   the host starts and parks the stagecoach (wco; a guest who spooks it asks, wcg); a duel is fought by one player at a time, in their own game,
   with McCassidy brought out into the street by the host and the rest of the town holding its breath until it is over (wdl). The shops, the
   roulette wheel and the piano are each player's own; Dusty won't hire on with a posse. */
function wNet(t,o){try{if(typeof CO=='function'&&CO()&&!(WEST&&WEST.netIn))netSend(Object.assign({t,fl},o))}catch(er){}}
function allyNet(o){if(o.t=='aly'){if(o.fl!==fl)return;const q=RALLY[o.id]||(RALLY[o.id]={own:o.id,name:ALLY_NAME,mhp:ALLY_HP});Object.assign(q,{x:+o.x,y:+o.y,z:+o.z,fa:+o.fa,af:o.af|0,hp:+o.hp,t:T});if(o.sh&&q.h&&T-(q.shS||0)>.3){q.shS=T;snd(240,.12,'sawtooth',.05,-120,q.h)}return}
 if(o.t=='alh'){if(o.fl!==fl||o.to!==myId||!ALLY)return;allyHurt(ALLY,+o.d||0)}}
function westNet(o){const W=WEST;if(!W||o.fl!==fl)return;W.netIn=1;try{const H=typeof HOSTCO=='function'&&HOSTCO();switch(o.t){
 case'wwk':{const e=W.pac.find(q=>q.pac&&!q.dead&&q.grp===o.g);if(e)westWake(e);break}
 case'wrb':{const r=W.roul;if(!r||!r.bets)break;const m={};if(Array.isArray(o.b))for(const[k,v]of o.b)if(typeof k=='string'&&v>0)m[k]=v;r.ob=r.ob||{};r.ob[o.id]=m;r.mv=null;break}
 case'wrs':{if(W.roul&&W.roul.bets)roulGo(o);break}
 case'wpn':{if(!H)PNO.sync={p:+o.p||0,at:AC?AC.currentTime:0};break}
 case'wal':{const d=W.darts;if(d){ALLYFR=d.fr;if(d.fr&&d.fr.spec&&d.fr.spec.ng){const sp=d.fr.spec;sp.ng=0;sp.gm=null;sp.m3=null;sp.c={}}W.pac=W.pac.filter(q=>q!==d);E=E.filter(q=>q!==d);d.dead=1;W.darts=null}RALLY[o.id]={x:d?d.x:0,y:d?d.y:0,z:d?d.z:0,fa:0,af:0,hp:ALLY_HP,mhp:ALLY_HP,t:T,own:o.id,name:ALLY_NAME};break}
 case'wbd':{if(!H)break;const b=W.brk[o.i|0];if(b&&b.hp>0){W.netIn=0;westBrkDmg(b.p,o.d)}break}
 case'wbh':{if(H)break;const b=W.brk[o.i|0];if(!b||b.done)break;b.hp=Math.min(b.hp,o.hp);b.t=T;if(b.hp<=0){b.hp=0;b.done=1;b.on()}break}
 case'wtp':{const t=W.traps&&W.traps[o.i|0];if(t)trapFire(t,o.f,1);break}
 case'wgd':{const p=W.gb&&W.gb[o.i|0];if(p&&!p.taken){p.taken=1;PRP=PRP.filter(q=>q!==p)}break}
 case'wof':{if(!W.outFree){W.outFree=1;const ol=W.outlaw;if(ol&&!ol.dead)ol.aggro=1}break}
 case'wcg':{if(H){W.netIn=0;coachGo('spooked')}break}
 case'wco':{const c=W.coach;if(!c)break;if(o.st=='rear'){if(c.st=='park')coachGo('',1)}else if(o.st=='park'&&c.st!='park'){c.st='park';c.t=0;c.wait=1e9}break}
 case'wdl':{const j=W.jack;if(o.st=='go'){W.duelOn=T;if(H&&j&&!j.dead&&j.pac){j.x=28.5;j.y=W.SY0+2.5;j.fa=Math.PI;j.tx=j.x;j.ty=j.y}}
  else if(o.st=='won'){W.duelDone=1;if(H&&j&&!j.dead){j.pac=0;j.hp=0;kill(j)}}
  else if(o.st=='lost'){W.duelDone=1}
  else if(o.st=='foul'){W.duelDone=1;if(j&&!j.dead){j.pac=0;j.grp='jack';j.aggro=1}}
  else if(o.st=='end'){W.duelOn=0;if(H&&j&&!j.dead&&j.pac){const s=W.saloon;j.x=s.bar.x-.45;j.y=s.iy0+1.2;j.fa=0}}break}}}catch(er){console.error(er)}finally{W.netIn=0}}
/* a deputy of the posse, built the same in every game from its seed (the host sends the seed with the monster) */
function westDeputy(x,y){const e=westHuman(x+rr(-.3,.3),y+rr(-.3,.3),{gun:pk(['rifle','shotgun','pistol']),hat:3,hatc:[214,196,160],cl:[110,96,80],pn:[60,60,70],vest:[[40,40,46]],nm:'Deputy '+pk(['Hollis','Pike','Barlow','Tate','McCoy','Briggs','Fenton','Quill'])});e.aggro=1;e.posse=1;e.vest=1;if(SW&&SW.g3d)e.z=FH[(e.y|0)*N+(e.x|0)]||0;return e}
function dynWest(a,sd,x,y){a.nid=NID++;a.pup=0;NIDMAP[a.nid]=a;const d={n:a.nid,x:+x.toFixed(2),y:+y.toFixed(2),z:SW&&a.z!==undefined?+a.z.toFixed(2):0,sd,f:fl,k:0,p:-1,hp:Math.round(a.hp),sc:a.sc,w:1};DYN.push(d);sendDyn([d])}

/* ---------------- the props ---------------- */
function westProps(){const W=WEST;if(!W)return;const n=N,at=(x,y)=>y*n+x;W.gb=[];
 const put=(x,y,m,o)=>{const i=at(x|0,y|0);const p=Object.assign({x:(x|0)+.5,y:(y|0)+.5,t:PS[0],s:.62,fl:0,fb:0,cell:i,m:3000+m,yaw:0,h:.6,pr:.35},o||{});if(!(o&&o.nb))blk[i]=1;PRP.push(p);return p};
 const freeC=(x,y)=>{const i=at(x,y);return !g[i]&&!blk[i]&&Math.hypot(x+.5-P.x,y+.5-P.y)>1.5&&Math.hypot(x+.5-ex.x,y+.5-ex.y)>1.2&&!E.some(e=>Math.hypot(e.x-x-.5,e.y-y-.5)<.7)};
 /* porch roofs over the boardwalks; the north side slopes down toward the street (+y), the south side toward -y */
 for(const b of W.b)for(let x=b.x0;x<=b.x1;x++){if(b.k=='livery')continue;if(wRuin()&&wHash(x,b.bwy,61)<.38)continue;put(x,b.bwy,9,{nb:1,yaw:b.sd=='n'?0:Math.PI,h:1.05,pr:.5})}
 /* the saloon: batwing doors, tables and chairs, the bar, the bottles, the piano */
 {const s=W.saloon;for(const dx of s.dr){const left=dx==s.dr[0];put(dx,s.fy,10,{nb:1,x:dx+.5,y:s.fy+.5,yaw:left?0:Math.PI,h:.7,pr:.3})}
  for(const[tx,ty,chs]of s.tb){put(tx,ty,0,{h:.32,pr:.32});for(const[cx,cy,sit]of chs){const yaw=Math.atan2(tx-cx,ty-cy);put(cx,cy,1,{nb:!!sit,yaw,h:.5,pr:.2})}}
  for(let y=s.bar.y0;y<=s.bar.y1;y++)put(s.bar.x,y,2,{yaw:-Math.PI/2,h:.48,pr:.5});for(let y=s.bar.y0;y<=s.bar.y1;y++)put(s.ix1,y,17,{yaw:-Math.PI/2,h:1.1,pr:.3});
  put(s.piano[0],s.piano[1],3,{yaw:0,h:.7,pr:.45,x:s.piano[0]+.5,y:s.piano[1]+.38});put(s.piano[0],s.piano[1],38,{nb:1,yaw:0,h:.3,pr:.15,x:s.piano[0]+.5,y:s.piano[1]+PNO_Y-.02});
  W.lamps=[[s.ix0+4,s.iy0+3],[s.ix1-3,s.iy1-1]];if(W.dboard)put(W.dboard.x,W.dboard.y,24,{yaw:-Math.PI/2,h:1.1,pr:.3,nb:1});{const rx=s.ix1-1,ry=s.iy1;put(rx,ry,37,{yaw:RYAW,h:.45,pr:.5});W.roul={x:rx+.5,y:ry+.5,a:0,v:0,bets:{},chip:1,st:'idle'}}}
 {const b=W.rooms.sheriff;W.poster={x:b.dr[0]+2.5,y:b.fy+1.3}}
 /* the sheriff's office: the jail bars (one cell door left open), a desk */
 {const b=W.rooms.sheriff;for(const[x,y]of b.jail){if(g[at(x,y)])continue;if(x==b.ix0+1)continue;put(x,y,18,{h:1.5,pr:.5})}put(b.ix1-1,b.iy1-1,0,{h:.32,pr:.32});put(b.ix1,b.iy1-1,1,{yaw:-Math.PI/2,h:.5,pr:.2})}
 /* the hotel: a bed in each room, the desk in the lobby */
 {const h=W.hotel;h.rm.forEach((r,k)=>{put(r.x0,r.y0,16,{yaw:0,h:.4,pr:.5,x:r.x0+.5,y:r.y0+.55});/* the room's door, locked: it has to be broken down */const dp=put(r.door[0],r.door[1],25+k,{yaw:0,h:1.85,pr:.5});r.num=k+1;westBrkAdd(dp,200,'ROOM '+(k+1),0,()=>westDoorBreak(dp,r))});put(h.ix1-1,h.iy1-1,21,{yaw:0,h:.5,pr:.5})}
 /* the gunsmith: the counter, the racks on the back wall */
 {const s=W.smith;for(let x=s.ix0;x<s.ix1;x++)put(x,s.iy0+3,12,{yaw:Math.PI,h:.45,pr:.5});for(let x=s.ix0;x<=s.ix1;x++)put(x,s.iy1,11,{yaw:Math.PI,h:1,pr:.4});W.smithC={x:s.ix0+2.5,y:s.iy0+3.5}}
 /* the bank: desks in the lobby, the vault door, the gold inside */
 {const v=W.vault,b=v.b;W.vd=put(v.x,v.y,13,{yaw:Math.PI,h:1.5,pr:.5});westBrkAdd(W.vd,W_VHP,'VAULT DOOR',1,()=>{W.robbed=1;W.heist={st:'crack',t:0,tk:0};heistStep(0)});put(b.ix0+1,b.iy0+1,21,{yaw:Math.PI,h:.5,pr:.5});put(b.ix1-1,b.iy0+1,21,{yaw:Math.PI,h:.5,pr:.5});
  const gs=[];for(let y=v.inY0;y<=v.inY1;y++)for(let x=b.ix0;x<=b.ix1;x++)if((x!=v.x||y>v.inY0)&&!(y==v.inY1&&(x-b.ix0)%2==0))gs.push([x,y]);for(let i=0;i<5&&gs.length;i++){const[x,y]=gs.splice(ri(0,gs.length-1),1)[0];W.gb.push(put(x,y,15,{nb:1,x:x+.5+rr(-.15,.15),y:y+.5+rr(-.15,.15),yaw:rr(0,6.28),h:.2,pr:.15,gold:1}))}
  for(let x=b.ix0;x<=b.ix1;x+=2)if(!blk[at(x,v.inY1)])put(x,v.inY1,22,{yaw:Math.PI,h:1.2,pr:.4})}
 /* the general store: shelves along the walls, sacks and barrels */
 {const b=W.rooms.store;for(let x=b.ix0;x<=b.ix1;x++)if(x!=b.bk)put(x,b.iy1,22,{yaw:Math.PI,h:1.2,pr:.4});for(let y=b.iy0+1;y<b.iy1;y+=2)if(y!=b.iy0+3)put(b.ix0,y,22,{yaw:Math.PI/2,h:1.2,pr:.4});for(let x=b.ix0+1;x<=b.ix0+4;x++)put(x,b.iy0+3,12,{yaw:Math.PI,h:.45,pr:.5});W.storeC={x:b.ix0+2.5,y:b.iy0+2.5}}
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
 /* boot hill: headstones and wooden markers, a mound before each, and in the open grave a cursed chest */
 if(W.grave){const G=W.grave,[ox,oy]=G.open;for(const[x,y]of G.stones){const ci=at(x,y);if(g[ci]||blk[ci]||E.some(e=>(e.x|0)==x&&(e.y|0)==y))continue;put(x,y,wHash(x,y,31)<.6?29:30,{yaw:rr(-.08,.08),h:.6,pr:.25});if(!(x==ox&&y+1==oy))put(x,y+1,31,{nb:1,yaw:0,h:.15,pr:.3})}
  if(!blk[at(ox+1,oy)])put(ox+1,oy,32,{nb:1,yaw:0,h:.3,pr:.3});const ci=at(ox,oy);blk[ci]=1;CH.push({x:ox+.5,y:oy+.5,cur:1})}
 /* the cave: the entrance timbers, the traps (each has a bundle of dynamite on the wall: shoot it and it goes off where it is), the three chests at the end */
 if(W.cave){const C=W.cave;W.traps=[];put(C.ent[0],C.ent[1],36,{nb:1,yaw:Math.PI,h:1.8,pr:.1});
  for(const[x,y,k,dir]of C.traps){const t={x:x+.5,y:y+.5,k,dir,fired:0,fuse:-1};if(k=='w')t.wire=put(x,y,33,{nb:1,yaw:dir=='y'?0:Math.PI/2,h:.2,pr:.05});else t.plate=put(x,y,35,{nb:1,yaw:0,h:.05,pr:.05});
   t.dyn=put(x,y,34,{nb:1,yaw:dir=='y'?Math.PI/2:0,h:.75,pr:.2});westBrkAdd(t.dyn,1,'DYNAMITE',0,()=>trapFire(t,.05));W.traps.push(t)}
  for(const[x,y]of C.chests){const i=at(x,y);blk[i]=1;CH.push({x:x+.5,y:y+.5})}}
 /* the ruined floors: rubble heaps and a few fires in the street, the alleys and the lots */
 if(wRuin()){let k=0;for(let t=0;t<600&&k<22;t++){const x=ri(2,n-3),y=ri(5,n-6),i=at(x,y);if(g[i]||blk[i]||CMASK[i]||!freeC(x,y))continue;if(y>=W.SY0+1&&y<=W.SY1-1)continue;const m=k<18?14+(R()<.5?1:0):5;blk[i]=1;PRP.push({x:x+.5+rr(-.1,.1),y:y+.5+rr(-.1,.1),t:PS[m>=14?0:m],s:PD[m]||.62,fl:0,fb:m==5?1:0,br:m==5,cell:i,m,yaw:rr(0,6.283),h:PROP_H[m],pr:PROP_R[m]});k++}}
 /* chests: one in the general store, one in the livery */
 for(const[x,y]of[[W.rooms.store.ix1,W.rooms.store.iy0],[W.rooms.livery.ix0,W.rooms.livery.iy1-1]]){const i=at(x,y);if(g[i]||blk[i])continue;blk[i]=1;CH.push({x:x+.5,y:y+.5})}
 /* the stagecoach waits at the east end of the street */
 open=true;W.coach={st:'park',x:N-3.4,y:W.SY0+2.5,t:0,wait:rr(30,45),hit:new Set(),a:1};W.storm={t:0,next:rr(30,50),on:0,k:0};W.tw=[];W.twT=rr(2,5)}

/* ---------------- the town at work: messages, prompts, the use key ---------------- */
function wNm(s){return wAlien()&&typeof alnNm=='function'?alnNm(s):s}
function wMsg(t,d){if(!WEST)return;WEST.msg=t;WEST.msgT=d||2.5}
const wIn=(b,x,y,pad)=>{pad=pad||0;return x>=b.ix0-pad&&x<b.ix1+1+pad&&y>=b.iy0-pad&&y<b.iy1+1+pad};
const wAng=(a,b)=>{let d=b-a;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return d};
const W_PM_PRICE=100;
/* what the use key would do here, if anything: {k, t (the prompt)} */
function westNear(){const W=WEST;if(!W||state!='play'||W.duel)return null;const px=P.x,py=P.y;
 const j=W.jack;if(j&&j.pac&&!j.dead&&!W.duelDone&&!W.duelOn&&!(DM&&!CO())&&Math.hypot(j.x-px,j.y-py)<1.7)return westDuelOk()?{k:'duel',t:'CHALLENGE '+wNm('MCCASSIDY')+' TO A DUEL'}:{k:'noduel',t:wNm('MCCASSIDY')+' ONLY DUELS SOMEONE WITH A GUN'};
 if(W.robbed){const near=(e,r)=>e&&!e.dead&&e.pac&&Math.hypot(e.x-px,e.y-py)<r;if(near(W.smithE,2.4)||near(W.storeE,2.4)||near(W.darts,1.8)||(W.roul&&Math.hypot(W.roul.x-px,W.roul.y-py)<1.4))return{k:'robbed',t:'NOBODY IN THIS TOWN WILL DEAL WITH A BANK ROBBER'}}
 const sm=W.smithE;if(sm&&sm.pac&&!sm.dead&&W.smithC&&Math.hypot(W.smithC.x-px,W.smithC.y-py)<1.6)return{k:'smith',t:W.pmSold?'THE GUNSMITH: "ENJOY IT, PARTNER"':'BUY THE PEACEMAKER  -  $'+W_PM_PRICE};
 if(W.roul&&W.roul.bets&&Math.hypot(W.roul.x-px,W.roul.y-py)<1.6&&!(DM&&!CO())&&roulTotal()>0&&!roulBusy())return{k:'roul',t:'SPIN THE WHEEL'};
 const dp=W.darts;if(dp&&dp.pac&&!dp.dead&&!(DM&&!CO())&&Math.hypot(dp.x-px,dp.y-py)<1.6)return{k:'hire',t:ALLY?'YOU ALREADY HAVE A PARTNER':'HIRE '+wNm(ALLY_NAME.toUpperCase())+'  -  $'+ALLY_PRICE};
 const st=W.storeE;if(st&&st.pac&&!st.dead&&W.storeC&&Math.hypot(W.storeC.x-px,W.storeC.y-py)<1.6)return{k:'store',t:'BROWSE THE GENERAL STORE'};
 return null}
/* the use key (called from chest()): true if the town took it */
function westUse(){const W=WEST;if(!W||state!='play')return false;const q=westNear();if(!q)return false;keys={};
 if(q.k=='duel'){duelStart();return true}
 if(q.k=='robbed'){wMsg('"We don\'t serve thieves here."',2.4);return true}
 if(q.k=='noduel'){wMsg('"Come back when you\'re carryin\' a real iron, partner."',2.6);return true}
 if(q.k=='smith'){if(W.pmSold){wMsg('"Take good care of her."',2);return true}
  const cur=Wp&&Wp.name||'your gun';snd(620,.12,'triangle',.06,200);
  WEST.live=1;choose('Gunsmith','"A Peacemaker. Single action, six shots, and the hardest-hitting iron in the territory. Wait a moment between shots and she never misses." You have $'+(P.money|0)+'.',
   [{n:'Peacemaker  —  $'+W_PM_PRICE,d:'Heavier hits than the Hand cannon. Dead Eye: the first shot after a short pause does 60% more damage and goes exactly where you aim. Replaces the '+cur+' you are holding.'},{n:'Leave',d:'Keep your money.'}],
   k=>{state='play';if(k!==0)return;if((P.money|0)<W_PM_PRICE){wMsg('"Come back when you have the money."',2.4);snd(160,.2,'square',.06,-60);return}
    P.money-=W_PM_PRICE;try{moneySync()}catch(er){}const w=westPeacemaker();Wp=w;P.ammo=MG();P.reload=0;P.cd=0;W.pmSold=1;wMsg('THE PEACEMAKER',2.6);snd(520,.12,'triangle',.08,300);setTimeout(()=>snd(180,.08,'square',.06,-60),180);setTimeout(()=>snd(240,.06,'square',.05,-60),300)});return true}
  if(q.k=='store'){westStore();return true}
 if(q.k=='roul'){roulSpin();return true}
 if(q.k=='hire'){if(ALLY){wMsg('"One partner\'s plenty, friend."',2);return true}snd(620,.12,'triangle',.06,200);
  choose(wNm(ALLY_NAME),'"Tired of darts. For $'+ALLY_PRICE+' I\'ll ride with you, wherever you\'re headed." You have $'+(P.money|0)+'.',[{n:'Hire '+wNm(ALLY_NAME)+'  —  $'+ALLY_PRICE,d:'A partner with a rifle who follows you from floor to floor and shoots what you are fighting. 200 health, back to full at the start of every floor. Monsters will go after them too, and if they die they are gone for good.'},{n:'Leave',d:'Keep your money.'}],
   k=>{state='play';if(k!==0)return;if((P.money|0)<ALLY_PRICE){wMsg('"Money first, partner."',2.4);snd(160,.2,'square',.06,-60);return}P.money-=ALLY_PRICE;try{moneySync()}catch(er){}const dd=W.darts;allyHire(dd);wNet('wal',{});wMsg('"Let\'s ride."',2.4);snd(520,.12,'triangle',.08,300)});return true}
 return false}
/* the general store's stock: frontier clothes (yours to keep) and Quickdraw */
const W_QD_PRICE=90;
function westStore(){const W=WEST,items=[];snd(620,.12,'triangle',.06,200);
 for(const[id,pr]of WSTORE_COS()){const c=COS[id],has=LOOT.o.includes(id);items.push({n:c.n+'  —  '+(has?'owned':'$'+pr),d:(c.k=='hat'?'Hat. ':c.k=='cape'?'Cape. ':'Title. ')+c.d+(has?' You already have it.':' Yours to keep.'),buy:has?null:()=>{secretGive(id);HATNEW=id;wMsg(c.n.toUpperCase()+' BOUGHT. WEAR IT FROM COSMETICS',3)},pr})}
 const qd=P.pw.qdraw|0,qdOk=qd<2&&!W.qdSold;items.push({n:'Quickdraw  —  '+(qdOk?'$'+W_QD_PRICE:qd>=2?'maxed':'sold out'),d:'Power: +20% fire and swing rate. One per Frontier Town, stacks up to 2 times. You have '+qd+'.',buy:qdOk?()=>{give(POW.find(p=>p.id=='qdraw'));W.qdSold=1;wMsg('QUICKDRAW x'+(P.pw.qdraw|0),2.6)}:null,pr:W_QD_PRICE});
 items.push({n:'Leave',d:'Keep your money.'});
 WEST.live=1;choose('General Store','"Howdy! Finest goods west of the river." You have $'+(P.money|0)+'.',items,k=>{state='play';const it=items[k];if(!it||!it.buy)return;
  if((P.money|0)<it.pr){wMsg('"Come back when you have the money."',2.4);snd(160,.2,'square',.06,-60);return}
  P.money-=it.pr;try{moneySync()}catch(er){}it.buy();snd(520,.12,'triangle',.08,300);setTimeout(()=>snd(780,.2,'triangle',.08,200),110)})}
/* the Peacemaker: a Hand cannon underneath (its sounds, its reload), with its own look and numbers */
function westPeacemaker(){const b=WT.find(x=>x.t=='Hand cannon');const w=genW(b);w.pm=1;w.perk=undefined;w.dmg=Math.round(rr(70,92));w.rate=rr(1.55,1.85);w.spr=.012;w.mag=6;w.rt=WM['Hand cannon'][1]*.8;w.pi=1;w.hue=38;w.name='Peacemaker';return w}
/* Dead Eye: the Peacemaker's first shot after .7 s */
function westDeadEye(w){if(!w||!w.pm)return 1;const k=T-(w.pmT===undefined?-9:w.pmT)>.7?1.6:1;w.pmT=T;return k}

/* gunfire: the saloon wakes if you shoot inside, and the stagecoach horses bolt */
function westFire(){const W=WEST;if(!W||state!='play')return;
 if(W.duel){duelFire();return}
 /* a shot at a trap's dynamite (bullets pass through things that don't block the way, so it is checked here) */
 if(W.traps&&Wp&&!Wp.m){const b=westBrkSeen();if(b&&b.p.nb&&Math.abs(P.pt||0)<.25)westBrkDmg(b.p,99)}
 const s=W.saloon;if(wIn(s,P.x,P.y,.2)){const e=W.pac.find(o=>o.pac&&!o.dead&&o.grp=='saloon');if(e)westWake(e)}
 const sm=W.smith;if(wIn(sm,P.x,P.y,.2)&&W.smithE&&W.smithE.pac&&!W.smithE.dead){wMsg('"Not in my shop!"',2)}
 const c=W.coach;if(c&&c.st=='park'&&Math.hypot(c.x-P.x,c.y-P.y)<7){coachGo('spooked')}}
/* a passive person was hit */
function westHit(e){const W=WEST;if(!W)return;if(e.bty){if(!W.outFree)wNet('wof',{});W.outFree=1;return}if(W.duel&&e.jack){duelHitJack(e);return}if(e.jack){e.grp='jack'}westWake(e)}
/* someone died */
function westKill(e){const W=WEST;if(!W)return;
 if(e.bty&&!W.btyDone){W.btyDone=1;const v=W.out.reward;P.money=Math.min(MAXM(),(P.money|0)+v);try{moneySync()}catch(er){}wMsg('BOUNTY COLLECTED: '+W.out.name.toUpperCase()+'  +$'+v,4);snd(660,.15,'triangle',.08,200);setTimeout(()=>snd(990,.25,'triangle',.08,200),150)}
 if(e.jack&&!W.duel&&!W.jackDead){W.jackDead=1}}

/* ---------------- the runaway stagecoach ---------------- */
function coachGo(why,net){const c=WEST.coach;if(!c||c.st!='park')return;if(!net&&typeof CLI=='function'&&CLI()){wNet('wcg',{});return}if(!net)wNet('wco',{st:'rear'});c.st='rear';c.t=0;c.hit=new Set();
 snd(700,.35,'sawtooth',.06,600,{x:c.x,y:c.y});setTimeout(()=>snd(900,.3,'sawtooth',.05,-500,{x:c.x,y:c.y}),120);}
function coachStep(dt){const W=WEST,c=W.coach;if(!c)return;c.t+=dt;const L=W.SY0+2.5;
 if(c.st=='park'){c.x=N-3.4;c.y=L;c.v=0;if(!W.duel&&c.t>c.wait&&!(typeof CLI=='function'&&CLI()))coachGo();
  /* a parked coach is solid: push the player out of it */const dx=P.x-(c.x-.9),dy=P.y-c.y;if(Math.abs(dx)<1.9&&Math.abs(dy)<.75){P.y=c.y+(dy<0?-.76:.76)}return}
 if(c.st=='rear'){if(c.t>.9){c.st='run';c.t=0;c.v=2}return}
 if(c.st=='gone'){if(c.t>c.wait&&!(typeof CLI=='function'&&CLI())){wNet('wco',{st:'park'});c.st='park';c.t=0;c.wait=rr(32,48);for(let i=0;i<10;i++)ptcPush({x:N-3.4+rr(-1,1),y:L+rr(-.6,.6),z:.1,vx:rr(-.5,.5),vy:rr(-.5,.5),vz:.4,life:1,l0:1,t:S.dust,s:.5,g:0},0)}return}
 /* running: speeds up to 10 tiles a second, westward down the middle of the street */
 c.v=Math.min(10,c.v+dt*9);c.x-=c.v*dt;c.y=L+Math.sin(c.t*3)*.08;
 if(Math.random()<dt*30)ptcPush({x:c.x+rr(.2,1.2),y:c.y+rr(-.5,.5),z:.05,vx:rr(.5,2),vy:rr(-.4,.4),vz:rr(.2,.6),life:.9,l0:.9,t:S.dust,s:rr(.3,.55),g:0},0);
 if(Math.random()<dt*7)snd(90+Math.random()*30,.06,'square',.05,-20,{x:c.x,y:c.y});
 /* the horses' front is at x-1.6, the coach's back at x+.7 */const x0=c.x-1.7,x1=c.x+.75;
 if(!c.hit.has(P)&&P.x>x0&&P.x<x1&&Math.abs(P.y-c.y)<.8&&!(P.deadT>0)&&(P.z||0)+(P.jz||0)<.9){c.hit.add(P);hb(null);cause='a runaway stagecoach';hurt(P.mhp*.45);const s=P.y<c.y?-1:1;push(P,-.35,s,4.2);P.hurt=.5;snd(70,.4,'sawtooth',.12,-30);snd(160,.2,'square',.08,-90)}
 for(const e of E){if(e.dead||e.pup||c.hit.has(e)||e.x<x0||e.x>x1||Math.abs(e.y-c.y)>.8)continue;c.hit.add(e);if(e.pac)westWake(e,1);e.hp-=Math.max(150,e.mhp*.8);e.flash=.1;e.aggro=1;burst(e,S.blood,12);push(e,-.3,e.y<c.y?-1:1,3);snd(80,.3,'sawtooth',.1,-40,e);if(e.hp<=0)kill(e)}
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
 if(!st.on){if(st.t>st.next&&!W.duel){st.on=1;st.t=0;st.len=rr(13,16);snd(90,1.4,'sawtooth',.04,-30)}}
 else if(st.t>st.len){st.on=0;st.t=0;st.next=rr(55,75)}
 const tgt=st.on?(st.t<2?st.t/2:st.t>st.len-2.5?(st.len-st.t)/2.5:1):0;st.k+=(tgt-st.k)*Math.min(1,dt*1.5);
 const ins=westIndoors();W.inK=(W.inK||0)+((ins?1:0)-(W.inK||0))*Math.min(1,dt*4);const ko=st.k*(1-W.inK);W.stormV=ko;if(SW&&W.fk0!==undefined)SW.FKS=W.fk0*(1+ko*7);
 /* the howl and the grit in the air */
 if(st.k>.05){st.ht=(st.ht||0)-dt;if(st.ht<=0){st.ht=.35;snd(140+Math.random()*80,.5,'sawtooth',.012*st.k*(1-.6*W.inK),-60)}if(ko>.05)
  if(PTC.length<700&&Math.random()<dt*40*ko){const a=P.a+rr(-1,1),r=rr(1,5);ptcPush({x:P.x+Math.cos(a)*r,y:P.y+Math.sin(a)*r,z:rr(.1,1.4),vx:W.wind*rr(3,6),vy:rr(-.5,.5),vz:rr(-.2,.2),life:.8,l0:.8,t:S.dust,s:rr(.25,.55),g:0},0)}}}

/* ---------------- the duel ---------------- */
function duelStart(){const W=WEST,j=W.jack;if(!j||W.duel||W.duelOn)return;W.duel={st:'fade',t:0,fd:0};wNet('wdl',{st:'go'});snd(300,.3,'triangle',.06,-100)}
function duelStep(dt){const W=WEST,D=W.duel,j=W.jack;
 D.t+=dt;const L=W.SY0+2.5,PX=16.5,JX=28.5;
 if(!j||j.dead&&D.st!='won'){W.duel=null;return}
 if(D.st=='fade'){D.fd=Math.min(1,D.t/.7);if(D.t>=.8){/* out in the street: the player at one end, Jack at the other; everything else waits */
   P.x=PX;P.y=L;P.a=0;P.pt=0;P.vx=0;P.vy=0;j.x=JX;j.y=L;j.fa=Math.PI;j.z=SW?0:j.z;B.length=0;W.coach.st='park';W.coach.t=0;W.tw=W.tw.filter(t=>!t.burn);
   W.tw.push({x:W.wind>0?1.4:N-2.4,y:L+rr(-.3,.3),v:2.2,vy:0,r:1,ph:0,b:0,burn:0,life:0});
   D.st='wait';D.t=0;D.toll=0;D.cue=rr(1.4,3.2);D.rt=Math.max(.3,.62-fl*.006)+rr(0,.08)}return}
 D.fd=Math.max(0,D.fd-dt*2);
 if(D.st=='wait'){const k=Math.floor(D.t/1.1);if(k>D.toll&&D.toll<3){D.toll=k;snd(330,1.4,'triangle',.08,-4);snd(660,.9,'sine',.03,-4)}if(D.t>3.7){D.st='cue';D.t=0}return}
 if(D.st=='cue'){if(D.t>D.cue){D.st='draw';D.t=0;snd(1200,.12,'square',.06,-200)}return}
 if(D.st=='draw'){if(D.t>D.rt){/* Jack is faster */D.st='lost';D.t=0;jackShoots(j,-1);W.duelDone=1;wNet('wdl',{st:'lost'});setTimeout(()=>wMsg('"Reckon you\'re a mite slow, partner."',3),700)}return}
 if(D.st=='won'||D.st=='lost'||D.st=='foul'){if(D.t>2.6){D.st='out';D.t=0}return}
 if(D.st=='out'){D.fd=Math.min(1,D.t/.5);if(D.t>.6){if(j&&!j.dead&&j.pac){const s=W.saloon;j.x=s.bar.x-.45;j.y=s.iy0+1.2;j.fa=0}W.duel=null;wNet('wdl',{st:'end'})}}}
function jackShoots(j,k){snd(260,.14,'sawtooth',.1,-120,j);snd(90,.2,'square',.08,-40,j);try{ltPush(j.x,j.y,.7,3,[1,.8,.5],.12)}catch(er){}for(let i=0;i<6;i++)ptcPush({x:j.x+Math.cos(j.fa)*.35,y:j.y+Math.sin(j.fa)*.35,z:.62,vx:Math.cos(j.fa)*rr(1,3),vy:Math.sin(j.fa)*rr(1,3)+rr(-.5,.5),vz:rr(-.2,.4),life:.2,l0:.2,t:S.spark,s:.12,g:0},0);
 P.inv=0;hb(j);cause=wNm('McCassidy');if(k<0){/* outdrawn: the shot is fatal (shields, overheal and the Aegis don't stop it) */P.shd=0;P.oh=0;if(P.pw.aegis)P.ag=Math.max(P.ag||0,.01);hurt(P.mhp*100)}else hurt(P.mhp*k);P.hurt=.6}
function duelFire(){const W=WEST,D=W.duel,j=W.jack;if(!D)return;
 if(D.st=='wait'||D.st=='cue'){/* drew early */D.st='foul';D.t=0;wMsg('"Justice don\'t wait for cheats."',2.6);jackFlash(j);for(let i=0;i<3;i++)setTimeout(()=>{if(j&&!j.dead&&state=='play')jackShoots(j,.17)},450+i*110);setTimeout(()=>{if(j&&!j.dead){j.pac=0;j.grp='jack';j.aggro=1;wNet('wdl',{st:'foul'})}},800);W.duelDone=1}}
/* a flashbang: a bang, a white-out, and your hands shake for a moment */
function jackFlash(j){const W=WEST;W.flash=1;snd(1800,.25,'square',.08,-1600,j);snd(80,.3,'sawtooth',.1,-40,j);P.cd=Math.max(P.cd||0,.7);for(let i=0;i<14;i++){const a=Math.random()*6.28,v=rr(1,3);ptcPush({x:j.x+Math.cos(j.fa)*.6,y:j.y+Math.sin(j.fa)*.6,z:.5,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rr(0,1),life:.3,l0:.3,t:S.spark,s:.2,g:0},0)}}
/* Jack in a straight fight: every few seconds he rolls to one side and comes up with a fresh cylinder */
function westJackAI(e,dt){if(e.pac||e.dead||!e.aggro)return;e.rlT=(e.rlT===undefined?rr(2,4):e.rlT)-dt;if(e.rlT>0)return;e.rlT=rr(3.5,5.5);const a=Math.atan2(P.y-e.y,P.x-e.x)+(Math.random()<.5?1:-1)*Math.PI/2;let d=0;for(let k=0;k<10;k++){const nx=e.x+Math.cos(a)*.15,ny=e.y+Math.sin(a)*.15,ci=(ny|0)*N+(nx|0);if(g[ci]||blk[ci])break;e.x=nx;e.y=ny;d++}if(d){e.cd=Math.min(e.cd||0,.25);snd(160,.15,'triangle',.05,-60,e);for(let i=0;i<6;i++)ptcPush({x:e.x,y:e.y,z:.05,vx:rr(-.6,.6),vy:rr(-.6,.6),vz:.3,life:.6,l0:.6,t:S.dust,s:.3,g:0},0)}}
function duelHitJack(j){const W=WEST,D=W.duel;if(D.st=='draw'){D.st='won';D.t=0;j.pac=0;j.hp=Math.min(j.hp,1);W.duelDone=1;wNet('wdl',{st:'won'});
  const v=80;P.money=Math.min(MAXM(),(P.money|0)+v);try{moneySync()}catch(er){}let hat=0;try{hat=secretGive(HAT_JACK);if(hat)HATNEW=HAT_JACK}catch(er){}wMsg('"Huh. Didn\'t see that comin\'."',2.4);setTimeout(()=>wMsg('YOU WIN THE DUEL  +$'+v,3.5),2400);if(hat)setTimeout(()=>wMsg("MCCASSIDY'S BANDANA UNLOCKED",4),5600);setTimeout(()=>snd(523,.2,'triangle',.08,0),200);setTimeout(()=>snd(784,.4,'triangle',.08,0),380)}
 else if(D.st=='foul'){j.pac=0;j.aggro=1}}
/* Jack during the duel: stands his ground facing you */
function duelJack(e,dt){const W=WEST,D=W.duel;if(D&&(D.st=='wait'||D.st=='cue'||D.st=='draw'||D.st=='lost')){e.fa=Math.atan2(P.y-e.y,P.x-e.x)}return true}

/* ---------------- the bank job ---------------- */
function heistStep(dt){const W=WEST,H=W.heist,v=W.vault;H.t+=dt;
 if(H.st=='crack'){{/* the door swings open and the alarm goes */const vd=W.vd,i=vd.cell;PRP=PRP.filter(p=>p!==vd);blk[i]=0;try{if(SW&&SW.g3d)g3dFreeCell(i)}catch(er){}
   PRP.push(Object.assign({},vd,{m:3014,nb:1}));W.vd=null;H.st='alarm';H.t=0;H.w=0;snd(200,.4,'square',.08,-60);snd(60,.6,'sawtooth',.12,-20);for(let k=0;k<24;k++){const a=Math.random()*6.28,v=rr(1,4);ptcPush({x:vd.x,y:vd.y-.4,z:.75,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.5,vz:rr(0,2),life:.6,l0:.6,t:S.spark,s:.15,g:6},0)}wMsg('THE VAULT DOOR GIVES WAY! THE ALARM IS RINGING',3.2);
   for(const e of E)if(!e.dead&&!e.pac)e.aggro=1}
  return}
 if(H.st=='alarm'){H.bt=(H.bt||0)-dt;if(H.bt<=0&&H.t<50){H.bt=.5;snd(880,.18,'square',.04,0,{x:v.x+.5,y:v.y+.5});setTimeout(()=>snd(660,.18,'square',.04,0,{x:v.x+.5,y:v.y+.5}),200)}
  const WV=[3,20,40];while(H.w<WV.length&&H.t>=WV[H.w]){heistPosse(H.w);H.w++}}}
function heistPosse(k){const W=WEST,L=W.SY0+2.5;const src=[[2.2,L-1],[2.2,L+1],[N-3,L-1.5],[N-3,L+1.5],[10.5,42],[40.5,42],[22,8],[47,10]];const n=k==2?5:3+(fl>12?1:0);
 if(k==0)wMsg('THE POSSE IS HERE!',2.6);else wMsg('MORE DEPUTIES!',2.2);snd(500,.25,'sawtooth',.05,300);if(typeof CLI=='function'&&CLI())return;/* co-op: the host's deputies come to everyone */
 for(let i=0;i<n;i++){const[x,y]=src[(k*3+i)%src.length];if(g[(y|0)*N+(x|0)])continue;
  if(typeof HOSTCO=='function'&&HOSTCO()){const sd=Math.random()*2e9|0,sv=R;R=mul(sd);let d0;try{d0=westDeputy(x,y)}finally{R=sv}dynWest(d0,sd,x,y);E.push(d0);continue}
  E.push(westDeputy(x,y))}
 }
/* the gold: picked up by walking over it, it slows you down, and it is paid out at the exit */
/* the gold: walking over a sack puts its money straight in your pocket */
function goldStep(dt){const W=WEST;if(!W.gb)return;
 for(const p of W.gb){if(p.taken)continue;if(Math.hypot(p.x-P.x,p.y-P.y)<.6&&!W.vd){p.taken=1;PRP=PRP.filter(q=>q!==p);wNet('wgd',{i:W.gb.indexOf(p)});const v=14+(fl>>2);W.gold=(W.gold|0)+1;P.money=Math.min(MAXM(),(P.money|0)+v);try{moneySync()}catch(er){}snd(880,.08,'triangle',.06,200);setTimeout(()=>snd(1320,.12,'triangle',.06,100),70);wMsg('GOLD  +$'+v,1.8)}}}
/* nobody moves in a duel */
function westSpd(){const W=WEST;if(!W)return 1;return W.duel?0:1}

/* ---------------- every frame ---------------- */
function westStep(dt){const W=WEST;if(!W||state!='play')return;W.t=(W.t||0)+dt;if(W.msgT>0)W.msgT-=dt;if(SW&&W.fk0===undefined)W.fk0=SW.FKS;
 if(W.duel)duelStep(dt);
 if(!W.duel||W.duel.st=='fade'||W.duel.st=='out')coachStep(dt);twStep(dt);stormStep(dt);
 if(W.roul)roulStep(dt);try{pnoStep(dt)}catch(er){}
 {const pz=W.pianist;if(pz&&!pz.dead&&!pz.pup){if(pz.sit&&pz.pac){if(pz.z0===undefined)pz.z0=pz.z||0;pz.z=pz.z0+PNO_DZ}else if(pz.z0!==undefined){pz.z=pz.z0;pz.z0=undefined}}}/* up on his stool while he plays */
 if(wAlien()&&!westIndoors()&&PTC.length<600&&Math.random()<dt*14){const a=Math.random()*6.28,r=rr(1.5,7);ptcPush({x:P.x+Math.cos(a)*r,y:P.y+Math.sin(a)*r,z:rr(.1,1.6),vx:rr(-.2,.2),vy:rr(-.2,.2),vz:rr(.05,.25),life:3,l0:3,t:S.plasma||S.spark,s:rr(.05,.1),g:0},0)}
 if(W.heist)heistStep(dt);goldStep(dt);if(W.traps)trapStep(dt);
 /* the jail's open cell, the hotel's guard: nothing to do; the wanted man reacts if you come into his room */
 const o=W.outlaw;if(o&&!o.dead&&!W.outFree&&W.outRoom){const r=W.outRoom,inR=q=>q&&q.x>=r.x0&&q.x<r.x1+1&&q.y>=r.y0&&q.y<r.y1+1.6;if(inR(P)||(typeof RP!='undefined'&&CO()&&RP.some(q=>!q.dead&&inR(q)))){W.outFree=1;o.aggro=1;wNet('wof',{});wMsg('"YOU\'LL NEVER TAKE ME ALIVE!"',2.2)}}
 W.near=westNear()}

/* ---------------- drawing ---------------- */
let WTWF=null;
function twFrames(){const al=wAlien();if(WTWF&&WTWF.al===al)return WTWF;const M=westMov(),cp=F=>F.map(q=>Object.assign({},q,{p:q.p.map(p=>p.slice())})),out={tw:[],twf:[],al};
 for(const k of['tw','twf'])for(let i=0;i<8;i++){const F=cp(M[k]);vmTurn(F,[0,0,0],i/8*6.2832,0,0);out[k].push(F)}return WTWF=out}
function westList(L){const W=WEST;if(!W)return;const c=W.coach;if(wAlien()){if(!W.roofK)W.roofK=wRoofKit();for(const r of W.roofK){if((r.x-P.x)**2+(r.y-P.y)**2>900)continue;if(r.wo=='beacon'&&((T*1.5+r.x)%2)<.6)continue;L.push({q:14,wo:r.wo,x:r.x,y:r.y,yaw:r.yaw,k:r.k||1,z:r.z,abs:1})}
 /* a great saucer hangs over the middle of town, turning slowly, and two small ones circle */L.push({q:14,wo:'ufo',x:26,y:W.SY0+2.5,yaw:T*.15,k:3.2,z:4.4+.15*Math.sin(T*.7),abs:1});for(let i=0;i<2;i++){const a=T*(.25+i*.1)+i*3;L.push({q:14,wo:'ufo',x:26+Math.cos(a)*(14+i*6),y:W.SY0+2.5+Math.sin(a)*(10+i*5),yaw:-T,k:1.1,z:3.2+i*.8,abs:1})}}
 if(c&&c.st!='gone'){const rear=c.st=='rear'?Math.sin(c.t*7)*.08:0;L.push({q:14,wo:'coach',x:c.x+.15,y:c.y,yaw:-Math.PI/2,k:1.25,z:rear*.3});for(const s of[-1,1])L.push({q:14,wo:'horse',x:c.x-1.25,y:c.y+s*.24,yaw:-Math.PI/2,k:1.2,z:c.st=='run'?Math.abs(Math.sin(c.t*9+s))*.06:rear})}
 if(W.roul){const[wx,wy]=rlW(0,-.24);L.push({q:14,wo:'wheel',x:wx,y:wy,yaw:W.roul.a,k:1,z:.45});roulList(L)}
 for(const t of W.tw)L.push({q:14,wo:t.burn>0?'twf':'tw',x:t.x,y:t.y,yaw:W.wind>0?Math.PI/2:-Math.PI/2,k:t.r*1.5,z:(t.z||0)+.36*t.r,ph:t.ph})}
function westDraw(s,dX,dY,plX,plY,inv,hH,Z){WEST.cam={dX,dY,plX,plY,inv,hH,W,H,t:T};const M=westMov();let F;if(s.mesh)F=s.mesh;else if(s.wo=='tw'||s.wo=='twf'){const fr=twFrames()[s.wo],i=((Math.floor(s.ph/6.2832*8)%8)+8)%8;F=fr[i]}else F=M[s.wo];if(!F)return;
 let base=0;if(SW){const f=swNearFloor(s.x,s.y,P.z+.5);base=f===f?f:0}else base=FHc(s.x,s.y);if(s.abs)base=0;else if(wAlien()&&(s.wo=='coach'||s.wo=='horse'))base+=.22+.04*Math.sin(T*3+s.x);drawMesh(F,s.x,s.y,base+(s.z||0),s.k||1,s.yaw||0,null,0,dX,dY,plX,plY,inv,hH,Z)}
function westHud(){const W=WEST;if(!W||state!='play')return;const c=ctx;try{roulHud(c)}catch(er){}c.save();c.textAlign='center';c.textBaseline='alphabetic';
 /* the dust storm: a sandy wash over everything */
 const sk=W.stormV||0;if(sk>.02){c.globalAlpha=Math.min(.42,sk*.42);c.fillStyle='#c89a5c';c.fillRect(0,0,LW,LH);c.globalAlpha=1}
 const D=W.duel;if(D){/* letterbox bars, the title, the cue */const bh=Math.round(LH*.11);c.fillStyle='#000';c.fillRect(0,0,LW,bh);c.fillRect(0,LH-bh,LW,bh);
  c.font='bold 16px "DotGothic16",monospace';const T_=D.st=='wait'?"IT'S HIGH NOON":D.st=='cue'?'...':D.st=='draw'?'DRAW!':D.st=='won'?'YOU WIN':D.st=='lost'?'TOO SLOW':D.st=='foul'?'FOUL!':'';
  if(T_){c.fillStyle='#000';c.fillText(T_,LW/2+1,bh+25);c.fillStyle=D.st=='draw'?'#ff5a3a':'#ffe9b0';c.fillText(T_,LW/2,bh+24)}
  if(D.st=='wait'){/* 0.9.346: shorter, and outlined so it reads against the street */c.font='bold 9px "DotGothic16",monospace';const tw='WAIT FOR THE SIGNAL, THEN SHOOT';c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#000';c.strokeText(tw,LW/2,LH-bh-8);c.fillStyle='#fff3cf';c.fillText(tw,LW/2,LH-bh-8)}
  if(D.fd>0){c.globalAlpha=D.fd;c.fillStyle='#000';c.fillRect(0,0,LW,LH);c.globalAlpha=1}}
 c.font='8px "DotGothic16",monospace';
 const q=W.near;if(q&&!D){const t='['+kbName(KBC('use'))+'] '+q.t;c.fillStyle='#000';c.fillText(t,LW/2+1,LH*.3+1);c.fillStyle='#ffe9b0';c.fillText(t,LW/2,LH*.3)}
 /* the wanted poster, read when you stand at it */
 if(!D&&W.poster&&Math.hypot(W.poster.x-P.x,W.poster.y-P.y)<1.4&&!W.btyDone){const t1='WANTED: '+W.out.name.toUpperCase()+'  -  $'+W.out.reward+' REWARD',t2='LAST SEEN AT THE HOTEL';c.fillStyle='#000';c.fillText(t1,LW/2+1,LH*.36+1);c.fillText(t2,LW/2+1,LH*.36+11);c.fillStyle='#f0d890';c.fillText(t1,LW/2,LH*.36);c.fillText(t2,LW/2,LH*.36+10)}
 {const bk=!D&&(westBrkSeen()||(W.brkL&&W.brkL.hp>0&&T-(W.brkL.t||-9)<1.5?W.brkL:null));if(bk){const hp=bk.hp,w=90,x=LW/2-w/2,y=Math.round(LH*.2),t=bk.name+'  '+Math.ceil(hp)+' / '+bk.max;c.fillStyle='#000';c.fillText(t,LW/2+1,y-3);c.fillStyle='#e8e0d0';c.fillText(t,LW/2,y-4);c.fillStyle='#000';c.fillRect(x-1,y-1,w+2,6);c.fillStyle='#d8b050';c.fillRect(x,y,w*hp/bk.max,4)}}

 if(W.flash>0){c.globalAlpha=Math.min(1,W.flash);c.fillStyle='#fff';c.fillRect(0,0,LW,LH);c.globalAlpha=1;W.flash-=.02}
 c.restore();
 if(W.msgT>0&&W.msg){c.save();c.textAlign='center';c.font='bold 13px "DotGothic16",monospace';c.globalAlpha=Math.min(1,W.msgT*1.2);c.fillStyle='#000';c.fillText(W.msg,LW/2+1,61);c.fillStyle='#ffe9b0';c.fillText(W.msg,LW/2,60);c.restore()}}
/* the lights: a high noon sun, oil lamps inside every building, the street lamps */
function westLights(){const W=WEST,AL=wAlien(),RU=wRuin();const az=-1.1,el=1.18,D=70,c0=N/2;LT.push({x:c0+Math.cos(az)*D*Math.cos(el),y:c0+Math.sin(az)*D*Math.cos(el),z:D*Math.sin(el),r:2000,c:AL?[.8,.72,1]:RU?[1,.62,.46]:[1,.92,.78],k:RU?.55:.7,dx:0,dy:0,fk:0,ph:0,sun:1});
 const dx4=[1,-1,0,0],dy4=[0,0,1,-1];for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){const i=y*N+x;if(g[i]||!CMASK[i])continue;
  for(let d=0;d<4;d++){const dx=dx4[d],dy=dy4[d];if(!g[(y+dy)*N+x+dx]||blk[i])continue;const lx=x+.5+dx*.34,ly=y+.5+dy*.34;let ok=LT.length<34;for(const l of LAMPS)if(Math.hypot(l.x-lx,l.y-ly)<4.2){ok=false;break}if(!ok)continue;
   LAMPS.push({x:x+.5+dx*.46,y:y+.5+dy*.46,yaw:Math.atan2(-dx,-dy),cool:AL?1:0,hi:0});LT.push({x:lx,y:ly,z:1.05,r:5.5,c:AL?[.4,.9,1]:[1,.66,.34],k:1.15,dx:-dx,dy:-dy,fk:.08,ph:wHash(x,y,d)*30})}}
 if(W.cave){for(const[x,y]of[[44,42],[47,44],[44,46],[38,45]])LT.push({x:x+.5,y:y+.5,z:1.3,r:4.5,c:[1,.62,.3],k:1.2,dx:0,dy:0,fk:.12,ph:x*3+y})}
 for(const p of PRP)if(p.m===3023)LT.push({x:p.x,y:p.y+.16,z:1.12,r:3.5,c:AL?[1,.4,.9]:[1,.75,.4],k:.9,dx:0,dy:0,fk:.05,ph:p.x})}

/* the lintel over every street door (called from g3dBuild): the false front with its sign over the doorway, wallpaper on the inside, a solid block */
const W_DH=1.02;
function westG3d(o){const W=WEST;if(!W||!W.doors)return;const DH=W_DH,top=o.top;
 for(const d of W.doors){const x=d.i%N,y=(d.i/N)|0,k=d.id-1,ds=d.sd=='n'?3:2,di=d.sd=='n'?2:3;
  let f=o.bnd(x,y,ds,DH,2,1-DH,-1,o.flipOf(ds));o.quad(f.p,f.u,o.mat(TU[k]),.72,[o.DX[ds],o.DY[ds],0]);
  f=o.bnd(x,y,di,DH,top,1-DH/top,0,o.flipOf(di));o.quad(f.p,f.u,o.mat(TIN[k]),.72,[o.DX[di],o.DY[di],0]);
  o.quad([[x,y,DH],[x+1,y,DH],[x+1,y+1,DH],[x,y+1,DH]],[[0,0],[1,0],[1,1],[0,1]],o.mat(RT),.55,[0,0,-1]);
  o.box(x,y,DH,x+1,y+1,top)}}

/* the wanted man stays in his room, facing the door, until you step in or put a bullet in him */
function westOutlaw(e,dt){const W=WEST;if(!W||W.outFree||e!==W.outlaw)return false;e.aggro=0;e.af=0;const r=W.outRoom;if(r){const a=Math.atan2(r.door[1]+.5-e.y,r.door[0]+.5-e.x);e.fa=(e.fa||0)+wAng(e.fa||0,a)*Math.min(1,dt*3)}return true}

const W_VHP=800;
/* props with health: shots, swings and blasts wear them down; at 0 they give way (the vault door: the alarm goes; a hotel door: it is kicked in) */
function westBrkAdd(p,hp,name,metal,on){WEST.brk.push({p,hp,max:hp,name,metal,on})}
function westBrkOf(p){const W=WEST;return p&&W&&W.brk?W.brk.find(b=>b.p===p&&b.hp>0)||null:null}
function westBrkDmg(p,n){const b=westBrkOf(p);if(!b)return;const W=WEST,cli=typeof CLI=='function'&&CLI();if(cli&&W.rep)return;/* an explosion every game plays out by itself: the host's copy counts */
 if(cli){wNet('wbd',{i:W.brk.indexOf(b),d:Math.round(Math.max(1,+n||1))});b.t=T;W.brkL=b}else{b.hp-=Math.max(1,+n||1);b.t=T;W.brkL=b;if(typeof HOSTCO=='function'&&HOSTCO())wNet('wbh',{i:W.brk.indexOf(b),hp:Math.max(0,Math.round(b.hp))})}const fx=p.x-Math.sin(p.yaw||0)*.45,fy=p.y-Math.cos(p.yaw||0)*.45;
 if(b.metal)snd(900+Math.random()*300,.05,'square',.04,-500,{x:p.x,y:p.y});else snd(140+Math.random()*60,.08,'triangle',.07,-60,{x:p.x,y:p.y});
 for(let k=0;k<3;k++)ptcPush({x:fx+rr(-.3,.3),y:fy+rr(-.1,.1),z:rr(.3,1.2),vx:rr(-1,1),vy:rr(-1,1),vz:rr(0,1),life:.25,l0:.25,t:b.metal?S.spark:S.dust,s:b.metal?.1:.18,g:4},0);
 if(b.hp<=0&&!b.done){b.hp=0;b.done=1;b.on()}}
/* a hotel door gives way: the leaf is gone, the frame stays */
function westDoorBreak(p,r){const i=p.cell;PRP=PRP.filter(q=>q!==p);blk[i]=0;try{if(SW&&SW.g3d)g3dFreeCell(i)}catch(er){}PRP.push(Object.assign({},p,{m:3028,nb:1}));snd(90,.35,'sawtooth',.12,-40,{x:p.x,y:p.y});snd(260,.2,'square',.06,-180,{x:p.x,y:p.y});
 for(let k=0;k<16;k++){const a=Math.random()*6.28,v=rr(1,3);ptcPush({x:p.x,y:p.y,z:rr(.2,1.1),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rr(0,1.5),life:.7,l0:.7,t:S.dust,s:.2,g:5},0)}}
/* the breakable the player is looking at (for its health bar) */
function westBrkSeen(){const W=WEST;if(!W||!W.brk||typeof propRay!='function')return null;const c=Math.cos(P.a),s_=Math.sin(P.a),t=propRay(P.x,P.y,c,s_,.6,0,14),b=westBrkOf(PRAYP);if(!b)return null;try{const w=dda(P.x,P.y,c,s_);if(w&&w.d<t)return null}catch(er){}return b}

/* the dart player: a throw every couple of seconds, the dart flying across to the board */
function westDarts(e,dt){const W=WEST;e.dT-=dt;if(!W.dboard)return;const tx=W.dboard.x+.92,ty=W.dboard.y+.5;e.fa=Math.atan2(ty-e.y,tx-e.x);if(e.dT>0)return;e.dT=rr(1.8,3.4);e.dTt=T;const d=Math.hypot(tx-e.x,ty-e.y),v=7,lf=d/v;
 ptcPush({x:e.x+Math.cos(e.fa)*.3,y:e.y+Math.sin(e.fa)*.3,z:.62,vx:(tx-e.x)/d*v,vy:(ty-e.y)/d*v+rr(-.15,.15),vz:.25,life:lf,l0:lf,t:S.spark,s:.07,g:.4},0);setTimeout(()=>{if(state=='play')snd(700+Math.random()*200,.04,'square',.04,-400,{x:tx,y:ty})},lf*1000)}

/* ===== the hired partner (0.9.315): hired in Frontier Town's saloon, then follows the player from floor to floor (single player).
   Fights what the player fights with a rifle; monsters that are closer to the partner than to the player go after the partner (the AI's target is swapped
   for a stand-in the same way co-op does it for other players). 200 health, back to full on each new floor; dead is dead. ===== */
let ALLY=null,ALLYMSG=null,FLN=0,RALLY={},ALLYFR=null,ALYT=0;const ALLY_NAME='Dusty Reed',ALLY_PRICE=150,ALLY_HP=200;
function allyHire(e){const W=WEST;if(e.fr&&e.fr.spec&&e.fr.spec.ng){const sp=e.fr.spec;sp.ng=0;sp.gm=null;sp.m3=null;sp.c={}}ALLY={id:-7,cmh:ALLY_HP,hue:210,ally:1,hum:1,x:e.x,y:e.y,z:e.z,fa:e.fa,fr:e.fr,sc:e.sc,r:.24,hr:.24,name:e.name,hp:ALLY_HP,mhp:ALLY_HP,af:0,ap:0,cd:1,FN:FLN,flash:0,traits:['rifle'],gun:'rifle'};
 if(W){W.pac=W.pac.filter(o=>o!==e);W.darts=null}E=E.filter(o=>o!==e);e.dead=1}
/* a new floor: come along, at full health, behind the player */
function allyArrive(){const a=ALLY;a.FN=FLN;a.hp=a.mhp;a.tg=null;a.cd=1;const ok=(x,y)=>{const c=(y|0)*N+(x|0);return x>0&&y>0&&x<N&&y<N&&!g[c]&&!blk[c]&&!(typeof pit!='undefined'&&pit[c])};
 for(const[d,da]of[[1.2,Math.PI],[1.2,Math.PI*.6],[1.2,-Math.PI*.6],[1,Math.PI/2],[1,-Math.PI/2],[.6,0]]){const x=P.x+Math.cos(P.a+da)*d,y=P.y+Math.sin(P.a+da)*d;if(ok(x,y)){a.x=x;a.y=y;break}a.x=P.x;a.y=P.y}
 a.z=P.z;if(SW&&typeof swNearFloor=='function'){const f=swNearFloor(a.x,a.y,P.z+.5);a.z=f===f?f:P.z}a.fa=P.a}
function allyMsg(t,d){ALLYMSG={t,d:d||3}}
/* an enemy goes for the partner when the partner is clearly the closer one */
function allyTgt(e){const a=ALLY;if(!a||a.FN!==FLN||e.pac||e.dead||!e.aggro||state!='play')return false;e.tAT=(e.tAT||0)-1/60;if(e.tAT<=0){e.tAT=rr(.6,1.2);const da=Math.hypot(a.x-e.x,a.y-e.y),dp=Math.hypot(P.x-e.x,P.y-e.y);e.tAl=(da<9&&da+1.5<dp)||(e.tAl&&da<11&&da<dp)}return !!e.tAl}
function allyStandIn(){const a=ALLY;return{x:a.x,y:a.y,z:a.z||0,cz:a.z||0,a:a.fa||0,pt:0,pw:{},inv:0,dv:0,deadT:0,hp:a.hp,mhp:a.mhp,am:1,rt:a,mom:0,lk:0,rf:1,sp:1,dm:1,hit:0,hurt:0,last:0}}
function allyHurt(a,d){if(a!==ALLY||!(d>0)||a.hp<=0)return;a.hp-=d;a.flash=.1;try{burst(a,S.blood,3)}catch(er){}if(a.hp<=0){a.hp=0;try{burst(a,S.blood,14);goreBurst(a)}catch(er){}snd(150,.4,'sawtooth',.08,-100,a);allyMsg(a.name.toUpperCase()+' HAS FALLEN',4);ALLY=null;wNet('aly',{x:+a.x.toFixed(2),y:+a.y.toFixed(2),z:0,fa:0,af:0,hp:0,sh:0})}}
/* hostile bullets hit the partner too */
function allyBul(b,SCF){const a=ALLY;if(!a||a.FN!==FLN||b.rf)return false;if(Math.hypot(a.x-b.x,a.y-b.y)<.35*SCF&&(!SW||b.z===undefined||Math.abs(b.z-((a.z||0)+SW.HH*.55))<SW.HH*.6)){allyHurt(a,b.dmg);return true}return false}
function allyLos(a,e){if(SW&&typeof swLosPt=='function'){const az=(a.z||0)+SW.HH*.75,ez=(e.z!==undefined?e.z:0)+SW.HH*.6;return swLosPt(a.x,a.y,az,e.x,e.y,ez)}try{const dx=e.x-a.x,dy=e.y-a.y,d=Math.hypot(dx,dy)||1;return dda(a.x,a.y,dx/d,dy/d).d>=d-.3}catch(er){return true}}
function allyDmg(e,dmg){if(e.dorm&&typeof zWake=='function')zWake(e);if(e.pac||e.bty){if(WEST)westHit(e)}if(e.shd>0){const ab=Math.min(e.shd,dmg);e.shd-=ab;dmg-=ab}e.hp-=dmg;e.aggro=1;e.tAl=1;e.tAT=1.5;e.flash=.08;try{burst(e,e.rb?S.spark:S.blood,3);dnAdd(e,dmg)}catch(er){}if(e.hp<=0)kill(e)}
function allyStep(dt){const a=ALLY;if(!a||state!='play'||(DM&&!CO())||(NET&&!CO()))return;if(a.FN!==FLN)allyArrive();
 if(CO()){ALYT-=dt;if(ALYT<=0){ALYT=.1;wNet('aly',{x:+a.x.toFixed(2),y:+a.y.toFixed(2),z:+(a.z||0).toFixed(2),fa:+(a.fa||0).toFixed(2),af:a.af|0,hp:Math.round(a.hp),sh:a.shT>0?1:0})}}if(WEST&&WEST.duel)return;if(P.deadT>0||P.hp<=0)return;
 a.flash=Math.max(0,a.flash-dt);a.cd-=dt;a.shT=Math.max(0,(a.shT||0)-dt);const SCF=SW?SW.SC:1;
 /* a target: the nearest hostile it can see */
 if(!a.tg||a.tg.dead||a.tg.pac||!E.includes(a.tg)||a.rtT<=0){a.rtT=.5;let bt=null,bd=11*SCF;for(const e of E){if(e.dead||e.pac||e.dorm||e.peace||e.reg||e.dsp||(e.bty&&WEST&&!WEST.outFree))continue;const d=Math.hypot(e.x-a.x,e.y-a.y);if(d<bd&&allyLos(a,e)){bd=d;bt=e}}a.tg=bt}a.rtT=(a.rtT||0)-dt;
 const dp=Math.hypot(P.x-a.x,P.y-a.y);
 if(dp>14*SCF){allyArrive();return}
 /* keep up: walk toward the player along the monsters' route to them, stop about 1.6 away */
 let moved=0;if(dp>1.7*SCF){let dir=null;try{dir=pathDir(a)}catch(er){dir=null}const dx=P.x-a.x,dy=P.y-a.y;if(!dir||dp<3*SCF&&allyLos(a,P))dir=[dx/dp,dy/dp];const sp=3.5*SCF*dt*(dp>5*SCF?1.25:1),ox=a.x,oy=a.y;mv(a,a.x+dir[0]*sp,a.y+dir[1]*sp,a.r);moved=Math.hypot(a.x-ox,a.y-oy);
  if(moved<sp*.2){a.stuck=(a.stuck||0)+dt;if(a.stuck>2.5){a.stuck=0;allyArrive()}}else a.stuck=0;if(!a.tg)a.fa=Math.atan2(dir[1],dir[0])}
 a.ap+=moved*4.5;a.af=moved>.001?(a.ap|0)%4:0;
 if(!SW&&typeof FH!='undefined')a.z=0;
 /* fire */
 const t=a.tg;if(t){a.fa=Math.atan2(t.y-a.y,t.x-a.x);if(a.cd<=0){a.cd=rr(.65,.95);const d=Math.hypot(t.x-a.x,t.y-a.y),hitC=Math.max(.45,.85-d*.03),dmg=14+2*Math.min(60,fl);
  a.shT=.12;snd(240,.12,'sawtooth',.07,-120,a);try{ltPush(a.x,a.y,(a.z||0)+.6,2.5,[1,.8,.5],.08)}catch(er){}const zb=(a.z||0)+(SW?SW.HH*.75:.62);
  for(let i=0;i<4;i++){const k=(i+1)/5;ptcPush({x:a.x+(t.x-a.x)*k,y:a.y+(t.y-a.y)*k,z:zb-.1*k,vx:0,vy:0,vz:0,life:.06,l0:.06,t:S.spark,s:.06,g:0},0)}
  if(Math.random()<hitC)allyDmg(t,dmg)}}}
function allyList(L){for(const id in RALLY){const q=RALLY[id];if(q.hp<=0||T-q.t>1.2)continue;if(!q.h){q.h={x:q.x,y:q.y,z:q.z,fa:q.fa,af:0,ap:0,fr:ALLYFR||humFrames(210,'rifle',[],null,'',3,0),sc:.85,r:.24,hr:.24,hum:1,flash:0,traits:['rifle'],name:q.name}}const h=q.h,k=Math.min(1,.25);h.x+=(q.x-h.x)*k;h.y+=(q.y-h.y)*k;h.z=q.z;h.fa=q.fa;h.af=q.af;const it=hum3d(h)?{q:11,h,x:h.x,y:h.y,fl:0,fh:0,ol:2}:{x:h.x,y:h.y,t:humT(h),s:h.sc,fl:0,fh:0,ol:2};if(SW)it.zb=h.z||0;L.push(it)}
 const a=ALLY;if(!a||a.FN!==FLN)return;const it=hum3d(a)?{q:11,h:a,x:a.x,y:a.y,fl:0,fh:a.flash>0,ol:2}:{x:a.x,y:a.y,t:humT(a),s:a.sc,fl:0,fh:a.flash>0,ol:2};if(SW)it.zb=a.z!==undefined?a.z:0;L.push(it)}
function allyHud(){const c=ctx;if(ALLYMSG&&ALLYMSG.d>0){ALLYMSG.d-=1/60;c.save();c.textAlign='center';c.textBaseline='alphabetic';c.font='bold 13px "DotGothic16",monospace';c.globalAlpha=Math.min(1,ALLYMSG.d*1.2);c.fillStyle='#000';c.fillText(ALLYMSG.t,LW/2+1,81);c.fillStyle='#8cc8ff';c.fillText(ALLYMSG.t,LW/2,80);c.restore()}
}

/* the cave's traps: a tripwire goes off when you walk through it (jump it and it doesn't), a pressure plate when you step on it; either way a short fuse, then the dynamite.
   Shooting a trap's dynamite sets it off where it is. One blast sets off any other trap right next to it. */
const TRAP_R=2.3;
function trapStep(dt){const W=WEST,air=(P.jz||0)>.22||(SW&&P.gr===0);for(const t of W.traps){if(t.fired)continue;
 if(t.fuse<0){const inC=(P.x|0)==(t.x|0)&&(P.y|0)==(t.y|0);if(!(P.deadT>0)&&inC&&!air&&(t.k=='w'||Math.hypot(P.x-t.x,P.y-t.y)<.42))trapFire(t,t.k=='w'?.45:.3)}
 else{t.fuse-=dt;if(Math.random()<dt*40){const d=t.dyn;ptcPush({x:d.x+rr(-.1,.1),y:d.y+rr(-.1,.1),z:.3,vx:rr(-.4,.4),vy:rr(-.4,.4),vz:rr(.3,1),life:.25,l0:.25,t:S.spark,s:.08,g:2},0)}if(t.fuse<=0)trapBoom(t)}}}
function trapFire(t,fuse,net){if(t.fired||t.fuse>=0)return;if(!net)wNet('wtp',{i:WEST.traps.indexOf(t),f:+fuse.toFixed(2)});t.fuse=fuse;snd(t.k=='w'?1600:300,.08,'square',.05,-800,{x:t.x,y:t.y});snd(900,fuse+.1,'sawtooth',.02,-300,{x:t.x,y:t.y})}
function trapBoom(t){const W=WEST;t.fired=1;for(const q of[t.wire,t.plate,t.dyn])if(q)PRP=PRP.filter(p=>p!==q);const b=W.brk.find(b=>b.p===t.dyn);if(b)b.hp=0;
 const z=SW?(swNearFloor(t.x,t.y,1)||0):0;W.rep=1;try{boom(t.x,t.y,TRAP_R*.8,z+.3)}finally{W.rep=0}snd(55,.8,'sawtooth',.2,-25,{x:t.x,y:t.y});snd(140,.35,'square',.1,-90,{x:t.x,y:t.y});
 for(let i=0;i<26;i++){const a=Math.random()*6.28,v=rr(1.5,5);ptcPush({x:t.x,y:t.y,z:.3,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rr(.5,3),life:.8,l0:.8,t:i%3?S.dust:S.spark,s:i%3?.4:.2,g:5},0)}
 for(let i=0;i<10;i++)ptcPush({x:t.x+rr(-1.5,1.5),y:t.y+rr(-1.5,1.5),z:1.7,vx:0,vy:0,vz:-.5,life:1.2,l0:1.2,t:S.dust,s:.25,g:3},0);
 const dm=35+3*Math.min(60,fl),d=Math.hypot(P.x-t.x,P.y-t.y);if(d<TRAP_R&&!(P.deadT>0)){hb(null);cause='a dynamite trap';hurt(dm*(1-d/(TRAP_R*1.4)));push(P,(P.x-t.x)/(d||1),(P.y-t.y)/(d||1),2.4)}
 for(const e of E){if(e.dead||e.pup)continue;const de=Math.hypot(e.x-t.x,e.y-t.y);if(de<TRAP_R){if(e.pac)westWake(e,1);e.hp-=dm*1.5*(1-de/(TRAP_R*1.4));e.flash=.1;e.aggro=1;if(e.hp<=0)kill(e)}}
 if(typeof ALLY!='undefined'&&ALLY&&ALLY.FN===FLN){const da=Math.hypot(ALLY.x-t.x,ALLY.y-t.y);if(da<TRAP_R)allyHurt(ALLY,dm*(1-da/(TRAP_R*1.4)))}
 for(const o of W.traps)if(!o.fired&&o.fuse<0&&Math.hypot(o.x-t.x,o.y-t.y)<1.6)trapFire(o,.35)}

/* a duel needs a gun that hits where it points: not a melee weapon, the grenade launcher or the flamethrower. The gun in hand counts, or the off-hand one when dual wielding */
const wDuelGun=w=>!!w&&!w.m&&!w.fist&&w.k!='Grenade launcher'&&w.k!='Flamethrower'&&w.k!='Hands';
function westDuelOk(){return wDuelGun(Wp)||(typeof dualOn=='function'&&dualOn()&&wDuelGun(W2))}

/* under a roof: inside a building, the jail, the hotel, the mine */
function westIndoors(){const i=(P.y|0)*N+(P.x|0);return !!(typeof CMASK!='undefined'&&CMASK&&CMASK[i])}

const WR_RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
/* ===== 0.9.334: roulette played on the table itself =====
   The table stands in the saloon's back corner with its betting layout toward the room (west) and the wheel at the wall end.
   Aim at the felt and click: left click puts a chip of the chosen value on what you are aiming at, right click takes that bet back.
   The five chips at the right of the wheel pick the chip value, the brass lever at its left (or the use key) spins.
   The wheel turns one way, the ball the other; the ball rolls on the rim, slows, drops, bounces and settles in a pocket, and the
   bets on the table are paid from that pocket. European wheel: one green zero, straight-up 35:1, dozens and columns 2:1, the even-money bets 1:1.
   Table-local coordinates: x across (-x on the player's left), z toward the player (+z the near edge), y up; the table is drawn at yaw -PI/2. */
const WSEQ=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RCHIPS=[5,10,25,50,100],RCHC=[[236,232,224],[200,40,44],[40,110,200],[40,150,70],[30,28,32]],RTOP=.424,RYAW=-Math.PI/2,RLIM=500;
let RCELLS=null;
function roulCells(){if(RCELLS)return RCELLS;const C=[],add=(id,x0,x1,z0,z1,lab,pay,f,k)=>C.push({id,x0,x1,z0,z1,lab,pay,f,k:k||'bet'});
 add('n0',-.46,-.40,-.02,.28,'0',35,n=>n==0);
 for(let c=0;c<12;c++)for(let r=0;r<3;r++){const n=3*c+3-r;add('n'+n,-.40+c*.06,-.34+c*.06,-.02+r*.1,.08+r*.1,''+n,35,m=>m==n)}
 for(let r=0;r<3;r++){const md=(3-r)%3;add('c'+r,.32,.44,-.02+r*.1,.08+r*.1,'2:1',2,n=>n>0&&n%3==md)}
 for(let d=0;d<3;d++)add('d'+d,-.40+d*.24,-.16+d*.24,.28,.36,['1st 12','2nd 12','3rd 12'][d],2,n=>n>12*d&&n<=12*d+12);
 const O=[['lo','1-18',n=>n>=1&&n<=18],['ev','EVEN',n=>n>0&&n%2==0],['rd','RED',n=>WR_RED.has(n)],['bk','BLACK',n=>n>0&&!WR_RED.has(n)],['od','ODD',n=>n%2==1],['hi','19-36',n=>n>=19]];
 O.forEach(([id,lab,f],i)=>add(id,-.40+i*.12,-.28+i*.12,.36,.46,lab,1,f));
 RCHIPS.forEach((v,i)=>add('ch'+i,.25,.43,-.43+i*.072,-.365+i*.072,'$'+v,0,null,'chip'));
 add('spin',-.44,-.25,-.42,-.08,'SPIN',0,null,'spin');
 return RCELLS=C}
/* the felt with its layout, the rail, the chips to choose from and the brass lever (pal: the western or the alien colours) */
/* the felt, painted: the boxes with their numbers and words, the names of the chips and the lever, as one picture laid on the table top
   (table-local x,z from -.47 to .47 map onto the 256 square: x to the right, z down the picture, so it reads the right way up from the player's side) */
const RFT={};const RFS=.47;
function roulFeltTex(al){if(RFT[al?1:0]!==undefined)return RFT[al?1:0];const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),X=x=>(x+RFS)/(2*RFS)*S,Z=z=>(z+RFS)/(2*RFS)*S;
 const FE=al?'#1e1646':'#1d6a3c',LN=al?'#9a8cff':'#e8dcb8',RD=al?'#e0509c':'#b01e24',BK=al?'#1aa6b8':'#1a181c',GRN=al?'#e0b84a':'#2a9a4a',TX=al?'#f4f0ff':'#f6f0dc';
 g.fillStyle=FE;g.fillRect(0,0,S,S);/* a little nap in the cloth */for(let i=0;i<900;i++){g.fillStyle=`rgba(${al?'200,190,255':'0,0,0'},${Math.random()*.06})`;g.fillRect(Math.random()*S,Math.random()*S,2,1)}
 const box=(c,fill)=>{const x0=X(c.x0),x1=X(c.x1),z0=Z(c.z0),z1=Z(c.z1);if(fill){g.fillStyle=fill;g.fillRect(x0+1,z0+1,x1-x0-2,z1-z0-2)}g.strokeStyle=LN;g.lineWidth=1.2;g.strokeRect(x0+.5,z0+.5,x1-x0-1,z1-z0-1)};
 const word=(t,cx,cz,px,col)=>{g.fillStyle=col||TX;g.font='bold '+px+'px "DotGothic16",monospace';g.textAlign='center';g.textBaseline='middle';if(al&&!/^[\d$:\-]+$/.test(t)&&typeof alnScribble=='function'){g.textBaseline='alphabetic';alnScribble(g,t,cx,cz+px*.35);g.textBaseline='middle'}else g.fillText(t,cx,cz)};
 for(const c of roulCells()){if(c.k!='bet')continue;const n=c.id[0]=='n'?+c.id.slice(1):null;box(c,n===null?null:n==0?GRN:WR_RED.has(n)?RD:BK);const cx=(X(c.x0)+X(c.x1))/2,cz=(Z(c.z0)+Z(c.z1))/2;
  if(n!==null){g.save();g.translate(cx,cz);if(n==0)g.rotate(-Math.PI/2);word(''+n,0,.5,n>=10?9:10);g.restore()}
  else if(c.id=='rd'||c.id=='bk'){g.fillStyle=c.id=='rd'?RD:BK;g.beginPath();g.moveTo(cx,cz-9);g.lineTo(cx+12,cz);g.lineTo(cx,cz+9);g.lineTo(cx-12,cz);g.closePath();g.fill();g.strokeStyle=LN;g.stroke()}
  else word(c.lab,cx,cz+.5,c.id[0]=='c'?9:11)}
 /* by the chips and the lever */
 RCHIPS.forEach((v,i)=>{const c=roulCells().find(q=>q.id=='ch'+i);word('$'+v,X(.25)+2,(Z(c.z0)+Z(c.z1))/2+.5,9,al?'#ffe9a0':'#ffe9b0')});
 {const c=roulCells().find(q=>q.id=='spin');g.strokeStyle=al?'#e0b84a':'#d8b25a';g.lineWidth=1.5;g.strokeRect(X(c.x0)+.5,Z(c.z0)+.5,X(c.x1)-X(c.x0)-1,Z(c.z1)-Z(c.z0)-1);word('SPIN',(X(c.x0)+X(c.x1))/2,Z(c.z1)-7,10,al?'#ffe9a0':'#ffe9b0')}
 const L=typeof sknLayer=='function'?sknLayer(cv):-1;return RFT[al?1:0]=L}
function roulTableMesh(al){const B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a),m=[];
 const WD=al?[86,60,150]:[104,66,40],WD2=al?[237,230,250]:[80,50,30],FE=al?[30,22,70]:[24,96,52],E=al?{e:1}:{};
 m.push(...B(0,.2,0,.92,.4,.92,WD),...B(0,.41,0,.94,.02,.94,FE));for(const z of[-.485,.485])m.push(...B(0,.43,z,.98,.05,.03,WD2));for(const x of[-.485,.485])m.push(...B(x,.43,0,.03,.05,.98,WD2));
 /* the painted cloth on top */
 const L=roulFeltTex(al),y=.4205,R=RFS;if(L>=0)m.push({p:[[-R,y,-R],[R,y,-R],[R,y,R],[-R,y,R]],n:[0,1,0],c:[255,255,255],e:al?1:0,uv:[[0,0],[1,0],[1,1],[0,1]],sk:L,g:0,vs:{}});
 else for(const c of roulCells()){if(c.k!='bet')continue;const n=c.id[0]=='n'?+c.id.slice(1):null;if(n===null)continue;m.push(...B((c.x0+c.x1)/2,.4215,(c.z0+c.z1)/2,c.x1-c.x0-.008,.003,c.z1-c.z0-.008,n==0?[40,150,70]:WR_RED.has(n)?[176,30,36]:[26,24,28]))}
 /* the chips to pick the value: a short stack of each */
 RCHIPS.forEach((v,i)=>{const z=-.4+i*.072;for(let k=0;k<3;k++)m.push(...C(.34,.423+k*.008,z,.03,.007,RCHC[i],{ax:'y',n:10}));m.push(...C(.34,.447,z,.018,.002,[240,236,220],{ax:'y',n:8}))});
 /* the lever that sends the ball */
 m.push(...B(-.345,.43,-.25,.12,.02,.2,al?[40,28,84]:[60,40,26]),...B(-.345,.5,-.25,.02,.14,.02,al?[150,140,255]:[200,170,90],{rx:.35}),...C(-.345,.57,-.226,.025,.03,al?[250,128,200]:[176,30,36],{ax:'y',n:8,...E}));
 return m}
/* a stack of chips (value index i, h chips high) and the frame round a box when it is aimed at */
const RSTK={};function roulStack(i,h){const k=i+'_'+h;if(RSTK[k])return RSTK[k];const m=[];for(let j=0;j<h;j++)m.push(...vmCyl(0,j*.007,0,.019,.0065,RCHC[i],{ax:'y',n:10}));m.push(...vmCyl(0,h*.007,0,.011,.0015,[240,236,220],{ax:'y',n:8}));return RSTK[k]=m}
function roulFrame(c,col){const B=(...a)=>vmBox(...a),m=[],w=c.x1-c.x0,d=c.z1-c.z0,cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2,t=.006,y=c.k=='bet'?RTOP+.003:.5;
 m.push(...B(cx,y,c.z0,w,.003,t,col,{e:1}),...B(cx,y,c.z1,w,.003,t,col,{e:1}),...B(c.x0,y,cz,t,.003,d,col,{e:1}),...B(c.x1,y,cz,t,.003,d,col,{e:1}));return m}
let RBALL=null;const roulBall=()=>RBALL||(RBALL=[...vmCyl(0,-.011,0,.009,.022,[246,244,238],{ax:'y',n:8}),...vmBox(0,0,0,.016,.016,.016,[246,244,238],{ry:.785})]);
/* table-local <-> world */
const rlW=(x,z)=>{const r=WEST.roul;return[r.x-z,r.y+x]},rlL=(X,Y)=>{const r=WEST.roul;return[Y-r.y,r.x-X]};
function roulBase(){const r=WEST.roul;if(SW){const f=swNearFloor(r.x,r.y,P.z+.5);return f===f?f:0}return FHc(r.x,r.y)}
/* what the crosshair is on: the box, or null (the view of the last frame drawn) */
function roulAim(){const W=WEST,r=W&&W.roul,cm=W&&W.cam;if(!r||!cm||T-cm.t>.2||(DM&&!CO()))return null;if(Math.hypot(r.x-P.x,r.y-P.y)>2.2)return null;
 const top=roulBase()+RTOP,den=cm.H/2-cm.hH;if(den<=1e-3)return null;const d=(EZ-top)*cm.H/den;if(!(d>0)||d>2.2)return null;
 const X=P.x+cm.dX*d,Y=P.y+cm.dY*d,[x,z]=rlL(X,Y);for(const c of roulCells())if(x>=c.x0&&x<c.x1&&z>=c.z0&&z<c.z1)return c;return null}
function roulTell(){const r=WEST.roul;wNet('wrb',{b:Object.entries(r.bets).slice(0,60)})}
function roulOthers(){const ob=WEST.roul.ob||{};for(const id in ob)for(const k in ob[id])if(ob[id][k]>0)return true;return false}
function roulBusy(){const r=WEST.roul;return r.st=='roll'||r.st=='drop'||r.st=='lock'}
function roulTotal(){const r=WEST.roul;let s=0;for(const k in r.bets)s+=r.bets[k];return s}
/* a click on the table: true if it was used (the gun does not fire) */
function roulClick(btn){const W=WEST;if(!W||!W.roul||state!='play'||(DM&&!CO())||PZ)return false;const c=roulAim();if(!c)return false;const r=W.roul;
 if(W.robbed){wMsg('"We don\'t serve thieves here."',2.2);return true}
 if(btn==2){if(c.k=='bet'&&r.bets[c.id]&&!roulBusy()){P.money=Math.min(MAXM(),(P.money|0)+r.bets[c.id]);delete r.bets[c.id];r.mv=null;roulTell();try{moneySync()}catch(er){}snd(900,.05,'square',.03,-300)}return true}
 if(btn!==0)return false;
 if(c.k=='chip'){r.chip=+c.id.slice(2);r.mv=null;snd(1200,.04,'square',.03,-200);return true}
 if(c.k=='spin'){roulSpin();return true}
 if(roulBusy()){wMsg('"NO MORE BETS!"',1.4);return true}
 const v=RCHIPS[r.chip];if((P.money|0)<v){wMsg('"You\'re short, friend."',1.6);snd(160,.15,'square',.04,-60);return true}
 if(roulTotal()+v>RLIM){wMsg('THE TABLE LIMIT IS $'+RLIM,1.6);return true}
 if(r.st=='done'){r.st='idle';r.win=null}
 r.bets[c.id]=(r.bets[c.id]||0)+v;P.money-=v;r.mv=null;roulTell();try{moneySync()}catch(er){}snd(1500,.03,'square',.03,-500);setTimeout(()=>snd(1900,.025,'square',.025,-500),40);return true}
function roulSpin(){const r=WEST.roul;if(roulBusy())return;if(!roulTotal()&&!roulOthers()){wMsg('"Place a bet first, partner."',1.6);return}
 const sp={a:+r.a.toFixed(3),v:+Math.max(r.v,2.2+Math.random()*.6).toFixed(3),ba:+(Math.random()*6.2832).toFixed(3),bw:+(-10-Math.random()*2.5).toFixed(3)};wNet('wrs',sp);roulGo(sp)}
/* the ball is sent (by whoever pulled the lever; every game then rolls it the same way) */
function roulGo(sp){const r=WEST.roul;if(!r||!r.bets)return;if(r.st=='done'){r.st='idle';r.win=null}
 r.a=sp.a;r.v=sp.v;r.bA=sp.ba;r.bW=sp.bw;r.acc=0;r.st='roll';r.bR=.196;r.t=0;r.win=null;r.mv=null;wMsg('"NO MORE BETS!"',1.4);snd(300,.25,'sawtooth',.03,600,{x:r.x,y:r.y})}
function roulStep(dt0){const W=WEST,r=W.roul;if(!r)return;if(!r.bets){r.bets={};r.chip=1;r.st='idle';r.ob={}}
 /* in steps of 1/120 s while the ball is out, so every player's game lands it in the same pocket */
 if(roulBusy()){r.acc=(r.acc||0)+dt0;let n=0;while(r.acc>=1/120&&n<60){r.acc-=1/120;n++;roulStep1(1/120)}return}roulStep1(dt0)}
function roulStep1(dt){const r=WEST.roul;
 r.a+=r.v*dt;r.v=Math.max(roulBusy()?.5:0,r.v-dt*(roulBusy()?.16:.35));if(!r.st||r.st=='idle')return;r.t+=dt;
 if(r.st=='roll'){r.bA+=r.bW*dt;r.bW*=Math.exp(-.3*dt);/* the ball clicking round the rim */r.ck=(r.ck||0)+Math.abs(r.bW)*dt;if(r.ck>2.2){r.ck=0;snd(2600,.012,'square',.012,-900,{x:r.x,y:r.y,r:2})}
  if(Math.abs(r.bW+r.v)<2.6){r.st='drop';r.t=0}}
 else if(r.st=='drop'){const u=Math.min(1,r.t/.8);r.bW+=(r.v-r.bW)*Math.min(1,dt*3);r.bA+=r.bW*dt;r.bR=.15+.046*(1-u)*Math.abs(Math.cos(u*Math.PI*2.5));
  if(r.t>.1&&((r.t*97)%1)<dt*9)snd(1800+Math.random()*900,.02,'square',.025,-1200,{x:r.x,y:r.y,r:2});
  if(u>=1){const k=((Math.round((r.bA+r.a)/6.2832*37)%37)+37)%37;r.k=k;r.n=WSEQ[k];r.st='lock';r.t=0;r.bR=.15;snd(1300,.03,'square',.03,-700,{x:r.x,y:r.y,r:2})}}
 else if(r.st=='lock'){r.bA=r.k/37*6.2832-r.a;if(r.t>.9)roulPay()}
 else if(r.st=='done'){r.bA=r.k/37*6.2832-r.a}}
function roulPay(){const r=WEST.roul,n=r.n,col=n==0?'GREEN':WR_RED.has(n)?'RED':'BLACK';let won=0,back=0;
 for(const c of roulCells()){const b=r.bets[c.id];if(!b||!c.f)continue;if(c.f(n)){won+=b*c.pay;back+=b*(c.pay+1)}}
 r.st='done';r.win='n'+n;const had=roulTotal()>0;r.bets={};r.ob={};r.mv=null;
 if(!had){wMsg(n+' '+col,2.4);return}
 if(back){P.money=Math.min(MAXM(),(P.money|0)+back);try{moneySync()}catch(er){}wMsg(n+' '+col+'!  YOU WIN $'+won,3.2);snd(660,.15,'triangle',.08,200);setTimeout(()=>snd(990,.25,'triangle',.08,200),150)}
 else{wMsg(n+' '+col+'.  THE HOUSE WINS',2.8);snd(160,.25,'square',.05,-60)}}
/* what is drawn on the table: chips on the bets, the frame round the aimed box, the marker on the last number, the ball */
function roulList(L){const W=WEST,r=W.roul;if(!r||!r.bets)return;if((r.x-P.x)**2+(r.y-P.y)**2>400)return;const base=roulBase(),aim=state=='play'?roulAim():null,key=JSON.stringify(r.bets)+JSON.stringify(r.ob||{})+'|'+r.chip+'|'+(aim?aim.id:'')+'|'+r.win;
 if(r.mvK!==key||!r.mv){const m=[],ob=r.ob||{};for(const c of roulCells()){let k2=0;for(const id in ob){const b2=ob[id][c.id];if(!b2)continue;k2++;let i2=RCHIPS.length-1;while(i2>0&&RCHIPS[i2]>b2)i2--;const cx=(c.x0+c.x1)/2+.016*(k2%2?1:-1),cz=(c.z0+c.z1)/2-.014*k2;for(const f of roulStack(i2,Math.min(6,Math.max(1,Math.round(b2/RCHIPS[i2])))))m.push(Object.assign({},f,{p:f.p.map(p=>[p[0]+cx,p[1]+RTOP+.002,p[2]+cz])}))}
  const b=r.bets[c.id];if(b){let left=b,j=0;/* stacks by value, biggest first, side by side */for(let i=RCHIPS.length-1;i>=0&&j<3;i--){const n=Math.floor(left/RCHIPS[i]);if(!n)continue;left-=n*RCHIPS[i];const cx=(c.x0+c.x1)/2+(j-.5)*.012,cz=(c.z0+c.z1)/2+(j%2)*.01;for(const f of roulStack(i,Math.min(6,n)))m.push(Object.assign({},f,{p:f.p.map(p=>[p[0]+cx,p[1]+RTOP+.002,p[2]+cz])}));j++}}}
   const cs=roulCells().find(c=>c.id=='ch'+r.chip);if(cs)m.push(...roulFrame(cs,[255,230,120]).map(f=>Object.assign({},f,{p:f.p.map(p=>[p[0],p[1]-.05+.03,p[2]])})));
   if(aim)m.push(...roulFrame(aim,aim.k=='bet'?[255,255,255]:[255,230,120]));
   if(r.win){const c=roulCells().find(c=>c.id==r.win);if(c){const cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2;m.push(...vmCyl(cx,RTOP,cz,.014,.03,[236,236,240],{ax:'y',n:8}),...vmCyl(cx,RTOP+.03,cz,.02,.006,[255,220,120],{ax:'y',n:8,e:1}))}}
   r.mv=m;r.mvK=key}
 if(r.mv.length)L.push({q:14,wo:'rlo',mesh:r.mv,x:r.x,y:r.y,yaw:RYAW,k:1,z:0});
 if(r.st&&r.st!='idle'){const [wx,wy]=rlW(0,-.24),bx=wx+Math.cos(r.bA)*r.bR,by=wy+Math.sin(r.bA)*r.bR,bz=r.st=='roll'?.513:r.st=='drop'?.505+.03*Math.abs(Math.sin(r.t*12)):.497;L.push({q:14,wo:'rlb',mesh:roulBall(),x:bx,y:by,yaw:0,k:1,z:bz})}}
/* on the screen: the numbers on the boxes (the felt is too small for painted ones), what a click would do */
function roulHud(c){const W=WEST,r=W.roul,cm=W.cam;if(!r||!r.bets||(DM&&!CO())||!cm||T-cm.t>.2||Math.hypot(r.x-P.x,r.y-P.y)>2.2)return;const base=roulBase(),sx=LW/cm.W,sy=LH/cm.H;
 const pr=(x,z,h)=>{const[X,Y]=rlW(x,z),dx=X-P.x,dy=Y-P.y,tx=cm.inv*(cm.dY*dx-cm.dX*dy),ty=cm.inv*(-cm.plY*dx+cm.plX*dy);if(ty<.12)return null;return[cm.W/2*(1+tx/ty)*sx,(cm.hH+(EZ-(base+h))*cm.H/ty)*sy,ty]};
 c.save();c.textAlign='center';
 const a=roulAim(),tot=roulTotal();c.font='8px "DotGothic16",monospace';c.textBaseline='alphabetic';let l1='',l2='CHIP $'+RCHIPS[r.chip]+'   ON THE TABLE $'+tot+(tot&&!roulBusy()?'   -   [CLICK THE LEVER] SPIN':'');
 if(roulBusy())l1='NO MORE BETS';else if(a){if(a.k=='bet'){const b=r.bets[a.id]||0;l1='CLICK: $'+RCHIPS[r.chip]+' ON '+(a.id[0]=='n'?'NUMBER ':'')+a.lab.toUpperCase()+'  (PAYS '+a.pay+':1)'+(b?'   RIGHT CLICK: TAKE BACK $'+b:'')}else if(a.k=='chip')l1='CLICK: BET WITH $'+a.lab.slice(1)+' CHIPS';else l1=tot?'CLICK: SPIN THE WHEEL':'PLACE A BET FIRST'}else l1='AIM AT THE TABLE AND CLICK TO BET';
 for(const[t,y]of[[l1,LH-82],[l2,LH-71]]){c.fillStyle='#000';c.fillText(t,LW/2+1,y+1);c.fillStyle='#ffe9b0';c.fillText(t,LW/2,y)}c.restore()}
addEventListener('mousedown',e=>{try{if(typeof WEST!='undefined'&&WEST&&roulClick(e.button)){e.stopImmediatePropagation();e.preventDefault()}}catch(er){}},true);

/* ===== 0.9.334: the saloon piano =====
   The piano player plays a ragtime tune of the town's own (a stride left hand, a syncopated right), synthesised here as a slightly out-of-tune
   upright. It comes from the piano: loud inside the saloon, faint and dull from the street, panned to where he sits; the floor music steps back
   while you are in the saloon. It stops when he stops (shot, or up and fighting). His hands move with the notes. */
const PNO={on:0,ev:null,i:0,t0:0,beat:0,g:null,lp:null,pn:null,cx:null,duck:1,last:0,seen:0};
const PNO_E=.21,PNO_Y=.86,PNO_DZ=.075;/* PNO_DZ (0.9.345): the stool is taller than a chair, so he sits that much higher *//* PNO_Y: how far from the piano's cell edge the player sits (the keys end at .64) *//* one eighth note, seconds */
function pnoTune(){if(PNO.ev)return PNO.ev;const ev=[],_=0;
 /* "Oh! Susanna" (Stephen Foster, 1848; public domain), the way a saloon player would bang it out: two verses and the chorus, a two-four
    oom-pah in the left hand (bass, chord, other bass, chord), a little grace note before the long ones. Each bar: four eighths, _ holds. */
 const CH={C:[36,43,[55,60,64]],F:[41,36,[57,60,65]],G:[43,38,[55,59,62]],G7:[43,38,[53,59,62]]};
 const V=[[[76,79,79,81],'C'],[[79,76,72,74],'C'],[[76,76,74,72],'C'],[[74,_,72,74],'G7'],[[76,79,79,81],'C'],[[79,76,72,74],'C'],[[76,76,74,74],'G7'],[[72,_,72,74],'C']];
 const CHO=[[[77,_,81,_],'F'],[[81,_,79,79],'C'],[[76,72,74,_],'G'],[[_,_,72,74],'G7'],[[76,79,79,81],'C'],[[79,76,72,74],'C'],[[76,76,74,74],'G7'],[[72,_,72,74],'C']];
 const BARS=[...V,...V,...CHO];
 BARS.forEach(([mel,cn],i)=>{const c=CH[cn],o=i*4;ev.push({e:o,m:c[0],l:1,v:.5,h:0},{e:o+2,m:c[1],l:1,v:.44,h:0});for(const n of c[2])ev.push({e:o+1,m:n,l:.7,v:.22,h:0},{e:o+3,m:n,l:.7,v:.2,h:0});
  mel.forEach((m,j)=>{if(!m)return;let l=1;while(j+l<4&&!mel[j+l])l++;if(l>=2)ev.push({e:o+j-.18,m:m-1,l:.15,v:.25,h:1});ev.push({e:o+j,m,l,v:.52,h:1});/* the second time round the right hand plays in octaves */ev.push({e:o+j,m:m-12,l,v:.22,h:1,x:1})})});
 ev.sort((a,b)=>a.e-b.e);if(ev[0].e<0)for(const q of ev)q.e+=.18;return PNO.ev=ev}
function pnoBus(){if(PNO.g&&PNO.cx===AC)return true;if(!AC)return false;try{const g=AC.createGain(),lp=AC.createBiquadFilter(),pn=AC.createStereoPanner?AC.createStereoPanner():null;g.gain.value=0;lp.type='lowpass';lp.frequency.value=3400;lp.Q.value=.4;g.connect(lp);if(pn){lp.connect(pn);pn.connect(AC.destination)}else lp.connect(AC.destination);PNO.g=g;PNO.lp=lp;PNO.pn=pn;PNO.cx=AC;return true}catch(e){return false}}
/* one note of a worn upright: two strings a little apart, a bright hammer at the start, a quick fall then a long fade */
function pnoNote(m,t,len,v){const A=AC,f=440*Math.pow(2,(m-69)/12),dec=Math.max(.35,1.6-(m-36)*.02),end=t+Math.max(len,.12)+dec;
 const g=A.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(v*.32,t+.1);g.gain.setValueAtTime(v*.32,t+Math.max(len,.12)*.9);g.gain.exponentialRampToValueAtTime(.0006,end);g.connect(PNO.g);
 for(const[ty,k,a]of[['triangle',1,.7],['triangle',1.012,.5],['triangle',.9935,.35],['sine',2.003,.25],['square',3,.03]])/* three strings out of tune with each other: the honky-tonk */{const o=A.createOscillator(),og=A.createGain();o.type=ty;o.frequency.value=f*k;og.gain.value=a;o.connect(og);og.connect(g);o.start(t);o.stop(end+.02)}}
function pnoPlaying(){const W=WEST,e=W&&W.pianist;return !!(e&&!e.dead&&e.pac&&e.sit)}
function pnoStep(dt){const W=WEST;PNO.last=performance.now();const e=W&&W.pianist;if(!e||!AC||BN.on){pnoQuiet();return}
 const pl=pnoPlaying(),px=e.x,py=e.y-.4,d=Math.hypot(px-P.x,py-P.y),s=W.saloon,inS=s&&P.x>=s.ix0&&P.x<s.ix1+1&&P.y>=s.iy0&&P.y<s.iy1+1;
 if(!pl||d>18||state!='play'){pnoQuiet();PNO.on=0;return}if(!pnoBus())return;const now=AC.currentTime;
 if(!PNO.on||now-PNO.t0>192*PNO_E){PNO.on=1;PNO.t0=now+.08;PNO.i=0;PNO.lap=0}
 const ev=pnoTune(),L=96*PNO_E;while(true){const q=ev[PNO.i],t=PNO.t0+q.e*PNO_E+(q.h?(Math.random()-.5)*.008:0);if(t>now+.3)break;if(t>now-.05&&!(q.x&&!(PNO.lap&1)))pnoNote(q.m,Math.max(now,t),q.l*PNO_E,q.v);if(++PNO.i>=ev.length){PNO.i=0;PNO.t0+=L;PNO.lap++}}
 PNO.beat=Math.floor((now-PNO.t0)/PNO_E);
 /* co-op: the host says where in the tune he is every few seconds, so everyone hears the same bar */
 if(typeof HOSTCO=='function'&&HOSTCO()){PNO.st=(PNO.st||0)-dt;if(PNO.st<=0){PNO.st=3;wNet('wpn',{p:+((now-PNO.t0)/PNO_E+PNO.lap*96).toFixed(3)})}}
 else if(PNO.sync){const q=PNO.sync;PNO.sync=null;const pos=q.p+(now-q.at)/PNO_E,lap=Math.floor(pos/96),t0=now-(pos-lap*96)*PNO_E;if(Math.abs(t0-PNO.t0)>.05||lap!==PNO.lap){PNO.t0=t0;PNO.lap=lap;const ev=pnoTune(),cur=pos-lap*96+.3/PNO_E;let i=0;while(i<ev.length&&ev[i].e<cur)i++;if(i>=ev.length){i=0;PNO.t0+=96*PNO_E;PNO.lap++}PNO.i=i}}
 /* how loud it is where you stand, which way it comes from, the music stepping back */
 const k=(inS?.55:.22)/(1+(d/4)*(d/4)),tg=Math.max(0,k);PNO.g.gain.setTargetAtTime(tg,now,.08);PNO.lp.frequency.setTargetAtTime(inS?3400:900,now,.1);
 if(PNO.pn){const dx=px-P.x,dy=py-P.y,dd=Math.hypot(dx,dy)||1;PNO.pn.pan.setTargetAtTime(dd>.5?Math.max(-.8,Math.min(.8,(-dx*Math.sin(P.a)+dy*Math.cos(P.a))/dd*Math.min(1,dd/3))):0,now,.05)}
 pnoDuck(inS?.3:1)}
function pnoDuck(k){if(Math.abs(PNO.duck-k)<.02)return;PNO.duck=k;try{if(AUD&&AUD.U&&AC)AUD.U.gain.setTargetAtTime(AUD.u/100*MUSG*k,AC.currentTime,.25)}catch(e){}}
function pnoQuiet(){try{if(PNO.g&&AC)PNO.g.gain.setTargetAtTime(0,AC.currentTime,.05)}catch(e){}PNO.on=0;pnoDuck(1)}
/* the hands: which pose this eighth (humV0 asks); 0 when he is not playing */
function pianoV(e){if(!PNO.on||!pnoPlaying())return 0;return(10+((PNO.beat*5+((PNO.beat>>3)&1))&3))*100}
/* nothing has stepped the town for a moment (another floor, the menu, the end of the run): fall silent and give the music back */
setInterval(()=>{if(PNO.on||PNO.duck!==1){if(performance.now()-PNO.last>1500)pnoQuiet()}},500);


/* ---------------- the town on the ruined floors (16-25) and on the alien world (past 25) ---------------- */
const wRuin=()=>typeof apocOn=='function'&&apocOn(),wAlien=()=>typeof alienOn=='function'&&alienOn();
/* an alien recolour of a finished texture: its light and dark kept, its colours swapped for a palette (rock: magenta and violet; metal: teal steel with
   glowing panel seams; ground: dusky violet), the colours of the painted signs pushed toward neon */
const WAPAL={rock:[[34,10,46],[118,40,150],[236,140,255]],metal:[[18,24,40],[70,108,132],[180,246,250]],ground:[[30,18,52],[92,64,140],[190,160,240]],deck:[[22,26,44],[64,84,112],[150,200,230]]};
function wAlienTex(a,kind,seam){if(!(a instanceof Uint32Array))return a;const C=WTXC&&(WTXC.al||(WTXC.al=new Map())),key=a;let m=C&&C.get(key);if(m&&m[kind])return m[kind];
 const n=Math.round(Math.sqrt(a.length)),o=new Uint32Array(a.length),pal=WAPAL[kind];
 for(let i=0;i<a.length;i++){const v=a[i],al=v>>>24,r=v&255,g=v>>8&255,b=v>>16&255,L=(r*.3+g*.59+b*.11)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx?(mx-mn)/mx:0;let c;
  if(L<.5){const t=L/.5;c=[0,1,2].map(k=>pal[0][k]+(pal[1][k]-pal[0][k])*t)}else{const t=(L-.5)/.5;c=[0,1,2].map(k=>pal[1][k]+(pal[2][k]-pal[1][k])*t)}
  if(sat>.45&&L>.35&&kind!='rock'){/* painted colours (signs, trims) become neon */const h=(r>g&&r>b)?[255,80,200]:(g>=r&&g>=b)?[90,255,200]:[80,200,255];c=c.map((x,k)=>x*.35+h[k]*.65)}
  o[i]=(al<<24|(Math.min(255,c[2])|0)<<16|(Math.min(255,c[1])|0)<<8|(Math.min(255,c[0])|0))>>>0}
 if(seam){const s2=Math.max(1,n>>6);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const ex=(x%(n>>1))<s2||(y%(n>>1))<s2;if(ex){const i=y*n+x;o[i]=(255<<24|60<<16|50<<8|30)>>>0}}
  for(const[fx,fy]of[[.06,.06],[.56,.06],[.06,.56],[.56,.56]]){const cx=fx*n|0,cy=fy*n|0;for(let y=0;y<Math.max(2,n>>5);y++)for(let x=0;x<Math.max(2,n>>5);x++)o[(cy+y)*n+cx+x]=(255<<24|250<<16|240<<8|120)>>>0}}
 if(kind=='rock'){/* glowing crystal veins */let sd=(a.length*7+13)>>>0;const rnd=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;for(let v=0;v<4;v++){let x=rnd()*n,y=rnd()*n,dx=rnd()*2-1,dy=rnd()*2-1;const col=v%2?(255<<24|240<<16|120<<8|255):(255<<24|230<<16|250<<8|120);for(let t=0;t<n*.7;t++){const i=(y|0)*n+(x|0);if(i>=0&&i<o.length){o[i]=col>>>0;if((x|0)+1<n)o[i+1]=col>>>0}x+=dx;y+=dy;dx+=(rnd()-.5)*.6;dy+=(rnd()-.5)*.6;const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;if(x<0||y<0||x>=n||y>=n)break}}}
 if(C){if(!m){m={};C.set(key,m)}m[kind]=o}return o}
function westLook(){const W=WEST;
 if(wAlien()&&typeof alnRecolor=='function'){const C=WTXC&&(WTXC.al2||(WTXC.al2=new Map()));let k=0;const d=(a,flo)=>{if(!(a instanceof Uint32Array))return a;const key=a;let r=C&&C.get(key);if(!r){r=alnRecolor(a,k++,flo);if(C)C.set(key,r)}return r};
  TX=TX.map(t=>d(t));TU=TU.map(t=>d(t));TIN=TIN.map(t=>d(t));CT=CT.map(t=>t?d(t,1):t);FT=d(FT,1);RT=d(RT);CEIL=CEIL.map(t=>d(t));RAILV={vault:d(RAILV.vault),rock:d(RAILV.rock),portal:d(RAILV.portal)};if(RTS)for(const q in RTS)RTS[q]=d(RTS[q],1);return}
 if(wRuin()&&typeof apocDecay=='function'){const mp=new Map(),d=a=>{if(!(a instanceof Uint32Array))return a;let r=mp.get(a);if(!r){r=apocDecay(a,mp.size);mp.set(a,r)}return r};
  TX=TX.map(d);TU=TU.map(d);TIN=TIN.map(d);CT=CT.map(d);FT=d(FT);RT=d(RT);CEIL=CEIL.map(d);RAILV={vault:d(RAILV.vault),rock:d(RAILV.rock),portal:d(RAILV.portal)};if(RTS)for(const k in RTS)RTS[k]=d(RTS[k])}}
/* the props on the alien world: wood and brass turned to steel, with the same light and shade */
let WESTMA=null;
function wAlienMesh(M){const AME=[128,92,199],LAV=[184,158,235],PRL=[237,230,250];return M.map(F=>F.map(q=>{if(!q||!q.c||q.e)return q;const c=q.c,L=(c[0]*.3+c[1]*.59+c[2]*.11)/255,sat=Math.max(...c)?(Math.max(...c)-Math.min(...c))/Math.max(...c):0;let n=sat>.55&&L>.3?(c[0]>c[1]?[250,128,200]:[64,242,235]):L<.4?AME.map((v,i)=>v*(.45+L)):L<.65?LAV.map((v,i)=>AME[i]+(v-AME[i])*(L-.4)/.25):LAV.map((v,i)=>v+(PRL[i]-v)*Math.min(1,(L-.65)/.3));return Object.assign({},q,{c:n.map(v=>Math.min(255,v|0))})}))}

/* the alien world's own pieces: crystal spires instead of cacti, glowing pod clusters instead of rocks, egg sacs instead of hay, crystal pylons for street
   lamps, energy rails, a glowing pool for the trough; on the roofs dishes, antennas with beacons and domes; hover drones pull the coach */
function wAlienKit(M){const B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a),A=M.slice(),CY=[64,242,235],MG=[250,128,200],VI=[128,92,199],DK=[184,158,235];
 {const m=[];for(const[x,z,h,r,c]of[[0,0,1.4,.09,CY],[.16,.08,.9,.07,MG],[-.14,.1,1.05,.06,CY],[.05,-.16,.7,.06,VI]]){m.push(...C(x,0,z,r,h,c,{ax:'y',n:5,r2:.005,e:c!==VI?1:0}),...C(x,0,z,r*1.5,.08,DK,{ax:'y',n:5}))}A[6]=m}
 {const m=[];m.push(...C(0,0,0,.24,.12,[60,40,90],{ax:'y',n:7,r2:.16}));for(const[x,z,r,c]of[[.1,.05,.11,MG],[-.08,.1,.09,CY],[0,-.12,.1,MG],[.16,-.1,.06,CY]])m.push(...C(x,.1,z,r,r*1.6,c,{ax:'y',n:7,r2:.02,e:1}));A[20]=m}
 {const m=[];for(const[x,z,r]of[[0,0,.16],[.2,.08,.12],[-.18,.1,.13]])m.push(...C(x,0,z,r,r*2.2,[150,90,200],{ax:'y',n:8,r2:.03}),...C(x,r*1.2,z,r*.5,r*.4,CY,{ax:'y',n:6,e:1}));A[7]=m}
 {const m=[];m.push(...C(0,0,0,.08,1.1,DK,{ax:'y',n:6,r2:.05}),...C(0,1.1,0,.1,.26,MG,{ax:'y',n:5,r2:.01,e:1}),...C(0,.9,0,.15,.03,CY,{ax:'y',n:8,e:1}));A[23]=m}
 {const m=[];for(const x of[-.42,.42])m.push(...B(x,.25,0,.08,.5,.08,DK),...B(x,.5,0,.1,.04,.1,CY,{e:1}));m.push(...B(0,.4,0,.84,.03,.03,CY,{e:1}));A[4]=m}
 {const m=[];m.push(...B(0,.12,0,.8,.24,.36,DK),...B(0,.235,0,.7,.01,.26,[110,255,200],{e:1}));A[5]=m}
 wAlienFurn(A);
 /* 0.9.334: the roulette table with the alien cloth, and the organist's seat */
 A[37]=roulTableMesh(true);A[38]=[...C(0,0,0,.11,.02,[86,60,150],{ax:'y',n:8}),...C(0,.02,0,.03,.17,[206,196,240],{ax:'y',n:6}),...C(0,.19,0,.1,.04,VI,{ax:'y',n:10,r2:.14}),...C(0,.23,0,.14,.01,[237,230,250],{ax:'y',n:10}),...C(0,.02,0,.11,.008,CY,{ax:'y',n:10,e:1})];return A}
/* 0.9.330: the furniture of the alien town: nothing is wood or brass. Pearl shells, violet stone, dark glass and things that glow, all the same size and
   facing as the western pieces they stand in for (the seated folk, the piano player and the dart thrower line up with them as before) */
function wAlienFurn(A){const B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a),ST=[237,230,250],ST2=[206,196,240],VI=[128,92,199],VD=[86,60,150],IN=[40,28,84],CY=[64,242,235],MG=[250,128,200],GN=[120,255,170],E={e:1};
 /* 0 a hover table: a tapering stem on a glowing foot ring, a pearl top with a lit rim, a hologram disc, a crystal vial and glowing chips */
 {const m=[];m.push(...C(0,0,0,.16,.03,VD,{ax:'y',n:10}),...C(0,.03,0,.16,.012,CY,{ax:'y',n:10,e:1}),...C(0,.04,0,.07,.2,ST2,{ax:'y',n:8,r2:.035}),...C(0,.24,0,.1,.03,VI,{ax:'y',n:10,r2:.3}),...C(0,.26,0,.33,.03,ST,{ax:'y',n:16}),...C(0,.29,0,.34,.008,CY,{ax:'y',n:16,e:1}),...C(0,.29,0,.29,.008,IN,{ax:'y',n:16}),...C(0,.298,0,.12,.004,[110,90,230],{ax:'y',n:12,e:1}));
  m.push(...C(.12,.3,-.08,.025,.14,MG,{ax:'y',n:5,r2:.008,e:1}),...C(.12,.3,-.08,.035,.02,ST2,{ax:'y',n:6}));for(const[x,z,c]of[[-.12,-.06,CY],[-.08,.1,MG],[-.15,.06,GN],[.04,.14,CY]])m.push(...C(x,.3,z,.028,.012,c,{ax:'y',n:6,e:1}));A[0]=m}
 /* 1 a pod seat: a cup on a stem, a curved shell for a back (toward -z) */
 {const m=[];m.push(...C(0,0,0,.11,.02,VD,{ax:'y',n:8}),...C(0,.02,0,.03,.14,ST2,{ax:'y',n:6}),...C(0,.15,0,.1,.06,VI,{ax:'y',n:10,r2:.15}),...C(0,.205,0,.135,.008,ST,{ax:'y',n:10}));
  for(let k=0;k<5;k++){const a=(k-2)*.42;m.push(...B(Math.sin(a)*.13,.36,-Math.cos(a)*.13,.11,.3,.03,ST,{ry:-a}))}m.push(...B(0,.5,-.13,.06,.02,.035,CY,E));A[1]=m}
 /* 2 the bar: a pearl slab over a violet body, a lit seam along the top and the foot on the customers' side (+z), glowing vials on it */
 {const m=[];m.push(...B(0,.22,0,1.0,.44,.4,VD),...B(0,.2,.15,1.0,.36,.12,VI),...B(0,.455,.01,1.02,.035,.5,ST),...B(0,.43,.255,1.0,.015,.012,CY,E),...B(0,.02,.215,1.0,.025,.03,CY,E));for(const x of[-.33,0,.33])m.push(...B(x,.22,.214,.05,.26,.01,MG,E));
  m.push(...C(.25,.47,0,.03,.14,CY,{ax:'y',n:5,r2:.01,e:1}),...C(-.2,.47,.05,.024,.07,GN,{ax:'y',n:6,r2:.03,e:1}));A[2]=m}
 /* 3 the light-organ in place of the piano: a dark console, a fan of glowing pipes behind, a floating row of lit pads for keys (toward +z) */
 {const m=[];m.push(...B(0,.18,0,.86,.36,.3,IN),...B(0,.34,.04,.86,.04,.36,VD),...B(0,.375,.2,.8,.014,.15,VI));for(let k=0;k<12;k++)m.push(...B(-.36+k*.065,.39,.2,.05,.012,.11,k%3==2?MG:CY,E));
  m.push(...B(0,.56,-.1,.9,.42,.06,VD));for(let k=0;k<9;k++){const x=-.38+k*.095,h=.32+.36*Math.sin((k+.5)/9*Math.PI);m.push(...C(x,.36,-.04,.028,h,k%2?MG:CY,{ax:'y',n:6,e:1}),...C(x,.36+h,-.04,.04,.02,ST,{ax:'y',n:6}))}
  m.push(...C(0,.36,-.04,.44,.03,ST,{ax:'z',n:12,r2:.44}),...B(0,.5,.17,.32,.1,.015,[150,140,255],E));A[3]=m}
 /* 8 a stasis pod stood on its foot: a pearl capsule with a lit window */
 {const m=[];m.push(...C(0,0,-.02,.2,.1,VD,{ax:'y',n:10}),...C(0,.1,-.02,.18,.72,ST,{ax:'y',n:10,r2:.16}),...C(0,.82,-.02,.16,.12,ST,{ax:'y',n:10,r2:.05}),...B(0,.5,.13,.18,.46,.04,[120,220,240],E),...B(0,.5,.125,.22,.5,.03,VI));A[8]=m}
 /* 11 a rack of ray rifles on the wall (-z) */
 {const m=[];m.push(...B(0,.6,-.43,.9,.5,.05,VD),...B(0,.6,-.4,.84,.44,.01,IN));for(const x of[-.28,0,.28]){m.push(...B(x,.62,-.37,.05,.38,.04,ST),...C(x,.81,-.37,.03,.08,CY,{ax:'y',n:6,e:1}),...B(x,.45,-.37,.07,.12,.05,VI),...B(x+.03,.58,-.37,.02,.1,.06,MG,E))}A[11]=m}
 /* 12 the shop counter: a pearl case with a lit glass top and glowing wares inside */
 {const m=[];m.push(...B(0,.2,0,1.0,.4,.42,VD),...B(0,.41,0,1.0,.02,.44,[120,220,240],E),...B(0,.43,0,1.02,.018,.46,ST),...B(0,.02,.22,1.0,.025,.02,CY,E));for(const[x,c]of[[-.3,MG],[.05,CY],[.32,GN]])m.push(...B(x,.39,0,.18,.015,.06,ST),...B(x-.05,.395,.03,.05,.015,.04,c,E));A[12]=m}
 /* 16 a sleep pod: an oval shell, a glowing mattress, a clear canopy over the head end (toward -z) */
 {const m=[];m.push(...C(0,0,0,.3,.14,VD,{ax:'y',n:12}));for(const q of m)q.p=q.p.map(p=>[p[0]*1,p[1],p[2]*1.7]);const t=[...B(0,.17,0,.52,.06,.94,ST),...B(0,.21,.05,.46,.03,.8,[170,150,250],E),...B(0,.235,-.36,.34,.04,.14,ST)];m.push(...t);
  for(let k=0;k<6;k++){const a=k/5*Math.PI;m.push(...B(Math.cos(a)*.27,.22+Math.sin(a)*.24,-.3,.06,.04,.38,[150,230,250],{rz:a+Math.PI/2,e:1}))}A[16]=m}
 /* 17 floating shelves (-z) of crystal vials */
 {const m=[],VC=[CY,MG,GN,[150,140,255],[255,220,120]];m.push(...B(0,.75,-.48,.98,.9,.03,VD));for(const y of[.45,.75,1.05])m.push(...B(0,y,-.4,.96,.025,.16,ST),...B(0,y-.016,-.33,.96,.008,.01,CY,E));let k=0;for(const y of[.465,.765,1.065])for(let x=-.4;x<=.41;x+=.1){const c=VC[(k++*7)%5];m.push(...C(x,y,-.4,.026,.14,c,{ax:'y',n:5,r2:.006,e:1}))}A[17]=m}
 /* 18 jail bars of light between pearl rails */
 {const m=[];for(let k=0;k<8;k++)m.push(...B(-.44+k*.125,.75,0,.02,1.3,.02,MG,E));for(const y of[.05,1.45])m.push(...B(0,y,0,1.0,.1,.08,ST));A[18]=m}
 /* 19 a hover-drive ring leaning on the wall (-z) */
 {const m=[],RD=.3;for(let k=0;k<14;k++){const a=k/14*6.283;m.push(...B(Math.cos(a)*RD,RD+Math.sin(a)*RD,0,.15,.06,.06,ST,{rz:a+1.571}),...B(Math.cos(a)*(RD-.05),RD+Math.sin(a)*(RD-.05),.01,.12,.02,.04,CY,{rz:a+1.571,e:1}))}m.push(...C(0,RD,-.04,.12,.08,VD,{ax:'z',n:10}),...C(0,RD,.0,.06,.06,MG,{ax:'z',n:8,e:1}));vmTurn(m,[0,0,0],-.25,0,0);for(const q of m)q.p=q.p.map(p=>[p[0],p[1],p[2]-.3]);A[19]=m}
 /* 21 the hotel desk: a pearl desk, a glowing orb for the bell, a hologram page for the register */
 {const m=[];m.push(...B(0,.22,0,1.0,.44,.4,VD),...B(0,.455,0,1.04,.03,.46,ST),...B(0,.02,.21,1.0,.025,.02,CY,E),...C(.25,.47,0,.04,.05,MG,{ax:'y',n:8,r2:.01,e:1}),...B(-.15,.58,0,.22,.16,.01,[120,220,240],{rx:-.3,e:1}),...C(-.15,.47,0,.03,.02,VI,{ax:'y',n:6}));A[21]=m}
 /* 22 store shelves (-z): orbs, crystals and boxes that glow */
 {const m=[],G=[CY,MG,GN,[150,140,255],ST,[255,220,120]];m.push(...B(0,.6,-.44,.98,1.2,.04,VD));for(const y of[.04,.36,.68,1.0])m.push(...B(0,y,-.32,.96,.03,.26,ST));let k=0;for(const y of[.055,.375,.695,1.015])for(let x=-.38;x<=.39;x+=.152){const c=G[(k++*5)%6],e=c!==ST?1:0;k%3?m.push(...C(x,y,-.32,.05,.13,c,{ax:'y',n:6,r2:.02,e})):m.push(...B(x,y+.08,-.32,.11,.16,.12,c,{ry:.4,e}))}A[22]=m}
 /* 24 a hologram target on the wall (-z), three crystal darts in it */
 {const m=[];m.push(...B(0,.78,-.47,.5,.5,.04,VD),...C(0,.78,-.45,.21,.02,IN,{ax:'z',n:16}));const R=[[.19,CY],[.14,MG],[.09,CY],[.045,MG],[.015,ST]];R.forEach(([r,c],i)=>m.push(...C(0,.78,-.43+i*.01,r,.008,c,{ax:'z',n:16,e:1}),...C(0,.78,-.425+i*.01,r-.022,.008,IN,{ax:'z',n:16})));
  for(const[x,y]of[[.05,.82],[-.07,.74],[.02,.7]])m.push(...B(x,y,-.34,.014,.014,.12,ST),...B(x,y,-.28,.035,.035,.02,GN,{rz:.785,e:1}));A[24]=m}

}
function wAlienMov(){const B=(...a)=>vmBox(...a),C=(...a)=>vmCyl(...a),CY=[64,242,235],MG=[250,128,200],DK=[128,92,199],ST=[237,230,250];
 const drone=[];drone.push(...C(0,.42,-.25,.16,.55,ST,{ax:'z',n:8,r2:.1}),...C(0,.42,.08,.24,.05,DK,{ax:'z',n:12}),...B(0,.46,.32,.12,.06,.04,MG,{e:1}),...C(0,.22,-.05,.14,.03,CY,{ax:'y',n:8,e:1}));
 const dish=[],ant=[],dome=[],beacon=[];
 dish.push(...C(0,0,0,.05,.25,DK,{ax:'y',n:6}),...C(0,.25,0,.3,.05,ST,{ax:'y',n:10,r2:.05,rx:-.6,pv:[0,.25,0]}),...B(0,.42,.12,.02,.2,.02,ST,{rx:-.6,pv:[0,.25,0]}),...B(0,.5,.18,.05,.05,.05,MG,{e:1}));
 ant.push(...C(0,0,0,.03,.9,ST,{ax:'y',n:5}),...B(0,.55,0,.3,.02,.02,ST),...B(0,.75,0,.18,.02,.02,ST),...C(0,.9,0,.05,.06,MG,{ax:'y',n:6,e:1}));
 dome.push(...C(0,0,0,.42,.08,DK,{ax:'y',n:12}),...C(0,.08,0,.38,.3,[80,220,230],{ax:'y',n:12,r2:.05,e:1}),...B(0,.04,.4,.14,.08,.04,MG,{e:1}));
 beacon.push(...C(0,0,0,.05,.5,ST,{ax:'y',n:5}),...C(0,.5,0,.09,.09,[255,60,90],{ax:'y',n:8,r2:.02,e:1}));
 /* a flying saucer: a wide disc, a domed cockpit, lights round the rim, a glow underneath */
 const ufo=[];ufo.push(...C(0,0,0,.6,.08,ST,{ax:'y',n:16,r2:.3}),...C(0,-.06,0,.62,.06,DK,{ax:'y',n:16,r2:.6}),...C(0,.08,0,.26,.18,[120,240,250],{ax:'y',n:12,r2:.08,e:1}),...C(0,-.1,0,.22,.04,[150,255,200],{ax:'y',n:10,e:1}));for(let k=0;k<10;k++){const a=k/10*6.283;ufo.push(...B(Math.cos(a)*.58,.0,Math.sin(a)*.58,.06,.05,.06,k%2?MG:CY,{e:1}))}
 /* the wheel of chance: a pearl dish, a ring of glowing pockets in three colours (a gold one for the zero), a crystal in the middle */
 const wheel=[];wheel.push(...C(0,0,0,.22,.05,[86,60,150],{ax:'y',n:18}),...C(0,.05,0,.2,.012,[40,28,84],{ax:'y',n:18}));for(let k=0;k<37;k++){const a=k/37*6.2832,n=WSEQ[k];wheel.push(...B(Math.cos(a)*.15,.064,Math.sin(a)*.15,.024,.006,.05,n==0?[255,220,120]:WR_RED.has(n)?MG:CY,{ry:-a,e:1}),...B(Math.cos(a+.085)*.15,.07,Math.sin(a+.085)*.15,.004,.012,.05,ST,{ry:-a-.085}))}
 wheel.push(...C(0,.05,0,.205,.02,ST,{ax:'y',n:18,r2:.215}),...C(0,.06,0,.08,.012,[128,92,199],{ax:'y',n:12}),...C(0,.07,0,.035,.1,[150,140,255],{ax:'y',n:5,r2:.004,e:1}));for(let k=0;k<3;k++)wheel.push(...B(0,.1,0,.11,.01,.01,ST,{ry:k*1.047}));
 return{horse:drone,dish,ant,dome,beacon,ufo,wheel}}
/* rooftop pieces for every building (the alien world only), from the fixed layout */
function wRoofKit(){const W=WEST;const R=[];for(const b of W.b){const N0=b.sd=='n',yy=b.fy+(N0?-.75:1.75),kinds=['dish','ant','dome','beacon'];let k=b.k.length;
  for(let x=b.x0+1;x<b.x1;x+=2){const kind=kinds[(k++)%4];R.push({x:x+.5,y:yy,z:1.85,wo:kind,yaw:wHash(x,b.y0,71)*6.28,k:1.5})}}return R}

/* ===== g3d.js - the built-in grid levels as true 3D worlds =====
   The level generators still lay a level out on a grid (rooms, corridors, pits, props, spawns). Once a floor is generated this file turns that grid into
   the same kind of 3D world the imported maps and the castle use: textured triangles to draw, solid boxes to collide with, and a list of the floors a body can stand on.
   Everything then runs through the one 3D path (physics, bullets, ragdolls, killcams) instead of a second grid path. */
var G3D={on:true,err:null,last:null};try{if(localStorage.getItem('ld_g3d')=='0')G3D.on=false}catch(e){}
/* which floors are converted; the others keep the old grid path until their features are ported */
function g3Can(){return g3dCan()}
function g3dCan(){
  if(!G3D.on)return false;
  if(typeof CASF!='undefined'&&CASF||typeof SPCF!='undefined'&&SPCF)return false;
  return true}
function g3dTex(t){
  if(t instanceof Uint32Array)return t;
  if(t&&t.getContext){const w=t.width,h=t.height,d=t.getContext('2d').getImageData(0,0,w,h);return new Uint32Array(d.data.buffer.slice(0))}
  return null}
function g3dBuild(){
  const n=N,ZB=-8,ZT=40,top=WHT,G=(x,y)=>x<0||y<0||x>=n||y>=n?1:g[y*n+x];
  const MT=[],mi=new Map();
  const mat=t=>{if(!t)t=RT;let k=mi.get(t);if(k===undefined){const u=g3dTex(t)||g3dTex(RT);k=MT.length;MT.push(u);mi.set(t,k)}return k};
  const TPo=[],TUv=[],TFc=[],FCls=[],FSh=[],FNx=[],FT0=[],FTn=[],FFl=[],FMt=[];let nTri=0;
  /* one flat quad. p: 4 points, u: 4 uv, nrm: the way it faces (the winding is fixed to match) */
  const quad=(p,u,m,sh,nrm)=>{
    const e1=[p[1][0]-p[0][0],p[1][1]-p[0][1],p[1][2]-p[0][2]],e2=[p[2][0]-p[0][0],p[2][1]-p[0][1],p[2][2]-p[0][2]];
    const cx=e1[1]*e2[2]-e1[2]*e2[1],cy=e1[2]*e2[0]-e1[0]*e2[2],cz=e1[0]*e2[1]-e1[1]*e2[0];
    if(cx*nrm[0]+cy*nrm[1]+cz*nrm[2]<0){p=[p[0],p[3],p[2],p[1]];u=[u[0],u[3],u[2],u[1]]}
    const fid=FCls.length;FCls.push(0);FSh.push(Math.max(0,Math.min(255,Math.round(sh*255))));FNx.push(nrm[0],nrm[1],nrm[2]);FT0.push(nTri);FTn.push(2);FFl.push(0);FMt.push(m);
    for(const t of[[0,1,2],[0,2,3]]){for(const k of t)TPo.push(p[k][0],p[k][1],p[k][2]);for(const k of t)TUv.push(u[k][0],u[k][1]);TFc.push(fid);nTri++}};
  /* the face on the boundary of cell (x,y) towards dir (0:-x 1:+x 2:-y 3:+y), from z0 to z1; same texture mapping the grid renderer used */
  const bnd=(x,y,d,z0,z1,tv0,tv1,flip)=>{let a,b;if(d==0){a=[x,y];b=[x,y+1]}else if(d==1){a=[x+1,y];b=[x+1,y+1]}else if(d==2){a=[x,y];b=[x+1,y]}else{a=[x,y+1];b=[x+1,y+1]}
    const u0=flip?1:0,u1=flip?0:1;return{p:[[a[0],a[1],z0],[b[0],b[1],z0],[b[0],b[1],z1],[a[0],a[1],z1]],u:[[u0,tv0],[u1,tv0],[u1,tv1],[u0,tv1]]}};
  const flipOf=d=>d==1||d==2,sideX=d=>d<2,DX=[-1,1,0,0],DY=[0,0,-1,1];
  /* solid boxes for collision */
  const BPl=[],B0=[0],BBb=[],BCls=[];
  const box=(x0,y0,z0,x1,y1,z1,cls)=>{BCls.push(cls||0);BPl.push(1,0,0,x1,-1,0,0,-x0,0,1,0,y1,0,-1,0,-y0,0,0,1,z1,0,0,-1,-z0);B0.push(BPl.length/4);BBb.push(x0,y0,z0,x1,y1,z1)};
  const CG=typeof GR!='undefined'&&GR&&GR.cq&&typeof COLG!='undefined'&&COLG?COLG:[],CRS=new Set((typeof CR!='undefined'&&CR?CR:[]).map(c=>c.i).concat(CG)),MOV=[],MVB=new Set();
  const lo=[];let zlo=1e9,zhi=-1e9;
  /* ---- floors (merged along x) and the slabs under them ---- */
  for(let y=0;y<n;y++){let x=0;while(x<n){const i=y*n+x;if(g[i]){x++;continue}
    const fh=FH[i],tx=ct[i]&&CT[ct[i]]?CT[ct[i]]:brg[i]?BT:FT,pf=pit[i]?(fh<-1?.1:.28):1,tm=mat(tx);let x1=x+1;
    while(x1<n){const j=y*n+x1;if(g[j]||FH[j]!==fh||pf!==(pit[j]?(FH[j]<-1?.1:.28):1)||(ct[j]&&CT[ct[j]]?CT[ct[j]]:brg[j]?BT:FT)!==tx||CZ[j]<.99!==CZ[i]<.99)break;x1++}
    quad([[x,y,fh],[x1,y,fh],[x1,y+1,fh],[x,y+1,fh]],[[x,y],[x1,y],[x1,y+1],[x,y+1]],tm,pf,[0,0,1]);
    box(x,y,ZB,x1,y+1,fh);zlo=Math.min(zlo,fh);zhi=Math.max(zhi,fh);x=x1}}
  /* ---- cells: low arches, risers between floor heights, walls ---- */
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x;
    if(!g[i]){const fh=FH[i],cz=CZ[i];
      if(!CRS.has(i)&&(cz<.99||(cz>1&&cz<top-.01))){const tp=top;
        for(let d=0;d<4;d++){const f=bnd(x,y,d,cz,tp,1,1-(tp-cz),flipOf(d));quad(f.p,f.u,mat(PT||RT),sideX(d)?1:.7,[DX[d],DY[d],0])}
        quad([[x,y,cz],[x+1,y,cz],[x+1,y+1,cz],[x,y+1,cz]],[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],mat(PT||RT),.6,[0,0,-1]);
        quad([[x,y,tp],[x+1,y,tp],[x+1,y+1,tp],[x,y+1,tp]],[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],mat(PT||RT),1,[0,0,1]);
        box(x,y,cz,x+1,y+1,ZT)}
      for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d];if(G(nx,ny))continue;const fn=FH[ny*n+nx];
        if(fn>fh+.001){const f=bnd(x,y,d,fh,fn,1-fh,1-fn,!flipOf(d));const rt=(RTS&&RTS[Math.round(fn*100)])||RT;quad(f.p,f.u,mat(rt),sideX(d)?.85:.6,[-DX[d],-DY[d],0])}}
    }else{
      const t0=TX[g[i]-1],t1=TU?TU[g[i]-1]:t0;let open=0;
      for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d];if(G(nx,ny))continue;open=1;const z0=FH[ny*n+nx];
        if(z0<1||top<=1){const zt=Math.min(1,top);const f=bnd(x,y,d,z0,zt,1-z0,1-zt,flipOf(d));quad(f.p,f.u,mat(t0),sideX(d)?1:.7,[DX[d],DY[d],0])}
        if(top>1){const za=Math.max(1,z0);const f=bnd(x,y,d,za,top,1-za,1-top,flipOf(d));quad(f.p,f.u,mat(t1),sideX(d)?1:.7,[DX[d],DY[d],0])}
        /* tall pointed gables over each building face (the alien levels) */
        if(typeof ROOFH!='undefined'&&ROOFH>0&&typeof BLD!='undefined'&&BLD){const sp=roofSpan(i,d>=2?1:0);if(sp){const c0=d<2?y:x,xf=d==1?x+1:x,yf=d==3?y+1:y,fp=flipOf(d),bp=[c0,c0+1],m=(sp[0]+sp[1])/2;if(m>c0&&m<c0+1)bp.splice(1,0,m);
          for(let k=0;k<bp.length-1;k++){const s0=bp[k],s1=bp[k+1],h0=roofH(sp[0],sp[1],s0),h1=roofH(sp[0],sp[1],s1);if(h0+h1<.01)continue;const P3=(s,z)=>d<2?[xf,s,z]:[s,yf,z],u0=fp?1-(s0-c0):s0-c0,u1=fp?1-(s1-c0):s1-c0;
            quad([P3(s0,top),P3(s1,top),P3(s1,top+h1),P3(s0,top+h0)],[[u0,1-top],[u1,1-top],[u1,1-top-h1],[u0,1-top-h0]],mat(t1),sideX(d)?1:.7,[DX[d],DY[d],0])}}}}
      if(open)quad([[x,y,top],[x+1,y,top],[x+1,y+1,top],[x,y+1,top]],[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],mat(t1),1,[0,0,1])}}
  /* walls as collision boxes: runs along x, solid all the way up so nothing can fly over a wall the old grid kept it behind */
  for(let y=0;y<n;y++){let x=0;while(x<n){if(!g[y*n+x]){x++;continue}let x1=x+1;while(x1<n&&g[y*n+x1])x1++;box(x,y,ZB,x1,y+1,ZT);x=x1}}
  /* props, chests and other blocked cells stop bodies but not bullets (class 1 is skipped by rays; bullets meet props through propHit) */
  for(let i=0;i<n*n;i++)if(!g[i]&&blk[i]&&!pit[i]){const x=i%n,y=(i/n)|0;box(x,y,FH[i],x+1,y+1,FH[i]+1.4,1)}
  box(-3,-3,ZB,n+3,0,ZT);box(-3,n,ZB,n+3,n+3,ZT);box(-3,0,ZB,0,n,ZT);box(n,0,ZB,n+3,n,ZT);
  /* shops are indoors: a tiled ceiling over every open cell */
  if(typeof GR!='undefined'&&GR&&GR.shop&&typeof CEIL!='undefined'&&CEIL){for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(g[y*n+x])continue;const ct2=((x*7+y*13)%4==0)?CEIL[1]:CEIL[0];
    quad([[x,y,WHT],[x,y+1,WHT],[x+1,y+1,WHT],[x+1,y,WHT]],[[x,y],[x,y+1],[x+1,y+1],[x+1,y]],mat(ct2),.92,[0,0,-1]);box(x,y,WHT,x+1,y+1,ZT)}}
  /* crushers: a slab that hangs from the ceiling and slides down; drawn and collided as a mover whose height follows the old CZ value */
  for(const c of (typeof CR!='undefined'&&CR?CR:[])){const x=c.x,y=c.y,rest=.85,tp=top+.9,f0=FCls.length,b0=BBb.length/6;
    for(let d=0;d<4;d++){const f=bnd(x,y,d,rest,tp,1,1-(tp-rest),flipOf(d));quad(f.p,f.u,mat(PT||RT),sideX(d)?1:.7,[DX[d],DY[d],0])}
    quad([[x,y,rest],[x+1,y,rest],[x+1,y+1,rest],[x,y+1,rest]],[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],mat(PTr||PT||RT),.6,[0,0,-1]);
    box(x,y,rest,x+1,y+1,tp);const faces=[];for(let id=f0;id<FCls.length;id++){FFl[id]|=8;faces.push(id)}
    MOV.push({k:'crush',ci:c.i,rest,name:'crush'+c.i,b0,b1:BBb.length/6,faces,fbb:[0,0,0,0,0,0],ns:0})}
  /* the coliseum gate: a portcullis that slides up out of the doorway (CZ is its height) */
  if(CG.length){const gx=(CG[0]%n)+1,gy=((CG[0]/n)|0)+.5,H=GATE_TOP,wall=mat(RT);
    const vb=(x0,y0,z0,x1,y1,z1)=>{const q=(p,u,nr,sh)=>quad(p,u,wall,sh,nr);
      q([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],[[0,1],[1,1],[1,0],[0,0]],[0,-1,0],.7);q([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],[[0,1],[1,1],[1,0],[0,0]],[0,1,0],.7);
      q([[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]],[[0,1],[1,1],[1,0],[0,0]],[-1,0,0],1);q([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],[[0,1],[1,1],[1,0],[0,0]],[1,0,0],1);
      q([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],[[0,0],[1,0],[1,1],[0,1]],[0,0,1],1)};
    for(const sx of[-1,1]){vb(gx+sx*.9-.1,gy-.17,0,gx+sx*.9+.1,gy+.17,H);vb(gx+sx*.9-.15,gy-.23,0,gx+sx*.9+.15,gy+.23,.12);vb(gx+sx*.9-.15,gy-.23,H-.12,gx+sx*.9+.15,gy+.23,H)}}
  for(const i of CG){const x=i%n,y=(i/n)|0,rest=0,tp=WHT,f0=FCls.length,b0=BBb.length/6;
    for(let d=0;d<4;d++){const f=bnd(x,y,d,rest,tp,1,1-(tp-rest),flipOf(d));quad(f.p,f.u,mat(PT||RT),sideX(d)?1:.7,[DX[d],DY[d],0])}
    quad([[x,y,rest],[x+1,y,rest],[x+1,y+1,rest],[x,y+1,rest]],[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],mat(PT||RT),.6,[0,0,-1]);
    box(x,y,rest,x+1,y+1,tp);const faces=[];for(let id=f0;id<FCls.length;id++){FFl[id]|=8;faces.push(id)}
    MOV.push({k:'crush',ci:i,rest,name:'gate'+i,b0,b1:BBb.length/6,faces,fbb:[0,0,0,0,0,0],ns:0})}
  for(const d of MOV)for(let b=d.b0;b<d.b1;b++)MVB.add(b);
  /* ---- the 3D map structure ---- */
  const nB=B0.length-1,GS=2,gw=Math.ceil(n/GS)+1,gh=gw,BP=Float32Array.from(BPl),BB=Float32Array.from(BBb),B0a=Int32Array.from(B0);
  const csB=new Int32Array(gw*gh+1),csT=new Int32Array(gw*gh+1),GT=.5,gtw=Math.ceil(n/GT)+1,gth=gtw,csF=new Int32Array(gtw*gth+1);
  const cr=(a,b,c,d)=>[Math.max(0,Math.floor(a/GS)),Math.min(gw-1,Math.floor(c/GS)),Math.max(0,Math.floor(b/GS)),Math.min(gh-1,Math.floor(d/GS))];
  let gB;for(let pass=0;pass<2;pass++){const lst=pass?new Int32Array(csB[gw*gh]):null,pb=pass?csB.slice():null;
    for(let b=0;b<nB;b++){if(MVB.has(b))continue;const r=cr(BB[b*6],BB[b*6+1],BB[b*6+3],BB[b*6+4]);for(let cy=r[2];cy<=r[3];cy++)for(let cx=r[0];cx<=r[1];cx++){const ci=cy*gw+cx;if(pass)lst[pb[ci]++]=b;else csB[ci+1]++}}
    if(!pass){for(let i=0;i<gw*gh;i++){csB[i+1]+=csB[i];csT[i+1]+=csT[i]}for(let i=0;i<gtw*gth;i++)csF[i+1]+=csF[i]}else gB=lst}
  const FRe=[],FRs=[];for(let id=0;id<FCls.length;id++){let a=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(let t=FT0[id];t<FT0[id]+FTn[id];t++)for(let v=0;v<3;v++)for(let q=0;q<3;q++){const w=TPo[t*9+v*3+q];a[q]=Math.min(a[q],w);a[3+q]=Math.max(a[3+q],w)}FRe.push(id);FRs.push((a[0]+a[3])/2,(a[1]+a[4])/2,(a[2]+a[5])/2,Math.hypot(a[3]-a[0],a[4]-a[1],a[5]-a[2])/2)}
  /* where a body can stand: one floor per open cell (pits are floors the player can fall to, but monsters never walk into) */
  const so=new Int32Array(n*n+1),Fa=[],Ga=[],qu=[];
  for(let i=0;i<n*n;i++){so[i]=Fa.length;if(g[i])continue;const z=FH[i];Fa.push(z);Ga.push(pit[i]||blk[i]?0:1);if(!pit[i]&&!blk[i])qu.push([(i%n)+.5,((i/n)|0)+.5,z])}
  so[n*n]=Fa.length;
  const sw={BCl:Uint8Array.from(BCls),C:64,UN:1/64,SC:1,wx:n,wy:n,wz0:ZB,GS,gw,gh,BP,B0:B0a,BB,gB,csB,CT:new Float32Array(0),gT:new Int32Array(0),csT,TB:new Float32Array(0),gF:new Int32Array(0),csF,GT,gtw,gth,WBP:new Float32Array(0),WB0:new Int32Array([0]),WBB:new Float32Array(0),nB,nWB:0,
    EYE:.6,HH:.66,STEP:.22,G:8.9,JV:3.0,VT:28,PR:.22,SPD:5,SS:1,FKS:FK,hz:0,hk:3,lim:1e9,stamp:0,stampB:new Int32Array(Math.max(1,nB)),stampT:new Int32Array(1),nx:0,ny:0,nz:1,
    TPo:Float32Array.from(TPo),TUv:Float32Array.from(TUv),TFc:Int32Array.from(TFc),FCls:Uint8Array.from(FCls),FSh:Uint8Array.from(FSh),FNx:Float32Array.from(FNx),FT0:Int32Array.from(FT0),FTn:Int32Array.from(FTn),FFl:Uint8Array.from(FFl),
    FMat:Uint16Array.from(FMt),mats:MT.map((_,i)=>'g3d#'+i),MT,noTex:1,bfc:1,ftb:1,sky:1,
    nTri,nFace:FCls.length,PRo:[],FRe:Int32Array.from(FRe),FRs:Float32Array.from(FRs),LFo:new Int32Array(1),LFl:new Int32Array(0),LBB:new Float32Array(0),LCl:new Int16Array(0),nl:0,nClu:0,visOfs:null,visU:new Uint8Array(0),isWorld:new Uint8Array(0),NP:new Int32Array(0),NC:new Int32Array(0),PL:new Float32Array(0),nn:0,OX:0,OY:0,head:0,fstamp:new Int32Array(FCls.length),visCache:new Map(),lastClu:-1,ox:0,oy:0,
    so,f:Float32Array.from(Fa),fl:Uint8Array.from(Ga),c:Float32Array.from(Fa,z=>z+.66),n,zmin:(zlo<1e8?zlo:0)+7,zmax:zhi,reach:null,mv:null};
  sw.g3d=1;sw.mv=bwMoversInit(MOV,BBb);sw.trg=[];sw.rel={};sw.q3={pads:[],tele:[]};
  sw.rq={qu,seen:new Map(),qi:qu.length,adj:[],radj:[],body:{x:0,y:0,z:0,vz:0,gr:1},done:true,last:0,dirty:false};
  return{name:'Floor',n,C:64,S:{o:sw.so,f:sw.f,fl:sw.fl},sp:[[P.x,P.y,FH[(P.y|0)*n+(P.x|0)],P.a||0]],ts:[[],[]],flags:null,ctf:null,bomb:{s:[]},zmin:sw.zmin,zmax:sw.zmax,sw,g3d:1,info:{movers:0,spawns:1,tris:nTri,brushes:nB,cells:qu.length,size:n}}}

/* ===== Battle Royale as a 3D world: rolling terrain, walls, doors, windows, decks and roofs from the BR layers (VH/SF/SL1/SL2/SK) ===== */
function g3dBuildBR(){
  const n=N,vk=n+1,ZB=-8,ZT=60;
  const MT=[],mi=new Map();
  const mat=t=>{if(!t)t=RT;let k=mi.get(t);if(k===undefined){const u=g3dTex(t)||g3dTex(RT);k=MT.length;MT.push(u);mi.set(t,k)}return k};
  const TPo=[],TUv=[],TFc=[],FCls=[],FSh=[],FNx=[],FT0=[],FTn=[],FFl=[],FMt=[],CTa=[];let nTri=0;
  const quad=(p,u,m,sh,nrm,solid)=>{
    const e1=[p[1][0]-p[0][0],p[1][1]-p[0][1],p[1][2]-p[0][2]],e2=[p[2][0]-p[0][0],p[2][1]-p[0][1],p[2][2]-p[0][2]];
    const cx=e1[1]*e2[2]-e1[2]*e2[1],cy=e1[2]*e2[0]-e1[0]*e2[2],cz=e1[0]*e2[1]-e1[1]*e2[0];
    if(cx*nrm[0]+cy*nrm[1]+cz*nrm[2]<0){p=[p[0],p[3],p[2],p[1]];u=[u[0],u[3],u[2],u[1]]}
    const fid=FCls.length;FCls.push(0);FSh.push(Math.max(0,Math.min(255,Math.round(sh*255))));FNx.push(nrm[0],nrm[1],nrm[2]);FT0.push(nTri);FTn.push(2);FFl.push(0);FMt.push(m);
    for(const t of[[0,1,2],[0,2,3]]){for(const k of t)TPo.push(p[k][0],p[k][1],p[k][2]);for(const k of t)TUv.push(u[k][0],u[k][1]);TFc.push(fid);nTri++;
      if(solid)for(const k of t)CTa.push(p[k][0],p[k][1],p[k][2])}};
  const BPl=[],B0=[0],BBb=[],BCls=[];
  const box=(x0,y0,z0,x1,y1,z1,cls)=>{BCls.push(cls||0);BPl.push(1,0,0,x1,-1,0,0,-x0,0,1,0,y1,0,-1,0,-y0,0,0,1,z1,0,0,-1,-z0);B0.push(BPl.length/4);BBb.push(x0,y0,z0,x1,y1,z1)};
  const cor=(ci,cx,cy,i,j)=>{const f=SF[ci];return f>-90?f:VH[(cy+j)*vk+cx+i]};
  const wallTex=ci=>WTX[ci]?TX[WTX[ci]-1]:RT,faceTex=ci=>{const k=SK[ci];return(k>=2&&k<=4&&WTX[ci])?TX[WTX[ci]-1]:RIS[ci]?TX[RIS[ci]-1]:RT};
  const plank=CT[4],shd=ci=>Math.min(1,SHD[ci]/100);
  const uvc=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  /* terrain and wall tops: flat runs along x are merged */
  for(let cy=0;cy<n;cy++){let cx=0;while(cx<n){const ci=cy*n+cx,sk=SK[ci];
    if(sk==4&&WTP[ci]>=3.7){cx++;continue}
    const h00=cor(ci,cx,cy,0,0),h10=cor(ci,cx,cy,1,0),h11=cor(ci,cx,cy,1,1),h01=cor(ci,cx,cy,0,1);
    const tx=sk==3?wallTex(ci):(ct[ci]&&CT[ct[ci]]?CT[ct[ci]]:FT),tm=mat(tx),sh=shd(ci);
    if(h00==h10&&h10==h11&&h11==h01){let x1=cx+1;
      while(x1<n){const cj=cy*n+x1,k2=SK[cj];if(k2==4&&WTP[cj]>=3.7)break;if(cor(cj,x1,cy,0,0)!==h00||cor(cj,x1,cy,1,0)!==h00||cor(cj,x1,cy,1,1)!==h00||cor(cj,x1,cy,0,1)!==h00)break;
        const t2=k2==3?wallTex(cj):(ct[cj]&&CT[ct[cj]]?CT[ct[cj]]:FT);if(t2!==tx||shd(cj)!==sh)break;x1++}
      quad([[cx,cy,h00],[x1,cy,h00],[x1,cy+1,h00],[cx,cy+1,h00]],uvc(cx,cy,x1,cy+1),tm,sh,[0,0,1],1);cx=x1}
    else{quad([[cx,cy,h00],[cx+1,cy,h10],[cx+1,cy+1,h11],[cx,cy+1,h01]],uvc(cx,cy,cx+1,cy+1),tm,sh,[0,0,1],1);cx++}}}
  /* risers where neighbouring heights differ, lintels over doors and windows, the decks and roofs */
  for(let cy=0;cy<n;cy++)for(let cx=0;cx<n;cx++){const ci=cy*n+cx,sk=SK[ci];
    const s1=SL1[ci],s2=SL2[ci];
    const sq=(z,tx,sh,up)=>quad([[cx,cy,z],[cx+1,cy,z],[cx+1,cy+1,z],[cx,cy+1,z]],uvc(cx,cy,cx+1,cy+1),mat(tx),sh,up?[0,0,1]:[0,0,-1]);
    if(s1){if(sk==1){sq(s1+.004,plank,1,1);sq(s1-.004,plank,.78,0);box(cx,cy,s1-.1,cx+1,cy+1,s1)}else if(sk==2||sk==3){sq(s1-.004,sk==3?wallTex(ci):plank,.8,0)}}
    if(s2){sq(s2+.004,CT[STX[ci]]||FT,1,1);if(sk==1||sk==5){sq(s2-.004,plank,.72,0);box(cx,cy,s2-.1,cx+1,cy+1,s2)}else if((sk==2||sk==3)&&s1&&s2>s1)box(cx,cy,s1,cx+1,cy+1,s2)}
    for(let d=0;d<2;d++){const nx=cx+(d==0?1:0),ny=cy+(d==1?1:0);if(nx>=n||ny>=n)continue;const nc=ny*n+nx;
      let a0,a1,b0,b1,p0,p1;if(d==0){a0=cor(ci,cx,cy,1,0);a1=cor(ci,cx,cy,1,1);b0=cor(nc,nx,ny,0,0);b1=cor(nc,nx,ny,0,1);p0=[cx+1,cy];p1=[cx+1,cy+1]}else{a0=cor(ci,cx,cy,0,1);a1=cor(ci,cx,cy,1,1);b0=cor(nc,nx,ny,0,0);b1=cor(nc,nx,ny,1,0);p0=[cx,cy+1];p1=[cx+1,cy+1]}
      const lo0=Math.min(a0,b0),hi0=Math.max(a0,b0),lo1=Math.min(a1,b1),hi1=Math.max(a1,b1);
      if(hi0-lo0>.003||hi1-lo1>.003){const up=(a0+a1)>(b0+b1),hiC=up?ci:nc,sh=d==0?.9:.75,nr=d==0?(up?[1,0,0]:[-1,0,0]):(up?[0,1,0]:[0,-1,0]);
        quad([[p0[0],p0[1],lo0],[p1[0],p1[1],lo1],[p1[0],p1[1],hi1],[p0[0],p0[1],hi0]],[[0,1-lo0],[1,1-lo1],[1,1-hi1],[0,1-hi0]],mat(faceTex(hiC)),sh,nr,1)}
      for(const[A,B,dir]of[[ci,nc,d==0?[1,0,0]:[0,1,0]],[nc,ci,d==0?[-1,0,0]:[0,-1,0]]]){const ka=SK[A],kb=SK[B];
        if((ka==2||ka==3)&&!(kb>=2&&kb<=4)&&SL1[A]&&SL2[A]>SL1[A])quad([[p0[0],p0[1],SL1[A]],[p1[0],p1[1],SL1[A]],[p1[0],p1[1],SL2[A]],[p0[0],p0[1],SL2[A]]],[[0,1-SL1[A]],[1,1-SL1[A]],[1,1-SL2[A]],[0,1-SL2[A]]],mat(wallTex(A)),sh0(d),dir)}}}
  function sh0(d){return d==0?.9:.75}
  /* props (trees, rocks, crates, chests) stop bodies; bullets meet them through propHit */
  for(let i=0;i<n*n;i++)if(!g[i]&&blk[i]){const x=i%n,y=(i/n)|0,h=[cor(i,x,y,0,0),cor(i,x,y,1,0),cor(i,x,y,1,1),cor(i,x,y,0,1)],lo=Math.min(...h),hi=Math.max(...h);
    box(x,y,lo,x+1,y+1,BKH[i]>hi?BKH[i]:hi+1.4,1)}
  /* the outer wall ring and everything past it */
  box(-3,-3,ZB,n+3,2,ZT);box(-3,n-2,ZB,n+3,n+3,ZT);box(-3,2,ZB,2,n-2,ZT);box(n-2,2,ZB,n+3,n-2,ZT);
  /* collision grids */
  const nB=B0.length-1,GS=2,gw=Math.ceil(n/GS)+1,gh=gw,BP=Float32Array.from(BPl),BB=Float32Array.from(BBb),B0a=Int32Array.from(B0);
  const CTf=Float32Array.from(CTa),nCT=CTf.length/9|0,TB=new Float32Array(nCT*6);
  for(let q=0;q<nCT;q++){const o=q*9;for(let k=0;k<3;k++){TB[q*6+k]=Math.min(CTf[o+k],CTf[o+3+k],CTf[o+6+k]);TB[q*6+3+k]=Math.max(CTf[o+k],CTf[o+3+k],CTf[o+6+k])}}
  const GT=.5,gtw=Math.ceil(n/GT)+1,gth=gtw,csB=new Int32Array(gw*gh+1),csT=new Int32Array(gw*gh+1),csF=new Int32Array(gtw*gth+1);
  const rg=(a,b,c,d,G,w,h)=>[Math.max(0,Math.floor(a/G)),Math.min(w-1,Math.floor(c/G)),Math.max(0,Math.floor(b/G)),Math.min(h-1,Math.floor(d/G))];
  let gB,gT,gF;
  for(let pass=0;pass<2;pass++){const lB=pass?new Int32Array(csB[gw*gh]):null,lT=pass?new Int32Array(csT[gw*gh]):null,lF=pass?new Int32Array(csF[gtw*gth]):null,pb=pass?csB.slice():null,pt=pass?csT.slice():null,pf=pass?csF.slice():null;
    for(let b=0;b<nB;b++){const r=rg(BB[b*6],BB[b*6+1],BB[b*6+3],BB[b*6+4],GS,gw,gh);for(let cy=r[2];cy<=r[3];cy++)for(let cx=r[0];cx<=r[1];cx++){const ci=cy*gw+cx;if(pass)lB[pb[ci]++]=b;else csB[ci+1]++}}
    for(let q=0;q<nCT;q++){const r=rg(TB[q*6],TB[q*6+1],TB[q*6+3],TB[q*6+4],GS,gw,gh);for(let cy=r[2];cy<=r[3];cy++)for(let cx=r[0];cx<=r[1];cx++){const ci=cy*gw+cx;if(pass)lT[pt[ci]++]=q;else csT[ci+1]++}
      const r2=rg(TB[q*6],TB[q*6+1],TB[q*6+3],TB[q*6+4],GT,gtw,gth);for(let cy=r2[2];cy<=r2[3];cy++)for(let cx=r2[0];cx<=r2[1];cx++){const ci=cy*gtw+cx;if(pass)lF[pf[ci]++]=q;else csF[ci+1]++}}
    if(!pass){for(let i=0;i<gw*gh;i++){csB[i+1]+=csB[i];csT[i+1]+=csT[i]}for(let i=0;i<gtw*gth;i++)csF[i+1]+=csF[i]}else{gB=lB;gT=lT;gF=lF}}
  const FRe=[],FRs=[];for(let id=0;id<FCls.length;id++){let a=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(let t=FT0[id];t<FT0[id]+FTn[id];t++)for(let v=0;v<3;v++)for(let q=0;q<3;q++){const w=TPo[t*9+v*3+q];a[q]=Math.min(a[q],w);a[3+q]=Math.max(a[3+q],w)}FRe.push(id);FRs.push((a[0]+a[3])/2,(a[1]+a[4])/2,(a[2]+a[5])/2,Math.hypot(a[3]-a[0],a[4]-a[1],a[5]-a[2])/2)}
  /* where a body can stand: the ground of every open cell, plus decks and roofs */
  const so=new Int32Array(n*n+1),Fa=[],Ga=[],qu=[];let zlo=1e9,zhi=-1e9;
  const addS=(z,ok,x,y)=>{Fa.push(z);Ga.push(ok?1:0);if(ok)qu.push([x+.5,y+.5,z]);zlo=Math.min(zlo,z);zhi=Math.max(zhi,z)};
  for(let i=0;i<n*n;i++){so[i]=Fa.length;if(g[i])continue;const x=i%n,y=(i/n)|0,sk=SK[i];
    addS(cellFloor(i,x+.5,y+.5),!blk[i],x,y);
    if(sk==1||sk==2||sk==5){if(SL1[i]&&sk==1)addS(SL1[i],true,x,y);if(SL2[i]&&(sk==1||sk==5))addS(SL2[i],true,x,y)}}
  so[n*n]=Fa.length;
  const sw={BCl:Uint8Array.from(BCls),C:64,UN:1/64,SC:1,wx:n,wy:n,wz0:ZB,GS,gw,gh,BP,B0:B0a,BB,gB,csB,CT:CTf,gT,csT,TB,gF,csF,GT,gtw,gth,WBP:new Float32Array(0),WB0:new Int32Array([0]),WBB:new Float32Array(0),nB,nWB:0,
    EYE:.6,HH:.66,STEP:.22,G:8.9,JV:3.0,VT:28,PR:.22,SPD:5,SS:1,FKS:FK,hz:0,hk:3,lim:1e9,stamp:0,stampB:new Int32Array(Math.max(1,nB)),stampT:new Int32Array(Math.max(1,nCT)),nx:0,ny:0,nz:1,
    TPo:Float32Array.from(TPo),TUv:Float32Array.from(TUv),TFc:Int32Array.from(TFc),FCls:Uint8Array.from(FCls),FSh:Uint8Array.from(FSh),FNx:Float32Array.from(FNx),FT0:Int32Array.from(FT0),FTn:Int32Array.from(FTn),FFl:Uint8Array.from(FFl),
    FMat:Uint16Array.from(FMt),mats:MT.map((_,i)=>'g3d#'+i),MT,noTex:1,bfc:1,ftb:1,sky:1,
    nTri,nFace:FCls.length,PRo:[],FRe:Int32Array.from(FRe),FRs:Float32Array.from(FRs),LFo:new Int32Array(1),LFl:new Int32Array(0),LBB:new Float32Array(0),LCl:new Int16Array(0),nl:0,nClu:0,visOfs:null,visU:new Uint8Array(0),isWorld:new Uint8Array(0),NP:new Int32Array(0),NC:new Int32Array(0),PL:new Float32Array(0),nn:0,OX:0,OY:0,head:0,fstamp:new Int32Array(FCls.length),visCache:new Map(),lastClu:-1,ox:0,oy:0,
    so,f:Float32Array.from(Fa),fl:Uint8Array.from(Ga),c:Float32Array.from(Fa,z=>z+.66),n,zmin:(zlo<1e8?zlo:0)+7,zmax:zhi,reach:null,mv:null};
  sw.g3d=1;sw.br=1;sw.mv=bwMoversInit([],BBb);sw.trg=[];sw.rel={};sw.q3={pads:[],tele:[]};
  sw.rq={qu,seen:new Map(),qi:qu.length,adj:[],radj:[],body:{x:0,y:0,z:0,vz:0,gr:1},done:true,last:0,dirty:false};
  return{name:'Wilds',n,C:64,S:{o:sw.so,f:sw.f,fl:sw.fl},sp:[[P.x,P.y,cellFloor((P.y|0)*n+(P.x|0),P.x,P.y),P.a||0]],ts:[[],[]],flags:null,ctf:null,bomb:{s:[]},zmin:sw.zmin,zmax:sw.zmax,sw,g3d:1,info:{movers:0,spawns:1,tris:nTri,brushes:nB,cells:qu.length,size:n}}}
/* called at the end of startFloor: switch this floor to the 3D world */
function g3dApply(){
  G3D.err=null;if(!g3dCan())return false;
  try{
    const m=(typeof BRV!='undefined'&&BRV&&typeof GR!='undefined'&&GR&&GR.br)?g3dBuildBR():g3dBuild();swBuild(m);G3D.last=m;
    const fh=(x,y)=>{const i=(y|0)*N+(x|0);return i>=0&&i<N*N?(SW.br?cellFloor(i,x,y):FH[i]):0};
    P.z=fh(P.x,P.y);P.vz=0;P.gr=1;P.cz=P.z;P.jz=0;P.jv=0;
    for(const e of E)if(e.z===undefined||!e.fly)e.z=fh(e.x,e.y);
    for(const c of CH)if(c.z===undefined||(SW.br&&!c.z))c.z=fh(c.x,c.y);
    EZ=P.cz+SW.EYE;
    return true}
  catch(er){G3D.err=er;window.__g3derr=er;SW=null;return false}}

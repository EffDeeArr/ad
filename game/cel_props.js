/* 0.9.247: the map props, modelled again from nothing for the 90s cel look.
   The old props were stacks of plain boxes. These are built from two new shapes instead:
   loft()  - a solid stretched between two outlines (so things can taper, lean and have cut corners), and
   lathe() - an outline spun round an upright axis (barrels, urns, columns, bowls, bottles).
   Sizes match the old props, so what is solid in the game has not changed. */
(function(){
const nrm=p=>{let x=0,y=0,z=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];x+=(a[1]-b[1])*(a[2]+b[2]);y+=(a[2]-b[2])*(a[0]+b[0]);z+=(a[0]-b[0])*(a[1]+b[1])}const l=Math.hypot(x,y,z)||1;return[x/l,y/l,z/l]};
const avg=P=>{const c=[0,0,0];for(const q of P){c[0]+=q[0];c[1]+=q[1];c[2]+=q[2]}return c.map(v=>v/P.length)};
const P3=(ax,t,q)=>ax=='x'?[t,q[1],q[0]]:ax=='y'?[q[0],t,q[1]]:[q[0],q[1],t];
const turn=(F,o,cen)=>{if(o.rx||o.ry||o.rz)vmTurn(F,o.pv||cen,o.rx,o.ry,o.rz);return F};
function sh(F,x,y,z){for(const f of F)f.p=f.p.map(q=>[q[0]+x,q[1]+y,q[2]+z]);return F}
/* a solid between outline PA (at a) and outline PB (at b) along one axis. For 'y' the outline points are [x,z], for 'x' they are [z,y], for 'z' they are [x,y] */
function loft(ax,a,PA,b,PB,c,o){o=o||{};PB=PB||PA;const A=PA.map(q=>P3(ax,a,q)),B=PB.map(q=>P3(ax,b,q)),n=A.length,cen=avg(A.concat(B)),vs={},F=[];
 const add=p=>{let nn=nrm(p);const fc=avg(p);if(nn[0]*(fc[0]-cen[0])+nn[1]*(fc[1]-cen[1])+nn[2]*(fc[2]-cen[2])<0){p=p.slice().reverse();nn=nn.map(v=>-v)}F.push({p,n:nn,c,e:o.e,a:o.a,g:o.g||0,vs})};
 for(let i=0;i<n;i++)add([A[i],A[(i+1)%n],B[(i+1)%n],B[i]]);if(!o.noA)add(A.slice());if(!o.noB)add(B.slice());return turn(F,o,cen)}
/* an outline [[radius,height,colour?],...] spun round the upright axis; drawn from the bottom up the outside (and back down the inside, for a rim) */
function lathe(prof,n,c,o){o=o||{};const F=[],vs={},x=o.x||0,y=o.y||0,z=o.z||0,pt=(r,h,k)=>{const a=k/n*6.2832;return[x+Math.cos(a)*r,y+h,z+Math.sin(a)*r]};
 for(let i=0;i<prof.length-1;i++){const A=prof[i],B=prof[i+1],cc=A[2]||c;if(A[0]<1e-4&&B[0]<1e-4)continue;
  for(let k=0;k<n;k++){let p;if(A[0]<1e-4)p=[pt(0,A[1],0),pt(B[0],B[1],k),pt(B[0],B[1],k+1)];else if(B[0]<1e-4)p=[pt(A[0],A[1],k),pt(0,B[1],0),pt(A[0],A[1],k+1)];else p=[pt(A[0],A[1],k),pt(B[0],B[1],k),pt(B[0],B[1],k+1),pt(A[0],A[1],k+1)];F.push({p,n:nrm(p),c:cc,e:o.e,a:o.a,g:o.g||0,vs})}}
 return turn(F,o,[x,y,z])}
const rect=(w,d,cx,cz)=>{cx=cx||0;cz=cz||0;return[[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]]};
const chamf=(w,d,k,cx,cz)=>{cx=cx||0;cz=cz||0;const X=w/2,Z=d/2;return[[-X+k,-Z],[X-k,-Z],[X,-Z+k],[X,Z-k],[X-k,Z],[-X+k,Z],[-X,Z-k],[-X,-Z+k]].map(q=>[q[0]+cx,q[1]+cz])};
const scl=(P,s,cx,cy)=>P.map(q=>[cx+(q[0]-cx)*s,cy+(q[1]-cy)*s]);
const spin=(F,k)=>{const o=[];for(let i=0;i<k;i++){const G=F.map(f=>({...f,p:f.p.map(q=>q.slice()),n:f.n.slice(),vs:{}}));if(i)vmTurn(G,[0,0,0],0,i*6.2832/k,0);o.push(...G)}return o};
/* muted cel paint */
const W1=[138,96,58],W2=[92,62,40],W3=[170,128,84],WD=[58,40,30],DK=[46,44,56],MT=[112,116,130],ST=[136,134,142],ST2=[98,96,110],ST3=[158,154,156],GD=[196,160,72];

function crate(){const f=[];for(const x of[-.2,.2])f.push(...vmBox(x,.02,0,.12,.04,.66,W2));
 f.push(...loft('y',.04,chamf(.62,.62,.025),.5,null,W1));
 const side=[];side.push(...vmBox(0,.095,.316,.66,.085,.03,W2),...vmBox(0,.445,.316,.66,.085,.03,W2));for(const sx of[-1,1])side.push(...vmBox(sx*.292,.27,.316,.08,.265,.03,W2));side.push(...vmBox(0,.27,.313,.56,.06,.022,W2,{rz:.47}));
 f.push(...spin(side,4));
 f.push(...loft('y',.5,chamf(.69,.69,.03),.548,null,W3,{ry:.09,pv:[0,0,0]}));for(const x of[-.2,0,.2])f.push(...vmBox(x,.552,0,.012,.006,.6,W2,{ry:.09,pv:[0,0,0]}));
 for(const sx of[-1,1])for(const sz of[-1,1])f.push(...loft('y',.04,rect(.07,.07,sx*.3,sz*.3),.12,null,DK));return f}

function barrel(){const f=[];f.push(...lathe([[0,0],[.22,0],[.25,.025],[.298,.16],[.318,.31],[.298,.46],[.25,.595],[.235,.62,W2],[.205,.62,W2],[.205,.585,W3],[0,.585]],12,W1));
 for(const[y,r]of[[.06,.268],[.2,.31],[.39,.312],[.53,.272]])f.push(...lathe([[r-.012,y],[r+.01,y],[r+.01,y+.04],[r-.012,y+.04]],12,DK));
 f.push(...vmBox(0,.2,.325,.05,.05,.07,MT),...vmBox(0,.2,.37,.02,.07,.02,DK));return f}

function pillar(){const f=[];f.push(...loft('y',0,chamf(.64,.64,.05),.08,null,ST2),...loft('y',.08,chamf(.52,.52,.05),.14,chamf(.48,.48,.05),ST));
 f.push(...lathe([[.25,.14,ST3],[.262,.17,ST2],[.228,.2],[.212,.235],[.2,.5],[.184,.79,ST2],[.2,.81,ST3],[.212,.835,ST2],[.19,.85,ST3],[.25,.9]],10,ST));
 f.push(...loft('y',.9,chamf(.6,.6,.04),.98,chamf(.64,.64,.04),ST2));
 f.push(...loft('y',0,[[.2,.26],[.34,.24],[.36,.34],[.25,.38]],.07,[[.23,.28],[.31,.27],[.32,.33],[.26,.35]],ST3,{rz:.12}));return f}

function table(){const f=[];[[-.205,W3,.92],[0,W1,.9],[.205,W3,.93]].forEach(([z,c,w],i)=>f.push(...loft('y',.505,chamf(w,.196,.012,i==1?.01:0,z),.555,null,c)));
 for(const sx of[-1,1]){for(const sz of[-1,1])f.push(...loft('y',0,rect(.06,.06,sx*.37,sz*.29),.5,rect(.06,.06,sx*.37,sz*.15),W2));f.push(...vmBox(sx*.37,.47,0,.07,.06,.5,W2),...vmBox(sx*.37,.2,0,.045,.045,.44,W2))}
 f.push(...vmBox(0,.2,0,.74,.05,.05,W2));
 f.push(...vmBox(-.2,.573,.05,.17,.036,.125,[128,62,58],{ry:.3}),...vmBox(-.2,.573,.05,.172,.02,.118,[214,204,180],{ry:.3}));
 f.push(...lathe([[0,0],[.036,0],[.04,.02],[.04,.11],[.016,.15],[.016,.19],[.022,.195],[0,.195]],8,[62,108,92],{x:.24,y:.555,z:-.08}));
 return shScale(f,.67,0,0,0)}

function shelf(){const f=[],BK=[[150,62,56],[62,92,140],[78,124,88],[176,150,84],[112,78,128],[74,70,86],[196,186,160]];
 f.push(...loft('y',0,rect(.82,.36),.08,rect(.78,.33),W2));for(const sx of[-1,1])f.push(...vmBox(sx*.375,.47,0,.05,.78,.32,W2));f.push(...vmBox(0,.47,-.14,.7,.78,.04,WD));
 f.push(...loft('y',.86,rect(.8,.34),.95,rect(.88,.4),W2),...vmBox(0,.955,0,.9,.014,.42,W3));
 let q=11;const rn=()=>{q=(Math.imul(q,1103515245)+12345)>>>0;return q/4294967296};
 for(let r=0;r<4;r++){const y=.1+r*.195;f.push(...vmBox(0,y,.01,.7,.03,.3,W3));let x=-.335,k=0;const lim=r==1?.1:r==3?.2:.33;
  while(x<lim){const bw=.034+rn()*.03,bh=.1+rn()*.055,d=.17+rn()*.05,c=BK[(k*3+r*2+(rn()*2|0))%7];f.push(...vmBox(x+bw/2,y+.015+bh/2,.045,bw,bh,d,c));if(rn()<.35)f.push(...vmBox(x+bw/2,y+.015+bh*.72,.045+d/2+.001,bw*.8,.012,.004,GD));x+=bw+.004;k++}
  if(r==1){f.push(...vmBox(x+.05,y+.08,.045,.04,.135,.2,BK[2],{rz:.38}));for(let j=0;j<3;j++)f.push(...vmBox(.22,y+.03+j*.034,.04,.17,.03,.22,BK[(j*2+1)%7],{ry:j*.2-.15}))}
  if(r==3)f.push(...lathe([[0,0],[.05,0],[.07,.05],[.045,.1],[.03,.13],[.04,.14],[0,.14]],8,[150,120,96],{x:.27,y:y+.015,z:.04}))}
 return f}

function brazier(){const f=[];for(let k=0;k<3;k++){const a=k*2.094+.5,cx=Math.cos(a),cz=Math.sin(a);f.push(...loft('y',0,rect(.06,.06,cx*.25,cz*.25),.42,rect(.04,.04,cx*.11,cz*.11),DK),...vmBox(cx*.26,.012,cz*.26,.1,.024,.1,DK,{ry:-a}))}
 f.push(...lathe([[.15,.17],[.175,.17],[.175,.195],[.15,.195]],9,DK));
 f.push(...lathe([[0,.36],[.06,.36,DK],[.17,.385],[.25,.45],[.29,.535,MT],[.305,.56,DK],[.27,.56],[.245,.5,[30,22,26]],[0,.48]],10,ST2));
 f.push(...lathe([[.235,.505],[.12,.535],[0,.53]],8,[255,112,40],{e:1}));
 let q=5;const rn=()=>{q=(Math.imul(q,1103515245)+12345)>>>0;return q/4294967296};
 for(let k=0;k<5;k++){const a=k*1.2566+.3,r=.11,cx=Math.cos(a)*r,cz=Math.sin(a)*r,h=.14+rn()*.1;f.push(...loft('y',.52,chamf(.13,.13,.04,cx,cz),.52+h,chamf(.014,.014,.004,cx*.5+(rn()-.5)*.08,cz*.5+(rn()-.5)*.08),[255,140,44],{e:1,noA:1}))}
 f.push(...loft('y',.52,chamf(.15,.15,.05),.9,chamf(.014,.014,.004,.03,-.02),[255,222,110],{e:1,noA:1}));return f}

function urn(){const B=[72,138,130],D=[46,92,94],f=[];
 f.push(...lathe([[0,0],[.1,0,D],[.118,.022,D],[.088,.05],[.15,.12],[.214,.21],[.232,.29],[.205,.375],[.115,.445,D],[.096,.5,D],[.142,.548,D],[.118,.56,D],[.085,.52,[24,40,46]],[0,.5]],12,B));
 f.push(...lathe([[.228,.262],[.243,.262],[.243,.305],[.228,.305]],12,GD),...lathe([[.1,.47],[.112,.47],[.112,.485],[.1,.485]],12,GD));
 for(const sx of[-1,1]){f.push(...loft('x',sx*.2,rect(.035,.03,0,.37),sx*.25,rect(.035,.03,0,.44),D),...loft('x',sx*.25,rect(.035,.03,0,.44),sx*.12,rect(.035,.03,0,.51),D))}return f}

function cabinet(){const f=[];for(const sx of[-1,1])for(const sz of[-1,1])f.push(...loft('y',0,rect(.035,.035,sx*.31,sz*.18),.11,rect(.065,.065,sx*.3,sz*.17),W2));
 f.push(...vmBox(0,.31,0,.68,.42,.42,W2),...loft('y',.52,chamf(.76,.5,.03),.56,null,W3),...vmBox(0,.105,0,.7,.02,.44,WD));
 for(const sx of[-1,1]){f.push(...vmBox(sx*.17,.455,.212,.3,.09,.012,W1),...vmBox(sx*.17,.455,.222,.07,.016,.014,GD));
  f.push(...vmBox(sx*.17,.26,.212,.3,.27,.012,W1),...vmBox(sx*.17,.26,.218,.21,.18,.008,W2),...vmBox(sx*.17,.26,.221,.17,.14,.006,W1));
  f.push(...lathe([[0,0],[.018,0],[.022,.012],[0,.02]],6,GD,{x:sx*.04,y:.27,z:.218,rx:1.5708,pv:[sx*.04,.27,.218]}))}
 return f}

function car(i){const CC=[[168,58,50],[58,100,150],[204,170,60],[60,116,86],[124,128,138],[198,196,188]],c=CC[i],c2=c.map(v=>v*.8|0),GL=[30,40,58],TY=[22,22,28],BL=[50,50,60],f=[];
 const B=[[-.47,.15],[-.48,.2],[-.48,.34],[-.45,.385],[-.2,.41],[.16,.41],[.45,.36],[.48,.31],[.48,.2],[.47,.15]],Bs=scl(B,.94,0,.27);
 f.push(...loft('x',-.25,B,.25,null,c,{noA:1,noB:1}),...loft('x',.25,B,.268,Bs,c,{noA:1}),...loft('x',-.25,B,-.268,Bs,c,{noA:1}));
 f.push(...vmBox(0,.15,0,.46,.06,.9,[28,28,34]));
 /* the greenhouse: glass that leans in on every side, a roof, and the pillars */
 const g0=[[-.232,-.3],[.232,-.3],[.232,.2],[-.232,.2]],g1=[[-.185,-.19],[.185,-.19],[.185,.07],[-.185,.07]];
 f.push(...loft('y',.405,g0,.565,g1,GL,{noA:1}),...loft('y',.565,[[-.2,-.205],[.2,-.205],[.2,.085],[-.2,.085]],.59,[[-.17,-.17],[.17,-.17],[.17,.05],[-.17,.05]],c));
 for(const sx of[-1,1]){for(const[z0,z1]of[[-.3,-.19],[.2,.07],[-.045,-.055]])f.push(...loft('y',.405,rect(.03,.035,sx*.236,z0),.572,rect(.03,.035,sx*.19,z1),c));
  f.push(...vmBox(sx*.262,.27,0,.014,.022,.72,BL),...vmBox(sx*.262,.43,.15,.05,.03,.035,c2));
  for(const sz of[-1,1]){const zc=sz*.3,A=[];for(let k=0;k<=6;k++){const a=k/6*3.1416;A.push([zc+Math.cos(a)*.128,.13+Math.sin(a)*.128])}f.push(...loft('x',sx*.258,A,sx*.272,null,[24,22,32]));
   f.push(...vmCyl(sx>0?.19:-.285,.1,zc,.1,.095,TY,{ax:'x',n:10}),...vmCyl(sx>0?.283:-.297,.1,zc,.055,.014,MT,{ax:'x',n:8}))}
  f.push(...vmBox(sx*.18,.275,.482,.11,.05,.012,[255,240,184],{e:1}),...vmBox(sx*.18,.3,-.482,.12,.04,.012,[204,52,46],{e:1}),...vmBox(sx*.24,.3,-.482,.03,.04,.012,[230,150,60],{e:1}))}
 f.push(...loft('y',.165,chamf(.57,.05,.02,0,.49),.225,null,BL),...loft('y',.165,chamf(.57,.05,.02,0,-.49),.225,null,BL));
 f.push(...vmBox(0,.275,.482,.22,.045,.012,[26,26,34]),...vmBox(0,.2,-.517,.13,.04,.005,[220,218,204]),...vmBox(0,.195,.517,.13,.035,.005,[220,218,204]));
 if(i==2)f.push(...loft('y',.59,rect(.2,.08,0,-.06),.65,rect(.16,.06,0,-.06),[250,246,220],{e:1}));
 if(i==5)f.push(...vmBox(0,.6,-.06,.3,.02,.03,BL),...vmBox(-.08,.615,-.06,.07,.03,.04,[60,90,220],{e:1}),...vmBox(.08,.615,-.06,.07,.03,.04,[220,50,50],{e:1}));
 return f}

function rubble(v){const C=[[96,92,92],[66,62,66],[124,118,114]],RB=[112,58,38],f=[];let q=7+v*31;const rn=()=>{q=(Math.imul(q,1103515245)+12345)>>>0;return q/4294967296};
 const slab=(x,y,z,r,t,c,o)=>{const A=[],n=4+(rn()*2|0);for(let k=0;k<n;k++){const a=k/n*6.2832+rn()*.5;A.push([x+Math.cos(a)*r*(.6+rn()*.6),z+Math.sin(a)*r*(.55+rn()*.5)])}return loft('y',y,A,y+t,scl(A,.7+rn()*.25,x+(rn()-.5)*.04,z+(rn()-.5)*.04),c,o)};
 if(!v){for(let k=0;k<8;k++){const a=rn()*6.283,d=rn()*.24;f.push(...slab(Math.cos(a)*d,k>5?.12:0,Math.sin(a)*d,.13+rn()*.12,.07+rn()*.12,C[k%3],{rz:(rn()-.5)*.7,rx:(rn()-.5)*.5}))}
  f.push(...slab(0,.14,0,.2,.06,C[2],{rz:.5,rx:-.2}));
  for(let k=0;k<3;k++){const x=(rn()-.5)*.3,z=(rn()-.5)*.3;f.push(...vmBox(x,.3,z,.022,.3,.022,RB,{rz:(rn()-.5)*.8,rx:(rn()-.5)*.8}),...vmBox(x+.05,.46,z,.022,.12,.022,RB,{rz:-1.1+rn()*.4}))}}
 else{const d1=lathe([[0,0],[.15,0],[.162,.03,C[1]],[.14,.06],[.14,.36],[.1,.4,C[1]],[.04,.37,C[1]],[0,.39]],9,C[0]);vmTurn(d1,[0,0,0],0,0,-1.5708);f.push(...sh(d1,-.42,.15,0));
  const d2=lathe([[0,0],[.14,0],[.14,.17],[.08,.2,C[1]],[0,.17]],9,C[2]);vmTurn(d2,[0,0,0],.3,.7,-1.25);f.push(...sh(d2,.16,.13,.12));
  f.push(...slab(.3,0,-.12,.15,.12,C[1]),...slab(-.28,0,-.2,.11,.09,C[2]),...slab(.05,0,-.27,.13,.08,C[1],{rz:.2}),...slab(-.1,0,.26,.08,.06,C[0]));
  for(let k=0;k<2;k++)f.push(...vmBox(.36,.2,-.1+k*.08,.02,.26,.02,RB,{rz:.5+k*.3}))}
 f.matHint='stone';return f}

function terminal(){const BG=[178,172,152],BG2=[140,136,122],DK2=[40,44,54],GR=[60,255,120],WH=[240,255,244],DS=[146,146,152],f=[];
 f.push(...loft('y',.32,chamf(.86,.52,.03),.36,null,DS),...vmBox(.27,.16,0,.24,.32,.44,[92,96,110]),...vmBox(-.38,.16,0,.04,.32,.44,[92,96,110]),...vmBox(-.1,.26,-.2,.5,.1,.02,[92,96,110]));
 for(const y of[.25,.12]){f.push(...vmBox(.27,y,.222,.2,.1,.008,[122,126,140]),...vmBox(.27,y,.229,.08,.014,.01,DK2))}
 /* a deep 90s tube monitor */
 f.push(...loft('y',.36,rect(.22,.18,0,-.06),.4,rect(.13,.11,0,-.06),BG2));
 f.push(...loft('z',.03,[[-.21,.4],[.21,.4],[.21,.72],[-.21,.72]],-.24,[[-.13,.44],[.13,.44],[.13,.64],[-.13,.64]],BG),...loft('z',.03,[[-.215,.395],[.215,.395],[.215,.725],[-.215,.725]],.055,[[-.2,.41],[.2,.41],[.2,.71],[-.2,.71]],BG2));
 f.push(...vmBox(0,.57,.056,.34,.25,.006,[4,24,12],{e:1}));
 for(let r=0;r<4;r++)for(let k=0;k<6;k++)if(((r*5+k*3)%4)!=0)f.push(...vmBox(-.14+k*.056,.655-r*.055,.061,.03,.03,.004,(r+k)&1?WH:GR,{e:1}));
 f.push(...vmBox(.15,.425,.057,.03,.012,.004,GR,{e:1}));
 f.push(...loft('x',-.17,[[.1,.36],[.23,.36],[.23,.372],[.1,.395]],.17,null,BG),...vmBox(0,.386,.165,.3,.004,.1,BG2,{rx:.17}));
 f.push(...vmBox(-.31,.43,-.05,.17,.14,.32,BG),...vmBox(-.31,.45,.112,.11,.012,.004,DK2),...vmBox(-.37,.4,.112,.014,.014,.004,GR,{e:1}));
 f.push(...lathe([[0,0],[.03,0],[.034,.07],[.028,.07],[.026,.02],[0,.02]],8,[190,90,70],{x:.33,y:.36,z:.12}));return f}

function lamp(){const D=[44,46,54],f=[];f.push(...lathe([[0,0],[.09,0],[.09,.09],[.055,.16],[.036,.9],[.03,1.5],[0,1.5]],8,D));
 f.push(...loft('z',0,[[-.022,1.46],[.022,1.46],[.022,1.5],[-.022,1.5]],.12,[[-.022,1.555],[.022,1.555],[.022,1.595],[-.022,1.595]],D),...loft('z',.12,[[-.022,1.555],[.022,1.555],[.022,1.595],[-.022,1.595]],.2,[[-.022,1.57],[.022,1.57],[.022,1.61],[-.022,1.61]],D));
 f.push(...loft('y',1.5,rect(.2,.24,0,.28),1.585,rect(.1,.16,0,.26),D));const gl=vmBox(0,1.487,.28,.15,.026,.19,[255,214,140],{e:1});for(const q of gl)q.em=1;f.push(...gl);return f}

window.CELPROPS=function(M){const mk=[crate,barrel,pillar,table,shelf,brazier,urn,cabinet];mk.forEach((fn,i)=>{M[i]=fn()});for(let i=0;i<6;i++)M[8+i]=car(i);M[14]=rubble(0);M[15]=rubble(1);M[16]=terminal()};
window.CELPROPS.lamp=lamp;window.CELPROPS.loft=loft;window.CELPROPS.lathe=lathe;
})();

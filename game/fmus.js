/* ===== floor music (0.9.335, given drive in 0.9.336) =====
   A background track for the ordinary floors of a run (single player and co-op), made here with the audio engine like the boss music.
   118 beats a minute: a kick and snare with hats, an eighth-note bass that pushes, a sixteenth arpeggio, pads underneath, and every other
   eight bars a lead tune over the top (its phrase drawn fresh each floor). Lively enough to fight to, still under the gunfire.
   Three moods from the same bones:
   - the ordinary floors: a driving minor-key loop
   - the ruined floors (16-25): lower and grimmer, half-time drums with a dusty, crushed sound, warped pads, wind under it
   - the alien world (past 25): bright floating chords, a pulsing synth bass, shakers, glassy bells for the arpeggio and the tune
   It steps aside for the boss music, a custom music link, the castle, the station and the cutscenes, falls quieter while paused, and it goes
   through the music volume (and the saloon's piano ducking). */
const FMU={on:0,mode:'',bar:0,nt:0,g:null,dl:null,cx:null,nz:null,wind:null,fade:0,run:0,seed:1,iv:null};
const FMU_HI=.65;/* 0.9.341: the high parts (arpeggio, lead, bells, hats) a further 35% down */
const FMU_BAR=60/118*4;
const FMU_P={
 /* chord tones as midi notes; bass root; the plucked line's notes */
 reg:{ch:[[50,57,60,65],[46,53,57,62],[41,48,57,60],[48,55,60,64]],bs:[38,34,41,36],ar:[62,65,67,69,72,74,77],lp:1100,pad:.035,pl:.55,arv:.05,wob:0,wind:0,bell:0,dr:'rock',bt:'sawtooth',bl:700,ld:'square'},
 ruin:{ch:[[45,52,57,60],[41,48,53,57],[43,50,55,58],[40,47,52,56]],bs:[33,29,31,28],ar:[57,60,62,64,67,69],lp:650,pad:.035,pl:.3,arv:.04,wob:1,wind:1,bell:.15,dr:'half',bt:'sawtooth',bl:420,ld:'sawtooth'},
 aln:{ch:[[48,55,59,66],[50,57,61,64],[46,53,57,64],[45,52,56,61]],bs:[36,38,34,33],ar:[71,74,76,78,79,83,86],lp:2400,pad:.025,pl:.6,arv:.026,wob:.4,wind:0,bell:1,mv:.75,dr:'elec',bt:'square',bl:900,ld:'sine'}};
function fmuMode(){try{if(typeof alienOn=='function'&&alienOn())return'aln';if(typeof apocOn=='function'&&apocOn())return'ruin'}catch(e){}return'reg'}
function fmuWanted(){try{if(!AC||typeof P=='undefined'||!P||!FMU.run)return false;if(BN&&BN.on)return false;if(DM&&!(typeof CO=='function'&&CO()))return false;
 if(!['play','menu','pick','paused','pre'].includes(state))return false;if(BM&&BM.on)return false;if(typeof musWant=='function'&&musWant())return false;
 if(typeof CAS!='undefined'&&CAS)return false;if(typeof SPC!='undefined'&&SPC)return false;if(typeof SPCF!='undefined'&&SPCF)return false;if(typeof APC!='undefined'&&APC)return false;if(typeof ALC!='undefined'&&ALC)return false;if(typeof ELV!='undefined'&&ELV)return false;if(typeof SPEC!='undefined'&&SPEC)return false;
 return true}catch(e){return false}}
function fmuBus(){if(FMU.g&&FMU.cx===AC)return true;try{const A=AC,g=A.createGain(),dl=A.createDelay(1),fb=A.createGain(),dw=A.createGain();g.gain.value=0;dl.delayTime.value=FMU_BAR/8*1.5;fb.gain.value=.34;dw.gain.value=.5;
 dl.connect(fb);fb.connect(dl);dl.connect(dw);dw.connect(g);g.connect(typeof audMus=='function'?audMus():A.destination);
 /* the wind under the ruined floors: looping noise through a slowly moving band */
 const nb=A.createBuffer(1,A.sampleRate*3,A.sampleRate),d=nb.getChannelData(0);let y=0;for(let i=0;i<d.length;i++){y=y*.97+(Math.random()*2-1)*.03;d[i]=y*6}
 const ns=A.createBufferSource();ns.buffer=nb;ns.loop=true;const bp=A.createBiquadFilter();bp.type='bandpass';bp.frequency.value=420;bp.Q.value=.7;const wg=A.createGain();wg.gain.value=0;ns.connect(bp);bp.connect(wg);wg.connect(g);ns.start();
 const db=A.createBuffer(1,A.sampleRate*.5|0,A.sampleRate),dd=db.getChannelData(0);for(let i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;FMU.nb=db;
 FMU.g=g;FMU.dl=dl;FMU.wind=wg;FMU.wbp=bp;FMU.cx=A;return true}catch(e){return false}}
const fmuF=m=>440*Math.pow(2,(m-69)/12);
let fmuR=1;const fmuRnd=()=>{fmuR=(fmuR*16807)%2147483647;return fmuR/2147483647};
/* a pad chord: each note two soft voices a hair apart, slow in, slow out, through a low filter; the ruined pads wobble */
function fmuPad(t,notes,M){const A=AC,d=FMU_BAR+.6,lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(M.lp*.7,t);lp.frequency.linearRampToValueAtTime(M.lp,t+d*.5);lp.frequency.linearRampToValueAtTime(M.lp*.75,t+d);lp.Q.value=.5;
 const g=A.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(M.pad,t+.25);g.gain.setValueAtTime(M.pad,t+d-.6);g.gain.linearRampToValueAtTime(0,t+d);lp.connect(g);g.connect(FMU.g);
 for(const m of notes){for(const[ty,dt,a]of[['triangle',-4,.6],['sine',5,.7]]){const o=A.createOscillator(),og=A.createGain();o.type=ty;o.frequency.value=fmuF(m);o.detune.value=dt;og.gain.value=a/notes.length;
  if(M.wob){const lf=A.createOscillator(),lg=A.createGain();lf.frequency.value=.13+fmuRnd()*.1;lg.gain.value=14*M.wob;lf.connect(lg);lg.connect(o.detune);lf.start(t);lf.stop(t+d+.1)}
  o.connect(og);og.connect(lp);o.start(t);o.stop(t+d+.1)}}}
function fmuBass(t,m,M){const A=AC,o=A.createOscillator(),g=A.createGain();o.type='sine';o.frequency.value=fmuF(m);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(M===FMU_P.aln?.07:.06,t+.3);g.gain.setTargetAtTime(0,t+FMU_BAR*.8,.6);o.connect(g);g.connect(FMU.g);o.start(t);o.stop(t+FMU_BAR+2)}
/* a plucked note (or a glassy bell on the alien world), into the echo too */
function fmuPluck(t,m,v,bell){const A=AC,f=fmuF(m),g=A.createGain(),dec=bell?2.6:1.3;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(.0005,t+dec);g.connect(FMU.g);g.connect(FMU.dl);
 const o=A.createOscillator();o.type=bell?'sine':'triangle';o.frequency.value=f;if(bell){const mo=A.createOscillator(),mg=A.createGain();mo.frequency.value=f*3.5;mg.gain.setValueAtTime(f*1.2,t);mg.gain.exponentialRampToValueAtTime(f*.02,t+dec);mo.connect(mg);mg.connect(o.frequency);mo.start(t);mo.stop(t+dec+.05)}
 const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=bell?6000:2200;o.connect(lp);lp.connect(g);o.start(t);o.stop(t+dec+.05)}
/* drums: a kick (a falling sine), a snare (noise and a body tone), a hat (a tick of high noise) */
function fmuKick(t,v,M){const A=AC,o=A.createOscillator(),g=A.createGain();o.type='sine';o.frequency.setValueAtTime(M.dr=='elec'?120:150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.connect(g);g.connect(FMU.g);o.start(t);o.stop(t+.3)}
function fmuNoise(t,v,dur,type,f,q){const A=AC,s=A.createBufferSource(),bf=A.createBiquadFilter(),g=A.createGain();s.buffer=FMU.nb;bf.type=type;bf.frequency.value=f;bf.Q.value=q||.7;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(bf);bf.connect(g);g.connect(FMU.g);s.start(t,Math.random()*.3);s.stop(t+dur+.02)}
function fmuSnare(t,v,M){fmuNoise(t,v,M.dr=='half'?.32:.18,'bandpass',M.dr=='half'?1400:1900,.8);const A=AC,o=A.createOscillator(),g=A.createGain();o.type='triangle';o.frequency.setValueAtTime(200,t);o.frequency.exponentialRampToValueAtTime(120,t+.08);g.gain.setValueAtTime(v*.5,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g);g.connect(FMU.g);o.start(t);o.stop(t+.14)}
function fmuHat(t,v,open){fmuNoise(t,v*FMU_HI,open?.16:.035,'highpass',open?6500:8000,.5)}
/* a bass note: a filtered saw (square on the alien world), short and punchy */
function fmuBassN(t,m,d,v,M){const A=AC,o=A.createOscillator(),lp=A.createBiquadFilter(),g=A.createGain();o.type=M.bt;o.frequency.value=fmuF(m);lp.type='lowpass';lp.Q.value=4;lp.frequency.setValueAtTime(M.bl*2.2,t);lp.frequency.exponentialRampToValueAtTime(M.bl*.6,t+d);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.008);g.gain.setTargetAtTime(v*.6,t+.05,.08);g.gain.setTargetAtTime(0,t+d*.9,.03);o.connect(lp);lp.connect(g);g.connect(FMU.g);o.start(t);o.stop(t+d+.15)}
/* a lead note: a soft square (a saw on the ruins, a sine bell on the alien world) with a little vibrato, into the echo */
function fmuLead(t,m,d,v,M){if(M.bell>=1){fmuPluck(t,m,v*1.4,1);return}const A=AC,o=A.createOscillator(),lf=A.createOscillator(),lg=A.createGain(),lp=A.createBiquadFilter(),g=A.createGain();o.type=M.ld;o.frequency.value=fmuF(m);lf.frequency.value=5.5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(fmuF(m)*.012,t+Math.min(d,.4));lf.connect(lg);lg.connect(o.frequency);
 lp.type='lowpass';lp.frequency.value=M.dr=='half'?1300:2400;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.setValueAtTime(v*.8,t+d*.7);g.gain.linearRampToValueAtTime(0,t+d);o.connect(lp);lp.connect(g);g.connect(FMU.g);g.connect(FMU.dl);o.start(t);o.stop(t+d+.05);lf.start(t);lf.stop(t+d+.05)}
/* the lead tune for this floor: a four-bar phrase of eighths and quarters, played as A A' over the eight bars */
function fmuPhrase(M){const ph=[];for(let b=0;b<4;b++){let k=0;while(k<8){const long=fmuRnd()<.4&&k<7,rest=fmuRnd()<.18;if(!rest){const pool=fmuRnd()<.6?M.ch[b].map(m=>m+12).filter(m=>m>=M.ar[0]-3&&m<=M.ar[M.ar.length-1]):M.ar;ph.push([b*8+k,pool[(fmuRnd()*pool.length)|0],long?2:1])}k+=long?2:1}}return ph}
function fmuSchedBar(t){const M=FMU_P[FMU.mode]||FMU_P.reg,i=FMU.bar%4,ch=M.ch[i],st=FMU_BAR/16,sec=(FMU.bar>>3)%4,fill=FMU.bar%8==7;
 fmuPad(t,ch,M);
 /* drums */
 for(let k=0;k<16;k++){const tt=t+k*st;
  if(M.dr=='half'){if(k==0||k==10)fmuKick(tt,.5,M);if(k==8)fmuSnare(tt,.22,M);if(k%4==2)fmuHat(tt,.05,k==14)}
  else{if(k==0||k==8||(k==10&&sec%2)||(M.dr=='elec'&&k==6))fmuKick(tt,.5,M);if(k==4||k==12)fmuSnare(tt,.2,M);if(M.dr=='elec'){fmuHat(tt,k%2?.03:.05,false)}else if(k%2==0)fmuHat(tt,k%4==2?.06:.035,k==14&&fill)}
  if(fill&&k>=12&&k%1==0&&M.dr!='half')fmuSnare(tt,.08+.03*(k-12),M)}
 /* bass: eighths on the root with the octave on the offbeats (on the ruins: longer notes) */
 const r=M.bs[i];if(M.dr=='half'){fmuBassN(t,r,st*6,.16,M);fmuBassN(t+st*6,r,st*2,.12,M);fmuBassN(t+st*8,r+(fmuRnd()<.5?7:12),st*4,.14,M);fmuBassN(t+st*12,r,st*4,.14,M)}
 else for(let k=0;k<8;k++)fmuBassN(t+k*st*2,r+(k%2&&k!=7?12:0)+(k==7?7:0),st*1.8,k%2?.1:.15,M);
 /* the sixteenth arpeggio (sparser on the ruins) */
 const up=ch.map(m=>m+12),pat=[0,1,2,3,2,1,0,2];for(let k=0;k<16;k++){if(M.dr=='half'&&k%2)continue;if(fmuRnd()>M.pl+.3)continue;fmuPluck(t+k*st,up[pat[k%8]%up.length]+(k>=8&&sec%2?12:0),M.arv*.55*FMU_HI*(k%4==0?1.2:.85),M.bell>=1||(M.bell&&fmuRnd()<M.bell))}
 /* the lead: the second and fourth eight bars */
 if(sec%2==1){if(!FMU.ph)FMU.ph=fmuPhrase(M);const half=(FMU.bar%8)>=4,b4=FMU.bar%4;for(const[e,m,l]of FMU.ph){if((e>>3)!==b4)continue;const mm=half&&b4==3&&e==FMU.ph[FMU.ph.length-1][0]?ch[0]+12:m;fmuLead(t+(e%8)*st*2,mm,l*st*2*.95,.06*FMU_HI,M)}}
 FMU.bar++}
function fmuTick(){if(!AC){return}const want=fmuWanted();const now=AC.currentTime;
 if(!want){if(FMU.on){FMU.on=0;try{FMU.g.gain.cancelScheduledValues(now);FMU.g.gain.setTargetAtTime(0,now,.6);FMU.wind.gain.setTargetAtTime(0,now,.6)}catch(e){}}return}
 if(!fmuBus())return;const md=fmuMode();
 if(!FMU.on){FMU.on=1;FMU.nt=Math.max(FMU.nt,now+.15);if(FMU.mode!==md){FMU.mode=md;FMU.bar=0}fmuR=(FMU.seed*9301+49297)%233280+1}
 if(md!==FMU.mode){FMU.mode=md;FMU.bar=0;FMU.ph=null}
 const M=FMU_P[FMU.mode],paused=state!='play';FMU.g.gain.setTargetAtTime((paused?.4:.8)*.75*(M.mv||1),now,.8);/* 0.9.341: everything 25% down */FMU.wind.gain.setTargetAtTime(M.wind?.05:0,now,1.2);if(M.wind)FMU.wbp.frequency.setTargetAtTime(300+200*Math.sin(now*.2),now,.5);
 while(FMU.nt<now+.6){if(FMU.nt<now-.2)FMU.nt=now+.05;fmuSchedBar(FMU.nt);FMU.nt+=FMU_BAR}}
/* a run is on from its first floor until the title screen; each floor reshuffles the plucked line */
(function(){const sf=typeof startFloor=='function'?startFloor:null;if(sf){startFloor=function(){const r=sf.apply(this,arguments);try{FMU.run=1;FMU.seed=((typeof fl=='number'?fl:1)*7919+(typeof seed=='number'?seed:0))%100000+1;fmuR=FMU.seed;FMU.ph=null;FMU.bar=0}catch(e){}return r}}
 setInterval(()=>{try{if(typeof state!='undefined'&&(state=='title'||state=='dead'||state=='ended'||state=='failed'))FMU.run=0;fmuTick()}catch(e){}},100)})();

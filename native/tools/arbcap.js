// Reads .arbcap files written by glrec.js. Returns {ops:[{name,ret,args}]}; typed arrays come back as Buffers {k,b}.
exports.read=function(buf){
 if(buf.slice(0,7).toString()!=='ARBCAP1')throw new Error('not an arbcap file');
 let p=8;const names=[];const ops=[];
 const rd=()=>{const t=buf[p++];switch(t){case 0:return null;case 1:{const v=buf.readDoubleLE(p);p+=8;return v}case 2:{const v={id:buf.readUInt32LE(p)};p+=4;return v}
  case 3:{const n=buf.readUInt32LE(p);p+=4;const s=buf.toString('utf8',p,p+n);p+=n;return s}
  case 4:{const k=buf[p++];const n=buf.readUInt32LE(p);p+=4;const b=buf.subarray(p,p+n);p+=n;return {k,b}}
  case 5:return true;case 6:return false;
  case 7:{const n=buf.readUInt32LE(p);p+=4;const a=[];for(let i=0;i<n;i++){a.push(buf.readDoubleLE(p));p+=8}return a}
  default:throw new Error('bad tag '+t+' at '+p)}};
 let last=8;while(p<buf.length){const st=p;const ni=buf.readUInt16LE(p);p+=2;
  if(ni===0xFFFF){const idx=buf.readUInt16LE(p);p+=2;const l=buf[p++];names[idx]=buf.toString('utf8',p,p+l);p+=l;continue}
  const argc=buf[p++];const ret=buf.readUInt32LE(p);p+=4;const args=[];for(let i=0;i<argc;i++)args.push(rd());ops.push({name:names[ni],ret,args,end:p,from:last});last=p}
 return {ops}};

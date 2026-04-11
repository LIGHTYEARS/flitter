// Module: child-process-2
// Original: KyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: KyR (CJS)
(T,R)=>{var a=qT("child_process"),e=FyR(),t=GyR();
function r(i,c,s){let A=e(i,c,s),l=a.spawn(A.command,A.args,A.options);
return t.hookChildProcess(l,A),l}function h(i,c,s){let A=e(i,c,s),l=a.spawnSync(A.command,A.args,A.options);
return l.error=l.error||t.verifyENOENTSync(l.status,A),l}R.exports=r,R.exports.spawn=r,R.exports.sync=h,R.exports._parse=e,R.exports._enoent=t}
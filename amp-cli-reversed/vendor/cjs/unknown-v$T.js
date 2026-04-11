// Module: unknown-v$T
// Original: v$T
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: v$T (CJS)
(T,R)=>{var a=qT("path").sep;
R.exports=function(e){var t=e.split(a),r=t.lastIndexOf("node_modules");
if(r===-1)return;
if(!t[r+1])return;
var h=t[r+1][0]==="@",i=h?t[r+1]+"/"+t[r+2]:t[r+1],c=h?3:2,s="",A=r+c-1;
for(var l=0;
l<=A;
l++)if(l===A)s+=t[l];
else s+=t[l]+a;
var o="",n=t.length-1;
for(var p=r+c;
p<=n;
p++)if(p===n)o+=t[p];
else o+=t[p]+a;
return{name:i,basedir:s,path:o}}}
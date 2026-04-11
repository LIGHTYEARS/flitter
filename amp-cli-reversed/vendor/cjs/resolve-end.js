// Module: resolve-end
// Original: pO
// Type: CJS (RT wrapper)
// Exports: resolveEnd
// Category: util

// Module: pO (CJS)
(T)=>{function R(a,e,t,r){let h="";
if(a){let i=!1,c="";
for(let s of a){let{source:A,type:l}=s;
switch(l){case"space":i=!0;
break;
case"comment":{if(t&&!i)r(s,"MISSING_CHAR","Comments must be separated from other tokens by white space characters");
let o=A.substring(1)||" ";
if(!h)h=o;
else h+=c+o;
c="";
break}case"newline":if(h)c+=A;
i=!0;
break;
default:r(s,"UNEXPECTED_TOKEN",`Unexpected ${l} at node end`)}e+=A.length}}return{comment:h,offset:e}}T.resolveEnd=R}
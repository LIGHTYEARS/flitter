// Module: unknown-qyR
// Original: qyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: qyR (CJS)
(T,R)=>{var a=WyR();
R.exports=(e="")=>{let t=e.match(a);
if(!t)return null;
let[r,h]=t[0].replace(/#! ?/,"").split(" "),i=r.split("/").pop();
if(i==="env")return h;
return h?`${i} ${h}`:i}}
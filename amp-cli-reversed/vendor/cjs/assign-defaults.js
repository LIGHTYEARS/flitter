// Module: assign-defaults
// Original: cuR
// Type: CJS (RT wrapper)
// Exports: assignDefaults
// Category: util

// Module: cuR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.assignDefaults=void 0;
var R=M9(),a=a8();
function e(r,h){let{properties:i,items:c}=r.schema;
if(h==="object"&&i)for(let s in i)t(r,s,i[s].default);
else if(h==="array"&&Array.isArray(c))c.forEach((s,A)=>t(r,A,s.default))}T.assignDefaults=e;
function t(r,h,i){let{gen:c,compositeRule:s,data:A,opts:l}=r;
if(i===void 0)return;
let o=R._`${A}${(0,R.getProperty)(h)}`;if(s){(0,a.checkStrictMode)(r,`default is ignored for: ${o}`);return}let n=R._`${o} === undefined`;if(l.useDefaults==="empty")n=R._`${n} || ${o} === null || ${o} === ""`;c.if(n,R._`${o} = ${(0,R.stringify)(i)}`)}}
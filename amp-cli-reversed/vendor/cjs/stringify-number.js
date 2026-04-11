// Module: stringify-number
// Original: AO
// Type: CJS (RT wrapper)
// Exports: stringifyNumber
// Category: util

// Module: AO (CJS)
(T)=>{function R({format:a,minFractionDigits:e,tag:t,value:r}){if(typeof r==="bigint")return String(r);
let h=typeof r==="number"?r:Number(r);
if(!isFinite(h))return isNaN(h)?".nan":h<0?"-.inf":".inf";
let i=Object.is(r,-0)?"-0":JSON.stringify(r);
if(!a&&e&&(!t||t==="tag:yaml.org,2002:float")&&/^\d/.test(i)){let c=i.indexOf(".");
if(c<0)c=i.length,i+=".";
let s=e-(i.length-c-1);
while(s-- >0)i+="0"}return i}T.stringifyNumber=R}
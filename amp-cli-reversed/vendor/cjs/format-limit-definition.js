// Module: format-limit-definition
// Original: KuR
// Type: CJS (RT wrapper)
// Exports: default, formatLimitDefinition
// Category: util

// Module: kuR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0});
function R(a){let e=a.length,t=0,r=0,h;
while(r<e)if(t++,h=a.charCodeAt(r++),h>=55296&&h<=56319&&r<e){if(h=a.charCodeAt(r),(h&64512)===56320)r++}return t}T.default=R,R.code='require("ajv/dist/runtime/ucs2length").default'}
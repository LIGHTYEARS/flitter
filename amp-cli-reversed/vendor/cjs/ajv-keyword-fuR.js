// Module: ajv-keyword-fuR
// Original: fuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: fuR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0});
var R=dc(),a=M9(),e={message:({schemaCode:r})=>a.str`must match pattern "${r}"`,params:({schemaCode:r})=>a._`{pattern: ${r}}`},t={keyword:"pattern",type:"string",schemaType:"string",$data:!0,error:e,code(r){let{data:h,$data:i,schema:c,schemaCode:s,it:A}=r,l=A.opts.unicodeRegExp?"u":"",o=i?a._`(new RegExp(${s}, ${l}))`:(0,R.usePattern)(r,c);r.fail$data(a._`!${o}.test(${h})`)}};T.default=t}
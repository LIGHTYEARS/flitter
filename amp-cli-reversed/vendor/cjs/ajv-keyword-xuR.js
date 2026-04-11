// Module: ajv-keyword-xuR
// Original: xuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: xuR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0});
var R=M9(),a=a8(),e=kuR(),t={message({keyword:h,schemaCode:i}){let c=h==="maxLength"?"more":"fewer";
return R.str`must NOT have ${c} than ${i} characters`},params:({schemaCode:h})=>R._`{limit: ${h}}`},r={keyword:["maxLength","minLength"],type:"string",schemaType:"number",$data:!0,error:t,code(h){let{keyword:i,data:c,schemaCode:s,it:A}=h,l=i==="maxLength"?R.operators.GT:R.operators.LT,o=A.opts.unicode===!1?R._`${c}.length`:R._`${(0,a.useFunc)(h.gen,e.default)}(${c})`;h.fail$data(R._`${o} ${l} ${s}`)}};T.default=r}
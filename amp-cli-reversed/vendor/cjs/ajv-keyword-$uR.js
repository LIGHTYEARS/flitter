// Module: ajv-keyword-$uR
// Original: $uR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: $uR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0});
var R=M9(),a={message({keyword:t,schemaCode:r}){let h=t==="maxItems"?"more":"fewer";
return R.str`must NOT have ${h} than ${r} items`},params:({schemaCode:t})=>R._`{limit: ${t}}`},e={keyword:["maxItems","minItems"],type:"array",schemaType:"number",$data:!0,error:a,code(t){let{keyword:r,data:h,schemaCode:i}=t,c=r==="maxItems"?R.operators.GT:R.operators.LT;t.fail$data(R._`${h}.length ${c} ${i}`)}};T.default=e}
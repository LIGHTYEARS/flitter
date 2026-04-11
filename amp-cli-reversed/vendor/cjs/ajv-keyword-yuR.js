// Module: ajv-keyword-yuR
// Original: yuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: yuR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0});
var R=M9(),a=R.operators,e={maximum:{okStr:"<=",ok:a.LTE,fail:a.GT},minimum:{okStr:">=",ok:a.GTE,fail:a.LT},exclusiveMaximum:{okStr:"<",ok:a.LT,fail:a.GTE},exclusiveMinimum:{okStr:">",ok:a.GT,fail:a.LTE}},t={message:({keyword:h,schemaCode:i})=>R.str`must be ${e[h].okStr} ${i}`,params:({keyword:h,schemaCode:i})=>R._`{comparison: ${e[h].okStr}, limit: ${i}}`},r={keyword:Object.keys(e),type:"number",schemaType:"number",$data:!0,error:t,code(h){let{keyword:i,data:c,schemaCode:s}=h;h.fail$data(R._`${c} ${e[i].fail} ${s} || isNaN(${c})`)}};T.default=r}
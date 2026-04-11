// Module: validate-tuple
// Original: jMT
// Type: CJS (RT wrapper)
// Exports: default, validateTuple
// Category: util

// Module: jMT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.validateTuple=void 0;
var R=M9(),a=a8(),e=dc(),t={keyword:"items",type:"array",schemaType:["object","array","boolean"],before:"uniqueItems",code(h){let{schema:i,it:c}=h;
if(Array.isArray(i))return r(h,"additionalItems",i);
if(c.items=!0,(0,a.alwaysValidSchema)(c,i))return;
h.ok((0,e.validateArray)(h))}};
function r(h,i,c=h.schema){let{gen:s,parentSchema:A,data:l,keyword:o,it:n}=h;
if(m(A),n.opts.unevaluated&&c.length&&n.items!==!0)n.items=a.mergeEvaluated.items(s,c.length,n.items);
let p=s.name("valid"),_=s.const("len",R._`${l}.length`);c.forEach((b,y)=>{if((0,a.alwaysValidSchema)(n,b))return;s.if(R._`${_} > ${y}`,()=>h.subschema({keyword:o,schemaProp:y,dataProp:y},p)),h.ok(p)});function m(b){let{opts:y,errSchemaPath:u}=n,P=c.length,k=P===b.minItems&&(P===b.maxItems||b[i]===!1);if(y.strictTuples&&!k){let x=`"${o}" is ${P}-tuple, but minItems or maxItems/${i} are not specified or different at path "${u}"`;(0,a.checkStrictMode)(n,x,y.strictTuples)}}}T.validateTuple=r,T.default=t}
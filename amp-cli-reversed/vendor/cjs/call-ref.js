// Module: call-ref
// Original: E9T
// Type: CJS (RT wrapper)
// Exports: callRef, default, getValidate
// Category: util

// Module: E9T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.callRef=T.getValidate=void 0;
var R=oO(),a=dc(),e=M9(),t=Oc(),r=ON(),h=a8(),i={keyword:"$ref",schemaType:"string",code(A){let{gen:l,schema:o,it:n}=A,{baseId:p,schemaEnv:_,validateName:m,opts:b,self:y}=n,{root:u}=_;
if((o==="#"||o==="#/")&&p===u.baseId)return k();
let P=r.resolveRef.call(y,u,p,o);
if(P===void 0)throw new R.default(n.opts.uriResolver,p,o);
if(P instanceof r.SchemaEnv)return x(P);
return f(P);
function k(){if(_===u)return s(A,m,_,_.$async);
let v=l.scopeValue("root",{ref:u});
return s(A,e._`${v}.validate`,u,u.$async)}function x(v){let g=c(A,v);s(A,g,v,v.$async)}function f(v){let g=l.scopeValue("schema",b.code.source===!0?{ref:v,code:(0,e.stringify)(v)}:{ref:v}),I=l.name("valid"),S=A.subschema({schema:v,dataTypes:[],schemaPath:e.nil,topSchemaRef:g,errSchemaPath:o},I);A.mergeEvaluated(S),A.ok(I)}}};function c(A,l){let{gen:o}=A;return l.validate?o.scopeValue("validate",{ref:l.validate}):e._`${o.scopeValue("wrapper",{ref:l})}.validate`}T.getValidate=c;function s(A,l,o,n){let{gen:p,it:_}=A,{allErrors:m,schemaEnv:b,opts:y}=_,u=y.passContext?t.default.this:e.nil;if(n)P();else k();function P(){if(!b.$async)throw Error("async schema referenced by sync schema");let v=p.let("valid");p.try(()=>{if(p.code(e._`await ${(0,a.callValidateCode)(A,l,u)}`),f(l),!m)p.assign(v,!0)},(g)=>{if(p.if(e._`!(${g} instanceof ${_.ValidationError})`,()=>p.throw(g)),x(g),!m)p.assign(v,!1)}),A.ok(v)}function k(){A.result((0,a.callValidateCode)(A,l,u),()=>f(l),()=>x(l))}function x(v){let g=e._`${v}.errors`;p.assign(t.default.vErrors,e._`${t.default.vErrors} === null ? ${g} : ${t.default.vErrors}.concat(${g})`),p.assign(t.default.errors,e._`${t.default.vErrors}.length`)}function f(v){var g;if(!_.opts.unevaluated)return;let I=(g=o===null||o===void 0?void 0:o.validate)===null||g===void 0?void 0:g.evaluated;if(_.props!==!0)if(I&&!I.dynamicProps){if(I.props!==void 0)_.props=h.mergeEvaluated.props(p,I.props,_.props)}else{let S=p.var("props",e._`${v}.evaluated.props`);_.props=h.mergeEvaluated.props(p,S,_.props,e.Name)}if(_.items!==!0)if(I&&!I.dynamicItems){if(I.items!==void 0)_.items=h.mergeEvaluated.items(p,I.items,_.items)}else{let S=p.var("items",e._`${v}.evaluated.items`);_.items=h.mergeEvaluated.items(p,S,_.items,e.Name)}}}T.callRef=s,T.default=i}
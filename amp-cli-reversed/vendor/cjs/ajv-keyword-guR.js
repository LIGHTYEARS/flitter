// Module: ajv-keyword-guR
// Original: guR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: guR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0});
var R=dc(),a=M9(),e=a8(),t={message:({params:{missingProperty:h}})=>a.str`must have required property '${h}'`,params:({params:{missingProperty:h}})=>a._`{missingProperty: ${h}}`},r={keyword:"required",type:"object",schemaType:"array",$data:!0,error:t,code(h){let{gen:i,schema:c,schemaCode:s,data:A,$data:l,it:o}=h,{opts:n}=o;if(!l&&c.length===0)return;let p=c.length>=n.loopRequired;if(o.allErrors)_();else m();if(n.strictRequired){let u=h.parentSchema.properties,{definedProperties:P}=h.it;for(let k of c)if((u===null||u===void 0?void 0:u[k])===void 0&&!P.has(k)){let x=o.schemaEnv.baseId+o.errSchemaPath,f=`required property "${k}" is not defined at "${x}" (strictRequired)`;(0,e.checkStrictMode)(o,f,o.opts.strictRequired)}}function _(){if(p||l)h.block$data(a.nil,b);else for(let u of c)(0,R.checkReportMissingProp)(h,u)}function m(){let u=i.let("missing");if(p||l){let P=i.let("valid",!0);h.block$data(P,()=>y(u,P)),h.ok(P)}else i.if((0,R.checkMissingProp)(h,c,u)),(0,R.reportMissingProp)(h,u),i.else()}function b(){i.forOf("prop",s,(u)=>{h.setParams({missingProperty:u}),i.if((0,R.noPropertyInData)(i,A,u,n.ownProperties),()=>h.error())})}function y(u,P){h.setParams({missingProperty:u}),i.forOf(u,s,()=>{i.assign(P,(0,R.propertyInData)(i,A,u,n.ownProperties)),i.if((0,a.not)(P),()=>{h.error(),i.break()})},a.nil)}}};T.default=r}
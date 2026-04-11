// Module: error
// Original: L9T
// Type: CJS (RT wrapper)
// Exports: default, error, validatePropertyDeps, validateSchemaDeps
// Category: util

// Module: L9T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.validateSchemaDeps=T.validatePropertyDeps=T.error=void 0;
var R=M9(),a=a8(),e=dc();
T.error={message:({params:{property:c,depsCount:s,deps:A}})=>{let l=s===1?"property":"properties";
return R.str`must have ${l} ${A} when property ${c} is present`},params:({params:{property:c,depsCount:s,deps:A,missingProperty:l}})=>R._`{property: ${c},
    missingProperty: ${l},
    depsCount: ${s},
    deps: ${A}}`};var t={keyword:"dependencies",type:"object",schemaType:"object",error:T.error,code(c){let[s,A]=r(c);h(c,s),i(c,A)}};function r({schema:c}){let s={},A={};for(let l in c){if(l==="__proto__")continue;let o=Array.isArray(c[l])?s:A;o[l]=c[l]}return[s,A]}function h(c,s=c.schema){let{gen:A,data:l,it:o}=c;if(Object.keys(s).length===0)return;let n=A.let("missing");for(let p in s){let _=s[p];if(_.length===0)continue;let m=(0,e.propertyInData)(A,l,p,o.opts.ownProperties);if(c.setParams({property:p,depsCount:_.length,deps:_.join(", ")}),o.allErrors)A.if(m,()=>{for(let b of _)(0,e.checkReportMissingProp)(c,b)});else A.if(R._`${m} && (${(0,e.checkMissingProp)(c,_,n)})`),(0,e.reportMissingProp)(c,n),A.else()}}T.validatePropertyDeps=h;function i(c,s=c.schema){let{gen:A,data:l,keyword:o,it:n}=c,p=A.name("valid");for(let _ in s){if((0,a.alwaysValidSchema)(n,s[_]))continue;A.if((0,e.propertyInData)(A,l,_,n.opts.ownProperties),()=>{let m=c.subschema({keyword:o,schemaProp:_},p);c.mergeValidEvaluated(m,p)},()=>A.var(p,!0)),c.ok(p)}}T.validateSchemaDeps=i,T.default=t}
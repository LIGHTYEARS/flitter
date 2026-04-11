// Module: create-allow-list-attributes-processor
// Original: mZ
// Type: CJS (RT wrapper)
// Exports: createAllowListAttributesProcessor, createDenyListAttributesProcessor, createMultiAttributesProcessor, createNoopAttributesProcessor
// Category: util

// Module: mZ (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.createDenyListAttributesProcessor=T.createAllowListAttributesProcessor=T.createMultiAttributesProcessor=T.createNoopAttributesProcessor=void 0;
class R{process(A,l){return A}}class a{_processors;
constructor(A){this._processors=A}process(A,l){let o=A;
for(let n of this._processors)o=n.process(o,l);
return o}}class e{_allowedAttributeNames;
constructor(A){this._allowedAttributeNames=A}process(A,l){let o={};
return Object.keys(A).filter((n)=>this._allowedAttributeNames.includes(n)).forEach((n)=>o[n]=A[n]),o}}class t{_deniedAttributeNames;
constructor(A){this._deniedAttributeNames=A}process(A,l){let o={};
return Object.keys(A).filter((n)=>!this._deniedAttributeNames.includes(n)).forEach((n)=>o[n]=A[n]),o}}function r(){return s}T.createNoopAttributesProcessor=r;
function h(A){return new a(A)}T.createMultiAttributesProcessor=h;
function i(A){return new e(A)}T.createAllowListAttributesProcessor=i;
function c(A){return new t(A)}T.createDenyListAttributesProcessor=c;
var s=new R}
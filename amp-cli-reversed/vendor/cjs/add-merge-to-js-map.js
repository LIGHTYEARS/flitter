// Module: add-merge-to-js-map
// Original: z9T
// Type: CJS (RT wrapper)
// Exports: addMergeToJSMap, isMergeKey, merge
// Category: util

// Module: z9T (CJS)
(T)=>{var R=x8(),a=Qa(),e="<<",t={identify:(c)=>c===e||typeof c==="symbol"&&c.description===e,default:"key",tag:"tag:yaml.org,2002:merge",test:/^<<$/,resolve:()=>Object.assign(new a.Scalar(Symbol(e)),{addToJSMap:h}),stringify:()=>e},r=(c,s)=>(t.identify(s)||R.isScalar(s)&&(!s.type||s.type===a.Scalar.PLAIN)&&t.identify(s.value))&&c?.doc.schema.tags.some((A)=>A.tag===t.tag&&A.default);
function h(c,s,A){if(A=c&&R.isAlias(A)?A.resolve(c.doc):A,R.isSeq(A))for(let l of A.items)i(c,s,l);
else if(Array.isArray(A))for(let l of A)i(c,s,l);
else i(c,s,A)}function i(c,s,A){let l=c&&R.isAlias(A)?A.resolve(c.doc):A;
if(!R.isMap(l))throw Error("Merge sources must be maps or map aliases");
let o=l.toJSON(null,c,Map);
for(let[n,p]of o)if(s instanceof Map){if(!s.has(n))s.set(n,p)}else if(s instanceof Set)s.add(n);
else if(!Object.prototype.hasOwnProperty.call(s,n))Object.defineProperty(s,n,{value:p,writable:!0,enumerable:!0,configurable:!0});
return s}T.addMergeToJSMap=h,T.isMergeKey=r,T.merge=t}
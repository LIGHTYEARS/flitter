// Module: node-base
// Original: W9T
// Type: CJS (RT wrapper)
// Exports: NodeBase
// Category: util

// Module: W9T (CJS)
(T)=>{var R=jDT(),a=x8(),e=ym();
class t{constructor(r){Object.defineProperty(this,a.NODE_TYPE,{value:r})}clone(){let r=Object.create(Object.getPrototypeOf(this),Object.getOwnPropertyDescriptors(this));
if(this.range)r.range=this.range.slice();
return r}toJS(r,{mapAsMap:h,maxAliasCount:i,onAnchor:c,reviver:s}={}){if(!a.isDocument(r))throw TypeError("A document argument is required");
let A={anchors:new Map,doc:r,keep:!0,mapAsMap:h===!0,mapKeyWarned:!1,maxAliasCount:typeof i==="number"?i:100},l=e.toJS(this,"",A);
if(typeof c==="function")for(let{count:o,res:n}of A.anchors.values())c(n,o);
return typeof s==="function"?R.applyReviver(s,{"":l},"",l):l}}T.NodeBase=t}
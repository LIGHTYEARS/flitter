// Module: schema-2
// Original: NDT
// Type: CJS (RT wrapper)
// Exports: Schema
// Category: util

// Module: NDT (CJS)
(T)=>{var R=x8(),a=nO(),e=lO(),t=BN(),r=zPR(),h=(c,s)=>c.key<s.key?-1:c.key>s.key?1:0;
class i{constructor({compat:c,customTags:s,merge:A,resolveKnownTags:l,schema:o,sortMapEntries:n,toStringDefaults:p}){this.compat=Array.isArray(c)?r.getTags(c,"compat"):c?r.getTags(null,c):null,this.name=typeof o==="string"&&o||"core",this.knownTags=l?r.coreKnownTags:{},this.tags=r.getTags(s,this.name,A),this.toStringOptions=p??null,Object.defineProperty(this,R.MAP,{value:a.map}),Object.defineProperty(this,R.SCALAR,{value:t.string}),Object.defineProperty(this,R.SEQ,{value:e.seq}),this.sortMapEntries=typeof n==="function"?n:n===!0?h:null}clone(){let c=Object.create(i.prototype,Object.getOwnPropertyDescriptors(this));
return c.tags=this.tags.slice(),c}}T.Schema=i}
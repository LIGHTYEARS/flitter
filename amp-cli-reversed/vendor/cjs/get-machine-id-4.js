// Module: get-machine-id-4
// Original: MeR
// Type: CJS (RT wrapper)
// Exports: getMachineId
// Category: util

// Module: meR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.CompositePropagator=void 0;
var R=n0();
class a{_propagators;
_fields;
constructor(e={}){this._propagators=e.propagators??[],this._fields=Array.from(new Set(this._propagators.map((t)=>typeof t.fields==="function"?t.fields():[]).reduce((t,r)=>t.concat(r),[])))}inject(e,t,r){for(let h of this._propagators)try{h.inject(e,t,r)}catch(i){R.diag.warn(`Failed to inject with ${h.constructor.name}. Err: ${i.message}`)}}extract(e,t,r){return this._propagators.reduce((h,i)=>{try{return i.extract(h,t,r)}catch(c){R.diag.warn(`Failed to extract with ${i.constructor.name}. Err: ${c.message}`)}return h},e)}fields(){return this._fields.slice()}}T.CompositePropagator=a}
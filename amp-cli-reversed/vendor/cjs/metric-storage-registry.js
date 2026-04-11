// Module: metric-storage-registry
// Original: $tR
// Type: CJS (RT wrapper)
// Exports: MetricStorageRegistry
// Category: util

// Module: $tR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.MetricStorageRegistry=void 0;
var R=wB(),a=n0(),e=gtR();
class t{_sharedRegistry=new Map;
_perCollectorRegistry=new Map;
static create(){return new t}getStorages(r){let h=[];
for(let c of this._sharedRegistry.values())h=h.concat(c);
let i=this._perCollectorRegistry.get(r);
if(i!=null)for(let c of i.values())h=h.concat(c);
return h}register(r){this._registerStorage(r,this._sharedRegistry)}registerForCollector(r,h){let i=this._perCollectorRegistry.get(r);
if(i==null)i=new Map,this._perCollectorRegistry.set(r,i);
this._registerStorage(h,i)}findOrUpdateCompatibleStorage(r){let h=this._sharedRegistry.get(r.name);
if(h===void 0)return null;
return this._findOrUpdateCompatibleStorage(r,h)}findOrUpdateCompatibleCollectorStorage(r,h){let i=this._perCollectorRegistry.get(r);
if(i===void 0)return null;
let c=i.get(h.name);
if(c===void 0)return null;
return this._findOrUpdateCompatibleStorage(h,c)}_registerStorage(r,h){let i=r.getInstrumentDescriptor(),c=h.get(i.name);
if(c===void 0){h.set(i.name,[r]);
return}c.push(r)}_findOrUpdateCompatibleStorage(r,h){let i=null;
for(let c of h){let s=c.getInstrumentDescriptor();
if((0,R.isDescriptorCompatibleWith)(s,r)){if(s.description!==r.description){if(r.description.length>s.description.length)c.updateDescription(r.description);
a.diag.warn("A view or instrument with the name ",r.name,` has already been registered, but has a different description and is incompatible with another registered view.
`,`Details:
`,(0,e.getIncompatibilityDetails)(s,r),`The longer description will be used.
To resolve the conflict:`,(0,e.getConflictResolutionRecipe)(s,r))}i=c}else a.diag.warn("A view or instrument with the name ",r.name,` has already been registered and is incompatible with another registered view.
`,`Details:
`,(0,e.getIncompatibilityDetails)(s,r),`To resolve the conflict:
`,(0,e.getConflictResolutionRecipe)(s,r))}return i}}T.MetricStorageRegistry=t}
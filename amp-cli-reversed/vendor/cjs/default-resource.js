// Module: default-resource
// Original: N$T
// Type: CJS (RT wrapper)
// Exports: defaultResource, emptyResource, resourceFromAttributes, resourceFromDetectedResource
// Category: util

// Module: N$T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.defaultResource=T.emptyResource=T.resourceFromDetectedResource=T.resourceFromAttributes=void 0;
var R=n0(),a=$9(),e=em(),t=B$T(),r=deR();
class h{_rawAttributes;
_asyncAttributesPending=!1;
_schemaUrl;
_memoizedAttributes;
static FromAttributeList(p,_){let m=new h({},_);
return m._rawAttributes=l(p),m._asyncAttributesPending=p.filter(([b,y])=>(0,r.isPromiseLike)(y)).length>0,m}constructor(p,_){let m=p.attributes??{};
this._rawAttributes=Object.entries(m).map(([b,y])=>{if((0,r.isPromiseLike)(y))this._asyncAttributesPending=!0;
return[b,y]}),this._rawAttributes=l(this._rawAttributes),this._schemaUrl=o(_?.schemaUrl)}get asyncAttributesPending(){return this._asyncAttributesPending}async waitForAsyncAttributes(){if(!this.asyncAttributesPending)return;
for(let p=0;
p<this._rawAttributes.length;
p++){let[_,m]=this._rawAttributes[p];
this._rawAttributes[p]=[_,(0,r.isPromiseLike)(m)?await m:m]}this._asyncAttributesPending=!1}get attributes(){if(this.asyncAttributesPending)R.diag.error("Accessing resource attributes before async attributes settled");
if(this._memoizedAttributes)return this._memoizedAttributes;
let p={};
for(let[_,m]of this._rawAttributes){if((0,r.isPromiseLike)(m)){R.diag.debug(`Unsettled resource attribute ${_} skipped`);continue}if(m!=null)p[_]??=m}if(!this._asyncAttributesPending)this._memoizedAttributes=p;return p}getRawAttributes(){return this._rawAttributes}get schemaUrl(){return this._schemaUrl}merge(p){if(p==null)return this;let _=n(this,p),m=_?{schemaUrl:_}:void 0;return h.FromAttributeList([...p.getRawAttributes(),...this.getRawAttributes()],m)}}function i(p,_){return h.FromAttributeList(Object.entries(p),_)}T.resourceFromAttributes=i;function c(p,_){return new h(p,_)}T.resourceFromDetectedResource=c;function s(){return i({})}T.emptyResource=s;function A(){return i({[e.ATTR_SERVICE_NAME]:(0,t.defaultServiceName)(),[e.ATTR_TELEMETRY_SDK_LANGUAGE]:a.SDK_INFO[e.ATTR_TELEMETRY_SDK_LANGUAGE],[e.ATTR_TELEMETRY_SDK_NAME]:a.SDK_INFO[e.ATTR_TELEMETRY_SDK_NAME],[e.ATTR_TELEMETRY_SDK_VERSION]:a.SDK_INFO[e.ATTR_TELEMETRY_SDK_VERSION]})}T.defaultResource=A;function l(p){return p.map(([_,m])=>{if((0,r.isPromiseLike)(m))return[_,m.catch((b)=>{R.diag.debug("promise rejection for resource attribute: %s - %s",_,b);return})];return[_,m]})}function o(p){if(typeof p==="string"||p===void 0)return p;R.diag.warn("Schema URL must be string or undefined, got %s. Schema URL will be ignored.",p);return}function n(p,_){let m=p?.schemaUrl,b=_?.schemaUrl,y=m===void 0||m==="",u=b===void 0||b==="";if(y)return b;if(u)return m;if(m===b)return m;R.diag.warn('Schema URL merge conflict: old resource has "%s", updating resource has "%s". Resulting resource will have undefined Schema URL.',m,b);return}}
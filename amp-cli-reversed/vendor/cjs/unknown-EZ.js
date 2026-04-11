// Module: unknown-EZ
// Original: EZ
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: EZ (CJS)
(T,R)=>{R.exports=r;
var a=hm();
((r.prototype=Object.create(a.prototype)).constructor=r).className="MapField";
var e=Ax(),t=Fe();
function r(h,i,c,s,A,l){if(a.call(this,h,i,s,void 0,void 0,A,l),!t.isString(c))throw TypeError("keyType must be a string");
this.keyType=c,this.resolvedKeyType=null,this.map=!0}r.fromJSON=function(h,i){return new r(h,i.id,i.keyType,i.type,i.options,i.comment)},r.prototype.toJSON=function(h){var i=h?Boolean(h.keepComments):!1;
return t.toObject(["keyType",this.keyType,"type",this.type,"id",this.id,"extend",this.extend,"options",this.options,"comment",i?this.comment:void 0])},r.prototype.resolve=function(){if(this.resolved)return this;
if(e.mapKey[this.keyType]===void 0)throw Error("invalid key type: "+this.keyType);
return a.prototype.resolve.call(this)},r.d=function(h,i,c){if(typeof c==="function")c=t.decorateType(c).name;
else if(c&&typeof c==="object")c=t.decorateEnum(c).name;
return function(s,A){t.decorateType(s.constructor).add(new r(A,h,i,c))}}}
// Module: unknown-Gs
// Original: Gs
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: Gs (CJS)
(T,R)=>{R.exports=r;
var a=im();
((r.prototype=Object.create(a.prototype)).constructor=r).className="Enum";
var e=CS(),t=Fe();
function r(h,i,c,s,A,l){if(a.call(this,h,c),i&&typeof i!=="object")throw TypeError("values must be an object");
if(this.valuesById={},this.values=Object.create(this.valuesById),this.comment=s,this.comments=A||{},this.valuesOptions=l,this._valuesFeatures={},this.reserved=void 0,i){for(var o=Object.keys(i),n=0;
n<o.length;
++n)if(typeof i[o[n]]==="number")this.valuesById[this.values[o[n]]=i[o[n]]]=o[n]}}r.prototype._resolveFeatures=function(h){return h=this._edition||h,a.prototype._resolveFeatures.call(this,h),Object.keys(this.values).forEach((i)=>{var c=Object.assign({},this._features);
this._valuesFeatures[i]=Object.assign(c,this.valuesOptions&&this.valuesOptions[i]&&this.valuesOptions[i].features)}),this},r.fromJSON=function(h,i){var c=new r(h,i.values,i.options,i.comment,i.comments);
if(c.reserved=i.reserved,i.edition)c._edition=i.edition;
return c._defaultEdition="proto3",c},r.prototype.toJSON=function(h){var i=h?Boolean(h.keepComments):!1;
return t.toObject(["edition",this._editionToJSON(),"options",this.options,"valuesOptions",this.valuesOptions,"values",this.values,"reserved",this.reserved&&this.reserved.length?this.reserved:void 0,"comment",i?this.comment:void 0,"comments",i?this.comments:void 0])},r.prototype.add=function(h,i,c,s){if(!t.isString(h))throw TypeError("name must be a string");
if(!t.isInteger(i))throw TypeError("id must be an integer");
if(this.values[h]!==void 0)throw Error("duplicate name '"+h+"' in "+this);
if(this.isReservedId(i))throw Error("id "+i+" is reserved in "+this);
if(this.isReservedName(h))throw Error("name '"+h+"' is reserved in "+this);
if(this.valuesById[i]!==void 0){if(!(this.options&&this.options.allow_alias))throw Error("duplicate id "+i+" in "+this);
this.values[h]=i}else this.valuesById[this.values[h]=i]=h;
if(s){if(this.valuesOptions===void 0)this.valuesOptions={};
this.valuesOptions[h]=s||null}return this.comments[h]=c||null,this},r.prototype.remove=function(h){if(!t.isString(h))throw TypeError("name must be a string");
var i=this.values[h];
if(i==null)throw Error("name '"+h+"' does not exist in "+this);
if(delete this.valuesById[i],delete this.values[h],delete this.comments[h],this.valuesOptions)delete this.valuesOptions[h];
return this},r.prototype.isReservedId=function(h){return e.isReservedId(this.reserved,h)},r.prototype.isReservedName=function(h){return e.isReservedName(this.reserved,h)}}
// Module: unknown-im
// Original: im
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: im (CJS)
(T,R)=>{R.exports=c,c.className="ReflectionObject";
var a=px(),e=Fe(),t,r={enum_type:"OPEN",field_presence:"EXPLICIT",json_format:"ALLOW",message_encoding:"LENGTH_PREFIXED",repeated_field_encoding:"PACKED",utf8_validation:"VERIFY"},h={enum_type:"CLOSED",field_presence:"EXPLICIT",json_format:"LEGACY_BEST_EFFORT",message_encoding:"LENGTH_PREFIXED",repeated_field_encoding:"EXPANDED",utf8_validation:"NONE"},i={enum_type:"OPEN",field_presence:"IMPLICIT",json_format:"ALLOW",message_encoding:"LENGTH_PREFIXED",repeated_field_encoding:"PACKED",utf8_validation:"VERIFY"};
function c(s,A){if(!e.isString(s))throw TypeError("name must be a string");
if(A&&!e.isObject(A))throw TypeError("options must be an object");
this.options=A,this.parsedOptions=null,this.name=s,this._edition=null,this._defaultEdition="proto2",this._features={},this._featuresResolved=!1,this.parent=null,this.resolved=!1,this.comment=null,this.filename=null}Object.defineProperties(c.prototype,{root:{get:function(){var s=this;
while(s.parent!==null)s=s.parent;
return s}},fullName:{get:function(){var s=[this.name],A=this.parent;
while(A)s.unshift(A.name),A=A.parent;
return s.join(".")}}}),c.prototype.toJSON=function(){throw Error()},c.prototype.onAdd=function(s){if(this.parent&&this.parent!==s)this.parent.remove(this);
this.parent=s,this.resolved=!1;
var A=s.root;
if(A instanceof t)A._handleAdd(this)},c.prototype.onRemove=function(s){var A=s.root;
if(A instanceof t)A._handleRemove(this);
this.parent=null,this.resolved=!1},c.prototype.resolve=function(){if(this.resolved)return this;
if(this.root instanceof t)this.resolved=!0;
return this},c.prototype._resolveFeaturesRecursive=function(s){return this._resolveFeatures(this._edition||s)},c.prototype._resolveFeatures=function(s){if(this._featuresResolved)return;
var A={};
if(!s)throw Error("Unknown edition for "+this.fullName);
var l=Object.assign(this.options?Object.assign({},this.options.features):{},this._inferLegacyProtoFeatures(s));
if(this._edition){if(s==="proto2")A=Object.assign({},h);
else if(s==="proto3")A=Object.assign({},i);
else if(s==="2023")A=Object.assign({},r);
else throw Error("Unknown edition: "+s);
this._features=Object.assign(A,l||{}),this._featuresResolved=!0;
return}if(this.partOf instanceof a){var o=Object.assign({},this.partOf._features);
this._features=Object.assign(o,l||{})}else if(this.declaringField);
else if(this.parent){var n=Object.assign({},this.parent._features);
this._features=Object.assign(n,l||{})}else throw Error("Unable to find a parent for "+this.fullName);
if(this.extensionField)this.extensionField._features=this._features;
this._featuresResolved=!0},c.prototype._inferLegacyProtoFeatures=function(){return{}},c.prototype.getOption=function(s){if(this.options)return this.options[s];
return},c.prototype.setOption=function(s,A,l){if(!this.options)this.options={};
if(/^features\./.test(s))e.setProperty(this.options,s,A,l);
else if(!l||this.options[s]===void 0){if(this.getOption(s)!==A)this.resolved=!1;
this.options[s]=A}return this},c.prototype.setParsedOption=function(s,A,l){if(!this.parsedOptions)this.parsedOptions=[];
var o=this.parsedOptions;
if(l){var n=o.find(function(m){return Object.prototype.hasOwnProperty.call(m,s)});
if(n){var p=n[s];
e.setProperty(p,l,A)}else n={},n[s]=e.setProperty({},l,A),o.push(n)}else{var _={};
_[s]=A,o.push(_)}return this},c.prototype.setOptions=function(s,A){if(s)for(var l=Object.keys(s),o=0;
o<l.length;
++o)this.setOption(l[o],s[l[o]],A);
return this},c.prototype.toString=function(){var s=this.constructor.className,A=this.fullName;
if(A.length)return s+" "+A;
return s},c.prototype._editionToJSON=function(){if(!this._edition||this._edition==="proto3")return;
return this._edition},c._configure=function(s){t=s}}
// Module: leaf-load-balancer
// Original: WZ
// Type: CJS (RT wrapper)
// Exports: LeafLoadBalancer, PickFirstLoadBalancer, PickFirstLoadBalancingConfig, setup, shuffled
// Category: util

// Module: wZ (CJS)
(T,R)=>{R.exports=A;
var a=CS();
((A.prototype=Object.create(a.prototype)).constructor=A).className="Root";
var e=hm(),t=Gs(),r=px(),h=Fe(),i,c,s;
function A(p){a.call(this,"",p),this.deferred=[],this.files=[],this._edition="proto2",this._fullyQualifiedObjects={}}A.fromJSON=function(p,_){if(!_)_=new A;
if(p.options)_.setOptions(p.options);
return _.addJSON(p.nested).resolveAll()},A.prototype.resolvePath=h.path.resolve,A.prototype.fetch=h.fetch;
function l(){}A.prototype.load=function p(_,m,b){if(typeof m==="function")b=m,m=void 0;
var y=this;
if(!b)return h.asPromise(p,y,_,m);
var u=b===l;
function P(S,O){if(!b)return;
if(u)throw S;
if(O)O.resolveAll();
var j=b;
b=null,j(S,O)}function k(S){var O=S.lastIndexOf("google/protobuf/");
if(O>-1){var j=S.substring(O);
if(j in s)return j}return null}function x(S,O){try{if(h.isString(O)&&O.charAt(0)==="{")O=JSON.parse(O);
if(!h.isString(O))y.setOptions(O.options).addJSON(O.nested);
else{c.filename=S;
var j=c(O,y,m),d,C=0;
if(j.imports){for(;
C<j.imports.length;
++C)if(d=k(j.imports[C])||y.resolvePath(S,j.imports[C]))f(d)}if(j.weakImports){for(C=0;
C<j.weakImports.length;
++C)if(d=k(j.weakImports[C])||y.resolvePath(S,j.weakImports[C]))f(d,!0)}}}catch(L){P(L)}if(!u&&!v)P(null,y)}function f(S,O){if(S=k(S)||S,y.files.indexOf(S)>-1)return;
if(y.files.push(S),S in s){if(u)x(S,s[S]);
else++v,setTimeout(function(){--v,x(S,s[S])});
return}if(u){var j;
try{j=h.fs.readFileSync(S).toString("utf8")}catch(d){if(!O)P(d);
return}x(S,j)}else++v,y.fetch(S,function(d,C){if(--v,!b)return;
if(d){if(!O)P(d);
else if(!v)P(null,y);
return}x(S,C)})}var v=0;
if(h.isString(_))_=[_];
for(var g=0,I;
g<_.length;
++g)if(I=y.resolvePath("",_[g]))f(I);
if(u)return y.resolveAll(),y;
if(!v)P(null,y);
return y},A.prototype.loadSync=function(p,_){if(!h.isNode)throw Error("not supported");
return this.load(p,_,l)},A.prototype.resolveAll=function(){if(!this._needsRecursiveResolve)return this;
if(this.deferred.length)throw Error("unresolvable extensions: "+this.deferred.map(function(p){return"'extend "+p.extend+"' in "+p.parent.fullName}).join(", "));
return a.prototype.resolveAll.call(this)};
var o=/^[A-Z]/;
function n(p,_){var m=_.parent.lookup(_.extend);
if(m){var b=new e(_.fullName,_.id,_.type,_.rule,void 0,_.options);
if(m.get(b.name))return!0;
return b.declaringField=_,_.extensionField=b,m.add(b),!0}return!1}A.prototype._handleAdd=function(p){if(p instanceof e){if(p.extend!==void 0&&!p.extensionField){if(!n(this,p))this.deferred.push(p)}}else if(p instanceof t){if(o.test(p.name))p.parent[p.name]=p.values}else if(!(p instanceof r)){if(p instanceof i)for(var _=0;
_<this.deferred.length;
)if(n(this,this.deferred[_]))this.deferred.splice(_,1);
else++_;
for(var m=0;
m<p.nestedArray.length;
++m)this._handleAdd(p._nestedArray[m]);
if(o.test(p.name))p.parent[p.name]=p}if(p instanceof i||p instanceof t||p instanceof e)this._fullyQualifiedObjects[p.fullName]=p},A.prototype._handleRemove=function(p){if(p instanceof e){if(p.extend!==void 0)if(p.extensionField)p.extensionField.parent.remove(p.extensionField),p.extensionField=null;
else{var _=this.deferred.indexOf(p);
if(_>-1)this.deferred.splice(_,1)}}else if(p instanceof t){if(o.test(p.name))delete p.parent[p.name]}else if(p instanceof a){for(var m=0;
m<p.nestedArray.length;
++m)this._handleRemove(p._nestedArray[m]);
if(o.test(p.name))delete p.parent[p.name]}delete this._fullyQualifiedObjects[p.fullName]},A._configure=function(p,_,m){i=p,c=_,s=m}}
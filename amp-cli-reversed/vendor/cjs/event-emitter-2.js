// Module: event-emitter-2
// Original: orR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: orR (CJS)
(T,R)=>{R.exports=e;
var a=$n();
(e.prototype=Object.create(a.EventEmitter.prototype)).constructor=e;
function e(t,r,h){if(typeof t!=="function")throw TypeError("rpcImpl must be a function");
a.EventEmitter.call(this),this.rpcImpl=t,this.requestDelimited=Boolean(r),this.responseDelimited=Boolean(h)}e.prototype.rpcCall=function t(r,h,i,c,s){if(!c)throw TypeError("request must be specified");
var A=this;
if(!s)return a.asPromise(t,A,r,h,i,c);
if(!A.rpcImpl){setTimeout(function(){s(Error("already ended"))},0);
return}try{return A.rpcImpl(r,h[A.requestDelimited?"encodeDelimited":"encode"](c).finish(),function(l,o){if(l)return A.emit("error",l,r),s(l);
if(o===null){A.end(!0);
return}if(!(o instanceof i))try{o=i[A.responseDelimited?"decodeDelimited":"decode"](o)}catch(n){return A.emit("error",n,r),s(n)}return A.emit("data",o,r),s(null,o)})}catch(l){A.emit("error",l,r),setTimeout(function(){s(l)},0);
return}},e.prototype.end=function(t){if(this.rpcImpl){if(!t)this.rpcImpl(null,null,null);
this.rpcImpl=null,this.emit("end").off()}return this}}
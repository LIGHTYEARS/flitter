// Module: unknown-mpR
// Original: mpR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: mpR (CJS)
(T,R)=>{var{kForOnEventAttribute:a,kListener:e}=GA(),t=Symbol("kCode"),r=Symbol("kData"),h=Symbol("kError"),i=Symbol("kMessage"),c=Symbol("kReason"),s=Symbol("kTarget"),A=Symbol("kType"),l=Symbol("kWasClean");
class o{constructor(y){this[s]=null,this[A]=y}get target(){return this[s]}get type(){return this[A]}}Object.defineProperty(o.prototype,"target",{enumerable:!0}),Object.defineProperty(o.prototype,"type",{enumerable:!0});
class n extends o{constructor(y,u={}){super(y);
this[t]=u.code===void 0?0:u.code,this[c]=u.reason===void 0?"":u.reason,this[l]=u.wasClean===void 0?!1:u.wasClean}get code(){return this[t]}get reason(){return this[c]}get wasClean(){return this[l]}}Object.defineProperty(n.prototype,"code",{enumerable:!0}),Object.defineProperty(n.prototype,"reason",{enumerable:!0}),Object.defineProperty(n.prototype,"wasClean",{enumerable:!0});
class p extends o{constructor(y,u={}){super(y);
this[h]=u.error===void 0?null:u.error,this[i]=u.message===void 0?"":u.message}get error(){return this[h]}get message(){return this[i]}}Object.defineProperty(p.prototype,"error",{enumerable:!0}),Object.defineProperty(p.prototype,"message",{enumerable:!0});
class _ extends o{constructor(y,u={}){super(y);
this[r]=u.data===void 0?null:u.data}get data(){return this[r]}}Object.defineProperty(_.prototype,"data",{enumerable:!0});
var m={addEventListener(y,u,P={}){for(let x of this.listeners(y))if(!P[a]&&x[e]===u&&!x[a])return;
let k;
if(y==="message")k=function(x,f){let v=new _("message",{data:f?x:x.toString()});
v[s]=this,b(u,this,v)};
else if(y==="close")k=function(x,f){let v=new n("close",{code:x,reason:f.toString(),wasClean:this._closeFrameReceived&&this._closeFrameSent});
v[s]=this,b(u,this,v)};
else if(y==="error")k=function(x){let f=new p("error",{error:x,message:x.message});
f[s]=this,b(u,this,f)};
else if(y==="open")k=function(){let x=new o("open");
x[s]=this,b(u,this,x)};
else return;
if(k[a]=!!P[a],k[e]=u,P.once)this.once(y,k);
else this.on(y,k)},removeEventListener(y,u){for(let P of this.listeners(y))if(P[e]===u&&!P[a]){this.removeListener(y,P);
break}}};
R.exports={CloseEvent:n,ErrorEvent:p,Event:o,EventTarget:m,MessageEvent:_};
function b(y,u,P){if(typeof y==="object"&&y.handleEvent)y.handleEvent.call(y,P);
else y.call(u,P)}}
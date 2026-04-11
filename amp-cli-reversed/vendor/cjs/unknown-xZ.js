// Module: unknown-xZ
// Original: xZ
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: xZ (CJS)
(T,R)=>{R.exports=A;
var a=$n(),e,t=a.LongBits,r=a.base64,h=a.utf8;
function i(y,u,P){this.fn=y,this.len=u,this.next=void 0,this.val=P}function c(){}function s(y){this.head=y.head,this.tail=y.tail,this.len=y.len,this.next=y.states}function A(){this.len=0,this.head=new i(c,0,0),this.tail=this.head,this.states=null}var l=function(){return a.Buffer?function(){return(A.create=function(){return new e})()}:function(){return new A}};
if(A.create=l(),A.alloc=function(y){return new a.Array(y)},a.Array!==Array)A.alloc=a.pool(A.alloc,a.Array.prototype.subarray);
A.prototype._push=function(y,u,P){return this.tail=this.tail.next=new i(y,u,P),this.len+=u,this};
function o(y,u,P){u[P]=y&255}function n(y,u,P){while(y>127)u[P++]=y&127|128,y>>>=7;
u[P]=y}function p(y,u){this.len=y,this.next=void 0,this.val=u}p.prototype=Object.create(i.prototype),p.prototype.fn=n,A.prototype.uint32=function(y){return this.len+=(this.tail=this.tail.next=new p((y=y>>>0)<128?1:y<16384?2:y<2097152?3:y<268435456?4:5,y)).len,this},A.prototype.int32=function(y){return y<0?this._push(_,10,t.fromNumber(y)):this.uint32(y)},A.prototype.sint32=function(y){return this.uint32((y<<1^y>>31)>>>0)};
function _(y,u,P){while(y.hi)u[P++]=y.lo&127|128,y.lo=(y.lo>>>7|y.hi<<25)>>>0,y.hi>>>=7;
while(y.lo>127)u[P++]=y.lo&127|128,y.lo=y.lo>>>7;
u[P++]=y.lo}A.prototype.uint64=function(y){var u=t.from(y);
return this._push(_,u.length(),u)},A.prototype.int64=A.prototype.uint64,A.prototype.sint64=function(y){var u=t.from(y).zzEncode();
return this._push(_,u.length(),u)},A.prototype.bool=function(y){return this._push(o,1,y?1:0)};
function m(y,u,P){u[P]=y&255,u[P+1]=y>>>8&255,u[P+2]=y>>>16&255,u[P+3]=y>>>24}A.prototype.fixed32=function(y){return this._push(m,4,y>>>0)},A.prototype.sfixed32=A.prototype.fixed32,A.prototype.fixed64=function(y){var u=t.from(y);
return this._push(m,4,u.lo)._push(m,4,u.hi)},A.prototype.sfixed64=A.prototype.fixed64,A.prototype.float=function(y){return this._push(a.float.writeFloatLE,4,y)},A.prototype.double=function(y){return this._push(a.float.writeDoubleLE,8,y)};
var b=a.Array.prototype.set?function(y,u,P){u.set(y,P)}:function(y,u,P){for(var k=0;
k<y.length;
++k)u[P+k]=y[k]};
A.prototype.bytes=function(y){var u=y.length>>>0;
if(!u)return this._push(o,1,0);
if(a.isString(y)){var P=A.alloc(u=r.length(y));
r.decode(y,P,0),y=P}return this.uint32(u)._push(b,u,y)},A.prototype.string=function(y){var u=h.length(y);
return u?this.uint32(u)._push(h.write,u,y):this._push(o,1,0)},A.prototype.fork=function(){return this.states=new s(this),this.head=this.tail=new i(c,0,0),this.len=0,this},A.prototype.reset=function(){if(this.states)this.head=this.states.head,this.tail=this.states.tail,this.len=this.states.len,this.states=this.states.next;
else this.head=this.tail=new i(c,0,0),this.len=0;
return this},A.prototype.ldelim=function(){var y=this.head,u=this.tail,P=this.len;
if(this.reset().uint32(P),P)this.tail.next=y.next,this.tail=u,this.len+=P;
return this},A.prototype.finish=function(){var y=this.head.next,u=this.constructor.alloc(this.len),P=0;
while(y)y.fn(y.val,u,P),P+=y.len,y=y.next;
return u},A._configure=function(y){e=y,A.create=l(),e._configure()}}
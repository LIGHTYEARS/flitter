// Module: unknown-fZ
// Original: fZ
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: fZ (CJS)
(T,R)=>{R.exports=i;
var a=$n(),e,t=a.LongBits,r=a.utf8;
function h(n,p){return RangeError("index out of range: "+n.pos+" + "+(p||1)+" > "+n.len)}function i(n){this.buf=n,this.pos=0,this.len=n.length}var c=typeof Uint8Array<"u"?function(n){if(n instanceof Uint8Array||Array.isArray(n))return new i(n);
throw Error("illegal buffer")}:function(n){if(Array.isArray(n))return new i(n);
throw Error("illegal buffer")},s=function(){return a.Buffer?function(n){return(i.create=function(p){return a.Buffer.isBuffer(p)?new e(p):c(p)})(n)}:c};
i.create=s(),i.prototype._slice=a.Array.prototype.subarray||a.Array.prototype.slice,i.prototype.uint32=function(){var n=4294967295;
return function(){if(n=(this.buf[this.pos]&127)>>>0,this.buf[this.pos++]<128)return n;
if(n=(n|(this.buf[this.pos]&127)<<7)>>>0,this.buf[this.pos++]<128)return n;
if(n=(n|(this.buf[this.pos]&127)<<14)>>>0,this.buf[this.pos++]<128)return n;
if(n=(n|(this.buf[this.pos]&127)<<21)>>>0,this.buf[this.pos++]<128)return n;
if(n=(n|(this.buf[this.pos]&15)<<28)>>>0,this.buf[this.pos++]<128)return n;
if((this.pos+=5)>this.len)throw this.pos=this.len,h(this,10);
return n}}(),i.prototype.int32=function(){return this.uint32()|0},i.prototype.sint32=function(){var n=this.uint32();
return n>>>1^-(n&1)|0};
function A(){var n=new t(0,0),p=0;
if(this.len-this.pos>4){for(;
p<4;
++p)if(n.lo=(n.lo|(this.buf[this.pos]&127)<<p*7)>>>0,this.buf[this.pos++]<128)return n;
if(n.lo=(n.lo|(this.buf[this.pos]&127)<<28)>>>0,n.hi=(n.hi|(this.buf[this.pos]&127)>>4)>>>0,this.buf[this.pos++]<128)return n;
p=0}else{for(;
p<3;
++p){if(this.pos>=this.len)throw h(this);
if(n.lo=(n.lo|(this.buf[this.pos]&127)<<p*7)>>>0,this.buf[this.pos++]<128)return n}return n.lo=(n.lo|(this.buf[this.pos++]&127)<<p*7)>>>0,n}if(this.len-this.pos>4){for(;
p<5;
++p)if(n.hi=(n.hi|(this.buf[this.pos]&127)<<p*7+3)>>>0,this.buf[this.pos++]<128)return n}else for(;
p<5;
++p){if(this.pos>=this.len)throw h(this);
if(n.hi=(n.hi|(this.buf[this.pos]&127)<<p*7+3)>>>0,this.buf[this.pos++]<128)return n}throw Error("invalid varint encoding")}i.prototype.bool=function(){return this.uint32()!==0};
function l(n,p){return(n[p-4]|n[p-3]<<8|n[p-2]<<16|n[p-1]<<24)>>>0}i.prototype.fixed32=function(){if(this.pos+4>this.len)throw h(this,4);
return l(this.buf,this.pos+=4)},i.prototype.sfixed32=function(){if(this.pos+4>this.len)throw h(this,4);
return l(this.buf,this.pos+=4)|0};
function o(){if(this.pos+8>this.len)throw h(this,8);
return new t(l(this.buf,this.pos+=4),l(this.buf,this.pos+=4))}i.prototype.float=function(){if(this.pos+4>this.len)throw h(this,4);
var n=a.float.readFloatLE(this.buf,this.pos);
return this.pos+=4,n},i.prototype.double=function(){if(this.pos+8>this.len)throw h(this,4);
var n=a.float.readDoubleLE(this.buf,this.pos);
return this.pos+=8,n},i.prototype.bytes=function(){var n=this.uint32(),p=this.pos,_=this.pos+n;
if(_>this.len)throw h(this,n);
if(this.pos+=n,Array.isArray(this.buf))return this.buf.slice(p,_);
if(p===_){var m=a.Buffer;
return m?m.alloc(0):new this.buf.constructor(0)}return this._slice.call(this.buf,p,_)},i.prototype.string=function(){var n=this.bytes();
return r.read(n,0,n.length)},i.prototype.skip=function(n){if(typeof n==="number"){if(this.pos+n>this.len)throw h(this,n);
this.pos+=n}else do if(this.pos>=this.len)throw h(this);
while(this.buf[this.pos++]&128);
return this},i.prototype.skipType=function(n){switch(n){case 0:this.skip();
break;
case 1:this.skip(8);
break;
case 2:this.skip(this.uint32());
break;
case 3:while((n=this.uint32()&7)!==4)this.skipType(n);
break;
case 5:this.skip(4);
break;
default:throw Error("invalid wire type "+n+" at offset "+this.pos)}return this},i._configure=function(n){e=n,i.create=s(),e._configure();
var p=a.Long?"toLong":"toNumber";
a.merge(i.prototype,{int64:function(){return A.call(this)[p](!1)},uint64:function(){return A.call(this)[p](!0)},sint64:function(){return A.call(this).zzDecode()[p](!1)},fixed64:function(){return o.call(this)[p](!0)},sfixed64:function(){return o.call(this)[p](!1)}})}}
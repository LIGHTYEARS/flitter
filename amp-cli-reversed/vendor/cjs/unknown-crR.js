// Module: unknown-crR
// Original: crR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: crR (CJS)
(T,R)=>{R.exports=t;
var a=xZ();
(t.prototype=Object.create(a.prototype)).constructor=t;
var e=$n();
function t(){a.call(this)}t._configure=function(){t.alloc=e._Buffer_allocUnsafe,t.writeBytesBuffer=e.Buffer&&e.Buffer.prototype instanceof Uint8Array&&e.Buffer.prototype.set.name==="set"?function(h,i,c){i.set(h,c)}:function(h,i,c){if(h.copy)h.copy(i,c,0,h.length);
else for(var s=0;
s<h.length;
)i[c++]=h[s++]}},t.prototype.bytes=function(h){if(e.isString(h))h=e._Buffer_from(h,"base64");
var i=h.length>>>0;
if(this.uint32(i),i)this._push(t.writeBytesBuffer,i,h);
return this};
function r(h,i,c){if(h.length<40)e.utf8.write(h,i,c);
else if(i.utf8Write)i.utf8Write(h,c);
else i.write(h,c)}t.prototype.string=function(h){var i=e.Buffer.byteLength(h);
if(this.uint32(i),i)this._push(r,i,h);
return this},t._configure()}
// Module: websocket-3
// Original: WCT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: WCT (CJS)
(T,R)=>{var{Duplex:a}=qT("stream"),{randomFillSync:e}=qT("crypto"),t=eO(),{EMPTY_BUFFER:r,kWebSocket:h,NOOP:i}=GA(),{isBlob:c,isValidStatusCode:s}=tO(),{mask:A,toBuffer:l}=pN(),o=Symbol("kByteLength"),n=Buffer.alloc(4),p,_=8192,m=0,b=1,y=2;
class u{constructor(x,f,v){if(this._extensions=f||{},v)this._generateMask=v,this._maskBuffer=Buffer.alloc(4);
this._socket=x,this._firstFragment=!0,this._compress=!1,this._bufferedBytes=0,this._queue=[],this._state=m,this.onerror=i,this[h]=void 0}static frame(x,f){let v,g=!1,I=2,S=!1;
if(f.mask){if(v=f.maskBuffer||n,f.generateMask)f.generateMask(v);
else{if(_===8192){if(p===void 0)p=Buffer.alloc(8192);
e(p,0,8192),_=0}v[0]=p[_++],v[1]=p[_++],v[2]=p[_++],v[3]=p[_++]}S=(v[0]|v[1]|v[2]|v[3])===0,I=6}let O;
if(typeof x==="string")if((!f.mask||S)&&f[o]!==void 0)O=f[o];
else x=Buffer.from(x),O=x.length;
else O=x.length,g=f.mask&&f.readOnly&&!S;
let j=O;
if(O>=65536)I+=8,j=127;
else if(O>125)I+=2,j=126;
let d=Buffer.allocUnsafe(g?O+I:I);
if(d[0]=f.fin?f.opcode|128:f.opcode,f.rsv1)d[0]|=64;
if(d[1]=j,j===126)d.writeUInt16BE(O,2);
else if(j===127)d[2]=d[3]=0,d.writeUIntBE(O,4,6);
if(!f.mask)return[d,x];
if(d[1]|=128,d[I-4]=v[0],d[I-3]=v[1],d[I-2]=v[2],d[I-1]=v[3],S)return[d,x];
if(g)return A(x,v,d,I,O),[d];
return A(x,v,x,0,O),[d,x]}close(x,f,v,g){let I;
if(x===void 0)I=r;
else if(typeof x!=="number"||!s(x))throw TypeError("First argument must be a valid error code number");
else if(f===void 0||!f.length)I=Buffer.allocUnsafe(2),I.writeUInt16BE(x,0);
else{let O=Buffer.byteLength(f);
if(O>123)throw RangeError("The message must not be greater than 123 bytes");
if(I=Buffer.allocUnsafe(2+O),I.writeUInt16BE(x,0),typeof f==="string")I.write(f,2);
else I.set(f,2)}let S={[o]:I.length,fin:!0,generateMask:this._generateMask,mask:v,maskBuffer:this._maskBuffer,opcode:8,readOnly:!1,rsv1:!1};
if(this._state!==m)this.enqueue([this.dispatch,I,!1,S,g]);
else this.sendFrame(u.frame(I,S),g)}ping(x,f,v){let g,I;
if(typeof x==="string")g=Buffer.byteLength(x),I=!1;
else if(c(x))g=x.size,I=!1;
else x=l(x),g=x.length,I=l.readOnly;
if(g>125)throw RangeError("The data size must not be greater than 125 bytes");
let S={[o]:g,fin:!0,generateMask:this._generateMask,mask:f,maskBuffer:this._maskBuffer,opcode:9,readOnly:I,rsv1:!1};
if(c(x))if(this._state!==m)this.enqueue([this.getBlobData,x,!1,S,v]);
else this.getBlobData(x,!1,S,v);
else if(this._state!==m)this.enqueue([this.dispatch,x,!1,S,v]);
else this.sendFrame(u.frame(x,S),v)}pong(x,f,v){let g,I;
if(typeof x==="string")g=Buffer.byteLength(x),I=!1;
else if(c(x))g=x.size,I=!1;
else x=l(x),g=x.length,I=l.readOnly;
if(g>125)throw RangeError("The data size must not be greater than 125 bytes");
let S={[o]:g,fin:!0,generateMask:this._generateMask,mask:f,maskBuffer:this._maskBuffer,opcode:10,readOnly:I,rsv1:!1};
if(c(x))if(this._state!==m)this.enqueue([this.getBlobData,x,!1,S,v]);
else this.getBlobData(x,!1,S,v);
else if(this._state!==m)this.enqueue([this.dispatch,x,!1,S,v]);
else this.sendFrame(u.frame(x,S),v)}send(x,f,v){let g=this._extensions[t.extensionName],I=f.binary?2:1,S=f.compress,O,j;
if(typeof x==="string")O=Buffer.byteLength(x),j=!1;
else if(c(x))O=x.size,j=!1;
else x=l(x),O=x.length,j=l.readOnly;
if(this._firstFragment){if(this._firstFragment=!1,S&&g&&g.params[g._isServer?"server_no_context_takeover":"client_no_context_takeover"])S=O>=g._threshold;
this._compress=S}else S=!1,I=0;
if(f.fin)this._firstFragment=!0;
let d={[o]:O,fin:f.fin,generateMask:this._generateMask,mask:f.mask,maskBuffer:this._maskBuffer,opcode:I,readOnly:j,rsv1:S};
if(c(x))if(this._state!==m)this.enqueue([this.getBlobData,x,this._compress,d,v]);
else this.getBlobData(x,this._compress,d,v);
else if(this._state!==m)this.enqueue([this.dispatch,x,this._compress,d,v]);
else this.dispatch(x,this._compress,d,v)}getBlobData(x,f,v,g){this._bufferedBytes+=v[o],this._state=y,x.arrayBuffer().then((I)=>{if(this._socket.destroyed){let O=Error("The socket was closed while the blob was being read");
process.nextTick(P,this,O,g);
return}this._bufferedBytes-=v[o];
let S=l(I);
if(!f)this._state=m,this.sendFrame(u.frame(S,v),g),this.dequeue();
else this.dispatch(S,f,v,g)}).catch((I)=>{process.nextTick(k,this,I,g)})}dispatch(x,f,v,g){if(!f){this.sendFrame(u.frame(x,v),g);
return}let I=this._extensions[t.extensionName];
this._bufferedBytes+=v[o],this._state=b,I.compress(x,v.fin,(S,O)=>{if(this._socket.destroyed){let j=Error("The socket was closed while data was being compressed");
P(this,j,g);
return}this._bufferedBytes-=v[o],this._state=m,v.readOnly=!1,this.sendFrame(u.frame(O,v),g),this.dequeue()})}dequeue(){while(this._state===m&&this._queue.length){let x=this._queue.shift();
this._bufferedBytes-=x[3][o],Reflect.apply(x[0],this,x.slice(1))}}enqueue(x){this._bufferedBytes+=x[3][o],this._queue.push(x)}sendFrame(x,f){if(x.length===2)this._socket.cork(),this._socket.write(x[0]),this._socket.write(x[1],f),this._socket.uncork();
else this._socket.write(x[0],f)}}R.exports=u;
function P(x,f,v){if(typeof v==="function")v(f);
for(let g=0;
g<x._queue.length;
g++){let I=x._queue[g],S=I[I.length-1];
if(typeof S==="function")S(f)}}function k(x,f,v){P(x,f,v),x.onerror(f)}}
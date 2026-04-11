// Module: server-duplex-stream-impl
// Original: _hR
// Type: CJS (RT wrapper)
// Exports: ServerDuplexStreamImpl, ServerReadableStreamImpl, ServerUnaryCallImpl, ServerWritableStreamImpl, serverErrorToStatus
// Category: util

// Module: _hR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ServerDuplexStreamImpl=T.ServerWritableStreamImpl=T.ServerReadableStreamImpl=T.ServerUnaryCallImpl=void 0,T.serverErrorToStatus=r;
var R=qT("events"),a=qT("stream"),e=c8(),t=Yt();
function r(A,l){var o;
let n={code:e.Status.UNKNOWN,details:"message"in A?A.message:"Unknown Error",metadata:(o=l!==null&&l!==void 0?l:A.metadata)!==null&&o!==void 0?o:null};
if("code"in A&&typeof A.code==="number"&&Number.isInteger(A.code)){if(n.code=A.code,"details"in A&&typeof A.details==="string")n.details=A.details}return n}class h extends R.EventEmitter{constructor(A,l,o,n){super();
this.path=A,this.call=l,this.metadata=o,this.request=n,this.cancelled=!1}getPeer(){return this.call.getPeer()}sendMetadata(A){this.call.sendMetadata(A)}getDeadline(){return this.call.getDeadline()}getPath(){return this.path}getHost(){return this.call.getHost()}}T.ServerUnaryCallImpl=h;
class i extends a.Readable{constructor(A,l,o){super({objectMode:!0});
this.path=A,this.call=l,this.metadata=o,this.cancelled=!1}_read(A){this.call.startRead()}getPeer(){return this.call.getPeer()}sendMetadata(A){this.call.sendMetadata(A)}getDeadline(){return this.call.getDeadline()}getPath(){return this.path}getHost(){return this.call.getHost()}}T.ServerReadableStreamImpl=i;
class c extends a.Writable{constructor(A,l,o,n){super({objectMode:!0});
this.path=A,this.call=l,this.metadata=o,this.request=n,this.pendingStatus={code:e.Status.OK,details:"OK"},this.cancelled=!1,this.trailingMetadata=new t.Metadata,this.on("error",(p)=>{this.pendingStatus=r(p),this.end()})}getPeer(){return this.call.getPeer()}sendMetadata(A){this.call.sendMetadata(A)}getDeadline(){return this.call.getDeadline()}getPath(){return this.path}getHost(){return this.call.getHost()}_write(A,l,o){this.call.sendMessage(A,o)}_final(A){var l;
A(null),this.call.sendStatus(Object.assign(Object.assign({},this.pendingStatus),{metadata:(l=this.pendingStatus.metadata)!==null&&l!==void 0?l:this.trailingMetadata}))}end(A){if(A)this.trailingMetadata=A;
return super.end()}}T.ServerWritableStreamImpl=c;
class s extends a.Duplex{constructor(A,l,o){super({objectMode:!0});
this.path=A,this.call=l,this.metadata=o,this.pendingStatus={code:e.Status.OK,details:"OK"},this.cancelled=!1,this.trailingMetadata=new t.Metadata,this.on("error",(n)=>{this.pendingStatus=r(n),this.end()})}getPeer(){return this.call.getPeer()}sendMetadata(A){this.call.sendMetadata(A)}getDeadline(){return this.call.getDeadline()}getPath(){return this.path}getHost(){return this.call.getHost()}_read(A){this.call.startRead()}_write(A,l,o){this.call.sendMessage(A,o)}_final(A){var l;
A(null),this.call.sendStatus(Object.assign(Object.assign({},this.pendingStatus),{metadata:(l=this.pendingStatus.metadata)!==null&&l!==void 0?l:this.trailingMetadata}))}end(A){if(A)this.trailingMetadata=A;
return super.end()}}T.ServerDuplexStreamImpl=s}
// Module: client
// Original: _vT
// Type: CJS (RT wrapper)
// Exports: Client
// Category: util

// Module: _vT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.Client=void 0;
var R=zrR(),a=EvT(),e=Ic(),t=c8(),r=Yt(),h=pvT(),i=Symbol(),c=Symbol(),s=Symbol(),A=Symbol();
function l(p){return typeof p==="function"}function o(p){var _;
return((_=p.stack)===null||_===void 0?void 0:_.split(`
`).slice(1).join(`
`))||"no stack trace available"}class n{constructor(p,_,m={}){var b,y;
if(m=Object.assign({},m),this[c]=(b=m.interceptors)!==null&&b!==void 0?b:[],delete m.interceptors,this[s]=(y=m.interceptor_providers)!==null&&y!==void 0?y:[],delete m.interceptor_providers,this[c].length>0&&this[s].length>0)throw Error("Both interceptors and interceptor_providers were passed as options to the client constructor. Only one of these is allowed.");
if(this[A]=m.callInvocationTransformer,delete m.callInvocationTransformer,m.channelOverride)this[i]=m.channelOverride;
else if(m.channelFactoryOverride){let u=m.channelFactoryOverride;
delete m.channelFactoryOverride,this[i]=u(p,_,m)}else this[i]=new a.ChannelImplementation(p,_,m)}close(){this[i].close()}getChannel(){return this[i]}waitForReady(p,_){let m=(b)=>{if(b){_(Error("Failed to connect before the deadline"));
return}let y;
try{y=this[i].getConnectivityState(!0)}catch(u){_(Error("The channel has been closed"));
return}if(y===e.ConnectivityState.READY)_();
else try{this[i].watchConnectivityState(y,p,m)}catch(u){_(Error("The channel has been closed"))}};
setImmediate(m)}checkOptionalUnaryResponseArguments(p,_,m){if(l(p))return{metadata:new r.Metadata,options:{},callback:p};
else if(l(_))if(p instanceof r.Metadata)return{metadata:p,options:{},callback:_};
else return{metadata:new r.Metadata,options:p,callback:_};
else{if(!(p instanceof r.Metadata&&_ instanceof Object&&l(m)))throw Error("Incorrect arguments passed");
return{metadata:p,options:_,callback:m}}}makeUnaryRequest(p,_,m,b,y,u,P){var k,x;
let f=this.checkOptionalUnaryResponseArguments(y,u,P),v={path:p,requestStream:!1,responseStream:!1,requestSerialize:_,responseDeserialize:m},g={argument:b,metadata:f.metadata,call:new R.ClientUnaryCallImpl,channel:this[i],methodDefinition:v,callOptions:f.options,callback:f.callback};
if(this[A])g=this[A](g);
let I=g.call,S={clientInterceptors:this[c],clientInterceptorProviders:this[s],callInterceptors:(k=g.callOptions.interceptors)!==null&&k!==void 0?k:[],callInterceptorProviders:(x=g.callOptions.interceptor_providers)!==null&&x!==void 0?x:[]},O=(0,h.getInterceptingCall)(S,g.methodDefinition,g.callOptions,g.channel);
I.call=O;
let j=null,d=!1,C=Error();
return O.start(g.metadata,{onReceiveMetadata:(L)=>{I.emit("metadata",L)},onReceiveMessage(L){if(j!==null)O.cancelWithStatus(t.Status.UNIMPLEMENTED,"Too many responses received");
j=L},onReceiveStatus(L){if(d)return;
if(d=!0,L.code===t.Status.OK)if(j===null){let w=o(C);
g.callback((0,R.callErrorFromStatus)({code:t.Status.UNIMPLEMENTED,details:"No message received",metadata:L.metadata},w))}else g.callback(null,j);
else{let w=o(C);
g.callback((0,R.callErrorFromStatus)(L,w))}C=null,I.emit("status",L)}}),O.sendMessage(b),O.halfClose(),I}makeClientStreamRequest(p,_,m,b,y,u){var P,k;
let x=this.checkOptionalUnaryResponseArguments(b,y,u),f={path:p,requestStream:!0,responseStream:!1,requestSerialize:_,responseDeserialize:m},v={metadata:x.metadata,call:new R.ClientWritableStreamImpl(_),channel:this[i],methodDefinition:f,callOptions:x.options,callback:x.callback};
if(this[A])v=this[A](v);
let g=v.call,I={clientInterceptors:this[c],clientInterceptorProviders:this[s],callInterceptors:(P=v.callOptions.interceptors)!==null&&P!==void 0?P:[],callInterceptorProviders:(k=v.callOptions.interceptor_providers)!==null&&k!==void 0?k:[]},S=(0,h.getInterceptingCall)(I,v.methodDefinition,v.callOptions,v.channel);
g.call=S;
let O=null,j=!1,d=Error();
return S.start(v.metadata,{onReceiveMetadata:(C)=>{g.emit("metadata",C)},onReceiveMessage(C){if(O!==null)S.cancelWithStatus(t.Status.UNIMPLEMENTED,"Too many responses received");
O=C,S.startRead()},onReceiveStatus(C){if(j)return;
if(j=!0,C.code===t.Status.OK)if(O===null){let L=o(d);
v.callback((0,R.callErrorFromStatus)({code:t.Status.UNIMPLEMENTED,details:"No message received",metadata:C.metadata},L))}else v.callback(null,O);
else{let L=o(d);
v.callback((0,R.callErrorFromStatus)(C,L))}d=null,g.emit("status",C)}}),g}checkMetadataAndOptions(p,_){let m,b;
if(p instanceof r.Metadata)if(m=p,_)b=_;
else b={};
else{if(p)b=p;
else b={};
m=new r.Metadata}return{metadata:m,options:b}}makeServerStreamRequest(p,_,m,b,y,u){var P,k;
let x=this.checkMetadataAndOptions(y,u),f={path:p,requestStream:!1,responseStream:!0,requestSerialize:_,responseDeserialize:m},v={argument:b,metadata:x.metadata,call:new R.ClientReadableStreamImpl(m),channel:this[i],methodDefinition:f,callOptions:x.options};
if(this[A])v=this[A](v);
let g=v.call,I={clientInterceptors:this[c],clientInterceptorProviders:this[s],callInterceptors:(P=v.callOptions.interceptors)!==null&&P!==void 0?P:[],callInterceptorProviders:(k=v.callOptions.interceptor_providers)!==null&&k!==void 0?k:[]},S=(0,h.getInterceptingCall)(I,v.methodDefinition,v.callOptions,v.channel);
g.call=S;
let O=!1,j=Error();
return S.start(v.metadata,{onReceiveMetadata(d){g.emit("metadata",d)},onReceiveMessage(d){g.push(d)},onReceiveStatus(d){if(O)return;
if(O=!0,g.push(null),d.code!==t.Status.OK){let C=o(j);
g.emit("error",(0,R.callErrorFromStatus)(d,C))}j=null,g.emit("status",d)}}),S.sendMessage(b),S.halfClose(),g}makeBidiStreamRequest(p,_,m,b,y){var u,P;
let k=this.checkMetadataAndOptions(b,y),x={path:p,requestStream:!0,responseStream:!0,requestSerialize:_,responseDeserialize:m},f={metadata:k.metadata,call:new R.ClientDuplexStreamImpl(_,m),channel:this[i],methodDefinition:x,callOptions:k.options};
if(this[A])f=this[A](f);
let v=f.call,g={clientInterceptors:this[c],clientInterceptorProviders:this[s],callInterceptors:(u=f.callOptions.interceptors)!==null&&u!==void 0?u:[],callInterceptorProviders:(P=f.callOptions.interceptor_providers)!==null&&P!==void 0?P:[]},I=(0,h.getInterceptingCall)(g,f.methodDefinition,f.callOptions,f.channel);
v.call=I;
let S=!1,O=Error();
return I.start(f.metadata,{onReceiveMetadata(j){v.emit("metadata",j)},onReceiveMessage(j){v.push(j)},onReceiveStatus(j){if(S)return;
if(S=!0,v.push(null),j.code!==t.Status.OK){let d=o(O);
v.emit("error",(0,R.callErrorFromStatus)(j,d))}O=null,v.emit("status",j)}}),v}}T.Client=n}
// Module: grpc-proto-loader
// Original: cL
// Type: CJS (RT wrapper)
// Exports: CallCredentials, Channel, ChannelCredentials, Client, InterceptingCall, InterceptorConfigurationError, ListenerBuilder, Metadata, RequesterBuilder, ResponderBuilder, Server, ServerCredentials, ServerInterceptingCall, ServerListenerBuilder, StatusBuilder, addAdminServicesToServer, closeClient, compressionAlgorithms, connectivityState, credentials, experimental, getChannelzHandlers, getChannelzServiceDefinition, getClientChannel, load, loadObject, loadPackageDefinition, logVerbosity, makeClientConstructor, makeGenericClientConstructor, propagate, setLogVerbosity, setLogger, status, waitForClientReady
// Category: npm-pkg

// Module: cL (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.experimental=T.ServerInterceptingCall=T.ResponderBuilder=T.ServerListenerBuilder=T.addAdminServicesToServer=T.getChannelzHandlers=T.getChannelzServiceDefinition=T.InterceptorConfigurationError=T.InterceptingCall=T.RequesterBuilder=T.ListenerBuilder=T.StatusBuilder=T.getClientChannel=T.ServerCredentials=T.Server=T.setLogVerbosity=T.setLogger=T.load=T.loadObject=T.CallCredentials=T.ChannelCredentials=T.waitForClientReady=T.closeClient=T.Channel=T.makeGenericClientConstructor=T.makeClientConstructor=T.loadPackageDefinition=T.Client=T.compressionAlgorithms=T.propagate=T.connectivityState=T.status=T.logVerbosity=T.Metadata=T.credentials=void 0;
var R=SZ();
Object.defineProperty(T,"CallCredentials",{enumerable:!0,get:function(){return R.CallCredentials}});
var a=EvT();
Object.defineProperty(T,"Channel",{enumerable:!0,get:function(){return a.ChannelImplementation}});
var e=SvT();
Object.defineProperty(T,"compressionAlgorithms",{enumerable:!0,get:function(){return e.CompressionAlgorithms}});
var t=Ic();
Object.defineProperty(T,"connectivityState",{enumerable:!0,get:function(){return t.ConnectivityState}});
var r=HB();
Object.defineProperty(T,"ChannelCredentials",{enumerable:!0,get:function(){return r.ChannelCredentials}});
var h=_vT();
Object.defineProperty(T,"Client",{enumerable:!0,get:function(){return h.Client}});
var i=c8();
Object.defineProperty(T,"logVerbosity",{enumerable:!0,get:function(){return i.LogVerbosity}}),Object.defineProperty(T,"status",{enumerable:!0,get:function(){return i.Status}}),Object.defineProperty(T,"propagate",{enumerable:!0,get:function(){return i.Propagate}});
var c=j3(),s=bvT();
Object.defineProperty(T,"loadPackageDefinition",{enumerable:!0,get:function(){return s.loadPackageDefinition}}),Object.defineProperty(T,"makeClientConstructor",{enumerable:!0,get:function(){return s.makeClientConstructor}}),Object.defineProperty(T,"makeGenericClientConstructor",{enumerable:!0,get:function(){return s.makeClientConstructor}});
var A=Yt();
Object.defineProperty(T,"Metadata",{enumerable:!0,get:function(){return A.Metadata}});
var l=bhR();
Object.defineProperty(T,"Server",{enumerable:!0,get:function(){return l.Server}});
var o=HZ();
Object.defineProperty(T,"ServerCredentials",{enumerable:!0,get:function(){return o.ServerCredentials}});
var n=mhR();
Object.defineProperty(T,"StatusBuilder",{enumerable:!0,get:function(){return n.StatusBuilder}}),T.credentials={combineChannelCredentials:(w,...D)=>{return D.reduce((B,M)=>B.compose(M),w)},combineCallCredentials:(w,...D)=>{return D.reduce((B,M)=>B.compose(M),w)},createInsecure:r.ChannelCredentials.createInsecure,createSsl:r.ChannelCredentials.createSsl,createFromSecureContext:r.ChannelCredentials.createFromSecureContext,createFromMetadataGenerator:R.CallCredentials.createFromMetadataGenerator,createFromGoogleCredential:R.CallCredentials.createFromGoogleCredential,createEmpty:R.CallCredentials.createEmpty};
var p=(w)=>w.close();
T.closeClient=p;
var _=(w,D,B)=>w.waitForReady(D,B);
T.waitForClientReady=_;
var m=(w,D)=>{throw Error("Not available in this library. Use @grpc/proto-loader and loadPackageDefinition instead")};
T.loadObject=m;
var b=(w,D,B)=>{throw Error("Not available in this library. Use @grpc/proto-loader and loadPackageDefinition instead")};
T.load=b;
var y=(w)=>{c.setLogger(w)};
T.setLogger=y;
var u=(w)=>{c.setLoggerVerbosity(w)};
T.setLogVerbosity=u;
var P=(w)=>{return h.Client.prototype.getChannel.call(w)};
T.getClientChannel=P;
var k=pvT();
Object.defineProperty(T,"ListenerBuilder",{enumerable:!0,get:function(){return k.ListenerBuilder}}),Object.defineProperty(T,"RequesterBuilder",{enumerable:!0,get:function(){return k.RequesterBuilder}}),Object.defineProperty(T,"InterceptingCall",{enumerable:!0,get:function(){return k.InterceptingCall}}),Object.defineProperty(T,"InterceptorConfigurationError",{enumerable:!0,get:function(){return k.InterceptorConfigurationError}});
var x=Tk();
Object.defineProperty(T,"getChannelzServiceDefinition",{enumerable:!0,get:function(){return x.getChannelzServiceDefinition}}),Object.defineProperty(T,"getChannelzHandlers",{enumerable:!0,get:function(){return x.getChannelzHandlers}});
var f=dZ();
Object.defineProperty(T,"addAdminServicesToServer",{enumerable:!0,get:function(){return f.addAdminServicesToServer}});
var v=CvT();
Object.defineProperty(T,"ServerListenerBuilder",{enumerable:!0,get:function(){return v.ServerListenerBuilder}}),Object.defineProperty(T,"ResponderBuilder",{enumerable:!0,get:function(){return v.ResponderBuilder}}),Object.defineProperty(T,"ServerInterceptingCall",{enumerable:!0,get:function(){return v.ServerInterceptingCall}});
var g=MvT();
T.experimental=g;
var I=IvT(),S=yhR(),O=PhR(),j=WZ(),d=khR(),C=xhR(),L=Tk();
(()=>{I.setup(),S.setup(),O.setup(),j.setup(),d.setup(),C.setup(),L.setup()})()}
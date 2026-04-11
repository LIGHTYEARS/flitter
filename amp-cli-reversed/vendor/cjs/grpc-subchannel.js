// Module: grpc-subchannel
// Original: Tk
// Type: CJS (RT wrapper)
// Exports: ChannelzCallTracker, ChannelzCallTrackerStub, ChannelzChildrenTracker, ChannelzChildrenTrackerStub, ChannelzTrace, ChannelzTraceStub, getChannelzHandlers, getChannelzServiceDefinition, registerChannelzChannel, registerChannelzServer, registerChannelzSocket, registerChannelzSubchannel, setup, unregisterChannelzRef
// Category: npm-pkg

// Module: Tk (CJS)
(T)=>{var R="/home/runner/work/amp/amp/node_modules/.pnpm/@grpc+grpc-js@1.13.4/node_modules/@grpc/grpc-js/build/src";
Object.defineProperty(T,"__esModule",{value:!0}),T.registerChannelzSocket=T.registerChannelzServer=T.registerChannelzSubchannel=T.registerChannelzChannel=T.ChannelzCallTrackerStub=T.ChannelzCallTracker=T.ChannelzChildrenTrackerStub=T.ChannelzChildrenTracker=T.ChannelzTrace=T.ChannelzTraceStub=void 0,T.unregisterChannelzRef=f,T.getChannelzHandlers=iT,T.getChannelzServiceDefinition=oT,T.setup=TT;
var a=qT("net"),e=qrR(),t=Ic(),r=c8(),h=mc(),i=dZ(),c=bvT();
function s(tT){return{channel_id:tT.id,name:tT.name}}function A(tT){return{subchannel_id:tT.id,name:tT.name}}function l(tT){return{server_id:tT.id}}function o(tT){return{socket_id:tT.id,name:tT.name}}var n=32,p=100;
class _{constructor(){this.events=[],this.creationTimestamp=new Date,this.eventsLogged=0}addTrace(){}getTraceMessage(){return{creation_timestamp:d(this.creationTimestamp),num_events_logged:this.eventsLogged,events:[]}}}T.ChannelzTraceStub=_;
class m{constructor(){this.events=[],this.eventsLogged=0,this.creationTimestamp=new Date}addTrace(tT,lT,N){let q=new Date;
if(this.events.push({description:lT,severity:tT,timestamp:q,childChannel:(N===null||N===void 0?void 0:N.kind)==="channel"?N:void 0,childSubchannel:(N===null||N===void 0?void 0:N.kind)==="subchannel"?N:void 0}),this.events.length>=n*2)this.events=this.events.slice(n);
this.eventsLogged+=1}getTraceMessage(){return{creation_timestamp:d(this.creationTimestamp),num_events_logged:this.eventsLogged,events:this.events.map((tT)=>{return{description:tT.description,severity:tT.severity,timestamp:d(tT.timestamp),channel_ref:tT.childChannel?s(tT.childChannel):null,subchannel_ref:tT.childSubchannel?A(tT.childSubchannel):null}})}}}T.ChannelzTrace=m;
class b{constructor(){this.channelChildren=new e.OrderedMap,this.subchannelChildren=new e.OrderedMap,this.socketChildren=new e.OrderedMap,this.trackerMap={["channel"]:this.channelChildren,["subchannel"]:this.subchannelChildren,["socket"]:this.socketChildren}}refChild(tT){let lT=this.trackerMap[tT.kind],N=lT.find(tT.id);
if(N.equals(lT.end()))lT.setElement(tT.id,{ref:tT,count:1},N);
else N.pointer[1].count+=1}unrefChild(tT){let lT=this.trackerMap[tT.kind],N=lT.getElementByKey(tT.id);
if(N!==void 0){if(N.count-=1,N.count===0)lT.eraseElementByKey(tT.id)}}getChildLists(){return{channels:this.channelChildren,subchannels:this.subchannelChildren,sockets:this.socketChildren}}}T.ChannelzChildrenTracker=b;
class y extends b{refChild(){}unrefChild(){}}T.ChannelzChildrenTrackerStub=y;
class u{constructor(){this.callsStarted=0,this.callsSucceeded=0,this.callsFailed=0,this.lastCallStartedTimestamp=null}addCallStarted(){this.callsStarted+=1,this.lastCallStartedTimestamp=new Date}addCallSucceeded(){this.callsSucceeded+=1}addCallFailed(){this.callsFailed+=1}}T.ChannelzCallTracker=u;
class P extends u{addCallStarted(){}addCallSucceeded(){}addCallFailed(){}}T.ChannelzCallTrackerStub=P;
var k={["channel"]:new e.OrderedMap,["subchannel"]:new e.OrderedMap,["server"]:new e.OrderedMap,["socket"]:new e.OrderedMap},x=(tT)=>{let lT=1;
function N(){return lT++}let q=k[tT];
return(F,E,U)=>{let Z=N(),X={id:Z,name:F,kind:tT};
if(U)q.setElement(Z,{ref:X,getInfo:E});
return X}};
T.registerChannelzChannel=x("channel"),T.registerChannelzSubchannel=x("subchannel"),T.registerChannelzServer=x("server"),T.registerChannelzSocket=x("socket");
function f(tT){k[tT.kind].eraseElementByKey(tT.id)}function v(tT){let lT=Number.parseInt(tT,16);
return[lT/256|0,lT%256]}function g(tT){if(tT==="")return[];
let lT=tT.split(":").map((N)=>v(N));
return[].concat(...lT)}function I(tT){return(0,a.isIPv6)(tT)&&tT.toLowerCase().startsWith("::ffff:")&&(0,a.isIPv4)(tT.substring(7))}function S(tT){return Buffer.from(Uint8Array.from(tT.split(".").map((lT)=>Number.parseInt(lT))))}function O(tT){if((0,a.isIPv4)(tT))return S(tT);
else if(I(tT))return S(tT.substring(7));
else if((0,a.isIPv6)(tT)){let lT,N,q=tT.indexOf("::");
if(q===-1)lT=tT,N="";
else lT=tT.substring(0,q),N=tT.substring(q+2);
let F=Buffer.from(g(lT)),E=Buffer.from(g(N)),U=Buffer.alloc(16-F.length-E.length,0);
return Buffer.concat([F,U,E])}else return null}function j(tT){switch(tT){case t.ConnectivityState.CONNECTING:return{state:"CONNECTING"};
case t.ConnectivityState.IDLE:return{state:"IDLE"};
case t.ConnectivityState.READY:return{state:"READY"};
case t.ConnectivityState.SHUTDOWN:return{state:"SHUTDOWN"};
case t.ConnectivityState.TRANSIENT_FAILURE:return{state:"TRANSIENT_FAILURE"};
default:return{state:"UNKNOWN"}}}function d(tT){if(!tT)return null;
let lT=tT.getTime();
return{seconds:lT/1000|0,nanos:lT%1000*1e6}}function C(tT){let lT=tT.getInfo(),N=[],q=[];
return lT.children.channels.forEach((F)=>{N.push(s(F[1].ref))}),lT.children.subchannels.forEach((F)=>{q.push(A(F[1].ref))}),{ref:s(tT.ref),data:{target:lT.target,state:j(lT.state),calls_started:lT.callTracker.callsStarted,calls_succeeded:lT.callTracker.callsSucceeded,calls_failed:lT.callTracker.callsFailed,last_call_started_timestamp:d(lT.callTracker.lastCallStartedTimestamp),trace:lT.trace.getTraceMessage()},channel_ref:N,subchannel_ref:q}}function L(tT,lT){let N=parseInt(tT.request.channel_id,10),q=k.channel.getElementByKey(N);
if(q===void 0){lT({code:r.Status.NOT_FOUND,details:"No channel data found for id "+N});
return}lT(null,{channel:C(q)})}function w(tT,lT){let N=parseInt(tT.request.max_results,10)||p,q=[],F=parseInt(tT.request.start_channel_id,10),E=k.channel,U;
for(U=E.lowerBound(F);
!U.equals(E.end())&&q.length<N;
U=U.next())q.push(C(U.pointer[1]));
lT(null,{channel:q,end:U.equals(E.end())})}function D(tT){let lT=tT.getInfo(),N=[];
return lT.listenerChildren.sockets.forEach((q)=>{N.push(o(q[1].ref))}),{ref:l(tT.ref),data:{calls_started:lT.callTracker.callsStarted,calls_succeeded:lT.callTracker.callsSucceeded,calls_failed:lT.callTracker.callsFailed,last_call_started_timestamp:d(lT.callTracker.lastCallStartedTimestamp),trace:lT.trace.getTraceMessage()},listen_socket:N}}function B(tT,lT){let N=parseInt(tT.request.server_id,10),q=k.server.getElementByKey(N);
if(q===void 0){lT({code:r.Status.NOT_FOUND,details:"No server data found for id "+N});
return}lT(null,{server:D(q)})}function M(tT,lT){let N=parseInt(tT.request.max_results,10)||p,q=parseInt(tT.request.start_server_id,10),F=k.server,E=[],U;
for(U=F.lowerBound(q);
!U.equals(F.end())&&E.length<N;
U=U.next())E.push(D(U.pointer[1]));
lT(null,{server:E,end:U.equals(F.end())})}function V(tT,lT){let N=parseInt(tT.request.subchannel_id,10),q=k.subchannel.getElementByKey(N);
if(q===void 0){lT({code:r.Status.NOT_FOUND,details:"No subchannel data found for id "+N});
return}let F=q.getInfo(),E=[];
F.children.sockets.forEach((Z)=>{E.push(o(Z[1].ref))});
let U={ref:A(q.ref),data:{target:F.target,state:j(F.state),calls_started:F.callTracker.callsStarted,calls_succeeded:F.callTracker.callsSucceeded,calls_failed:F.callTracker.callsFailed,last_call_started_timestamp:d(F.callTracker.lastCallStartedTimestamp),trace:F.trace.getTraceMessage()},socket_ref:E};
lT(null,{subchannel:U})}function Q(tT){var lT;
if((0,h.isTcpSubchannelAddress)(tT))return{address:"tcpip_address",tcpip_address:{ip_address:(lT=O(tT.host))!==null&&lT!==void 0?lT:void 0,port:tT.port}};
else return{address:"uds_address",uds_address:{filename:tT.path}}}function W(tT,lT){var N,q,F,E,U;
let Z=parseInt(tT.request.socket_id,10),X=k.socket.getElementByKey(Z);
if(X===void 0){lT({code:r.Status.NOT_FOUND,details:"No socket data found for id "+Z});
return}let rT=X.getInfo(),hT=rT.security?{model:"tls",tls:{cipher_suite:rT.security.cipherSuiteStandardName?"standard_name":"other_name",standard_name:(N=rT.security.cipherSuiteStandardName)!==null&&N!==void 0?N:void 0,other_name:(q=rT.security.cipherSuiteOtherName)!==null&&q!==void 0?q:void 0,local_certificate:(F=rT.security.localCertificate)!==null&&F!==void 0?F:void 0,remote_certificate:(E=rT.security.remoteCertificate)!==null&&E!==void 0?E:void 0}}:null,pT={ref:o(X.ref),local:rT.localAddress?Q(rT.localAddress):null,remote:rT.remoteAddress?Q(rT.remoteAddress):null,remote_name:(U=rT.remoteName)!==null&&U!==void 0?U:void 0,security:hT,data:{keep_alives_sent:rT.keepAlivesSent,streams_started:rT.streamsStarted,streams_succeeded:rT.streamsSucceeded,streams_failed:rT.streamsFailed,last_local_stream_created_timestamp:d(rT.lastLocalStreamCreatedTimestamp),last_remote_stream_created_timestamp:d(rT.lastRemoteStreamCreatedTimestamp),messages_received:rT.messagesReceived,messages_sent:rT.messagesSent,last_message_received_timestamp:d(rT.lastMessageReceivedTimestamp),last_message_sent_timestamp:d(rT.lastMessageSentTimestamp),local_flow_control_window:rT.localFlowControlWindow?{value:rT.localFlowControlWindow}:null,remote_flow_control_window:rT.remoteFlowControlWindow?{value:rT.remoteFlowControlWindow}:null}};
lT(null,{socket:pT})}function eT(tT,lT){let N=parseInt(tT.request.server_id,10),q=k.server.getElementByKey(N);
if(q===void 0){lT({code:r.Status.NOT_FOUND,details:"No server data found for id "+N});
return}let F=parseInt(tT.request.start_socket_id,10),E=parseInt(tT.request.max_results,10)||p,U=q.getInfo().sessionChildren.sockets,Z=[],X;
for(X=U.lowerBound(F);
!X.equals(U.end())&&Z.length<E;
X=X.next())Z.push(o(X.pointer[1].ref));
lT(null,{socket_ref:Z,end:X.equals(U.end())})}function iT(){return{GetChannel:L,GetTopChannels:w,GetServer:B,GetServers:M,GetSubchannel:V,GetSocket:W,GetServerSockets:eT}}var aT=null;
function oT(){if(aT)return aT;
let tT=rhR().loadSync,lT=tT("channelz.proto",{keepCase:!0,longs:String,enums:String,defaults:!0,oneofs:!0,includeDirs:[`${R}/../../proto`]});return aT=(0,c.loadPackageDefinition)(lT).grpc.channelz.v1.Channelz.service,aT}function TT(){(0,i.registerAdminService)(oT,iT)}}
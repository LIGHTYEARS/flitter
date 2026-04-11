// Module: otlp-log-exporter-6
// Original: OhR
// Type: CJS (RT wrapper)
// Exports: OTLPLogExporter
// Category: util

// Module: ohR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.SubchannelPool=void 0,T.getSubchannelPool=s;
var R=WrR(),a=hhR(),e=mc(),t=dh(),r=shR(),h=1e4;
class i{constructor(){this.pool=Object.create(null),this.cleanupTimer=null}unrefUnusedSubchannels(){let A=!0;
for(let l in this.pool){let o=this.pool[l].filter((n)=>!n.subchannel.unrefIfOneRef());
if(o.length>0)A=!1;
this.pool[l]=o}if(A&&this.cleanupTimer!==null)clearInterval(this.cleanupTimer),this.cleanupTimer=null}ensureCleanupTask(){var A,l;
if(this.cleanupTimer===null)this.cleanupTimer=setInterval(()=>{this.unrefUnusedSubchannels()},h),(l=(A=this.cleanupTimer).unref)===null||l===void 0||l.call(A)}getOrCreateSubchannel(A,l,o,n){this.ensureCleanupTask();
let p=(0,t.uriToString)(A);
if(p in this.pool){let m=this.pool[p];
for(let b of m)if((0,e.subchannelAddressEqual)(l,b.subchannelAddress)&&(0,R.channelOptionsEqual)(o,b.channelArguments)&&n._equals(b.channelCredentials))return b.subchannel}let _=new a.Subchannel(A,l,o,n,new r.Http2SubchannelConnector(A));
if(!(p in this.pool))this.pool[p]=[];
return this.pool[p].push({subchannelAddress:l,channelArguments:o,channelCredentials:n,subchannel:_}),_.ref(),_}}T.SubchannelPool=i;
var c=new i;
function s(A){if(A)return c;
else return new i}}
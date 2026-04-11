// Module: otlp-log-exporter-3
// Original: DrR
// Type: CJS (RT wrapper)
// Exports: OTLPLogExporter
// Category: util

// Module: drR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.createRetryingTransport=void 0;
var R=5,a=1000,e=5000,t=1.5,r=0.2;
function h(){return Math.random()*(2*r)-r}class i{_transport;
constructor(s){this._transport=s}retry(s,A,l){return new Promise((o,n)=>{setTimeout(()=>{this._transport.send(s,A).then(o,n)},l)})}async send(s,A){let l=Date.now()+A,o=await this._transport.send(s,A),n=R,p=a;
while(o.status==="retryable"&&n>0){n--;
let _=Math.max(Math.min(p,e)+h(),0);
p=p*t;
let m=o.retryInMillis??_,b=l-Date.now();
if(m>b)return o;
o=await this.retry(s,b,m)}return o}shutdown(){return this._transport.shutdown()}}function c(s){return new i(s.transport)}T.createRetryingTransport=c}
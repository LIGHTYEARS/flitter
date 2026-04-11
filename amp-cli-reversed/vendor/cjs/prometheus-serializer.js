// Module: prometheus-serializer
// Original: BvT
// Type: CJS (RT wrapper)
// Exports: PrometheusSerializer
// Category: util

// Module: bvT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.makeClientConstructor=t,T.loadPackageDefinition=i;
var R=_vT(),a={unary:R.Client.prototype.makeUnaryRequest,server_stream:R.Client.prototype.makeServerStreamRequest,client_stream:R.Client.prototype.makeClientStreamRequest,bidi:R.Client.prototype.makeBidiStreamRequest};
function e(c){return["__proto__","prototype","constructor"].includes(c)}function t(c,s,A){if(!A)A={};
class l extends R.Client{}return Object.keys(c).forEach((o)=>{if(e(o))return;
let n=c[o],p;
if(typeof o==="string"&&o.charAt(0)==="$")throw Error("Method names cannot start with $");
if(n.requestStream)if(n.responseStream)p="bidi";
else p="client_stream";
else if(n.responseStream)p="server_stream";
else p="unary";
let{requestSerialize:_,responseDeserialize:m}=n,b=r(a[p],n.path,_,m);
if(l.prototype[o]=b,Object.assign(l.prototype[o],n),n.originalName&&!e(n.originalName))l.prototype[n.originalName]=l.prototype[o]}),l.service=c,l.serviceName=s,l}function r(c,s,A,l){return function(...o){return c.call(this,s,A,l,...o)}}function h(c){return"format"in c}function i(c){let s={};
for(let A in c)if(Object.prototype.hasOwnProperty.call(c,A)){let l=c[A],o=A.split(".");
if(o.some((_)=>e(_)))continue;
let n=o[o.length-1],p=s;
for(let _ of o.slice(0,-1)){if(!p[_])p[_]={};
p=p[_]}if(h(l))p[n]=l;
else p[n]=t(l,n,{})}return s}}
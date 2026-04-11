// Module: json
// Original: jIR
// Type: CJS (RT wrapper)
// Exports: json, req, toBuffer
// Category: util

// Module: jIR (CJS)
(T)=>{var R=T&&T.__createBinding||(Object.create?function(s,A,l,o){if(o===void 0)o=l;
var n=Object.getOwnPropertyDescriptor(A,l);
if(!n||("get"in n?!A.__esModule:n.writable||n.configurable))n={enumerable:!0,get:function(){return A[l]}};
Object.defineProperty(s,o,n)}:function(s,A,l,o){if(o===void 0)o=l;
s[o]=A[l]}),a=T&&T.__setModuleDefault||(Object.create?function(s,A){Object.defineProperty(s,"default",{enumerable:!0,value:A})}:function(s,A){s.default=A}),e=T&&T.__importStar||function(s){if(s&&s.__esModule)return s;
var A={};
if(s!=null){for(var l in s)if(l!=="default"&&Object.prototype.hasOwnProperty.call(s,l))R(A,s,l)}return a(A,s),A};
Object.defineProperty(T,"__esModule",{value:!0}),T.req=T.json=T.toBuffer=void 0;
var t=e(qT("http")),r=e(qT("https"));
async function h(s){let A=0,l=[];
for await(let o of s)A+=o.length,l.push(o);
return Buffer.concat(l,A)}T.toBuffer=h;
async function i(s){let A=(await h(s)).toString("utf8");
try{return JSON.parse(A)}catch(l){let o=l;
throw o.message+=` (input: ${A})`,o}}T.json=i;function c(s,A={}){let l=((typeof s==="string"?s:s.href).startsWith("https:")?r:t).request(s,A),o=new Promise((n,p)=>{l.once("response",n).once("error",p).end()});return l.then=o.then.bind(o),l}T.req=c}
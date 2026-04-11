// Module: flat-map
// Original: Fs
// Type: CJS (RT wrapper)
// Exports: FlatMap, PromiseAllSettled, TimeoutError, binarySearchUB, callWithTimeout, equalsCaseInsensitive, hashAttributes, instrumentationScopeId, isNotNullish, isPromiseAllSettledRejectionResult, setEquals
// Category: util

// Module: Fs (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.equalsCaseInsensitive=T.binarySearchUB=T.setEquals=T.FlatMap=T.isPromiseAllSettledRejectionResult=T.PromiseAllSettled=T.callWithTimeout=T.TimeoutError=T.instrumentationScopeId=T.hashAttributes=T.isNotNullish=void 0;
function R(o){return o!==void 0&&o!==null}T.isNotNullish=R;
function a(o){let n=Object.keys(o);
if(n.length===0)return"";
return n=n.sort(),JSON.stringify(n.map((p)=>[p,o[p]]))}T.hashAttributes=a;
function e(o){return`${o.name}:${o.version??""}:${o.schemaUrl??""}`}T.instrumentationScopeId=e;class t extends Error{constructor(o){super(o);Object.setPrototypeOf(this,t.prototype)}}T.TimeoutError=t;function r(o,n){let p,_=new Promise(function(m,b){p=setTimeout(function(){b(new t("Operation timed out."))},n)});return Promise.race([o,_]).then((m)=>{return clearTimeout(p),m},(m)=>{throw clearTimeout(p),m})}T.callWithTimeout=r;async function h(o){return Promise.all(o.map(async(n)=>{try{return{status:"fulfilled",value:await n}}catch(p){return{status:"rejected",reason:p}}}))}T.PromiseAllSettled=h;function i(o){return o.status==="rejected"}T.isPromiseAllSettledRejectionResult=i;function c(o,n){let p=[];return o.forEach((_)=>{p.push(...n(_))}),p}T.FlatMap=c;function s(o,n){if(o.size!==n.size)return!1;for(let p of o)if(!n.has(p))return!1;return!0}T.setEquals=s;function A(o,n){let p=0,_=o.length-1,m=o.length;while(_>=p){let b=p+Math.trunc((_-p)/2);if(o[b]<n)p=b+1;else m=b,_=b-1}return m}T.binarySearchUB=A;function l(o,n){return o.toLowerCase()===n.toLowerCase()}T.equalsCaseInsensitive=l}
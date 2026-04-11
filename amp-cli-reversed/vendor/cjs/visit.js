// Module: visit
// Original: EN
// Type: CJS (RT wrapper)
// Exports: visit, visitAsync
// Category: util

// Module: EN (CJS)
(T)=>{var R=x8(),a=Symbol("break visit"),e=Symbol("skip children"),t=Symbol("remove node");
function r(o,n){let p=s(n);
if(R.isDocument(o)){if(h(null,o.contents,p,Object.freeze([o]))===t)o.contents=null}else h(null,o,p,Object.freeze([]))}r.BREAK=a,r.SKIP=e,r.REMOVE=t;
function h(o,n,p,_){let m=A(o,n,p,_);
if(R.isNode(m)||R.isPair(m))return l(o,_,m),h(o,m,p,_);
if(typeof m!=="symbol"){if(R.isCollection(n)){_=Object.freeze(_.concat(n));
for(let b=0;
b<n.items.length;
++b){let y=h(b,n.items[b],p,_);
if(typeof y==="number")b=y-1;
else if(y===a)return a;
else if(y===t)n.items.splice(b,1),b-=1}}else if(R.isPair(n)){_=Object.freeze(_.concat(n));
let b=h("key",n.key,p,_);
if(b===a)return a;
else if(b===t)n.key=null;
let y=h("value",n.value,p,_);
if(y===a)return a;
else if(y===t)n.value=null}}return m}async function i(o,n){let p=s(n);
if(R.isDocument(o)){if(await c(null,o.contents,p,Object.freeze([o]))===t)o.contents=null}else await c(null,o,p,Object.freeze([]))}i.BREAK=a,i.SKIP=e,i.REMOVE=t;
async function c(o,n,p,_){let m=await A(o,n,p,_);
if(R.isNode(m)||R.isPair(m))return l(o,_,m),c(o,m,p,_);
if(typeof m!=="symbol"){if(R.isCollection(n)){_=Object.freeze(_.concat(n));
for(let b=0;
b<n.items.length;
++b){let y=await c(b,n.items[b],p,_);
if(typeof y==="number")b=y-1;
else if(y===a)return a;
else if(y===t)n.items.splice(b,1),b-=1}}else if(R.isPair(n)){_=Object.freeze(_.concat(n));
let b=await c("key",n.key,p,_);
if(b===a)return a;
else if(b===t)n.key=null;
let y=await c("value",n.value,p,_);
if(y===a)return a;
else if(y===t)n.value=null}}return m}function s(o){if(typeof o==="object"&&(o.Collection||o.Node||o.Value))return Object.assign({Alias:o.Node,Map:o.Node,Scalar:o.Node,Seq:o.Node},o.Value&&{Map:o.Value,Scalar:o.Value,Seq:o.Value},o.Collection&&{Map:o.Collection,Seq:o.Collection},o);
return o}function A(o,n,p,_){if(typeof p==="function")return p(o,n,_);
if(R.isMap(n))return p.Map?.(o,n,_);
if(R.isSeq(n))return p.Seq?.(o,n,_);
if(R.isPair(n))return p.Pair?.(o,n,_);
if(R.isScalar(n))return p.Scalar?.(o,n,_);
if(R.isAlias(n))return p.Alias?.(o,n,_);
return}function l(o,n,p){let _=n[n.length-1];
if(R.isCollection(_))_.items[o]=p;
else if(R.isPair(_))if(o==="key")_.key=p;
else _.value=p;
else if(R.isDocument(_))_.contents=p;
else{let m=R.isAlias(_)?"alias":"scalar";
throw Error(`Cannot replace node with ${m} parent`)}}T.visit=r,T.visitAsync=i}
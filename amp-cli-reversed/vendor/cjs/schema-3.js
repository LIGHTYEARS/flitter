// Module: schema-3
// Original: NPR
// Type: CJS (RT wrapper)
// Exports: schema
// Category: util

// Module: npR (CJS)
(T,R)=>{var a=qT("fs"),e=qT("path"),t=qT("os"),r=typeof __webpack_require__==="function"?__non_webpack_require__:qT,h=process.config&&process.config.variables||{},i=!!process.env.PREBUILDS_ONLY,c=process.versions.modules,s=S()?"electron":I()?"node-webkit":"node",A=process.env.npm_config_arch||t.arch(),l=process.env.npm_config_platform||t.platform(),o=process.env.LIBC||(O(l)?"musl":"glibc"),n=process.env.ARM_VERSION||(A==="arm64"?"8":h.arm_version)||"",p=(process.versions.uv||"").split(".")[0];
R.exports=_;
function _(j){return r(_.resolve(j))}_.resolve=_.path=function(j){j=e.resolve(j||".");
try{var d=r(e.join(j,"package.json")).name.toUpperCase().replace(/-/g,"_");
if(process.env[d+"_PREBUILD"])j=process.env[d+"_PREBUILD"]}catch(V){}if(!i){var C=b(e.join(j,"build/Release"),y);
if(C)return C;
var L=b(e.join(j,"build/Debug"),y);
if(L)return L}var w=M(j);
if(w)return w;
var D=M(e.dirname(process.execPath));
if(D)return D;
var B=["platform="+l,"arch="+A,"runtime="+s,"abi="+c,"uv="+p,n?"armv="+n:"","libc="+o,"node="+process.versions.node,process.versions.electron?"electron="+process.versions.electron:"",typeof __webpack_require__==="function"?"webpack=true":""].filter(Boolean).join(" ");
throw Error("No native build was found for "+B+`
    loaded from: `+j+`
`);
function M(V){var Q=m(e.join(V,"prebuilds")).map(u),W=Q.filter(P(l,A)).sort(k)[0];
if(!W)return;
var eT=e.join(V,"prebuilds",W.name),iT=m(eT).map(x),aT=iT.filter(f(s,c)),oT=aT.sort(g(s))[0];
if(oT)return e.join(eT,oT.file)}};
function m(j){try{return a.readdirSync(j)}catch(d){return[]}}function b(j,d){var C=m(j).filter(d);
return C[0]&&e.join(j,C[0])}function y(j){return/\.node$/.test(j)}function u(j){var d=j.split("-");
if(d.length!==2)return;
var C=d[0],L=d[1].split("+");
if(!C)return;
if(!L.length)return;
if(!L.every(Boolean))return;
return{name:j,platform:C,architectures:L}}function P(j,d){return function(C){if(C==null)return!1;
if(C.platform!==j)return!1;
return C.architectures.includes(d)}}function k(j,d){return j.architectures.length-d.architectures.length}function x(j){var d=j.split("."),C=d.pop(),L={file:j,specificity:0};
if(C!=="node")return;
for(var w=0;
w<d.length;
w++){var D=d[w];
if(D==="node"||D==="electron"||D==="node-webkit")L.runtime=D;
else if(D==="napi")L.napi=!0;
else if(D.slice(0,3)==="abi")L.abi=D.slice(3);
else if(D.slice(0,2)==="uv")L.uv=D.slice(2);
else if(D.slice(0,4)==="armv")L.armv=D.slice(4);
else if(D==="glibc"||D==="musl")L.libc=D;
else continue;
L.specificity++}return L}function f(j,d){return function(C){if(C==null)return!1;
if(C.runtime&&C.runtime!==j&&!v(C))return!1;
if(C.abi&&C.abi!==d&&!C.napi)return!1;
if(C.uv&&C.uv!==p)return!1;
if(C.armv&&C.armv!==n)return!1;
if(C.libc&&C.libc!==o)return!1;
return!0}}function v(j){return j.runtime==="node"&&j.napi}function g(j){return function(d,C){if(d.runtime!==C.runtime)return d.runtime===j?-1:1;
else if(d.abi!==C.abi)return d.abi?-1:1;
else if(d.specificity!==C.specificity)return d.specificity>C.specificity?-1:1;
else return 0}}function I(){return!!(process.versions&&process.versions.nw)}function S(){if(process.versions&&process.versions.electron)return!0;
if(process.env.ELECTRON_RUN_AS_NODE)return!0;
return typeof window<"u"&&window.process&&window.process.type==="renderer"}function O(j){return j==="linux"&&a.existsSync("/etc/alpine-release")}_.parseTags=x,_.matchTags=f,_.compareTags=g,_.parseTuple=u,_.matchTuple=P,_.compareTuples=k}
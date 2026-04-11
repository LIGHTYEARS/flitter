// Module: debug
// Original: $$T
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: npm-pkg

// Module: $$T (CJS)
(T,R)=>{function a(e){r.debug=r,r.default=r,r.coerce=l,r.disable=s,r.enable=i,r.enabled=A,r.humanize=nZ(),r.destroy=o,Object.keys(e).forEach((n)=>{r[n]=e[n]}),r.names=[],r.skips=[],r.formatters={};
function t(n){let p=0;
for(let _=0;
_<n.length;
_++)p=(p<<5)-p+n.charCodeAt(_),p|=0;
return r.colors[Math.abs(p)%r.colors.length]}r.selectColor=t;
function r(n){let p,_=null,m,b;
function y(...u){if(!y.enabled)return;
let P=y,k=Number(new Date),x=k-(p||k);
if(P.diff=x,P.prev=p,P.curr=k,p=k,u[0]=r.coerce(u[0]),typeof u[0]!=="string")u.unshift("%O");
let f=0;
u[0]=u[0].replace(/%([a-zA-Z%])/g,(v,g)=>{if(v==="%%")return"%";
f++;
let I=r.formatters[g];
if(typeof I==="function"){let S=u[f];
v=I.call(P,S),u.splice(f,1),f--}return v}),r.formatArgs.call(P,u),(P.log||r.log).apply(P,u)}if(y.namespace=n,y.useColors=r.useColors(),y.color=r.selectColor(n),y.extend=h,y.destroy=r.destroy,Object.defineProperty(y,"enabled",{enumerable:!0,configurable:!1,get:()=>{if(_!==null)return _;
if(m!==r.namespaces)m=r.namespaces,b=r.enabled(n);
return b},set:(u)=>{_=u}}),typeof r.init==="function")r.init(y);
return y}function h(n,p){let _=r(this.namespace+(typeof p>"u"?":":p)+n);
return _.log=this.log,_}function i(n){r.save(n),r.namespaces=n,r.names=[],r.skips=[];
let p=(typeof n==="string"?n:"").trim().replace(/\s+/g,",").split(",").filter(Boolean);
for(let _ of p)if(_[0]==="-")r.skips.push(_.slice(1));
else r.names.push(_)}function c(n,p){let _=0,m=0,b=-1,y=0;
while(_<n.length)if(m<p.length&&(p[m]===n[_]||p[m]==="*"))if(p[m]==="*")b=m,y=_,m++;
else _++,m++;
else if(b!==-1)m=b+1,y++,_=y;
else return!1;
while(m<p.length&&p[m]==="*")m++;
return m===p.length}function s(){let n=[...r.names,...r.skips.map((p)=>"-"+p)].join(",");
return r.enable(""),n}function A(n){for(let p of r.skips)if(c(n,p))return!1;
for(let p of r.names)if(c(n,p))return!0;
return!1}function l(n){if(n instanceof Error)return n.stack||n.message;
return n}function o(){console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.")}return r.enable(r.load()),r}R.exports=a}
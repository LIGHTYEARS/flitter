// Module: unknown-g8T
// Original: g8T
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: g8T (CJS)
(T,R)=>{var a=Object.prototype.hasOwnProperty,e=Object.prototype.toString,t=Object.defineProperty,r=Object.getOwnPropertyDescriptor,h=function(A){if(typeof Array.isArray==="function")return Array.isArray(A);
return e.call(A)==="[object Array]"},i=function(A){if(!A||e.call(A)!=="[object Object]")return!1;
var l=a.call(A,"constructor"),o=A.constructor&&A.constructor.prototype&&a.call(A.constructor.prototype,"isPrototypeOf");
if(A.constructor&&!l&&!o)return!1;
var n;
for(n in A);
return typeof n>"u"||a.call(A,n)},c=function(A,l){if(t&&l.name==="__proto__")t(A,l.name,{enumerable:!0,configurable:!0,value:l.newValue,writable:!0});
else A[l.name]=l.newValue},s=function(A,l){if(l==="__proto__"){if(!a.call(A,l))return;
else if(r)return r(A,l).value}return A[l]};
R.exports=function A(){var l,o,n,p,_,m,b=arguments[0],y=1,u=arguments.length,P=!1;
if(typeof b==="boolean")P=b,b=arguments[1]||{},y=2;
if(b==null||typeof b!=="object"&&typeof b!=="function")b={};
for(;
y<u;
++y)if(l=arguments[y],l!=null){for(o in l)if(n=s(b,o),p=s(l,o),b!==p){if(P&&p&&(i(p)||(_=h(p)))){if(_)_=!1,m=n&&h(n)?n:[];
else m=n&&i(n)?n:{};
c(b,{name:o,newValue:A(P,m,p)})}else if(typeof p<"u")c(b,{name:o,newValue:p})}}return b}}
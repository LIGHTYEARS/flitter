// Module: unknown-Fe
// Original: Fe
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: Fe (CJS)
(T,R)=>{var a=R.exports=$n(),e=rvT(),t,r;
a.codegen=KrR(),a.fetch=VrR(),a.path=XrR(),a.fs=a.inquire("fs"),a.toArray=function(A){if(A){var l=Object.keys(A),o=Array(l.length),n=0;
while(n<l.length)o[n]=A[l[n++]];
return o}return[]},a.toObject=function(A){var l={},o=0;
while(o<A.length){var n=A[o++],p=A[o++];
if(p!==void 0)l[n]=p}return l};
var h=/\\/g,i=/"/g;a.isReserved=function(A){return/^(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/.test(A)},a.safeProp=function(A){if(!/^[$\w_]+$/.test(A)||a.isReserved(A))return'["'+A.replace(h,"\\\\").replace(i,"\\\"")+'"]';return"."+A},a.ucFirst=function(A){return A.charAt(0).toUpperCase()+A.substring(1)};var c=/_([a-z])/g;a.camelCase=function(A){return A.substring(0,1)+A.substring(1).replace(c,function(l,o){return o.toUpperCase()})},a.compareFieldsById=function(A,l){return A.id-l.id},a.decorateType=function(A,l){if(A.$type){if(l&&A.$type.name!==l)a.decorateRoot.remove(A.$type),A.$type.name=l,a.decorateRoot.add(A.$type);return A.$type}if(!t)t=DZ();var o=new t(l||A.name);return a.decorateRoot.add(o),o.ctor=A,Object.defineProperty(A,"$type",{value:o,enumerable:!1}),Object.defineProperty(A.prototype,"$type",{value:o,enumerable:!1}),o};var s=0;a.decorateEnum=function(A){if(A.$type)return A.$type;if(!r)r=Gs();var l=new r("Enum"+s++,A);return a.decorateRoot.add(l),Object.defineProperty(A,"$type",{value:l,enumerable:!1}),l},a.setProperty=function(A,l,o,n){function p(_,m,b){var y=m.shift();if(y==="__proto__"||y==="prototype")return _;if(m.length>0)_[y]=p(_[y]||{},m,b);else{var u=_[y];if(u&&n)return _;if(u)b=[].concat(u).concat(b);_[y]=b}return _}if(typeof A!=="object")throw TypeError("dst must be an object");if(!l)throw TypeError("path must be specified");return l=l.split("."),p(A,l,o)},Object.defineProperty(a,"decorateRoot",{get:function(){return e.decorated||(e.decorated=new(wZ()))}})}
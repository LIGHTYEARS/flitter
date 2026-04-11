// Module: unknown-yvT
// Original: yvT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: yvT (CJS)
(T)=>{var R=T,a=Gs(),e=Fe();
function t(h,i,c,s){var A=!1;
if(i.resolvedType)if(i.resolvedType instanceof a){h("switch(d%s){",s);
for(var l=i.resolvedType.values,o=Object.keys(l),n=0;
n<o.length;
++n){if(l[o[n]]===i.typeDefault&&!A){if(h("default:")('if(typeof(d%s)==="number"){m%s=d%s;break}',s,s,s),!i.repeated)h("break");
A=!0}h("case%j:",o[n])("case %i:",l[o[n]])("m%s=%j",s,l[o[n]])("break")}h("}")}else h('if(typeof d%s!=="object")',s)("throw TypeError(%j)",i.fullName+": object expected")("m%s=types[%i].fromObject(d%s)",s,c,s);
else{var p=!1;
switch(i.type){case"double":case"float":h("m%s=Number(d%s)",s,s);
break;
case"uint32":case"fixed32":h("m%s=d%s>>>0",s,s);
break;
case"int32":case"sint32":case"sfixed32":h("m%s=d%s|0",s,s);
break;
case"uint64":p=!0;
case"int64":case"sint64":case"fixed64":case"sfixed64":h("if(util.Long)")("(m%s=util.Long.fromValue(d%s)).unsigned=%j",s,s,p)('else if(typeof d%s==="string")',s)("m%s=parseInt(d%s,10)",s,s)('else if(typeof d%s==="number")',s)("m%s=d%s",s,s)('else if(typeof d%s==="object")',s)("m%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toNumber(%s)",s,s,s,p?"true":"");
break;
case"bytes":h('if(typeof d%s==="string")',s)("util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)",s,s,s)("else if(d%s.length >= 0)",s)("m%s=d%s",s,s);
break;
case"string":h("m%s=String(d%s)",s,s);
break;
case"bool":h("m%s=Boolean(d%s)",s,s);
break}}return h}R.fromObject=function(h){var i=h.fieldsArray,c=e.codegen(["d"],h.name+"$fromObject")("if(d instanceof this.ctor)")("return d");
if(!i.length)return c("return new this.ctor");
c("var m=new this.ctor");
for(var s=0;
s<i.length;
++s){var A=i[s].resolve(),l=e.safeProp(A.name);
if(A.map)c("if(d%s){",l)('if(typeof d%s!=="object")',l)("throw TypeError(%j)",A.fullName+": object expected")("m%s={}",l)("for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){",l),t(c,A,s,l+"[ks[i]]")("}")("}");
else if(A.repeated)c("if(d%s){",l)("if(!Array.isArray(d%s))",l)("throw TypeError(%j)",A.fullName+": array expected")("m%s=[]",l)("for(var i=0;i<d%s.length;++i){",l),t(c,A,s,l+"[i]")("}")("}");
else{if(!(A.resolvedType instanceof a))c("if(d%s!=null){",l);
if(t(c,A,s,l),!(A.resolvedType instanceof a))c("}")}}return c("return m")};
function r(h,i,c,s){if(i.resolvedType)if(i.resolvedType instanceof a)h("d%s=o.enums===String?(types[%i].values[m%s]===undefined?m%s:types[%i].values[m%s]):m%s",s,c,s,s,c,s,s);
else h("d%s=types[%i].toObject(m%s,o)",s,c,s);
else{var A=!1;
switch(i.type){case"double":case"float":h("d%s=o.json&&!isFinite(m%s)?String(m%s):m%s",s,s,s,s);
break;
case"uint64":A=!0;
case"int64":case"sint64":case"fixed64":case"sfixed64":h('if(typeof m%s==="number")',s)("d%s=o.longs===String?String(m%s):m%s",s,s,s)("else")("d%s=o.longs===String?util.Long.prototype.toString.call(m%s):o.longs===Number?new util.LongBits(m%s.low>>>0,m%s.high>>>0).toNumber(%s):m%s",s,s,s,s,A?"true":"",s);
break;
case"bytes":h("d%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s",s,s,s,s,s);
break;
default:h("d%s=m%s",s,s);
break}}return h}R.toObject=function(h){var i=h.fieldsArray.slice().sort(e.compareFieldsById);
if(!i.length)return e.codegen()("return {}");
var c=e.codegen(["m","o"],h.name+"$toObject")("if(!o)")("o={}")("var d={}"),s=[],A=[],l=[],o=0;
for(;
o<i.length;
++o)if(!i[o].partOf)(i[o].resolve().repeated?s:i[o].map?A:l).push(i[o]);
if(s.length){c("if(o.arrays||o.defaults){");
for(o=0;
o<s.length;
++o)c("d%s=[]",e.safeProp(s[o].name));
c("}")}if(A.length){c("if(o.objects||o.defaults){");
for(o=0;
o<A.length;
++o)c("d%s={}",e.safeProp(A[o].name));
c("}")}if(l.length){c("if(o.defaults){");
for(o=0;
o<l.length;
++o){var n=l[o],p=e.safeProp(n.name);
if(n.resolvedType instanceof a)c("d%s=o.enums===String?%j:%j",p,n.resolvedType.valuesById[n.typeDefault],n.typeDefault);
else if(n.long)c("if(util.Long){")("var n=new util.Long(%i,%i,%j)",n.typeDefault.low,n.typeDefault.high,n.typeDefault.unsigned)("d%s=o.longs===String?n.toString():o.longs===Number?n.toNumber():n",p)("}else")("d%s=o.longs===String?%j:%i",p,n.typeDefault.toString(),n.typeDefault.toNumber());
else if(n.bytes){var _="["+Array.prototype.slice.call(n.typeDefault).join(",")+"]";
c("if(o.bytes===String)d%s=%j",p,String.fromCharCode.apply(String,n.typeDefault))("else{")("d%s=%s",p,_)("if(o.bytes!==Array)d%s=util.newBuffer(d%s)",p,p)("}")}else c("d%s=%j",p,n.typeDefault)}c("}")}var m=!1;
for(o=0;
o<i.length;
++o){var n=i[o],b=h._fieldsArray.indexOf(n),p=e.safeProp(n.name);
if(n.map){if(!m)m=!0,c("var ks2");
c("if(m%s&&(ks2=Object.keys(m%s)).length){",p,p)("d%s={}",p)("for(var j=0;j<ks2.length;++j){"),r(c,n,b,p+"[ks2[j]]")("}")}else if(n.repeated)c("if(m%s&&m%s.length){",p,p)("d%s=[]",p)("for(var j=0;j<m%s.length;++j){",p),r(c,n,b,p+"[j]")("}");
else if(c("if(m%s!=null&&m.hasOwnProperty(%j)){",p,n.name),r(c,n,b,p),n.partOf)c("if(o.oneofs)")("d%s=%j",e.safeProp(n.partOf.name),n.name);
c("}")}return c("return d")}}
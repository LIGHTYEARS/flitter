// Module: b3-debug-flag-key
// Original: UvT
// Type: CJS (RT wrapper)
// Exports: B3_DEBUG_FLAG_KEY
// Category: util

// Module: uvT (CJS)
(T,R)=>{R.exports=i;
var a=Gs(),e=Fe();
function t(c,s){return c.name+": "+s+(c.repeated&&s!=="array"?"[]":c.map&&s!=="object"?"{k:"+c.keyType+"}":"")+" expected"}function r(c,s,A,l){if(s.resolvedType)if(s.resolvedType instanceof a){c("switch(%s){",l)("default:")("return%j",t(s,"enum value"));
for(var o=Object.keys(s.resolvedType.values),n=0;
n<o.length;
++n)c("case %i:",s.resolvedType.values[o[n]]);
c("break")("}")}else c("{")("var e=types[%i].verify(%s);",A,l)("if(e)")("return%j+e",s.name+".")("}");
else switch(s.type){case"int32":case"uint32":case"sint32":case"fixed32":case"sfixed32":c("if(!util.isInteger(%s))",l)("return%j",t(s,"integer"));
break;
case"int64":case"uint64":case"sint64":case"fixed64":case"sfixed64":c("if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))",l,l,l,l)("return%j",t(s,"integer|Long"));
break;
case"float":case"double":c('if(typeof %s!=="number")',l)("return%j",t(s,"number"));
break;
case"bool":c('if(typeof %s!=="boolean")',l)("return%j",t(s,"boolean"));
break;
case"string":c("if(!util.isString(%s))",l)("return%j",t(s,"string"));
break;
case"bytes":c('if(!(%s&&typeof %s.length==="number"||util.isString(%s)))',l,l,l)("return%j",t(s,"buffer"));
break}return c}function h(c,s,A){switch(s.keyType){case"int32":case"uint32":case"sint32":case"fixed32":case"sfixed32":c("if(!util.key32Re.test(%s))",A)("return%j",t(s,"integer key"));
break;
case"int64":case"uint64":case"sint64":case"fixed64":case"sfixed64":c("if(!util.key64Re.test(%s))",A)("return%j",t(s,"integer|Long key"));
break;
case"bool":c("if(!util.key2Re.test(%s))",A)("return%j",t(s,"boolean key"));
break}return c}function i(c){var s=e.codegen(["m"],c.name+"$verify")('if(typeof m!=="object"||m===null)')("return%j","object expected"),A=c.oneofsArray,l={};
if(A.length)s("var p={}");
for(var o=0;
o<c.fieldsArray.length;
++o){var n=c._fieldsArray[o].resolve(),p="m"+e.safeProp(n.name);
if(n.optional)s("if(%s!=null&&m.hasOwnProperty(%j)){",p,n.name);
if(n.map)s("if(!util.isObject(%s))",p)("return%j",t(n,"object"))("var k=Object.keys(%s)",p)("for(var i=0;i<k.length;++i){"),h(s,n,"k[i]"),r(s,n,o,p+"[k[i]]")("}");
else if(n.repeated)s("if(!Array.isArray(%s))",p)("return%j",t(n,"array"))("for(var i=0;i<%s.length;++i){",p),r(s,n,o,p+"[i]")("}");
else{if(n.partOf){var _=e.safeProp(n.partOf.name);
if(l[n.partOf.name]===1)s("if(p%s===1)",_)("return%j",n.partOf.name+": multiple values");
l[n.partOf.name]=1,s("p%s=1",_)}r(s,n,o,p)}if(n.optional)s("}")}return s("return null")}}
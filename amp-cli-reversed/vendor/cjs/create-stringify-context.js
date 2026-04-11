// Module: create-stringify-context
// Original: wN
// Type: CJS (RT wrapper)
// Exports: createStringifyContext, stringify
// Category: util

// Module: wN (CJS)
(T)=>{var R=H9T(),a=x8(),e=MN(),t=DN();
function r(s,A){let l=Object.assign({blockQuote:!0,commentString:e.stringifyComment,defaultKeyType:null,defaultStringType:"PLAIN",directives:null,doubleQuotedAsJSON:!1,doubleQuotedMinMultiLineLength:40,falseStr:"false",flowCollectionPadding:!0,indentSeq:!0,lineWidth:80,minContentWidth:20,nullStr:"null",simpleKeys:!1,singleQuote:null,trueStr:"true",verifyAliasOrder:!0},s.schema.toStringOptions,A),o;
switch(l.collectionStyle){case"block":o=!1;
break;
case"flow":o=!0;
break;
default:o=null}return{anchors:new Set,doc:s,flowCollectionPadding:l.flowCollectionPadding?" ":"",indent:"",indentStep:typeof l.indent==="number"?" ".repeat(l.indent):"  ",inFlow:o,options:l}}function h(s,A){if(A.tag){let n=s.filter((p)=>p.tag===A.tag);
if(n.length>0)return n.find((p)=>p.format===A.format)??n[0]}let l=void 0,o;
if(a.isScalar(A)){o=A.value;
let n=s.filter((p)=>p.identify?.(o));
if(n.length>1){let p=n.filter((_)=>_.test);
if(p.length>0)n=p}l=n.find((p)=>p.format===A.format)??n.find((p)=>!p.format)}else o=A,l=s.find((n)=>n.nodeClass&&o instanceof n.nodeClass);
if(!l){let n=o?.constructor?.name??(o===null?"null":typeof o);
throw Error(`Tag not resolved for ${n} value`)}return l}function i(s,A,{anchors:l,doc:o}){if(!o.directives)return"";let n=[],p=(a.isScalar(s)||a.isCollection(s))&&s.anchor;if(p&&R.anchorIsValid(p))l.add(p),n.push(`&${p}`);let _=s.tag??(A.default?null:A.tag);if(_)n.push(o.directives.tagString(_));return n.join(" ")}function c(s,A,l,o){if(a.isPair(s))return s.toString(A,l,o);if(a.isAlias(s)){if(A.doc.directives)return s.toString(A);if(A.resolvedAliases?.has(s))throw TypeError("Cannot stringify circular structure without alias nodes");else{if(A.resolvedAliases)A.resolvedAliases.add(s);else A.resolvedAliases=new Set([s]);s=s.resolve(A.doc)}}let n=void 0,p=a.isNode(s)?s:A.doc.createNode(s,{onTagObj:(b)=>n=b});n??(n=h(A.doc.schema.tags,p));let _=i(p,n,A);if(_.length>0)A.indentAtStart=(A.indentAtStart??0)+_.length+1;let m=typeof n.stringify==="function"?n.stringify(p,A,l,o):a.isScalar(p)?t.stringifyString(p,A,l,o):p.toString(A,l,o);if(!_)return m;return a.isScalar(p)||m[0]==="{"||m[0]==="["?`${_} ${m}`:`${_}
${A.indent}${m}`}T.createStringifyContext=r,T.stringify=c}
// Module: add-pair-to-js-map
// Original: ODT
// Type: CJS (RT wrapper)
// Exports: addPairToJSMap
// Category: util

// Module: ODT (CJS)
(T)=>{var R=SDT(),a=z9T(),e=wN(),t=x8(),r=ym();
function h(c,s,{key:A,value:l}){if(t.isNode(A)&&A.addToJSMap)A.addToJSMap(c,s,l);
else if(a.isMergeKey(c,A))a.addMergeToJSMap(c,s,l);
else{let o=r.toJS(A,"",c);
if(s instanceof Map)s.set(o,r.toJS(l,o,c));
else if(s instanceof Set)s.add(o);
else{let n=i(A,o,c),p=r.toJS(l,n,c);
if(n in s)Object.defineProperty(s,n,{value:p,writable:!0,enumerable:!0,configurable:!0});
else s[n]=p}}return s}function i(c,s,A){if(s===null)return"";
if(typeof s!=="object")return String(s);
if(t.isNode(c)&&A?.doc){let l=e.createStringifyContext(A.doc,{});
l.anchors=new Set;
for(let n of A.anchors.keys())l.anchors.add(n.anchor);
l.inFlow=!0,l.inStringifyKey=!0;
let o=c.toString(l);
if(!A.mapKeyWarned){let n=JSON.stringify(o);
if(n.length>40)n=n.substring(0,36)+'..."';
R.warn(A.doc.options.logLevel,`Keys with collection values will be stringified due to JS Object restrictions: ${n}. Set mapAsMap: true to use object keys.`),A.mapKeyWarned=!0}return o}return JSON.stringify(s)}T.addPairToJSMap=h}
// Module: yaml-map
// Original: km
// Type: CJS (RT wrapper)
// Exports: YAMLMap, findPair
// Category: util

// Module: km (CJS)
(T)=>{var R=dDT(),a=ODT(),e=q9T(),t=x8(),r=Pm(),h=Qa();
function i(s,A){let l=t.isScalar(A)?A.value:A;
for(let o of s)if(t.isPair(o)){if(o.key===A||o.key===l)return o;
if(t.isScalar(o.key)&&o.key.value===l)return o}return}class c extends e.Collection{static get tagName(){return"tag:yaml.org,2002:map"}constructor(s){super(t.MAP,s);
this.items=[]}static from(s,A,l){let{keepUndefined:o,replacer:n}=l,p=new this(s),_=(m,b)=>{if(typeof n==="function")b=n.call(A,m,b);
else if(Array.isArray(n)&&!n.includes(m))return;
if(b!==void 0||o)p.items.push(r.createPair(m,b,l))};
if(A instanceof Map)for(let[m,b]of A)_(m,b);
else if(A&&typeof A==="object")for(let m of Object.keys(A))_(m,A[m]);
if(typeof s.sortMapEntries==="function")p.items.sort(s.sortMapEntries);
return p}add(s,A){let l;
if(t.isPair(s))l=s;
else if(!s||typeof s!=="object"||!("key"in s))l=new r.Pair(s,s?.value);
else l=new r.Pair(s.key,s.value);
let o=i(this.items,l.key),n=this.schema?.sortMapEntries;
if(o){if(!A)throw Error(`Key ${l.key} already set`);if(t.isScalar(o.value)&&h.isScalarValue(l.value))o.value.value=l.value;else o.value=l.value}else if(n){let p=this.items.findIndex((_)=>n(l,_)<0);if(p===-1)this.items.push(l);else this.items.splice(p,0,l)}else this.items.push(l)}delete(s){let A=i(this.items,s);if(!A)return!1;return this.items.splice(this.items.indexOf(A),1).length>0}get(s,A){let l=i(this.items,s)?.value;return(!A&&t.isScalar(l)?l.value:l)??void 0}has(s){return!!i(this.items,s)}set(s,A){this.add(new r.Pair(s,A),!0)}toJSON(s,A,l){let o=l?new l:A?.mapAsMap?new Map:{};if(A?.onCreate)A.onCreate(o);for(let n of this.items)a.addPairToJSMap(A,o,n);return o}toString(s,A,l){if(!s)return JSON.stringify(this);for(let o of this.items)if(!t.isPair(o))throw Error(`Map items must all be pairs;
 found ${JSON.stringify(o)} instead`);if(!s.allNullValues&&this.hasAllNullValues(!1))s=Object.assign({},s,{allNullValues:!0});return R.stringifyCollection(this,s,{blockItemPrefix:"",flowChars:{start:"{",end:"}"},itemIndent:s.indent||"",onChompKeep:l,onComment:A})}}T.YAMLMap=c,T.findPair=i}
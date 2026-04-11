// Module: yaml-seq
// Original: xm
// Type: CJS (RT wrapper)
// Exports: YAMLSeq
// Category: util

// Module: xm (CJS)
(T)=>{var R=LN(),a=dDT(),e=q9T(),t=x8(),r=Qa(),h=ym();
class i extends e.Collection{static get tagName(){return"tag:yaml.org,2002:seq"}constructor(s){super(t.SEQ,s);
this.items=[]}add(s){this.items.push(s)}delete(s){let A=c(s);
if(typeof A!=="number")return!1;
return this.items.splice(A,1).length>0}get(s,A){let l=c(s);
if(typeof l!=="number")return;
let o=this.items[l];
return!A&&t.isScalar(o)?o.value:o}has(s){let A=c(s);
return typeof A==="number"&&A<this.items.length}set(s,A){let l=c(s);
if(typeof l!=="number")throw Error(`Expected a valid index, not ${s}.`);let o=this.items[l];if(t.isScalar(o)&&r.isScalarValue(A))o.value=A;else this.items[l]=A}toJSON(s,A){let l=[];if(A?.onCreate)A.onCreate(l);let o=0;for(let n of this.items)l.push(h.toJS(n,String(o++),A));return l}toString(s,A,l){if(!s)return JSON.stringify(this);return a.stringifyCollection(this,s,{blockItemPrefix:"- ",flowChars:{start:"[",end:"]"},itemIndent:(s.indent||"")+"  ",onChompKeep:l,onComment:A})}static from(s,A,l){let{replacer:o}=l,n=new this(s);if(A&&Symbol.iterator in Object(A)){let p=0;for(let _ of A){if(typeof o==="function"){let m=A instanceof Set?_:String(p++);_=o.call(A,m,_)}n.items.push(R.createNode(_,void 0,l))}}return n}}function c(s){let A=t.isScalar(s)?s.value:s;if(A&&typeof A==="string")A=Number(A);return typeof A==="number"&&Number.isInteger(A)&&A>=0?A:null}T.YAMLSeq=i}
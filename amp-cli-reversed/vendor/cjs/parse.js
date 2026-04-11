// Module: parse
// Original: ekR
// Type: CJS (RT wrapper)
// Exports: parse, parseAllDocuments, parseDocument, stringify
// Category: util

// Module: ekR (CJS)
(T)=>{var R=zDT(),a=NN(),e=UN(),t=SDT(),r=x8(),h=GDT(),i=KDT();
function c(n){let p=n.prettyErrors!==!1;
return{lineCounter:n.lineCounter||p&&new h.LineCounter||null,prettyErrors:p}}function s(n,p={}){let{lineCounter:_,prettyErrors:m}=c(p),b=new i.Parser(_?.addNewLine),y=new R.Composer(p),u=Array.from(y.compose(b.parse(n)));
if(m&&_)for(let P of u)P.errors.forEach(e.prettifyError(n,_)),P.warnings.forEach(e.prettifyError(n,_));
if(u.length>0)return u;
return Object.assign([],{empty:!0},y.streamInfo())}function A(n,p={}){let{lineCounter:_,prettyErrors:m}=c(p),b=new i.Parser(_?.addNewLine),y=new R.Composer(p),u=null;
for(let P of y.compose(b.parse(n),!0,n.length))if(!u)u=P;
else if(u.options.logLevel!=="silent"){u.errors.push(new e.YAMLParseError(P.range.slice(0,2),"MULTIPLE_DOCS","Source contains multiple documents; please use YAML.parseAllDocuments()"));
break}if(m&&_)u.errors.forEach(e.prettifyError(n,_)),u.warnings.forEach(e.prettifyError(n,_));
return u}function l(n,p,_){let m=void 0;
if(typeof p==="function")m=p;
else if(_===void 0&&p&&typeof p==="object")_=p;
let b=A(n,_);
if(!b)return null;
if(b.warnings.forEach((y)=>t.warn(b.options.logLevel,y)),b.errors.length>0)if(b.options.logLevel!=="silent")throw b.errors[0];
else b.errors=[];
return b.toJS(Object.assign({reviver:m},_))}function o(n,p,_){let m=null;
if(typeof p==="function"||Array.isArray(p))m=p;
else if(_===void 0&&p)_=p;
if(typeof _==="string")_=_.length;
if(typeof _==="number"){let b=Math.round(_);
_=b<1?void 0:b>8?{indent:8}:{indent:b}}if(n===void 0){let{keepUndefined:b}=_??p??{};
if(!b)return}if(r.isDocument(n)&&!m)return n.toString(_);
return new a.Document(n,m,_).toString(_)}T.parse=l,T.parseAllDocuments=s,T.parseDocument=A,T.stringify=o}
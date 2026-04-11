// Module: resolve-block-map
// Original: GPR
// Type: CJS (RT wrapper)
// Exports: resolveBlockMap
// Category: util

// Module: GPR (CJS)
(T)=>{var R=Pm(),a=km(),e=HN(),t=K9T(),r=UDT(),h=HDT(),i="All mapping items must start at the same column";
function c({composeNode:s,composeEmptyNode:A},l,o,n,p){let _=new(p?.nodeClass??a.YAMLMap)(l.schema);
if(l.atRoot)l.atRoot=!1;
let m=o.offset,b=null;
for(let y of o.items){let{start:u,key:P,sep:k,value:x}=y,f=e.resolveProps(u,{indicator:"explicit-key-ind",next:P??k?.[0],offset:m,onError:n,parentIndent:o.indent,startOnNewline:!0}),v=!f.found;
if(v){if(P){if(P.type==="block-seq")n(m,"BLOCK_AS_IMPLICIT_KEY","A block sequence may not be used as an implicit map key");
else if("indent"in P&&P.indent!==o.indent)n(m,"BAD_INDENT",i)}if(!f.anchor&&!f.tag&&!k){if(b=f.end,f.comment)if(_.comment)_.comment+=`
`+f.comment;
else _.comment=f.comment;
continue}if(f.newlineAfterProp||t.containsNewline(P))n(P??u[u.length-1],"MULTILINE_IMPLICIT_KEY","Implicit keys need to be on a single line")}else if(f.found?.indent!==o.indent)n(m,"BAD_INDENT",i);
l.atKey=!0;
let g=f.end,I=P?s(l,P,f,n):A(l,g,u,null,f,n);
if(l.schema.compat)r.flowIndentCheck(o.indent,P,n);
if(l.atKey=!1,h.mapIncludes(l,_.items,I))n(g,"DUPLICATE_KEY","Map keys must be unique");
let S=e.resolveProps(k??[],{indicator:"map-value-ind",next:x,offset:I.range[2],onError:n,parentIndent:o.indent,startOnNewline:!P||P.type==="block-scalar"});
if(m=S.end,S.found){if(v){if(x?.type==="block-map"&&!S.hasNewline)n(m,"BLOCK_AS_IMPLICIT_KEY","Nested mappings are not allowed in compact mappings");
if(l.options.strict&&f.start<S.found.offset-1024)n(I.range,"KEY_OVER_1024_CHARS","The : indicator must be at most 1024 chars after the start of an implicit block mapping key")}let O=x?s(l,x,S,n):A(l,m,k,null,S,n);
if(l.schema.compat)r.flowIndentCheck(o.indent,x,n);
m=O.range[2];
let j=new R.Pair(I,O);
if(l.options.keepSourceTokens)j.srcToken=y;
_.items.push(j)}else{if(v)n(I.range,"MISSING_CHAR","Implicit map keys need to be followed by map values");
if(S.comment)if(I.comment)I.comment+=`
`+S.comment;
else I.comment=S.comment;
let O=new R.Pair(I);
if(l.options.keepSourceTokens)O.srcToken=y;
_.items.push(O)}}if(b&&b<m)n(b,"IMPOSSIBLE","Map comment with trailing content");
return _.range=[o.offset,m,b??m],_}T.resolveBlockMap=c}
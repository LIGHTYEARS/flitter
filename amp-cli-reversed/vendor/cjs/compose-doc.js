// Module: compose-doc
// Original: JPR
// Type: CJS (RT wrapper)
// Exports: composeDoc
// Category: util

// Module: JPR (CJS)
(T)=>{var R=NN(),a=ZPR(),e=pO(),t=HN();
function r(h,i,{offset:c,start:s,value:A,end:l},o){let n=Object.assign({_directives:i},h),p=new R.Document(void 0,n),_={atKey:!1,atRoot:!0,directives:p.directives,options:p.options,schema:p.schema},m=t.resolveProps(s,{indicator:"doc-start",next:A??l?.[0],offset:c,onError:o,parentIndent:0,startOnNewline:!0});
if(m.found){if(p.directives.docStart=!0,A&&(A.type==="block-map"||A.type==="block-seq")&&!m.hasNewline)o(m.end,"MISSING_CHAR","Block collection cannot start on same line with directives-end marker")}p.contents=A?a.composeNode(_,A,m,o):a.composeEmptyNode(_,m.end,s,null,m,o);
let b=p.contents.range[2],y=e.resolveEnd(l,b,!1,o);
if(y.comment)p.comment=y.comment;
return p.range=[c,b,y.offset],p}T.composeDoc=r}
// Module: resolve-block-seq
// Original: KPR
// Type: CJS (RT wrapper)
// Exports: resolveBlockSeq
// Category: util

// Module: KPR (CJS)
(T)=>{var R=xm(),a=HN(),e=UDT();
function t({composeNode:r,composeEmptyNode:h},i,c,s,A){let l=new(A?.nodeClass??R.YAMLSeq)(i.schema);
if(i.atRoot)i.atRoot=!1;
if(i.atKey)i.atKey=!1;
let o=c.offset,n=null;
for(let{start:p,value:_}of c.items){let m=a.resolveProps(p,{indicator:"seq-item-ind",next:_,offset:o,onError:s,parentIndent:c.indent,startOnNewline:!0});
if(!m.found)if(m.anchor||m.tag||_)if(_?.type==="block-seq")s(m.end,"BAD_INDENT","All sequence items must start at the same column");
else s(o,"MISSING_CHAR","Sequence item without - indicator");
else{if(n=m.end,m.comment)l.comment=m.comment;
continue}let b=_?r(i,_,m,s):h(i,m.end,p,null,m,s);
if(i.schema.compat)e.flowIndentCheck(c.indent,_,s);
o=b.range[2],l.items.push(b)}return l.range=[c.offset,o,n??o],l}T.resolveBlockSeq=t}
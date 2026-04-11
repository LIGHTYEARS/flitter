// Module: yaml-error
// Original: UN
// Type: CJS (RT wrapper)
// Exports: YAMLError, YAMLParseError, YAMLWarning, prettifyError
// Category: util

// Module: UN (CJS)
(T)=>{class R extends Error{constructor(r,h,i,c){super();
this.name=r,this.code=i,this.message=c,this.pos=h}}class a extends R{constructor(r,h,i){super("YAMLParseError",r,h,i)}}class e extends R{constructor(r,h,i){super("YAMLWarning",r,h,i)}}var t=(r,h)=>(i)=>{if(i.pos[0]===-1)return;
i.linePos=i.pos.map((o)=>h.linePos(o));
let{line:c,col:s}=i.linePos[0];
i.message+=` at line ${c}, column ${s}`;let A=s-1,l=r.substring(h.lineStarts[c-1],h.lineStarts[c]).replace(/[\n\r]+$/,"");if(A>=60&&l.length>80){let o=Math.min(A-39,l.length-79);l="\u2026"+l.substring(o),A-=o-1}if(l.length>80)l=l.substring(0,79)+"\u2026";if(c>1&&/^ *$/.test(l.substring(0,A))){let o=r.substring(h.lineStarts[c-2],h.lineStarts[c-1]);if(o.length>80)o=o.substring(0,79)+`\u2026
`;
l=o+l}if(/[^ ]/.test(l)){let o=1,n=i.linePos[1];
if(n?.line===c&&n.col>s)o=Math.max(1,Math.min(n.col-s,80-A));
let p=" ".repeat(A)+"^".repeat(o);
i.message+=`:

${l}
${p}
`}};T.YAMLError=R,T.YAMLParseError=a,T.YAMLWarning=e,T.prettifyError=t}
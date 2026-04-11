// Module: stringify-pair
// Original: wPR
// Type: CJS (RT wrapper)
// Exports: stringifyPair
// Category: util

// Module: wPR (CJS)
(T)=>{var R=x8(),a=Qa(),e=wN(),t=MN();
function r({key:h,value:i},c,s,A){let{allNullValues:l,doc:o,indent:n,indentStep:p,options:{commentString:_,indentSeq:m,simpleKeys:b}}=c,y=R.isNode(h)&&h.comment||null;
if(b){if(y)throw Error("With simple keys, key nodes cannot have comments");
if(R.isCollection(h)||!R.isNode(h)&&typeof h==="object")throw Error("With simple keys, collection cannot be used as a key value")}let u=!b&&(!h||y&&i==null&&!c.inFlow||R.isCollection(h)||(R.isScalar(h)?h.type===a.Scalar.BLOCK_FOLDED||h.type===a.Scalar.BLOCK_LITERAL:typeof h==="object"));
c=Object.assign({},c,{allNullValues:!1,implicitKey:!u&&(b||!l),indent:n+p});
let P=!1,k=!1,x=e.stringify(h,c,()=>P=!0,()=>k=!0);
if(!u&&!c.inFlow&&x.length>1024){if(b)throw Error("With simple keys, single line scalar must not span more than 1024 characters");
u=!0}if(c.inFlow){if(l||i==null){if(P&&s)s();
return x===""?"?":u?`? ${x}`:x}}else if(l&&!b||i==null&&u){if(x=`? ${x}`,y&&!P)x+=t.lineComment(x,c.indent,_(y));else if(k&&A)A();return x}if(P)y=null;if(u){if(y)x+=t.lineComment(x,c.indent,_(y));x=`? ${x}
${n}:`}else if(x=`${x}:`,y)x+=t.lineComment(x,c.indent,_(y));let f,v,g;if(R.isNode(i))f=!!i.spaceBefore,v=i.commentBefore,g=i.comment;else if(f=!1,v=null,g=null,i&&typeof i==="object")i=o.createNode(i);if(c.implicitKey=!1,!u&&!y&&R.isScalar(i))c.indentAtStart=x.length+1;if(k=!1,!m&&p.length>=2&&!c.inFlow&&!u&&R.isSeq(i)&&!i.flow&&!i.tag&&!i.anchor)c.indent=c.indent.substring(2);let I=!1,S=e.stringify(i,c,()=>I=!0,()=>k=!0),O=" ";if(y||f||v){if(O=f?`
`:"",v){let j=_(v);O+=`
${t.indentComment(j,c.indent)}`}if(S===""&&!c.inFlow){if(O===`
`&&g)O=`

`}else O+=`
${c.indent}`}else if(!u&&R.isCollection(i)){let j=S[0],d=S.indexOf(`
`),C=d!==-1,L=c.inFlow??i.flow??i.items.length===0;if(C||!L){let w=!1;if(C&&(j==="&"||j==="!")){let D=S.indexOf(" ");if(j==="&"&&D!==-1&&D<d&&S[D+1]==="!")D=S.indexOf(" ",D+1);if(D===-1||d<D)w=!0}if(!w)O=`
${c.indent}`}}else if(S===""||S[0]===`
`)O="";if(x+=O+S,c.inFlow){if(I&&s)s()}else if(g&&!I)x+=t.lineComment(x,c.indent,_(g));else if(k&&A)A();return x}T.stringifyPair=r}
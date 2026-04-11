// Module: unknown-xvT
// Original: xvT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: xvT (CJS)
(T,R)=>{R.exports=o;
var a=/[\s{}=;
:[\],'"()<>]/g,e=/(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,t=/(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g,r=/^ *[*/]+ */,h=/^\s*\*?\/*/,i=/\n/g,c=/\s/,s=/\\(.?)/g,A={"0":"\x00",r:"\r",n:`
`,t:"\t"};function l(n){return n.replace(s,function(p,_){switch(_){case"\\":case"":return _;default:return A[_]||""}})}o.unescape=l;function o(n,p){n=n.toString();var _=0,m=n.length,b=1,y=0,u={},P=[],k=null;function x(w){return Error("illegal "+w+" (line "+b+")")}function f(){var w=k==="'"?t:e;w.lastIndex=_-1;var D=w.exec(n);if(!D)throw x("string");return _=w.lastIndex,j(k),k=null,l(D[1])}function v(w){return n.charAt(w)}function g(w,D,B){var M={type:n.charAt(w++),lineEmpty:!1,leading:B},V;if(p)V=2;else V=3;var Q=w-V,W;do if(--Q<0||(W=n.charAt(Q))===`
`){M.lineEmpty=!0;break}while(W===" "||W==="\t");var eT=n.substring(w,D).split(i);for(var iT=0;iT<eT.length;++iT)eT[iT]=eT[iT].replace(p?h:r,"").trim();M.text=eT.join(`
`).trim(),u[b]=M,y=b}function I(w){var D=S(w),B=n.substring(w,D),M=/^\s*\/\//.test(B);return M}function S(w){var D=w;while(D<m&&v(D)!==`
`)D++;return D}function O(){if(P.length>0)return P.shift();if(k)return f();var w,D,B,M,V,Q=_===0;do{if(_===m)return null;w=!1;while(c.test(B=v(_))){if(B===`
`)Q=!0,++b;if(++_===m)return null}if(v(_)==="/"){if(++_===m)throw x("comment");if(v(_)==="/")if(!p){V=v(M=_+1)==="/";while(v(++_)!==`
`)if(_===m)return null;if(++_,V)g(M,_-1,Q),Q=!0;++b,w=!0}else{if(M=_,V=!1,I(_-1)){V=!0;do{if(_=S(_),_===m)break;if(_++,!Q)break}while(I(_))}else _=Math.min(m,S(_)+1);if(V)g(M,_,Q),Q=!0;b++,w=!0}else if((B=v(_))==="*"){M=_+1,V=p||v(M)==="*";do{if(B===`
`)++b;if(++_===m)throw x("comment");D=B,B=v(_)}while(D!=="*"||B!=="/");if(++_,V)g(M,_-2,Q),Q=!0;w=!0}else return"/"}}while(w);var W=_;a.lastIndex=0;var eT=a.test(v(W++));if(!eT)while(W<m&&!a.test(v(W)))++W;var iT=n.substring(_,_=W);if(iT==='"'||iT==="'")k=iT;return iT}function j(w){P.push(w)}function d(){if(!P.length){var w=O();if(w===null)return null;j(w)}return P[0]}function C(w,D){var B=d(),M=B===w;if(M)return O(),!0;if(!D)throw x("token '"+B+"', '"+w+"' expected");return!1}function L(w){var D=null,B;if(w===void 0){if(B=u[b-1],delete u[b-1],B&&(p||B.type==="*"||B.lineEmpty))D=B.leading?B.text:null}else{if(y<w)d();if(B=u[w],delete u[w],B&&!B.lineEmpty&&(p||B.type==="/"))D=B.leading?null:B.text}return D}return Object.defineProperty({next:O,peek:d,push:j,skip:C,cmnt:L},"line",{get:function(){return b}})}}
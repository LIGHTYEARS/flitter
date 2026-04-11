// Module: fold-block
// Original: DPR
// Type: CJS (RT wrapper)
// Exports: FOLD_BLOCK, FOLD_FLOW, FOLD_QUOTED, foldFlowLines
// Category: util

// Module: DPR (CJS)
(T)=>{function R(e,t,r="flow",{indentAtStart:h,lineWidth:i=80,minContentWidth:c=20,onFold:s,onOverflow:A}={}){if(!i||i<0)return e;
if(i<c)c=0;
let l=Math.max(1+c,1+i-t.length);
if(e.length<=l)return e;
let o=[],n={},p=i-t.length;
if(typeof h==="number")if(h>i-Math.max(2,c))o.push(0);
else p=i-h;
let _=void 0,m=void 0,b=!1,y=-1,u=-1,P=-1;
if(r==="block"){if(y=a(e,y,t.length),y!==-1)p=y+l}for(let x;
x=e[y+=1];
){if(r==="quoted"&&x==="\\"){switch(u=y,e[y+1]){case"x":y+=3;
break;
case"u":y+=5;
break;
case"U":y+=9;
break;
default:y+=1}P=y}if(x===`
`){if(r==="block")y=a(e,y,t.length);
p=y+t.length+l,_=void 0}else{if(x===" "&&m&&m!==" "&&m!==`
`&&m!=="\t"){let f=e[y+1];
if(f&&f!==" "&&f!==`
`&&f!=="\t")_=y}if(y>=p)if(_)o.push(_),p=_+l,_=void 0;
else if(r==="quoted"){while(m===" "||m==="\t")m=x,x=e[y+=1],b=!0;
let f=y>P+1?y-2:u-1;
if(n[f])return e;
o.push(f),n[f]=!0,p=f+l,_=void 0}else b=!0}m=x}if(b&&A)A();
if(o.length===0)return e;
if(s)s();
let k=e.slice(0,o[0]);
for(let x=0;
x<o.length;
++x){let f=o[x],v=o[x+1]||e.length;
if(f===0)k=`
${t}${e.slice(0,v)}`;else{if(r==="quoted"&&n[f])k+=`${e[f]}\\`;k+=`
${t}${e.slice(f+1,v)}`}}return k}function a(e,t,r){let h=t,i=t+1,c=e[i];while(c===" "||c==="\t")if(t<i+r)c=e[++t];else{do c=e[++t];while(c&&c!==`
`);h=t,i=t+1,c=e[i]}return h}T.FOLD_BLOCK="block",T.FOLD_FLOW="flow",T.FOLD_QUOTED="quoted",T.foldFlowLines=R}
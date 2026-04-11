// Module: text-utf8-utils
// Original: P9T
// Type: ESM (PT wrapper)
// Exports: A, Mb, a, c, e, h, i, l, n, o, s, t
// Category: util

// Module: P9T (ESM)
()=>{Zs(),rR(),Mb=class T{static encoder=new TextEncoder;
static utf8Clamp(R,a){let e=0,t=R.length;
while(e<t){let r=e+t+1>>1;
if(T.encoder.encode(R.slice(0,r)).length<=a)e=r;
else t=r-1}return T.safeTruncate(R,e)}static utf8ClampFromEnd(R,a){let e=0,t=R.length;
while(e<t){let r=Math.floor((e+t)/2),h=R.slice(r);
if(T.encoder.encode(h).length<=a)t=r;
else e=r+1}return T.safeTruncateStart(R.slice(e))}static safeTruncateStart(R){if(R.length===0)return R;
let a=0;
if(R.charCodeAt(0)>=56320&&R.charCodeAt(0)<=57343)a=1;
while(a<R.length){let e=R.charCodeAt(a);
if(e>=768&&e<=879||e>=6832&&e<=6911||e>=7616&&e<=7679||e>=8400&&e<=8447||e>=65056&&e<=65071)a++;
else break}return R.slice(a)}static safeTruncate(R,a){if(a>=R.length)return R;
if(a<=0)return"";
if(a>0&&a<R.length){let e=R.charCodeAt(a-1),t=R.charCodeAt(a);
if(e>=55296&&e<=56319&&t>=56320&&t<=57343)a--}while(a<R.length){let e=R.charCodeAt(a);
if(e>=768&&e<=879||e>=6832&&e<=6911||e>=7616&&e<=7679||e>=8400&&e<=8447||e>=65056&&e<=65071){if(a--,a<=0)break}else break}return R.slice(0,a)}static bufferByteLengthCompat(R){return T.encoder.encode(R).length}static pruneWideLine(R,a=4096,e="ellipsis"){let t=T.bufferByteLengthCompat(R);
if(t<=a)return R;
switch(e){case"hard-cutoff":return T.utf8Clamp(R,a);
case"ellipsis":{let r=T.utf8Clamp(R,a),h=t-T.bufferByteLengthCompat(r);
return`${r}\u2026[+${Math.round(h/1024)}KB]`}case"mid-ellipsis":{if(a<20)return T.pruneWideLine(R,a,"ellipsis");let r=Math.max(10,a-50),h=Math.floor(r/2),i=T.utf8Clamp(R,h),c=Math.floor(h/2),s=T.utf8ClampFromEnd(R,c),A=t-T.bufferByteLengthCompat(i+s),l=`${i}\u2026[${Math.round(A/1024)}KB]\u2026${s}`;if(T.bufferByteLengthCompat(l)>a)return T.pruneWideLine(R,a,"ellipsis");return l}case"line-aware":return T.pruneWideLine(R,a,"ellipsis")}}static normalizeText(R){if(R.charCodeAt(0)===65279)R=R.slice(1);return R=R.replace(/\r\n?/g,`
`),R}static processText(R,a={}){let{truncationStrategy:e="ellipsis",maxLineBytes:t=$bR,maxLines:r,addLineNumbers:h=!1}=a,i=T.normalizeText(R).split(`
`),c=i[i.length-1]===""?i.slice(0,-1):i,s=c.map((l,o)=>({line:l,originalLineNumber:o+1}));if(r&&c.length>r){let l=Math.floor(r/2),o=l+1,n=c.length-l;s=[...s.slice(0,l),{line:`[... omitted lines ${o} to ${n} ...]`,originalLineNumber:null},...s.slice(-l)]}let A=s.map(({line:l,originalLineNumber:o})=>({line:o===null?l:T.pruneWideLine(l,t,e),originalLineNumber:o}));if(h)return A.map(({line:l,originalLineNumber:o})=>{if(o===null)return l;return`${o}: ${l}`}).join(`
`);return A.map(({line:l})=>l).join(`
`)}}}
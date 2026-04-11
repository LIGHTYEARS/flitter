// Module: unknown-tO
// Original: tO
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: tO (CJS)
(T,R)=>{var{isUtf8:a}=qT("buffer"),{hasBlob:e}=GA(),t=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,0,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0];
function r(c){return c>=1000&&c<=1014&&c!==1004&&c!==1005&&c!==1006||c>=3000&&c<=4999}function h(c){let s=c.length,A=0;
while(A<s)if((c[A]&128)===0)A++;
else if((c[A]&224)===192){if(A+1===s||(c[A+1]&192)!==128||(c[A]&254)===192)return!1;
A+=2}else if((c[A]&240)===224){if(A+2>=s||(c[A+1]&192)!==128||(c[A+2]&192)!==128||c[A]===224&&(c[A+1]&224)===128||c[A]===237&&(c[A+1]&224)===160)return!1;
A+=3}else if((c[A]&248)===240){if(A+3>=s||(c[A+1]&192)!==128||(c[A+2]&192)!==128||(c[A+3]&192)!==128||c[A]===240&&(c[A+1]&240)===128||c[A]===244&&c[A+1]>143||c[A]>244)return!1;
A+=4}else return!1;
return!0}function i(c){return e&&typeof c==="object"&&typeof c.arrayBuffer==="function"&&typeof c.type==="string"&&typeof c.stream==="function"&&(c[Symbol.toStringTag]==="Blob"||c[Symbol.toStringTag]==="File")}if(R.exports={isBlob:i,isValidStatusCode:r,isValidUTF8:h,tokenChars:t},a)R.exports.isValidUTF8=function(c){return c.length<24?h(c):a(c)};
else if(!process.env.WS_NO_UTF_8_VALIDATE)try{let c=bpR();
R.exports.isValidUTF8=function(s){return s.length<32?h(s):c(s)}}catch(c){}}
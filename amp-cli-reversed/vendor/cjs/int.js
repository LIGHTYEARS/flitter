// Module: int
// Original: LDT
// Type: CJS (RT wrapper)
// Exports: int, intHex, intOct
// Category: util

// Module: LDT (CJS)
(T)=>{var R=AO(),a=(c)=>typeof c==="bigint"||Number.isInteger(c),e=(c,s,A,{intAsBigInt:l})=>l?BigInt(c):parseInt(c.substring(s),A);
function t(c,s,A){let{value:l}=c;
if(a(l)&&l>=0)return A+l.toString(s);
return R.stringifyNumber(c)}var r={identify:(c)=>a(c)&&c>=0,default:!0,tag:"tag:yaml.org,2002:int",format:"OCT",test:/^0o[0-7]+$/,resolve:(c,s,A)=>e(c,2,8,A),stringify:(c)=>t(c,8,"0o")},h={identify:a,default:!0,tag:"tag:yaml.org,2002:int",test:/^[-+]?[0-9]+$/,resolve:(c,s,A)=>e(c,0,10,A),stringify:R.stringifyNumber},i={identify:(c)=>a(c)&&c>=0,default:!0,tag:"tag:yaml.org,2002:int",format:"HEX",test:/^0x[0-9a-fA-F]+$/,resolve:(c,s,A)=>e(c,2,16,A),stringify:(c)=>t(c,16,"0x")};
T.int=h,T.intHex=i,T.intOct=r}
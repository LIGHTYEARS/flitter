// Module: float-time
// Original: BDT
// Type: CJS (RT wrapper)
// Exports: floatTime, intTime, timestamp
// Category: util

// Module: BDT (CJS)
(T)=>{var R=AO();
function a(i,c){let s=i[0],A=s==="-"||s==="+"?i.substring(1):i,l=(n)=>c?BigInt(n):Number(n),o=A.replace(/_/g,"").split(":").reduce((n,p)=>n*l(60)+l(p),l(0));
return s==="-"?l(-1)*o:o}function e(i){let{value:c}=i,s=(n)=>n;
if(typeof c==="bigint")s=(n)=>BigInt(n);
else if(isNaN(c)||!isFinite(c))return R.stringifyNumber(i);
let A="";
if(c<0)A="-",c*=s(-1);
let l=s(60),o=[c%l];
if(c<60)o.unshift(0);
else if(c=(c-o[0])/l,o.unshift(c%l),c>=60)c=(c-o[0])/l,o.unshift(c);
return A+o.map((n)=>String(n).padStart(2,"0")).join(":").replace(/000000\d*$/,"")}var t={identify:(i)=>typeof i==="bigint"||Number.isInteger(i),default:!0,tag:"tag:yaml.org,2002:int",format:"TIME",test:/^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,resolve:(i,c,{intAsBigInt:s})=>a(i,s),stringify:e},r={identify:(i)=>typeof i==="number",default:!0,tag:"tag:yaml.org,2002:float",format:"TIME",test:/^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,resolve:(i)=>a(i,!1),stringify:e},h={identify:(i)=>i instanceof Date,default:!0,tag:"tag:yaml.org,2002:timestamp",test:RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),resolve(i){let c=i.match(h.test);
if(!c)throw Error("!!timestamp expects a date, starting with yyyy-mm-dd");
let[,s,A,l,o,n,p]=c.map(Number),_=c[7]?Number((c[7]+"00").substr(1,3)):0,m=Date.UTC(s,A-1,l,o||0,n||0,p||0,_),b=c[8];
if(b&&b!=="Z"){let y=a(b,!1);
if(Math.abs(y)<30)y*=60;
m-=60000*y}return new Date(m)},stringify:({value:i})=>i?.toISOString().replace(/(T00:00:00)?\.000Z$/,"")??""};
T.floatTime=r,T.intTime=t,T.timestamp=h}
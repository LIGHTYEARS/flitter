// Module: zod-checks-string-format
// Original: YJ
// Type: ESM (PT wrapper)
// Exports: $3, BJ, CJ, CW, DJ, EJ, FJ, Fy, GJ, HJ, KJ, LJ, MJ, NJ, QB, UJ, VJ, WJ, XJ, ZB, e, i, qJ, r, wJ, zJ
// Category: schema

// Module: YJ (ESM)
()=>{LS(),dJ(),X0(),$3=nR("$ZodCheck",(T,R)=>{var a;
T._zod??(T._zod={}),T._zod.def=R,(a=T._zod).onattach??(a.onattach=[])}),CW={number:"number",bigint:"bigint",object:"date"},QB=nR("$ZodCheckLessThan",(T,R)=>{$3.init(T,R);
let a=CW[typeof R.value];
T._zod.onattach.push((e)=>{let t=e._zod.bag,r=(R.inclusive?t.maximum:t.exclusiveMaximum)??Number.POSITIVE_INFINITY;
if(R.value<r)if(R.inclusive)t.maximum=R.value;
else t.exclusiveMaximum=R.value}),T._zod.check=(e)=>{if(R.inclusive?e.value<=R.value:e.value<R.value)return;
e.issues.push({origin:a,code:"too_big",maximum:typeof R.value==="object"?R.value.getTime():R.value,input:e.value,inclusive:R.inclusive,inst:T,continue:!R.abort})}}),ZB=nR("$ZodCheckGreaterThan",(T,R)=>{$3.init(T,R);
let a=CW[typeof R.value];
T._zod.onattach.push((e)=>{let t=e._zod.bag,r=(R.inclusive?t.minimum:t.exclusiveMinimum)??Number.NEGATIVE_INFINITY;
if(R.value>r)if(R.inclusive)t.minimum=R.value;
else t.exclusiveMinimum=R.value}),T._zod.check=(e)=>{if(R.inclusive?e.value>=R.value:e.value>R.value)return;
e.issues.push({origin:a,code:"too_small",minimum:typeof R.value==="object"?R.value.getTime():R.value,input:e.value,inclusive:R.inclusive,inst:T,continue:!R.abort})}}),EJ=nR("$ZodCheckMultipleOf",(T,R)=>{$3.init(T,R),T._zod.onattach.push((a)=>{var e;
(e=a._zod.bag).multipleOf??(e.multipleOf=R.value)}),T._zod.check=(a)=>{if(typeof a.value!==typeof R.value)throw Error("Cannot mix number and bigint in multiple_of check.");
if(typeof a.value==="bigint"?a.value%R.value===BigInt(0):WvT(a.value,R.value)===0)return;
a.issues.push({origin:typeof a.value,code:"not_multiple_of",divisor:R.value,input:a.value,inst:T,continue:!R.abort})}}),CJ=nR("$ZodCheckNumberFormat",(T,R)=>{$3.init(T,R),R.format=R.format||"float64";
let a=R.format?.includes("int"),e=a?"int":"number",[t,r]=XZ[R.format];
T._zod.onattach.push((h)=>{let i=h._zod.bag;
if(i.format=R.format,i.minimum=t,i.maximum=r,a)i.pattern=gJ}),T._zod.check=(h)=>{let i=h.value;
if(a){if(!Number.isInteger(i)){h.issues.push({expected:e,format:R.format,code:"invalid_type",continue:!1,input:i,inst:T});
return}if(!Number.isSafeInteger(i)){if(i>0)h.issues.push({input:i,code:"too_big",maximum:Number.MAX_SAFE_INTEGER,note:"Integers must be within the safe integer range.",inst:T,origin:e,inclusive:!0,continue:!R.abort});
else h.issues.push({input:i,code:"too_small",minimum:Number.MIN_SAFE_INTEGER,note:"Integers must be within the safe integer range.",inst:T,origin:e,inclusive:!0,continue:!R.abort});
return}}if(i<t)h.issues.push({origin:"number",input:i,code:"too_small",minimum:t,inclusive:!0,inst:T,continue:!R.abort});
if(i>r)h.issues.push({origin:"number",input:i,code:"too_big",maximum:r,inclusive:!0,inst:T,continue:!R.abort})}}),LJ=nR("$ZodCheckBigIntFormat",(T,R)=>{$3.init(T,R);
let[a,e]=YZ[R.format];
T._zod.onattach.push((t)=>{let r=t._zod.bag;
r.format=R.format,r.minimum=a,r.maximum=e}),T._zod.check=(t)=>{let r=t.value;
if(r<a)t.issues.push({origin:"bigint",input:r,code:"too_small",minimum:a,inclusive:!0,inst:T,continue:!R.abort});
if(r>e)t.issues.push({origin:"bigint",input:r,code:"too_big",maximum:e,inclusive:!0,inst:T,continue:!R.abort})}}),MJ=nR("$ZodCheckMaxSize",(T,R)=>{var a;
$3.init(T,R),(a=T._zod.def).when??(a.when=(e)=>{let t=e.value;
return!k_(t)&&t.size!==void 0}),T._zod.onattach.push((e)=>{let t=e._zod.bag.maximum??Number.POSITIVE_INFINITY;
if(R.maximum<t)e._zod.bag.maximum=R.maximum}),T._zod.check=(e)=>{let t=e.value;
if(t.size<=R.maximum)return;
e.issues.push({origin:oL(t),code:"too_big",maximum:R.maximum,inclusive:!0,input:t,inst:T,continue:!R.abort})}}),DJ=nR("$ZodCheckMinSize",(T,R)=>{var a;
$3.init(T,R),(a=T._zod.def).when??(a.when=(e)=>{let t=e.value;
return!k_(t)&&t.size!==void 0}),T._zod.onattach.push((e)=>{let t=e._zod.bag.minimum??Number.NEGATIVE_INFINITY;
if(R.minimum>t)e._zod.bag.minimum=R.minimum}),T._zod.check=(e)=>{let t=e.value;
if(t.size>=R.minimum)return;
e.issues.push({origin:oL(t),code:"too_small",minimum:R.minimum,inclusive:!0,input:t,inst:T,continue:!R.abort})}}),wJ=nR("$ZodCheckSizeEquals",(T,R)=>{var a;
$3.init(T,R),(a=T._zod.def).when??(a.when=(e)=>{let t=e.value;
return!k_(t)&&t.size!==void 0}),T._zod.onattach.push((e)=>{let t=e._zod.bag;
t.minimum=R.size,t.maximum=R.size,t.size=R.size}),T._zod.check=(e)=>{let t=e.value,r=t.size;
if(r===R.size)return;
let h=r>R.size;
e.issues.push({origin:oL(t),...h?{code:"too_big",maximum:R.size}:{code:"too_small",minimum:R.size},inclusive:!0,exact:!0,input:e.value,inst:T,continue:!R.abort})}}),BJ=nR("$ZodCheckMaxLength",(T,R)=>{var a;
$3.init(T,R),(a=T._zod.def).when??(a.when=(e)=>{let t=e.value;
return!k_(t)&&t.length!==void 0}),T._zod.onattach.push((e)=>{let t=e._zod.bag.maximum??Number.POSITIVE_INFINITY;
if(R.maximum<t)e._zod.bag.maximum=R.maximum}),T._zod.check=(e)=>{let t=e.value;
if(t.length<=R.maximum)return;
let r=nL(t);
e.issues.push({origin:r,code:"too_big",maximum:R.maximum,inclusive:!0,input:t,inst:T,continue:!R.abort})}}),NJ=nR("$ZodCheckMinLength",(T,R)=>{var a;
$3.init(T,R),(a=T._zod.def).when??(a.when=(e)=>{let t=e.value;
return!k_(t)&&t.length!==void 0}),T._zod.onattach.push((e)=>{let t=e._zod.bag.minimum??Number.NEGATIVE_INFINITY;
if(R.minimum>t)e._zod.bag.minimum=R.minimum}),T._zod.check=(e)=>{let t=e.value;
if(t.length>=R.minimum)return;
let r=nL(t);
e.issues.push({origin:r,code:"too_small",minimum:R.minimum,inclusive:!0,input:t,inst:T,continue:!R.abort})}}),UJ=nR("$ZodCheckLengthEquals",(T,R)=>{var a;
$3.init(T,R),(a=T._zod.def).when??(a.when=(e)=>{let t=e.value;
return!k_(t)&&t.length!==void 0}),T._zod.onattach.push((e)=>{let t=e._zod.bag;
t.minimum=R.length,t.maximum=R.length,t.length=R.length}),T._zod.check=(e)=>{let t=e.value,r=t.length;
if(r===R.length)return;
let h=nL(t),i=r>R.length;
e.issues.push({origin:h,...i?{code:"too_big",maximum:R.length}:{code:"too_small",minimum:R.length},inclusive:!0,exact:!0,input:e.value,inst:T,continue:!R.abort})}}),Fy=nR("$ZodCheckStringFormat",(T,R)=>{var a,e;
if($3.init(T,R),T._zod.onattach.push((t)=>{let r=t._zod.bag;
if(r.format=R.format,R.pattern)r.patterns??(r.patterns=new Set),r.patterns.add(R.pattern)}),R.pattern)(a=T._zod).check??(a.check=(t)=>{if(R.pattern.lastIndex=0,R.pattern.test(t.value))return;
t.issues.push({origin:"string",code:"invalid_format",format:R.format,input:t.value,...R.pattern?{pattern:R.pattern.toString()}:{},inst:T,continue:!R.abort})});
else(e=T._zod).check??(e.check=()=>{})}),HJ=nR("$ZodCheckRegex",(T,R)=>{Fy.init(T,R),T._zod.check=(a)=>{if(R.pattern.lastIndex=0,R.pattern.test(a.value))return;
a.issues.push({origin:"string",code:"invalid_format",format:"regex",input:a.value,pattern:R.pattern.toString(),inst:T,continue:!R.abort})}}),WJ=nR("$ZodCheckLowerCase",(T,R)=>{R.pattern??(R.pattern=SJ),Fy.init(T,R)}),qJ=nR("$ZodCheckUpperCase",(T,R)=>{R.pattern??(R.pattern=OJ),Fy.init(T,R)}),zJ=nR("$ZodCheckIncludes",(T,R)=>{$3.init(T,R);
let a=Xo(R.includes),e=new RegExp(typeof R.position==="number"?`^.{${R.position}}${a}`:a);R.pattern=e,T._zod.onattach.push((t)=>{let r=t._zod.bag;r.patterns??(r.patterns=new Set),r.patterns.add(e)}),T._zod.check=(t)=>{if(t.value.includes(R.includes,R.position))return;t.issues.push({origin:"string",code:"invalid_format",format:"includes",includes:R.includes,input:t.value,inst:T,continue:!R.abort})}}),FJ=nR("$ZodCheckStartsWith",(T,R)=>{$3.init(T,R);let a=new RegExp(`^${Xo(R.prefix)}.*`);R.pattern??(R.pattern=a),T._zod.onattach.push((e)=>{let t=e._zod.bag;t.patterns??(t.patterns=new Set),t.patterns.add(a)}),T._zod.check=(e)=>{if(e.value.startsWith(R.prefix))return;e.issues.push({origin:"string",code:"invalid_format",format:"starts_with",prefix:R.prefix,input:e.value,inst:T,continue:!R.abort})}}),GJ=nR("$ZodCheckEndsWith",(T,R)=>{$3.init(T,R);let a=new RegExp(`.*${Xo(R.suffix)}$`);R.pattern??(R.pattern=a),T._zod.onattach.push((e)=>{let t=e._zod.bag;t.patterns??(t.patterns=new Set),t.patterns.add(a)}),T._zod.check=(e)=>{if(e.value.endsWith(R.suffix))return;e.issues.push({origin:"string",code:"invalid_format",format:"ends_with",suffix:R.suffix,input:e.value,inst:T,continue:!R.abort})}}),KJ=nR("$ZodCheckProperty",(T,R)=>{$3.init(T,R),T._zod.check=(a)=>{let e=R.schema._zod.run({value:a.value[R.property],issues:[]},{});if(e instanceof Promise)return e.then((t)=>whT(t,a,R.property));whT(e,a,R.property);return}}),VJ=nR("$ZodCheckMimeType",(T,R)=>{$3.init(T,R);let a=new Set(R.mime);T._zod.onattach.push((e)=>{e._zod.bag.mime=R.mime}),T._zod.check=(e)=>{if(a.has(e.value.type))return;e.issues.push({code:"invalid_value",values:R.mime,input:e.value.type,inst:T,continue:!R.abort})}}),XJ=nR("$ZodCheckOverwrite",(T,R)=>{$3.init(T,R),T._zod.check=(a)=>{a.value=R.tx(a.value)}})}
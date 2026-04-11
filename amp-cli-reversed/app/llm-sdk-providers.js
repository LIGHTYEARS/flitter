// Module: llm-sdk-providers
// Original: segment1[327495:632797]
// Type: Scope-hoisted
// Exports: AAT, pAT, yfR, PfR, kfR, mwT, R, bAT, uwT, h, ffR, $m, IfR, gfR, bb, Jy, $fR, pn, vfR, SfR
// Category: cli

ery();
if(!jxR(r))R={
...r,...R}
;
if(typeof R==="object"&&R&&!Array.isArray(R))t.search=this.stringifyQuery(R);
return t.toString()}
_calculateNonstreamingTimeout(T){
  if(3600*T/128000>600)throw new f9("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");
return 600000}
async prepareOptions(T){
}
async prepareRequest(T,{
url:R,options:a}
){
}
get(T,R){
return this.methodRequest("get",T,R)}
post(T,R){
return this.methodRequest("post",T,R)}
patch(T,R){
return this.methodRequest("patch",T,R)}
put(T,R){
return this.methodRequest("put",T,R)}
delete(T,R){
return this.methodRequest("delete",T,R)}
methodRequest(T,R,a){
  return this.request(Promise.resolve(a).then((e)=>{
    return{
    method:T,path:R,...e}
}
))}
request(T,R=null){
return new o8T(this,this.makeRequest(T,R,void 0))}
async makeRequest(T,R,a){
  let e=await T,t=e.maxRetries??this.maxRetries;
  if(R==null)R=t;
  await this.prepareOptions(e);
  let{
  req:r,url:h,timeout:i}
  =await this.buildRequest(e,{
  retryCount:t-R}
);
  await this.prepareRequest(r,{
  url:h,options:e}
);
  let c="log_"+(Math.random()*16777216|0).toString(16).padStart(6,"0"),s=a===void 0?"":`, retryOf: ${a}`,A=Date.now();
  if(It(this).debug(`[${c}] sending request`,$_({
  retryOfRequestLogID:a,method:e.method,url:h,options:e,headers:r.headers}
)),e.signal?.aborted)throw new pi;
  let l=new AbortController,o=await this.fetchWithTimeout(h,r,i,l).catch(WG),n=Date.now();
  if(o instanceof globalThis.Error){
    let m=`retrying, ${R} attempts remaining`;
    if(e.signal?.aborted)throw new pi;
    let b=Wj(o)||/timed? ?out/i.test(String(o)+("cause"in o?String(o.cause):""));
    if(R)return It(this).info(`[${c}] connection ${b?"timed out":"failed"} - ${m}`),It(this).debug(`[${c}] connection ${b?"timed out":"failed"} (${m})`,$_({
    retryOfRequestLogID:a,url:h,durationMs:n-A,message:o.message}
  )),this.retryRequest(e,R,a??c);
    if(It(this).info(`[${c}] connection ${b?"timed out":"failed"} - error; no more retries left`),It(this).debug(`[${c}] connection ${b?"timed out":"failed"} (error; no more retries left)`,$_({
    retryOfRequestLogID:a,url:h,durationMs:n-A,message:o.message}
  )),b)throw new h8T;
    throw new F$({
    cause:o}
)}
  let p=[...o.headers.entries()].filter(([m])=>m==="request-id").map(([m,b])=>", "+m+": "+JSON.stringify(b)).join(""),_=`[${c}${s}${p}] ${r.method} ${h} ${o.ok?"succeeded":"failed"} with status ${o.status} in ${n-A}ms`;
  if(!o.ok){
    let m=await this.shouldRetry(o);
    if(R&&m){
      let k=`retrying, ${R} attempts remaining`;
      return await NxR(o.body),It(this).info(`${_} - ${k}`),It(this).debug(`[${c}] response error (${k})`,$_({
      retryOfRequestLogID:a,url:o.url,status:o.status,headers:o.headers,durationMs:n-A}
  )),this.retryRequest(e,R,a??c,o.headers)}
    let b=m?"error; no more retries left":"error; not retryable";
    It(this).info(`${_} - ${b}`);
    let y=await o.text().catch((k)=>WG(k).message),u=w7T(y),P=u?void 0:y;
    throw It(this).debug(`[${c}] response error (${b})`,$_({
    retryOfRequestLogID:a,url:o.url,status:o.status,headers:o.headers,message:P,durationMs:Date.now()-A}
)),this.makeStatusError(o.status,u,P,o.headers)}
  return It(this).info(_),It(this).debug(`[${c}] response start`,$_({
  retryOfRequestLogID:a,url:o.url,status:o.status,headers:o.headers,durationMs:n-A}
)),{
  response:o,options:e,controller:l,requestLogID:c,retryOfRequestLogID:a,startTime:A}
}
getAPIList(T,R,a){
  return this.requestAPIList(R,a&&"then"in a?a.then((e)=>({
  method:"get",path:T,...e}
)):{
  method:"get",path:T,...a}
)}
requestAPIList(T,R){
  let a=this.makeRequest(R,null,void 0);
return new K7T(this,a,T)}
async fetchWithTimeout(T,R,a,e){
  let{
  signal:t,method:r,...h}
  =R||{
}
  ,i=this._makeAbort(e);
  if(t)t.addEventListener("abort",i,{
  once:!0}
);
  let c=setTimeout(i,a),s=globalThis.ReadableStream&&h.body instanceof globalThis.ReadableStream||typeof h.body==="object"&&h.body!==null&&Symbol.asyncIterator in h.body,A={
    signal:e.signal,...s?{
    duplex:"half"}
    :{
  }
  ,method:"GET",...h}
  ;
  if(r)A.method=r.toUpperCase();
  try{
  return await this.fetch.call(void 0,T,A)}
  finally{
  clearTimeout(c)}
}
async shouldRetry(T){
  let R=T.headers.get("x-should-retry");
  if(R==="true")return!0;
  if(R==="false")return!1;
  if(T.status===408)return!0;
  if(T.status===409)return!0;
  if(T.status===429)return!0;
  if(T.status>=500)return!0;
return!1}
async retryRequest(T,R,a,e){
  let t,r=e?.get("retry-after-ms");
  if(r){
    let i=parseFloat(r);
  if(!Number.isNaN(i))t=i}
  let h=e?.get("retry-after");
  if(h&&!t){
    let i=parseFloat(h);
    if(!Number.isNaN(i))t=i*1000;
  else t=Date.parse(h)-Date.now()}
  if(!(t&&0<=t&&t<60000)){
    let i=T.maxRetries??this.maxRetries;
  t=this.calculateDefaultRetryTimeoutMillis(R,i)}
return await ExR(t),this.makeRequest(T,R-1,a)}
calculateDefaultRetryTimeoutMillis(T,R){
  let a=R-T,e=Math.min(0.5*Math.pow(2,a),8),t=1-Math.random()*0.25;
return e*t*1000}
calculateNonstreamingTimeout(T,R){
  if(3600000*T/128000>600000||R!=null&&T>R)throw new f9("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");
return 600000}
async buildRequest(T,{
retryCount:R=0}
={
}
){
  let a={
  ...T}
  ,{
  method:e,path:t,query:r,defaultBaseURL:h}
  =a,i=this.buildURL(t,r,h);
  if("timeout"in a)dxR("timeout",a.timeout);
  a.timeout=a.timeout??this.timeout;
  let{
  bodyHeaders:c,body:s}
  =this.buildBody({
  options:a}
),A=await this.buildHeaders({
  options:T,method:e,bodyHeaders:c,retryCount:R}
);
  return{
    req:{
      method:e,headers:A,...a.signal&&{
      signal:a.signal}
      ,...globalThis.ReadableStream&&s instanceof globalThis.ReadableStream&&{
      duplex:"half"}
      ,...s&&{
      body:s}
      ,...this.fetchOptions??{
    }
      ,...a.fetchOptions??{
    }
  }
  ,url:i,timeout:a.timeout}
}
async buildHeaders({
options:T,method:R,bodyHeaders:a,retryCount:e}
){
  let t={
}
  ;
  if(this.idempotencyHeader&&R!=="get"){
    if(!T.idempotencyKey)T.idempotencyKey=this.defaultIdempotencyKey();
  t[this.idempotencyHeader]=T.idempotencyKey}
  let r=i8([t,{
    Accept:"application/json","User-Agent":this.getUserAgent(),"X-Stainless-Retry-Count":String(e),...T.timeout?{
    "X-Stainless-Timeout":String(Math.trunc(T.timeout/1000))}
    :{
  }
    ,...wxR(),...this._options.dangerouslyAllowBrowser?{
    "anthropic-dangerous-direct-browser-access":"true"}
  :void 0,"anthropic-version":"2023-06-01"}
  ,await this.authHeaders(T),this._options.defaultHeaders,a,T.headers]);
return this.validateHeaders(r),r.values}
_makeAbort(T){
return()=>T.abort()}
buildBody({
  options:{
  body:T,headers:R}
}
){
  if(!T)return{
  bodyHeaders:void 0,body:void 0}
  ;
  let a=i8([R]);
  if(ArrayBuffer.isView(T)||T instanceof ArrayBuffer||T instanceof DataView||typeof T==="string"&&a.values.has("content-type")||globalThis.Blob&&T instanceof globalThis.Blob||T instanceof FormData||T instanceof URLSearchParams||globalThis.ReadableStream&&T instanceof globalThis.ReadableStream)return{
  bodyHeaders:void 0,body:T}
  ;
  else if(typeof T==="object"&&((Symbol.asyncIterator in T)||(Symbol.iterator in T)&&("next"in T)&&typeof T.next==="function"))return{
  bodyHeaders:void 0,body:N7T(T)}
  ;
  else if(typeof T==="object"&&a.values.get("content-type")==="application/x-www-form-urlencoded")return{
    bodyHeaders:{
    "content-type":"application/x-www-form-urlencoded"}
  ,body:this.stringifyQuery(T)}
  ;
  else return mR(this,NL,"f").call(this,{
  body:T,headers:a}
)}
}
function AAT(T,R){
  var a=Object.keys(T);
  if(Object.getOwnPropertySymbols){
    var e=Object.getOwnPropertySymbols(T);
    R&&(e=e.filter(function(t){
    return Object.getOwnPropertyDescriptor(T,t).enumerable}
)),a.push.apply(a,e)}
return a}
function pAT(T){
  for(var R=1;
  R<arguments.length;
  R++){
    var a=arguments[R]!=null?arguments[R]:{
  }
    ;
    R%2?AAT(Object(a),!0).forEach(function(e){
    yfR(T,e,a[e])}
  ):Object.getOwnPropertyDescriptors?Object.defineProperties(T,Object.getOwnPropertyDescriptors(a)):AAT(Object(a)).forEach(function(e){
    Object.defineProperty(T,e,Object.getOwnPropertyDescriptor(a,e))}
)}
return T}
function yfR(T,R,a){
  if(R=PfR(R),R in T)Object.defineProperty(T,R,{
  value:a,enumerable:!0,configurable:!0,writable:!0}
);
  else T[R]=a;
return T}
function PfR(T){
  var R=kfR(T,"string");
return typeof R==="symbol"?R:String(R)}
function kfR(T,R){
  if(typeof T!=="object"||T===null)return T;
  var a=T[Symbol.toPrimitive];
  if(a!==void 0){
    var e=a.call(T,R||"default");
    if(typeof e!=="object")return e;
  throw TypeError("@@toPrimitive must return a primitive value.")}
return(R==="string"?String:Number)(T)}
function mwT(T){
  return R.withOptions=(a)=>mwT(pAT(pAT({
}
  ,T),a)),R;
  function R(a,...e){
    let t=typeof a==="string"?[a]:a.raw,{
    escapeSpecialCharacters:r=Array.isArray(a),trimWhitespace:h=!0}
    =T,i="";
    for(let A=0;
    A<t.length;
    A++){
      let l=t[A];
      if(r)l=l.replace(/\\\n[ \t]*/g,"").replace(/\\`/g,"`").replace(/\\\$/g,"$").replace(/\\\{/g,"{
        ");
if(i+=l,A<e.length)i+=e[A]}
let c=i.split(`
`),s=null;
for(let A of c){
let l=A.match(/^(\s+)\S+/);
if(l){
let o=l[1].length;
if(!s)s=o;
else s=Math.min(s,o)}
}
if(s!==null){
let A=s;
i=c.map((l)=>l[0]===" "||l[0]==="\t"?l.slice(A):l).join(`
`)}
if(h)i=i.trim();
if(r)i=i.replace(/\\n/g,`
`);
return i}
}
function bAT(T,R){
return`\`\`\`${MR.basename(I8(T))}
${R}
\`\`\``}
async function uwT({
fileSystem:T},R,a,e){
let t=a.searchPaths.map(I8),r=new Map;
async function h(A){
let l=r.get(A);
if(!l)l=await ULT(T,t,A,e),r.set(A,l);
return l}
let i=new xh,c=new xh,s=[];
for(let A of R){
let l=IfR(A)?zR.file(A,A.includes("\\")?"windows":"posix"):await h(A);
if(s.some((n)=>MR.equalURIs(n.uri,l)))continue;
let o;
try{
o=await T.stat(l)}
catch(n){
continue}
if(o.isDirectory){
s.push({
uri:d0(l)});
continue}
if(gfR(l)){
s.push({
uri:d0(l)});
continue}
try{
let n=await wLT(T,l);
if(n&&fN(n.mimeType)&&a.shouldIncludeImages!==!1){
if(n.size/1024/1024>4){
J.warn("Mentioned image is too large. Skipping.");
continue}
c.set(l,n);
try{
let p=await T.readBinaryFile(l);
if(p.length===0){
J.error("Empty image file detected",{
uri:l});
continue}
let _=p.toString("base64");
i.set(l,_)}
catch(p){
J.error("Failed to read image as binary",{
uri:l},p),i.set(l,`[Image file: ${l.toString()} (${n.mimeType}, ${Math.round(n.size/1024)} KB)]`)}
s.push({
uri:d0(l)})}
else{
let p=await gbR(T,l,e);
if(p==="binary")continue;
if(s.push({
uri:d0(l)}),p!==void 0)i.set(l,p)}
}
catch(n){
J.debug("Failed to process file mention",{
uri:l,path:A},n)}
}
if(s.length===0)return;
return ffR(i,s,c)}
function ffR(T,R,a){
let e=T??new xh,t=R??[],r=a??new xh;
if(e.size===0&&t.length===0)return;
let h=[];
for(let[i,c]of r.entries())if(e.has(i)){
let s={
type:"image",source:{
type:"base64",mediaType:c.mimeType,data:e.get(i)||""},sourcePath:i.scheme==="file"?i.fsPath:i.toString()};
h.push(s)}
return{
files:Array.from(e.entries()).map(([i,c])=>({
uri:d0(i),content:c,isImage:r.has(i),imageInfo:r.get(i)})),mentions:t,imageBlocks:h.length>0?h:void 0}
}
function $m(T){
let R=T.files,a=[];
if(R.length>0){
let e=`# Attached Files

${R.map(({content:t,isImage:r,imageInfo:h,uri:i})=>{if(r&&h)return bAT(i,`This is an image file (${h.mimeType}, ${Math.round(h.size/1024)} KB)
Image files are handled as attachments and displayed in the UI.`);let c=t.split(`
`),s=(c[c.length-1]===""?c.slice(0,-1):c).map((A,l)=>`${l+1}: ${A}`).join(`
`);return bAT(i,s)}).join(`
`)}

`;
a.push(e)}
return a.join("")}
function IfR(T){
if(T.startsWith("/"))return!0;
if(T.match(/^[A-Za-z]:[\\]/)||T.match(/^[A-Za-z]:[/]/))return!0;
return!1}
function gfR(T){
return ywT.includes(MR.basename(T))}
function bb(T,R="result"){
if(T===null)return`<${R}>null</${R}>`;
if(T===void 0)return`<${R}>undefined</${R}>`;
if(typeof T==="string")return`<${R}>${T}</${R}>`;
if(typeof T==="number"||typeof T==="boolean")return`<${R}>${T}</${R}>`;
if(Array.isArray(T))return`<${R}>${JSON.stringify(T)}</${R}>`;
if(typeof T==="object")return Object.entries(T).map(([a,e])=>{
if(typeof e==="object"&&e!==null&&!Array.isArray(e)){
let t=bb(e,a);
return`<${a}>
${t}
</${a}>`}
return bb(e,a)}).join(`
`);
return`<${R}>${String(T)}</${R}>`}
function Jy(T){
return $fR(T?.["experimental.agentMode"])}
function $fR(T){
return T??"smart"}
function pn(T,R){
let a=R.agentMode??FET(R)??Jy(T),e=rAR(T,a);
return{
model:e?e:nk(a),agentMode:a}
}
function vfR(T){
return T+ ++jfR}
function SfR(T){
if(!T._regex)try{
T._regex=new RegExp(T.pattern,T.caseInsensitive?"gi":"g")}
catch(R){
J.warn("Error compiling regex",{
pattern:T.id,error:R}),T._regex=/$^/}
return T._regex}
function dfR(T){
if(!T||typeof T!=="string")return T;
let R=T.replace(kwT,"");
if(R.length!==T.length){
let a=T.length-R.length;
J.info("Invisible Unicode tag characters removed during sanitization",{
removedCount:a})}
return R}
function EfR(T){
if(!T||typeof T!=="string")return T;
let R=Zg.get(T);
if(R!==void 0)return R;
let a=dfR(T);
for(let e of PwT){
if(!e.keywords.some((r)=>e.caseInsensitive?a.toLowerCase().includes(r.toLowerCase()):a.includes(r)))continue;
let t=SfR(e);
a=a.replace(t,(r,h)=>{
return r.replace(h,`[REDACTED:${e.id}]`)})}
if(T.length<=LfR){
if(Zg.size>=CfR)Zg.clear();
Zg.set(T,a)}
return a}
function UL(T,R){
if(!T||typeof T==="number"||typeof T==="boolean")return T;
if(typeof T==="string")return R(T);
if(Array.isArray(T))return T.map((a)=>{
if(typeof a==="string")return R(a);
else if(a&&typeof a==="object")return UL(a,R);
return a});
if(T&&typeof T==="object"){
if("type"in T&&(T.type==="base64"||T.type==="image")&&"data"in T)return{
...T};
if("isImage"in T&&T.isImage===!0&&"content"in T&&typeof T.content==="string"){
let a={
};
for(let[e,t]of Object.entries(T))if(e==="content")a[e]=t;
else a[e]=UL(t,R);
return a}
}
return Object.fromEntries(Object.entries(T).map(([a,e])=>[a,UL(e,R)]))}
function i5(T){
return UL(T,EfR)}
function DfR(T){
return T?T.length>=bK:!1}
function $y(T){
if(T.nextMessageId===void 0)T.nextMessageId=0;
return T.nextMessageId++}
function wfR(T,R){
let a=_K(T["~debug"]?.lastInferenceUsage,R);
if(!a)return;
T["~debug"]={
...T["~debug"]??{
},lastInferenceUsage:a}
}
function _K(T,R){
if(!T)return R;
if(!R)return T;
let a=(t,r)=>Math.max(t,r),e=(t,r)=>{
if(r===null)return t;
if(t===null)return r;
return Math.max(t,r)};
return{
model:R.model??T.model,maxInputTokens:a(T.maxInputTokens,R.maxInputTokens),inputTokens:a(T.inputTokens,R.inputTokens),outputTokens:a(T.outputTokens,R.outputTokens),cacheCreationInputTokens:e(T.cacheCreationInputTokens,R.cacheCreationInputTokens),cacheReadInputTokens:e(T.cacheReadInputTokens,R.cacheReadInputTokens),totalInputTokens:a(T.totalInputTokens,R.totalInputTokens),thinkingBudget:R.thinkingBudget??T.thinkingBudget,timestamp:R.timestamp??T.timestamp}
}
function BfR(T,R=new Date){
return(a)=>{
switch(a.v++,T.type){
case"cancelled":{
lC(a);
let e=a.messages.at(-1);
if(e?.role==="user"){
let t=e.content.findLast((r)=>r.type==="tool_result");
if(t)t.run.status="cancelled"}
break}
case"user:message:interrupt":{
let e=a.messages[T.messageIndex];
if(e?.role==="user")e.interrupted=!0;
break}
case"user:message:append-content":{
let e=a.messages.find((t)=>t.messageId===T.messageId);
if(e?.role==="user")e.content.push(...O8(T.content));
break}
case"thread:truncate":{
if(a.messages.splice(T.fromIndex),a.relationships){
if(a.relationships=a.relationships.filter((e)=>e.messageIndex===void 0||e.messageIndex<T.fromIndex),a.relationships.length===0)a.relationships=void 0}
break}
case"user:message":{
if(lC(a),a.archived)a.archived=!1;
let e={
role:"user",...T.message,messageId:$y(a),content:T.message.content??[]},t=i5(e);
if(T.index!==void 0){
if(!a.messages[T.index])throw Error(`user message at index ${T.index} not found`);
let r=a.messages[T.index];
if(a.messages.filter((h)=>h.role==="user")[0]===r&&e.agentMode&&!a.mainThreadID)a.agentMode=e.agentMode;
a.messages.splice(T.index,a.messages.length-T.index,t)}
else{
let r=ve(a)===0;
if((!a.agentMode||r)&&e.agentMode&&!a.mainThreadID)a.agentMode=e.agentMode;
if(a.messages.push(t),a.draft)a.draft=void 0}
break}
case"user:message-queue:dequeue":{
if(lC(a),!a.queuedMessages)return;
let[e,...t]=a.queuedMessages;
if(!e)return;
a.messages.push(e.queuedMessage),a.queuedMessages=t;
break}
case"user:tool-input":{
if(!Tn(a,T.toolUse)){
J.debug(`Ignoring user:tool-input delta for missing tool use ${T.toolUse} (likely deleted due to thread edit/truncation)`);
break}
let e=O8(cN(a,T.toolUse));
if(!e){
J.debug(`Ignoring user:tool-input delta for missing tool result block ${T.toolUse} (likely deleted due to thread edit/truncation)`);
break}
e.userInput=T.value;
break}
case"tool:data":{
if(!gj(a,T.toolUse)){
J.debug(`Ignoring tool:data delta for missing tool use ${T.toolUse} (likely deleted due to thread edit/truncation)`);
break}
let e=O8(i5(T.data));
xwT(a,T.toolUse,e);
break}
case"tool:processed":{
let e=gj(a,T.toolUse);
if(!e){
J.debug(`Ignoring tool:processed delta for missing tool use ${T.toolUse} (likely deleted due to thread edit/truncation)`);
break}
let t=e.block.input;
e.block.input=T.newArgs,e.message.originalToolUseInput={
...e.message.originalToolUseInput,[T.toolUse]:t};
break}
case"assistant:message":{
let e=dt(a,"assistant"),t=e?.content.filter((h)=>h.type==="tool_use").map((h)=>h.id)||[];
if(lC(a),e?.state.type==="cancelled"){
for(let h of a.messages)if(h.role==="user")h.content=h.content.filter((i)=>{
if(i.type==="tool_result"&&t.includes(i.toolUseID))return!1;
return!0})}
let r={
...T.message,messageId:$y(a)};
a.messages.push(O8(r));
break}
case"assistant:message-update":{
let e=O8(T.message),t=a.messages.at(-1);
if(t?.role==="assistant"){
let r=_K(t.usage,e.usage);
a.messages[a.messages.length-1]={
...e,messageId:t.messageId,usage:r}
}
else a.messages.push({
...e,messageId:$y(a)});
break}
case"inference:completed":{
if(wfR(a,T.usage),!a.env)a.env={
initial:{
}
};
if(!a.env.initial.tags)a.env.initial.tags=[];
if(a.env.initial.tags=a.env.initial.tags.filter((e)=>e!=="model:undefined"),T.model){
let e=`model:${T.model}`;
if(!a.env.initial.tags.includes(e))a.env.initial.tags=[...a.env.initial.tags,e]}
if(T.usage){
let e=O8(dt(a,"assistant"));
if(e){
let t=_K(e.usage,T.usage);
if(t)e.usage=t}
}
break}
case"title":{
a.title=T.value||void 0;
break}
case"max-tokens":{
a.maxTokens=T.value||void 0;
break}
case"main-thread":{
a.mainThreadID=T.value||void 0;
break}
case"agent-mode":{
if(ve(a)>0)throw Error("(bug) cannot change agentMode after first message");
a.agentMode=T.mode;
break}
case"environment":{
a.env=O8(T.env);
break}
case"user:message-queue:enqueue":{
if(!a.queuedMessages)a.queuedMessages=[];
if(DfR(a.queuedMessages))break;
let e={
role:"user",...T.message,messageId:$y(a),content:T.message.content??[]},t=i5(e);
a.queuedMessages.push({
id:vfR("queued-"),queuedMessage:O8(t)});
break}
case"user:message-queue:discard":{
if(T.id===void 0){
a.queuedMessages=[];
break}
let e=a.queuedMessages?.findIndex((t)=>t.id===T.id);
if(e===void 0)throw Error(`queued message with id ${T.id} not found`);
a?.queuedMessages?.splice(e,1);
break}
case"info:manual-bash-invocation":{
a.messages.push({
role:"info",messageId:$y(a),content:[{
type:"manual_bash_invocation",args:O8(T.args),toolRun:O8(T.toolRun),hidden:T.hidden}
]});
break}
case"clearPendingNavigation":{
a.pendingNavigation=void 0;
break}
case"setPendingNavigation":{
a.pendingNavigation=T.threadID;
break}
case"relationship":{
if(!a.relationships)a.relationships=[];
if(!a.relationships.some((e)=>e.threadID===T.relationship.threadID&&e.type===T.relationship.type&&e.role===T.relationship.role))a.relationships.push(O8(T.relationship));
break}
case"draft":{
if(a.draft=O8(T.content),T.autoSubmit)a.autoSubmitDraft=!0;
break}
case"trace:start":{
NfR(a,T.span);
break}
case"trace:end":{
UfR(a,T.span,R);
break}
case"trace:event":{
HfR(a,T.span,T.event);
break}
case"trace:attributes":{
WfR(a,T.span,T.attributes);
break}
}
}
}
function lC(T){
let R=O8(dt(T,"assistant"));
if(!R)return;
let a=!1;
if(R.state.type==="streaming")R.state={
type:"cancelled"},a=!0;
else if(R.state.type==="complete"){
if(R.content.some((h)=>h.type==="tool_use"&&!Va(h)))R.state={
type:"cancelled"},a=!0}
let e=sA(T),t=R.content.some((h)=>h.type==="tool_use"&&!e.has(h.id));
if(!a&&!t)return;
let r=[];
for(let h=0;h<R.content.length;h++){
let i=R.content[h];
if(i?.type!=="tool_use")continue;
if(!Va(i)){
J.debug(`Cleaning up incomplete tool_use ${i.id}`,{
name:"markPriorStreamingAssistantMessageAsCancelled",threadID:T.id,blockID:i.id});
let c={
type:"tool_use",id:i.id,name:i.name,complete:!0,input:i.inputIncomplete??i.input??{
}
};
R.content[h]=c}
if(!e.has(i.id))r.push(i.id)}
for(let h of r)xwT(T,h,{
status:"cancelled"})}
function xwT(T,R,a){
let e,t=gj(T,R);
if(t){
let h=t.messageIndex;
for(let i=h+1;i<T.messages.length;i++){
let c=T.messages[i];
if(c?.role==="user"){
e=c;
break}
}
}
if(!e)e={
role:"user",messageId:$y(T),content:[]},T.messages.push(e);
let r=cN(T,R);
if(r)r.run=O8(a);
else r={
type:"tool_result",toolUseID:R,run:O8(a)},e.content.push(r)}
function NfR(T,R){
if(!T.meta)T.meta={
};
if(!T.meta.traces)T.meta.traces=[];
let a=T.meta.traces.find((e)=>e.id===R.id);
if(a){
if(a.startTime===void 0)a.startTime=R.startTime;
return}
T.meta.traces.push(O8({
...R}))}
function UfR(T,R,a){
if(!T.meta)T.meta={
};
if(!T.meta.traces)T.meta.traces=[];
let e=T.meta.traces.find((r)=>r.id===R.id),t=R.endTime??a.toISOString();
if(e){
if(e.endTime===void 0)e.endTime=t}
}
function HfR(T,R,a){
if(!T.meta?.traces)return;
let e=T.meta.traces.find((t)=>t.id===R);
if(!e)return;
if(!e.events)e.events=[];
e.events.push(a)}
function WfR(T,R,a){
if(!T.meta?.traces)return;
let e=T.meta.traces.find((t)=>t.id===R);
if(!e)return;
e.attributes={
...e.attributes,...a}
}
function u8T(T){
try{
return j2(T.replace(/\\+$/,"")+'"')}
catch{
return j2(T)}
}
function Ox(T){
let R=[];
if(T.currentlyVisibleFiles){
if(T.currentlyVisibleFiles.length>0)R.push(`Currently visible files user has open: ${T.currentlyVisibleFiles.map(Kt).join(", ")}`)}
if(T.runningTerminalCommands&&T.runningTerminalCommands.length>0)R.push(`Currently running terminal commands:
  ${T.runningTerminalCommands.join(`
 `)}`);
if(T.activeEditor)R.push(`Currently active editor: ${Kt(T.activeEditor)}`);
if(T.activeEditor&&!I9T(T.activeEditor)){
if(T.selectionRange)R.push(`Selection range: ${T.selectionRange.start.line}:${T.selectionRange.start.column}-${T.selectionRange.end.line}:${T.selectionRange.end.column}`);
else if(T.cursorLocation){
if(R.push(`Current cursor location: ${T.cursorLocation.line}:${T.cursorLocation.column}`),T.cursorLocationLine)R.push(`Contents of line on which cursor is: \`${T.cursorLocationLine}\``)}
}
if(T.snapshotOIDs&&T.snapshotOIDs.length>0)for(let a of T.snapshotOIDs)R.push(`Git tree snapshot: ${a.treeOID} (repo: ${a.repoRoot})`);
if(T.aggmanContext){
let a=T.aggmanContext;
if(R.push(`Current URL the user is on: ${a.currentURL}`),a.recentUnreadThreads&&a.recentUnreadThreads.length>0){
let e=a.recentUnreadThreads.map((t)=>{
let r=t.projectName?.trim();
return r?`- ${t.title} [${r}] (${t.threadID})`:`- ${t.title} (${t.threadID})`});
R.push(`Recent unread threads by the user (most recent first):
${e.join(`
`)}`)}
}
return`# User State
${R.join(`
`)}

`}
function qfR(T){
return Boolean(T&&typeof T==="object"&&"isImage"in T&&T.isImage&&"imageInfo"in T&&T.imageInfo&&typeof T.imageInfo==="object"&&"mimeType"in T.imageInfo&&typeof T.imageInfo.mimeType==="string"&&fN(T.imageInfo.mimeType)&&"size"in T.imageInfo&&typeof T.imageInfo.size==="number")}
function mAT(T,R,a){
return(e,t)=>{
let r=xmR({
readFileFn:async(h,i)=>t.filesystem.readFile(h,{
signal:i}),readBinaryFileFn:(h,i)=>t.filesystem.readBinaryFile(h,{
signal:i}),maxFileSizeBytes:T,maxLines:R,maxLineBytes:a});
return Q9(async(h)=>{
let i=await r(e,t,h);
if(i.status==="done"&&typeof i.result==="object"){
let c=zR.file(i.result.absolutePath),s=await fm(t.filesystem,c,t.dir,t.thread,t.discoveredGuidanceFileURIs,h);
if(s.length>0)return{
...i,result:{
...i.result,discoveredGuidanceFiles:s}
}
}
return i})}
}
function FfR(T){
return typeof T==="object"&&T!==null&&"type"in T&&(T.type==="text"&&("text"in T)&&typeof T.text==="string"||T.type==="image"&&("data"in T)&&typeof T.data==="string"&&("mimeType"in T)&&typeof T.mimeType==="string")}
function Ur(T){
if(!T)return{
info:Gy("info"),warn:Gy("warn"),error:Gy("error"),debug:Gy("debug")};
return{
info:(R,...a)=>T.info(R,...a),warn:(R,...a)=>T.warn(R,...a),error:(R,...a)=>T.error(R,...a),debug:(R,...a)=>(T.debug??T.info)(R,...a)}
}
function Js(T){
if(!T)return;
return{
[IwT]:"true",[d0T]:"dtw"}
}
function P8T(T){
if(!T)return;
return{
[IwT]:"true",[d0T]:"dtw",Authorization:`Bearer ${T}`}
}
function GfR(T){
return T.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function PO(T){
return`<attached_image path="${GfR(T.sourcePath)}">The following image is from the source above.</attached_image>`}
function ZN(T){
if(T.source.type!=="base64")return null;
let R=XA({
source:{
type:"base64",data:T.source.data}
});
if(!R)return null;
return`Image omitted from ${T.sourcePath}: ${R}`}
function dx(T){
if(T.toolRun.status!=="done")return[];
if(T.hidden===!0)return[];
let R="The following is content that was produced by the user manually running a shell command. Do not mention this to the user directly unless they refer to the content of this bash command.",a=T.args.cmd,e=T.args.cwd||"unknown",t=T.toolRun.result.output||"",r=T.toolRun.result.exitCode||0,h=Sa`
		<command>${a}</command>
		<working_directory>${e}</working_directory>
		<output>${t}</output>
		<exit_code>${r}</exit_code>
	`;
return[{
type:"text",text:R},{
type:"text",text:h}
]}
function KfR(T,R){
let a=T.pipe(L9((e)=>gh((async()=>{
let t=await e.secrets.getToken("apiKey",e.settings.url);
return{
url:e.settings.url,apiKey:t}
})())),E9((e,t)=>e.url===t.url&&e.apiKey===t.apiKey),JR(({
url:e,apiKey:t})=>{
if(!t)throw Error("API key not found. You must provide an API key in settings.");
return new gy({
apiKey:t,baseURL:new URL("/api/provider/anthropic",e).toString(),defaultHeaders:R})}));
return R?a:a.pipe(f3({
shouldCountRefs:!0}))}
function ep(T,R,a){
return m0(KfR(T.configService.config,a?.defaultHeaders),R)}
function JN(T,R,a,e,t){
let r=[],h=T["anthropic.thinking.enabled"]??!0;
if(T["anthropic.speed"]==="fast"&&uK(a,t))r.push("fast-mode-2026-02-01");
if(h&&T["anthropic.interleavedThinking.enabled"])r.push("interleaved-thinking-2025-05-14");
let i;
if(T["anthropic.speed"]==="fast"&&uK(a,t))i="anthropic";
else if(T["anthropic.provider"])i=T["anthropic.provider"];
return{
...Xs(),...r.length>0?{
"anthropic-beta":r.join(",")}
:{
},...i?{
"x-amp-override-provider":i}
:{
},[yc]:"amp.chat",...e!=null?{
[zA]:String(e)}
:{
},...Vs(R)}
}
function k8T(T,R){
let{
summaryBlock:a,index:e}
=pm(T)??{
summaryBlock:void 0,index:0},t=[];
if(a&&a.summary.type==="message")t.push({
role:"assistant",content:[{
type:"text",text:a.summary.summary.trimEnd()}
]});
for(let r=e+(a?1:0);r<T.messages.length;r++){
let h=T.messages[r];
if(!h)continue;
switch(h.role){
case"user":{
let i=ZfR(h,R);
if(i.length===0)continue;
t.push({
role:"user",content:i});
break}
case"assistant":{
let i=h.content.filter((l)=>{
if(l.type==="tool_use"&&!Va(l))return!1;
if(l.type==="server_tool_use")return!1;
if(l.type==="thinking"||l.type==="redacted_thinking"){
let o="provider"in l?l.provider:void 0;
return!o||o==="anthropic"}
return!0}).map((l)=>{
if(l.type==="thinking")return{
type:"thinking",thinking:l.thinking,signature:l.signature};
if(l.type==="redacted_thinking")return{
type:"redacted_thinking",data:l.data};
if(l.type==="tool_use")return{
type:"tool_use",id:l.id,name:l.name,input:l.input};
return{
type:"text",text:l.text}
}),c=sA(T);
for(let l of i)if(l.type==="tool_use"){
if(!c.get(l.id)?.run)throw Error(`(bug) corresponding tool_result not found for tool_use (id=${l.id}, name=${l.name})`)}
if(i.length===0)break;
let s=QfR(i),A=s.length-1;
while(A>=0){
let l=s[A];
if(!l||l.type!=="thinking"&&l.type!=="redacted_thinking")break;
A--}
if(A<s.length-1)s=s.slice(0,A+1);
if(s.length>0)t.push({
role:"assistant",content:O8(s)});
break}
case"info":{
let i=[];
for(let c of h.content)if(c.type==="manual_bash_invocation"){
let s=dx(c);
i.push(...s)}
else if(c.type==="text"&&c.text.trim().length>0)i.push({
type:"text",text:c.text});
if(i.length>0)t.push({
role:"user",content:i});
break}
}
}
return t}
function VfR(T,R){
let a={
...R?.startTime!==void 0?{
startTime:R.startTime}
:{
},...R?.finalTime!==void 0?{
finalTime:R.finalTime}
:{
}
};
switch(T.type){
case"tool_use":{
if(!IN.test(T.name))return{
type:"tool_use",complete:!0,id:T.id,name:hG,input:{
invalid_tool_name:T.name,...T.input},...a};
let e=T.__json_buf;
if(e)try{
let t=JSON.parse(e);
return{
type:"tool_use",complete:!0,id:T.id,name:T.name,input:t,...a}
}
catch{
return{
type:"tool_use",complete:!1,id:T.id,name:T.name,inputPartialJSON:{
json:e},input:e?rlR(e):{
},inputIncomplete:e?u8T(e):{
},...a}
}
return{
type:"tool_use",complete:!0,id:T.id,name:T.name,input:T.input,...a}
}
case"text":return{
type:"text",text:T.text,...a};
case"thinking":return{
...T,provider:"anthropic",...a};
case"redacted_thinking":return{
...T,provider:"anthropic",...a};
case"server_tool_use":return{
type:"server_tool_use",id:T.id,name:T.name,input:T.input,...a}
}
}
function gwT(T){
return T.replace(/^[^/]+\//,"")}
function XfR(T){
return gwT(T)===EwT}
function $wT(T,R){
let a=vwT(T);
if(!a)return;
if(XfR(T)||R?.enableLargeContext&&tp(T)===xO)return CwT;
return a.contextWindow}
function tp(T){
let R=gwT(T);
if(R===EwT)return xO;
return R}
function x8T(T,R){
return T==="large"&&tp(R)===xO}
function YfR(T){
let R=`anthropic/${tp(T)}`,a=R.split("/");
if(a.length===2&&a[0]==="anthropic"&&a[1])return R;
return null}
function vwT(T){
let R=YfR(T);
if(!R)return;
try{
return dn(R)}
catch{
return}
}
function TU(T,R){
let a=vwT(T);
if(!a)return Ys(`anthropic/${tp(T)}`);
return($wT(T,R)??a.contextWindow)-a.maxOutputTokens}
function uK(T,R){
let a=$wT(T,R);
return tp(T)===xO&&a!==void 0&&a<CwT}
function jwT(T){
let R=T.findLast((r)=>r.role==="user");
if(!R||!Array.isArray(R.content))return c5;
let a=R.content.filter((r)=>r.type==="text").map((r)=>r.text).join(" ").toLowerCase(),e=[/\bthink harder\b/,/\bthink intensely\b/,/\bthink longer\b/,/\bthink really hard\b/,/\bthink super hard\b/,/\bthink very hard\b/],t=[/\bthink about it\b/,/\bthink a lot\b/,/\bthink deeply\b/,/\bthink hard\b/,/\bthink more\b/];
for(let r of e)if(r.test(a))return 31999;
for(let r of t)if(r.test(a))return 1e4;
if(/\bthink\b/.test(a))return c5;
return c5}
function f8T(T){
if(T.length===0)return T;
let R=T.length-1;
return T.map((a,e)=>{
if(e===R)return{
...a,content:s7(a.content,"5m")};
return a})}
function s7(T,R="5m"){
if(!Array.isArray(T))return T;
if(T.length===0)return T;
return Lt(T,(a)=>{
for(let e=a.length-1;e>=0;e--){
let t=a[e];
if(t.type==="text"&&t.text.trim()!==""||t.type==="image"||t.type==="tool_result"){
t.cache_control={
type:"ephemeral",ttl:R};
return}
}
})}
function QfR(T){
return T.map((R)=>{
if(R.type==="text")return{
...R,text:R.text.trimEnd()};
return R}).filter((R)=>R.type!=="text"||R.text!=="")}
async function SwT(T,R,a,e,t,r,h,i){
let c=await ep(t,h),s=await t.configService.getLatest(h),A=s.settings["anthropic.thinking.enabled"]??!0;
T=A?T:tIR(T);
let l=O8(f8T(T)),o=r??dwT,n=tp(o),p=TU(o),_={
model:n,max_tokens:lIR,messages:l,system:a,tools:kO(R)},m=s.settings["anthropic.temperature"];
if(m!==void 0&&!A)_.temperature=m;
try{
let b=await c.messages.create(_,{
signal:h,headers:{
...JN(s.settings,e,o,i)}
});
return{
message:b,"~debugUsage":{
model:n,maxInputTokens:p,inputTokens:b.usage.input_tokens,outputTokens:b.usage.output_tokens,cacheCreationInputTokens:b.usage.cache_creation_input_tokens,cacheReadInputTokens:b.usage.cache_read_input_tokens,totalInputTokens:b.usage.input_tokens+(b.usage.cache_creation_input_tokens??0)+(b.usage.cache_read_input_tokens??0),thinkingBudget:A?jwT(T):void 0,timestamp:new Date().toISOString()}
}
}
catch(b){
throw h?.throwIfAborted(),iIR(b)}
}
function kO(T){
let R=new Set;
return T.filter((a)=>{
if(R.has(a.name))return!1;
return R.add(a.name),!0}).map((a)=>({
name:a.name,description:a.description??"",eager_input_streaming:!0,input_schema:a.inputSchema}))}
function ZfR(T,R){
let a=Ur(R?.logger),e=T.fileMentions&&T.fileMentions.files.length>0?{
type:"text",text:$m(T.fileMentions)}
:null,t=T.userState?{
type:"text",text:Ox(T.userState)}
:null,r=[],h=[],i=[];
for(let s of T.content)if(s.type==="tool_result"){
if(s.run?.status==="done"){
let l=s.run.result;
if(typeof l==="object"&&l!==null&&"discoveredGuidanceFiles"in l&&Array.isArray(l.discoveredGuidanceFiles))i.push(...l.discoveredGuidanceFiles)}
let A=o7(s.toolUseID,s.run,{
stripGuidanceFiles:!0,logger:R?.logger});
if(A)r.push(A)}
else if(s.type==="image")if(h.push({
type:"text",text:PO(s)}),s.source.type==="base64"&&"mediaType"in s.source&&"data"in s.source){
if(!s.source.data||s.source.data.length===0){
a.warn("Skipping empty image block in message");
continue}
h.push({
type:"image",source:{
type:"base64",media_type:s.source.mediaType,data:s.source.data}
})}
else if(s.source.type==="url"&&"url"in s.source&&typeof s.source.url==="string")h.push({
type:"image",source:{
type:"url",url:s.source.url}
});
else throw Error(`(bug) unexpected image block: ${JSON.stringify(s).slice(0,25)}...`);
else if(s.type==="text"){
if(s.text.trim().length>0)h.push(s)}
if(T.discoveredGuidanceFiles)i.push(...T.discoveredGuidanceFiles);
let c=i.length>0?{
type:"text",text:Z9T(i,R?.agentMode??"default")}
:null;
return[...r,e,t,c,...h].filter((s)=>s!==null)}
function o7(T,R,a){
let e=Ur(a?.logger);
if(!wt(R.status)){
e.error("runToBlockParam","run is not terminal",{
run:R});
return}
let t=[];
switch(R.status){
case"done":t=aIR(R.result,{
stripGuidanceFiles:a?.stripGuidanceFiles});
break;
case"error":t=[{
type:"text",text:R.error?I8T(R.error):"unknown error"}
];
break;
case"rejected-by-user":t=[{
type:"text",text:"User rejected invoking the tool"}
];
break;
case"cancelled":if(R.progress)t=[{
type:"text",text:`The user cancelled the tool so it is no longer running. Progress until cancelation:
${JfR(R.progress)}
--- Tool was cancelled and is no longer running
`}
];
else t=[{
type:"text",text:"User cancelled tool invocation"}
];
break;
default:throw Error("(bug) unreachable")}
return{
type:"tool_result",tool_use_id:T,content:t,is_error:R.status==="error"||R.status==="cancelled"||R.status==="rejected-by-user"}
}
function JfR(T){
if(!T)return"";
if(typeof T==="string")return T;
if(Array.isArray(T)&&T.length>0&&typeof T[0]==="object"){
let R=T[0];
if("tool_uses"in R||"message"in R)return TIR(T)}
if(Array.isArray(T))return T.join(`
`);
if(typeof T==="object"&&"output"in T&&typeof T.output==="string")return T.output;
return bb(T,"progress")}
function TIR(T){
return T.map((R)=>{
let a=[];
if(R.message)a.push(R.message);
if(R.tool_uses?.length)for(let e of R.tool_uses){
let t=e.status==="done"?RIR(e.result):`(${e.status})`;
a.push(`- ${e.tool_name}: ${t}`)}
return a.join(`
`)}).join(`

`)}
function RIR(T){
if(T===void 0||T===null)return"done";
if(typeof T==="string")return T.length>200?T.slice(0,200)+"...":T;
if(typeof T==="object"){
let R=T;
if("exitCode"in R){
let e=typeof R.output==="string"?R.output:"",t=e.length>200?e.slice(0,200)+"...":e;
return t?`exit ${R.exitCode}: ${t}`:`exit ${R.exitCode}`}
let a=JSON.stringify(T);
return a.length>200?a.slice(0,200)+"...":a}
return String(T)}
function I8T(T){
let R=[`<error>${T.message}</error>`];
switch(T.errorCode){
case"reading-secret-file":R.push(Sa`<secret-file-instruction>
				You MUST never read or modify secret files in any way, including by using cat, sed, echo, or rm through the Bash tool.
				Instead, ask the user to provide the information you need to complete the task, or ask the user to manually edit the secret file.
				</secret-file-instruction>`)}
return R.join(`
`)}
function aIR(T,R){
if(R?.stripGuidanceFiles&&typeof T==="object"&&T!==null){
if("discoveredGuidanceFiles"in T){
let{
discoveredGuidanceFiles:e,...t}
=T;
T=t}
}
if(qfR(T)){
let e=T.content??T.contentURL?.startsWith("data:"),t=T.content??T.contentURL?.replace(/^data:[^;,]*;base64,/,"")??"";
if(e){
let r=ZN({
type:"image",sourcePath:T.absolutePath,source:{
type:"base64",mediaType:T.imageInfo.mimeType,data:t}
});
if(r)return[{
type:"text",text:r}
]}
return[{
type:"image",source:e?{
type:"base64",media_type:T.imageInfo.mimeType,data:t}
:{
type:"url",url:T.contentURL??""}
}
]}
function a(e){
if(typeof e==="object"&&e!==null&&"type"in e){
if(e.type==="text"&&"text"in e&&typeof e.text==="string")return!0;
if(e.type==="image"&&"source"in e)return!0}
return!1}
if(Array.isArray(T)&&T.every(FfR))return T.map((e)=>{
if(e.type==="text")return{
type:"text",text:e.text};
else if(e.type==="image")return{
type:"image",source:{
type:"base64",data:e.data,media_type:e.mimeType}
};
else if(e.type==="resource"&&"resource"in e)return{
type:"text",text:bb(e.resource,"resource")};
else if(e.type==="resource_link")return{
type:"text",text:bb(e,"resource_link")};
else if(e.type==="audio")return{
type:"text",text:"[audio content]"};
else return{
type:"text",text:JSON.stringify(e)}
});
if(Array.isArray(T)&&T.every(a))return T;
if(typeof T==="string")return[{
type:"text",text:T}
];
if(Array.isArray(T)&&T.every((e)=>typeof e==="string"))return[{
type:"text",text:T.join(`
`)}
];
if(T===void 0)return[{
type:"text",text:"undefined"}
];
if(T===null)return[{
type:"text",text:"null"}
];
return[{
type:"text",text:bb(T)}
]}
function eIR(T){
return Array.isArray(T)}
function tIR(T){
let R=[];
for(let a of T){
if(!eIR(a.content)||a.role!=="assistant"){
R.push(a);
continue}
let e=a.content.filter((t)=>{
if(t.type!=="thinking"&&t.type!=="redacted_thinking")return!0;
let r="provider"in t?t.provider:void 0;
return!r||r==="anthropic"});
if(e.length===0)continue;
R.push({
...a,content:e})}
return R}
function rIR(T,R){
let a=Ur(R);
if(T.type==="web_search_tool_result")return a.warn("Ignored web search tool result block"),!1;
if(T.type==="tool_search_tool_result")return!1;
return!0}
function hIR(T){
return typeof T==="object"&&T!==null&&"type"in T&&"message"in T&&typeof T.type==="string"&&typeof T.message==="string"}
function iIR(T){
if(hIR(T)){
if(T.type==="invalid_request_error"&&T.message.toLowerCase().includes("prompt is too long"))return new rp}
return T}
class OwT{
async*stream({
model:T,thread:R,systemPrompt:a,tools:e,configService:t,signal:r,serviceAuthToken:h,requestHeaders:i,reasoningEffort:c,logger:s}){
let A=Ur(s),l=k8T(R,{
agentMode:"default",logger:A}),o=P8T(h),n=await ep({
configService:t},r,o?{
defaultHeaders:o}
:void 0),p=await t.getLatest(r),_=c==="none"?{
...p.settings,"anthropic.thinking.enabled":!1}
:p.settings,m=_["anthropic.thinking.enabled"]??!0,b=T,y=tp(b),{
agentMode:u}
=pn(p.settings,R),P={
id:R.id,agentMode:u},k=x8T(u,b),x=TU(b,{
enableLargeContext:k}),f=R.maxTokens??LwT,v={
model:y,max_tokens:f,messages:O8(f8T(l)),system:a,tools:kO(e),stream:!0},g=m?jwT(l):0;
if(m)v.thinking={
type:"enabled",budget_tokens:g};
if(b.includes("eap"))v.thinking={
type:"adaptive"},v.output_config={
effort:["low","medium","high","max"].includes(c)?c:"high"};
if(p.settings["anthropic.speed"]==="fast"&&uK(b,{
enableLargeContext:k}))v.speed="fast";
let I=p.settings["anthropic.temperature"];
if(I!==void 0&&!m)v.temperature=I;
let S=n.messages.stream(v,{
signal:r,maxRetries:0,headers:{
...JN(_,P,b,_m(R)?.messageId,{
enableLargeContext:k}),...i??{
},...o??{
}
}
}),O=new Map;
for await(let j of S){
if(j.type==="content_block_start"){
let d=Date.now();
O.set(j.index,{
...O.get(j.index),startTime:O.get(j.index)?.startTime??d})}
if(j.type==="content_block_stop"){
let d=Date.now();
O.set(j.index,{
startTime:O.get(j.index)?.startTime??d,finalTime:d})}
if(S.currentMessage)yield PAT(S.currentMessage,x,A,O)}
yield PAT(await S.finalMessage(),x,A,O)}
}
function PAT(T,R,a,e=new Map){
function t(){
let h=T.stop_reason;
switch(h){
case"end_turn":case"stop_sequence":return{
type:"complete",stopReason:"end_turn"};
case"tool_use":return{
type:"complete",stopReason:"tool_use"};
case"max_tokens":case"model_context_window_exceeded":return{
type:"error",error:{
message:h}
};
case"refusal":return{
type:"error",error:{
message:"The model refused to respond to this request. Please retry with a different prompt."}
};
case"pause_turn":return{
type:"error",error:{
message:"We received a pause_turn request from the model, but this is not implemented"}
};
case"compaction":return{
type:"error",error:{
message:"We received a compaction request from the model, but this is not implemented"}
};
case null:return{
type:"streaming"}
}
}
function r(){
if(!T.usage)return;
let h=T.model;
return{
model:h,maxInputTokens:R??Ys(`anthropic/${h}`),inputTokens:T.usage.input_tokens,outputTokens:T.usage.output_tokens,cacheCreationInputTokens:T.usage.cache_creation_input_tokens,cacheReadInputTokens:T.usage.cache_read_input_tokens,totalInputTokens:T.usage.input_tokens+(T.usage.cache_creation_input_tokens??0)+(T.usage.cache_read_input_tokens??0),timestamp:new Date().toISOString()}
}
return{
role:"assistant",messageId:0,content:T.content.flatMap((h,i)=>rIR(h,a)?[VfR(h,e.get(i))]:[]),state:t(),usage:r()}
}
function AIR(T){
if(T.status==="done"){
if(T.result!==null&&typeof T.result==="object"&&"output"in T.result&&typeof T.result.output==="string"){
if("truncation"in T.result&&typeof T.result.truncation==="object"&&T.result.truncation!==null&&"prefixLinesOmitted"in T.result.truncation&&typeof T.result.truncation.prefixLinesOmitted==="number"){
let R=T.result.truncation.prefixLinesOmitted;
return`--- Truncated ${R} ${o9(R,"line")} above this ---
`+T.result.output}
return T.result.output}
}
return MwT.default.stringify(T)}
function _IR(T){
if(T.messages.length===0)return T;
return Lt(T,(R)=>{
let a=!0;
while(a&&R.messages.length>0){
a=!1;
let e=R.messages.length-1,t=R.messages[e];
if(t?.role==="assistant"){
let r=t.state;
if(r.type==="complete"&&r.stopReason==="tool_use"){
let h=new Set;
for(let i of t.content)if(i.type==="tool_use")h.add(i.id);
if(h.size>0)J.debug("Removing trailing assistant message with tool_use stop",{
toolUseCount:h.size}),R.messages.pop(),a=!0}
continue}
if(t?.role==="user"&&e>=1){
let r=R.messages[e-1];
if(r?.role==="assistant"){
let h=r.state;
if(h.type==="complete"&&h.stopReason==="tool_use"){
let i=new Set;
for(let s of r.content)if(s.type==="tool_use")i.add(s.id);
let c=new Set;
for(let s of t.content)if(s.type==="tool_result"&&wt(s.run.status))c.add(s.toolUseID);
if(!(i.size>0&&[...i].every((s)=>c.has(s))))J.debug("Removing incomplete tool use sequence from thread for handoff",{
expectedCount:i.size,actualCount:c.size}),R.messages.pop(),R.messages.pop(),a=!0}
}
}
}
})}
function mIR(T){
let R=Math.min(T,xIR);
return Math.ceil(R/fIR)}
function uIR(T){
let R=/@([^\s@]+)/g,a=[],e;
while((e=R.exec(T))!==null){
let t=e[1]?.trim();
if(t)a.push(t)}
return a}
function yIR(T,R){
return T.map((a)=>{
let e=a.startsWith("file:")?Mr(a,R):a;
return"@"+OpR(e)})}
function kAT(T,R){
let a=[];
for(let e of T){
let t=e.trim();
if(!t)continue;
if(t.startsWith("/")||/^[a-zA-Z]:[\\/]/.test(t)){
J.debug("Skipping absolute path from model",{
path:t});
continue}
for(let r of R)try{
let h=d0(r.with({
path:`${r.path}/${t}`}));
a.push(h);
break}
catch{
}
}
return a}
async function PIR(T,R,a){
let e=[];
await Promise.all(T.map(async(s)=>{
try{
let A=Ht(s),l=await R.stat(A);
if(!l.isDirectory){
let o=Mr(s,a);
e.push({
uri:s,relativePath:o,estimatedTokens:mIR(l.size)})}
}
catch{
}
}));
let t=T.map((s)=>e.find((A)=>A.uri===s)).filter((s)=>s!==void 0),r=[],h=[],i=DwT,c=0;
for(let s of t)if(i>=s.estimatedTokens)r.push(s.uri),i-=s.estimatedTokens,c+=s.estimatedTokens;
else h.push(s.relativePath);
return{
filesToMention:r,filesAsPlainPaths:h,totalEstimatedTokens:c}
}
function EIR(T){
if(!/^data:/i.test(T))throw TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
T=T.replace(/\r?\n/g,"");
let R=T.indexOf(",");
if(R===-1||R<=4)throw TypeError("malformed data: URI");
let a=T.substring(5,R).split(";"),e="",t=!1,r=a[0]||"text/plain",h=r;
for(let A=1;A<a.length;A++)if(a[A]==="base64")t=!0;
else if(a[A]){
if(h+=`;${a[A]}`,a[A].indexOf("charset=")===0)e=a[A].substring(8)}
if(!a[0]&&!e.length)h+=";charset=US-ASCII",e="US-ASCII";
let i=t?"base64":"ascii",c=unescape(T.substring(R+1)),s=Buffer.from(c,i);
return s.type=r,s.typeFull=h,s.charset=e,s}
async function*s5(T,R=!0){
for(let a of T)if("stream"in a)yield*a.stream();
else if(ArrayBuffer.isView(a))if(R){
let e=a.byteOffset,t=a.byteOffset+a.byteLength;
while(e!==t){
let r=Math.min(t-e,xAT),h=a.buffer.slice(e,e+r);
e+=h.byteLength,yield new Uint8Array(h)}
}
else yield a;
else{
let e=0,t=a;
while(e!==t.size){
let r=await t.slice(e,Math.min(t.size,e+xAT)).arrayBuffer();
e+=r.byteLength,yield new Uint8Array(r)}
}
}
function wIR(T,R=Ub){
var a=`${yK()}${yK()}`.replace(/\./g,"").slice(-28).padStart(32,"-"),e=[],t=`--${a}\r
Content-Disposition: form-data; name="`;
return T.forEach((r,h)=>typeof r=="string"?e.push(t+n5(h)+`"\r
\r
${r.replace(/\r(?!\n)|(?<!\r)\n/g,`\r
`)}\r
`):e.push(t+n5(h)+`"; filename="${n5(r.name,1)}"\r
Content-Type: ${r.type||"application/octet-stream"}\r
\r
`,r,`\r
`)),e.push(`--${a}--`),new R(e,{
type:"multipart/form-data; boundary="+a})}
class XwT{
constructor(T){
this.index=0,this.flags=0,this.onHeaderEnd=Xp,this.onHeaderField=Xp,this.onHeadersEnd=Xp,this.onHeaderValue=Xp,this.onPartBegin=Xp,this.onPartData=Xp,this.onPartEnd=Xp,this.boundaryChars={
},T=`\r
--`+T;
let R=new Uint8Array(T.length);
for(let a=0;a<T.length;a++)R[a]=T.charCodeAt(a),this.boundaryChars[R[a]]=!0;
this.boundary=R,this.lookbehind=new Uint8Array(this.boundary.length+8),this.state=r3.START_BOUNDARY}
write(T){
let R=0,a=T.length,e=this.index,{
lookbehind:t,boundary:r,boundaryChars:h,index:i,state:c,flags:s}
=this,A=this.boundary.length,l=A-1,o=T.length,n,p,_=(u)=>{
this[u+"Mark"]=R},m=(u)=>{
delete this[u+"Mark"]},b=(u,P,k,x)=>{
if(P===void 0||P!==k)this[u](x&&x.subarray(P,k))},y=(u,P)=>{
let k=u+"Mark";
if(!(k in this))return;
if(P)b(u,this[k],R,T),delete this[k];
else b(u,this[k],T.length,T),this[k]=0};
for(R=0;R<a;R++)switch(n=T[R],c){
case r3.START_BOUNDARY:if(i===r.length-2){
if(n===yI)s|=Co.LAST_BOUNDARY;
else if(n!==pC)return;
i++;
break}
else if(i-1===r.length-2){
if(s&Co.LAST_BOUNDARY&&n===yI)c=r3.END,s=0;
else if(!(s&Co.LAST_BOUNDARY)&&n===AC)i=0,b("onPartBegin"),c=r3.HEADER_FIELD_START;
else return;
break}
if(n!==r[i+2])i=-2;
if(n===r[i+2])i++;
break;
case r3.HEADER_FIELD_START:c=r3.HEADER_FIELD,_("onHeaderField"),i=0;
case r3.HEADER_FIELD:if(n===pC){
m("onHeaderField"),c=r3.HEADERS_ALMOST_DONE;
break}
if(i++,n===yI)break;
if(n===QIR){
if(i===1)return;
y("onHeaderField",!0),c=r3.HEADER_VALUE_START;
break}
if(p=TgR(n),p<ZIR||p>JIR)return;
break;
case r3.HEADER_VALUE_START:if(n===YIR)break;
_("onHeaderValue"),c=r3.HEADER_VALUE;
case r3.HEADER_VALUE:if(n===pC)y("onHeaderValue",!0),b("onHeaderEnd"),c=r3.HEADER_VALUE_ALMOST_DONE;
break;
case r3.HEADER_VALUE_ALMOST_DONE:if(n!==AC)return;
c=r3.HEADER_FIELD_START;
break;
case r3.HEADERS_ALMOST_DONE:if(n!==AC)return;
b("onHeadersEnd"),c=r3.PART_DATA_START;
break;
case r3.PART_DATA_START:c=r3.PART_DATA,_("onPartData");
case r3.PART_DATA:if(e=i,i===0){
R+=l;
while(R<o&&!(T[R]in h))R+=A;
R-=l,n=T[R]}
if(i<r.length)if(r[i]===n){
if(i===0)y("onPartData",!0);
i++}
else i=0;
else if(i===r.length)if(i++,n===pC)s|=Co.PART_BOUNDARY;
else if(n===yI)s|=Co.LAST_BOUNDARY;
else i=0;
else if(i-1===r.length)if(s&Co.PART_BOUNDARY){
if(i=0,n===AC){
s&=~Co.PART_BOUNDARY,b("onPartEnd"),b("onPartBegin"),c=r3.HEADER_FIELD_START;
break}
}
else if(s&Co.LAST_BOUNDARY)if(n===yI)b("onPartEnd"),c=r3.END,s=0;
else i=0;
else i=0;
if(i>0)t[i-1]=n;
else if(e>0){
let u=new Uint8Array(t.buffer,t.byteOffset,t.byteLength);
b("onPartData",0,e,u),e=0,_("onPartData"),R--}
break;
case r3.END:break;
default:throw Error(`Unexpected state entered: ${c}`)}
y("onHeaderField"),y("onHeaderValue"),y("onPartData"),this.index=i,this.state=c,this.flags=s}
end(){
if(this.state===r3.HEADER_FIELD_START&&this.index===0||this.state===r3.PART_DATA&&this.index===this.boundary.length)this.onPartEnd();
else if(this.state!==r3.END)throw Error("MultipartParser.end(): stream ended unexpectedly")}
}
function VIR(T){
let R=T.match(/\bfilename=("(.*?)"|([^()<>@,;:\\"/[\]?={}\s\t]+))($|;\s)/i);
if(!R)return;
let a=R[2]||R[3]||"",e=a.slice(a.lastIndexOf("\\")+1);
return e=e.replace(/%22/g,'"'),e=e.replace(/&#(\d{4});/g,(t,r)=>{
return String.fromCharCode(r)}),e}
async function XIR(T,R){
if(!/multipart/i.test(R))throw TypeError("Failed to fetch");
let a=R.match(/boundary=(?:"([^"]+)"|([^;
        ]+))/i);
        if(!a)throw TypeError("no or bad content-type header, no multipart boundary");
        let e=new XwT(a[1]||a[2]),t,r,h,i,c,s,A=[],l=new xk,o=(b)=>{
          h+=m.decode(b,{
          stream:!0}
      )}
        ,n=(b)=>{
        A.push(b)}
        ,p=()=>{
          let b=new fO(A,s,{
          type:c}
        );
        l.append(i,b)}
        ,_=()=>{
        l.append(i,h)}
        ,m=new TextDecoder("utf-8");
        m.decode(),e.onPartBegin=function(){
        e.onPartData=o,e.onPartEnd=_,t="",r="",h="",i="",c="",s=null,A.length=0}
        ,e.onHeaderField=function(b){
          t+=m.decode(b,{
          stream:!0}
      )}
        ,e.onHeaderValue=function(b){
          r+=m.decode(b,{
          stream:!0}
      )}
        ,e.onHeaderEnd=function(){
          if(r+=m.decode(),t=t.toLowerCase(),t==="content-disposition"){
            let b=r.match(/\bname=("([^"]*)"|([^()<>@,;:\\"/[\]?={
          }
            \s\t]+))/i);
            if(b)i=b[2]||b[3]||"";
          if(s=VIR(r),s)e.onPartData=n,e.onPartEnd=p}
          else if(t==="content-type")c=r;
        r="",t=""}
        ;
        for await(let b of T)e.write(b);
      return e.end(),l}
      class CP{
        constructor(T,{
        size:R=0}
        ={
      }
      ){
          let a=null;
          if(T===null)T=null;
          else if(WwT(T))T=ri.from(T.toString());
          else if(n7(T));
          else if(ri.isBuffer(T));
          else if(YwT.isAnyArrayBuffer(T))T=ri.from(T);
          else if(ArrayBuffer.isView(T))T=ri.from(T.buffer,T.byteOffset,T.byteLength);
          else if(T instanceof Xl);
          else if(T instanceof xk)T=wIR(T),a=T.type.split("=")[1];
          else T=ri.from(String(T));
          let e=T;
          if(ri.isBuffer(T))e=Xl.Readable.from(T);
          else if(n7(T))e=Xl.Readable.from(T.stream());
          if(this[Et]={
          body:T,stream:e,boundary:a,disturbed:!1,error:null}
          ,this.size=R,T instanceof Xl)T.on("error",(t)=>{
            let r=t instanceof IO?t:new li(`Invalid response body while trying to fetch ${this.url}: ${t.message}`,"system",t);
          this[Et].error=r}
      )}
        get body(){
        return this[Et].stream}
        get bodyUsed(){
        return this[Et].disturbed}
        async arrayBuffer(){
          let{
          buffer:T,byteOffset:R,byteLength:a}
          =await A5(this);
        return T.slice(R,R+a)}
        async formData(){
          let T=this.headers.get("content-type");
          if(T.startsWith("application/x-www-form-urlencoded")){
            let a=new xk,e=new URLSearchParams(await this.text());
            for(let[t,r]of e)a.append(t,r);
          return a}
          let{
          toFormData:R}
          =await Promise.resolve().then(()=>(RgR(),VwT));
        return R(this.body,T)}
        async blob(){
          let T=this.headers&&this.headers.get("content-type")||this[Et].body&&this[Et].body.type||"",R=await this.arrayBuffer();
          return new Ub([R],{
          type:T}
      )}
        async json(){
          let T=await this.text();
        return JSON.parse(T)}
        async text(){
          let T=await A5(this);
        return new TextDecoder().decode(T)}
        buffer(){
        return A5(this)}
    }
      async function A5(T){
        if(T[Et].disturbed)throw TypeError(`body used already for: ${T.url}`);
        if(T[Et].disturbed=!0,T[Et].error)throw T[Et].error;
        let{
        body:R}
        =T;
        if(R===null)return ri.alloc(0);
        if(!(R instanceof Xl))return ri.alloc(0);
        let a=[],e=0;
        try{
          for await(let t of R){
            if(T.size>0&&e+t.length>T.size){
              let r=new li(`content size at ${T.url} over limit: ${T.size}`,"max-size");
            throw R.destroy(r),r}
          e+=t.length,a.push(t)}
      }
        catch(t){
        throw t instanceof IO?t:new li(`Invalid response body while trying to fetch ${T.url}: ${t.message}`,"system",t)}
        if(R.readableEnded===!0||R._readableState.ended===!0)try{
          if(a.every((t)=>typeof t==="string"))return ri.from(a.join(""));
        return ri.concat(a,e)}
        catch(t){
        throw new li(`Could not create Buffer from response body for ${T.url}: ${t.message}`,"system",t)}
      else throw new li(`Premature close of server response while trying to fetch ${T.url}`)}
      function rgR(T=[]){
        return new _n(T.reduce((R,a,e,t)=>{
          if(e%2===0)R.push(t.slice(e,e+2));
        return R}
        ,[]).filter(([R,a])=>{
          try{
          return Jg(R),HL(R,String(a)),!0}
          catch{
          return!1}
      }
    ))}
      function LAT(T,R=!1){
        if(T==null)return"no-referrer";
        if(T=new URL(T),/^(about|blob|data):$/.test(T.protocol))return"no-referrer";
        if(T.username="",T.password="",T.hash="",R)T.pathname="",T.search="";
      return T}
      function sgR(T){
        if(!L8T.has(T))throw TypeError(`Invalid referrerPolicy: ${T}`);
      return T}
      function ogR(T){
        if(/^(http|ws)s:$/.test(T.protocol))return!0;
        let R=T.host.replace(/(^\[)|(]$)/g,""),a=cgR(R);
        if(a===4&&/^127\./.test(R))return!0;
        if(a===6&&/^(((0+:){
        7}
      )|(::(0+:){
        0,6}
      ))0*1$/.test(R))return!0;
        if(T.host==="localhost"||T.host.endsWith(".localhost"))return!1;
        if(T.protocol==="file:")return!0;
      return!1}
      function Du(T){
        if(/^about:(blank|srcdoc)$/.test(T))return!0;
        if(T.protocol==="data:")return!0;
        if(/^(blob|filesystem):$/.test(T.protocol))return!0;
      return ogR(T)}
      function ngR(T,{
      referrerURLCallback:R,referrerOriginCallback:a}
      ={
    }
    ){
        if(T.referrer==="no-referrer"||T.referrerPolicy==="")return null;
        let e=T.referrerPolicy;
        if(T.referrer==="about:client")return"no-referrer";
        let t=T.referrer,r=LAT(t),h=LAT(t,!0);
        if(r.toString().length>4096)r=h;
        if(R)r=R(r);
        if(a)h=a(h);
        let i=new URL(T.url);
        switch(e){
          case"no-referrer":return"no-referrer";
          case"origin":return h;
          case"unsafe-url":return r;
          case"strict-origin":if(Du(r)&&!Du(i))return"no-referrer";
          return h.toString();
          case"strict-origin-when-cross-origin":if(r.origin===i.origin)return r;
          if(Du(r)&&!Du(i))return"no-referrer";
          return h;
          case"same-origin":if(r.origin===i.origin)return r;
          return"no-referrer";
          case"origin-when-cross-origin":if(r.origin===i.origin)return r;
          return h;
          case"no-referrer-when-downgrade":if(Du(r)&&!Du(i))return"no-referrer";
          return r;
        default:throw TypeError(`Invalid referrerPolicy: ${e}`)}
    }
      function lgR(T){
        let R=(T.get("referrer-policy")||"").split(/[,\s]+/),a="";
        for(let e of R)if(e&&L8T.has(e))a=e;
      return a}
      async function tBT(T,R){
        return new Promise((a,e)=>{
          let t=new Gj(T,R),{
          parsedURL:r,options:h}
          =bgR(t);
          if(!rBT.has(r.protocol))throw TypeError(`node-fetch cannot load ${T}. URL scheme "${r.protocol.replace(/:$/,"")}" is not supported.`);
          if(r.protocol==="data:"){
            let p=NwT(t.url),_=new ls(p,{
              headers:{
              "Content-Type":p.typeFull}
          }
          );
            a(_);
          return}
          let i=(r.protocol==="https:"?PgR:ygR).request,{
          signal:c}
          =t,s=null,A=()=>{
            let p=new M8T("The operation was aborted.");
            if(e(p),t.body&&t.body instanceof DAT.Readable)t.body.destroy(p);
            if(!s||!s.body)return;
          s.body.emit("error",p)}
          ;
          if(c&&c.aborted){
            A();
          return}
          let l=()=>{
          A(),n()}
          ,o=i(r.toString(),h);
          if(c)c.addEventListener("abort",l);
          let n=()=>{
          if(o.abort(),c)c.removeEventListener("abort",l)}
          ;
          if(o.on("error",(p)=>{
          e(new li(`request to ${t.url} failed, reason: ${p.message}`,"system",p)),n()}
        ),kgR(o,(p)=>{
          if(s&&s.body)s.body.destroy(p)}
        ),process.version<"v14")o.on("socket",(p)=>{
            let _;
            p.prependListener("end",()=>{
            _=p._eventsCount}
          ),p.prependListener("close",(m)=>{
              if(s&&_<p._eventsCount&&!m){
                let b=Error("Premature close");
              b.code="ERR_STREAM_PREMATURE_CLOSE",s.body.emit("error",b)}
          }
        )}
        );
          o.on("response",(p)=>{
            o.setTimeout(0);
            let _=rgR(p.rawHeaders);
            if(C8T(p.statusCode)){
              let P=_.get("Location"),k=null;
              try{
              k=P===null?null:new URL(P,t.url)}
              catch{
                if(t.redirect!=="manual"){
                  e(new li(`uri requested responds with an invalid redirect URL: ${P}`,"invalid-redirect")),n();
                return}
            }
              switch(t.redirect){
                case"error":e(new li(`uri requested responds with a redirect, redirect mode is set to error: ${t.url}`,"no-redirect")),n();
                return;
                case"manual":break;
                case"follow":{
                  if(k===null)break;
                  if(t.counter>=t.follow){
                    e(new li(`maximum redirect reached at: ${t.url}`,"max-redirect")),n();
                  return}
                  let x={
                  headers:new _n(t.headers),follow:t.follow,counter:t.counter+1,agent:t.agent,compress:t.compress,method:t.method,body:O8T(t),signal:t.signal,size:t.size,referrer:t.referrer,referrerPolicy:t.referrerPolicy}
                  ;
                  if(!NIR(t.url,k)||!UIR(t.url,k))for(let v of["authorization","www-authenticate","cookie","cookie2"])x.headers.delete(v);
                  if(p.statusCode!==303&&t.body&&R.body instanceof DAT.Readable){
                    e(new li("Cannot follow redirect with body being a readable stream","unsupported-redirect")),n();
                  return}
                  if(p.statusCode===303||(p.statusCode===301||p.statusCode===302)&&t.method==="POST")x.method="GET",x.body=void 0,x.headers.delete("content-length");
                  let f=lgR(_);
                  if(f)x.referrerPolicy=f;
                  a(tBT(new Gj(k,x))),n();
                return}
              default:return e(TypeError(`Redirect option '${t.redirect}' is not a valid value of RequestRedirect`))}
          }
            if(c)p.once("end",()=>{
            c.removeEventListener("abort",l)}
          );
            let m=Bu(p,new wAT,(P)=>{
            if(P)e(P)}
          );
            if(process.version<"v12.10")p.on("aborted",l);
            let b={
            url:t.url,status:p.statusCode,statusText:p.statusMessage,headers:_,size:t.size,counter:t.counter,highWaterMark:t.highWaterMark}
            ,y=_.get("Content-Encoding");
            if(!t.compress||t.method==="HEAD"||y===null||p.statusCode===204||p.statusCode===304){
              s=new ls(m,b),a(s);
            return}
            let u={
            flush:wu.Z_SYNC_FLUSH,finishFlush:wu.Z_SYNC_FLUSH}
            ;
            if(y==="gzip"||y==="x-gzip"){
              m=Bu(m,wu.createGunzip(u),(P)=>{
              if(P)e(P)}
            ),s=new ls(m,b),a(s);
            return}
            if(y==="deflate"||y==="x-deflate"){
              let P=Bu(p,new wAT,(k)=>{
              if(k)e(k)}
            );
              P.once("data",(k)=>{
                if((k[0]&15)===8)m=Bu(m,wu.createInflate(),(x)=>{
                if(x)e(x)}
              );
                else m=Bu(m,wu.createInflateRaw(),(x)=>{
                if(x)e(x)}
              );
              s=new ls(m,b),a(s)}
            ),P.once("end",()=>{
              if(!s)s=new ls(m,b),a(s)}
            );
            return}
            if(y==="br"){
              m=Bu(m,wu.createBrotliDecompress(),(P)=>{
              if(P)e(P)}
            ),s=new ls(m,b),a(s);
            return}
          s=new ls(m,b),a(s)}
      ),tgR(o,t).catch(e)}
    )}
      function kgR(T,R){
        let a=bC.from(`0\r
\r
`),e=!1,t=!1,r;
        T.on("response",(h)=>{
          let{
          headers:i}
          =h;
        e=i["transfer-encoding"]==="chunked"&&!i["content-length"]}
      ),T.on("socket",(h)=>{
          let i=()=>{
            if(e&&!t){
              let s=Error("Premature close");
            s.code="ERR_STREAM_PREMATURE_CLOSE",R(s)}
        }
          ,c=(s)=>{
            if(t=bC.compare(s.slice(-5),a)===0,!t&&r)t=bC.compare(r.slice(-3),a.slice(0,3))===0&&bC.compare(s.slice(-2),a.slice(3))===0;
          r=s}
          ;
          h.prependListener("close",i),h.on("data",c),T.on("close",()=>{
          h.removeListener("close",i),h.removeListener("data",c)}
      )}
    )}
      function ZgR(){
        return{
        geminiUrl:QdR,vertexUrl:ZdR}
    }
      function JgR(T,R,a,e){
        var t,r;
        if(!(T===null||T===void 0?void 0:T.baseUrl)){
          let h=ZgR();
          if(R)return(t=h.vertexUrl)!==null&&t!==void 0?t:a;
        else return(r=h.geminiUrl)!==null&&r!==void 0?r:e}
      return T.baseUrl}
      class ss{
    }
      function b0(T,R){
        let a=/\{
        ([^}
      ]+)\}
      /g;
      return T.replace(a,(e,t)=>{
        if(Object.prototype.hasOwnProperty.call(R,t)){
          let r=R[t];
        return r!==void 0&&r!==null?String(r):""}
      else throw Error(`Key '${t}' not found in valueMap.`)}
  )}
    function Y(T,R,a){
      for(let r=0;
      r<R.length-1;
      r++){
        let h=R[r];
        if(h.endsWith("[]")){
          let i=h.slice(0,-2);
          if(!(i in T))if(Array.isArray(a))T[i]=Array.from({
          length:a.length}
          ,()=>({
        }
        ));
          else throw Error(`Value must be a list given an array path ${h}`);
          if(Array.isArray(T[i])){
            let c=T[i];
            if(Array.isArray(a))for(let s=0;
            s<c.length;
            s++){
              let A=c[s];
            Y(A,R.slice(r+1),a[s])}
          else for(let s of c)Y(s,R.slice(r+1),a)}
        return}
        else if(h.endsWith("[0]")){
          let i=h.slice(0,-3);
          if(!(i in T))T[i]=[{
        }
          ];
          let c=T[i];
          Y(c[0],R.slice(r+1),a);
        return}
        if(!T[h]||typeof T[h]!=="object")T[h]={
      }
        ;
      T=T[h]}
      let e=R[R.length-1],t=T[e];
      if(t!==void 0){
        if(!a||typeof a==="object"&&Object.keys(a).length===0)return;
        if(a===t)return;
        if(typeof t==="object"&&typeof a==="object"&&t!==null&&a!==null)Object.assign(t,a);
      else throw Error(`Cannot set value for an existing key. Key: ${e}`)}
      else if(e==="_self"&&typeof a==="object"&&a!==null&&!Array.isArray(a))Object.assign(T,a);
    else T[e]=a}
    function H(T,R,a=void 0){
      try{
        if(R.length===1&&R[0]==="_self")return T;
        for(let e=0;
        e<R.length;
        e++){
          if(typeof T!=="object"||T===null)return a;
          let t=R[e];
          if(t.endsWith("[]")){
            let r=t.slice(0,-2);
            if(r in T){
              let h=T[r];
              if(!Array.isArray(h))return a;
            return h.map((i)=>H(i,R.slice(e+1),a))}
          else return a}
        else T=T[t]}
      return T}
      catch(e){
        if(e instanceof TypeError)return a;
      throw e}
  }
    function T$R(T,R){
      for(let[a,e]of Object.entries(R)){
        let t=a.split("."),r=e.split("."),h=new Set,i=-1;
        for(let c=0;
        c<t.length;
        c++)if(t[c]==="*"){
          i=c;
        break}
        if(i!==-1&&r.length>i)for(let c=i;
        c<r.length;
        c++){
          let s=r[c];
        if(s!=="*"&&!s.endsWith("[]")&&!s.endsWith("[0]"))h.add(s)}
      PK(T,t,r,0,h)}
  }
    function PK(T,R,a,e,t){
      if(e>=R.length)return;
      if(typeof T!=="object"||T===null)return;
      let r=R[e];
      if(r.endsWith("[]")){
        let h=r.slice(0,-2),i=T;
      if(h in i&&Array.isArray(i[h]))for(let c of i[h])PK(c,R,a,e+1,t)}
      else if(r==="*"){
        if(typeof T==="object"&&T!==null&&!Array.isArray(T)){
          let h=T,i=Object.keys(h).filter((s)=>!s.startsWith("_")&&!t.has(s)),c={
        }
          ;
          for(let s of i)c[s]=h[s];
          for(let[s,A]of Object.entries(c)){
            let l=[];
            for(let o of a.slice(e))if(o==="*")l.push(s);
            else l.push(o);
          Y(h,l,A)}
        for(let s of i)delete h[s]}
    }
      else{
        let h=T;
      if(r in h)PK(h[r],R,a,e+1,t)}
  }
    function w8T(T){
      if(typeof T!=="string")throw Error("fromImageBytes must be a string");
    return T}
    function R$R(T){
      let R={
    }
      ,a=H(T,["operationName"]);
      if(a!=null)Y(R,["operationName"],a);
      let e=H(T,["resourceName"]);
      if(e!=null)Y(R,["_url","resourceName"],e);
    return R}
    function a$R(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["name"],a);
      let e=H(T,["metadata"]);
      if(e!=null)Y(R,["metadata"],e);
      let t=H(T,["done"]);
      if(t!=null)Y(R,["done"],t);
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
      let h=H(T,["response","generateVideoResponse"]);
      if(h!=null)Y(R,["response"],t$R(h));
    return R}
    function e$R(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["name"],a);
      let e=H(T,["metadata"]);
      if(e!=null)Y(R,["metadata"],e);
      let t=H(T,["done"]);
      if(t!=null)Y(R,["done"],t);
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
      let h=H(T,["response"]);
      if(h!=null)Y(R,["response"],r$R(h));
    return R}
    function t$R(T){
      let R={
    }
      ,a=H(T,["generatedSamples"]);
      if(a!=null){
        let r=a;
        if(Array.isArray(r))r=r.map((h)=>{
        return h$R(h)}
      );
      Y(R,["generatedVideos"],r)}
      let e=H(T,["raiMediaFilteredCount"]);
      if(e!=null)Y(R,["raiMediaFilteredCount"],e);
      let t=H(T,["raiMediaFilteredReasons"]);
      if(t!=null)Y(R,["raiMediaFilteredReasons"],t);
    return R}
    function r$R(T){
      let R={
    }
      ,a=H(T,["videos"]);
      if(a!=null){
        let r=a;
        if(Array.isArray(r))r=r.map((h)=>{
        return i$R(h)}
      );
      Y(R,["generatedVideos"],r)}
      let e=H(T,["raiMediaFilteredCount"]);
      if(e!=null)Y(R,["raiMediaFilteredCount"],e);
      let t=H(T,["raiMediaFilteredReasons"]);
      if(t!=null)Y(R,["raiMediaFilteredReasons"],t);
    return R}
    function h$R(T){
      let R={
    }
      ,a=H(T,["video"]);
      if(a!=null)Y(R,["video"],A$R(a));
    return R}
    function i$R(T){
      let R={
    }
      ,a=H(T,["_self"]);
      if(a!=null)Y(R,["video"],p$R(a));
    return R}
    function c$R(T){
      let R={
    }
      ,a=H(T,["operationName"]);
      if(a!=null)Y(R,["_url","operationName"],a);
    return R}
    function s$R(T){
      let R={
    }
      ,a=H(T,["operationName"]);
      if(a!=null)Y(R,["_url","operationName"],a);
    return R}
    function o$R(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["name"],a);
      let e=H(T,["metadata"]);
      if(e!=null)Y(R,["metadata"],e);
      let t=H(T,["done"]);
      if(t!=null)Y(R,["done"],t);
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
      let h=H(T,["response"]);
      if(h!=null)Y(R,["response"],n$R(h));
    return R}
    function n$R(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["parent"]);
      if(e!=null)Y(R,["parent"],e);
      let t=H(T,["documentName"]);
      if(t!=null)Y(R,["documentName"],t);
    return R}
    function B8T(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["name"],a);
      let e=H(T,["metadata"]);
      if(e!=null)Y(R,["metadata"],e);
      let t=H(T,["done"]);
      if(t!=null)Y(R,["done"],t);
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
      let h=H(T,["response"]);
      if(h!=null)Y(R,["response"],l$R(h));
    return R}
    function l$R(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["parent"]);
      if(e!=null)Y(R,["parent"],e);
      let t=H(T,["documentName"]);
      if(t!=null)Y(R,["documentName"],t);
    return R}
    function A$R(T){
      let R={
    }
      ,a=H(T,["uri"]);
      if(a!=null)Y(R,["uri"],a);
      let e=H(T,["encodedVideo"]);
      if(e!=null)Y(R,["videoBytes"],w8T(e));
      let t=H(T,["encoding"]);
      if(t!=null)Y(R,["mimeType"],t);
    return R}
    function p$R(T){
      let R={
    }
      ,a=H(T,["gcsUri"]);
      if(a!=null)Y(R,["uri"],a);
      let e=H(T,["bytesBase64Encoded"]);
      if(e!=null)Y(R,["videoBytes"],w8T(e));
      let t=H(T,["mimeType"]);
      if(t!=null)Y(R,["mimeType"],t);
    return R}
    class fk{
      constructor(T){
        let R={
      }
        ;
        for(let a of T.headers.entries())R[a[0]]=a[1];
      this.headers=R,this.responseInternal=T}
      json(){
      return this.responseInternal.json()}
  }
    class M_{
      get text(){
        var T,R,a,e,t,r,h,i;
        if(((e=(a=(R=(T=this.candidates)===null||T===void 0?void 0:T[0])===null||R===void 0?void 0:R.content)===null||a===void 0?void 0:a.parts)===null||e===void 0?void 0:e.length)===0)return;
        if(this.candidates&&this.candidates.length>1)console.warn("there are multiple candidates in the response, returning text from the first one.");
        let c="",s=!1,A=[];
        for(let l of(i=(h=(r=(t=this.candidates)===null||t===void 0?void 0:t[0])===null||r===void 0?void 0:r.content)===null||h===void 0?void 0:h.parts)!==null&&i!==void 0?i:[]){
          for(let[o,n]of Object.entries(l))if(o!=="text"&&o!=="thought"&&o!=="thoughtSignature"&&(n!==null||n!==void 0))A.push(o);
          if(typeof l.text==="string"){
            if(typeof l.thought==="boolean"&&l.thought)continue;
          s=!0,c+=l.text}
      }
        if(A.length>0)console.warn(`there are non-text parts ${A} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`);
      return s?c:void 0}
      get data(){
        var T,R,a,e,t,r,h,i;
        if(((e=(a=(R=(T=this.candidates)===null||T===void 0?void 0:T[0])===null||R===void 0?void 0:R.content)===null||a===void 0?void 0:a.parts)===null||e===void 0?void 0:e.length)===0)return;
        if(this.candidates&&this.candidates.length>1)console.warn("there are multiple candidates in the response, returning data from the first one.");
        let c="",s=[];
        for(let A of(i=(h=(r=(t=this.candidates)===null||t===void 0?void 0:t[0])===null||r===void 0?void 0:r.content)===null||h===void 0?void 0:h.parts)!==null&&i!==void 0?i:[]){
          for(let[l,o]of Object.entries(A))if(l!=="inlineData"&&(o!==null||o!==void 0))s.push(l);
        if(A.inlineData&&typeof A.inlineData.data==="string")c+=atob(A.inlineData.data)}
        if(s.length>0)console.warn(`there are non-data parts ${s} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`);
      return c.length>0?btoa(c):void 0}
      get functionCalls(){
        var T,R,a,e,t,r,h,i;
        if(((e=(a=(R=(T=this.candidates)===null||T===void 0?void 0:T[0])===null||R===void 0?void 0:R.content)===null||a===void 0?void 0:a.parts)===null||e===void 0?void 0:e.length)===0)return;
        if(this.candidates&&this.candidates.length>1)console.warn("there are multiple candidates in the response, returning function calls from the first one.");
        let c=(i=(h=(r=(t=this.candidates)===null||t===void 0?void 0:t[0])===null||r===void 0?void 0:r.content)===null||h===void 0?void 0:h.parts)===null||i===void 0?void 0:i.filter((s)=>s.functionCall).map((s)=>s.functionCall).filter((s)=>s!==void 0);
        if((c===null||c===void 0?void 0:c.length)===0)return;
      return c}
      get executableCode(){
        var T,R,a,e,t,r,h,i,c;
        if(((e=(a=(R=(T=this.candidates)===null||T===void 0?void 0:T[0])===null||R===void 0?void 0:R.content)===null||a===void 0?void 0:a.parts)===null||e===void 0?void 0:e.length)===0)return;
        if(this.candidates&&this.candidates.length>1)console.warn("there are multiple candidates in the response, returning executable code from the first one.");
        let s=(i=(h=(r=(t=this.candidates)===null||t===void 0?void 0:t[0])===null||r===void 0?void 0:r.content)===null||h===void 0?void 0:h.parts)===null||i===void 0?void 0:i.filter((A)=>A.executableCode).map((A)=>A.executableCode).filter((A)=>A!==void 0);
        if((s===null||s===void 0?void 0:s.length)===0)return;
      return(c=s===null||s===void 0?void 0:s[0])===null||c===void 0?void 0:c.code}
      get codeExecutionResult(){
        var T,R,a,e,t,r,h,i,c;
        if(((e=(a=(R=(T=this.candidates)===null||T===void 0?void 0:T[0])===null||R===void 0?void 0:R.content)===null||a===void 0?void 0:a.parts)===null||e===void 0?void 0:e.length)===0)return;
        if(this.candidates&&this.candidates.length>1)console.warn("there are multiple candidates in the response, returning code execution result from the first one.");
        let s=(i=(h=(r=(t=this.candidates)===null||t===void 0?void 0:t[0])===null||r===void 0?void 0:r.content)===null||h===void 0?void 0:h.parts)===null||i===void 0?void 0:i.filter((A)=>A.codeExecutionResult).map((A)=>A.codeExecutionResult).filter((A)=>A!==void 0);
        if((s===null||s===void 0?void 0:s.length)===0)return;
      return(c=s===null||s===void 0?void 0:s[0])===null||c===void 0?void 0:c.output}
  }
    class kK{
  }
    class xK{
  }
    class dBT{
  }
    class EBT{
  }
    class CBT{
  }
    class LBT{
  }
    class fK{
  }
    class IK{
  }
    class gK{
  }
    class MBT{
  }
    class A7{
      _fromAPIResponse({
      apiResponse:T,_isVertexAI:R}
    ){
        let a=new A7,e,t=T;
        if(R)e=e$R(t);
        else e=a$R(t);
      return Object.assign(a,e),a}
  }
    class $K{
  }
    class vK{
  }
    class jK{
  }
    class SK{
  }
    class DBT{
  }
    class wBT{
  }
    class BBT{
  }
    class N8T{
      _fromAPIResponse({
      apiResponse:T,_isVertexAI:R}
    ){
        let a=new N8T,e=o$R(T);
      return Object.assign(a,e),a}
  }
    class NBT{
  }
    class UBT{
  }
    class HBT{
  }
    class WBT{
  }
    class OK{
  }
    class qBT{
      get text(){
        var T,R,a;
        let e="",t=!1,r=[];
        for(let h of(a=(R=(T=this.serverContent)===null||T===void 0?void 0:T.modelTurn)===null||R===void 0?void 0:R.parts)!==null&&a!==void 0?a:[]){
          for(let[i,c]of Object.entries(h))if(i!=="text"&&i!=="thought"&&c!==null)r.push(i);
          if(typeof h.text==="string"){
            if(typeof h.thought==="boolean"&&h.thought)continue;
          t=!0,e+=h.text}
      }
        if(r.length>0)console.warn(`there are non-text parts ${r} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`);
      return t?e:void 0}
      get data(){
        var T,R,a;
        let e="",t=[];
        for(let r of(a=(R=(T=this.serverContent)===null||T===void 0?void 0:T.modelTurn)===null||R===void 0?void 0:R.parts)!==null&&a!==void 0?a:[]){
          for(let[h,i]of Object.entries(r))if(h!=="inlineData"&&i!==null)t.push(h);
        if(r.inlineData&&typeof r.inlineData.data==="string")e+=atob(r.inlineData.data)}
        if(t.length>0)console.warn(`there are non-data parts ${t} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`);
      return e.length>0?btoa(e):void 0}
  }
    class zBT{
      get audioChunk(){
        if(this.serverContent&&this.serverContent.audioChunks&&this.serverContent.audioChunks.length>0)return this.serverContent.audioChunks[0];
      return}
  }
    class rU{
      _fromAPIResponse({
      apiResponse:T,_isVertexAI:R}
    ){
        let a=new rU,e=B8T(T);
      return Object.assign(a,e),a}
  }
    function g8(T,R){
      if(!R||typeof R!=="string")throw Error("model is required and must be a string");
      if(R.includes("..")||R.includes("?")||R.includes("&"))throw Error("invalid model parameter");
      if(T.isVertexAI())if(R.startsWith("publishers/")||R.startsWith("projects/")||R.startsWith("models/"))return R;
      else if(R.indexOf("/")>=0){
        let a=R.split("/",2);
      return`publishers/${a[0]}/models/${a[1]}`}
      else return`publishers/google/models/${R}`;
      else if(R.startsWith("models/")||R.startsWith("tunedModels/"))return R;
    else return`models/${R}`}
    function FBT(T,R){
      let a=g8(T,R);
      if(!a)return"";
      if(a.startsWith("publishers/")&&T.isVertexAI())return`projects/${T.getProject()}/locations/${T.getLocation()}/${a}`;
      else if(a.startsWith("models/")&&T.isVertexAI())return`projects/${T.getProject()}/locations/${T.getLocation()}/publishers/google/${a}`;
    else return a}
    function GBT(T){
      if(Array.isArray(T))return T.map((R)=>p7(R));
    else return[p7(T)]}
    function p7(T){
      if(typeof T==="object"&&T!==null)return T;
    throw Error(`Could not parse input as Blob. Unsupported blob type: ${typeof T}`)}
    function KBT(T){
      let R=p7(T);
      if(R.mimeType&&R.mimeType.startsWith("image/"))return R;
    throw Error(`Unsupported mime type: ${R.mimeType}`)}
    function VBT(T){
      let R=p7(T);
      if(R.mimeType&&R.mimeType.startsWith("audio/"))return R;
    throw Error(`Unsupported mime type: ${R.mimeType}`)}
    function UAT(T){
      if(T===null||T===void 0)throw Error("PartUnion is required");
      if(typeof T==="object")return T;
      if(typeof T==="string")return{
      text:T}
      ;
    throw Error(`Unsupported part type: ${typeof T}`)}
    function XBT(T){
      if(T===null||T===void 0||Array.isArray(T)&&T.length===0)throw Error("PartListUnion is required");
      if(Array.isArray(T))return T.map((R)=>UAT(R));
    return[UAT(T)]}
    function dK(T){
    return T!==null&&T!==void 0&&typeof T==="object"&&"parts"in T&&Array.isArray(T.parts)}
    function HAT(T){
    return T!==null&&T!==void 0&&typeof T==="object"&&"functionCall"in T}
    function WAT(T){
    return T!==null&&T!==void 0&&typeof T==="object"&&"functionResponse"in T}
    function it(T){
      if(T===null||T===void 0)throw Error("ContentUnion is required");
      if(dK(T))return T;
      return{
      role:"user",parts:XBT(T)}
  }
    function U8T(T,R){
      if(!R)return[];
      if(T.isVertexAI()&&Array.isArray(R))return R.flatMap((a)=>{
        let e=it(a);
        if(e.parts&&e.parts.length>0&&e.parts[0].text!==void 0)return[e.parts[0].text];
      return[]}
    );
      else if(T.isVertexAI()){
        let a=it(R);
        if(a.parts&&a.parts.length>0&&a.parts[0].text!==void 0)return[a.parts[0].text];
      return[]}
      if(Array.isArray(R))return R.map((a)=>it(a));
    return[it(R)]}
    function ui(T){
      if(T===null||T===void 0||Array.isArray(T)&&T.length===0)throw Error("contents are required");
      if(!Array.isArray(T)){
        if(HAT(T)||WAT(T))throw Error("To specify functionCall or functionResponse parts, please wrap them in a Content object, specifying the role for them");
      return[it(T)]}
      let R=[],a=[],e=dK(T[0]);
      for(let t of T){
        let r=dK(t);
        if(r!=e)throw Error("Mixing Content and Parts is not supported, please group the parts into a the appropriate Content objects and specify the roles for them");
        if(r)R.push(t);
        else if(HAT(t)||WAT(t))throw Error("To specify functionCall or functionResponse parts, please wrap them, and any other parts, in Content objects as appropriate, specifying the role for them");
      else a.push(t)}
      if(!e)R.push({
      role:"user",parts:XBT(a)}
    );
    return R}
    function _$R(T,R){
      if(T.includes("null"))R.nullable=!0;
      let a=T.filter((e)=>e!=="null");
      if(a.length===1)R.type=Object.values(Pr).includes(a[0].toUpperCase())?a[0].toUpperCase():Pr.TYPE_UNSPECIFIED;
      else{
        R.anyOf=[];
        for(let e of a)R.anyOf.push({
        type:Object.values(Pr).includes(e.toUpperCase())?e.toUpperCase():Pr.TYPE_UNSPECIFIED}
    )}
  }
    function LP(T){
      let R={
    }
      ,a=["items"],e=["anyOf"],t=["properties"];
      if(T.type&&T.anyOf)throw Error("type and anyOf cannot be both populated.");
      let r=T.anyOf;
      if(r!=null&&r.length==2){
        if(r[0].type==="null")R.nullable=!0,T=r[1];
      else if(r[1].type==="null")R.nullable=!0,T=r[0]}
      if(T.type instanceof Array)_$R(T.type,R);
      for(let[h,i]of Object.entries(T)){
        if(i==null)continue;
        if(h=="type"){
          if(i==="null")throw Error("type: null can not be the only possible type for the field.");
          if(i instanceof Array)continue;
        R.type=Object.values(Pr).includes(i.toUpperCase())?i.toUpperCase():Pr.TYPE_UNSPECIFIED}
        else if(a.includes(h))R[h]=LP(i);
        else if(e.includes(h)){
          let c=[];
          for(let s of i){
            if(s.type=="null"){
              R.nullable=!0;
            continue}
          c.push(LP(s))}
        R[h]=c}
        else if(t.includes(h)){
          let c={
        }
          ;
          for(let[s,A]of Object.entries(i))c[s]=LP(A);
        R[h]=c}
        else{
          if(h==="additionalProperties")continue;
        R[h]=i}
    }
    return R}
    function H8T(T){
    return LP(T)}
    function W8T(T){
      if(typeof T==="object")return T;
      else if(typeof T==="string")return{
        voiceConfig:{
          prebuiltVoiceConfig:{
          voiceName:T}
      }
    }
      ;
    else throw Error(`Unsupported speechConfig type: ${typeof T}`)}
    function q8T(T){
      if("multiSpeakerVoiceConfig"in T)throw Error("multiSpeakerVoiceConfig is not supported in the live API.");
    return T}
    function Mx(T){
      if(T.functionDeclarations)for(let R of T.functionDeclarations){
        if(R.parameters){
          if(!Object.keys(R.parameters).includes("$schema"))R.parameters=LP(R.parameters);
        else if(!R.parametersJsonSchema)R.parametersJsonSchema=R.parameters,delete R.parameters}
        if(R.response){
          if(!Object.keys(R.response).includes("$schema"))R.response=LP(R.response);
        else if(!R.responseJsonSchema)R.responseJsonSchema=R.response,delete R.response}
    }
    return T}
    function Dx(T){
      if(T===void 0||T===null)throw Error("tools is required");
      if(!Array.isArray(T))throw Error("tools is required and must be an array of Tools");
      let R=[];
      for(let a of T)R.push(a);
    return R}
    function b$R(T,R,a,e=1){
      let t=!R.startsWith(`${a}/`)&&R.split("/").length===e;
      if(T.isVertexAI())if(R.startsWith("projects/"))return R;
      else if(R.startsWith("locations/"))return`projects/${T.getProject()}/${R}`;
      else if(R.startsWith(`${a}/`))return`projects/${T.getProject()}/locations/${T.getLocation()}/${R}`;
      else if(t)return`projects/${T.getProject()}/locations/${T.getLocation()}/${a}/${R}`;
      else return R;
      if(t)return`${a}/${R}`;
    return R}
    function Cn(T,R){
      if(typeof R!=="string")throw Error("name must be a string");
    return b$R(T,R,"cachedContents")}
    function YBT(T){
      switch(T){
        case"STATE_UNSPECIFIED":return"JOB_STATE_UNSPECIFIED";
        case"CREATING":return"JOB_STATE_RUNNING";
        case"ACTIVE":return"JOB_STATE_SUCCEEDED";
        case"FAILED":return"JOB_STATE_FAILED";
      default:return T}
  }
    function hp(T){
    return w8T(T)}
    function m$R(T){
    return T!==null&&T!==void 0&&typeof T==="object"&&"name"in T}
    function QBT(T){
    return T!==null&&T!==void 0&&typeof T==="object"&&"video"in T}
    function ZBT(T){
    return T!==null&&T!==void 0&&typeof T==="object"&&"uri"in T}
    function z8T(T){
      var R;
      let a;
      if(m$R(T))a=T.name;
      if(ZBT(T)){
      if(a=T.uri,a===void 0)return}
      if(QBT(T)){
      if(a=(R=T.video)===null||R===void 0?void 0:R.uri,a===void 0)return}
      if(typeof T==="string")a=T;
      if(a===void 0)throw Error("Could not extract file name from the provided input.");
      if(a.startsWith("https://")){
        let e=a.split("files/")[1].match(/[a-z0-9]+/);
        if(e===null)throw Error(`Could not extract file name from URI ${a}`);
      a=e[0]}
      else if(a.startsWith("files/"))a=a.split("files/")[1];
    return a}
    function JBT(T,R){
      let a;
      if(T.isVertexAI())a=R?"publishers/google/models":"models";
      else a=R?"models":"tunedModels";
    return a}
    function T6T(T){
      for(let R of["models","tunedModels","publisherModels"])if(u$R(T,R))return T[R];
    return[]}
    function u$R(T,R){
    return T!==null&&typeof T==="object"&&R in T}
    function y$R(T,R={
  }
  ){
      let a=T,e={
      name:a.name,description:a.description,parametersJsonSchema:a.inputSchema}
      ;
      if(a.outputSchema)e.responseJsonSchema=a.outputSchema;
      if(R.behavior)e.behavior=R.behavior;
      return{
      functionDeclarations:[e]}
  }
    function P$R(T,R={
  }
  ){
      let a=[],e=new Set;
      for(let t of T){
        let r=t.name;
        if(e.has(r))throw Error(`Duplicate function name ${r} found in MCP tools. Please ensure function names are unique.`);
        e.add(r);
        let h=y$R(t,R);
      if(h.functionDeclarations)a.push(...h.functionDeclarations)}
      return{
      functionDeclarations:a}
  }
    function R6T(T,R){
      let a;
      if(typeof R==="string")if(T.isVertexAI())if(R.startsWith("gs://"))a={
      format:"jsonl",gcsUri:[R]}
      ;
      else if(R.startsWith("bq://"))a={
      format:"bigquery",bigqueryUri:R}
      ;
      else throw Error(`Unsupported string source for Vertex AI: ${R}`);
      else if(R.startsWith("files/"))a={
      fileName:R}
      ;
      else throw Error(`Unsupported string source for Gemini API: ${R}`);
      else if(Array.isArray(R)){
        if(T.isVertexAI())throw Error("InlinedRequest[] is not supported in Vertex AI.");
        a={
        inlinedRequests:R}
    }
      else a=R;
      let e=[a.gcsUri,a.bigqueryUri].filter(Boolean).length,t=[a.inlinedRequests,a.fileName].filter(Boolean).length;
      if(T.isVertexAI()){
      if(t>0||e!==1)throw Error("Exactly one of `gcsUri` or `bigqueryUri` must be set for Vertex AI.")}
      else if(e>0||t!==1)throw Error("Exactly one of `inlinedRequests`, `fileName`, must be set for Gemini API.");
    return a}
    function k$R(T){
      if(typeof T!=="string")return T;
      let R=T;
      if(R.startsWith("gs://"))return{
      format:"jsonl",gcsUri:R}
      ;
      else if(R.startsWith("bq://"))return{
      format:"bigquery",bigqueryUri:R}
      ;
    else throw Error(`Unsupported destination: ${R}`)}
    function a6T(T){
      if(typeof T!=="object"||T===null)return{
    }
      ;
      let R=T,a=R.inlinedResponses;
      if(typeof a!=="object"||a===null)return T;
      let e=a.inlinedResponses;
      if(!Array.isArray(e)||e.length===0)return T;
      let t=!1;
      for(let r of e){
        if(typeof r!=="object"||r===null)continue;
        let h=r.response;
        if(typeof h!=="object"||h===null)continue;
        if(h.embedding!==void 0){
          t=!0;
        break}
    }
      if(t)R.inlinedEmbedContentResponses=R.inlinedResponses,delete R.inlinedResponses;
    return T}
    function wx(T,R){
      let a=R;
      if(!T.isVertexAI())if(/batches\/[^/]+$/.test(a))return a.split("/").pop();
      else throw Error(`Invalid batch job name: ${a}.`);
      if(/^projects\/[^/]+\/locations\/[^/]+\/batchPredictionJobs\/[^/]+$/.test(a))return a.split("/").pop();
      else if(/^\d+$/.test(a))return a;
    else throw Error(`Invalid batch job name: ${a}.`)}
    function e6T(T){
      let R=T;
      if(R==="BATCH_STATE_UNSPECIFIED")return"JOB_STATE_UNSPECIFIED";
      else if(R==="BATCH_STATE_PENDING")return"JOB_STATE_PENDING";
      else if(R==="BATCH_STATE_RUNNING")return"JOB_STATE_RUNNING";
      else if(R==="BATCH_STATE_SUCCEEDED")return"JOB_STATE_SUCCEEDED";
      else if(R==="BATCH_STATE_FAILED")return"JOB_STATE_FAILED";
      else if(R==="BATCH_STATE_CANCELLED")return"JOB_STATE_CANCELLED";
      else if(R==="BATCH_STATE_EXPIRED")return"JOB_STATE_EXPIRED";
    else return R}
    function x$R(T){
      let R={
    }
      ,a=H(T,["responsesFile"]);
      if(a!=null)Y(R,["fileName"],a);
      let e=H(T,["inlinedResponses","inlinedResponses"]);
      if(e!=null){
        let r=e;
        if(Array.isArray(r))r=r.map((h)=>{
        return avR(h)}
      );
      Y(R,["inlinedResponses"],r)}
      let t=H(T,["inlinedEmbedContentResponses","inlinedResponses"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(R,["inlinedEmbedContentResponses"],r)}
    return R}
    function f$R(T){
      let R={
    }
      ,a=H(T,["predictionsFormat"]);
      if(a!=null)Y(R,["format"],a);
      let e=H(T,["gcsDestination","outputUriPrefix"]);
      if(e!=null)Y(R,["gcsUri"],e);
      let t=H(T,["bigqueryDestination","outputUri"]);
      if(t!=null)Y(R,["bigqueryUri"],t);
    return R}
    function I$R(T){
      let R={
    }
      ,a=H(T,["format"]);
      if(a!=null)Y(R,["predictionsFormat"],a);
      let e=H(T,["gcsUri"]);
      if(e!=null)Y(R,["gcsDestination","outputUriPrefix"],e);
      let t=H(T,["bigqueryUri"]);
      if(t!=null)Y(R,["bigqueryDestination","outputUri"],t);
      if(H(T,["fileName"])!==void 0)throw Error("fileName parameter is not supported in Vertex AI.");
      if(H(T,["inlinedResponses"])!==void 0)throw Error("inlinedResponses parameter is not supported in Vertex AI.");
      if(H(T,["inlinedEmbedContentResponses"])!==void 0)throw Error("inlinedEmbedContentResponses parameter is not supported in Vertex AI.");
    return R}
    function WL(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["name"],a);
      let e=H(T,["metadata","displayName"]);
      if(e!=null)Y(R,["displayName"],e);
      let t=H(T,["metadata","state"]);
      if(t!=null)Y(R,["state"],e6T(t));
      let r=H(T,["metadata","createTime"]);
      if(r!=null)Y(R,["createTime"],r);
      let h=H(T,["metadata","endTime"]);
      if(h!=null)Y(R,["endTime"],h);
      let i=H(T,["metadata","updateTime"]);
      if(i!=null)Y(R,["updateTime"],i);
      let c=H(T,["metadata","model"]);
      if(c!=null)Y(R,["model"],c);
      let s=H(T,["metadata","output"]);
      if(s!=null)Y(R,["dest"],x$R(a6T(s)));
    return R}
    function EK(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["name"],a);
      let e=H(T,["displayName"]);
      if(e!=null)Y(R,["displayName"],e);
      let t=H(T,["state"]);
      if(t!=null)Y(R,["state"],e6T(t));
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
      let h=H(T,["createTime"]);
      if(h!=null)Y(R,["createTime"],h);
      let i=H(T,["startTime"]);
      if(i!=null)Y(R,["startTime"],i);
      let c=H(T,["endTime"]);
      if(c!=null)Y(R,["endTime"],c);
      let s=H(T,["updateTime"]);
      if(s!=null)Y(R,["updateTime"],s);
      let A=H(T,["model"]);
      if(A!=null)Y(R,["model"],A);
      let l=H(T,["inputConfig"]);
      if(l!=null)Y(R,["src"],g$R(l));
      let o=H(T,["outputConfig"]);
      if(o!=null)Y(R,["dest"],f$R(a6T(o)));
      let n=H(T,["completionStats"]);
      if(n!=null)Y(R,["completionStats"],n);
    return R}
    function g$R(T){
      let R={
    }
      ,a=H(T,["instancesFormat"]);
      if(a!=null)Y(R,["format"],a);
      let e=H(T,["gcsSource","uris"]);
      if(e!=null)Y(R,["gcsUri"],e);
      let t=H(T,["bigquerySource","inputUri"]);
      if(t!=null)Y(R,["bigqueryUri"],t);
    return R}
    function $$R(T,R){
      let a={
    }
      ;
      if(H(R,["format"])!==void 0)throw Error("format parameter is not supported in Gemini API.");
      if(H(R,["gcsUri"])!==void 0)throw Error("gcsUri parameter is not supported in Gemini API.");
      if(H(R,["bigqueryUri"])!==void 0)throw Error("bigqueryUri parameter is not supported in Gemini API.");
      let e=H(R,["fileName"]);
      if(e!=null)Y(a,["fileName"],e);
      let t=H(R,["inlinedRequests"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return RvR(T,h)}
      );
      Y(a,["requests","requests"],r)}
    return a}
    function v$R(T){
      let R={
    }
      ,a=H(T,["format"]);
      if(a!=null)Y(R,["instancesFormat"],a);
      let e=H(T,["gcsUri"]);
      if(e!=null)Y(R,["gcsSource","uris"],e);
      let t=H(T,["bigqueryUri"]);
      if(t!=null)Y(R,["bigquerySource","inputUri"],t);
      if(H(T,["fileName"])!==void 0)throw Error("fileName parameter is not supported in Vertex AI.");
      if(H(T,["inlinedRequests"])!==void 0)throw Error("inlinedRequests parameter is not supported in Vertex AI.");
    return R}
    function j$R(T){
      let R={
    }
      ,a=H(T,["data"]);
      if(a!=null)Y(R,["data"],a);
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function S$R(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],wx(T,e));
    return a}
    function O$R(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],wx(T,e));
    return a}
    function d$R(T){
      let R={
    }
      ,a=H(T,["content"]);
      if(a!=null)Y(R,["content"],a);
      let e=H(T,["citationMetadata"]);
      if(e!=null)Y(R,["citationMetadata"],E$R(e));
      let t=H(T,["tokenCount"]);
      if(t!=null)Y(R,["tokenCount"],t);
      let r=H(T,["finishReason"]);
      if(r!=null)Y(R,["finishReason"],r);
      let h=H(T,["avgLogprobs"]);
      if(h!=null)Y(R,["avgLogprobs"],h);
      let i=H(T,["groundingMetadata"]);
      if(i!=null)Y(R,["groundingMetadata"],i);
      let c=H(T,["index"]);
      if(c!=null)Y(R,["index"],c);
      let s=H(T,["logprobsResult"]);
      if(s!=null)Y(R,["logprobsResult"],s);
      let A=H(T,["safetyRatings"]);
      if(A!=null){
        let o=A;
        if(Array.isArray(o))o=o.map((n)=>{
        return n}
      );
      Y(R,["safetyRatings"],o)}
      let l=H(T,["urlContextMetadata"]);
      if(l!=null)Y(R,["urlContextMetadata"],l);
    return R}
    function E$R(T){
      let R={
    }
      ,a=H(T,["citationSources"]);
      if(a!=null){
        let e=a;
        if(Array.isArray(e))e=e.map((t)=>{
        return t}
      );
      Y(R,["citations"],e)}
    return R}
    function t6T(T){
      let R={
    }
      ,a=H(T,["parts"]);
      if(a!=null){
        let t=a;
        if(Array.isArray(t))t=t.map((r)=>{
        return svR(r)}
      );
      Y(R,["parts"],t)}
      let e=H(T,["role"]);
      if(e!=null)Y(R,["role"],e);
    return R}
    function C$R(T,R){
      let a={
    }
      ,e=H(T,["displayName"]);
      if(R!==void 0&&e!=null)Y(R,["batch","displayName"],e);
      if(H(T,["dest"])!==void 0)throw Error("dest parameter is not supported in Gemini API.");
    return a}
    function L$R(T,R){
      let a={
    }
      ,e=H(T,["displayName"]);
      if(R!==void 0&&e!=null)Y(R,["displayName"],e);
      let t=H(T,["dest"]);
      if(R!==void 0&&t!=null)Y(R,["outputConfig"],I$R(k$R(t)));
    return a}
    function qAT(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["_url","model"],g8(T,e));
      let t=H(R,["src"]);
      if(t!=null)Y(a,["batch","inputConfig"],$$R(T,R6T(T,t)));
      let r=H(R,["config"]);
      if(r!=null)C$R(r,a);
    return a}
    function M$R(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["model"],g8(T,e));
      let t=H(R,["src"]);
      if(t!=null)Y(a,["inputConfig"],v$R(R6T(T,t)));
      let r=H(R,["config"]);
      if(r!=null)L$R(r,a);
    return a}
    function D$R(T,R){
      let a={
    }
      ,e=H(T,["displayName"]);
      if(R!==void 0&&e!=null)Y(R,["batch","displayName"],e);
    return a}
    function w$R(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["_url","model"],g8(T,e));
      let t=H(R,["src"]);
      if(t!=null)Y(a,["batch","inputConfig"],z$R(T,t));
      let r=H(R,["config"]);
      if(r!=null)D$R(r,a);
    return a}
    function B$R(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],wx(T,e));
    return a}
    function N$R(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],wx(T,e));
    return a}
    function U$R(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["name"]);
      if(e!=null)Y(R,["name"],e);
      let t=H(T,["done"]);
      if(t!=null)Y(R,["done"],t);
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
    return R}
    function H$R(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["name"]);
      if(e!=null)Y(R,["name"],e);
      let t=H(T,["done"]);
      if(t!=null)Y(R,["done"],t);
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
    return R}
    function W$R(T,R){
      let a={
    }
      ,e=H(R,["contents"]);
      if(e!=null){
        let r=U8T(T,e);
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(a,["requests[]","request","content"],r)}
      let t=H(R,["config"]);
      if(t!=null)Y(a,["_self"],q$R(t,a)),T$R(a,{
      "requests[].*":"requests[].request.*"}
    );
    return a}
    function q$R(T,R){
      let a={
    }
      ,e=H(T,["taskType"]);
      if(R!==void 0&&e!=null)Y(R,["requests[]","taskType"],e);
      let t=H(T,["title"]);
      if(R!==void 0&&t!=null)Y(R,["requests[]","title"],t);
      let r=H(T,["outputDimensionality"]);
      if(R!==void 0&&r!=null)Y(R,["requests[]","outputDimensionality"],r);
      if(H(T,["mimeType"])!==void 0)throw Error("mimeType parameter is not supported in Gemini API.");
      if(H(T,["autoTruncate"])!==void 0)throw Error("autoTruncate parameter is not supported in Gemini API.");
    return a}
    function z$R(T,R){
      let a={
    }
      ,e=H(R,["fileName"]);
      if(e!=null)Y(a,["file_name"],e);
      let t=H(R,["inlinedRequests"]);
      if(t!=null)Y(a,["requests"],W$R(T,t));
    return a}
    function F$R(T){
      let R={
    }
      ;
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let a=H(T,["fileUri"]);
      if(a!=null)Y(R,["fileUri"],a);
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function G$R(T){
      let R={
    }
      ,a=H(T,["id"]);
      if(a!=null)Y(R,["id"],a);
      let e=H(T,["args"]);
      if(e!=null)Y(R,["args"],e);
      let t=H(T,["name"]);
      if(t!=null)Y(R,["name"],t);
      if(H(T,["partialArgs"])!==void 0)throw Error("partialArgs parameter is not supported in Gemini API.");
      if(H(T,["willContinue"])!==void 0)throw Error("willContinue parameter is not supported in Gemini API.");
    return R}
    function K$R(T){
      let R={
    }
      ,a=H(T,["allowedFunctionNames"]);
      if(a!=null)Y(R,["allowedFunctionNames"],a);
      let e=H(T,["mode"]);
      if(e!=null)Y(R,["mode"],e);
      if(H(T,["streamFunctionCallArguments"])!==void 0)throw Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
    return R}
    function V$R(T,R,a){
      let e={
    }
      ,t=H(R,["systemInstruction"]);
      if(a!==void 0&&t!=null)Y(a,["systemInstruction"],t6T(it(t)));
      let r=H(R,["temperature"]);
      if(r!=null)Y(e,["temperature"],r);
      let h=H(R,["topP"]);
      if(h!=null)Y(e,["topP"],h);
      let i=H(R,["topK"]);
      if(i!=null)Y(e,["topK"],i);
      let c=H(R,["candidateCount"]);
      if(c!=null)Y(e,["candidateCount"],c);
      let s=H(R,["maxOutputTokens"]);
      if(s!=null)Y(e,["maxOutputTokens"],s);
      let A=H(R,["stopSequences"]);
      if(A!=null)Y(e,["stopSequences"],A);
      let l=H(R,["responseLogprobs"]);
      if(l!=null)Y(e,["responseLogprobs"],l);
      let o=H(R,["logprobs"]);
      if(o!=null)Y(e,["logprobs"],o);
      let n=H(R,["presencePenalty"]);
      if(n!=null)Y(e,["presencePenalty"],n);
      let p=H(R,["frequencyPenalty"]);
      if(p!=null)Y(e,["frequencyPenalty"],p);
      let _=H(R,["seed"]);
      if(_!=null)Y(e,["seed"],_);
      let m=H(R,["responseMimeType"]);
      if(m!=null)Y(e,["responseMimeType"],m);
      let b=H(R,["responseSchema"]);
      if(b!=null)Y(e,["responseSchema"],H8T(b));
      let y=H(R,["responseJsonSchema"]);
      if(y!=null)Y(e,["responseJsonSchema"],y);
      if(H(R,["routingConfig"])!==void 0)throw Error("routingConfig parameter is not supported in Gemini API.");
      if(H(R,["modelSelectionConfig"])!==void 0)throw Error("modelSelectionConfig parameter is not supported in Gemini API.");
      let u=H(R,["safetySettings"]);
      if(a!==void 0&&u!=null){
        let j=u;
        if(Array.isArray(j))j=j.map((d)=>{
        return ovR(d)}
      );
      Y(a,["safetySettings"],j)}
      let P=H(R,["tools"]);
      if(a!==void 0&&P!=null){
        let j=Dx(P);
        if(Array.isArray(j))j=j.map((d)=>{
        return lvR(Mx(d))}
      );
      Y(a,["tools"],j)}
      let k=H(R,["toolConfig"]);
      if(a!==void 0&&k!=null)Y(a,["toolConfig"],nvR(k));
      if(H(R,["labels"])!==void 0)throw Error("labels parameter is not supported in Gemini API.");
      let x=H(R,["cachedContent"]);
      if(a!==void 0&&x!=null)Y(a,["cachedContent"],Cn(T,x));
      let f=H(R,["responseModalities"]);
      if(f!=null)Y(e,["responseModalities"],f);
      let v=H(R,["mediaResolution"]);
      if(v!=null)Y(e,["mediaResolution"],v);
      let g=H(R,["speechConfig"]);
      if(g!=null)Y(e,["speechConfig"],W8T(g));
      if(H(R,["audioTimestamp"])!==void 0)throw Error("audioTimestamp parameter is not supported in Gemini API.");
      let I=H(R,["thinkingConfig"]);
      if(I!=null)Y(e,["thinkingConfig"],I);
      let S=H(R,["imageConfig"]);
      if(S!=null)Y(e,["imageConfig"],TvR(S));
      let O=H(R,["enableEnhancedCivicAnswers"]);
      if(O!=null)Y(e,["enableEnhancedCivicAnswers"],O);
      if(H(R,["modelArmorConfig"])!==void 0)throw Error("modelArmorConfig parameter is not supported in Gemini API.");
    return e}
    function X$R(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["candidates"]);
      if(e!=null){
        let c=e;
        if(Array.isArray(c))c=c.map((s)=>{
        return d$R(s)}
      );
      Y(R,["candidates"],c)}
      let t=H(T,["modelVersion"]);
      if(t!=null)Y(R,["modelVersion"],t);
      let r=H(T,["promptFeedback"]);
      if(r!=null)Y(R,["promptFeedback"],r);
      let h=H(T,["responseId"]);
      if(h!=null)Y(R,["responseId"],h);
      let i=H(T,["usageMetadata"]);
      if(i!=null)Y(R,["usageMetadata"],i);
    return R}
    function Y$R(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],wx(T,e));
    return a}
    function Q$R(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],wx(T,e));
    return a}
    function Z$R(T){
      let R={
    }
      ;
      if(H(T,["authConfig"])!==void 0)throw Error("authConfig parameter is not supported in Gemini API.");
      let a=H(T,["enableWidget"]);
      if(a!=null)Y(R,["enableWidget"],a);
    return R}
    function J$R(T){
      let R={
    }
      ;
      if(H(T,["excludeDomains"])!==void 0)throw Error("excludeDomains parameter is not supported in Gemini API.");
      if(H(T,["blockingConfidence"])!==void 0)throw Error("blockingConfidence parameter is not supported in Gemini API.");
      let a=H(T,["timeRangeFilter"]);
      if(a!=null)Y(R,["timeRangeFilter"],a);
    return R}
    function TvR(T){
      let R={
    }
      ,a=H(T,["aspectRatio"]);
      if(a!=null)Y(R,["aspectRatio"],a);
      let e=H(T,["imageSize"]);
      if(e!=null)Y(R,["imageSize"],e);
      if(H(T,["personGeneration"])!==void 0)throw Error("personGeneration parameter is not supported in Gemini API.");
      if(H(T,["outputMimeType"])!==void 0)throw Error("outputMimeType parameter is not supported in Gemini API.");
      if(H(T,["outputCompressionQuality"])!==void 0)throw Error("outputCompressionQuality parameter is not supported in Gemini API.");
    return R}
    function RvR(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["request","model"],g8(T,e));
      let t=H(R,["contents"]);
      if(t!=null){
        let i=ui(t);
        if(Array.isArray(i))i=i.map((c)=>{
        return t6T(c)}
      );
      Y(a,["request","contents"],i)}
      let r=H(R,["metadata"]);
      if(r!=null)Y(a,["metadata"],r);
      let h=H(R,["config"]);
      if(h!=null)Y(a,["request","generationConfig"],V$R(T,h,H(a,["request"],{
    }
    )));
    return a}
    function avR(T){
      let R={
    }
      ,a=H(T,["response"]);
      if(a!=null)Y(R,["response"],X$R(a));
      let e=H(T,["metadata"]);
      if(e!=null)Y(R,["metadata"],e);
      let t=H(T,["error"]);
      if(t!=null)Y(R,["error"],t);
    return R}
    function evR(T,R){
      let a={
    }
      ,e=H(T,["pageSize"]);
      if(R!==void 0&&e!=null)Y(R,["_query","pageSize"],e);
      let t=H(T,["pageToken"]);
      if(R!==void 0&&t!=null)Y(R,["_query","pageToken"],t);
      if(H(T,["filter"])!==void 0)throw Error("filter parameter is not supported in Gemini API.");
    return a}
    function tvR(T,R){
      let a={
    }
      ,e=H(T,["pageSize"]);
      if(R!==void 0&&e!=null)Y(R,["_query","pageSize"],e);
      let t=H(T,["pageToken"]);
      if(R!==void 0&&t!=null)Y(R,["_query","pageToken"],t);
      let r=H(T,["filter"]);
      if(R!==void 0&&r!=null)Y(R,["_query","filter"],r);
    return a}
    function rvR(T){
      let R={
    }
      ,a=H(T,["config"]);
      if(a!=null)evR(a,R);
    return R}
    function hvR(T){
      let R={
    }
      ,a=H(T,["config"]);
      if(a!=null)tvR(a,R);
    return R}
    function ivR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["nextPageToken"]);
      if(e!=null)Y(R,["nextPageToken"],e);
      let t=H(T,["operations"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return WL(h)}
      );
      Y(R,["batchJobs"],r)}
    return R}
    function cvR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["nextPageToken"]);
      if(e!=null)Y(R,["nextPageToken"],e);
      let t=H(T,["batchPredictionJobs"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return EK(h)}
      );
      Y(R,["batchJobs"],r)}
    return R}
    function svR(T){
      let R={
    }
      ,a=H(T,["mediaResolution"]);
      if(a!=null)Y(R,["mediaResolution"],a);
      let e=H(T,["codeExecutionResult"]);
      if(e!=null)Y(R,["codeExecutionResult"],e);
      let t=H(T,["executableCode"]);
      if(t!=null)Y(R,["executableCode"],t);
      let r=H(T,["fileData"]);
      if(r!=null)Y(R,["fileData"],F$R(r));
      let h=H(T,["functionCall"]);
      if(h!=null)Y(R,["functionCall"],G$R(h));
      let i=H(T,["functionResponse"]);
      if(i!=null)Y(R,["functionResponse"],i);
      let c=H(T,["inlineData"]);
      if(c!=null)Y(R,["inlineData"],j$R(c));
      let s=H(T,["text"]);
      if(s!=null)Y(R,["text"],s);
      let A=H(T,["thought"]);
      if(A!=null)Y(R,["thought"],A);
      let l=H(T,["thoughtSignature"]);
      if(l!=null)Y(R,["thoughtSignature"],l);
      let o=H(T,["videoMetadata"]);
      if(o!=null)Y(R,["videoMetadata"],o);
    return R}
    function ovR(T){
      let R={
    }
      ,a=H(T,["category"]);
      if(a!=null)Y(R,["category"],a);
      if(H(T,["method"])!==void 0)throw Error("method parameter is not supported in Gemini API.");
      let e=H(T,["threshold"]);
      if(e!=null)Y(R,["threshold"],e);
    return R}
    function nvR(T){
      let R={
    }
      ,a=H(T,["retrievalConfig"]);
      if(a!=null)Y(R,["retrievalConfig"],a);
      let e=H(T,["functionCallingConfig"]);
      if(e!=null)Y(R,["functionCallingConfig"],K$R(e));
    return R}
    function lvR(T){
      let R={
    }
      ;
      if(H(T,["retrieval"])!==void 0)throw Error("retrieval parameter is not supported in Gemini API.");
      let a=H(T,["computerUse"]);
      if(a!=null)Y(R,["computerUse"],a);
      let e=H(T,["fileSearch"]);
      if(e!=null)Y(R,["fileSearch"],e);
      let t=H(T,["codeExecution"]);
      if(t!=null)Y(R,["codeExecution"],t);
      if(H(T,["enterpriseWebSearch"])!==void 0)throw Error("enterpriseWebSearch parameter is not supported in Gemini API.");
      let r=H(T,["functionDeclarations"]);
      if(r!=null){
        let A=r;
        if(Array.isArray(A))A=A.map((l)=>{
        return l}
      );
      Y(R,["functionDeclarations"],A)}
      let h=H(T,["googleMaps"]);
      if(h!=null)Y(R,["googleMaps"],Z$R(h));
      let i=H(T,["googleSearch"]);
      if(i!=null)Y(R,["googleSearch"],J$R(i));
      let c=H(T,["googleSearchRetrieval"]);
      if(c!=null)Y(R,["googleSearchRetrieval"],c);
      let s=H(T,["urlContext"]);
      if(s!=null)Y(R,["urlContext"],s);
    return R}
    function AvR(T){
      let R={
    }
      ,a=H(T,["data"]);
      if(a!=null)Y(R,["data"],a);
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function zAT(T){
      let R={
    }
      ,a=H(T,["parts"]);
      if(a!=null){
        let t=a;
        if(Array.isArray(t))t=t.map((r)=>{
        return DvR(r)}
      );
      Y(R,["parts"],t)}
      let e=H(T,["role"]);
      if(e!=null)Y(R,["role"],e);
    return R}
    function pvR(T,R){
      let a={
    }
      ,e=H(T,["ttl"]);
      if(R!==void 0&&e!=null)Y(R,["ttl"],e);
      let t=H(T,["expireTime"]);
      if(R!==void 0&&t!=null)Y(R,["expireTime"],t);
      let r=H(T,["displayName"]);
      if(R!==void 0&&r!=null)Y(R,["displayName"],r);
      let h=H(T,["contents"]);
      if(R!==void 0&&h!=null){
        let A=ui(h);
        if(Array.isArray(A))A=A.map((l)=>{
        return zAT(l)}
      );
      Y(R,["contents"],A)}
      let i=H(T,["systemInstruction"]);
      if(R!==void 0&&i!=null)Y(R,["systemInstruction"],zAT(it(i)));
      let c=H(T,["tools"]);
      if(R!==void 0&&c!=null){
        let A=c;
        if(Array.isArray(A))A=A.map((l)=>{
        return BvR(l)}
      );
      Y(R,["tools"],A)}
      let s=H(T,["toolConfig"]);
      if(R!==void 0&&s!=null)Y(R,["toolConfig"],wvR(s));
      if(H(T,["kmsKeyName"])!==void 0)throw Error("kmsKeyName parameter is not supported in Gemini API.");
    return a}
    function _vR(T,R){
      let a={
    }
      ,e=H(T,["ttl"]);
      if(R!==void 0&&e!=null)Y(R,["ttl"],e);
      let t=H(T,["expireTime"]);
      if(R!==void 0&&t!=null)Y(R,["expireTime"],t);
      let r=H(T,["displayName"]);
      if(R!==void 0&&r!=null)Y(R,["displayName"],r);
      let h=H(T,["contents"]);
      if(R!==void 0&&h!=null){
        let l=ui(h);
        if(Array.isArray(l))l=l.map((o)=>{
        return o}
      );
      Y(R,["contents"],l)}
      let i=H(T,["systemInstruction"]);
      if(R!==void 0&&i!=null)Y(R,["systemInstruction"],it(i));
      let c=H(T,["tools"]);
      if(R!==void 0&&c!=null){
        let l=c;
        if(Array.isArray(l))l=l.map((o)=>{
        return NvR(o)}
      );
      Y(R,["tools"],l)}
      let s=H(T,["toolConfig"]);
      if(R!==void 0&&s!=null)Y(R,["toolConfig"],s);
      let A=H(T,["kmsKeyName"]);
      if(R!==void 0&&A!=null)Y(R,["encryption_spec","kmsKeyName"],A);
    return a}
    function bvR(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["model"],FBT(T,e));
      let t=H(R,["config"]);
      if(t!=null)pvR(t,a);
    return a}
    function mvR(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["model"],FBT(T,e));
      let t=H(R,["config"]);
      if(t!=null)_vR(t,a);
    return a}
    function uvR(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],Cn(T,e));
    return a}
    function yvR(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],Cn(T,e));
    return a}
    function PvR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
    return R}
    function kvR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
    return R}
    function xvR(T){
      let R={
    }
      ;
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let a=H(T,["fileUri"]);
      if(a!=null)Y(R,["fileUri"],a);
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function fvR(T){
      let R={
    }
      ,a=H(T,["id"]);
      if(a!=null)Y(R,["id"],a);
      let e=H(T,["args"]);
      if(e!=null)Y(R,["args"],e);
      let t=H(T,["name"]);
      if(t!=null)Y(R,["name"],t);
      if(H(T,["partialArgs"])!==void 0)throw Error("partialArgs parameter is not supported in Gemini API.");
      if(H(T,["willContinue"])!==void 0)throw Error("willContinue parameter is not supported in Gemini API.");
    return R}
    function IvR(T){
      let R={
    }
      ,a=H(T,["allowedFunctionNames"]);
      if(a!=null)Y(R,["allowedFunctionNames"],a);
      let e=H(T,["mode"]);
      if(e!=null)Y(R,["mode"],e);
      if(H(T,["streamFunctionCallArguments"])!==void 0)throw Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
    return R}
    function gvR(T){
      let R={
    }
      ,a=H(T,["description"]);
      if(a!=null)Y(R,["description"],a);
      let e=H(T,["name"]);
      if(e!=null)Y(R,["name"],e);
      let t=H(T,["parameters"]);
      if(t!=null)Y(R,["parameters"],t);
      let r=H(T,["parametersJsonSchema"]);
      if(r!=null)Y(R,["parametersJsonSchema"],r);
      let h=H(T,["response"]);
      if(h!=null)Y(R,["response"],h);
      let i=H(T,["responseJsonSchema"]);
      if(i!=null)Y(R,["responseJsonSchema"],i);
      if(H(T,["behavior"])!==void 0)throw Error("behavior parameter is not supported in Vertex AI.");
    return R}
    function $vR(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],Cn(T,e));
    return a}
    function vvR(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],Cn(T,e));
    return a}
    function jvR(T){
      let R={
    }
      ;
      if(H(T,["authConfig"])!==void 0)throw Error("authConfig parameter is not supported in Gemini API.");
      let a=H(T,["enableWidget"]);
      if(a!=null)Y(R,["enableWidget"],a);
    return R}
    function SvR(T){
      let R={
    }
      ;
      if(H(T,["excludeDomains"])!==void 0)throw Error("excludeDomains parameter is not supported in Gemini API.");
      if(H(T,["blockingConfidence"])!==void 0)throw Error("blockingConfidence parameter is not supported in Gemini API.");
      let a=H(T,["timeRangeFilter"]);
      if(a!=null)Y(R,["timeRangeFilter"],a);
    return R}
    function OvR(T,R){
      let a={
    }
      ,e=H(T,["pageSize"]);
      if(R!==void 0&&e!=null)Y(R,["_query","pageSize"],e);
      let t=H(T,["pageToken"]);
      if(R!==void 0&&t!=null)Y(R,["_query","pageToken"],t);
    return a}
    function dvR(T,R){
      let a={
    }
      ,e=H(T,["pageSize"]);
      if(R!==void 0&&e!=null)Y(R,["_query","pageSize"],e);
      let t=H(T,["pageToken"]);
      if(R!==void 0&&t!=null)Y(R,["_query","pageToken"],t);
    return a}
    function EvR(T){
      let R={
    }
      ,a=H(T,["config"]);
      if(a!=null)OvR(a,R);
    return R}
    function CvR(T){
      let R={
    }
      ,a=H(T,["config"]);
      if(a!=null)dvR(a,R);
    return R}
    function LvR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["nextPageToken"]);
      if(e!=null)Y(R,["nextPageToken"],e);
      let t=H(T,["cachedContents"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(R,["cachedContents"],r)}
    return R}
    function MvR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["nextPageToken"]);
      if(e!=null)Y(R,["nextPageToken"],e);
      let t=H(T,["cachedContents"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(R,["cachedContents"],r)}
    return R}
    function DvR(T){
      let R={
    }
      ,a=H(T,["mediaResolution"]);
      if(a!=null)Y(R,["mediaResolution"],a);
      let e=H(T,["codeExecutionResult"]);
      if(e!=null)Y(R,["codeExecutionResult"],e);
      let t=H(T,["executableCode"]);
      if(t!=null)Y(R,["executableCode"],t);
      let r=H(T,["fileData"]);
      if(r!=null)Y(R,["fileData"],xvR(r));
      let h=H(T,["functionCall"]);
      if(h!=null)Y(R,["functionCall"],fvR(h));
      let i=H(T,["functionResponse"]);
      if(i!=null)Y(R,["functionResponse"],i);
      let c=H(T,["inlineData"]);
      if(c!=null)Y(R,["inlineData"],AvR(c));
      let s=H(T,["text"]);
      if(s!=null)Y(R,["text"],s);
      let A=H(T,["thought"]);
      if(A!=null)Y(R,["thought"],A);
      let l=H(T,["thoughtSignature"]);
      if(l!=null)Y(R,["thoughtSignature"],l);
      let o=H(T,["videoMetadata"]);
      if(o!=null)Y(R,["videoMetadata"],o);
    return R}
    function wvR(T){
      let R={
    }
      ,a=H(T,["retrievalConfig"]);
      if(a!=null)Y(R,["retrievalConfig"],a);
      let e=H(T,["functionCallingConfig"]);
      if(e!=null)Y(R,["functionCallingConfig"],IvR(e));
    return R}
    function BvR(T){
      let R={
    }
      ;
      if(H(T,["retrieval"])!==void 0)throw Error("retrieval parameter is not supported in Gemini API.");
      let a=H(T,["computerUse"]);
      if(a!=null)Y(R,["computerUse"],a);
      let e=H(T,["fileSearch"]);
      if(e!=null)Y(R,["fileSearch"],e);
      let t=H(T,["codeExecution"]);
      if(t!=null)Y(R,["codeExecution"],t);
      if(H(T,["enterpriseWebSearch"])!==void 0)throw Error("enterpriseWebSearch parameter is not supported in Gemini API.");
      let r=H(T,["functionDeclarations"]);
      if(r!=null){
        let A=r;
        if(Array.isArray(A))A=A.map((l)=>{
        return l}
      );
      Y(R,["functionDeclarations"],A)}
      let h=H(T,["googleMaps"]);
      if(h!=null)Y(R,["googleMaps"],jvR(h));
      let i=H(T,["googleSearch"]);
      if(i!=null)Y(R,["googleSearch"],SvR(i));
      let c=H(T,["googleSearchRetrieval"]);
      if(c!=null)Y(R,["googleSearchRetrieval"],c);
      let s=H(T,["urlContext"]);
      if(s!=null)Y(R,["urlContext"],s);
    return R}
    function NvR(T){
      let R={
    }
      ,a=H(T,["retrieval"]);
      if(a!=null)Y(R,["retrieval"],a);
      let e=H(T,["computerUse"]);
      if(e!=null)Y(R,["computerUse"],e);
      if(H(T,["fileSearch"])!==void 0)throw Error("fileSearch parameter is not supported in Vertex AI.");
      let t=H(T,["codeExecution"]);
      if(t!=null)Y(R,["codeExecution"],t);
      let r=H(T,["enterpriseWebSearch"]);
      if(r!=null)Y(R,["enterpriseWebSearch"],r);
      let h=H(T,["functionDeclarations"]);
      if(h!=null){
        let l=h;
        if(Array.isArray(l))l=l.map((o)=>{
        return gvR(o)}
      );
      Y(R,["functionDeclarations"],l)}
      let i=H(T,["googleMaps"]);
      if(i!=null)Y(R,["googleMaps"],i);
      let c=H(T,["googleSearch"]);
      if(c!=null)Y(R,["googleSearch"],c);
      let s=H(T,["googleSearchRetrieval"]);
      if(s!=null)Y(R,["googleSearchRetrieval"],s);
      let A=H(T,["urlContext"]);
      if(A!=null)Y(R,["urlContext"],A);
    return R}
    function UvR(T,R){
      let a={
    }
      ,e=H(T,["ttl"]);
      if(R!==void 0&&e!=null)Y(R,["ttl"],e);
      let t=H(T,["expireTime"]);
      if(R!==void 0&&t!=null)Y(R,["expireTime"],t);
    return a}
    function HvR(T,R){
      let a={
    }
      ,e=H(T,["ttl"]);
      if(R!==void 0&&e!=null)Y(R,["ttl"],e);
      let t=H(T,["expireTime"]);
      if(R!==void 0&&t!=null)Y(R,["expireTime"],t);
    return a}
    function WvR(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],Cn(T,e));
      let t=H(R,["config"]);
      if(t!=null)UvR(t,a);
    return a}
    function qvR(T,R){
      let a={
    }
      ,e=H(R,["name"]);
      if(e!=null)Y(a,["_url","name"],Cn(T,e));
      let t=H(R,["config"]);
      if(t!=null)HvR(t,a);
    return a}
    function _7(T,R){
      var a={
    }
      ;
      for(var e in T)if(Object.prototype.hasOwnProperty.call(T,e)&&R.indexOf(e)<0)a[e]=T[e];
      if(T!=null&&typeof Object.getOwnPropertySymbols==="function"){
        for(var t=0,e=Object.getOwnPropertySymbols(T);
        t<e.length;
      t++)if(R.indexOf(e[t])<0&&Object.prototype.propertyIsEnumerable.call(T,e[t]))a[e[t]]=T[e[t]]}
    return a}
    function FAT(T){
      var R=typeof Symbol==="function"&&Symbol.iterator,a=R&&T[R],e=0;
      if(a)return a.call(T);
      if(T&&typeof T.length==="number")return{
        next:function(){
          if(T&&e>=T.length)T=void 0;
          return{
          value:T&&T[e++],done:!T}
      }
    }
      ;
    throw TypeError(R?"Object is not iterable.":"Symbol.iterator is not defined.")}
    function S9(T){
    return this instanceof S9?(this.v=T,this):new S9(T)}
    function ac(T,R,a){
      if(!Symbol.asyncIterator)throw TypeError("Symbol.asyncIterator is not defined.");
      var e=a.apply(T,R||[]),t,r=[];
      return t=Object.create((typeof AsyncIterator==="function"?AsyncIterator:Object).prototype),i("next"),i("throw"),i("return",h),t[Symbol.asyncIterator]=function(){
      return this}
      ,t;
      function h(n){
        return function(p){
        return Promise.resolve(p).then(n,l)}
    }
      function i(n,p){
        if(e[n]){
          if(t[n]=function(_){
            return new Promise(function(m,b){
            r.push([n,_,m,b])>1||c(n,_)}
        )}
        ,p)t[n]=p(t[n])}
    }
      function c(n,p){
        try{
        s(e[n](p))}
        catch(_){
        o(r[0][3],_)}
    }
      function s(n){
      n.value instanceof S9?Promise.resolve(n.value.v).then(A,l):o(r[0][2],n)}
      function A(n){
      c("next",n)}
      function l(n){
      c("throw",n)}
      function o(n,p){
      if(n(p),r.shift(),r.length)c(r[0][0],r[0][1])}
  }
    function ec(T){
      if(!Symbol.asyncIterator)throw TypeError("Symbol.asyncIterator is not defined.");
      var R=T[Symbol.asyncIterator],a;
      return R?R.call(T):(T=typeof FAT==="function"?FAT(T):T[Symbol.iterator](),a={
    }
      ,e("next"),e("throw"),e("return"),a[Symbol.asyncIterator]=function(){
      return this}
      ,a);
      function e(r){
        a[r]=T[r]&&function(h){
          return new Promise(function(i,c){
          h=T[r](h),t(i,c,h.done,h.value)}
      )}
    }
      function t(r,h,i,c){
        Promise.resolve(c).then(function(s){
          r({
          value:s,done:i}
      )}
      ,h)}
  }
    function zvR(T){
      var R;
      if(T.candidates==null||T.candidates.length===0)return!1;
      let a=(R=T.candidates[0])===null||R===void 0?void 0:R.content;
      if(a===void 0)return!1;
    return r6T(a)}
    function r6T(T){
      if(T.parts===void 0||T.parts.length===0)return!1;
      for(let R of T.parts)if(R===void 0||Object.keys(R).length===0)return!1;
    return!0}
    function FvR(T){
      if(T.length===0)return;
    for(let R of T)if(R.role!=="user"&&R.role!=="model")throw Error(`Role must be user or model, but got ${R.role}.`)}
    function GAT(T){
      if(T===void 0||T.length===0)return[];
      let R=[],a=T.length,e=0;
      while(e<a)if(T[e].role==="user")R.push(T[e]),e++;
      else{
        let t=[],r=!0;
        while(e<a&&T[e].role==="model"){
          if(t.push(T[e]),r&&!r6T(T[e]))r=!1;
        e++}
        if(r)R.push(...t);
      else R.pop()}
    return R}
    class h6T{
      constructor(T,R){
      this.modelsModule=T,this.apiClient=R}
      create(T){
      return new i6T(this.apiClient,this.modelsModule,T.model,T.config,structuredClone(T.history))}
  }
    class i6T{
      constructor(T,R,a,e={
    }
      ,t=[]){
      this.apiClient=T,this.modelsModule=R,this.model=a,this.config=e,this.history=t,this.sendPromise=Promise.resolve(),FvR(t)}
      async sendMessage(T){
        var R;
        await this.sendPromise;
        let a=it(T.message),e=this.modelsModule.generateContent({
        model:this.model,contents:this.getHistory(!0).concat(a),config:(R=T.config)!==null&&R!==void 0?R:this.config}
      );
        return this.sendPromise=(async()=>{
          var t,r,h;
          let i=await e,c=(r=(t=i.candidates)===null||t===void 0?void 0:t[0])===null||r===void 0?void 0:r.content,s=i.automaticFunctionCallingHistory,A=this.getHistory(!0).length,l=[];
          if(s!=null)l=(h=s.slice(A))!==null&&h!==void 0?h:[];
          let o=c?[c]:[];
          this.recordHistory(a,o,l);
        return}
      )(),await this.sendPromise.catch(()=>{
        this.sendPromise=Promise.resolve()}
    ),e}
      async sendMessageStream(T){
        var R;
        await this.sendPromise;
        let a=it(T.message),e=this.modelsModule.generateContentStream({
        model:this.model,contents:this.getHistory(!0).concat(a),config:(R=T.config)!==null&&R!==void 0?R:this.config}
      );
        this.sendPromise=e.then(()=>{
        return}
      ).catch(()=>{
        return}
      );
        let t=await e;
      return this.processStreamResponse(t,a)}
      getHistory(T=!1){
        let R=T?GAT(this.history):this.history;
      return structuredClone(R)}
      processStreamResponse(T,R){
        return ac(this,arguments,function*(){
          var a,e,t,r,h,i;
          let c=[];
          try{
            for(var s=!0,A=ec(T),l;
            l=yield S9(A.next()),a=l.done,!a;
            s=!0){
              r=l.value,s=!1;
              let o=r;
              if(zvR(o)){
                let n=(i=(h=o.candidates)===null||h===void 0?void 0:h[0])===null||i===void 0?void 0:i.content;
              if(n!==void 0)c.push(n)}
            yield yield S9(o)}
        }
          catch(o){
            e={
            error:o}
        }
          finally{
            try{
            if(!s&&!a&&(t=A.return))yield S9(t.call(A))}
            finally{
            if(e)throw e.error}
        }
        this.recordHistory(R,c)}
    )}
      recordHistory(T,R,a){
        let e=[];
        if(R.length>0&&R.every((t)=>t.role!==void 0))e=R;
        else e.push({
        role:"model",parts:[]}
      );
        if(a&&a.length>0)this.history.push(...GAT(a));
        else this.history.push(T);
      this.history.push(...e)}
  }
    function GvR(T){
      let R={
    }
      ,a=H(T,["file"]);
      if(a!=null)Y(R,["file"],a);
    return R}
    function KvR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
    return R}
    function VvR(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["_url","file"],z8T(a));
    return R}
    function XvR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
    return R}
    function YvR(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["_url","file"],z8T(a));
    return R}
    function QvR(T){
      let R={
    }
      ,a=H(T,["uris"]);
      if(a!=null)Y(R,["uris"],a);
    return R}
    function ZvR(T,R){
      let a={
    }
      ,e=H(T,["pageSize"]);
      if(R!==void 0&&e!=null)Y(R,["_query","pageSize"],e);
      let t=H(T,["pageToken"]);
      if(R!==void 0&&t!=null)Y(R,["_query","pageToken"],t);
    return a}
    function JvR(T){
      let R={
    }
      ,a=H(T,["config"]);
      if(a!=null)ZvR(a,R);
    return R}
    function TjR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["nextPageToken"]);
      if(e!=null)Y(R,["nextPageToken"],e);
      let t=H(T,["files"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(R,["files"],r)}
    return R}
    function RjR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["files"]);
      if(e!=null){
        let t=e;
        if(Array.isArray(t))t=t.map((r)=>{
        return r}
      );
      Y(R,["files"],t)}
    return R}
    function qL(T){
      let R={
    }
      ,a=H(T,["data"]);
      if(a!=null)Y(R,["data"],a);
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function ajR(T){
      let R={
    }
      ,a=H(T,["parts"]);
      if(a!=null){
        let t=a;
        if(Array.isArray(t))t=t.map((r)=>{
        return ujR(r)}
      );
      Y(R,["parts"],t)}
      let e=H(T,["role"]);
      if(e!=null)Y(R,["role"],e);
    return R}
    function ejR(T){
      let R={
    }
      ;
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let a=H(T,["fileUri"]);
      if(a!=null)Y(R,["fileUri"],a);
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function tjR(T){
      let R={
    }
      ,a=H(T,["id"]);
      if(a!=null)Y(R,["id"],a);
      let e=H(T,["args"]);
      if(e!=null)Y(R,["args"],e);
      let t=H(T,["name"]);
      if(t!=null)Y(R,["name"],t);
      if(H(T,["partialArgs"])!==void 0)throw Error("partialArgs parameter is not supported in Gemini API.");
      if(H(T,["willContinue"])!==void 0)throw Error("willContinue parameter is not supported in Gemini API.");
    return R}
    function rjR(T){
      let R={
    }
      ,a=H(T,["description"]);
      if(a!=null)Y(R,["description"],a);
      let e=H(T,["name"]);
      if(e!=null)Y(R,["name"],e);
      let t=H(T,["parameters"]);
      if(t!=null)Y(R,["parameters"],t);
      let r=H(T,["parametersJsonSchema"]);
      if(r!=null)Y(R,["parametersJsonSchema"],r);
      let h=H(T,["response"]);
      if(h!=null)Y(R,["response"],h);
      let i=H(T,["responseJsonSchema"]);
      if(i!=null)Y(R,["responseJsonSchema"],i);
      if(H(T,["behavior"])!==void 0)throw Error("behavior parameter is not supported in Vertex AI.");
    return R}
    function hjR(T){
      let R={
    }
      ,a=H(T,["modelSelectionConfig"]);
      if(a!=null)Y(R,["modelConfig"],a);
      let e=H(T,["responseJsonSchema"]);
      if(e!=null)Y(R,["responseJsonSchema"],e);
      let t=H(T,["audioTimestamp"]);
      if(t!=null)Y(R,["audioTimestamp"],t);
      let r=H(T,["candidateCount"]);
      if(r!=null)Y(R,["candidateCount"],r);
      let h=H(T,["enableAffectiveDialog"]);
      if(h!=null)Y(R,["enableAffectiveDialog"],h);
      let i=H(T,["frequencyPenalty"]);
      if(i!=null)Y(R,["frequencyPenalty"],i);
      let c=H(T,["logprobs"]);
      if(c!=null)Y(R,["logprobs"],c);
      let s=H(T,["maxOutputTokens"]);
      if(s!=null)Y(R,["maxOutputTokens"],s);
      let A=H(T,["mediaResolution"]);
      if(A!=null)Y(R,["mediaResolution"],A);
      let l=H(T,["presencePenalty"]);
      if(l!=null)Y(R,["presencePenalty"],l);
      let o=H(T,["responseLogprobs"]);
      if(o!=null)Y(R,["responseLogprobs"],o);
      let n=H(T,["responseMimeType"]);
      if(n!=null)Y(R,["responseMimeType"],n);
      let p=H(T,["responseModalities"]);
      if(p!=null)Y(R,["responseModalities"],p);
      let _=H(T,["responseSchema"]);
      if(_!=null)Y(R,["responseSchema"],_);
      let m=H(T,["routingConfig"]);
      if(m!=null)Y(R,["routingConfig"],m);
      let b=H(T,["seed"]);
      if(b!=null)Y(R,["seed"],b);
      let y=H(T,["speechConfig"]);
      if(y!=null)Y(R,["speechConfig"],y);
      let u=H(T,["stopSequences"]);
      if(u!=null)Y(R,["stopSequences"],u);
      let P=H(T,["temperature"]);
      if(P!=null)Y(R,["temperature"],P);
      let k=H(T,["thinkingConfig"]);
      if(k!=null)Y(R,["thinkingConfig"],k);
      let x=H(T,["topK"]);
      if(x!=null)Y(R,["topK"],x);
      let f=H(T,["topP"]);
      if(f!=null)Y(R,["topP"],f);
      if(H(T,["enableEnhancedCivicAnswers"])!==void 0)throw Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
    return R}
    function ijR(T){
      let R={
    }
      ;
      if(H(T,["authConfig"])!==void 0)throw Error("authConfig parameter is not supported in Gemini API.");
      let a=H(T,["enableWidget"]);
      if(a!=null)Y(R,["enableWidget"],a);
    return R}
    function cjR(T){
      let R={
    }
      ;
      if(H(T,["excludeDomains"])!==void 0)throw Error("excludeDomains parameter is not supported in Gemini API.");
      if(H(T,["blockingConfidence"])!==void 0)throw Error("blockingConfidence parameter is not supported in Gemini API.");
      let a=H(T,["timeRangeFilter"]);
      if(a!=null)Y(R,["timeRangeFilter"],a);
    return R}
    function sjR(T,R){
      let a={
    }
      ,e=H(T,["generationConfig"]);
      if(R!==void 0&&e!=null)Y(R,["setup","generationConfig"],e);
      let t=H(T,["responseModalities"]);
      if(R!==void 0&&t!=null)Y(R,["setup","generationConfig","responseModalities"],t);
      let r=H(T,["temperature"]);
      if(R!==void 0&&r!=null)Y(R,["setup","generationConfig","temperature"],r);
      let h=H(T,["topP"]);
      if(R!==void 0&&h!=null)Y(R,["setup","generationConfig","topP"],h);
      let i=H(T,["topK"]);
      if(R!==void 0&&i!=null)Y(R,["setup","generationConfig","topK"],i);
      let c=H(T,["maxOutputTokens"]);
      if(R!==void 0&&c!=null)Y(R,["setup","generationConfig","maxOutputTokens"],c);
      let s=H(T,["mediaResolution"]);
      if(R!==void 0&&s!=null)Y(R,["setup","generationConfig","mediaResolution"],s);
      let A=H(T,["seed"]);
      if(R!==void 0&&A!=null)Y(R,["setup","generationConfig","seed"],A);
      let l=H(T,["speechConfig"]);
      if(R!==void 0&&l!=null)Y(R,["setup","generationConfig","speechConfig"],q8T(l));
      let o=H(T,["thinkingConfig"]);
      if(R!==void 0&&o!=null)Y(R,["setup","generationConfig","thinkingConfig"],o);
      let n=H(T,["enableAffectiveDialog"]);
      if(R!==void 0&&n!=null)Y(R,["setup","generationConfig","enableAffectiveDialog"],n);
      let p=H(T,["systemInstruction"]);
      if(R!==void 0&&p!=null)Y(R,["setup","systemInstruction"],ajR(it(p)));
      let _=H(T,["tools"]);
      if(R!==void 0&&_!=null){
        let x=Dx(_);
        if(Array.isArray(x))x=x.map((f)=>{
        return PjR(Mx(f))}
      );
      Y(R,["setup","tools"],x)}
      let m=H(T,["sessionResumption"]);
      if(R!==void 0&&m!=null)Y(R,["setup","sessionResumption"],yjR(m));
      let b=H(T,["inputAudioTranscription"]);
      if(R!==void 0&&b!=null)Y(R,["setup","inputAudioTranscription"],b);
      let y=H(T,["outputAudioTranscription"]);
      if(R!==void 0&&y!=null)Y(R,["setup","outputAudioTranscription"],y);
      let u=H(T,["realtimeInputConfig"]);
      if(R!==void 0&&u!=null)Y(R,["setup","realtimeInputConfig"],u);
      let P=H(T,["contextWindowCompression"]);
      if(R!==void 0&&P!=null)Y(R,["setup","contextWindowCompression"],P);
      let k=H(T,["proactivity"]);
      if(R!==void 0&&k!=null)Y(R,["setup","proactivity"],k);
      if(H(T,["explicitVadSignal"])!==void 0)throw Error("explicitVadSignal parameter is not supported in Gemini API.");
    return a}
    function ojR(T,R){
      let a={
    }
      ,e=H(T,["generationConfig"]);
      if(R!==void 0&&e!=null)Y(R,["setup","generationConfig"],hjR(e));
      let t=H(T,["responseModalities"]);
      if(R!==void 0&&t!=null)Y(R,["setup","generationConfig","responseModalities"],t);
      let r=H(T,["temperature"]);
      if(R!==void 0&&r!=null)Y(R,["setup","generationConfig","temperature"],r);
      let h=H(T,["topP"]);
      if(R!==void 0&&h!=null)Y(R,["setup","generationConfig","topP"],h);
      let i=H(T,["topK"]);
      if(R!==void 0&&i!=null)Y(R,["setup","generationConfig","topK"],i);
      let c=H(T,["maxOutputTokens"]);
      if(R!==void 0&&c!=null)Y(R,["setup","generationConfig","maxOutputTokens"],c);
      let s=H(T,["mediaResolution"]);
      if(R!==void 0&&s!=null)Y(R,["setup","generationConfig","mediaResolution"],s);
      let A=H(T,["seed"]);
      if(R!==void 0&&A!=null)Y(R,["setup","generationConfig","seed"],A);
      let l=H(T,["speechConfig"]);
      if(R!==void 0&&l!=null)Y(R,["setup","generationConfig","speechConfig"],q8T(l));
      let o=H(T,["thinkingConfig"]);
      if(R!==void 0&&o!=null)Y(R,["setup","generationConfig","thinkingConfig"],o);
      let n=H(T,["enableAffectiveDialog"]);
      if(R!==void 0&&n!=null)Y(R,["setup","generationConfig","enableAffectiveDialog"],n);
      let p=H(T,["systemInstruction"]);
      if(R!==void 0&&p!=null)Y(R,["setup","systemInstruction"],it(p));
      let _=H(T,["tools"]);
      if(R!==void 0&&_!=null){
        let f=Dx(_);
        if(Array.isArray(f))f=f.map((v)=>{
        return kjR(Mx(v))}
      );
      Y(R,["setup","tools"],f)}
      let m=H(T,["sessionResumption"]);
      if(R!==void 0&&m!=null)Y(R,["setup","sessionResumption"],m);
      let b=H(T,["inputAudioTranscription"]);
      if(R!==void 0&&b!=null)Y(R,["setup","inputAudioTranscription"],b);
      let y=H(T,["outputAudioTranscription"]);
      if(R!==void 0&&y!=null)Y(R,["setup","outputAudioTranscription"],y);
      let u=H(T,["realtimeInputConfig"]);
      if(R!==void 0&&u!=null)Y(R,["setup","realtimeInputConfig"],u);
      let P=H(T,["contextWindowCompression"]);
      if(R!==void 0&&P!=null)Y(R,["setup","contextWindowCompression"],P);
      let k=H(T,["proactivity"]);
      if(R!==void 0&&k!=null)Y(R,["setup","proactivity"],k);
      let x=H(T,["explicitVadSignal"]);
      if(R!==void 0&&x!=null)Y(R,["setup","explicitVadSignal"],x);
    return a}
    function njR(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["setup","model"],g8(T,e));
      let t=H(R,["config"]);
      if(t!=null)Y(a,["config"],sjR(t,a));
    return a}
    function ljR(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["setup","model"],g8(T,e));
      let t=H(R,["config"]);
      if(t!=null)Y(a,["config"],ojR(t,a));
    return a}
    function AjR(T){
      let R={
    }
      ,a=H(T,["musicGenerationConfig"]);
      if(a!=null)Y(R,["musicGenerationConfig"],a);
    return R}
    function pjR(T){
      let R={
    }
      ,a=H(T,["weightedPrompts"]);
      if(a!=null){
        let e=a;
        if(Array.isArray(e))e=e.map((t)=>{
        return t}
      );
      Y(R,["weightedPrompts"],e)}
    return R}
    function _jR(T){
      let R={
    }
      ,a=H(T,["media"]);
      if(a!=null){
        let s=GBT(a);
        if(Array.isArray(s))s=s.map((A)=>{
        return qL(A)}
      );
      Y(R,["mediaChunks"],s)}
      let e=H(T,["audio"]);
      if(e!=null)Y(R,["audio"],qL(VBT(e)));
      let t=H(T,["audioStreamEnd"]);
      if(t!=null)Y(R,["audioStreamEnd"],t);
      let r=H(T,["video"]);
      if(r!=null)Y(R,["video"],qL(KBT(r)));
      let h=H(T,["text"]);
      if(h!=null)Y(R,["text"],h);
      let i=H(T,["activityStart"]);
      if(i!=null)Y(R,["activityStart"],i);
      let c=H(T,["activityEnd"]);
      if(c!=null)Y(R,["activityEnd"],c);
    return R}
    function bjR(T){
      let R={
    }
      ,a=H(T,["media"]);
      if(a!=null){
        let s=GBT(a);
        if(Array.isArray(s))s=s.map((A)=>{
        return A}
      );
      Y(R,["mediaChunks"],s)}
      let e=H(T,["audio"]);
      if(e!=null)Y(R,["audio"],VBT(e));
      let t=H(T,["audioStreamEnd"]);
      if(t!=null)Y(R,["audioStreamEnd"],t);
      let r=H(T,["video"]);
      if(r!=null)Y(R,["video"],KBT(r));
      let h=H(T,["text"]);
      if(h!=null)Y(R,["text"],h);
      let i=H(T,["activityStart"]);
      if(i!=null)Y(R,["activityStart"],i);
      let c=H(T,["activityEnd"]);
      if(c!=null)Y(R,["activityEnd"],c);
    return R}
    function mjR(T){
      let R={
    }
      ,a=H(T,["setupComplete"]);
      if(a!=null)Y(R,["setupComplete"],a);
      let e=H(T,["serverContent"]);
      if(e!=null)Y(R,["serverContent"],e);
      let t=H(T,["toolCall"]);
      if(t!=null)Y(R,["toolCall"],t);
      let r=H(T,["toolCallCancellation"]);
      if(r!=null)Y(R,["toolCallCancellation"],r);
      let h=H(T,["usageMetadata"]);
      if(h!=null)Y(R,["usageMetadata"],xjR(h));
      let i=H(T,["goAway"]);
      if(i!=null)Y(R,["goAway"],i);
      let c=H(T,["sessionResumptionUpdate"]);
      if(c!=null)Y(R,["sessionResumptionUpdate"],c);
      let s=H(T,["voiceActivityDetectionSignal"]);
      if(s!=null)Y(R,["voiceActivityDetectionSignal"],s);
      let A=H(T,["voiceActivity"]);
      if(A!=null)Y(R,["voiceActivity"],fjR(A));
    return R}
    function ujR(T){
      let R={
    }
      ,a=H(T,["mediaResolution"]);
      if(a!=null)Y(R,["mediaResolution"],a);
      let e=H(T,["codeExecutionResult"]);
      if(e!=null)Y(R,["codeExecutionResult"],e);
      let t=H(T,["executableCode"]);
      if(t!=null)Y(R,["executableCode"],t);
      let r=H(T,["fileData"]);
      if(r!=null)Y(R,["fileData"],ejR(r));
      let h=H(T,["functionCall"]);
      if(h!=null)Y(R,["functionCall"],tjR(h));
      let i=H(T,["functionResponse"]);
      if(i!=null)Y(R,["functionResponse"],i);
      let c=H(T,["inlineData"]);
      if(c!=null)Y(R,["inlineData"],qL(c));
      let s=H(T,["text"]);
      if(s!=null)Y(R,["text"],s);
      let A=H(T,["thought"]);
      if(A!=null)Y(R,["thought"],A);
      let l=H(T,["thoughtSignature"]);
      if(l!=null)Y(R,["thoughtSignature"],l);
      let o=H(T,["videoMetadata"]);
      if(o!=null)Y(R,["videoMetadata"],o);
    return R}
    function yjR(T){
      let R={
    }
      ,a=H(T,["handle"]);
      if(a!=null)Y(R,["handle"],a);
      if(H(T,["transparent"])!==void 0)throw Error("transparent parameter is not supported in Gemini API.");
    return R}
    function PjR(T){
      let R={
    }
      ;
      if(H(T,["retrieval"])!==void 0)throw Error("retrieval parameter is not supported in Gemini API.");
      let a=H(T,["computerUse"]);
      if(a!=null)Y(R,["computerUse"],a);
      let e=H(T,["fileSearch"]);
      if(e!=null)Y(R,["fileSearch"],e);
      let t=H(T,["codeExecution"]);
      if(t!=null)Y(R,["codeExecution"],t);
      if(H(T,["enterpriseWebSearch"])!==void 0)throw Error("enterpriseWebSearch parameter is not supported in Gemini API.");
      let r=H(T,["functionDeclarations"]);
      if(r!=null){
        let A=r;
        if(Array.isArray(A))A=A.map((l)=>{
        return l}
      );
      Y(R,["functionDeclarations"],A)}
      let h=H(T,["googleMaps"]);
      if(h!=null)Y(R,["googleMaps"],ijR(h));
      let i=H(T,["googleSearch"]);
      if(i!=null)Y(R,["googleSearch"],cjR(i));
      let c=H(T,["googleSearchRetrieval"]);
      if(c!=null)Y(R,["googleSearchRetrieval"],c);
      let s=H(T,["urlContext"]);
      if(s!=null)Y(R,["urlContext"],s);
    return R}
    function kjR(T){
      let R={
    }
      ,a=H(T,["retrieval"]);
      if(a!=null)Y(R,["retrieval"],a);
      let e=H(T,["computerUse"]);
      if(e!=null)Y(R,["computerUse"],e);
      if(H(T,["fileSearch"])!==void 0)throw Error("fileSearch parameter is not supported in Vertex AI.");
      let t=H(T,["codeExecution"]);
      if(t!=null)Y(R,["codeExecution"],t);
      let r=H(T,["enterpriseWebSearch"]);
      if(r!=null)Y(R,["enterpriseWebSearch"],r);
      let h=H(T,["functionDeclarations"]);
      if(h!=null){
        let l=h;
        if(Array.isArray(l))l=l.map((o)=>{
        return rjR(o)}
      );
      Y(R,["functionDeclarations"],l)}
      let i=H(T,["googleMaps"]);
      if(i!=null)Y(R,["googleMaps"],i);
      let c=H(T,["googleSearch"]);
      if(c!=null)Y(R,["googleSearch"],c);
      let s=H(T,["googleSearchRetrieval"]);
      if(s!=null)Y(R,["googleSearchRetrieval"],s);
      let A=H(T,["urlContext"]);
      if(A!=null)Y(R,["urlContext"],A);
    return R}
    function xjR(T){
      let R={
    }
      ,a=H(T,["promptTokenCount"]);
      if(a!=null)Y(R,["promptTokenCount"],a);
      let e=H(T,["cachedContentTokenCount"]);
      if(e!=null)Y(R,["cachedContentTokenCount"],e);
      let t=H(T,["candidatesTokenCount"]);
      if(t!=null)Y(R,["responseTokenCount"],t);
      let r=H(T,["toolUsePromptTokenCount"]);
      if(r!=null)Y(R,["toolUsePromptTokenCount"],r);
      let h=H(T,["thoughtsTokenCount"]);
      if(h!=null)Y(R,["thoughtsTokenCount"],h);
      let i=H(T,["totalTokenCount"]);
      if(i!=null)Y(R,["totalTokenCount"],i);
      let c=H(T,["promptTokensDetails"]);
      if(c!=null){
        let n=c;
        if(Array.isArray(n))n=n.map((p)=>{
        return p}
      );
      Y(R,["promptTokensDetails"],n)}
      let s=H(T,["cacheTokensDetails"]);
      if(s!=null){
        let n=s;
        if(Array.isArray(n))n=n.map((p)=>{
        return p}
      );
      Y(R,["cacheTokensDetails"],n)}
      let A=H(T,["candidatesTokensDetails"]);
      if(A!=null){
        let n=A;
        if(Array.isArray(n))n=n.map((p)=>{
        return p}
      );
      Y(R,["responseTokensDetails"],n)}
      let l=H(T,["toolUsePromptTokensDetails"]);
      if(l!=null){
        let n=l;
        if(Array.isArray(n))n=n.map((p)=>{
        return p}
      );
      Y(R,["toolUsePromptTokensDetails"],n)}
      let o=H(T,["trafficType"]);
      if(o!=null)Y(R,["trafficType"],o);
    return R}
    function fjR(T){
      let R={
    }
      ,a=H(T,["type"]);
      if(a!=null)Y(R,["voiceActivityType"],a);
    return R}
    function IjR(T,R){
      let a={
    }
      ,e=H(T,["data"]);
      if(e!=null)Y(a,["data"],e);
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let t=H(T,["mimeType"]);
      if(t!=null)Y(a,["mimeType"],t);
    return a}
    function gjR(T,R){
      let a={
    }
      ,e=H(T,["content"]);
      if(e!=null)Y(a,["content"],e);
      let t=H(T,["citationMetadata"]);
      if(t!=null)Y(a,["citationMetadata"],$jR(t));
      let r=H(T,["tokenCount"]);
      if(r!=null)Y(a,["tokenCount"],r);
      let h=H(T,["finishReason"]);
      if(h!=null)Y(a,["finishReason"],h);
      let i=H(T,["avgLogprobs"]);
      if(i!=null)Y(a,["avgLogprobs"],i);
      let c=H(T,["groundingMetadata"]);
      if(c!=null)Y(a,["groundingMetadata"],c);
      let s=H(T,["index"]);
      if(s!=null)Y(a,["index"],s);
      let A=H(T,["logprobsResult"]);
      if(A!=null)Y(a,["logprobsResult"],A);
      let l=H(T,["safetyRatings"]);
      if(l!=null){
        let n=l;
        if(Array.isArray(n))n=n.map((p)=>{
        return p}
      );
      Y(a,["safetyRatings"],n)}
      let o=H(T,["urlContextMetadata"]);
      if(o!=null)Y(a,["urlContextMetadata"],o);
    return a}
    function $jR(T,R){
      let a={
    }
      ,e=H(T,["citationSources"]);
      if(e!=null){
        let t=e;
        if(Array.isArray(t))t=t.map((r)=>{
        return r}
      );
      Y(a,["citations"],t)}
    return a}
    function vjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["contents"]);
      if(r!=null){
        let h=ui(r);
        if(Array.isArray(h))h=h.map((i)=>{
        return i}
      );
      Y(e,["contents"],h)}
    return e}
    function jjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["tokensInfo"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(a,["tokensInfo"],r)}
    return a}
    function SjR(T,R){
      let a={
    }
      ,e=H(T,["values"]);
      if(e!=null)Y(a,["values"],e);
      let t=H(T,["statistics"]);
      if(t!=null)Y(a,["statistics"],OjR(t));
    return a}
    function OjR(T,R){
      let a={
    }
      ,e=H(T,["truncated"]);
      if(e!=null)Y(a,["truncated"],e);
      let t=H(T,["token_count"]);
      if(t!=null)Y(a,["tokenCount"],t);
    return a}
    function hU(T,R){
      let a={
    }
      ,e=H(T,["parts"]);
      if(e!=null){
        let r=e;
        if(Array.isArray(r))r=r.map((h)=>{
        return NSR(h)}
      );
      Y(a,["parts"],r)}
      let t=H(T,["role"]);
      if(t!=null)Y(a,["role"],t);
    return a}
    function djR(T,R){
      let a={
    }
      ,e=H(T,["controlType"]);
      if(e!=null)Y(a,["controlType"],e);
      let t=H(T,["enableControlImageComputation"]);
      if(t!=null)Y(a,["computeControl"],t);
    return a}
    function EjR(T,R){
      let a={
    }
      ;
      if(H(T,["systemInstruction"])!==void 0)throw Error("systemInstruction parameter is not supported in Gemini API.");
      if(H(T,["tools"])!==void 0)throw Error("tools parameter is not supported in Gemini API.");
      if(H(T,["generationConfig"])!==void 0)throw Error("generationConfig parameter is not supported in Gemini API.");
    return a}
    function CjR(T,R,a){
      let e={
    }
      ,t=H(T,["systemInstruction"]);
      if(R!==void 0&&t!=null)Y(R,["systemInstruction"],it(t));
      let r=H(T,["tools"]);
      if(R!==void 0&&r!=null){
        let i=r;
        if(Array.isArray(i))i=i.map((c)=>{
        return n6T(c)}
      );
      Y(R,["tools"],i)}
      let h=H(T,["generationConfig"]);
      if(R!==void 0&&h!=null)Y(R,["generationConfig"],ISR(h));
    return e}
    function LjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["contents"]);
      if(r!=null){
        let i=ui(r);
        if(Array.isArray(i))i=i.map((c)=>{
        return hU(c)}
      );
      Y(e,["contents"],i)}
      let h=H(R,["config"]);
      if(h!=null)EjR(h);
    return e}
    function MjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["contents"]);
      if(r!=null){
        let i=ui(r);
        if(Array.isArray(i))i=i.map((c)=>{
        return c}
      );
      Y(e,["contents"],i)}
      let h=H(R,["config"]);
      if(h!=null)CjR(h,e);
    return e}
    function DjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["totalTokens"]);
      if(t!=null)Y(a,["totalTokens"],t);
      let r=H(T,["cachedContentTokenCount"]);
      if(r!=null)Y(a,["cachedContentTokenCount"],r);
    return a}
    function wjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["totalTokens"]);
      if(t!=null)Y(a,["totalTokens"],t);
    return a}
    function BjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","name"],g8(T,t));
    return e}
    function NjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","name"],g8(T,t));
    return e}
    function UjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
    return a}
    function HjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
    return a}
    function WjR(T,R,a){
      let e={
    }
      ,t=H(T,["outputGcsUri"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","storageUri"],t);
      let r=H(T,["negativePrompt"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","negativePrompt"],r);
      let h=H(T,["numberOfImages"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","sampleCount"],h);
      let i=H(T,["aspectRatio"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","aspectRatio"],i);
      let c=H(T,["guidanceScale"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","guidanceScale"],c);
      let s=H(T,["seed"]);
      if(R!==void 0&&s!=null)Y(R,["parameters","seed"],s);
      let A=H(T,["safetyFilterLevel"]);
      if(R!==void 0&&A!=null)Y(R,["parameters","safetySetting"],A);
      let l=H(T,["personGeneration"]);
      if(R!==void 0&&l!=null)Y(R,["parameters","personGeneration"],l);
      let o=H(T,["includeSafetyAttributes"]);
      if(R!==void 0&&o!=null)Y(R,["parameters","includeSafetyAttributes"],o);
      let n=H(T,["includeRaiReason"]);
      if(R!==void 0&&n!=null)Y(R,["parameters","includeRaiReason"],n);
      let p=H(T,["language"]);
      if(R!==void 0&&p!=null)Y(R,["parameters","language"],p);
      let _=H(T,["outputMimeType"]);
      if(R!==void 0&&_!=null)Y(R,["parameters","outputOptions","mimeType"],_);
      let m=H(T,["outputCompressionQuality"]);
      if(R!==void 0&&m!=null)Y(R,["parameters","outputOptions","compressionQuality"],m);
      let b=H(T,["addWatermark"]);
      if(R!==void 0&&b!=null)Y(R,["parameters","addWatermark"],b);
      let y=H(T,["labels"]);
      if(R!==void 0&&y!=null)Y(R,["labels"],y);
      let u=H(T,["editMode"]);
      if(R!==void 0&&u!=null)Y(R,["parameters","editMode"],u);
      let P=H(T,["baseSteps"]);
      if(R!==void 0&&P!=null)Y(R,["parameters","editConfig","baseSteps"],P);
    return e}
    function qjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["prompt"]);
      if(r!=null)Y(e,["instances[0]","prompt"],r);
      let h=H(R,["referenceImages"]);
      if(h!=null){
        let c=h;
        if(Array.isArray(c))c=c.map((s)=>{
        return FSR(s)}
      );
      Y(e,["instances[0]","referenceImages"],c)}
      let i=H(R,["config"]);
      if(i!=null)WjR(i,e);
    return e}
    function zjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["predictions"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return iU(h)}
      );
      Y(a,["generatedImages"],r)}
    return a}
    function FjR(T,R,a){
      let e={
    }
      ,t=H(T,["taskType"]);
      if(R!==void 0&&t!=null)Y(R,["requests[]","taskType"],t);
      let r=H(T,["title"]);
      if(R!==void 0&&r!=null)Y(R,["requests[]","title"],r);
      let h=H(T,["outputDimensionality"]);
      if(R!==void 0&&h!=null)Y(R,["requests[]","outputDimensionality"],h);
      if(H(T,["mimeType"])!==void 0)throw Error("mimeType parameter is not supported in Gemini API.");
      if(H(T,["autoTruncate"])!==void 0)throw Error("autoTruncate parameter is not supported in Gemini API.");
    return e}
    function GjR(T,R,a){
      let e={
    }
      ,t=H(T,["taskType"]);
      if(R!==void 0&&t!=null)Y(R,["instances[]","task_type"],t);
      let r=H(T,["title"]);
      if(R!==void 0&&r!=null)Y(R,["instances[]","title"],r);
      let h=H(T,["outputDimensionality"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","outputDimensionality"],h);
      let i=H(T,["mimeType"]);
      if(R!==void 0&&i!=null)Y(R,["instances[]","mimeType"],i);
      let c=H(T,["autoTruncate"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","autoTruncate"],c);
    return e}
    function KjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["contents"]);
      if(r!=null){
        let c=U8T(T,r);
        if(Array.isArray(c))c=c.map((s)=>{
        return s}
      );
      Y(e,["requests[]","content"],c)}
      let h=H(R,["config"]);
      if(h!=null)FjR(h,e);
      let i=H(R,["model"]);
      if(i!==void 0)Y(e,["requests[]","model"],g8(T,i));
    return e}
    function VjR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["contents"]);
      if(r!=null){
        let i=U8T(T,r);
        if(Array.isArray(i))i=i.map((c)=>{
        return c}
      );
      Y(e,["instances[]","content"],i)}
      let h=H(R,["config"]);
      if(h!=null)GjR(h,e);
    return e}
    function XjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["embeddings"]);
      if(t!=null){
        let h=t;
        if(Array.isArray(h))h=h.map((i)=>{
        return i}
      );
      Y(a,["embeddings"],h)}
      let r=H(T,["metadata"]);
      if(r!=null)Y(a,["metadata"],r);
    return a}
    function YjR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["predictions[]","embeddings"]);
      if(t!=null){
        let h=t;
        if(Array.isArray(h))h=h.map((i)=>{
        return SjR(i)}
      );
      Y(a,["embeddings"],h)}
      let r=H(T,["metadata"]);
      if(r!=null)Y(a,["metadata"],r);
    return a}
    function QjR(T,R){
      let a={
    }
      ,e=H(T,["endpoint"]);
      if(e!=null)Y(a,["name"],e);
      let t=H(T,["deployedModelId"]);
      if(t!=null)Y(a,["deployedModelId"],t);
    return a}
    function ZjR(T,R){
      let a={
    }
      ;
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let e=H(T,["fileUri"]);
      if(e!=null)Y(a,["fileUri"],e);
      let t=H(T,["mimeType"]);
      if(t!=null)Y(a,["mimeType"],t);
    return a}
    function JjR(T,R){
      let a={
    }
      ,e=H(T,["id"]);
      if(e!=null)Y(a,["id"],e);
      let t=H(T,["args"]);
      if(t!=null)Y(a,["args"],t);
      let r=H(T,["name"]);
      if(r!=null)Y(a,["name"],r);
      if(H(T,["partialArgs"])!==void 0)throw Error("partialArgs parameter is not supported in Gemini API.");
      if(H(T,["willContinue"])!==void 0)throw Error("willContinue parameter is not supported in Gemini API.");
    return a}
    function TSR(T,R){
      let a={
    }
      ,e=H(T,["allowedFunctionNames"]);
      if(e!=null)Y(a,["allowedFunctionNames"],e);
      let t=H(T,["mode"]);
      if(t!=null)Y(a,["mode"],t);
      if(H(T,["streamFunctionCallArguments"])!==void 0)throw Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
    return a}
    function RSR(T,R){
      let a={
    }
      ,e=H(T,["description"]);
      if(e!=null)Y(a,["description"],e);
      let t=H(T,["name"]);
      if(t!=null)Y(a,["name"],t);
      let r=H(T,["parameters"]);
      if(r!=null)Y(a,["parameters"],r);
      let h=H(T,["parametersJsonSchema"]);
      if(h!=null)Y(a,["parametersJsonSchema"],h);
      let i=H(T,["response"]);
      if(i!=null)Y(a,["response"],i);
      let c=H(T,["responseJsonSchema"]);
      if(c!=null)Y(a,["responseJsonSchema"],c);
      if(H(T,["behavior"])!==void 0)throw Error("behavior parameter is not supported in Vertex AI.");
    return a}
    function aSR(T,R,a,e){
      let t={
    }
      ,r=H(R,["systemInstruction"]);
      if(a!==void 0&&r!=null)Y(a,["systemInstruction"],hU(it(r)));
      let h=H(R,["temperature"]);
      if(h!=null)Y(t,["temperature"],h);
      let i=H(R,["topP"]);
      if(i!=null)Y(t,["topP"],i);
      let c=H(R,["topK"]);
      if(c!=null)Y(t,["topK"],c);
      let s=H(R,["candidateCount"]);
      if(s!=null)Y(t,["candidateCount"],s);
      let A=H(R,["maxOutputTokens"]);
      if(A!=null)Y(t,["maxOutputTokens"],A);
      let l=H(R,["stopSequences"]);
      if(l!=null)Y(t,["stopSequences"],l);
      let o=H(R,["responseLogprobs"]);
      if(o!=null)Y(t,["responseLogprobs"],o);
      let n=H(R,["logprobs"]);
      if(n!=null)Y(t,["logprobs"],n);
      let p=H(R,["presencePenalty"]);
      if(p!=null)Y(t,["presencePenalty"],p);
      let _=H(R,["frequencyPenalty"]);
      if(_!=null)Y(t,["frequencyPenalty"],_);
      let m=H(R,["seed"]);
      if(m!=null)Y(t,["seed"],m);
      let b=H(R,["responseMimeType"]);
      if(b!=null)Y(t,["responseMimeType"],b);
      let y=H(R,["responseSchema"]);
      if(y!=null)Y(t,["responseSchema"],H8T(y));
      let u=H(R,["responseJsonSchema"]);
      if(u!=null)Y(t,["responseJsonSchema"],u);
      if(H(R,["routingConfig"])!==void 0)throw Error("routingConfig parameter is not supported in Gemini API.");
      if(H(R,["modelSelectionConfig"])!==void 0)throw Error("modelSelectionConfig parameter is not supported in Gemini API.");
      let P=H(R,["safetySettings"]);
      if(a!==void 0&&P!=null){
        let d=P;
        if(Array.isArray(d))d=d.map((C)=>{
        return GSR(C)}
      );
      Y(a,["safetySettings"],d)}
      let k=H(R,["tools"]);
      if(a!==void 0&&k!=null){
        let d=Dx(k);
        if(Array.isArray(d))d=d.map((C)=>{
        return JSR(Mx(C))}
      );
      Y(a,["tools"],d)}
      let x=H(R,["toolConfig"]);
      if(a!==void 0&&x!=null)Y(a,["toolConfig"],ZSR(x));
      if(H(R,["labels"])!==void 0)throw Error("labels parameter is not supported in Gemini API.");
      let f=H(R,["cachedContent"]);
      if(a!==void 0&&f!=null)Y(a,["cachedContent"],Cn(T,f));
      let v=H(R,["responseModalities"]);
      if(v!=null)Y(t,["responseModalities"],v);
      let g=H(R,["mediaResolution"]);
      if(g!=null)Y(t,["mediaResolution"],g);
      let I=H(R,["speechConfig"]);
      if(I!=null)Y(t,["speechConfig"],W8T(I));
      if(H(R,["audioTimestamp"])!==void 0)throw Error("audioTimestamp parameter is not supported in Gemini API.");
      let S=H(R,["thinkingConfig"]);
      if(S!=null)Y(t,["thinkingConfig"],S);
      let O=H(R,["imageConfig"]);
      if(O!=null)Y(t,["imageConfig"],SSR(O));
      let j=H(R,["enableEnhancedCivicAnswers"]);
      if(j!=null)Y(t,["enableEnhancedCivicAnswers"],j);
      if(H(R,["modelArmorConfig"])!==void 0)throw Error("modelArmorConfig parameter is not supported in Gemini API.");
    return t}
    function eSR(T,R,a,e){
      let t={
    }
      ,r=H(R,["systemInstruction"]);
      if(a!==void 0&&r!=null)Y(a,["systemInstruction"],it(r));
      let h=H(R,["temperature"]);
      if(h!=null)Y(t,["temperature"],h);
      let i=H(R,["topP"]);
      if(i!=null)Y(t,["topP"],i);
      let c=H(R,["topK"]);
      if(c!=null)Y(t,["topK"],c);
      let s=H(R,["candidateCount"]);
      if(s!=null)Y(t,["candidateCount"],s);
      let A=H(R,["maxOutputTokens"]);
      if(A!=null)Y(t,["maxOutputTokens"],A);
      let l=H(R,["stopSequences"]);
      if(l!=null)Y(t,["stopSequences"],l);
      let o=H(R,["responseLogprobs"]);
      if(o!=null)Y(t,["responseLogprobs"],o);
      let n=H(R,["logprobs"]);
      if(n!=null)Y(t,["logprobs"],n);
      let p=H(R,["presencePenalty"]);
      if(p!=null)Y(t,["presencePenalty"],p);
      let _=H(R,["frequencyPenalty"]);
      if(_!=null)Y(t,["frequencyPenalty"],_);
      let m=H(R,["seed"]);
      if(m!=null)Y(t,["seed"],m);
      let b=H(R,["responseMimeType"]);
      if(b!=null)Y(t,["responseMimeType"],b);
      let y=H(R,["responseSchema"]);
      if(y!=null)Y(t,["responseSchema"],H8T(y));
      let u=H(R,["responseJsonSchema"]);
      if(u!=null)Y(t,["responseJsonSchema"],u);
      let P=H(R,["routingConfig"]);
      if(P!=null)Y(t,["routingConfig"],P);
      let k=H(R,["modelSelectionConfig"]);
      if(k!=null)Y(t,["modelConfig"],k);
      let x=H(R,["safetySettings"]);
      if(a!==void 0&&x!=null){
        let D=x;
        if(Array.isArray(D))D=D.map((B)=>{
        return B}
      );
      Y(a,["safetySettings"],D)}
      let f=H(R,["tools"]);
      if(a!==void 0&&f!=null){
        let D=Dx(f);
        if(Array.isArray(D))D=D.map((B)=>{
        return n6T(Mx(B))}
      );
      Y(a,["tools"],D)}
      let v=H(R,["toolConfig"]);
      if(a!==void 0&&v!=null)Y(a,["toolConfig"],v);
      let g=H(R,["labels"]);
      if(a!==void 0&&g!=null)Y(a,["labels"],g);
      let I=H(R,["cachedContent"]);
      if(a!==void 0&&I!=null)Y(a,["cachedContent"],Cn(T,I));
      let S=H(R,["responseModalities"]);
      if(S!=null)Y(t,["responseModalities"],S);
      let O=H(R,["mediaResolution"]);
      if(O!=null)Y(t,["mediaResolution"],O);
      let j=H(R,["speechConfig"]);
      if(j!=null)Y(t,["speechConfig"],W8T(j));
      let d=H(R,["audioTimestamp"]);
      if(d!=null)Y(t,["audioTimestamp"],d);
      let C=H(R,["thinkingConfig"]);
      if(C!=null)Y(t,["thinkingConfig"],C);
      let L=H(R,["imageConfig"]);
      if(L!=null)Y(t,["imageConfig"],OSR(L));
      if(H(R,["enableEnhancedCivicAnswers"])!==void 0)throw Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
      let w=H(R,["modelArmorConfig"]);
      if(a!==void 0&&w!=null)Y(a,["modelArmorConfig"],w);
    return t}
    function KAT(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["contents"]);
      if(r!=null){
        let i=ui(r);
        if(Array.isArray(i))i=i.map((c)=>{
        return hU(c)}
      );
      Y(e,["contents"],i)}
      let h=H(R,["config"]);
      if(h!=null)Y(e,["generationConfig"],aSR(T,h,e));
    return e}
    function VAT(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["contents"]);
      if(r!=null){
        let i=ui(r);
        if(Array.isArray(i))i=i.map((c)=>{
        return c}
      );
      Y(e,["contents"],i)}
      let h=H(R,["config"]);
      if(h!=null)Y(e,["generationConfig"],eSR(T,h,e));
    return e}
    function XAT(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["candidates"]);
      if(t!=null){
        let s=t;
        if(Array.isArray(s))s=s.map((A)=>{
        return gjR(A)}
      );
      Y(a,["candidates"],s)}
      let r=H(T,["modelVersion"]);
      if(r!=null)Y(a,["modelVersion"],r);
      let h=H(T,["promptFeedback"]);
      if(h!=null)Y(a,["promptFeedback"],h);
      let i=H(T,["responseId"]);
      if(i!=null)Y(a,["responseId"],i);
      let c=H(T,["usageMetadata"]);
      if(c!=null)Y(a,["usageMetadata"],c);
    return a}
    function YAT(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["candidates"]);
      if(t!=null){
        let A=t;
        if(Array.isArray(A))A=A.map((l)=>{
        return l}
      );
      Y(a,["candidates"],A)}
      let r=H(T,["createTime"]);
      if(r!=null)Y(a,["createTime"],r);
      let h=H(T,["modelVersion"]);
      if(h!=null)Y(a,["modelVersion"],h);
      let i=H(T,["promptFeedback"]);
      if(i!=null)Y(a,["promptFeedback"],i);
      let c=H(T,["responseId"]);
      if(c!=null)Y(a,["responseId"],c);
      let s=H(T,["usageMetadata"]);
      if(s!=null)Y(a,["usageMetadata"],s);
    return a}
    function tSR(T,R,a){
      let e={
    }
      ;
      if(H(T,["outputGcsUri"])!==void 0)throw Error("outputGcsUri parameter is not supported in Gemini API.");
      if(H(T,["negativePrompt"])!==void 0)throw Error("negativePrompt parameter is not supported in Gemini API.");
      let t=H(T,["numberOfImages"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","sampleCount"],t);
      let r=H(T,["aspectRatio"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","aspectRatio"],r);
      let h=H(T,["guidanceScale"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","guidanceScale"],h);
      if(H(T,["seed"])!==void 0)throw Error("seed parameter is not supported in Gemini API.");
      let i=H(T,["safetyFilterLevel"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","safetySetting"],i);
      let c=H(T,["personGeneration"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","personGeneration"],c);
      let s=H(T,["includeSafetyAttributes"]);
      if(R!==void 0&&s!=null)Y(R,["parameters","includeSafetyAttributes"],s);
      let A=H(T,["includeRaiReason"]);
      if(R!==void 0&&A!=null)Y(R,["parameters","includeRaiReason"],A);
      let l=H(T,["language"]);
      if(R!==void 0&&l!=null)Y(R,["parameters","language"],l);
      let o=H(T,["outputMimeType"]);
      if(R!==void 0&&o!=null)Y(R,["parameters","outputOptions","mimeType"],o);
      let n=H(T,["outputCompressionQuality"]);
      if(R!==void 0&&n!=null)Y(R,["parameters","outputOptions","compressionQuality"],n);
      if(H(T,["addWatermark"])!==void 0)throw Error("addWatermark parameter is not supported in Gemini API.");
      if(H(T,["labels"])!==void 0)throw Error("labels parameter is not supported in Gemini API.");
      let p=H(T,["imageSize"]);
      if(R!==void 0&&p!=null)Y(R,["parameters","sampleImageSize"],p);
      if(H(T,["enhancePrompt"])!==void 0)throw Error("enhancePrompt parameter is not supported in Gemini API.");
    return e}
    function rSR(T,R,a){
      let e={
    }
      ,t=H(T,["outputGcsUri"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","storageUri"],t);
      let r=H(T,["negativePrompt"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","negativePrompt"],r);
      let h=H(T,["numberOfImages"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","sampleCount"],h);
      let i=H(T,["aspectRatio"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","aspectRatio"],i);
      let c=H(T,["guidanceScale"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","guidanceScale"],c);
      let s=H(T,["seed"]);
      if(R!==void 0&&s!=null)Y(R,["parameters","seed"],s);
      let A=H(T,["safetyFilterLevel"]);
      if(R!==void 0&&A!=null)Y(R,["parameters","safetySetting"],A);
      let l=H(T,["personGeneration"]);
      if(R!==void 0&&l!=null)Y(R,["parameters","personGeneration"],l);
      let o=H(T,["includeSafetyAttributes"]);
      if(R!==void 0&&o!=null)Y(R,["parameters","includeSafetyAttributes"],o);
      let n=H(T,["includeRaiReason"]);
      if(R!==void 0&&n!=null)Y(R,["parameters","includeRaiReason"],n);
      let p=H(T,["language"]);
      if(R!==void 0&&p!=null)Y(R,["parameters","language"],p);
      let _=H(T,["outputMimeType"]);
      if(R!==void 0&&_!=null)Y(R,["parameters","outputOptions","mimeType"],_);
      let m=H(T,["outputCompressionQuality"]);
      if(R!==void 0&&m!=null)Y(R,["parameters","outputOptions","compressionQuality"],m);
      let b=H(T,["addWatermark"]);
      if(R!==void 0&&b!=null)Y(R,["parameters","addWatermark"],b);
      let y=H(T,["labels"]);
      if(R!==void 0&&y!=null)Y(R,["labels"],y);
      let u=H(T,["imageSize"]);
      if(R!==void 0&&u!=null)Y(R,["parameters","sampleImageSize"],u);
      let P=H(T,["enhancePrompt"]);
      if(R!==void 0&&P!=null)Y(R,["parameters","enhancePrompt"],P);
    return e}
    function hSR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["prompt"]);
      if(r!=null)Y(e,["instances[0]","prompt"],r);
      let h=H(R,["config"]);
      if(h!=null)tSR(h,e);
    return e}
    function iSR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["prompt"]);
      if(r!=null)Y(e,["instances[0]","prompt"],r);
      let h=H(R,["config"]);
      if(h!=null)rSR(h,e);
    return e}
    function cSR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["predictions"]);
      if(t!=null){
        let h=t;
        if(Array.isArray(h))h=h.map((i)=>{
        return PSR(i)}
      );
      Y(a,["generatedImages"],h)}
      let r=H(T,["positivePromptSafetyAttributes"]);
      if(r!=null)Y(a,["positivePromptSafetyAttributes"],s6T(r));
    return a}
    function sSR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["predictions"]);
      if(t!=null){
        let h=t;
        if(Array.isArray(h))h=h.map((i)=>{
        return iU(i)}
      );
      Y(a,["generatedImages"],h)}
      let r=H(T,["positivePromptSafetyAttributes"]);
      if(r!=null)Y(a,["positivePromptSafetyAttributes"],o6T(r));
    return a}
    function oSR(T,R,a){
      let e={
    }
      ,t=H(T,["numberOfVideos"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","sampleCount"],t);
      if(H(T,["outputGcsUri"])!==void 0)throw Error("outputGcsUri parameter is not supported in Gemini API.");
      if(H(T,["fps"])!==void 0)throw Error("fps parameter is not supported in Gemini API.");
      let r=H(T,["durationSeconds"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","durationSeconds"],r);
      if(H(T,["seed"])!==void 0)throw Error("seed parameter is not supported in Gemini API.");
      let h=H(T,["aspectRatio"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","aspectRatio"],h);
      let i=H(T,["resolution"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","resolution"],i);
      let c=H(T,["personGeneration"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","personGeneration"],c);
      if(H(T,["pubsubTopic"])!==void 0)throw Error("pubsubTopic parameter is not supported in Gemini API.");
      let s=H(T,["negativePrompt"]);
      if(R!==void 0&&s!=null)Y(R,["parameters","negativePrompt"],s);
      let A=H(T,["enhancePrompt"]);
      if(R!==void 0&&A!=null)Y(R,["parameters","enhancePrompt"],A);
      if(H(T,["generateAudio"])!==void 0)throw Error("generateAudio parameter is not supported in Gemini API.");
      let l=H(T,["lastFrame"]);
      if(R!==void 0&&l!=null)Y(R,["instances[0]","lastFrame"],cU(l));
      let o=H(T,["referenceImages"]);
      if(R!==void 0&&o!=null){
        let n=o;
        if(Array.isArray(n))n=n.map((p)=>{
        return lOR(p)}
      );
      Y(R,["instances[0]","referenceImages"],n)}
      if(H(T,["mask"])!==void 0)throw Error("mask parameter is not supported in Gemini API.");
      if(H(T,["compressionQuality"])!==void 0)throw Error("compressionQuality parameter is not supported in Gemini API.");
    return e}
    function nSR(T,R,a){
      let e={
    }
      ,t=H(T,["numberOfVideos"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","sampleCount"],t);
      let r=H(T,["outputGcsUri"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","storageUri"],r);
      let h=H(T,["fps"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","fps"],h);
      let i=H(T,["durationSeconds"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","durationSeconds"],i);
      let c=H(T,["seed"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","seed"],c);
      let s=H(T,["aspectRatio"]);
      if(R!==void 0&&s!=null)Y(R,["parameters","aspectRatio"],s);
      let A=H(T,["resolution"]);
      if(R!==void 0&&A!=null)Y(R,["parameters","resolution"],A);
      let l=H(T,["personGeneration"]);
      if(R!==void 0&&l!=null)Y(R,["parameters","personGeneration"],l);
      let o=H(T,["pubsubTopic"]);
      if(R!==void 0&&o!=null)Y(R,["parameters","pubsubTopic"],o);
      let n=H(T,["negativePrompt"]);
      if(R!==void 0&&n!=null)Y(R,["parameters","negativePrompt"],n);
      let p=H(T,["enhancePrompt"]);
      if(R!==void 0&&p!=null)Y(R,["parameters","enhancePrompt"],p);
      let _=H(T,["generateAudio"]);
      if(R!==void 0&&_!=null)Y(R,["parameters","generateAudio"],_);
      let m=H(T,["lastFrame"]);
      if(R!==void 0&&m!=null)Y(R,["instances[0]","lastFrame"],Cc(m));
      let b=H(T,["referenceImages"]);
      if(R!==void 0&&b!=null){
        let P=b;
        if(Array.isArray(P))P=P.map((k)=>{
        return AOR(k)}
      );
      Y(R,["instances[0]","referenceImages"],P)}
      let y=H(T,["mask"]);
      if(R!==void 0&&y!=null)Y(R,["instances[0]","mask"],nOR(y));
      let u=H(T,["compressionQuality"]);
      if(R!==void 0&&u!=null)Y(R,["parameters","compressionQuality"],u);
    return e}
    function lSR(T,R){
      let a={
    }
      ,e=H(T,["name"]);
      if(e!=null)Y(a,["name"],e);
      let t=H(T,["metadata"]);
      if(t!=null)Y(a,["metadata"],t);
      let r=H(T,["done"]);
      if(r!=null)Y(a,["done"],r);
      let h=H(T,["error"]);
      if(h!=null)Y(a,["error"],h);
      let i=H(T,["response","generateVideoResponse"]);
      if(i!=null)Y(a,["response"],bSR(i));
    return a}
    function ASR(T,R){
      let a={
    }
      ,e=H(T,["name"]);
      if(e!=null)Y(a,["name"],e);
      let t=H(T,["metadata"]);
      if(t!=null)Y(a,["metadata"],t);
      let r=H(T,["done"]);
      if(r!=null)Y(a,["done"],r);
      let h=H(T,["error"]);
      if(h!=null)Y(a,["error"],h);
      let i=H(T,["response"]);
      if(i!=null)Y(a,["response"],mSR(i));
    return a}
    function pSR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["prompt"]);
      if(r!=null)Y(e,["instances[0]","prompt"],r);
      let h=H(R,["image"]);
      if(h!=null)Y(e,["instances[0]","image"],cU(h));
      let i=H(R,["video"]);
      if(i!=null)Y(e,["instances[0]","video"],l6T(i));
      let c=H(R,["source"]);
      if(c!=null)uSR(c,e);
      let s=H(R,["config"]);
      if(s!=null)oSR(s,e);
    return e}
    function _SR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["prompt"]);
      if(r!=null)Y(e,["instances[0]","prompt"],r);
      let h=H(R,["image"]);
      if(h!=null)Y(e,["instances[0]","image"],Cc(h));
      let i=H(R,["video"]);
      if(i!=null)Y(e,["instances[0]","video"],A6T(i));
      let c=H(R,["source"]);
      if(c!=null)ySR(c,e);
      let s=H(R,["config"]);
      if(s!=null)nSR(s,e);
    return e}
    function bSR(T,R){
      let a={
    }
      ,e=H(T,["generatedSamples"]);
      if(e!=null){
        let h=e;
        if(Array.isArray(h))h=h.map((i)=>{
        return xSR(i)}
      );
      Y(a,["generatedVideos"],h)}
      let t=H(T,["raiMediaFilteredCount"]);
      if(t!=null)Y(a,["raiMediaFilteredCount"],t);
      let r=H(T,["raiMediaFilteredReasons"]);
      if(r!=null)Y(a,["raiMediaFilteredReasons"],r);
    return a}
    function mSR(T,R){
      let a={
    }
      ,e=H(T,["videos"]);
      if(e!=null){
        let h=e;
        if(Array.isArray(h))h=h.map((i)=>{
        return fSR(i)}
      );
      Y(a,["generatedVideos"],h)}
      let t=H(T,["raiMediaFilteredCount"]);
      if(t!=null)Y(a,["raiMediaFilteredCount"],t);
      let r=H(T,["raiMediaFilteredReasons"]);
      if(r!=null)Y(a,["raiMediaFilteredReasons"],r);
    return a}
    function uSR(T,R,a){
      let e={
    }
      ,t=H(T,["prompt"]);
      if(R!==void 0&&t!=null)Y(R,["instances[0]","prompt"],t);
      let r=H(T,["image"]);
      if(R!==void 0&&r!=null)Y(R,["instances[0]","image"],cU(r));
      let h=H(T,["video"]);
      if(R!==void 0&&h!=null)Y(R,["instances[0]","video"],l6T(h));
    return e}
    function ySR(T,R,a){
      let e={
    }
      ,t=H(T,["prompt"]);
      if(R!==void 0&&t!=null)Y(R,["instances[0]","prompt"],t);
      let r=H(T,["image"]);
      if(R!==void 0&&r!=null)Y(R,["instances[0]","image"],Cc(r));
      let h=H(T,["video"]);
      if(R!==void 0&&h!=null)Y(R,["instances[0]","video"],A6T(h));
    return e}
    function PSR(T,R){
      let a={
    }
      ,e=H(T,["_self"]);
      if(e!=null)Y(a,["image"],dSR(e));
      let t=H(T,["raiFilteredReason"]);
      if(t!=null)Y(a,["raiFilteredReason"],t);
      let r=H(T,["_self"]);
      if(r!=null)Y(a,["safetyAttributes"],s6T(r));
    return a}
    function iU(T,R){
      let a={
    }
      ,e=H(T,["_self"]);
      if(e!=null)Y(a,["image"],c6T(e));
      let t=H(T,["raiFilteredReason"]);
      if(t!=null)Y(a,["raiFilteredReason"],t);
      let r=H(T,["_self"]);
      if(r!=null)Y(a,["safetyAttributes"],o6T(r));
      let h=H(T,["prompt"]);
      if(h!=null)Y(a,["enhancedPrompt"],h);
    return a}
    function kSR(T,R){
      let a={
    }
      ,e=H(T,["_self"]);
      if(e!=null)Y(a,["mask"],c6T(e));
      let t=H(T,["labels"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(a,["labels"],r)}
    return a}
    function xSR(T,R){
      let a={
    }
      ,e=H(T,["video"]);
      if(e!=null)Y(a,["video"],sOR(e));
    return a}
    function fSR(T,R){
      let a={
    }
      ,e=H(T,["_self"]);
      if(e!=null)Y(a,["video"],oOR(e));
    return a}
    function ISR(T,R){
      let a={
    }
      ,e=H(T,["modelSelectionConfig"]);
      if(e!=null)Y(a,["modelConfig"],e);
      let t=H(T,["responseJsonSchema"]);
      if(t!=null)Y(a,["responseJsonSchema"],t);
      let r=H(T,["audioTimestamp"]);
      if(r!=null)Y(a,["audioTimestamp"],r);
      let h=H(T,["candidateCount"]);
      if(h!=null)Y(a,["candidateCount"],h);
      let i=H(T,["enableAffectiveDialog"]);
      if(i!=null)Y(a,["enableAffectiveDialog"],i);
      let c=H(T,["frequencyPenalty"]);
      if(c!=null)Y(a,["frequencyPenalty"],c);
      let s=H(T,["logprobs"]);
      if(s!=null)Y(a,["logprobs"],s);
      let A=H(T,["maxOutputTokens"]);
      if(A!=null)Y(a,["maxOutputTokens"],A);
      let l=H(T,["mediaResolution"]);
      if(l!=null)Y(a,["mediaResolution"],l);
      let o=H(T,["presencePenalty"]);
      if(o!=null)Y(a,["presencePenalty"],o);
      let n=H(T,["responseLogprobs"]);
      if(n!=null)Y(a,["responseLogprobs"],n);
      let p=H(T,["responseMimeType"]);
      if(p!=null)Y(a,["responseMimeType"],p);
      let _=H(T,["responseModalities"]);
      if(_!=null)Y(a,["responseModalities"],_);
      let m=H(T,["responseSchema"]);
      if(m!=null)Y(a,["responseSchema"],m);
      let b=H(T,["routingConfig"]);
      if(b!=null)Y(a,["routingConfig"],b);
      let y=H(T,["seed"]);
      if(y!=null)Y(a,["seed"],y);
      let u=H(T,["speechConfig"]);
      if(u!=null)Y(a,["speechConfig"],u);
      let P=H(T,["stopSequences"]);
      if(P!=null)Y(a,["stopSequences"],P);
      let k=H(T,["temperature"]);
      if(k!=null)Y(a,["temperature"],k);
      let x=H(T,["thinkingConfig"]);
      if(x!=null)Y(a,["thinkingConfig"],x);
      let f=H(T,["topK"]);
      if(f!=null)Y(a,["topK"],f);
      let v=H(T,["topP"]);
      if(v!=null)Y(a,["topP"],v);
      if(H(T,["enableEnhancedCivicAnswers"])!==void 0)throw Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
    return a}
    function gSR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","name"],g8(T,t));
    return e}
    function $SR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","name"],g8(T,t));
    return e}
    function vSR(T,R){
      let a={
    }
      ;
      if(H(T,["authConfig"])!==void 0)throw Error("authConfig parameter is not supported in Gemini API.");
      let e=H(T,["enableWidget"]);
      if(e!=null)Y(a,["enableWidget"],e);
    return a}
    function jSR(T,R){
      let a={
    }
      ;
      if(H(T,["excludeDomains"])!==void 0)throw Error("excludeDomains parameter is not supported in Gemini API.");
      if(H(T,["blockingConfidence"])!==void 0)throw Error("blockingConfidence parameter is not supported in Gemini API.");
      let e=H(T,["timeRangeFilter"]);
      if(e!=null)Y(a,["timeRangeFilter"],e);
    return a}
    function SSR(T,R){
      let a={
    }
      ,e=H(T,["aspectRatio"]);
      if(e!=null)Y(a,["aspectRatio"],e);
      let t=H(T,["imageSize"]);
      if(t!=null)Y(a,["imageSize"],t);
      if(H(T,["personGeneration"])!==void 0)throw Error("personGeneration parameter is not supported in Gemini API.");
      if(H(T,["outputMimeType"])!==void 0)throw Error("outputMimeType parameter is not supported in Gemini API.");
      if(H(T,["outputCompressionQuality"])!==void 0)throw Error("outputCompressionQuality parameter is not supported in Gemini API.");
    return a}
    function OSR(T,R){
      let a={
    }
      ,e=H(T,["aspectRatio"]);
      if(e!=null)Y(a,["aspectRatio"],e);
      let t=H(T,["imageSize"]);
      if(t!=null)Y(a,["imageSize"],t);
      let r=H(T,["personGeneration"]);
      if(r!=null)Y(a,["personGeneration"],r);
      let h=H(T,["outputMimeType"]);
      if(h!=null)Y(a,["imageOutputOptions","mimeType"],h);
      let i=H(T,["outputCompressionQuality"]);
      if(i!=null)Y(a,["imageOutputOptions","compressionQuality"],i);
    return a}
    function dSR(T,R){
      let a={
    }
      ,e=H(T,["bytesBase64Encoded"]);
      if(e!=null)Y(a,["imageBytes"],hp(e));
      let t=H(T,["mimeType"]);
      if(t!=null)Y(a,["mimeType"],t);
    return a}
    function c6T(T,R){
      let a={
    }
      ,e=H(T,["gcsUri"]);
      if(e!=null)Y(a,["gcsUri"],e);
      let t=H(T,["bytesBase64Encoded"]);
      if(t!=null)Y(a,["imageBytes"],hp(t));
      let r=H(T,["mimeType"]);
      if(r!=null)Y(a,["mimeType"],r);
    return a}
    function cU(T,R){
      let a={
    }
      ;
      if(H(T,["gcsUri"])!==void 0)throw Error("gcsUri parameter is not supported in Gemini API.");
      let e=H(T,["imageBytes"]);
      if(e!=null)Y(a,["bytesBase64Encoded"],hp(e));
      let t=H(T,["mimeType"]);
      if(t!=null)Y(a,["mimeType"],t);
    return a}
    function Cc(T,R){
      let a={
    }
      ,e=H(T,["gcsUri"]);
      if(e!=null)Y(a,["gcsUri"],e);
      let t=H(T,["imageBytes"]);
      if(t!=null)Y(a,["bytesBase64Encoded"],hp(t));
      let r=H(T,["mimeType"]);
      if(r!=null)Y(a,["mimeType"],r);
    return a}
    function ESR(T,R,a,e){
      let t={
    }
      ,r=H(R,["pageSize"]);
      if(a!==void 0&&r!=null)Y(a,["_query","pageSize"],r);
      let h=H(R,["pageToken"]);
      if(a!==void 0&&h!=null)Y(a,["_query","pageToken"],h);
      let i=H(R,["filter"]);
      if(a!==void 0&&i!=null)Y(a,["_query","filter"],i);
      let c=H(R,["queryBase"]);
      if(a!==void 0&&c!=null)Y(a,["_url","models_url"],JBT(T,c));
    return t}
    function CSR(T,R,a,e){
      let t={
    }
      ,r=H(R,["pageSize"]);
      if(a!==void 0&&r!=null)Y(a,["_query","pageSize"],r);
      let h=H(R,["pageToken"]);
      if(a!==void 0&&h!=null)Y(a,["_query","pageToken"],h);
      let i=H(R,["filter"]);
      if(a!==void 0&&i!=null)Y(a,["_query","filter"],i);
      let c=H(R,["queryBase"]);
      if(a!==void 0&&c!=null)Y(a,["_url","models_url"],JBT(T,c));
    return t}
    function LSR(T,R,a){
      let e={
    }
      ,t=H(R,["config"]);
      if(t!=null)ESR(T,t,e);
    return e}
    function MSR(T,R,a){
      let e={
    }
      ,t=H(R,["config"]);
      if(t!=null)CSR(T,t,e);
    return e}
    function DSR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["nextPageToken"]);
      if(t!=null)Y(a,["nextPageToken"],t);
      let r=H(T,["_self"]);
      if(r!=null){
        let h=T6T(r);
        if(Array.isArray(h))h=h.map((i)=>{
        return CK(i)}
      );
      Y(a,["models"],h)}
    return a}
    function wSR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["nextPageToken"]);
      if(t!=null)Y(a,["nextPageToken"],t);
      let r=H(T,["_self"]);
      if(r!=null){
        let h=T6T(r);
        if(Array.isArray(h))h=h.map((i)=>{
        return LK(i)}
      );
      Y(a,["models"],h)}
    return a}
    function BSR(T,R){
      let a={
    }
      ,e=H(T,["maskMode"]);
      if(e!=null)Y(a,["maskMode"],e);
      let t=H(T,["segmentationClasses"]);
      if(t!=null)Y(a,["maskClasses"],t);
      let r=H(T,["maskDilation"]);
      if(r!=null)Y(a,["dilation"],r);
    return a}
    function CK(T,R){
      let a={
    }
      ,e=H(T,["name"]);
      if(e!=null)Y(a,["name"],e);
      let t=H(T,["displayName"]);
      if(t!=null)Y(a,["displayName"],t);
      let r=H(T,["description"]);
      if(r!=null)Y(a,["description"],r);
      let h=H(T,["version"]);
      if(h!=null)Y(a,["version"],h);
      let i=H(T,["_self"]);
      if(i!=null)Y(a,["tunedModelInfo"],TOR(i));
      let c=H(T,["inputTokenLimit"]);
      if(c!=null)Y(a,["inputTokenLimit"],c);
      let s=H(T,["outputTokenLimit"]);
      if(s!=null)Y(a,["outputTokenLimit"],s);
      let A=H(T,["supportedGenerationMethods"]);
      if(A!=null)Y(a,["supportedActions"],A);
      let l=H(T,["temperature"]);
      if(l!=null)Y(a,["temperature"],l);
      let o=H(T,["maxTemperature"]);
      if(o!=null)Y(a,["maxTemperature"],o);
      let n=H(T,["topP"]);
      if(n!=null)Y(a,["topP"],n);
      let p=H(T,["topK"]);
      if(p!=null)Y(a,["topK"],p);
      let _=H(T,["thinking"]);
      if(_!=null)Y(a,["thinking"],_);
    return a}
    function LK(T,R){
      let a={
    }
      ,e=H(T,["name"]);
      if(e!=null)Y(a,["name"],e);
      let t=H(T,["displayName"]);
      if(t!=null)Y(a,["displayName"],t);
      let r=H(T,["description"]);
      if(r!=null)Y(a,["description"],r);
      let h=H(T,["versionId"]);
      if(h!=null)Y(a,["version"],h);
      let i=H(T,["deployedModels"]);
      if(i!=null){
        let o=i;
        if(Array.isArray(o))o=o.map((n)=>{
        return QjR(n)}
      );
      Y(a,["endpoints"],o)}
      let c=H(T,["labels"]);
      if(c!=null)Y(a,["labels"],c);
      let s=H(T,["_self"]);
      if(s!=null)Y(a,["tunedModelInfo"],ROR(s));
      let A=H(T,["defaultCheckpointId"]);
      if(A!=null)Y(a,["defaultCheckpointId"],A);
      let l=H(T,["checkpoints"]);
      if(l!=null){
        let o=l;
        if(Array.isArray(o))o=o.map((n)=>{
        return n}
      );
      Y(a,["checkpoints"],o)}
    return a}
    function NSR(T,R){
      let a={
    }
      ,e=H(T,["mediaResolution"]);
      if(e!=null)Y(a,["mediaResolution"],e);
      let t=H(T,["codeExecutionResult"]);
      if(t!=null)Y(a,["codeExecutionResult"],t);
      let r=H(T,["executableCode"]);
      if(r!=null)Y(a,["executableCode"],r);
      let h=H(T,["fileData"]);
      if(h!=null)Y(a,["fileData"],ZjR(h));
      let i=H(T,["functionCall"]);
      if(i!=null)Y(a,["functionCall"],JjR(i));
      let c=H(T,["functionResponse"]);
      if(c!=null)Y(a,["functionResponse"],c);
      let s=H(T,["inlineData"]);
      if(s!=null)Y(a,["inlineData"],IjR(s));
      let A=H(T,["text"]);
      if(A!=null)Y(a,["text"],A);
      let l=H(T,["thought"]);
      if(l!=null)Y(a,["thought"],l);
      let o=H(T,["thoughtSignature"]);
      if(o!=null)Y(a,["thoughtSignature"],o);
      let n=H(T,["videoMetadata"]);
      if(n!=null)Y(a,["videoMetadata"],n);
    return a}
    function USR(T,R){
      let a={
    }
      ,e=H(T,["productImage"]);
      if(e!=null)Y(a,["image"],Cc(e));
    return a}
    function HSR(T,R,a){
      let e={
    }
      ,t=H(T,["numberOfImages"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","sampleCount"],t);
      let r=H(T,["baseSteps"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","baseSteps"],r);
      let h=H(T,["outputGcsUri"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","storageUri"],h);
      let i=H(T,["seed"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","seed"],i);
      let c=H(T,["safetyFilterLevel"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","safetySetting"],c);
      let s=H(T,["personGeneration"]);
      if(R!==void 0&&s!=null)Y(R,["parameters","personGeneration"],s);
      let A=H(T,["addWatermark"]);
      if(R!==void 0&&A!=null)Y(R,["parameters","addWatermark"],A);
      let l=H(T,["outputMimeType"]);
      if(R!==void 0&&l!=null)Y(R,["parameters","outputOptions","mimeType"],l);
      let o=H(T,["outputCompressionQuality"]);
      if(R!==void 0&&o!=null)Y(R,["parameters","outputOptions","compressionQuality"],o);
      let n=H(T,["enhancePrompt"]);
      if(R!==void 0&&n!=null)Y(R,["parameters","enhancePrompt"],n);
      let p=H(T,["labels"]);
      if(R!==void 0&&p!=null)Y(R,["labels"],p);
    return e}
    function WSR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["source"]);
      if(r!=null)zSR(r,e);
      let h=H(R,["config"]);
      if(h!=null)HSR(h,e);
    return e}
    function qSR(T,R){
      let a={
    }
      ,e=H(T,["predictions"]);
      if(e!=null){
        let t=e;
        if(Array.isArray(t))t=t.map((r)=>{
        return iU(r)}
      );
      Y(a,["generatedImages"],t)}
    return a}
    function zSR(T,R,a){
      let e={
    }
      ,t=H(T,["prompt"]);
      if(R!==void 0&&t!=null)Y(R,["instances[0]","prompt"],t);
      let r=H(T,["personImage"]);
      if(R!==void 0&&r!=null)Y(R,["instances[0]","personImage","image"],Cc(r));
      let h=H(T,["productImages"]);
      if(R!==void 0&&h!=null){
        let i=h;
        if(Array.isArray(i))i=i.map((c)=>{
        return USR(c)}
      );
      Y(R,["instances[0]","productImages"],i)}
    return e}
    function FSR(T,R){
      let a={
    }
      ,e=H(T,["referenceImage"]);
      if(e!=null)Y(a,["referenceImage"],Cc(e));
      let t=H(T,["referenceId"]);
      if(t!=null)Y(a,["referenceId"],t);
      let r=H(T,["referenceType"]);
      if(r!=null)Y(a,["referenceType"],r);
      let h=H(T,["maskImageConfig"]);
      if(h!=null)Y(a,["maskImageConfig"],BSR(h));
      let i=H(T,["controlImageConfig"]);
      if(i!=null)Y(a,["controlImageConfig"],djR(i));
      let c=H(T,["styleImageConfig"]);
      if(c!=null)Y(a,["styleImageConfig"],c);
      let s=H(T,["subjectImageConfig"]);
      if(s!=null)Y(a,["subjectImageConfig"],s);
    return a}
    function s6T(T,R){
      let a={
    }
      ,e=H(T,["safetyAttributes","categories"]);
      if(e!=null)Y(a,["categories"],e);
      let t=H(T,["safetyAttributes","scores"]);
      if(t!=null)Y(a,["scores"],t);
      let r=H(T,["contentType"]);
      if(r!=null)Y(a,["contentType"],r);
    return a}
    function o6T(T,R){
      let a={
    }
      ,e=H(T,["safetyAttributes","categories"]);
      if(e!=null)Y(a,["categories"],e);
      let t=H(T,["safetyAttributes","scores"]);
      if(t!=null)Y(a,["scores"],t);
      let r=H(T,["contentType"]);
      if(r!=null)Y(a,["contentType"],r);
    return a}
    function GSR(T,R){
      let a={
    }
      ,e=H(T,["category"]);
      if(e!=null)Y(a,["category"],e);
      if(H(T,["method"])!==void 0)throw Error("method parameter is not supported in Gemini API.");
      let t=H(T,["threshold"]);
      if(t!=null)Y(a,["threshold"],t);
    return a}
    function KSR(T,R){
      let a={
    }
      ,e=H(T,["image"]);
      if(e!=null)Y(a,["image"],Cc(e));
    return a}
    function VSR(T,R,a){
      let e={
    }
      ,t=H(T,["mode"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","mode"],t);
      let r=H(T,["maxPredictions"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","maxPredictions"],r);
      let h=H(T,["confidenceThreshold"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","confidenceThreshold"],h);
      let i=H(T,["maskDilation"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","maskDilation"],i);
      let c=H(T,["binaryColorThreshold"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","binaryColorThreshold"],c);
      let s=H(T,["labels"]);
      if(R!==void 0&&s!=null)Y(R,["labels"],s);
    return e}
    function XSR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["source"]);
      if(r!=null)QSR(r,e);
      let h=H(R,["config"]);
      if(h!=null)VSR(h,e);
    return e}
    function YSR(T,R){
      let a={
    }
      ,e=H(T,["predictions"]);
      if(e!=null){
        let t=e;
        if(Array.isArray(t))t=t.map((r)=>{
        return kSR(r)}
      );
      Y(a,["generatedMasks"],t)}
    return a}
    function QSR(T,R,a){
      let e={
    }
      ,t=H(T,["prompt"]);
      if(R!==void 0&&t!=null)Y(R,["instances[0]","prompt"],t);
      let r=H(T,["image"]);
      if(R!==void 0&&r!=null)Y(R,["instances[0]","image"],Cc(r));
      let h=H(T,["scribbleImage"]);
      if(R!==void 0&&h!=null)Y(R,["instances[0]","scribble"],KSR(h));
    return e}
    function ZSR(T,R){
      let a={
    }
      ,e=H(T,["retrievalConfig"]);
      if(e!=null)Y(a,["retrievalConfig"],e);
      let t=H(T,["functionCallingConfig"]);
      if(t!=null)Y(a,["functionCallingConfig"],TSR(t));
    return a}
    function JSR(T,R){
      let a={
    }
      ;
      if(H(T,["retrieval"])!==void 0)throw Error("retrieval parameter is not supported in Gemini API.");
      let e=H(T,["computerUse"]);
      if(e!=null)Y(a,["computerUse"],e);
      let t=H(T,["fileSearch"]);
      if(t!=null)Y(a,["fileSearch"],t);
      let r=H(T,["codeExecution"]);
      if(r!=null)Y(a,["codeExecution"],r);
      if(H(T,["enterpriseWebSearch"])!==void 0)throw Error("enterpriseWebSearch parameter is not supported in Gemini API.");
      let h=H(T,["functionDeclarations"]);
      if(h!=null){
        let l=h;
        if(Array.isArray(l))l=l.map((o)=>{
        return o}
      );
      Y(a,["functionDeclarations"],l)}
      let i=H(T,["googleMaps"]);
      if(i!=null)Y(a,["googleMaps"],vSR(i));
      let c=H(T,["googleSearch"]);
      if(c!=null)Y(a,["googleSearch"],jSR(c));
      let s=H(T,["googleSearchRetrieval"]);
      if(s!=null)Y(a,["googleSearchRetrieval"],s);
      let A=H(T,["urlContext"]);
      if(A!=null)Y(a,["urlContext"],A);
    return a}
    function n6T(T,R){
      let a={
    }
      ,e=H(T,["retrieval"]);
      if(e!=null)Y(a,["retrieval"],e);
      let t=H(T,["computerUse"]);
      if(t!=null)Y(a,["computerUse"],t);
      if(H(T,["fileSearch"])!==void 0)throw Error("fileSearch parameter is not supported in Vertex AI.");
      let r=H(T,["codeExecution"]);
      if(r!=null)Y(a,["codeExecution"],r);
      let h=H(T,["enterpriseWebSearch"]);
      if(h!=null)Y(a,["enterpriseWebSearch"],h);
      let i=H(T,["functionDeclarations"]);
      if(i!=null){
        let o=i;
        if(Array.isArray(o))o=o.map((n)=>{
        return RSR(n)}
      );
      Y(a,["functionDeclarations"],o)}
      let c=H(T,["googleMaps"]);
      if(c!=null)Y(a,["googleMaps"],c);
      let s=H(T,["googleSearch"]);
      if(s!=null)Y(a,["googleSearch"],s);
      let A=H(T,["googleSearchRetrieval"]);
      if(A!=null)Y(a,["googleSearchRetrieval"],A);
      let l=H(T,["urlContext"]);
      if(l!=null)Y(a,["urlContext"],l);
    return a}
    function TOR(T,R){
      let a={
    }
      ,e=H(T,["baseModel"]);
      if(e!=null)Y(a,["baseModel"],e);
      let t=H(T,["createTime"]);
      if(t!=null)Y(a,["createTime"],t);
      let r=H(T,["updateTime"]);
      if(r!=null)Y(a,["updateTime"],r);
    return a}
    function ROR(T,R){
      let a={
    }
      ,e=H(T,["labels","google-vertex-llm-tuning-base-model-id"]);
      if(e!=null)Y(a,["baseModel"],e);
      let t=H(T,["createTime"]);
      if(t!=null)Y(a,["createTime"],t);
      let r=H(T,["updateTime"]);
      if(r!=null)Y(a,["updateTime"],r);
    return a}
    function aOR(T,R,a){
      let e={
    }
      ,t=H(T,["displayName"]);
      if(R!==void 0&&t!=null)Y(R,["displayName"],t);
      let r=H(T,["description"]);
      if(R!==void 0&&r!=null)Y(R,["description"],r);
      let h=H(T,["defaultCheckpointId"]);
      if(R!==void 0&&h!=null)Y(R,["defaultCheckpointId"],h);
    return e}
    function eOR(T,R,a){
      let e={
    }
      ,t=H(T,["displayName"]);
      if(R!==void 0&&t!=null)Y(R,["displayName"],t);
      let r=H(T,["description"]);
      if(R!==void 0&&r!=null)Y(R,["description"],r);
      let h=H(T,["defaultCheckpointId"]);
      if(R!==void 0&&h!=null)Y(R,["defaultCheckpointId"],h);
    return e}
    function tOR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","name"],g8(T,t));
      let r=H(R,["config"]);
      if(r!=null)aOR(r,e);
    return e}
    function rOR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["config"]);
      if(r!=null)eOR(r,e);
    return e}
    function hOR(T,R,a){
      let e={
    }
      ,t=H(T,["outputGcsUri"]);
      if(R!==void 0&&t!=null)Y(R,["parameters","storageUri"],t);
      let r=H(T,["safetyFilterLevel"]);
      if(R!==void 0&&r!=null)Y(R,["parameters","safetySetting"],r);
      let h=H(T,["personGeneration"]);
      if(R!==void 0&&h!=null)Y(R,["parameters","personGeneration"],h);
      let i=H(T,["includeRaiReason"]);
      if(R!==void 0&&i!=null)Y(R,["parameters","includeRaiReason"],i);
      let c=H(T,["outputMimeType"]);
      if(R!==void 0&&c!=null)Y(R,["parameters","outputOptions","mimeType"],c);
      let s=H(T,["outputCompressionQuality"]);
      if(R!==void 0&&s!=null)Y(R,["parameters","outputOptions","compressionQuality"],s);
      let A=H(T,["enhanceInputImage"]);
      if(R!==void 0&&A!=null)Y(R,["parameters","upscaleConfig","enhanceInputImage"],A);
      let l=H(T,["imagePreservationFactor"]);
      if(R!==void 0&&l!=null)Y(R,["parameters","upscaleConfig","imagePreservationFactor"],l);
      let o=H(T,["labels"]);
      if(R!==void 0&&o!=null)Y(R,["labels"],o);
      let n=H(T,["numberOfImages"]);
      if(R!==void 0&&n!=null)Y(R,["parameters","sampleCount"],n);
      let p=H(T,["mode"]);
      if(R!==void 0&&p!=null)Y(R,["parameters","mode"],p);
    return e}
    function iOR(T,R,a){
      let e={
    }
      ,t=H(R,["model"]);
      if(t!=null)Y(e,["_url","model"],g8(T,t));
      let r=H(R,["image"]);
      if(r!=null)Y(e,["instances[0]","image"],Cc(r));
      let h=H(R,["upscaleFactor"]);
      if(h!=null)Y(e,["parameters","upscaleConfig","upscaleFactor"],h);
      let i=H(R,["config"]);
      if(i!=null)hOR(i,e);
    return e}
    function cOR(T,R){
      let a={
    }
      ,e=H(T,["sdkHttpResponse"]);
      if(e!=null)Y(a,["sdkHttpResponse"],e);
      let t=H(T,["predictions"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return iU(h)}
      );
      Y(a,["generatedImages"],r)}
    return a}
    function sOR(T,R){
      let a={
    }
      ,e=H(T,["uri"]);
      if(e!=null)Y(a,["uri"],e);
      let t=H(T,["encodedVideo"]);
      if(t!=null)Y(a,["videoBytes"],hp(t));
      let r=H(T,["encoding"]);
      if(r!=null)Y(a,["mimeType"],r);
    return a}
    function oOR(T,R){
      let a={
    }
      ,e=H(T,["gcsUri"]);
      if(e!=null)Y(a,["uri"],e);
      let t=H(T,["bytesBase64Encoded"]);
      if(t!=null)Y(a,["videoBytes"],hp(t));
      let r=H(T,["mimeType"]);
      if(r!=null)Y(a,["mimeType"],r);
    return a}
    function nOR(T,R){
      let a={
    }
      ,e=H(T,["image"]);
      if(e!=null)Y(a,["_self"],Cc(e));
      let t=H(T,["maskMode"]);
      if(t!=null)Y(a,["maskMode"],t);
    return a}
    function lOR(T,R){
      let a={
    }
      ,e=H(T,["image"]);
      if(e!=null)Y(a,["image"],cU(e));
      let t=H(T,["referenceType"]);
      if(t!=null)Y(a,["referenceType"],t);
    return a}
    function AOR(T,R){
      let a={
    }
      ,e=H(T,["image"]);
      if(e!=null)Y(a,["image"],Cc(e));
      let t=H(T,["referenceType"]);
      if(t!=null)Y(a,["referenceType"],t);
    return a}
    function l6T(T,R){
      let a={
    }
      ,e=H(T,["uri"]);
      if(e!=null)Y(a,["uri"],e);
      let t=H(T,["videoBytes"]);
      if(t!=null)Y(a,["encodedVideo"],hp(t));
      let r=H(T,["mimeType"]);
      if(r!=null)Y(a,["encoding"],r);
    return a}
    function A6T(T,R){
      let a={
    }
      ,e=H(T,["uri"]);
      if(e!=null)Y(a,["gcsUri"],e);
      let t=H(T,["videoBytes"]);
      if(t!=null)Y(a,["bytesBase64Encoded"],hp(t));
      let r=H(T,["mimeType"]);
      if(r!=null)Y(a,["mimeType"],r);
    return a}
    function pOR(T,R){
      let a={
    }
      ,e=H(T,["displayName"]);
      if(R!==void 0&&e!=null)Y(R,["displayName"],e);
    return a}
    function _OR(T){
      let R={
    }
      ,a=H(T,["config"]);
      if(a!=null)pOR(a,R);
    return R}
    function bOR(T,R){
      let a={
    }
      ,e=H(T,["force"]);
      if(R!==void 0&&e!=null)Y(R,["_query","force"],e);
    return a}
    function mOR(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["_url","name"],a);
      let e=H(T,["config"]);
      if(e!=null)bOR(e,R);
    return R}
    function uOR(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["_url","name"],a);
    return R}
    function yOR(T,R){
      let a={
    }
      ,e=H(T,["customMetadata"]);
      if(R!==void 0&&e!=null){
        let r=e;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(R,["customMetadata"],r)}
      let t=H(T,["chunkingConfig"]);
      if(R!==void 0&&t!=null)Y(R,["chunkingConfig"],t);
    return a}
    function POR(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["name"],a);
      let e=H(T,["metadata"]);
      if(e!=null)Y(R,["metadata"],e);
      let t=H(T,["done"]);
      if(t!=null)Y(R,["done"],t);
      let r=H(T,["error"]);
      if(r!=null)Y(R,["error"],r);
      let h=H(T,["response"]);
      if(h!=null)Y(R,["response"],xOR(h));
    return R}
    function kOR(T){
      let R={
    }
      ,a=H(T,["fileSearchStoreName"]);
      if(a!=null)Y(R,["_url","file_search_store_name"],a);
      let e=H(T,["fileName"]);
      if(e!=null)Y(R,["fileName"],e);
      let t=H(T,["config"]);
      if(t!=null)yOR(t,R);
    return R}
    function xOR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["parent"]);
      if(e!=null)Y(R,["parent"],e);
      let t=H(T,["documentName"]);
      if(t!=null)Y(R,["documentName"],t);
    return R}
    function fOR(T,R){
      let a={
    }
      ,e=H(T,["pageSize"]);
      if(R!==void 0&&e!=null)Y(R,["_query","pageSize"],e);
      let t=H(T,["pageToken"]);
      if(R!==void 0&&t!=null)Y(R,["_query","pageToken"],t);
    return a}
    function IOR(T){
      let R={
    }
      ,a=H(T,["config"]);
      if(a!=null)fOR(a,R);
    return R}
    function gOR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["nextPageToken"]);
      if(e!=null)Y(R,["nextPageToken"],e);
      let t=H(T,["fileSearchStores"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(R,["fileSearchStores"],r)}
    return R}
    function p6T(T,R){
      let a={
    }
      ,e=H(T,["mimeType"]);
      if(R!==void 0&&e!=null)Y(R,["mimeType"],e);
      let t=H(T,["displayName"]);
      if(R!==void 0&&t!=null)Y(R,["displayName"],t);
      let r=H(T,["customMetadata"]);
      if(R!==void 0&&r!=null){
        let i=r;
        if(Array.isArray(i))i=i.map((c)=>{
        return c}
      );
      Y(R,["customMetadata"],i)}
      let h=H(T,["chunkingConfig"]);
      if(R!==void 0&&h!=null)Y(R,["chunkingConfig"],h);
    return a}
    function $OR(T){
      let R={
    }
      ,a=H(T,["fileSearchStoreName"]);
      if(a!=null)Y(R,["_url","file_search_store_name"],a);
      let e=H(T,["config"]);
      if(e!=null)p6T(e,R);
    return R}
    function vOR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
    return R}
    class _6T{
      constructor(T){
        var R,a,e;
        if(this.clientOptions=Object.assign({
      }
        ,T),this.customBaseUrl=(R=T.httpOptions)===null||R===void 0?void 0:R.baseUrl,this.clientOptions.vertexai){
          if(this.clientOptions.project&&this.clientOptions.location)this.clientOptions.apiKey=void 0;
        else if(this.clientOptions.apiKey)this.clientOptions.project=void 0,this.clientOptions.location=void 0}
        let t={
      }
        ;
        if(this.clientOptions.vertexai){
          if(!this.clientOptions.location&&!this.clientOptions.apiKey&&!this.customBaseUrl)this.clientOptions.location="global";
          if(!(this.clientOptions.project&&this.clientOptions.location||this.clientOptions.apiKey)&&!this.customBaseUrl)throw Error("Authentication is not set up. Please provide either a project and location, or an API key, or a custom base URL.");
          let r=T.project&&T.location||!!T.apiKey;
          if(this.customBaseUrl&&!r)t.baseUrl=this.customBaseUrl,this.clientOptions.project=void 0,this.clientOptions.location=void 0;
          else if(this.clientOptions.apiKey||this.clientOptions.location==="global")t.baseUrl="https://aiplatform.googleapis.com/";
          else if(this.clientOptions.project&&this.clientOptions.location)t.baseUrl=`https://${this.clientOptions.location}-aiplatform.googleapis.com/`;
        t.apiVersion=(a=this.clientOptions.apiVersion)!==null&&a!==void 0?a:eER}
        else{
          if(!this.clientOptions.apiKey)throw new u7({
          message:"API key must be set when using the Gemini API.",status:403}
        );
        t.apiVersion=(e=this.clientOptions.apiVersion)!==null&&e!==void 0?e:tER,t.baseUrl="https://generativelanguage.googleapis.com/"}
      if(t.headers=this.getDefaultHeaders(),this.clientOptions.httpOptions=t,T.httpOptions)this.clientOptions.httpOptions=this.patchHttpOptions(t,T.httpOptions)}
      isVertexAI(){
        var T;
      return(T=this.clientOptions.vertexai)!==null&&T!==void 0?T:!1}
      getProject(){
      return this.clientOptions.project}
      getLocation(){
      return this.clientOptions.location}
      getCustomBaseUrl(){
      return this.customBaseUrl}
      async getAuthHeaders(){
        let T=new Headers;
      return await this.clientOptions.auth.addAuthHeaders(T),T}
      getApiVersion(){
        if(this.clientOptions.httpOptions&&this.clientOptions.httpOptions.apiVersion!==void 0)return this.clientOptions.httpOptions.apiVersion;
      throw Error("API version is not set.")}
      getBaseUrl(){
        if(this.clientOptions.httpOptions&&this.clientOptions.httpOptions.baseUrl!==void 0)return this.clientOptions.httpOptions.baseUrl;
      throw Error("Base URL is not set.")}
      getRequestUrl(){
      return this.getRequestUrlInternal(this.clientOptions.httpOptions)}
      getHeaders(){
        if(this.clientOptions.httpOptions&&this.clientOptions.httpOptions.headers!==void 0)return this.clientOptions.httpOptions.headers;
      else throw Error("Headers are not set.")}
      getRequestUrlInternal(T){
        if(!T||T.baseUrl===void 0||T.apiVersion===void 0)throw Error("HTTP options are not correctly set.");
        let R=[T.baseUrl.endsWith("/")?T.baseUrl.slice(0,-1):T.baseUrl];
        if(T.apiVersion&&T.apiVersion!=="")R.push(T.apiVersion);
      return R.join("/")}
      getBaseResourcePath(){
      return`projects/${this.clientOptions.project}/locations/${this.clientOptions.location}`}
      getApiKey(){
      return this.clientOptions.apiKey}
      getWebsocketBaseUrl(){
        let T=this.getBaseUrl(),R=new URL(T);
      return R.protocol=R.protocol=="http:"?"ws":"wss",R.toString()}
      setBaseUrl(T){
        if(this.clientOptions.httpOptions)this.clientOptions.httpOptions.baseUrl=T;
      else throw Error("HTTP options are not correctly set.")}
      constructUrl(T,R,a){
        let e=[this.getRequestUrlInternal(R)];
        if(a)e.push(this.getBaseResourcePath());
        if(T!=="")e.push(T);
      return new URL(`${e.join("/")}`)}
      shouldPrependVertexProjectPath(T,R){
        if(R.baseUrl&&R.baseUrlResourceScope===UK.COLLECTION)return!1;
        if(this.clientOptions.apiKey)return!1;
        if(!this.clientOptions.vertexai)return!1;
        if(T.path.startsWith("projects/"))return!1;
        if(T.httpMethod==="GET"&&T.path.startsWith("publishers/google/models"))return!1;
      return!0}
      async request(T){
        let R=this.clientOptions.httpOptions;
        if(T.httpOptions)R=this.patchHttpOptions(this.clientOptions.httpOptions,T.httpOptions);
        let a=this.shouldPrependVertexProjectPath(T,R),e=this.constructUrl(T.path,R,a);
        if(T.queryParams)for(let[r,h]of Object.entries(T.queryParams))e.searchParams.append(r,String(h));
        let t={
      }
        ;
        if(T.httpMethod==="GET"){
        if(T.body&&T.body!=="{}")throw Error("Request body should be empty for GET request, but got non empty request body")}
        else t.body=T.body;
      return t=await this.includeExtraHttpOptionsToRequestInit(t,R,e.toString(),T.abortSignal),this.unaryApiCall(e,t,T.httpMethod)}
      patchHttpOptions(T,R){
        let a=JSON.parse(JSON.stringify(T));
        for(let[e,t]of Object.entries(R))if(typeof t==="object")a[e]=Object.assign(Object.assign({
      }
        ,a[e]),t);
        else if(t!==void 0)a[e]=t;
      return a}
      async requestStream(T){
        let R=this.clientOptions.httpOptions;
        if(T.httpOptions)R=this.patchHttpOptions(this.clientOptions.httpOptions,T.httpOptions);
        let a=this.shouldPrependVertexProjectPath(T,R),e=this.constructUrl(T.path,R,a);
        if(!e.searchParams.has("alt")||e.searchParams.get("alt")!=="sse")e.searchParams.set("alt","sse");
        let t={
      }
        ;
      return t.body=T.body,t=await this.includeExtraHttpOptionsToRequestInit(t,R,e.toString(),T.abortSignal),this.streamApiCall(e,t,T.httpMethod)}
      async includeExtraHttpOptionsToRequestInit(T,R,a,e){
        if(R&&R.timeout||e){
          let t=new AbortController,r=t.signal;
          if(R.timeout&&(R===null||R===void 0?void 0:R.timeout)>0){
            let h=setTimeout(()=>t.abort(),R.timeout);
          if(h&&typeof h.unref==="function")h.unref()}
          if(e)e.addEventListener("abort",()=>{
          t.abort()}
        );
        T.signal=r}
        if(R&&R.extraBody!==null)jOR(T,R.extraBody);
      return T.headers=await this.getHeadersInternal(R,a),T}
      async unaryApiCall(T,R,a){
        return this.apiCall(T.toString(),Object.assign(Object.assign({
      }
        ,R),{
        method:a}
      )).then(async(e)=>{
        return await QAT(e),new fk(e)}
      ).catch((e)=>{
          if(e instanceof Error)throw e;
        else throw Error(JSON.stringify(e))}
    )}
      async streamApiCall(T,R,a){
        return this.apiCall(T.toString(),Object.assign(Object.assign({
      }
        ,R),{
        method:a}
      )).then(async(e)=>{
        return await QAT(e),this.processStreamResponse(e)}
      ).catch((e)=>{
          if(e instanceof Error)throw e;
        else throw Error(JSON.stringify(e))}
    )}
      processStreamResponse(T){
        return ac(this,arguments,function*(){
          var R;
          let a=(R=T===null||T===void 0?void 0:T.body)===null||R===void 0?void 0:R.getReader(),e=new TextDecoder("utf-8");
          if(!a)throw Error("Response body is empty");
          try{
            let t="",r="data:",h=[`

`,"\r\r",`\r
\r
`];
            while(!0){
              let{
              done:i,value:c}
              =yield S9(a.read());
              if(i){
                if(t.trim().length>0)throw Error("Incomplete JSON segment at the end");
              break}
              let s=e.decode(c,{
              stream:!0}
            );
              try{
                let o=JSON.parse(s);
                if("error"in o){
                  let n=JSON.parse(JSON.stringify(o.error)),p=n.status,_=n.code,m=`got status: ${p}. ${JSON.stringify(o)}`;
                  if(_>=400&&_<600)throw new u7({
                  message:m,status:_}
              )}
            }
              catch(o){
              if(o.name==="ApiError")throw o}
              t+=s;
              let A=-1,l=0;
              while(!0){
                A=-1,l=0;
                for(let p of h){
                  let _=t.indexOf(p);
                if(_!==-1&&(A===-1||_<A))A=_,l=p.length}
                if(A===-1)break;
                let o=t.substring(0,A);
                t=t.substring(A+l);
                let n=o.trim();
                if(n.startsWith(r)){
                  let p=n.substring(r.length).trim();
                  try{
                    let _=new Response(p,{
                    headers:T===null||T===void 0?void 0:T.headers,status:T===null||T===void 0?void 0:T.status,statusText:T===null||T===void 0?void 0:T.statusText}
                  );
                  yield yield S9(new fk(_))}
                  catch(_){
                  throw Error(`exception parsing stream chunk ${p}. ${_}`)}
              }
            }
          }
        }
          finally{
          a.releaseLock()}
      }
    )}
      async apiCall(T,R){
        return fetch(T,R).catch((a)=>{
        throw Error(`exception ${a} sending request`)}
    )}
      getDefaultHeaders(){
        let T={
      }
        ,R=B6T+" "+this.clientOptions.userAgentExtra;
      return T[RER]=R,T[HK]=R,T[JdR]="application/json",T}
      async getHeadersInternal(T,R){
        let a=new Headers;
        if(T&&T.headers){
          for(let[e,t]of Object.entries(T.headers))a.append(e,t);
        if(T.timeout&&T.timeout>0)a.append(TER,String(Math.ceil(T.timeout/1000)))}
      return await this.clientOptions.auth.addAuthHeaders(a,R),a}
      getFileName(T){
        var R;
        let a="";
        if(typeof T==="string")a=T.replace(/[/\\]+$/,""),a=(R=a.split(/[/\\]/).pop())!==null&&R!==void 0?R:"";
      return a}
      async uploadFile(T,R){
        var a;
        let e={
      }
        ;
        if(R!=null)e.mimeType=R.mimeType,e.name=R.name,e.displayName=R.displayName;
        if(e.name&&!e.name.startsWith("files/"))e.name=`files/${e.name}`;
        let t=this.clientOptions.uploader,r=await t.stat(T);
        e.sizeBytes=String(r.size);
        let h=(a=R===null||R===void 0?void 0:R.mimeType)!==null&&a!==void 0?a:r.type;
        if(h===void 0||h==="")throw Error("Can not determine mimeType. Please provide mimeType in the config.");
        e.mimeType=h;
        let i={
        file:e}
        ,c=this.getFileName(T),s=b0("upload/v1beta/files",i._url),A=await this.fetchUploadUrl(s,e.sizeBytes,e.mimeType,c,i,R===null||R===void 0?void 0:R.httpOptions);
      return t.upload(T,A,this)}
      async uploadFileToFileSearchStore(T,R,a){
        var e;
        let t=this.clientOptions.uploader,r=await t.stat(R),h=String(r.size),i=(e=a===null||a===void 0?void 0:a.mimeType)!==null&&e!==void 0?e:r.type;
        if(i===void 0||i==="")throw Error("Can not determine mimeType. Please provide mimeType in the config.");
        let c=`upload/v1beta/${T}:uploadToFileSearchStore`,s=this.getFileName(R),A={
      }
        ;
        if(a!=null)p6T(a,A);
        let l=await this.fetchUploadUrl(c,h,i,s,A,a===null||a===void 0?void 0:a.httpOptions);
      return t.uploadToFileSearchStore(R,l,this)}
      async downloadFile(T){
      await this.clientOptions.downloader.download(T,this)}
      async fetchUploadUrl(T,R,a,e,t,r){
        var h;
        let i={
      }
        ;
        if(r)i=r;
        else i={
          apiVersion:"",headers:Object.assign({
          "Content-Type":"application/json","X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":`${R}`,"X-Goog-Upload-Header-Content-Type":`${a}`}
          ,e?{
          "X-Goog-Upload-File-Name":e}
          :{
        }
      )}
        ;
        let c=await this.request({
        path:T,body:JSON.stringify(t),httpMethod:"POST",httpOptions:i}
      );
        if(!c||!(c===null||c===void 0?void 0:c.headers))throw Error("Server did not return an HttpResponse or the returned HttpResponse did not have headers.");
        let s=(h=c===null||c===void 0?void 0:c.headers)===null||h===void 0?void 0:h["x-goog-upload-url"];
        if(s===void 0)throw Error("Failed to get upload url. Server did not return the x-google-upload-url in the headers");
      return s}
  }
    async function QAT(T){
      var R;
      if(T===void 0)throw Error("response is undefined");
      if(!T.ok){
        let a=T.status,e;
        if((R=T.headers.get("content-type"))===null||R===void 0?void 0:R.includes("application/json"))e=await T.json();
        else e={
          error:{
          message:await T.text(),code:T.status,status:T.statusText}
      }
        ;
        let t=JSON.stringify(e);
        if(a>=400&&a<600)throw new u7({
        message:t,status:a}
      );
      throw Error(t)}
  }
    function jOR(T,R){
      if(!R||Object.keys(R).length===0)return;
      if(T.body instanceof Blob){
        console.warn("includeExtraBodyToRequestInit: extraBody provided but current request body is a Blob. extraBody will be ignored as merging is not supported for Blob bodies.");
      return}
      let a={
    }
      ;
      if(typeof T.body==="string"&&T.body.length>0)try{
        let r=JSON.parse(T.body);
        if(typeof r==="object"&&r!==null&&!Array.isArray(r))a=r;
        else{
          console.warn("includeExtraBodyToRequestInit: Original request body is valid JSON but not a non-array object. Skip applying extraBody to the request body.");
        return}
    }
      catch(r){
        console.warn("includeExtraBodyToRequestInit: Original request body is not valid JSON. Skip applying extraBody to the request body.");
      return}
      function e(r,h){
        let i=Object.assign({
      }
        ,r);
        for(let c in h)if(Object.prototype.hasOwnProperty.call(h,c)){
          let s=h[c],A=i[c];
          if(s&&typeof s==="object"&&!Array.isArray(s)&&A&&typeof A==="object"&&!Array.isArray(A))i[c]=e(A,s);
          else{
            if(A&&s&&typeof A!==typeof s)console.warn(`includeExtraBodyToRequestInit:deepMerge: Type mismatch for key "${c}". Original type: ${typeof A}, New type: ${typeof s}. Overwriting.`);
          i[c]=s}
      }
      return i}
      let t=e(a,R);
    T.body=JSON.stringify(t)}
    function b6T(T){
      for(let R of T){
        if(SOR(R))return!0;
      if(typeof R==="object"&&"inputSchema"in R)return!0}
    return hER}
    function m6T(T){
      var R;
      let a=(R=T[HK])!==null&&R!==void 0?R:"";
    T[HK]=(a+` ${rER}`).trimStart()}
    function SOR(T){
    return T!==null&&typeof T==="object"&&T instanceof F8T}
    function OOR(T){
      return ac(this,arguments,function*(R,a=100){
        let e=void 0,t=0;
        while(t<a){
          let r=yield S9(R.listTools({
          cursor:e}
        ));
          for(let h of r.tools)yield yield S9(h),t++;
          if(!r.nextCursor)break;
        e=r.nextCursor}
    }
  )}
    class F8T{
      constructor(T=[],R){
        this.mcpTools=[],this.functionNameToMcpClient={
      }
      ,this.mcpClients=T,this.config=R}
      static create(T,R){
      return new F8T(T,R)}
      async initialize(){
        var T,R,a,e;
        if(this.mcpTools.length>0)return;
        let t={
      }
        ,r=[];
        for(let s of this.mcpClients)try{
          for(var h=!0,i=(R=void 0,ec(OOR(s))),c;
          c=await i.next(),T=c.done,!T;
          h=!0){
            e=c.value,h=!1;
            let A=e;
            r.push(A);
            let l=A.name;
            if(t[l])throw Error(`Duplicate function name ${l} found in MCP tools. Please ensure function names are unique.`);
          t[l]=s}
      }
        catch(A){
          R={
          error:A}
      }
        finally{
          try{
          if(!h&&!T&&(a=i.return))await a.call(i)}
          finally{
          if(R)throw R.error}
      }
      this.mcpTools=r,this.functionNameToMcpClient=t}
      async tool(){
      return await this.initialize(),P$R(this.mcpTools,this.config)}
      async callTool(T){
        await this.initialize();
        let R=[];
        for(let a of T)if(a.name in this.functionNameToMcpClient){
          let e=this.functionNameToMcpClient[a.name],t=void 0;
          if(this.config.timeout)t={
          timeout:this.config.timeout}
          ;
          let r=await e.callTool({
          name:a.name,arguments:a.args}
          ,void 0,t);
          R.push({
            functionResponse:{
              name:a.name,response:r.isError?{
              error:r}
            :r}
        }
      )}
      return R}
  }
    async function dOR(T,R,a){
      let e=new zBT,t;
      if(a.data instanceof Blob)t=JSON.parse(await a.data.text());
      else t=JSON.parse(a.data);
    Object.assign(e,t),R(e)}
    class u6T{
      constructor(T,R,a){
      this.apiClient=T,this.auth=R,this.webSocketFactory=a}
      async connect(T){
        var R,a;
        if(this.apiClient.isVertexAI())throw Error("Live music is not supported for Vertex AI.");
        console.warn("Live music generation is experimental and may change in future versions.");
        let e=this.apiClient.getWebsocketBaseUrl(),t=this.apiClient.getApiVersion(),r=COR(this.apiClient.getDefaultHeaders()),h=this.apiClient.getApiKey(),i=`${e}/ws/google.ai.generativelanguage.${t}.GenerativeService.BidiGenerateMusic?key=${h}`,c=()=>{
      }
        ,s=new Promise((m)=>{
        c=m}
      ),A=T.callbacks,l=function(){
          c({
        }
      )}
        ,o=this.apiClient,n={
          onopen:l,onmessage:(m)=>{
          dOR(o,A.onmessage,m)}
          ,onerror:(R=A===null||A===void 0?void 0:A.onerror)!==null&&R!==void 0?R:function(m){
        }
          ,onclose:(a=A===null||A===void 0?void 0:A.onclose)!==null&&a!==void 0?a:function(m){
        }
      }
        ,p=this.webSocketFactory.create(i,EOR(r),n);
        p.connect(),await s;
        let _={
          setup:{
          model:g8(this.apiClient,T.model)}
      }
        ;
      return p.send(JSON.stringify(_)),new y6T(p,this.apiClient)}
  }
    class y6T{
      constructor(T,R){
      this.conn=T,this.apiClient=R}
      async setWeightedPrompts(T){
        if(!T.weightedPrompts||Object.keys(T.weightedPrompts).length===0)throw Error("Weighted prompts must be set and contain at least one entry.");
        let R=pjR(T);
        this.conn.send(JSON.stringify({
        clientContent:R}
    ))}
      async setMusicGenerationConfig(T){
        if(!T.musicGenerationConfig)T.musicGenerationConfig={
      }
        ;
        let R=AjR(T);
      this.conn.send(JSON.stringify(R))}
      sendPlaybackControl(T){
        let R={
        playbackControl:T}
        ;
      this.conn.send(JSON.stringify(R))}
      play(){
      this.sendPlaybackControl(TP.PLAY)}
      pause(){
      this.sendPlaybackControl(TP.PAUSE)}
      stop(){
      this.sendPlaybackControl(TP.STOP)}
      resetContext(){
      this.sendPlaybackControl(TP.RESET_CONTEXT)}
      close(){
      this.conn.close()}
  }
    function EOR(T){
      let R={
    }
      ;
      return T.forEach((a,e)=>{
      R[e]=a}
  ),R}
    function COR(T){
      let R=new Headers;
      for(let[a,e]of Object.entries(T))R.append(a,e);
    return R}
    async function LOR(T,R,a){
      let e=new qBT,t;
      if(a.data instanceof Blob)t=await a.data.text();
      else if(a.data instanceof ArrayBuffer)t=new TextDecoder().decode(a.data);
      else t=a.data;
      let r=JSON.parse(t);
      if(T.isVertexAI()){
        let h=mjR(r);
      Object.assign(e,h)}
      else Object.assign(e,r);
    R(e)}
    class P6T{
      constructor(T,R,a){
      this.apiClient=T,this.auth=R,this.webSocketFactory=a,this.music=new u6T(this.apiClient,this.auth,this.webSocketFactory)}
      async connect(T){
        var R,a,e,t,r,h;
        if(T.config&&T.config.httpOptions)throw Error("The Live module does not support httpOptions at request-level in LiveConnectConfig yet. Please use the client-level httpOptions configuration instead.");
        let i=this.apiClient.getWebsocketBaseUrl(),c=this.apiClient.getApiVersion(),s,A=this.apiClient.getHeaders();
        if(T.config&&T.config.tools&&b6T(T.config.tools))m6T(A);
        let l=DOR(A);
        if(this.apiClient.isVertexAI()){
          let v=this.apiClient.getProject(),g=this.apiClient.getLocation(),I=this.apiClient.getApiKey(),S=!!v&&!!g||!!I;
          if(this.apiClient.getCustomBaseUrl()&&!S)s=i;
        else s=`${i}/ws/google.cloud.aiplatform.${c}.LlmBidiService/BidiGenerateContent`,await this.auth.addAuthHeaders(l,s)}
        else{
          let v=this.apiClient.getApiKey(),g="BidiGenerateContent",I="key";
          if(v===null||v===void 0?void 0:v.startsWith("auth_tokens/")){
            if(console.warn("Warning: Ephemeral token support is experimental and may change in future versions."),c!=="v1alpha")console.warn("Warning: The SDK's ephemeral token support is in v1alpha only. Please use const ai = new GoogleGenAI({apiKey: token.name, httpOptions: { apiVersion: 'v1alpha' }}); before session connection.");
          g="BidiGenerateContentConstrained",I="access_token"}
        s=`${i}/ws/google.ai.generativelanguage.${c}.GenerativeService.${g}?${I}=${v}`}
        let o=()=>{
      }
        ,n=new Promise((v)=>{
        o=v}
      ),p=T.callbacks,_=function(){
          var v;
          (v=p===null||p===void 0?void 0:p.onopen)===null||v===void 0||v.call(p),o({
        }
      )}
        ,m=this.apiClient,b={
          onopen:_,onmessage:(v)=>{
          LOR(m,p.onmessage,v)}
          ,onerror:(R=p===null||p===void 0?void 0:p.onerror)!==null&&R!==void 0?R:function(v){
        }
          ,onclose:(a=p===null||p===void 0?void 0:p.onclose)!==null&&a!==void 0?a:function(v){
        }
      }
        ,y=this.webSocketFactory.create(s,MOR(l),b);
        y.connect(),await n;
        let u=g8(this.apiClient,T.model);
        if(this.apiClient.isVertexAI()&&u.startsWith("publishers/")){
          let v=this.apiClient.getProject(),g=this.apiClient.getLocation();
        if(v&&g)u=`projects/${v}/locations/${g}/`+u}
        let P={
      }
        ;
        if(this.apiClient.isVertexAI()&&((e=T.config)===null||e===void 0?void 0:e.responseModalities)===void 0)if(T.config===void 0)T.config={
        responseModalities:[m7.AUDIO]}
        ;
        else T.config.responseModalities=[m7.AUDIO];
        if((t=T.config)===null||t===void 0?void 0:t.generationConfig)console.warn("Setting `LiveConnectConfig.generation_config` is deprecated, please set the fields on `LiveConnectConfig` directly. This will become an error in a future version (not before Q3 2025).");
        let k=(h=(r=T.config)===null||r===void 0?void 0:r.tools)!==null&&h!==void 0?h:[],x=[];
        for(let v of k)if(this.isCallableTool(v)){
          let g=v;
        x.push(await g.tool())}
        else x.push(v);
        if(x.length>0)T.config.tools=x;
        let f={
        model:u,config:T.config,callbacks:T.callbacks}
        ;
        if(this.apiClient.isVertexAI())P=ljR(this.apiClient,f);
        else P=njR(this.apiClient,f);
      return delete P.config,y.send(JSON.stringify(P)),new k6T(y,this.apiClient)}
      isCallableTool(T){
      return"callTool"in T&&typeof T.callTool==="function"}
  }
    class k6T{
      constructor(T,R){
      this.conn=T,this.apiClient=R}
      tLiveClientContent(T,R){
        if(R.turns!==null&&R.turns!==void 0){
          let a=[];
          try{
          if(a=ui(R.turns),!T.isVertexAI())a=a.map((e)=>hU(e))}
          catch(e){
          throw Error(`Failed to parse client content "turns", type: '${typeof R.turns}'`)}
          return{
            clientContent:{
            turns:a,turnComplete:R.turnComplete}
        }
      }
        return{
          clientContent:{
          turnComplete:R.turnComplete}
      }
    }
      tLiveClienttToolResponse(T,R){
        let a=[];
        if(R.functionResponses==null)throw Error("functionResponses is required.");
        if(!Array.isArray(R.functionResponses))a=[R.functionResponses];
        else a=R.functionResponses;
        if(a.length===0)throw Error("functionResponses is required.");
        for(let e of a){
          if(typeof e!=="object"||e===null||!("name"in e)||!("response"in e))throw Error(`Could not parse function response, type '${typeof e}'.`);
        if(!T.isVertexAI()&&!("id"in e))throw Error(iER)}
        return{
          toolResponse:{
          functionResponses:a}
      }
    }
      sendClientContent(T){
        T=Object.assign(Object.assign({
      }
        ,N6T),T);
        let R=this.tLiveClientContent(this.apiClient,T);
      this.conn.send(JSON.stringify(R))}
      sendRealtimeInput(T){
        let R={
      }
        ;
        if(this.apiClient.isVertexAI())R={
        realtimeInput:bjR(T)}
        ;
        else R={
        realtimeInput:_jR(T)}
        ;
      this.conn.send(JSON.stringify(R))}
      sendToolResponse(T){
        if(T.functionResponses==null)throw Error("Tool response parameters are required.");
        let R=this.tLiveClienttToolResponse(this.apiClient,T);
      this.conn.send(JSON.stringify(R))}
      close(){
      this.conn.close()}
  }
    function MOR(T){
      let R={
    }
      ;
      return T.forEach((a,e)=>{
      R[e]=a}
  ),R}
    function DOR(T){
      let R=new Headers;
      for(let[a,e]of Object.entries(T))R.append(a,e);
    return R}
    function ZAT(T){
      var R,a,e;
      if((R=T===null||T===void 0?void 0:T.automaticFunctionCalling)===null||R===void 0?void 0:R.disable)return!0;
      let t=!1;
      for(let h of(a=T===null||T===void 0?void 0:T.tools)!==null&&a!==void 0?a:[])if(MP(h)){
        t=!0;
      break}
      if(!t)return!0;
      let r=(e=T===null||T===void 0?void 0:T.automaticFunctionCalling)===null||e===void 0?void 0:e.maximumRemoteCalls;
      if(r&&(r<0||!Number.isInteger(r))||r==0)return console.warn("Invalid maximumRemoteCalls value provided for automatic function calling. Disabled automatic function calling. Please provide a valid integer value greater than 0. maximumRemoteCalls provided:",r),!0;
    return!1}
    function MP(T){
    return"callTool"in T&&typeof T.callTool==="function"}
    function wOR(T){
      var R,a,e;
    return(e=(a=(R=T.config)===null||R===void 0?void 0:R.tools)===null||a===void 0?void 0:a.some((t)=>MP(t)))!==null&&e!==void 0?e:!1}
    function JAT(T){
      var R;
      let a=[];
      if(!((R=T===null||T===void 0?void 0:T.config)===null||R===void 0?void 0:R.tools))return a;
      return T.config.tools.forEach((e,t)=>{
        if(MP(e))return;
        let r=e;
      if(r.functionDeclarations&&r.functionDeclarations.length>0)a.push(t)}
  ),a}
    function TpT(T){
      var R;
    return!((R=T===null||T===void 0?void 0:T.automaticFunctionCalling)===null||R===void 0?void 0:R.ignoreCallHistory)}
    function BOR(T){
      let R={
    }
      ,a=H(T,["data"]);
      if(a!=null)Y(R,["data"],a);
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function NOR(T){
      let R={
    }
      ,a=H(T,["parts"]);
      if(a!=null){
        let t=a;
        if(Array.isArray(t))t=t.map((r)=>{
        return VOR(r)}
      );
      Y(R,["parts"],t)}
      let e=H(T,["role"]);
      if(e!=null)Y(R,["role"],e);
    return R}
    function UOR(T,R,a){
      let e={
    }
      ,t=H(R,["expireTime"]);
      if(a!==void 0&&t!=null)Y(a,["expireTime"],t);
      let r=H(R,["newSessionExpireTime"]);
      if(a!==void 0&&r!=null)Y(a,["newSessionExpireTime"],r);
      let h=H(R,["uses"]);
      if(a!==void 0&&h!=null)Y(a,["uses"],h);
      let i=H(R,["liveConnectConstraints"]);
      if(a!==void 0&&i!=null)Y(a,["bidiGenerateContentSetup"],KOR(T,i));
      let c=H(R,["lockAdditionalFields"]);
      if(a!==void 0&&c!=null)Y(a,["fieldMask"],c);
    return e}
    function HOR(T,R){
      let a={
    }
      ,e=H(R,["config"]);
      if(e!=null)Y(a,["config"],UOR(T,e,a));
    return a}
    function WOR(T){
      let R={
    }
      ;
      if(H(T,["displayName"])!==void 0)throw Error("displayName parameter is not supported in Gemini API.");
      let a=H(T,["fileUri"]);
      if(a!=null)Y(R,["fileUri"],a);
      let e=H(T,["mimeType"]);
      if(e!=null)Y(R,["mimeType"],e);
    return R}
    function qOR(T){
      let R={
    }
      ,a=H(T,["id"]);
      if(a!=null)Y(R,["id"],a);
      let e=H(T,["args"]);
      if(e!=null)Y(R,["args"],e);
      let t=H(T,["name"]);
      if(t!=null)Y(R,["name"],t);
      if(H(T,["partialArgs"])!==void 0)throw Error("partialArgs parameter is not supported in Gemini API.");
      if(H(T,["willContinue"])!==void 0)throw Error("willContinue parameter is not supported in Gemini API.");
    return R}
    function zOR(T){
      let R={
    }
      ;
      if(H(T,["authConfig"])!==void 0)throw Error("authConfig parameter is not supported in Gemini API.");
      let a=H(T,["enableWidget"]);
      if(a!=null)Y(R,["enableWidget"],a);
    return R}
    function FOR(T){
      let R={
    }
      ;
      if(H(T,["excludeDomains"])!==void 0)throw Error("excludeDomains parameter is not supported in Gemini API.");
      if(H(T,["blockingConfidence"])!==void 0)throw Error("blockingConfidence parameter is not supported in Gemini API.");
      let a=H(T,["timeRangeFilter"]);
      if(a!=null)Y(R,["timeRangeFilter"],a);
    return R}
    function GOR(T,R){
      let a={
    }
      ,e=H(T,["generationConfig"]);
      if(R!==void 0&&e!=null)Y(R,["setup","generationConfig"],e);
      let t=H(T,["responseModalities"]);
      if(R!==void 0&&t!=null)Y(R,["setup","generationConfig","responseModalities"],t);
      let r=H(T,["temperature"]);
      if(R!==void 0&&r!=null)Y(R,["setup","generationConfig","temperature"],r);
      let h=H(T,["topP"]);
      if(R!==void 0&&h!=null)Y(R,["setup","generationConfig","topP"],h);
      let i=H(T,["topK"]);
      if(R!==void 0&&i!=null)Y(R,["setup","generationConfig","topK"],i);
      let c=H(T,["maxOutputTokens"]);
      if(R!==void 0&&c!=null)Y(R,["setup","generationConfig","maxOutputTokens"],c);
      let s=H(T,["mediaResolution"]);
      if(R!==void 0&&s!=null)Y(R,["setup","generationConfig","mediaResolution"],s);
      let A=H(T,["seed"]);
      if(R!==void 0&&A!=null)Y(R,["setup","generationConfig","seed"],A);
      let l=H(T,["speechConfig"]);
      if(R!==void 0&&l!=null)Y(R,["setup","generationConfig","speechConfig"],q8T(l));
      let o=H(T,["thinkingConfig"]);
      if(R!==void 0&&o!=null)Y(R,["setup","generationConfig","thinkingConfig"],o);
      let n=H(T,["enableAffectiveDialog"]);
      if(R!==void 0&&n!=null)Y(R,["setup","generationConfig","enableAffectiveDialog"],n);
      let p=H(T,["systemInstruction"]);
      if(R!==void 0&&p!=null)Y(R,["setup","systemInstruction"],NOR(it(p)));
      let _=H(T,["tools"]);
      if(R!==void 0&&_!=null){
        let x=Dx(_);
        if(Array.isArray(x))x=x.map((f)=>{
        return YOR(Mx(f))}
      );
      Y(R,["setup","tools"],x)}
      let m=H(T,["sessionResumption"]);
      if(R!==void 0&&m!=null)Y(R,["setup","sessionResumption"],XOR(m));
      let b=H(T,["inputAudioTranscription"]);
      if(R!==void 0&&b!=null)Y(R,["setup","inputAudioTranscription"],b);
      let y=H(T,["outputAudioTranscription"]);
      if(R!==void 0&&y!=null)Y(R,["setup","outputAudioTranscription"],y);
      let u=H(T,["realtimeInputConfig"]);
      if(R!==void 0&&u!=null)Y(R,["setup","realtimeInputConfig"],u);
      let P=H(T,["contextWindowCompression"]);
      if(R!==void 0&&P!=null)Y(R,["setup","contextWindowCompression"],P);
      let k=H(T,["proactivity"]);
      if(R!==void 0&&k!=null)Y(R,["setup","proactivity"],k);
      if(H(T,["explicitVadSignal"])!==void 0)throw Error("explicitVadSignal parameter is not supported in Gemini API.");
    return a}
    function KOR(T,R){
      let a={
    }
      ,e=H(R,["model"]);
      if(e!=null)Y(a,["setup","model"],g8(T,e));
      let t=H(R,["config"]);
      if(t!=null)Y(a,["config"],GOR(t,a));
    return a}
    function VOR(T){
      let R={
    }
      ,a=H(T,["mediaResolution"]);
      if(a!=null)Y(R,["mediaResolution"],a);
      let e=H(T,["codeExecutionResult"]);
      if(e!=null)Y(R,["codeExecutionResult"],e);
      let t=H(T,["executableCode"]);
      if(t!=null)Y(R,["executableCode"],t);
      let r=H(T,["fileData"]);
      if(r!=null)Y(R,["fileData"],WOR(r));
      let h=H(T,["functionCall"]);
      if(h!=null)Y(R,["functionCall"],qOR(h));
      let i=H(T,["functionResponse"]);
      if(i!=null)Y(R,["functionResponse"],i);
      let c=H(T,["inlineData"]);
      if(c!=null)Y(R,["inlineData"],BOR(c));
      let s=H(T,["text"]);
      if(s!=null)Y(R,["text"],s);
      let A=H(T,["thought"]);
      if(A!=null)Y(R,["thought"],A);
      let l=H(T,["thoughtSignature"]);
      if(l!=null)Y(R,["thoughtSignature"],l);
      let o=H(T,["videoMetadata"]);
      if(o!=null)Y(R,["videoMetadata"],o);
    return R}
    function XOR(T){
      let R={
    }
      ,a=H(T,["handle"]);
      if(a!=null)Y(R,["handle"],a);
      if(H(T,["transparent"])!==void 0)throw Error("transparent parameter is not supported in Gemini API.");
    return R}
    function YOR(T){
      let R={
    }
      ;
      if(H(T,["retrieval"])!==void 0)throw Error("retrieval parameter is not supported in Gemini API.");
      let a=H(T,["computerUse"]);
      if(a!=null)Y(R,["computerUse"],a);
      let e=H(T,["fileSearch"]);
      if(e!=null)Y(R,["fileSearch"],e);
      let t=H(T,["codeExecution"]);
      if(t!=null)Y(R,["codeExecution"],t);
      if(H(T,["enterpriseWebSearch"])!==void 0)throw Error("enterpriseWebSearch parameter is not supported in Gemini API.");
      let r=H(T,["functionDeclarations"]);
      if(r!=null){
        let A=r;
        if(Array.isArray(A))A=A.map((l)=>{
        return l}
      );
      Y(R,["functionDeclarations"],A)}
      let h=H(T,["googleMaps"]);
      if(h!=null)Y(R,["googleMaps"],zOR(h));
      let i=H(T,["googleSearch"]);
      if(i!=null)Y(R,["googleSearch"],FOR(i));
      let c=H(T,["googleSearchRetrieval"]);
      if(c!=null)Y(R,["googleSearchRetrieval"],c);
      let s=H(T,["urlContext"]);
      if(s!=null)Y(R,["urlContext"],s);
    return R}
    function QOR(T){
      let R=[];
      for(let a in T)if(Object.prototype.hasOwnProperty.call(T,a)){
        let e=T[a];
        if(typeof e==="object"&&e!=null&&Object.keys(e).length>0){
          let t=Object.keys(e).map((r)=>`${a}.${r}`);
        R.push(...t)}
      else R.push(a)}
    return R.join(",")}
    function ZOR(T,R){
      let a=null,e=T.bidiGenerateContentSetup;
      if(typeof e==="object"&&e!==null&&"setup"in e){
        let r=e.setup;
        if(typeof r==="object"&&r!==null)T.bidiGenerateContentSetup=r,a=r;
      else delete T.bidiGenerateContentSetup}
      else if(e!==void 0)delete T.bidiGenerateContentSetup;
      let t=T.fieldMask;
      if(a){
        let r=QOR(a);
        if(Array.isArray(R===null||R===void 0?void 0:R.lockAdditionalFields)&&(R===null||R===void 0?void 0:R.lockAdditionalFields.length)===0)if(r)T.fieldMask=r;
        else delete T.fieldMask;
        else if((R===null||R===void 0?void 0:R.lockAdditionalFields)&&R.lockAdditionalFields.length>0&&t!==null&&Array.isArray(t)&&t.length>0){
          let h=["temperature","topK","topP","maxOutputTokens","responseModalities","seed","speechConfig"],i=[];
          if(t.length>0)i=t.map((s)=>{
            if(h.includes(s))return`generationConfig.${s}`;
          return s}
        );
          let c=[];
          if(r)c.push(r);
          if(i.length>0)c.push(...i);
          if(c.length>0)T.fieldMask=c.join(",");
        else delete T.fieldMask}
      else delete T.fieldMask}
      else if(t!==null&&Array.isArray(t)&&t.length>0)T.fieldMask=t.join(",");
      else delete T.fieldMask;
    return T}
    function JOR(T,R){
      let a={
    }
      ,e=H(T,["force"]);
      if(R!==void 0&&e!=null)Y(R,["_query","force"],e);
    return a}
    function TdR(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["_url","name"],a);
      let e=H(T,["config"]);
      if(e!=null)JOR(e,R);
    return R}
    function RdR(T){
      let R={
    }
      ,a=H(T,["name"]);
      if(a!=null)Y(R,["_url","name"],a);
    return R}
    function adR(T,R){
      let a={
    }
      ,e=H(T,["pageSize"]);
      if(R!==void 0&&e!=null)Y(R,["_query","pageSize"],e);
      let t=H(T,["pageToken"]);
      if(R!==void 0&&t!=null)Y(R,["_query","pageToken"],t);
    return a}
    function edR(T){
      let R={
    }
      ,a=H(T,["parent"]);
      if(a!=null)Y(R,["_url","parent"],a);
      let e=H(T,["config"]);
      if(e!=null)adR(e,R);
    return R}
    function tdR(T){
      let R={
    }
      ,a=H(T,["sdkHttpResponse"]);
      if(a!=null)Y(R,["sdkHttpResponse"],a);
      let e=H(T,["nextPageToken"]);
      if(e!=null)Y(R,["nextPageToken"],e);
      let t=H(T,["documents"]);
      if(t!=null){
        let r=t;
        if(Array.isArray(r))r=r.map((h)=>{
        return h}
      );
      Y(R,["documents"],r)}
    return R}
    function MK(T){
    return typeof T==="object"&&T!==null&&(("name"in T)&&T.name==="AbortError"||("message"in T)&&String(T.message).includes("FetchRequestCanceledException"))}
    function rdR(T){
      if(!T)return!0;
      for(let R in T)return!1;
    return!0}
    function hdR(T,R){
    return Object.prototype.hasOwnProperty.call(T,R)}
    function idR(){
      if(typeof Deno<"u"&&Deno.build!=null)return"deno";
      if(typeof EdgeRuntime<"u")return"edge";
      if(Object.prototype.toString.call(typeof globalThis.process<"u"?globalThis.process:0)==="[object process]")return"node";
    return"unknown"}
    function cdR(){
      if(typeof navigator>"u"||!navigator)return null;
      let T=[{
      key:"edge",pattern:/Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/}
      ,{
      key:"ie",pattern:/MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/}
      ,{
      key:"ie",pattern:/Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/}
      ,{
      key:"chrome",pattern:/Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/}
      ,{
      key:"firefox",pattern:/Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/}
      ,{
      key:"safari",pattern:/(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/}
      ];
      for(let{
      key:R,pattern:a}
      of T){
        let e=a.exec(navigator.userAgent);
        if(e){
          let t=e[1]||0,r=e[2]||0,h=e[3]||0;
          return{
          browser:R,version:`${t}.${r}.${h}`}
      }
    }
    return null}
    function sdR(){
      if(typeof fetch<"u")return fetch;
    throw Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new GeminiNextGenAPIClient({ fetch })` or polyfill the global, `globalThis.fetch = fetch`")}
    function x6T(...T){
      let R=globalThis.ReadableStream;
      if(typeof R>"u")throw Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
    return new R(...T)}
    function odR(T){
      let R=Symbol.asyncIterator in T?T[Symbol.asyncIterator]():T[Symbol.iterator]();
      return x6T({
        start(){
      }
        ,async pull(a){
          let{
          done:e,value:t}
          =await R.next();
          if(e)a.close();
        else a.enqueue(t)}
        ,async cancel(){
          var a;
        await((a=R.return)===null||a===void 0?void 0:a.call(R))}
    }
  )}
    function f6T(T){
      if(T[Symbol.asyncIterator])return T;
      let R=T.getReader();
      return{
        async next(){
          try{
            let a=await R.read();
            if(a===null||a===void 0?void 0:a.done)R.releaseLock();
          return a}
          catch(a){
          throw R.releaseLock(),a}
      }
        ,async return(){
          let a=R.cancel();
          return R.releaseLock(),await a,{
          done:!0,value:void 0}
      }
        ,[Symbol.asyncIterator](){
        return this}
    }
  }
    async function ndR(T){
      var R,a;
      if(T===null||typeof T!=="object")return;
      if(T[Symbol.asyncIterator]){
        await((a=(R=T[Symbol.asyncIterator]()).return)===null||a===void 0?void 0:a.call(R));
      return}
      let e=T.getReader(),t=e.cancel();
    e.releaseLock(),await t}
    function p5(T,R,a){
    return G6T(),new File(T,R!==null&&R!==void 0?R:"unknown_file",a)}
    function ldR(T){
    return(typeof T==="object"&&T!==null&&(("name"in T)&&T.name&&String(T.name)||("url"in T)&&T.url&&String(T.url)||("filename"in T)&&T.filename&&String(T.filename)||("path"in T)&&T.path&&String(T.path))||"").split(/[\\/]/).pop()||void 0}
    async function AdR(T,R,a){
      if(G6T(),T=await T,mER(T)){
        if(T instanceof File)return T;
      return p5([await T.arrayBuffer()],T.name)}
      if(uER(T)){
        let t=await T.blob();
      return R||(R=new URL(T.url).pathname.split(/[\\/]/).pop()),p5(await DK(t),R,a)}
      let e=await DK(T);
      if(R||(R=ldR(T)),!(a===null||a===void 0?void 0:a.type)){
        let t=e.find((r)=>typeof r==="object"&&("type"in r)&&r.type);
        if(typeof t==="string")a=Object.assign(Object.assign({
      }
        ,a),{
        type:t}
    )}
    return p5(e,R,a)}
    async function DK(T){
      var R,a,e,t,r;
      let h=[];
      if(typeof T==="string"||ArrayBuffer.isView(T)||T instanceof ArrayBuffer)h.push(T);
      else if(K6T(T))h.push(T instanceof Blob?T:await T.arrayBuffer());
      else if(bER(T))try{
        for(var i=!0,c=ec(T),s;
        s=await c.next(),R=s.done,!R;
        i=!0){
          t=s.value,i=!1;
          let A=t;
        h.push(...await DK(A))}
    }
      catch(A){
        a={
        error:A}
    }
      finally{
        try{
        if(!i&&!R&&(e=c.return))await e.call(c)}
        finally{
        if(a)throw a.error}
    }
      else{
        let A=(r=T===null||T===void 0?void 0:T.constructor)===null||r===void 0?void 0:r.name;
        throw Error(`Unexpected data type: ${typeof T}${A?`;
        constructor: ${
        A}
      `:""}${pdR(T)}`)}
    return h}
    function pdR(T){
      if(typeof T!=="object"||T===null)return"";
    return`;
 props: [${Object.getOwnPropertyNames(T).map((R)=>`"${R}"`).join(", ")}]`}
    class wK{
      constructor(T){
      this._client=T}
  }
    function I6T(T){
      return T.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g,encodeURIComponent)}
function _dR(T){
let R=0;
for(let t of T)R+=t.length;
let a=new Uint8Array(R),e=0;
for(let t of T)a.set(t,e),e+=t.length;
return a}
function G8T(T){
let R;
return(yC!==null&&yC!==void 0?yC:(R=new globalThis.TextEncoder,yC=R.encode.bind(R)))(T)}
function RpT(T){
let R;
return(PC!==null&&PC!==void 0?PC:(R=new globalThis.TextDecoder,PC=R.decode.bind(R)))(T)}
class G${
constructor(){
this.buffer=new Uint8Array,this.carriageReturnIndex=null}
decode(T){
if(T==null)return[];
let R=T instanceof ArrayBuffer?new Uint8Array(T):typeof T==="string"?G8T(T):T;
this.buffer=_dR([this.buffer,R]);
let a=[],e;
while((e=bdR(this.buffer,this.carriageReturnIndex))!=null){
if(e.carriage&&this.carriageReturnIndex==null){
this.carriageReturnIndex=e.index;
continue}
if(this.carriageReturnIndex!=null&&(e.index!==this.carriageReturnIndex+1||e.carriage)){
a.push(RpT(this.buffer.subarray(0,this.carriageReturnIndex-1))),this.buffer=this.buffer.subarray(this.carriageReturnIndex),this.carriageReturnIndex=null;
continue}
let t=this.carriageReturnIndex!==null?e.preceding-1:e.preceding,r=RpT(this.buffer.subarray(0,t));
a.push(r),this.buffer=this.buffer.subarray(e.index),this.carriageReturnIndex=null}
return a}
flush(){
if(!this.buffer.length)return[];
return this.decode(`
`)}
}
function bdR(T,R){
for(let a=R!==null&&R!==void 0?R:0;a<T.length;a++){
if(T[a]===10)return{
preceding:a,index:a+1,carriage:!1};
if(T[a]===13)return{
preceding:a,index:a+1,carriage:!0}
}
return null}
function mdR(T){
for(let R=0;R<T.length-1;R++){
if(T[R]===10&&T[R+1]===10)return R+2;
if(T[R]===13&&T[R+1]===13)return R+2;
if(T[R]===13&&T[R+1]===10&&R+3<T.length&&T[R+2]===13&&T[R+3]===10)return R+4}
return-1}
function T$(){
}
function mC(T,R,a){
if(!R||Kj[T]>Kj[a])return T$;
else return R[T].bind(R)}
function gt(T){
var R;
let a=T.logger,e=(R=T.logLevel)!==null&&R!==void 0?R:"off";
if(!a)return V6T;
let t=KK.get(a);
if(t&&t[0]===e)return t[1];
let r={
error:mC("error",a,e),warn:mC("warn",a,e),info:mC("info",a,e),debug:mC("debug",a,e)};
return KK.set(a,[e,r]),r}
function udR(T,R){
return ac(this,arguments,function*(){
var a,e,t,r;
if(!T.body){
if(R.abort(),typeof globalThis.navigator<"u"&&globalThis.navigator.product==="ReactNative")throw new Ah("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
throw new Ah("Attempted to iterate over a response with no body")}
let h=new g6T,i=new G$,c=f6T(T.body);
try{
for(var s=!0,A=ec(ydR(c)),l;l=yield S9(A.next()),a=l.done,!a;s=!0){
r=l.value,s=!1;
let o=r;
for(let n of i.decode(o)){
let p=h.decode(n);
if(p)yield yield S9(p)}
}
}
catch(o){
e={
error:o}
}
finally{
try{
if(!s&&!a&&(t=A.return))yield S9(t.call(A))}
finally{
if(e)throw e.error}
}
for(let o of i.flush()){
let n=h.decode(o);
if(n)yield yield S9(n)}
})}
function ydR(T){
return ac(this,arguments,function*(){
var R,a,e,t;
let r=new Uint8Array;
try{
for(var h=!0,i=ec(T),c;c=yield S9(i.next()),R=c.done,!R;h=!0){
t=c.value,h=!1;
let s=t;
if(s==null)continue;
let A=s instanceof ArrayBuffer?new Uint8Array(s):typeof s==="string"?G8T(s):s,l=new Uint8Array(r.length+A.length);
l.set(r),l.set(A,r.length),r=l;
let o;
while((o=mdR(r))!==-1)yield yield S9(r.slice(0,o)),r=r.slice(o)}
}
catch(s){
a={
error:s}
}
finally{
try{
if(!h&&!R&&(e=i.return))yield S9(e.call(i))}
finally{
if(a)throw a.error}
}
if(r.length>0)yield yield S9(r)})}
class g6T{
constructor(){
this.event=null,this.data=[],this.chunks=[]}
decode(T){
if(T.endsWith("\r"))T=T.substring(0,T.length-1);
if(!T){
if(!this.event&&!this.data.length)return null;
let t={
event:this.event,data:this.data.join(`
`),raw:this.chunks};
return this.event=null,this.data=[],this.chunks=[],t}
if(this.chunks.push(T),T.startsWith(":"))return null;
let[R,a,e]=PdR(T,":");
if(e.startsWith(" "))e=e.substring(1);
if(R==="event")this.event=e;
else if(R==="data")this.data.push(e);
return null}
}
function PdR(T,R){
let a=T.indexOf(R);
if(a!==-1)return[T.substring(0,a),R,T.substring(a+R.length)];
return[T,"",""]}
async function kdR(T,R){
let{
response:a,requestLogID:e,retryOfRequestLogID:t,startTime:r}
=R,h=await(async()=>{
var i;
if(R.options.stream){
if(gt(T).debug("response",a.status,a.url,a.headers,a.body),R.options.__streamClass)return R.options.__streamClass.fromSSEResponse(a,R.controller,T);
return X6T.fromSSEResponse(a,R.controller,T)}
if(a.status===204)return null;
if(R.options.__binaryResponse)return a;
let c=a.headers.get("content-type"),s=(i=c===null||c===void 0?void 0:c.split(";")[0])===null||i===void 0?void 0:i.trim();
if((s===null||s===void 0?void 0:s.includes("application/json"))||(s===null||s===void 0?void 0:s.endsWith("+json"))){
if(a.headers.get("content-length")==="0")return;
return await a.json()}
return await a.text()})();
return gt(T).debug(`[${e}] response parsed`,v_({
retryOfRequestLogID:t,url:a.url,status:a.status,body:h,durationMs:Date.now()-r})),h}
function*xdR(T){
if(!T)return;
if(K8T in T){
let{
values:e,nulls:t}
=T;
yield*e.entries();
for(let r of t)yield[r,null];
return}
let R=!1,a;
if(T instanceof Headers)a=T.entries();
else if(FK(T))a=T;
else R=!0,a=Object.entries(T!==null&&T!==void 0?T:{
});
for(let e of a){
let t=e[0];
if(typeof t!=="string")throw TypeError("expected header name to be a string");
let r=FK(e[1])?e[1]:[e[1]],h=!1;
for(let i of r){
if(i===void 0)continue;
if(R&&!h)h=!0,yield[t,null];
yield[t,i]}
}
}
class b7{
constructor(T){
var R,a,e,t,r,h,i,{
baseURL:c=v5("GEMINI_NEXT_GEN_API_BASE_URL"),apiKey:s=(R=v5("GEMINI_API_KEY"))!==null&&R!==void 0?R:null,apiVersion:A="v1beta"}
=T,l=_7(T,["baseURL","apiKey","apiVersion"]);
let o=Object.assign(Object.assign({
apiKey:s,apiVersion:A},l),{
baseURL:c||"https://generativelanguage.googleapis.com"});
this.baseURL=o.baseURL,this.timeout=(a=o.timeout)!==null&&a!==void 0?a:b7.DEFAULT_TIMEOUT,this.logger=(e=o.logger)!==null&&e!==void 0?e:console;
let n="warn";
this.logLevel=n,this.logLevel=(r=(t=t_T(o.logLevel,"ClientOptions.logLevel",this))!==null&&t!==void 0?t:t_T(v5("GEMINI_NEXT_GEN_API_LOG"),"process.env['GEMINI_NEXT_GEN_API_LOG']",this))!==null&&r!==void 0?r:n,this.fetchOptions=o.fetchOptions,this.maxRetries=(h=o.maxRetries)!==null&&h!==void 0?h:2,this.fetch=(i=o.fetch)!==null&&i!==void 0?i:sdR(),this.encoder=_ER,this._options=o,this.apiKey=s,this.apiVersion=A,this.clientAdapter=o.clientAdapter}
withOptions(T){
return new this.constructor(Object.assign(Object.assign(Object.assign({
},this._options),{
baseURL:this.baseURL,maxRetries:this.maxRetries,timeout:this.timeout,logger:this.logger,logLevel:this.logLevel,fetch:this.fetch,fetchOptions:this.fetchOptions,apiKey:this.apiKey,apiVersion:this.apiVersion}),T))}
baseURLOverridden(){
return this.baseURL!=="https://generativelanguage.googleapis.com"}
defaultQuery(){
return this._options.defaultQuery}
validateHeaders({
values:T,nulls:R}){
if(T.has("authorization")||T.has("x-goog-api-key"))return;
if(this.apiKey&&T.get("x-goog-api-key"))return;
if(R.has("x-goog-api-key"))return;
throw Error('Could not resolve authentication method. Expected the apiKey to be set. Or for the "x-goog-api-key" headers to be explicitly omitted')}
async authHeaders(T){
let R=xI([T.headers]);
if(R.values.has("authorization")||R.values.has("x-goog-api-key"))return;
if(this.apiKey)return xI([{
"x-goog-api-key":this.apiKey}
]);
if(this.clientAdapter.isVertexAI())return xI([await this.clientAdapter.getAuthHeaders()]);
return}
stringifyQuery(T){
return Object.entries(T).filter(([R,a])=>typeof a<"u").map(([R,a])=>{
if(typeof a==="string"||typeof a==="number"||typeof a==="boolean")return`${encodeURIComponent(R)}=${encodeURIComponent(a)}`;
if(a===null)return`${encodeURIComponent(R)}=`;
throw new Ah(`Cannot stringify type ${typeof a}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`)}).join("&")}
getUserAgent(){
return`${this.constructor.name}/JS ${vy}`}
defaultIdempotencyKey(){
return`stainless-node-retry-${cER()}`}
makeStatusError(T,R,a,e){
return th.generate(T,R,a,e)}
buildURL(T,R,a){
let e=!this.baseURLOverridden()&&a||this.baseURL,t=sER(T)?new URL(T):new URL(e+(e.endsWith("/")&&T.startsWith("/")?T.slice(1):T)),r=this.defaultQuery();
if(!rdR(r))R=Object.assign(Object.assign({
},r),R);
if(typeof R==="object"&&R&&!Array.isArray(R))t.search=this.stringifyQuery(R);
return t.toString()}
async prepareOptions(T){
if(this.clientAdapter&&this.clientAdapter.isVertexAI()&&!T.path.startsWith(`/${this.apiVersion}/projects/`)){
let R=T.path.slice(this.apiVersion.length+1);
T.path=`/${this.apiVersion}/projects/${this.clientAdapter.getProject()}/locations/${this.clientAdapter.getLocation()}${R}`}
}
async prepareRequest(T,{
url:R,options:a}){
}
get(T,R){
return this.methodRequest("get",T,R)}
post(T,R){
return this.methodRequest("post",T,R)}
patch(T,R){
return this.methodRequest("patch",T,R)}
put(T,R){
return this.methodRequest("put",T,R)}
delete(T,R){
return this.methodRequest("delete",T,R)}
methodRequest(T,R,a){
return this.request(Promise.resolve(a).then((e)=>{
return Object.assign({
method:T,path:R},e)}))}
request(T,R=null){
return new Y6T(this,this.makeRequest(T,R,void 0))}
async makeRequest(T,R,a){
var e,t,r;
let h=await T,i=(e=h.maxRetries)!==null&&e!==void 0?e:this.maxRetries;
if(R==null)R=i;
await this.prepareOptions(h);
let{
req:c,url:s,timeout:A}
=await this.buildRequest(h,{
retryCount:i-R});
await this.prepareRequest(c,{
url:s,options:h});
let l="log_"+(Math.random()*16777216|0).toString(16).padStart(6,"0"),o=a===void 0?"":`, retryOf: ${a}`,n=Date.now();
if(gt(this).debug(`[${l}] sending request`,v_({
retryOfRequestLogID:a,method:h.method,url:s,options:h,headers:c.headers})),(t=h.signal)===null||t===void 0?void 0:t.aborted)throw new y7;
let p=new AbortController,_=await this.fetchWithTimeout(s,c,A,p).catch(WK),m=Date.now();
if(_ instanceof globalThis.Error){
let y=`retrying, ${R} attempts remaining`;
if((r=h.signal)===null||r===void 0?void 0:r.aborted)throw new y7;
let u=MK(_)||/timed? ?out/i.test(String(_)+("cause"in _?String(_.cause):""));
if(R)return gt(this).info(`[${l}] connection ${u?"timed out":"failed"} - ${y}`),gt(this).debug(`[${l}] connection ${u?"timed out":"failed"} (${y})`,v_({
retryOfRequestLogID:a,url:s,durationMs:m-n,message:_.message})),this.retryRequest(h,R,a!==null&&a!==void 0?a:l);
if(gt(this).info(`[${l}] connection ${u?"timed out":"failed"} - error; no more retries left`),gt(this).debug(`[${l}] connection ${u?"timed out":"failed"} (error; no more retries left)`,v_({
retryOfRequestLogID:a,url:s,durationMs:m-n,message:_.message})),u)throw new qK;
throw new R$({
cause:_})}
let b=`[${l}${o}] ${c.method} ${s} ${_.ok?"succeeded":"failed"} with status ${_.status} in ${m-n}ms`;
if(!_.ok){
let y=await this.shouldRetry(_);
if(R&&y){
let f=`retrying, ${R} attempts remaining`;
return await ndR(_.body),gt(this).info(`${b} - ${f}`),gt(this).debug(`[${l}] response error (${f})`,v_({
retryOfRequestLogID:a,url:_.url,status:_.status,headers:_.headers,durationMs:m-n})),this.retryRequest(h,R,a!==null&&a!==void 0?a:l,_.headers)}
let u=y?"error; no more retries left":"error; not retryable";
gt(this).info(`${b} - ${u}`);
let P=await _.text().catch((f)=>WK(f).message),k=nER(P),x=k?void 0:P;
throw gt(this).debug(`[${l}] response error (${u})`,v_({
retryOfRequestLogID:a,url:_.url,status:_.status,headers:_.headers,message:x,durationMs:Date.now()-n})),this.makeStatusError(_.status,k,x,_.headers)}
return gt(this).info(b),gt(this).debug(`[${l}] response start`,v_({
retryOfRequestLogID:a,url:_.url,status:_.status,headers:_.headers,durationMs:m-n})),{
response:_,options:h,controller:p,requestLogID:l,retryOfRequestLogID:a,startTime:n}
}
async fetchWithTimeout(T,R,a,e){
let t=R||{
},{
signal:r,method:h}
=t,i=_7(t,["signal","method"]),c=e.abort.bind(e);
if(r)r.addEventListener("abort",c,{
once:!0});
let s=setTimeout(c,a),A=globalThis.ReadableStream&&i.body instanceof globalThis.ReadableStream||typeof i.body==="object"&&i.body!==null&&Symbol.asyncIterator in i.body,l=Object.assign(Object.assign(Object.assign({
signal:e.signal},A?{
duplex:"half"}
:{
}),{
method:"GET"}),i);
if(h)l.method=h.toUpperCase();
try{
return await this.fetch.call(void 0,T,l)}
finally{
clearTimeout(s)}
}
async shouldRetry(T){
let R=T.headers.get("x-should-retry");
if(R==="true")return!0;
if(R==="false")return!1;
if(T.status===408)return!0;
if(T.status===409)return!0;
if(T.status===429)return!0;
if(T.status>=500)return!0;
return!1}
async retryRequest(T,R,a,e){
var t;
let r,h=e===null||e===void 0?void 0:e.get("retry-after-ms");
if(h){
let c=parseFloat(h);
if(!Number.isNaN(c))r=c}
let i=e===null||e===void 0?void 0:e.get("retry-after");
if(i&&!r){
let c=parseFloat(i);
if(!Number.isNaN(c))r=c*1000;
else r=Date.parse(i)-Date.now()}
if(!(r&&0<=r&&r<60000)){
let c=(t=T.maxRetries)!==null&&t!==void 0?t:this.maxRetries;
r=this.calculateDefaultRetryTimeoutMillis(R,c)}
return await lER(r),this.makeRequest(T,R-1,a)}
calculateDefaultRetryTimeoutMillis(T,R){
let a=R-T,e=Math.min(0.5*Math.pow(2,a),8),t=1-Math.random()*0.25;
return e*t*1000}
async buildRequest(T,{
retryCount:R=0}
={
}){
var a,e,t;
let r=Object.assign({
},T),{
method:h,path:i,query:c,defaultBaseURL:s}
=r,A=this.buildURL(i,c,s);
if("timeout"in r)oER("timeout",r.timeout);
r.timeout=(a=r.timeout)!==null&&a!==void 0?a:this.timeout;
let{
bodyHeaders:l,body:o}
=this.buildBody({
options:r}),n=await this.buildHeaders({
options:T,method:h,bodyHeaders:l,retryCount:R});
return{
req:Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({
method:h,headers:n},r.signal&&{
signal:r.signal}),globalThis.ReadableStream&&o instanceof globalThis.ReadableStream&&{
duplex:"half"}),o&&{
body:o}),(e=this.fetchOptions)!==null&&e!==void 0?e:{
}),(t=r.fetchOptions)!==null&&t!==void 0?t:{
}),url:A,timeout:r.timeout}
}
async buildHeaders({
options:T,method:R,bodyHeaders:a,retryCount:e}){
let t={
};
if(this.idempotencyHeader&&R!=="get"){
if(!T.idempotencyKey)T.idempotencyKey=this.defaultIdempotencyKey();
t[this.idempotencyHeader]=T.idempotencyKey}
let r=await this.authHeaders(T),h=xI([t,Object.assign(Object.assign({
Accept:"application/json","User-Agent":this.getUserAgent(),"X-Stainless-Retry-Count":String(e)},T.timeout?{
"X-Stainless-Timeout":String(Math.trunc(T.timeout/1000))}
:{
}),pER()),this._options.defaultHeaders,a,T.headers,r]);
return this.validateHeaders(h),h.values}
buildBody({
options:{
body:T,headers:R}
}){
if(!T)return{
bodyHeaders:void 0,body:void 0};
let a=xI([R]);
if(ArrayBuffer.isView(T)||T instanceof ArrayBuffer||T instanceof DataView||typeof T==="string"&&a.values.has("content-type")||globalThis.Blob&&T instanceof globalThis.Blob||T instanceof FormData||T instanceof URLSearchParams||globalThis.ReadableStream&&T instanceof globalThis.ReadableStream)return{
bodyHeaders:void 0,body:T};
else if(typeof T==="object"&&((Symbol.asyncIterator in T)||(Symbol.iterator in T)&&("next"in T)&&typeof T.next==="function"))return{
bodyHeaders:void 0,body:odR(T)};
else return this.encoder({
body:T,headers:a})}
}
class $6T{
constructor(T){
if(T.apiKey!==void 0){
this.apiKey=T.apiKey;
return}
let R=fdR(T.googleAuthOptions);
this.googleAuth=new M6T.GoogleAuth(R)}
async addAuthHeaders(T,R){
if(this.apiKey!==void 0){
if(this.apiKey.startsWith("auth_tokens/"))throw Error("Ephemeral tokens are only supported by the live API.");
this.addKeyHeader(T);
return}
return this.addGoogleAuthHeaders(T,R)}
addKeyHeader(T){
if(T.get(h_T)!==null)return;
if(this.apiKey===void 0)throw Error("Trying to set API key header but apiKey is not set");
T.append(h_T,this.apiKey)}
async addGoogleAuthHeaders(T,R){
if(this.googleAuth===void 0)throw Error("Trying to set google-auth headers but googleAuth is unset");
let a=await this.googleAuth.getRequestHeaders(R);
for(let[e,t]of a){
if(T.get(e)!==null)continue;
T.append(e,t)}
}
}
function fdR(T){
let R;
if(!T)return R={
scopes:[fI]},R;
else{
if(R=T,!R.scopes)return R.scopes=[fI],R;
else if(typeof R.scopes==="string"&&R.scopes!==fI||Array.isArray(R.scopes)&&R.scopes.indexOf(fI)<0)throw Error(`Invalid auth scopes. Scopes must include: ${fI}`);
return R}
}
class v6T{
async download(T,R){
if(T.downloadPath){
let a=await IdR(T,R);
if(a instanceof fk){
let e=VgR(T.downloadPath);
YgR.fromWeb(a.responseInternal.body).pipe(e),await QgR(e)}
else try{
await XgR(T.downloadPath,a,{
encoding:"base64"})}
catch(e){
throw Error(`Failed to write file to ${T.downloadPath}: ${e}`)}
}
}
}
async function IdR(T,R){
var a,e,t;
let r=z8T(T.file);
if(r!==void 0)return await R.request({
path:`files/${r}:download`,httpMethod:"GET",queryParams:{
alt:"media"},httpOptions:(a=T.config)===null||a===void 0?void 0:a.httpOptions,abortSignal:(e=T.config)===null||e===void 0?void 0:e.abortSignal});
else if(QBT(T.file)){
let h=(t=T.file.video)===null||t===void 0?void 0:t.videoBytes;
if(typeof h==="string")return h;
else throw Error("Failed to download generated video, Uri or videoBytes not found.")}
else if(ZBT(T.file)){
let h=T.file.videoBytes;
if(typeof h==="string")return h;
else throw Error("Failed to download video, Uri or videoBytes not found.")}
else throw Error("Unsupported file type")}
class j6T{
create(T,R,a){
return new S6T(T,R,a)}
}
class S6T{
constructor(T,R,a){
this.url=T,this.headers=R,this.callbacks=a}
connect(){
this.ws=new dD.default(this.url,{
headers:this.headers}),this.ws.onopen=this.callbacks.onopen,this.ws.onerror=this.callbacks.onerror,this.ws.onclose=this.callbacks.onclose,this.ws.onmessage=this.callbacks.onmessage}
send(T){
if(this.ws===void 0)throw Error("WebSocket is not connected");
this.ws.send(T)}
close(){
if(this.ws===void 0)throw Error("WebSocket is not connected");
this.ws.close()}
}
function gdR(T,R){
let a={
},e=H(T,["name"]);
if(e!=null)Y(a,["_url","name"],e);
return a}
function $dR(T,R){
let a={
},e=H(T,["name"]);
if(e!=null)Y(a,["_url","name"],e);
return a}
function vdR(T,R){
let a={
},e=H(T,["sdkHttpResponse"]);
if(e!=null)Y(a,["sdkHttpResponse"],e);
return a}
function jdR(T,R){
let a={
},e=H(T,["sdkHttpResponse"]);
if(e!=null)Y(a,["sdkHttpResponse"],e);
return a}
function SdR(T,R,a){
let e={
};
if(H(T,["validationDataset"])!==void 0)throw Error("validationDataset parameter is not supported in Gemini API.");
let t=H(T,["tunedModelDisplayName"]);
if(R!==void 0&&t!=null)Y(R,["displayName"],t);
if(H(T,["description"])!==void 0)throw Error("description parameter is not supported in Gemini API.");
let r=H(T,["epochCount"]);
if(R!==void 0&&r!=null)Y(R,["tuningTask","hyperparameters","epochCount"],r);
let h=H(T,["learningRateMultiplier"]);
if(h!=null)Y(e,["tuningTask","hyperparameters","learningRateMultiplier"],h);
if(H(T,["exportLastCheckpointOnly"])!==void 0)throw Error("exportLastCheckpointOnly parameter is not supported in Gemini API.");
if(H(T,["preTunedModelCheckpointId"])!==void 0)throw Error("preTunedModelCheckpointId parameter is not supported in Gemini API.");
if(H(T,["adapterSize"])!==void 0)throw Error("adapterSize parameter is not supported in Gemini API.");
if(H(T,["tuningMode"])!==void 0)throw Error("tuningMode parameter is not supported in Gemini API.");
if(H(T,["customBaseModel"])!==void 0)throw Error("customBaseModel parameter is not supported in Gemini API.");
let i=H(T,["batchSize"]);
if(R!==void 0&&i!=null)Y(R,["tuningTask","hyperparameters","batchSize"],i);
let c=H(T,["learningRate"]);
if(R!==void 0&&c!=null)Y(R,["tuningTask","hyperparameters","learningRate"],c);
if(H(T,["labels"])!==void 0)throw Error("labels parameter is not supported in Gemini API.");
if(H(T,["beta"])!==void 0)throw Error("beta parameter is not supported in Gemini API.");
if(H(T,["baseTeacherModel"])!==void 0)throw Error("baseTeacherModel parameter is not supported in Gemini API.");
if(H(T,["tunedTeacherModelSource"])!==void 0)throw Error("tunedTeacherModelSource parameter is not supported in Gemini API.");
if(H(T,["sftLossWeightMultiplier"])!==void 0)throw Error("sftLossWeightMultiplier parameter is not supported in Gemini API.");
if(H(T,["outputUri"])!==void 0)throw Error("outputUri parameter is not supported in Gemini API.");
return e}
function OdR(T,R,a){
let e={
},t=H(a,["config","method"]);
if(t===void 0)t="SUPERVISED_FINE_TUNING";
if(t==="SUPERVISED_FINE_TUNING"){
let k=H(T,["validationDataset"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec"],_5(k))}
else if(t==="PREFERENCE_TUNING"){
let k=H(T,["validationDataset"]);
if(R!==void 0&&k!=null)Y(R,["preferenceOptimizationSpec"],_5(k))}
else if(t==="DISTILLATION"){
let k=H(T,["validationDataset"]);
if(R!==void 0&&k!=null)Y(R,["distillationSpec"],_5(k))}
let r=H(T,["tunedModelDisplayName"]);
if(R!==void 0&&r!=null)Y(R,["tunedModelDisplayName"],r);
let h=H(T,["description"]);
if(R!==void 0&&h!=null)Y(R,["description"],h);
let i=H(a,["config","method"]);
if(i===void 0)i="SUPERVISED_FINE_TUNING";
if(i==="SUPERVISED_FINE_TUNING"){
let k=H(T,["epochCount"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec","hyperParameters","epochCount"],k)}
else if(i==="PREFERENCE_TUNING"){
let k=H(T,["epochCount"]);
if(R!==void 0&&k!=null)Y(R,["preferenceOptimizationSpec","hyperParameters","epochCount"],k)}
else if(i==="DISTILLATION"){
let k=H(T,["epochCount"]);
if(R!==void 0&&k!=null)Y(R,["distillationSpec","hyperParameters","epochCount"],k)}
let c=H(a,["config","method"]);
if(c===void 0)c="SUPERVISED_FINE_TUNING";
if(c==="SUPERVISED_FINE_TUNING"){
let k=H(T,["learningRateMultiplier"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec","hyperParameters","learningRateMultiplier"],k)}
else if(c==="PREFERENCE_TUNING"){
let k=H(T,["learningRateMultiplier"]);
if(R!==void 0&&k!=null)Y(R,["preferenceOptimizationSpec","hyperParameters","learningRateMultiplier"],k)}
else if(c==="DISTILLATION"){
let k=H(T,["learningRateMultiplier"]);
if(R!==void 0&&k!=null)Y(R,["distillationSpec","hyperParameters","learningRateMultiplier"],k)}
let s=H(a,["config","method"]);
if(s===void 0)s="SUPERVISED_FINE_TUNING";
if(s==="SUPERVISED_FINE_TUNING"){
let k=H(T,["exportLastCheckpointOnly"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec","exportLastCheckpointOnly"],k)}
else if(s==="PREFERENCE_TUNING"){
let k=H(T,["exportLastCheckpointOnly"]);
if(R!==void 0&&k!=null)Y(R,["preferenceOptimizationSpec","exportLastCheckpointOnly"],k)}
else if(s==="DISTILLATION"){
let k=H(T,["exportLastCheckpointOnly"]);
if(R!==void 0&&k!=null)Y(R,["distillationSpec","exportLastCheckpointOnly"],k)}
let A=H(a,["config","method"]);
if(A===void 0)A="SUPERVISED_FINE_TUNING";
if(A==="SUPERVISED_FINE_TUNING"){
let k=H(T,["adapterSize"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec","hyperParameters","adapterSize"],k)}
else if(A==="PREFERENCE_TUNING"){
let k=H(T,["adapterSize"]);
if(R!==void 0&&k!=null)Y(R,["preferenceOptimizationSpec","hyperParameters","adapterSize"],k)}
else if(A==="DISTILLATION"){
let k=H(T,["adapterSize"]);
if(R!==void 0&&k!=null)Y(R,["distillationSpec","hyperParameters","adapterSize"],k)}
let l=H(a,["config","method"]);
if(l===void 0)l="SUPERVISED_FINE_TUNING";
if(l==="SUPERVISED_FINE_TUNING"){
let k=H(T,["tuningMode"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec","tuningMode"],k)}
let o=H(T,["customBaseModel"]);
if(R!==void 0&&o!=null)Y(R,["customBaseModel"],o);
let n=H(a,["config","method"]);
if(n===void 0)n="SUPERVISED_FINE_TUNING";
if(n==="SUPERVISED_FINE_TUNING"){
let k=H(T,["batchSize"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec","hyperParameters","batchSize"],k)}
let p=H(a,["config","method"]);
if(p===void 0)p="SUPERVISED_FINE_TUNING";
if(p==="SUPERVISED_FINE_TUNING"){
let k=H(T,["learningRate"]);
if(R!==void 0&&k!=null)Y(R,["supervisedTuningSpec","hyperParameters","learningRate"],k)}
let _=H(T,["labels"]);
if(R!==void 0&&_!=null)Y(R,["labels"],_);
let m=H(T,["beta"]);
if(R!==void 0&&m!=null)Y(R,["preferenceOptimizationSpec","hyperParameters","beta"],m);
let b=H(T,["baseTeacherModel"]);
if(R!==void 0&&b!=null)Y(R,["distillationSpec","baseTeacherModel"],b);
let y=H(T,["tunedTeacherModelSource"]);
if(R!==void 0&&y!=null)Y(R,["distillationSpec","tunedTeacherModelSource"],y);
let u=H(T,["sftLossWeightMultiplier"]);
if(R!==void 0&&u!=null)Y(R,["distillationSpec","hyperParameters","sftLossWeightMultiplier"],u);
let P=H(T,["outputUri"]);
if(R!==void 0&&P!=null)Y(R,["outputUri"],P);
return e}
function ddR(T,R){
let a={
},e=H(T,["baseModel"]);
if(e!=null)Y(a,["baseModel"],e);
let t=H(T,["preTunedModel"]);
if(t!=null)Y(a,["preTunedModel"],t);
let r=H(T,["trainingDataset"]);
if(r!=null)WdR(r);
let h=H(T,["config"]);
if(h!=null)SdR(h,a);
return a}
function EdR(T,R){
let a={
},e=H(T,["baseModel"]);
if(e!=null)Y(a,["baseModel"],e);
let t=H(T,["preTunedModel"]);
if(t!=null)Y(a,["preTunedModel"],t);
let r=H(T,["trainingDataset"]);
if(r!=null)qdR(r,a,R);
let h=H(T,["config"]);
if(h!=null)OdR(h,a,R);
return a}
function CdR(T,R){
let a={
},e=H(T,["name"]);
if(e!=null)Y(a,["_url","name"],e);
return a}
function LdR(T,R){
let a={
},e=H(T,["name"]);
if(e!=null)Y(a,["_url","name"],e);
return a}
function MdR(T,R,a){
let e={
},t=H(T,["pageSize"]);
if(R!==void 0&&t!=null)Y(R,["_query","pageSize"],t);
let r=H(T,["pageToken"]);
if(R!==void 0&&r!=null)Y(R,["_query","pageToken"],r);
let h=H(T,["filter"]);
if(R!==void 0&&h!=null)Y(R,["_query","filter"],h);
return e}
function DdR(T,R,a){
let e={
},t=H(T,["pageSize"]);
if(R!==void 0&&t!=null)Y(R,["_query","pageSize"],t);
let r=H(T,["pageToken"]);
if(R!==void 0&&r!=null)Y(R,["_query","pageToken"],r);
let h=H(T,["filter"]);
if(R!==void 0&&h!=null)Y(R,["_query","filter"],h);
return e}
function wdR(T,R){
let a={
},e=H(T,["config"]);
if(e!=null)MdR(e,a);
return a}
function BdR(T,R){
let a={
},e=H(T,["config"]);
if(e!=null)DdR(e,a);
return a}
function NdR(T,R){
let a={
},e=H(T,["sdkHttpResponse"]);
if(e!=null)Y(a,["sdkHttpResponse"],e);
let t=H(T,["nextPageToken"]);
if(t!=null)Y(a,["nextPageToken"],t);
let r=H(T,["tunedModels"]);
if(r!=null){
let h=r;
if(Array.isArray(h))h=h.map((i)=>{
return O6T(i)});
Y(a,["tuningJobs"],h)}
return a}
function UdR(T,R){
let a={
},e=H(T,["sdkHttpResponse"]);
if(e!=null)Y(a,["sdkHttpResponse"],e);
let t=H(T,["nextPageToken"]);
if(t!=null)Y(a,["nextPageToken"],t);
let r=H(T,["tuningJobs"]);
if(r!=null){
let h=r;
if(Array.isArray(h))h=h.map((i)=>{
return BK(i)});
Y(a,["tuningJobs"],h)}
return a}
function HdR(T,R){
let a={
},e=H(T,["name"]);
if(e!=null)Y(a,["model"],e);
let t=H(T,["name"]);
if(t!=null)Y(a,["endpoint"],t);
return a}
function WdR(T,R){
let a={
};
if(H(T,["gcsUri"])!==void 0)throw Error("gcsUri parameter is not supported in Gemini API.");
if(H(T,["vertexDatasetResource"])!==void 0)throw Error("vertexDatasetResource parameter is not supported in Gemini API.");
let e=H(T,["examples"]);
if(e!=null){
let t=e;
if(Array.isArray(t))t=t.map((r)=>{
return r});
Y(a,["examples","examples"],t)}
return a}
function qdR(T,R,a){
let e={
},t=H(a,["config","method"]);
if(t===void 0)t="SUPERVISED_FINE_TUNING";
if(t==="SUPERVISED_FINE_TUNING"){
let h=H(T,["gcsUri"]);
if(R!==void 0&&h!=null)Y(R,["supervisedTuningSpec","trainingDatasetUri"],h)}
else if(t==="PREFERENCE_TUNING"){
let h=H(T,["gcsUri"]);
if(R!==void 0&&h!=null)Y(R,["preferenceOptimizationSpec","trainingDatasetUri"],h)}
else if(t==="DISTILLATION"){
let h=H(T,["gcsUri"]);
if(R!==void 0&&h!=null)Y(R,["distillationSpec","promptDatasetUri"],h)}
let r=H(a,["config","method"]);
if(r===void 0)r="SUPERVISED_FINE_TUNING";
if(r==="SUPERVISED_FINE_TUNING"){
let h=H(T,["vertexDatasetResource"]);
if(R!==void 0&&h!=null)Y(R,["supervisedTuningSpec","trainingDatasetUri"],h)}
else if(r==="PREFERENCE_TUNING"){
let h=H(T,["vertexDatasetResource"]);
if(R!==void 0&&h!=null)Y(R,["preferenceOptimizationSpec","trainingDatasetUri"],h)}
else if(r==="DISTILLATION"){
let h=H(T,["vertexDatasetResource"]);
if(R!==void 0&&h!=null)Y(R,["distillationSpec","promptDatasetUri"],h)}
if(H(T,["examples"])!==void 0)throw Error("examples parameter is not supported in Vertex AI.");
return e}
function O6T(T,R){
let a={
},e=H(T,["sdkHttpResponse"]);
if(e!=null)Y(a,["sdkHttpResponse"],e);
let t=H(T,["name"]);
if(t!=null)Y(a,["name"],t);
let r=H(T,["state"]);
if(r!=null)Y(a,["state"],YBT(r));
let h=H(T,["createTime"]);
if(h!=null)Y(a,["createTime"],h);
let i=H(T,["tuningTask","startTime"]);
if(i!=null)Y(a,["startTime"],i);
let c=H(T,["tuningTask","completeTime"]);
if(c!=null)Y(a,["endTime"],c);
let s=H(T,["updateTime"]);
if(s!=null)Y(a,["updateTime"],s);
let A=H(T,["description"]);
if(A!=null)Y(a,["description"],A);
let l=H(T,["baseModel"]);
if(l!=null)Y(a,["baseModel"],l);
let o=H(T,["_self"]);
if(o!=null)Y(a,["tunedModel"],HdR(o));
return a}
function BK(T,R){
let a={
},e=H(T,["sdkHttpResponse"]);
if(e!=null)Y(a,["sdkHttpResponse"],e);
let t=H(T,["name"]);
if(t!=null)Y(a,["name"],t);
let r=H(T,["state"]);
if(r!=null)Y(a,["state"],YBT(r));
let h=H(T,["createTime"]);
if(h!=null)Y(a,["createTime"],h);
let i=H(T,["startTime"]);
if(i!=null)Y(a,["startTime"],i);
let c=H(T,["endTime"]);
if(c!=null)Y(a,["endTime"],c);
let s=H(T,["updateTime"]);
if(s!=null)Y(a,["updateTime"],s);
let A=H(T,["error"]);
if(A!=null)Y(a,["error"],A);
let l=H(T,["description"]);
if(l!=null)Y(a,["description"],l);
let o=H(T,["baseModel"]);
if(o!=null)Y(a,["baseModel"],o);
let n=H(T,["tunedModel"]);
if(n!=null)Y(a,["tunedModel"],n);
let p=H(T,["preTunedModel"]);
if(p!=null)Y(a,["preTunedModel"],p);
let _=H(T,["supervisedTuningSpec"]);
if(_!=null)Y(a,["supervisedTuningSpec"],_);
let m=H(T,["preferenceOptimizationSpec"]);
if(m!=null)Y(a,["preferenceOptimizationSpec"],m);
let b=H(T,["distillationSpec"]);
if(b!=null)Y(a,["distillationSpec"],b);
let y=H(T,["tuningDataStats"]);
if(y!=null)Y(a,["tuningDataStats"],y);
let u=H(T,["encryptionSpec"]);
if(u!=null)Y(a,["encryptionSpec"],u);
let P=H(T,["partnerModelTuningSpec"]);
if(P!=null)Y(a,["partnerModelTuningSpec"],P);
let k=H(T,["customBaseModel"]);
if(k!=null)Y(a,["customBaseModel"],k);
let x=H(T,["experiment"]);
if(x!=null)Y(a,["experiment"],x);
let f=H(T,["labels"]);
if(f!=null)Y(a,["labels"],f);
let v=H(T,["outputUri"]);
if(v!=null)Y(a,["outputUri"],v);
let g=H(T,["pipelineJob"]);
if(g!=null)Y(a,["pipelineJob"],g);
let I=H(T,["serviceAccount"]);
if(I!=null)Y(a,["serviceAccount"],I);
let S=H(T,["tunedModelDisplayName"]);
if(S!=null)Y(a,["tunedModelDisplayName"],S);
let O=H(T,["veoTuningSpec"]);
if(O!=null)Y(a,["veoTuningSpec"],O);
return a}
function zdR(T,R){
let a={
},e=H(T,["sdkHttpResponse"]);
if(e!=null)Y(a,["sdkHttpResponse"],e);
let t=H(T,["name"]);
if(t!=null)Y(a,["name"],t);
let r=H(T,["metadata"]);
if(r!=null)Y(a,["metadata"],r);
let h=H(T,["done"]);
if(h!=null)Y(a,["done"],h);
let i=H(T,["error"]);
if(i!=null)Y(a,["error"],i);
return a}
function _5(T,R){
let a={
},e=H(T,["gcsUri"]);
if(e!=null)Y(a,["validationDatasetUri"],e);
let t=H(T,["vertexDatasetResource"]);
if(t!=null)Y(a,["validationDatasetUri"],t);
return a}
async function FdR(T,R,a){
var e;
let t=await d6T(T,R,a),r=await(t===null||t===void 0?void 0:t.json());
if(((e=t===null||t===void 0?void 0:t.headers)===null||e===void 0?void 0:e[Yl])!=="final")throw Error("Failed to upload file: Upload status is not finalized.");
return r.file}
async function GdR(T,R,a){
var e;
let t=await d6T(T,R,a),r=await(t===null||t===void 0?void 0:t.json());
if(((e=t===null||t===void 0?void 0:t.headers)===null||e===void 0?void 0:e[Yl])!=="final")throw Error("Failed to upload file: Upload status is not finalized.");
let h=B8T(r),i=new rU;
return Object.assign(i,h),i}
async function d6T(T,R,a){
var e,t;
let r=0,h=0,i=new fk(new Response),c="upload";
r=T.size;
while(h<r){
let s=Math.min(Z6T,r-h),A=T.slice(h,h+s);
if(h+s>=r)c+=", finalize";
let l=0,o=TNT;
while(l<J6T){
if(i=await a.request({
path:"",body:A,httpMethod:"POST",httpOptions:{
apiVersion:"",baseUrl:R,headers:{
"X-Goog-Upload-Command":c,"X-Goog-Upload-Offset":String(h),"Content-Length":String(s)}
}
}),(e=i===null||i===void 0?void 0:i.headers)===null||e===void 0?void 0:e[Yl])break;
l++,await E6T(o),o=o*RNT}
if(h+=s,((t=i===null||i===void 0?void 0:i.headers)===null||t===void 0?void 0:t[Yl])!=="active")break;
if(r<=h)throw Error("All content has been uploaded, but the upload status is not finalized.")}
return i}
async function KdR(T){
return{
size:T.size,type:T.type}
}
function E6T(T){
return new Promise((R)=>setTimeout(R,T))}
class C6T{
async stat(T){
let R={
size:0,type:void 0};
if(typeof T==="string"){
let a=await tU.stat(T);
return R.size=a.size,R.type=this.inferMimeType(T),R}
else return await KdR(T)}
async upload(T,R,a){
if(typeof T==="string")return await this.uploadFileFromPath(T,R,a);
else return FdR(T,R,a)}
async uploadToFileSearchStore(T,R,a){
if(typeof T==="string")return await this.uploadFileToFileSearchStoreFromPath(T,R,a);
else return GdR(T,R,a)}
inferMimeType(T){
let R=T.slice(T.lastIndexOf(".")+1);
return{
aac:"audio/aac",abw:"application/x-abiword",arc:"application/x-freearc",avi:"video/x-msvideo",azw:"application/vnd.amazon.ebook",bin:"application/octet-stream",bmp:"image/bmp",bz:"application/x-bzip",bz2:"application/x-bzip2",csh:"application/x-csh",css:"text/css",csv:"text/csv",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",eot:"application/vnd.ms-fontobject",epub:"application/epub+zip",gz:"application/gzip",gif:"image/gif",htm:"text/html",html:"text/html",ico:"image/vnd.microsoft.icon",ics:"text/calendar",jar:"application/java-archive",jpeg:"image/jpeg",jpg:"image/jpeg",js:"text/javascript",json:"application/json",jsonld:"application/ld+json",kml:"application/vnd.google-earth.kml+xml",kmz:"application/vnd.google-earth.kmz+xml",mjs:"text/javascript",mp3:"audio/mpeg",mp4:"video/mp4",mpeg:"video/mpeg",mpkg:"application/vnd.apple.installer+xml",odt:"application/vnd.oasis.opendocument.text",oga:"audio/ogg",ogv:"video/ogg",ogx:"application/ogg",opus:"audio/opus",otf:"font/otf",png:"image/png",pdf:"application/pdf",php:"application/x-httpd-php",ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",rar:"application/vnd.rar",rtf:"application/rtf",sh:"application/x-sh",svg:"image/svg+xml",swf:"application/x-shockwave-flash",tar:"application/x-tar",tif:"image/tiff",tiff:"image/tiff",ts:"video/mp2t",ttf:"font/ttf",txt:"text/plain",vsd:"application/vnd.visio",wav:"audio/wav",weba:"audio/webm",webm:"video/webm",webp:"image/webp",woff:"font/woff",woff2:"font/woff2",xhtml:"application/xhtml+xml",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",xml:"application/xml",xul:"application/vnd.mozilla.xul+xml",zip:"application/zip","3gp":"video/3gpp","3g2":"video/3gpp2","7z":"application/x-7z-compressed"}
[R.toLowerCase()]}
async uploadFileFromPath(T,R,a){
var e;
let t=await this.uploadFileFromPathInternal(T,R,a),r=await(t===null||t===void 0?void 0:t.json());
if(((e=t===null||t===void 0?void 0:t.headers)===null||e===void 0?void 0:e[Yl])!=="final")throw Error("Failed to upload file: Upload status is not finalized.");
return r.file}
async uploadFileToFileSearchStoreFromPath(T,R,a){
var e;
let t=await this.uploadFileFromPathInternal(T,R,a),r=await(t===null||t===void 0?void 0:t.json());
if(((e=t===null||t===void 0?void 0:t.headers)===null||e===void 0?void 0:e[Yl])!=="final")throw Error("Failed to upload file: Upload status is not finalized.");
let h=B8T(r),i=new rU;
return Object.assign(i,h),i}
async uploadFileFromPathInternal(T,R,a){
var e,t;
let r=0,h=0,i=new fk(new Response),c="upload",s,A=OBT.basename(T);
try{
if(s=await tU.open(T,"r"),!s)throw Error("Failed to open file");
r=(await s.stat()).size;
while(h<r){
let l=Math.min(Z6T,r-h);
if(h+l>=r)c+=", finalize";
let o=new Uint8Array(l),{
bytesRead:n}
=await s.read(o,0,l,h);
if(n!==l)throw Error(`Failed to read ${l} bytes from file at offset ${h}. bytes actually read: ${n}`);
let p=new Blob([o]),_=0,m=TNT;
while(_<J6T){
if(i=await a.request({
path:"",body:p,httpMethod:"POST",httpOptions:{
apiVersion:"",baseUrl:R,headers:{
"X-Goog-Upload-Command":c,"X-Goog-Upload-Offset":String(h),"Content-Length":String(n),"X-Goog-Upload-File-Name":A}
}
}),(e=i===null||i===void 0?void 0:i.headers)===null||e===void 0?void 0:e[Yl])break;
_++,await E6T(m),m=m*RNT}
if(h+=n,((t=i===null||i===void 0?void 0:i.headers)===null||t===void 0?void 0:t[Yl])!=="active")break;
if(r<=h)throw Error("All content has been uploaded, but the upload status is not finalized.")}
return i}
finally{
if(s)await s.close()}
}
}
class L6T{
get interactions(){
if(this._interactions!==void 0)return this._interactions;
console.warn("GoogleGenAI.interactions: Interactions usage is experimental and may change in future versions.");
let T=this.httpOptions;
if(T===null||T===void 0?void 0:T.extraBody)console.warn("GoogleGenAI.interactions: Client level httpOptions.extraBody is not supported by the interactions client and will be ignored.");
let R=new Ua({
baseURL:this.apiClient.getBaseUrl(),apiKey:this.apiKey,apiVersion:this.apiClient.getApiVersion(),clientAdapter:this.apiClient,defaultHeaders:this.apiClient.getDefaultHeaders(),timeout:T===null||T===void 0?void 0:T.timeout});
return this._interactions=R.interactions,this._interactions}
constructor(T){
var R,a,e,t,r,h;
if((T.project||T.location)&&T.apiKey)throw Error("Project/location and API key are mutually exclusive in the client initializer.");
this.vertexai=(a=(R=T.vertexai)!==null&&R!==void 0?R:VdR("GOOGLE_GENAI_USE_VERTEXAI"))!==null&&a!==void 0?a:!1;
let i=YdR(),c=Z_("GOOGLE_CLOUD_PROJECT"),s=Z_("GOOGLE_CLOUD_LOCATION");
if(this.apiKey=(e=T.apiKey)!==null&&e!==void 0?e:i,this.project=(t=T.project)!==null&&t!==void 0?t:c,this.location=(r=T.location)!==null&&r!==void 0?r:s,!this.vertexai&&!this.apiKey)throw Error("API key must be set when using the Gemini API.");
if(T.vertexai){
if((h=T.googleAuthOptions)===null||h===void 0?void 0:h.credentials)console.debug("The user provided Google Cloud credentials will take precedence over the API key from the environment variable."),this.apiKey=void 0;
if((c||s)&&T.apiKey)console.debug("The user provided Vertex AI API key will take precedence over the project/location from the environment variables."),this.project=void 0,this.location=void 0;
else if((T.project||T.location)&&i)console.debug("The user provided project/location will take precedence over the API key from the environment variables."),this.apiKey=void 0;
else if((c||s)&&i)console.debug("The project/location from the environment variables will take precedence over the API key from the environment variables."),this.apiKey=void 0;
if(!this.location&&!this.apiKey)this.location="global"}
let A=JgR(T.httpOptions,T.vertexai,Z_("GOOGLE_VERTEX_BASE_URL"),Z_("GOOGLE_GEMINI_BASE_URL"));
if(A)if(T.httpOptions)T.httpOptions.baseUrl=A;
else T.httpOptions={
baseUrl:A};
this.apiVersion=T.apiVersion,this.httpOptions=T.httpOptions;
let l=new $6T({
apiKey:this.apiKey,googleAuthOptions:T.googleAuthOptions});
this.apiClient=new _6T({
auth:l,project:this.project,location:this.location,apiVersion:this.apiVersion,apiKey:this.apiKey,vertexai:this.vertexai,httpOptions:this.httpOptions,userAgentExtra:PER+process.version,uploader:new C6T,downloader:new v6T}),this.models=new U6T(this.apiClient),this.live=new P6T(this.apiClient,l,new j6T),this.batches=new D6T(this.apiClient),this.chats=new h6T(this.models,this.apiClient),this.caches=new w6T(this.apiClient),this.files=new aNT(this.apiClient),this.operations=new H6T(this.apiClient),this.authTokens=new W6T(this.apiClient),this.tunings=new Q6T(this.apiClient),this.fileSearchStores=new q6T(this.apiClient)}
}
function Z_(T){
var R,a,e;
return(e=(a=(R=process===null||process===void 0?void 0:process.env)===null||R===void 0?void 0:R[T])===null||a===void 0?void 0:a.trim())!==null&&e!==void 0?e:void 0}
function VdR(T){
return XdR(Z_(T))}
function XdR(T){
if(T===void 0)return!1;
return T.toLowerCase()==="true"}
function YdR(){
let T=Z_("GOOGLE_API_KEY"),R=Z_("GEMINI_API_KEY");
if(T&&R)console.warn("Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GOOGLE_API_KEY.");
return T||R||void 0}
class tNT{
async*stream({
model:T,thread:R,systemPrompt:a,tools:e,configService:t,signal:r,reasoningEffort:h,serviceAuthToken:i,logger:c}){
let s=e,A=rNT(R),l=xER(T,A,s,a.map((n)=>n.text).join(`

`),R,{
configService:t},r,_m(R)?.messageId,h,i,c),o;
for await(let n of l)if(o=vER(o,n),o)yield jER(o)}
}
function rNT(T){
let{
summaryBlock:R,index:a}
=pm(T)??{
summaryBlock:void 0,index:0},e=[];
if(R&&R.summary.type==="message")e.push({
role:"model",parts:[{
text:R.summary.summary.trimEnd()}
]});
for(let t=a+(R?1:0);t<T.messages.length;t++){
let r=T.messages[t];
if(!r)continue;
switch(r.role){
case"user":{
let h=gER(r,T);
if(h.length===0)continue;
e.push({
role:"user",parts:h});
break}
case"assistant":{
let h=r.content.filter((s)=>{
if(s.type==="tool_use"&&!s.complete)return!1;
if(s.type==="server_tool_use")return!1;
return!0}),i=sA(T);
for(let s of h)if(s.type==="tool_use"){
if(!i.get(s.id)?.run)throw Error(`(bug) corresponding tool_result not found for tool_use (id=${s.id}, name=${s.name})`)}
if(r.nativeMessage?.type==="vertexai"){
let s=r.nativeMessage.message.candidates?.[0]?.content,A={
role:s?.role??"model",parts:s?.parts??[]};
e.push(O8(A));
break}
if(h.length===0)break;
let c=$ER(h);
if(c.length>0)e.push({
role:"model",parts:c});
break}
case"info":{
let h=[];
for(let i of r.content)if(i.type==="manual_bash_invocation"){
let c=dx(i);
h.push(...c.map((s)=>({
text:s.text})))}
else if(i.type==="text"&&i.text.trim().length>0)h.push({
text:i.text});
if(h.length>0)e.push({
role:"user",parts:h});
break}
}
}
return e}
function sU(T,R){
let a=Ur(R),e=Object.values(n8).find((t)=>t.provider===P9.VERTEXAI&&t.name===T);
if(e===void 0)return a.warn(`Unknown gemini model ${T}`),{
...n8.GEMINI_3_1_PRO_PREVIEW,name:T,displayName:T};
return e}
function kER(T){
switch(T){
case"minimal":return"MINIMAL";
case"low":return K$.LOW;
case"medium":return"MEDIUM";
case"high":return K$.HIGH;
default:return K$.THINKING_LEVEL_UNSPECIFIED}
}
function i_T(T){
let R=T.toLowerCase();
switch(R){
case"minimal":case"low":case"medium":case"high":return R;
default:return}
}
async function*xER(T,R,a,e,t,r,h,i,c,s,A){
let l=sU(T,A),o=await r.configService.getLatest(h),n=await oU(o,{
threadMeta:t,messageId:i,serviceAuthToken:s}),p={
model:l.name,contents:O8(R),config:{
seed:Date.now()%1e4,tools:V8T(a),systemInstruction:e,maxOutputTokens:l.maxOutputTokens,temperature:1,thinkingConfig:{
includeThoughts:i_T(c??"")!=="minimal",thinkingLevel:kER(i_T(c??"")??o.settings["gemini.thinkingLevel"])},abortSignal:h}
},_=await n.models.generateContentStream(p),m;
for await(let b of _)m=b,yield b;
return{
model:T,"~debugUsage":{
model:T,maxInputTokens:l.contextWindow-l.maxOutputTokens,inputTokens:0,outputTokens:(m?.usageMetadata?.candidatesTokenCount??0)+(m?.usageMetadata?.thoughtsTokenCount??0),totalInputTokens:m?.usageMetadata?.promptTokenCount??0,cacheCreationInputTokens:(m?.usageMetadata?.promptTokenCount??0)-(m?.usageMetadata?.cachedContentTokenCount??0),cacheReadInputTokens:m?.usageMetadata?.cachedContentTokenCount??0,timestamp:new Date().toISOString()}
}
}
async function gO(T,R,a,e,t,r,h,i,c){
let s=sU(T),A=await(await oU(t,{
threadMeta:e,featureHeader:i,serviceAuthToken:c})).models.generateContent({
model:s.name,contents:O8(R),config:{
tools:V8T(a),seed:Date.now()%1e4,temperature:0.1,maxOutputTokens:s.maxOutputTokens,abortSignal:r,...h}
});
return{
message:A,"~debugUsage":{
model:s.name,maxInputTokens:s.contextWindow-s.maxOutputTokens,inputTokens:0,outputTokens:(A.usageMetadata?.candidatesTokenCount??0)+(A.usageMetadata?.thoughtsTokenCount??0),totalInputTokens:A.usageMetadata?.promptTokenCount??0,cacheCreationInputTokens:(A.usageMetadata?.promptTokenCount??0)-(A.usageMetadata?.cachedContentTokenCount??0),cacheReadInputTokens:A.usageMetadata?.cachedContentTokenCount??0,timestamp:new Date().toISOString()}
}
}
async function fER(T,R,a,e,t,r,h){
let i=sU(T);
if(!i.capabilities?.imageGeneration)throw Error(`Model ${i.name} does not support image generation. Use a model with imageGeneration capability.`);
let c=await oU(t,{
threadMeta:e,featureHeader:h??"amp.image-generation"}),s=a&&a.length>0?[{
text:R},...a.map((_)=>({
inlineData:{
mimeType:_.mimeType,data:_.data}
}))]:R,A=await c.models.generateContent({
model:i.name,contents:s,config:{
responseModalities:["TEXT","IMAGE"],imageConfig:{
imageSize:"1K"},abortSignal:r}
}),l=[],o;
for(let _ of A.candidates?.[0]?.content?.parts??[])if("text"in _&&_.text)o=(o??"")+_.text;
else if("inlineData"in _&&_.inlineData?.data)l.push({
mimeType:_.inlineData.mimeType??"image/png",data:_.inlineData.data});
let n=A.usageMetadata,p={
model:A.modelVersion??i.name,maxInputTokens:i.contextWindow-i.maxOutputTokens,inputTokens:0,outputTokens:(n?.candidatesTokenCount??0)+(n?.thoughtsTokenCount??0),totalInputTokens:n?.promptTokenCount??0,cacheCreationInputTokens:(n?.promptTokenCount??0)-(n?.cachedContentTokenCount??0),cacheReadInputTokens:n?.cachedContentTokenCount??0,timestamp:new Date().toISOString()};
return{
images:l,textResponse:o,"~debugUsage":p}
}
function V8T(T){
if(T.length===0)return[];
return[{
functionDeclarations:[...T.map(IER)]}
]}
function IER(T){
return{
name:T.name,description:T.description??"",parameters:VK(T.inputSchema)}
}
function VK(T){
let R={
},a=hNT[T.type??"any"];
if(a)R.type=a;
if(T.description)R.description=T.description;
if(T.required)R.required=T.required;
let e=T.examples;
if(Array.isArray(e)&&e.length>0)R.example=e[0];
if(T.properties)R.properties=Object.fromEntries(Object.entries(T.properties).map(([t,r])=>[t,VK(r)]));
if(T.items)R.items=VK(T.items);
return R}
async function oU(T,R){
let{
settings:a,secrets:e}
=T,{
url:t}
=a,r=await e.getToken("apiKey",t);
if(!r)throw Error("API key not found. You must provide an API key in settings.");
let h={
GOOGLE_CLOUD_PROJECT:process.env.GOOGLE_CLOUD_PROJECT,GCLOUD_PROJECT:process.env.GCLOUD_PROJECT,GOOGLE_APPLICATION_CREDENTIALS:process.env.GOOGLE_APPLICATION_CREDENTIALS};
delete process.env.GOOGLE_CLOUD_PROJECT,delete process.env.GCLOUD_PROJECT,delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
let i=Js(R?.serviceAuthToken),c=new L6T({
apiKey:"placeholder",vertexai:!0,googleAuthOptions:{
},httpOptions:{
baseUrl:new URL("/api/provider/google",t).toString(),headers:{
Authorization:"Bearer "+r,...i??{
},[yc]:R?.featureHeader??"amp.chat",...R?.messageId!=null?{
[zA]:String(R.messageId)}
:{
},...Vs(R?.threadMeta)}
}
});
for(let[s,A]of Object.entries(h))if(A!==void 0)process.env[s]=A;
return c}
function gER(T,R){
let a=[];
if(T.fileMentions&&T.fileMentions.files.length>0)a.push({
text:$m(T.fileMentions)});
if(T.userState)a.push({
text:Ox(T.userState)});
for(let e of T.content)if(e.type==="text")a.push({
text:e.text});
else if(e.type==="image"){
if(a.push({
text:PO(e)}),e.source.type==="base64"&&"mediaType"in e.source&&"data"in e.source)a.push({
inlineData:{
mimeType:e.source.mediaType,data:e.source.data}
});
else if(e.source.type==="url"&&"url"in e.source)a.push({
text:`[Image URL: ${e.source.url}]`})}
else if(e.type==="tool_result"){
let t={
};
if(e.run.status==="done")t.output=e.run.result;
else if(e.run.status==="error")t.error=e.run.error?.message??"Error executing tool";
else t.error=`Tool status: ${e.run.status}`;
let r,[,h]=e.toolUseID.split("__");
if(h)r=h;
else for(let c of R.messages)if(c.role==="assistant"){
for(let s of c.content)if(s.type==="tool_use"&&s.id===e.toolUseID){
r=s.name;
break}
if(r)break}
if(!r)throw Error(`Could not find tool name for tool_result with ID: ${e.toolUseID}`);
let i={
name:r,response:t};
a.push({
functionResponse:i})}
return a}
function $ER(T){
let R=[];
for(let a of T)if(a.type==="text")R.push({
text:a.text});
else if(a.type==="tool_use"){
let e={
functionCall:{
name:a.name,args:a.input??{
}
}
},t=a.metadata?.thoughtSignature;
if(typeof t==="string")e.thoughtSignature=t;
R.push(e)}
else if(a.type==="thinking")R.push({
text:a.thinking,thought:!0,thoughtSignature:a.signature});
else if(a.type==="redacted_thinking")R.push({
text:"[Redacted thinking]"});
return R}
function vER(T,R){
if(!T)return R;
let a=T.candidates&&R.candidates?T.candidates.map((t,r)=>{
let h=R.candidates?.[r];
if(!h)return t;
return{
...h,content:{
role:h.content?.role??t.content?.role??"model",parts:[...t.content?.parts??[],...h.content?.parts??[]]}
}
}):R.candidates,e=new M_;
return Object.assign(e,{
...R,candidates:a}),e}
function jER(T){
function R(){
let t=[];
for(let r of T.candidates?.at(0)?.content?.parts??[])if(r.text&&r.thought){
let h=t.at(-1);
if(h?.type==="thinking")t[t.length-1]={
type:"thinking",thinking:h.thinking+r.text,signature:"",provider:"vertexai"};
else t.push({
type:"thinking",thinking:r.text,signature:"",provider:"vertexai"})}
else if(r.text){
let h=t.at(-1);
if(h?.type==="text")t[t.length-1]={
type:"text",text:h.text+r.text};
else t.push({
type:"text",text:r.text})}
else if(r.functionCall)t.push({
type:"tool_use",complete:!0,id:r.functionCall.id??fx(),name:r.functionCall.name??"",input:r.functionCall.args??{
},...r.thoughtSignature?{
metadata:{
thoughtSignature:r.thoughtSignature}
}
:{
}
});
return t}
function a(){
if(!T.usageMetadata)return;
let t=sU(T.modelVersion??"");
return{
model:t.name,maxInputTokens:t.contextWindow-t.maxOutputTokens,inputTokens:0,cacheReadInputTokens:T.usageMetadata?.cachedContentTokenCount??0,cacheCreationInputTokens:(T.usageMetadata?.promptTokenCount??0)-(T.usageMetadata?.cachedContentTokenCount??0),outputTokens:(T.usageMetadata?.totalTokenCount??0)-(T.usageMetadata?.promptTokenCount??0),totalInputTokens:T.usageMetadata?.promptTokenCount??0,timestamp:new Date().toISOString()}
}
function e(){
let t=T.candidates?.at(0)?.finishReason,r=T.candidates?.at(0)?.finishMessage;
switch(t){
case Me.STOP:{
if(T.candidates?.at(0)?.content?.parts?.some((h)=>h.functionCall!==void 0))return{
type:"complete",stopReason:"tool_use"};
return{
type:"complete",stopReason:"end_turn"}
}
case Me.MAX_TOKENS:return{
type:"complete",stopReason:"max_tokens"};
case Me.BLOCKLIST:case Me.SAFETY:case Me.RECITATION:case Me.LANGUAGE:case Me.PROHIBITED_CONTENT:case Me.IMAGE_PROHIBITED_CONTENT:case Me.IMAGE_SAFETY:case Me.SPII:case Me.OTHER:case Me.FINISH_REASON_UNSPECIFIED:case Me.NO_IMAGE:return{
type:"error",error:{
message:`provider refused to continue with code '${
      t}
      ': ${r}`}
};
case Me.UNEXPECTED_TOOL_CALL:case Me.MALFORMED_FUNCTION_CALL:return{
type:"error",error:{
message:`provider failed with code '${
      t}
      ': ${r}`}
};
case void 0:return{
type:"streaming"};
default:return{
type:"error",error:{
message:`provider refused to continue with code '${
      t}
      ': ${r}`}
}
}
}
return{
role:"assistant",messageId:0,content:R(),state:e(),usage:a(),nativeMessage:{
type:"vertexai",message:T}
}
}
function b9(T,R,a,e,t){
if(e==="m")throw TypeError("Private method is not writable");
if(e==="a"&&!t)throw TypeError("Private accessor was defined without a setter");
if(typeof R==="function"?T!==R||!t:!R.has(T))throw TypeError("Cannot write private member to an object whose class did not declare it");
return e==="a"?t.call(T,a):t?t.value=a:R.set(T,a),a}
function bR(T,R,a,e){
if(a==="a"&&!e)throw TypeError("Private accessor was defined without a getter");
if(typeof R==="function"?T!==R||!e:!R.has(T))throw TypeError("Cannot read private member from an object whose class did not declare it");
return a==="m"?e:a==="a"?e.call(T):e?e.value:R.get(T)}
function XK(T){
return typeof T==="object"&&T!==null&&(("name"in T)&&T.name==="AbortError"||("message"in T)&&String(T.message).includes("FetchRequestCanceledException"))}
function c_T(T){
if(typeof T!=="object")return{
};
return T??{
}
}
function s_T(T){
if(!T)return!0;
for(let R in T)return!1;
return!0}
function SER(T,R){
return Object.prototype.hasOwnProperty.call(T,R)}
function j5(T){
return T!=null&&typeof T==="object"&&!Array.isArray(T)}
function CER(){
if(typeof Deno<"u"&&Deno.build!=null)return"deno";
if(typeof EdgeRuntime<"u")return"edge";
if(Object.prototype.toString.call(typeof globalThis.process<"u"?globalThis.process:0)==="[object process]")return"node";
return"unknown"}
function LER(){
if(typeof navigator>"u"||!navigator)return null;
let T=[{
key:"edge",pattern:/Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{
key:"ie",pattern:/MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{
key:"ie",pattern:/Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/},{
key:"chrome",pattern:/Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{
key:"firefox",pattern:/Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{
key:"safari",pattern:/(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/}
];
for(let{
key:R,pattern:a}
of T){
let e=a.exec(navigator.userAgent);
if(e){
let t=e[1]||0,r=e[2]||0,h=e[3]||0;
return{
browser:R,version:`${t}.${r}.${h}`}
}
}
return null}
function BER(){
if(typeof fetch<"u")return fetch;
throw Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`")}
function sNT(...T){
let R=globalThis.ReadableStream;
if(typeof R>"u")throw Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
return new R(...T)}
function oNT(T){
let R=Symbol.asyncIterator in T?T[Symbol.asyncIterator]():T[Symbol.iterator]();
return sNT({
start(){
},async pull(a){
let{
done:e,value:t}
=await R.next();
if(e)a.close();
else a.enqueue(t)},async cancel(){
await R.return?.()}
})}
function nNT(T){
if(T[Symbol.asyncIterator])return T;
let R=T.getReader();
return{
async next(){
try{
let a=await R.read();
if(a?.done)R.releaseLock();
return a}
catch(a){
throw R.releaseLock(),a}
},async return(){
let a=R.cancel();
return R.releaseLock(),await a,{
done:!0,value:void 0}
},[Symbol.asyncIterator](){
return this}
}
}
async function NER(T){
if(T===null||typeof T!=="object")return;
if(T[Symbol.asyncIterator]){
await T[Symbol.asyncIterator]().return?.();
return}
let R=T.getReader(),a=R.cancel();
R.releaseLock(),await a}
function WER(T){
if(!T||typeof T!=="object")return!1;
return!!(T.constructor&&T.constructor.isBuffer&&T.constructor.isBuffer(T))}
function p_T(T,R){
if(yr(T)){
let a=[];
for(let e=0;e<T.length;e+=1)a.push(R(T[e]));
return a}
return R(T)}
function FER(T){
return typeof T==="string"||typeof T==="number"||typeof T==="boolean"||typeof T==="symbol"||typeof T==="bigint"}
function _NT(T,R,a,e,t,r,h,i,c,s,A,l,o,n,p,_,m,b){
let y=T,u=b,P=0,k=!1;
while((u=u.get(zL))!==void 0&&!k){
let I=u.get(T);
if(P+=1,typeof I<"u")if(I===P)throw RangeError("Cyclic object value");
else k=!0;
if(typeof u.get(zL)>"u")P=0}
if(typeof s==="function")y=s(R,y);
else if(y instanceof Date)y=o?.(y);
else if(a==="comma"&&yr(y))y=p_T(y,function(I){
if(I instanceof Date)return o?.(I);
return I});
if(y===null){
if(r)return c&&!_?c(R,$a.encoder,m,"key",n):R;
y=""}
if(FER(y)||WER(y)){
if(c){
let I=_?R:c(R,$a.encoder,m,"key",n);
return[p?.(I)+"="+p?.(c(y,$a.encoder,m,"value",n))]}
return[p?.(R)+"="+p?.(String(y))]}
let x=[];
if(typeof y>"u")return x;
let f;
if(a==="comma"&&yr(y)){
if(_&&c)y=p_T(y,c);
f=[{
value:y.length>0?y.join(",")||null:void 0}
]}
else if(yr(s))f=s;
else{
let I=Object.keys(y);
f=A?I.sort(A):I}
let v=i?String(R).replace(/\./g,"%2E"):String(R),g=e&&yr(y)&&y.length===1?v+"[]":v;
if(t&&yr(y)&&y.length===0)return g+"[]";
for(let I=0;I<f.length;++I){
let S=f[I],O=typeof S==="object"&&typeof S.value<"u"?S.value:y[S];
if(h&&O===null)continue;
let j=l&&i?S.replace(/\./g,"%2E"):S,d=yr(y)?typeof a==="function"?a(g,j):g:g+(l?"."+j:"["+j+"]");
b.set(T,P);
let C=new WeakMap;
C.set(zL,b),bNT(x,_NT(O,d,a,e,t,r,h,i,a==="comma"&&_&&yr(y)?null:c,s,A,l,o,n,p,_,m,C))}
return x}
function GER(T=$a){
if(typeof T.allowEmptyArrays<"u"&&typeof T.allowEmptyArrays!=="boolean")throw TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
if(typeof T.encodeDotInKeys<"u"&&typeof T.encodeDotInKeys!=="boolean")throw TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
if(T.encoder!==null&&typeof T.encoder<"u"&&typeof T.encoder!=="function")throw TypeError("Encoder has to be a function.");
let R=T.charset||$a.charset;
if(typeof T.charset<"u"&&T.charset!=="utf-8"&&T.charset!=="iso-8859-1")throw TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
let a=lNT;
if(typeof T.format<"u"){
if(!iV(hV,T.format))throw TypeError("Unknown format option provided.");
a=T.format}
let e=hV[a],t=$a.filter;
if(typeof T.filter==="function"||yr(T.filter))t=T.filter;
let r;
if(T.arrayFormat&&T.arrayFormat in Q8T)r=T.arrayFormat;
else if("indices"in T)r=T.indices?"indices":"repeat";
else r=$a.arrayFormat;
if("commaRoundTrip"in T&&typeof T.commaRoundTrip!=="boolean")throw TypeError("`commaRoundTrip` must be a boolean, or absent");
let h=typeof T.allowDots>"u"?!!T.encodeDotInKeys===!0?!0:$a.allowDots:!!T.allowDots;
return{
addQueryPrefix:typeof T.addQueryPrefix==="boolean"?T.addQueryPrefix:$a.addQueryPrefix,allowDots:h,allowEmptyArrays:typeof T.allowEmptyArrays==="boolean"?!!T.allowEmptyArrays:$a.allowEmptyArrays,arrayFormat:r,charset:R,charsetSentinel:typeof T.charsetSentinel==="boolean"?T.charsetSentinel:$a.charsetSentinel,commaRoundTrip:!!T.commaRoundTrip,delimiter:typeof T.delimiter>"u"?$a.delimiter:T.delimiter,encode:typeof T.encode==="boolean"?T.encode:$a.encode,encodeDotInKeys:typeof T.encodeDotInKeys==="boolean"?T.encodeDotInKeys:$a.encodeDotInKeys,encoder:typeof T.encoder==="function"?T.encoder:$a.encoder,encodeValuesOnly:typeof T.encodeValuesOnly==="boolean"?T.encodeValuesOnly:$a.encodeValuesOnly,filter:t,format:a,formatter:e,serializeDate:typeof T.serializeDate==="function"?T.serializeDate:$a.serializeDate,skipNulls:typeof T.skipNulls==="boolean"?T.skipNulls:$a.skipNulls,sort:typeof T.sort==="function"?T.sort:null,strictNullHandling:typeof T.strictNullHandling==="boolean"?T.strictNullHandling:$a.strictNullHandling}
}
function KER(T,R={
}){
let a=T,e=GER(R),t,r;
if(typeof e.filter==="function")r=e.filter,a=r("",a);
else if(yr(e.filter))r=e.filter,t=r;
let h=[];
if(typeof a!=="object"||a===null)return"";
let i=Q8T[e.arrayFormat],c=i==="comma"&&e.commaRoundTrip;
if(!t)t=Object.keys(a);
if(e.sort)t.sort(e.sort);
let s=new WeakMap;
for(let o=0;o<t.length;++o){
let n=t[o];
if(e.skipNulls&&a[n]===null)continue;
bNT(h,_NT(a[n],n,i,c,e.allowEmptyArrays,e.strictNullHandling,e.skipNulls,e.encodeDotInKeys,e.encode?e.encoder:null,e.filter,e.sort,e.allowDots,e.serializeDate,e.format,e.formatter,e.encodeValuesOnly,e.charset,s))}
let A=h.join(e.delimiter),l=e.addQueryPrefix===!0?"?":"";
if(e.charsetSentinel)if(e.charset==="iso-8859-1")l+="utf8=%26%2310003%3B&";
else l+="utf8=%E2%9C%93&";
return A.length>0?l+A:""}
function XER(T){
return KER(T,{
arrayFormat:"brackets"})}
function YER(T){
let R=0;
for(let t of T)R+=t.length;
let a=new Uint8Array(R),e=0;
for(let t of T)a.set(t,e),e+=t.length;
return a}
function Z8T(T){
let R;
return(m_T??(R=new globalThis.TextEncoder,m_T=R.encode.bind(R)))(T)}
function b_T(T){
let R;
return(u_T??(R=new globalThis.TextDecoder,u_T=R.decode.bind(R)))(T)}
class Vj{
constructor(){
rh.set(this,void 0),hh.set(this,void 0),b9(this,rh,new Uint8Array,"f"),b9(this,hh,null,"f")}
decode(T){
if(T==null)return[];
let R=T instanceof ArrayBuffer?new Uint8Array(T):typeof T==="string"?Z8T(T):T;
b9(this,rh,YER([bR(this,rh,"f"),R]),"f");
let a=[],e;
while((e=QER(bR(this,rh,"f"),bR(this,hh,"f")))!=null){
if(e.carriage&&bR(this,hh,"f")==null){
b9(this,hh,e.index,"f");
continue}
if(bR(this,hh,"f")!=null&&(e.index!==bR(this,hh,"f")+1||e.carriage)){
a.push(b_T(bR(this,rh,"f").subarray(0,bR(this,hh,"f")-1))),b9(this,rh,bR(this,rh,"f").subarray(bR(this,hh,"f")),"f"),b9(this,hh,null,"f");
continue}
let t=bR(this,hh,"f")!==null?e.preceding-1:e.preceding,r=b_T(bR(this,rh,"f").subarray(0,t));
a.push(r),b9(this,rh,bR(this,rh,"f").subarray(e.index),"f"),b9(this,hh,null,"f")}
return a}
flush(){
if(!bR(this,rh,"f").length)return[];
return this.decode(`
`)}
}
function QER(T,R){
for(let a=R??0;a<T.length;a++){
if(T[a]===10)return{
preceding:a,index:a+1,carriage:!1};
if(T[a]===13)return{
preceding:a,index:a+1,carriage:!0}
}
return null}
function ZER(T){
for(let R=0;R<T.length-1;R++){
if(T[R]===10&&T[R+1]===10)return R+2;
if(T[R]===13&&T[R+1]===13)return R+2;
if(T[R]===13&&T[R+1]===10&&R+3<T.length&&T[R+2]===13&&T[R+3]===10)return R+4}
return-1}
function a$(){
}
function kC(T,R,a){
if(!R||Xj[T]>Xj[a])return a$;
else return R[T].bind(R)}
function De(T){
let R=T.logger,a=T.logLevel??"off";
if(!R)return uNT;
let e=cV.get(R);
if(e&&e[0]===a)return e[1];
let t={
error:kC("error",R,a),warn:kC("warn",R,a),info:kC("info",R,a),debug:kC("debug",R,a)};
return cV.set(R,[a,t]),t}
async function*TCR(T,R){
if(!T.body){
if(R.abort(),typeof globalThis.navigator<"u"&&globalThis.navigator.product==="ReactNative")throw new Y0("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
throw new Y0("Attempted to iterate over a response with no body")}
let a=new yNT,e=new Vj,t=nNT(T.body);
for await(let r of RCR(t))for(let h of e.decode(r)){
let i=a.decode(h);
if(i)yield i}
for(let r of e.flush()){
let h=a.decode(r);
if(h)yield h}
}
async function*RCR(T){
let R=new Uint8Array;
for await(let a of T){
if(a==null)continue;
let e=a instanceof ArrayBuffer?new Uint8Array(a):typeof a==="string"?Z8T(a):a,t=new Uint8Array(R.length+e.length);
t.set(R),t.set(e,R.length),R=t;
let r;
while((r=ZER(R))!==-1)yield R.slice(0,r),R=R.slice(r)}
if(R.length>0)yield R}
class yNT{
constructor(){
this.event=null,this.data=[],this.chunks=[]}
decode(T){
if(T.endsWith("\r"))T=T.substring(0,T.length-1);
if(!T){
if(!this.event&&!this.data.length)return null;
let t={
event:this.event,data:this.data.join(`
`),raw:this.chunks};
return this.event=null,this.data=[],this.chunks=[],t}
if(this.chunks.push(T),T.startsWith(":"))return null;
let[R,a,e]=aCR(T,":");
if(e.startsWith(" "))e=e.substring(1);
if(R==="event")this.event=e;
else if(R==="data")this.data.push(e);
return null}
}
function aCR(T,R){
let a=T.indexOf(R);
if(a!==-1)return[T.substring(0,a),R,T.substring(a+R.length)];
return[T,"",""]}
async function kNT(T,R){
let{
response:a,requestLogID:e,retryOfRequestLogID:t,startTime:r}
=R,h=await(async()=>{
if(R.options.stream){
if(De(T).debug("response",a.status,a.url,a.headers,a.body),R.options.__streamClass)return R.options.__streamClass.fromSSEResponse(a,R.controller,T,R.options.__synthesizeEventData);
return Ik.fromSSEResponse(a,R.controller,T,R.options.__synthesizeEventData)}
if(a.status===204)return null;
if(R.options.__binaryResponse)return a;
let i=a.headers.get("content-type")?.split(";")[0]?.trim();
if(i?.includes("application/json")||i?.endsWith("+json")){
if(a.headers.get("content-length")==="0")return;
let c=await a.json();
return xNT(c,a)}
return await a.text()})();
return De(T).debug(`[${e}] response parsed`,j_({
retryOfRequestLogID:t,url:a.url,status:a.status,body:h,durationMs:Date.now()-r})),h}
function xNT(T,R){
if(!T||typeof T!=="object"||Array.isArray(T))return T;
return Object.defineProperty(T,"_request_id",{
value:R.headers.get("x-request-id"),enumerable:!1})}
function X$(T,R,a){
return gNT(),new File(T,R??"unknown_file",a)}
function FL(T){
return(typeof T==="object"&&T!==null&&(("name"in T)&&T.name&&String(T.name)||("url"in T)&&T.url&&String(T.url)||("filename"in T)&&T.filename&&String(T.filename)||("path"in T)&&T.path&&String(T.path))||"").split(/[\\/]/).pop()||void 0}
function eCR(T){
let R=typeof T==="function"?T:T.fetch,a=sV.get(R);
if(a)return a;
let e=(async()=>{
try{
let t="Response"in R?R.Response:(await R("data:,")).constructor,r=new FormData;
if(r.toString()===await new t(r).text())return!1;
return!0}
catch{
return!0}
})();
return sV.set(R,e),e}
async function rCR(T,R,a){
if(gNT(),T=await T,iCR(T)){
if(T instanceof File)return T;
return X$([await T.arrayBuffer()],T.name)}
if(cCR(T)){
let t=await T.blob();
return R||(R=new URL(T.url).pathname.split(/[\\/]/).pop()),X$(await lV(t),R,a)}
let e=await lV(T);
if(R||(R=FL(T)),!a?.type){
let t=e.find((r)=>typeof r==="object"&&("type"in r)&&r.type);
if(typeof t==="string")a={
...a,type:t}
}
return X$(e,R,a)}
async function lV(T){
let R=[];
if(typeof T==="string"||ArrayBuffer.isView(T)||T instanceof ArrayBuffer)R.push(T);
else if(jNT(T))R.push(T instanceof Blob?T:await T.arrayBuffer());
else if(R3T(T))for await(let a of T)R.push(...await lV(a));
else{
let a=T?.constructor?.name;
throw Error(`Unexpected data type: ${typeof T}${a?`; constructor: ${a}`:""}${hCR(T)}`)}
return R}
function hCR(T){
if(typeof T!=="object"||T===null)return"";
return`; props: [${Object.getOwnPropertyNames(T).map((R)=>`"${R}"`).join(", ")}]`}
class w0{
constructor(T){
this._client=T}
}
function ONT(T){
return T.replace(/[^A-Za-z0-9\-._~!$&'()*+,;
    =:@]+/g,encodeURIComponent)}
    function P7(T){
    return T!==void 0&&"function"in T&&T.function!==void 0}
    function a3T(T){
    return T?.$brand==="auto-parseable-response-format"}
    function jO(T){
    return T?.$brand==="auto-parseable-tool"}
    function nCR(T,R){
      if(!R||!dNT(R))return{
        ...T,choices:T.choices.map((a)=>{
          return ENT(a.message.tool_calls),{
            ...a,message:{
              ...a.message,parsed:null,...a.message.tool_calls?{
              tool_calls:a.message.tool_calls}
            :void 0}
        }
      }
    )}
      ;
    return e3T(T,R)}
    function e3T(T,R){
      let a=T.choices.map((e)=>{
        if(e.finish_reason==="length")throw new X8T;
        if(e.finish_reason==="content_filter")throw new Y8T;
        return ENT(e.message.tool_calls),{
          ...e,message:{
            ...e.message,...e.message.tool_calls?{
            tool_calls:e.message.tool_calls?.map((t)=>ACR(R,t))??void 0}
          :void 0,parsed:e.message.content&&!e.message.refusal?lCR(R,e.message.content):null}
      }
    }
    );
      return{
      ...T,choices:a}
  }
    function lCR(T,R){
      if(T.response_format?.type!=="json_schema")return null;
      if(T.response_format?.type==="json_schema"){
        if("$parseRaw"in T.response_format)return T.response_format.$parseRaw(R);
      return JSON.parse(R)}
    return null}
    function ACR(T,R){
      let a=T.tools?.find((e)=>P7(e)&&e.function?.name===R.function.name);
      return{
        ...R,function:{
        ...R.function,parsed_arguments:jO(a)?a.$parseRaw(R.function.arguments):a?.function.strict?JSON.parse(R.function.arguments):null}
    }
  }
    function pCR(T,R){
      if(!T||!("tools"in T)||!T.tools)return!1;
      let a=T.tools?.find((e)=>P7(e)&&e.function?.name===R.function.name);
    return P7(a)&&(jO(a)||a?.function.strict||!1)}
    function dNT(T){
      if(a3T(T.response_format))return!0;
    return T.tools?.some((R)=>jO(R)||R.type==="function"&&R.function.strict===!0)??!1}
    function ENT(T){
    for(let R of T||[])if(R.type!=="function")throw new Y0(`Currently only \`function\` tool calls are supported; Received \`${R.type}\``)}
    function _CR(T){
      for(let R of T??[]){
        if(R.type!=="function")throw new Y0(`Currently only \`function\` tool types support auto-parsing; Received \`${R.type}\``);
      if(R.function.strict!==!0)throw new Y0(`The \`${R.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`)}
  }
    class bU{
      constructor(){
        bV.add(this),this.controller=new AbortController,KL.set(this,void 0),VL.set(this,()=>{
      }
      ),e$.set(this,()=>{
      }
      ),t$.set(this,void 0),XL.set(this,()=>{
      }
      ),r$.set(this,()=>{
      }
      ),Lo.set(this,{
      }
      ),h$.set(this,!1),k7.set(this,!1),x7.set(this,!1),Sy.set(this,!1),b9(this,KL,new Promise((T,R)=>{
        b9(this,VL,T,"f"),b9(this,e$,R,"f")}
      ),"f"),b9(this,t$,new Promise((T,R)=>{
        b9(this,XL,T,"f"),b9(this,r$,R,"f")}
      ),"f"),bR(this,KL,"f").catch(()=>{
      }
      ),bR(this,t$,"f").catch(()=>{
      }
    )}
      _run(T){
        setTimeout(()=>{
          T().then(()=>{
          this._emitFinal(),this._emit("end")}
        ,bR(this,bV,"m",CNT).bind(this))}
      ,0)}
      _connected(){
        if(this.ended)return;
      bR(this,VL,"f").call(this),this._emit("connect")}
      get ended(){
      return bR(this,h$,"f")}
      get errored(){
      return bR(this,k7,"f")}
      get aborted(){
      return bR(this,x7,"f")}
      abort(){
      this.controller.abort()}
      on(T,R){
        return(bR(this,Lo,"f")[T]||(bR(this,Lo,"f")[T]=[])).push({
        listener:R}
    ),this}
      off(T,R){
        let a=bR(this,Lo,"f")[T];
        if(!a)return this;
        let e=a.findIndex((t)=>t.listener===R);
        if(e>=0)a.splice(e,1);
      return this}
      once(T,R){
        return(bR(this,Lo,"f")[T]||(bR(this,Lo,"f")[T]=[])).push({
        listener:R,once:!0}
    ),this}
      emitted(T){
        return new Promise((R,a)=>{
          if(b9(this,Sy,!0,"f"),T!=="error")this.once("error",a);
        this.once(T,R)}
    )}
      async done(){
      b9(this,Sy,!0,"f"),await bR(this,t$,"f")}
      _emit(T,...R){
        if(bR(this,h$,"f"))return;
        if(T==="end")b9(this,h$,!0,"f"),bR(this,XL,"f").call(this);
        let a=bR(this,Lo,"f")[T];
        if(a)bR(this,Lo,"f")[T]=a.filter((e)=>!e.once),a.forEach(({
        listener:e}
      )=>e(...R));
        if(T==="abort"){
          let e=R[0];
          if(!bR(this,Sy,"f")&&!a?.length)Promise.reject(e);
          bR(this,e$,"f").call(this,e),bR(this,r$,"f").call(this,e),this._emit("end");
        return}
        if(T==="error"){
          let e=R[0];
          if(!bR(this,Sy,"f")&&!a?.length)Promise.reject(e);
        bR(this,e$,"f").call(this,e),bR(this,r$,"f").call(this,e),this._emit("end")}
    }
      _emitFinal(){
    }
  }
    function bCR(T){
    return typeof T.parse==="function"}
    function uCR(T,R=Wa.ALL){
      if(typeof T!=="string")throw TypeError(`expecting str, got ${typeof T}`);
      if(!T.trim())throw Error(`${T} is empty`);
    return yCR(T.trim(),R)}
    function kCR(T,R){
      let{
      id:a,choices:e,created:t,model:r,system_fingerprint:h,...i}
      =T,c={
        ...i,id:a,choices:e.map(({
        message:s,finish_reason:A,index:l,logprobs:o,...n}
      )=>{
          if(!A)throw new Y0(`missing finish_reason for choice ${l}`);
          let{
          content:p=null,function_call:_,tool_calls:m,...b}
          =s,y=s.role;
          if(!y)throw new Y0(`missing role for choice ${l}`);
          if(_){
            let{
            arguments:u,name:P}
            =_;
            if(u==null)throw new Y0(`missing function_call.arguments for choice ${l}`);
            if(!P)throw new Y0(`missing function_call.name for choice ${l}`);
            return{
              ...n,message:{
                content:p,function_call:{
                arguments:u,name:P}
              ,role:y,refusal:s.refusal??null}
            ,finish_reason:A,index:l,logprobs:o}
        }
          if(m)return{
            ...n,index:l,finish_reason:A,logprobs:o,message:{
              ...b,role:y,content:p,refusal:s.refusal??null,tool_calls:m.map((u,P)=>{
                let{
                function:k,type:x,id:f,...v}
                =u,{
                arguments:g,name:I,...S}
                =k||{
              }
                ;
                if(f==null)throw new Y0(`missing choices[${l}].tool_calls[${P}].id
${gC(T)}`);
                if(x==null)throw new Y0(`missing choices[${l}].tool_calls[${P}].type
${gC(T)}`);
                if(I==null)throw new Y0(`missing choices[${l}].tool_calls[${P}].function.name
${gC(T)}`);
                if(g==null)throw new Y0(`missing choices[${l}].tool_calls[${P}].function.arguments
${gC(T)}`);
                return{
                  ...v,id:f,type:x,function:{
                  ...S,name:I,arguments:g}
              }
            }
          )}
        }
          ;
          return{
            ...n,message:{
            ...b,content:p,role:y,refusal:s.refusal??null}
          ,finish_reason:A,index:l,logprobs:o}
      }
      ),created:t,model:r,object:"chat.completion",...h?{
        system_fingerprint:h}
        :{
      }
    }
      ;
    return nCR(c,R)}
    function gC(T){
    return JSON.stringify(T)}
    function g_T(T){
    return}
    function $_T(T){
  }
    function*gCR(T){
      if(!T)return;
      if(i3T in T){
        let{
        values:e,nulls:t}
        =T;
        yield*e.entries();
        for(let r of t)yield[r,null];
      return}
      let R=!1,a;
      if(T instanceof Headers)a=T.entries();
      else if(rV(T))a=T;
      else R=!0,a=Object.entries(T??{
    }
    );
      for(let e of a){
        let t=e[0];
        if(typeof t!=="string")throw TypeError("expected header name to be a string");
        let r=rV(e[1])?e[1]:[e[1]],h=!1;
        for(let i of r){
          if(i===void 0)continue;
          if(R&&!h)h=!0,yield[t,null];
        yield[t,i]}
    }
  }
    function jCR(T){
  }
    function SCR(T,R){
      if(!R||!dCR(R))return{
        ...T,output_parsed:null,output:T.output.map((a)=>{
          if(a.type==="function_call")return{
          ...a,parsed_arguments:null}
          ;
          if(a.type==="message")return{
            ...a,content:a.content.map((e)=>({
            ...e,parsed:null}
        ))}
          ;
        else return a}
    )}
      ;
    return eUT(T,R)}
    function eUT(T,R){
      let a=T.output.map((t)=>{
        if(t.type==="function_call")return{
        ...t,parsed_arguments:LCR(R,t)}
        ;
        if(t.type==="message"){
          let r=t.content.map((h)=>{
            if(h.type==="output_text")return{
            ...h,parsed:OCR(R,h.text)}
            ;
          return h}
        );
          return{
          ...t,content:r}
      }
      return t}
    ),e=Object.assign({
    }
      ,T,{
      output:a}
    );
      if(!Object.getOwnPropertyDescriptor(T,"output_text"))BV(e);
      return Object.defineProperty(e,"output_parsed",{
        enumerable:!0,get(){
          for(let t of e.output){
            if(t.type!=="message")continue;
          for(let r of t.content)if(r.type==="output_text"&&r.parsed!==null)return r.parsed}
        return null}
    }
  ),e}
    function OCR(T,R){
      if(T.text?.format?.type!=="json_schema")return null;
      if("$parseRaw"in T.text?.format)return(T.text?.format).$parseRaw(R);
    return JSON.parse(R)}
    function dCR(T){
      if(a3T(T.text?.format))return!0;
    return!1}
    function ECR(T){
    return T?.$brand==="auto-parseable-tool"}
    function CCR(T,R){
    return T.find((a)=>a.type==="function"&&a.name===R)}
    function LCR(T,R){
      let a=CCR(T.tools??[],R.name);
      return{
      ...R,...R,parsed_arguments:ECR(a)?a.$parseRaw(R.arguments):a?.strict?JSON.parse(R.arguments):null}
  }
    function BV(T){
      let R=[];
      for(let a of T.output){
        if(a.type!=="message")continue;
      for(let e of a.content)if(e.type==="output_text")R.push(e.text)}
    T.output_text=R.join("")}
    function MCR(T,R){
    return SCR(T,R)}
    class _9{
      constructor({
      baseURL:T=Uu("OPENAI_BASE_URL"),apiKey:R=Uu("OPENAI_API_KEY"),organization:a=Uu("OPENAI_ORG_ID")??null,project:e=Uu("OPENAI_PROJECT_ID")??null,webhookSecret:t=Uu("OPENAI_WEBHOOK_SECRET")??null,...r}
      ={
    }
    ){
        if(GV.add(this),YL.set(this,void 0),this.completions=new s3T(this),this.chat=new g7(this),this.embeddings=new o3T(this),this.files=new n3T(this),this.images=new l3T(this),this.audio=new aP(this),this.moderations=new p3T(this),this.models=new A3T(this),this.fineTuning=new w_(this),this.graders=new M7(this),this.vectorStores=new av(this),this.webhooks=new b3T(this),this.beta=new D_(this),this.batches=new c3T(this),this.uploads=new w7(this),this.responses=new Tv(this),this.realtime=new J$(this),this.conversations=new S7(this),this.evals=new d7(this),this.containers=new j7(this),this.skills=new Rv(this),this.videos=new _3T(this),R===void 0)throw new Y0("Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.");
        let h={
        apiKey:R,organization:a,project:e,webhookSecret:t,...r,baseURL:T||"https://api.openai.com/v1"}
        ;
        if(!h.dangerouslyAllowBrowser&&MER())throw new Y0(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
`);
        this.baseURL=h.baseURL,this.timeout=h.timeout??KV.DEFAULT_TIMEOUT,this.logger=h.logger??console;
        let i="warn";
      this.logLevel=i,this.logLevel=y_T(h.logLevel,"ClientOptions.logLevel",this)??y_T(Uu("OPENAI_LOG"),"process.env['OPENAI_LOG']",this)??i,this.fetchOptions=h.fetchOptions,this.maxRetries=h.maxRetries??2,this.fetch=h.fetch??BER(),b9(this,YL,UER,"f"),this._options=h,this.apiKey=typeof R==="string"?R:"Missing Key",this.organization=a,this.project=e,this.webhookSecret=t}
      withOptions(T){
        return new this.constructor({
        ...this._options,baseURL:this.baseURL,maxRetries:this.maxRetries,timeout:this.timeout,logger:this.logger,logLevel:this.logLevel,fetch:this.fetch,fetchOptions:this.fetchOptions,apiKey:this.apiKey,organization:this.organization,project:this.project,webhookSecret:this.webhookSecret,...T}
    )}
      defaultQuery(){
      return this._options.defaultQuery}
      validateHeaders({
      values:T,nulls:R}
    ){
      return}
      async authHeaders(T){
        return S0([{
        Authorization:`Bearer ${this.apiKey}`}
      ])}
      stringifyQuery(T){
      return XER(T)}
      getUserAgent(){
      return`${this.constructor.name}/JS ${jy}`}
      defaultIdempotencyKey(){
      return`stainless-node-retry-${iNT()}`}
      makeStatusError(T,R,a,e){
      return $t.generate(T,R,a,e)}
      async _callApiKey(){
        let T=this._options.apiKey;
        if(typeof T!=="function")return!1;
        let R;
        try{
        R=await T()}
        catch(a){
          if(a instanceof Y0)throw a;
          throw new Y0(`Failed to get token from 'apiKey' function: ${a.message}`,{
          cause:a}
      )}
        if(typeof R!=="string"||!R)throw new Y0(`Expected 'apiKey' function argument to return a string but it returned ${R}`);
      return this.apiKey=R,!0}
      buildURL(T,R,a){
        let e=!bR(this,GV,"m",lUT).call(this)&&a||this.baseURL,t=OER(T)?new URL(T):new URL(e+(e.endsWith("/")&&T.startsWith("/")?T.slice(1):T)),r=this.defaultQuery(),h=Object.fromEntries(t.searchParams);
        if(!s_T(r)||!s_T(h))R={
        ...h,...r,...R}
        ;
        if(typeof R==="object"&&R&&!Array.isArray(R))t.search=this.stringifyQuery(R);
      return t.toString()}
      async prepareOptions(T){
      await this._callApiKey()}
      async prepareRequest(T,{
      url:R,options:a}
    ){
    }
      get(T,R){
      return this.methodRequest("get",T,R)}
      post(T,R){
      return this.methodRequest("post",T,R)}
      patch(T,R){
      return this.methodRequest("patch",T,R)}
      put(T,R){
      return this.methodRequest("put",T,R)}
      delete(T,R){
      return this.methodRequest("delete",T,R)}
      methodRequest(T,R,a){
        return this.request(Promise.resolve(a).then((e)=>{
          return{
          method:T,path:R,...e}
      }
    ))}
      request(T,R=null){
      return new J8T(this,this.makeRequest(T,R,void 0))}
      async makeRequest(T,R,a){
        let e=await T,t=e.maxRetries??this.maxRetries;
        if(R==null)R=t;
        await this.prepareOptions(e);
        let{
        req:r,url:h,timeout:i}
        =await this.buildRequest(e,{
        retryCount:t-R}
      );
        await this.prepareRequest(r,{
        url:h,options:e}
      );
        let c="log_"+(Math.random()*16777216|0).toString(16).padStart(6,"0"),s=a===void 0?"":`, retryOf: ${a}`,A=Date.now();
        if(De(this).debug(`[${c}] sending request`,j_({
        retryOfRequestLogID:a,method:e.method,url:h,options:e,headers:r.headers}
      )),e.signal?.aborted)throw new fh;
        let l=new AbortController,o=await this.fetchWithTimeout(h,r,i,l).catch(YK),n=Date.now();
        if(o instanceof globalThis.Error){
          let m=`retrying, ${R} attempts remaining`;
          if(e.signal?.aborted)throw new fh;
          let b=XK(o)||/timed? ?out/i.test(String(o)+("cause"in o?String(o.cause):""));
          if(R)return De(this).info(`[${c}] connection ${b?"timed out":"failed"} - ${m}`),De(this).debug(`[${c}] connection ${b?"timed out":"failed"} (${m})`,j_({
          retryOfRequestLogID:a,url:h,durationMs:n-A,message:o.message}
        )),this.retryRequest(e,R,a??c);
          if(De(this).info(`[${c}] connection ${b?"timed out":"failed"} - error; no more retries left`),De(this).debug(`[${c}] connection ${b?"timed out":"failed"} (error; no more retries left)`,j_({
          retryOfRequestLogID:a,url:h,durationMs:n-A,message:o.message}
        )),b)throw new lU;
          throw new V$({
          cause:o}
      )}
        let p=[...o.headers.entries()].filter(([m])=>m==="x-request-id").map(([m,b])=>", "+m+": "+JSON.stringify(b)).join(""),_=`[${c}${s}${p}] ${r.method} ${h} ${o.ok?"succeeded":"failed"} with status ${o.status} in ${n-A}ms`;
        if(!o.ok){
          let m=await this.shouldRetry(o);
          if(R&&m){
            let k=`retrying, ${R} attempts remaining`;
            return await NER(o.body),De(this).info(`${_} - ${k}`),De(this).debug(`[${c}] response error (${k})`,j_({
            retryOfRequestLogID:a,url:o.url,status:o.status,headers:o.headers,durationMs:n-A}
        )),this.retryRequest(e,R,a??c,o.headers)}
          let b=m?"error; no more retries left":"error; not retryable";
          De(this).info(`${_} - ${b}`);
          let y=await o.text().catch((k)=>YK(k).message),u=EER(y),P=u?void 0:y;
          throw De(this).debug(`[${c}] response error (${b})`,j_({
          retryOfRequestLogID:a,url:o.url,status:o.status,headers:o.headers,message:P,durationMs:Date.now()-A}
      )),this.makeStatusError(o.status,u,P,o.headers)}
        return De(this).info(_),De(this).debug(`[${c}] response start`,j_({
        retryOfRequestLogID:a,url:o.url,status:o.status,headers:o.headers,durationMs:n-A}
      )),{
        response:o,options:e,controller:l,requestLogID:c,retryOfRequestLogID:a,startTime:A}
    }
      getAPIList(T,R,a){
        return this.requestAPIList(R,a&&"then"in a?a.then((e)=>({
        method:"get",path:T,...e}
      )):{
        method:"get",path:T,...a}
    )}
      requestAPIList(T,R){
        let a=this.makeRequest(R,null,void 0);
      return new INT(this,a,T)}
      async fetchWithTimeout(T,R,a,e){
        let{
        signal:t,method:r,...h}
        =R||{
      }
        ,i=this._makeAbort(e);
        if(t)t.addEventListener("abort",i,{
        once:!0}
      );
        let c=setTimeout(i,a),s=globalThis.ReadableStream&&h.body instanceof globalThis.ReadableStream||typeof h.body==="object"&&h.body!==null&&Symbol.asyncIterator in h.body,A={
          signal:e.signal,...s?{
          duplex:"half"}
          :{
        }
        ,method:"GET",...h}
        ;
        if(r)A.method=r.toUpperCase();
        try{
        return await this.fetch.call(void 0,T,A)}
        finally{
        clearTimeout(c)}
    }
      async shouldRetry(T){
        let R=T.headers.get("x-should-retry");
        if(R==="true")return!0;
        if(R==="false")return!1;
        if(T.status===408)return!0;
        if(T.status===409)return!0;
        if(T.status===429)return!0;
        if(T.status>=500)return!0;
      return!1}
      async retryRequest(T,R,a,e){
        let t,r=e?.get("retry-after-ms");
        if(r){
          let i=parseFloat(r);
        if(!Number.isNaN(i))t=i}
        let h=e?.get("retry-after");
        if(h&&!t){
          let i=parseFloat(h);
          if(!Number.isNaN(i))t=i*1000;
        else t=Date.parse(h)-Date.now()}
        if(t===void 0){
          let i=T.maxRetries??this.maxRetries;
        t=this.calculateDefaultRetryTimeoutMillis(R,i)}
      return await $O(t),this.makeRequest(T,R-1,a)}
      calculateDefaultRetryTimeoutMillis(T,R){
        let a=R-T,e=Math.min(0.5*Math.pow(2,a),8),t=1-Math.random()*0.25;
      return e*t*1000}
      async buildRequest(T,{
      retryCount:R=0}
      ={
    }
    ){
        let a={
        ...T}
        ,{
        method:e,path:t,query:r,defaultBaseURL:h}
        =a,i=this.buildURL(t,r,h);
        if("timeout"in a)dER("timeout",a.timeout);
        a.timeout=a.timeout??this.timeout;
        let{
        bodyHeaders:c,body:s}
        =this.buildBody({
        options:a}
      ),A=await this.buildHeaders({
        options:T,method:e,bodyHeaders:c,retryCount:R}
      );
        return{
          req:{
            method:e,headers:A,...a.signal&&{
            signal:a.signal}
            ,...globalThis.ReadableStream&&s instanceof globalThis.ReadableStream&&{
            duplex:"half"}
            ,...s&&{
            body:s}
            ,...this.fetchOptions??{
          }
            ,...a.fetchOptions??{
          }
        }
        ,url:i,timeout:a.timeout}
    }
      async buildHeaders({
      options:T,method:R,bodyHeaders:a,retryCount:e}
    ){
        let t={
      }
        ;
        if(this.idempotencyHeader&&R!=="get"){
          if(!T.idempotencyKey)T.idempotencyKey=this.defaultIdempotencyKey();
        t[this.idempotencyHeader]=T.idempotencyKey}
        let r=S0([t,{
          Accept:"application/json","User-Agent":this.getUserAgent(),"X-Stainless-Retry-Count":String(e),...T.timeout?{
          "X-Stainless-Timeout":String(Math.trunc(T.timeout/1000))}
          :{
        }
        ,...wER(),"OpenAI-Organization":this.organization,"OpenAI-Project":this.project}
        ,await this.authHeaders(T),this._options.defaultHeaders,a,T.headers]);
      return this.validateHeaders(r),r.values}
      _makeAbort(T){
      return()=>T.abort()}
      buildBody({
        options:{
        body:T,headers:R}
    }
    ){
        if(!T)return{
        bodyHeaders:void 0,body:void 0}
        ;
        let a=S0([R]);
        if(ArrayBuffer.isView(T)||T instanceof ArrayBuffer||T instanceof DataView||typeof T==="string"&&a.values.has("content-type")||globalThis.Blob&&T instanceof globalThis.Blob||T instanceof FormData||T instanceof URLSearchParams||globalThis.ReadableStream&&T instanceof globalThis.ReadableStream)return{
        bodyHeaders:void 0,body:T}
        ;
        else if(typeof T==="object"&&((Symbol.asyncIterator in T)||(Symbol.iterator in T)&&("next"in T)&&typeof T.next==="function"))return{
        bodyHeaders:void 0,body:oNT(T)}
        ;
        else if(typeof T==="object"&&a.values.get("content-type")==="application/x-www-form-urlencoded")return{
          bodyHeaders:{
          "content-type":"application/x-www-form-urlencoded"}
        ,body:this.stringifyQuery(T)}
        ;
        else return bR(this,YL,"f").call(this,{
        body:T,headers:a}
    )}
  }
    function WCR(T,R){
      let a=T.pipe(L9((e)=>gh((async()=>{
        let t=await e.secrets.getToken("apiKey",e.settings.url);
        return{
        url:e.settings.url,apiKey:t}
    }
    )())),E9((e,t)=>e.url===t.url&&e.apiKey===t.apiKey),JR(({
      url:e,apiKey:t}
    )=>{
        if(!t)throw Error("API key not found. You must provide an API key in settings.");
        return new _9({
        apiKey:t,baseURL:new URL("/api/provider/openai/v1",e).toString(),defaultHeaders:R}
    )}
    ));
      return R?a:a.pipe(f3({
      shouldCountRefs:!0}
  ))}
    function uU(T,R,a){
    return m0(WCR(T.configService.config,a?.defaultHeaders),R)}
    function m3T(T,R,a){
      return{
        ...Xs(),[yc]:"amp.chat",...Vs(T),...R!=null?{
        [zA]:String(R)}
        :{
      }
        ,...a??{
      }
    }
  }
    function qCR(T){
    return T?.some((R)=>R.name===dr.OPENAI_FAST&&R.enabled)??!1}
    function u3T(T,R){
      if(T)return T;
    return qCR(R)?"fast":void 0}
    function AUT(T,R,a){
      let e=u3T(R,a);
    return qo(T)&&e==="fast"?"priority":void 0}
    function pUT(T){
      let R=new Set;
      return T.filter((a)=>{
        if(R.has(a.name))return!1;
      return R.add(a.name),!0}
    ).map((a)=>({
        type:"function",function:{
        name:a.name,description:a.description??"",parameters:a.inputSchema}
    }
  ))}
    function y3T(T){
      let R=[],{
      summaryBlock:a,index:e}
      =pm(T)??{
      summaryBlock:void 0,index:0}
      ;
      if(a&&a.summary.type==="message")R.push({
        role:"assistant",content:[{
        type:"text",text:a.summary.summary.trimEnd()}
      ]}
    );
      for(let t=e+(a?1:0);
      t<T.messages.length;
      t++){
        let r=T.messages[t];
        if(!r)continue;
        switch(r.role){
          case"user":{
            let h=[],i=[];
            if(r.fileMentions&&r.fileMentions.files.length>0)h.push({
            type:"text",text:$m(r.fileMentions)}
          );
            if(r.userState)h.push({
            type:"text",text:Ox(r.userState)}
          );
            for(let c of r.content)switch(c.type){
              case"tool_result":i.push({
              role:"tool",content:B7(c.run),tool_call_id:c.toolUseID.replace(/^toolu_/,"")}
            );
              break;
              case"image":{
                let s=ZN(c);
                if(s){
                  h.push({
                  type:"text",text:s}
                );
                break}
                if(h.push({
                type:"text",text:PO(c)}
              ),c.source.type==="url")h.push({
                  type:"image_url",image_url:{
                  url:c.source.url}
              }
              );
                else if(c.source.type==="base64")h.push({
                  type:"image_url",image_url:{
                  url:`data:${c.source.mediaType};base64,${c.source.data}`}
              }
              );
              break}
              case"text":if(c.text.trim())h.push({
              type:"text",text:c.text}
            );
            break}
            if(h.length>0)R.push({
            role:"user",content:h}
          );
            R.push(...i);
          break}
          case"assistant":{
            let h=r.content.filter((c)=>{
              if(c.type!=="thinking"&&c.type!=="redacted_thinking")return!0;
              let s="provider"in c?c.provider:void 0;
            return!s||s==="openai"}
          ).filter((c)=>c.type==="text"||c.type==="thinking").map((c)=>{
              if(c.type==="text")return{
              type:"text",text:c.text}
              ;
              else return{
              type:"text",text:`Thoughts: ${c.thinking}`}
          }
          ),i=r.content.filter((c)=>c.type==="tool_use"&&Va(c)).map((c)=>({
              id:c.id.replace(/^toolu_/,""),type:"function",function:{
              name:c.name,arguments:JSON.stringify(c.input)}
          }
          ));
            R.push({
            role:"assistant",content:h.length>0?h:null,tool_calls:i.length>0?i:void 0}
          );
          break}
          case"info":{
            let h=[];
            for(let i of r.content)if(i.type==="manual_bash_invocation"){
              let c=dx(i);
            h.push(...c)}
            else if(i.type==="text"&&i.text.trim().length>0)h.push({
            type:"text",text:i.text}
          );
            if(h.length>0)R.push({
            role:"user",content:h}
          );
          break}
      }
    }
    return JA(R)}
    function B7(T,R){
      if(T.status==="done"){
        let a=T.result;
        if(R&&typeof a==="object"&&a!==null){
          if("discoveredGuidanceFiles"in a){
            let{
            discoveredGuidanceFiles:e,...t}
            =a;
          a=t}
      }
      return typeof a==="string"?a:JSON.stringify(a)}
      else if(T.status==="error")return`<tool_execution_error>${T.error?.message||"Unknown error"}</tool_execution_error>`;
      else if(T.status==="cancelled")return"<tool_call_cancelled>Tool call was cancelled by the user</tool_call_cancelled>";
      else if(T.status==="rejected-by-user")return"<tool_rejection>User rejected the tool call, disallowing it from running</tool_rejection>";
    else return`<tool_status>${T.status}</tool_status>`}
    function SO(T,R){
      if(!T)T={
        id:R.id,model:R.model,finish_reason:null,message:{
        reasoning_content:null,content:null,refusal:null,role:"assistant",tool_calls:[]}
    }
      ;
      return Lt(T,(a)=>{
        if(R.usage)a.usage=R.usage;
        let e=R.choices[0];
        if(e){
          a.finish_reason=e.finish_reason??null;
          let t=e.delta.reasoning_content??e.delta.reasoning;
          if(t)a.message.reasoning_content=(a.message.reasoning_content??"")+t;
          if(e.delta.content)a.message.content=(a.message.content??"")+e.delta.content;
          if(e.delta.refusal)a.message.refusal=(a.message.refusal??"")+e.delta.refusal;
          for(let r of e.delta.tool_calls??[]){
            let h=a.message.tool_calls[r.index];
            a.message.tool_calls[r.index]={
              type:"function",id:h?.id??r.id??"",function:{
              name:h?.function.name??r.function?.name??"",arguments:(h?.function.arguments??"")+(r.function?.arguments??"")}
          }
        }
      }
    }
  )}
    function $k(T,R){
      function a(){
        let r=[];
        if(T.message.reasoning_content)r.push({
        type:"thinking",thinking:T.message.reasoning_content,signature:""}
      );
        if(T.message.content)r.push({
        type:"text",text:T.message.content}
      );
        for(let h of T.message.tool_calls)try{
          let i=JSON.parse(h.function.arguments);
          r.push({
          type:"tool_use",complete:!0,name:h.function.name,id:h.id.trim(),input:i}
      )}
        catch{
          let i=h.function.arguments||"{}";
          r.push({
            type:"tool_use",complete:!1,name:h.function.name,id:h.id.trim(),input:YN(i),inputPartialJSON:{
            json:i}
          ,inputIncomplete:u8T(i)}
      )}
      return r}
      function e(){
        let r=T.usage;
        if(!r)return;
        let h=r.prompt_tokens_details?.cached_tokens??0,i=r.prompt_tokens-h;
        return{
        model:T.model,maxInputTokens:R,inputTokens:0,cacheReadInputTokens:h,cacheCreationInputTokens:i,outputTokens:r.completion_tokens,totalInputTokens:r.prompt_tokens,timestamp:new Date().toISOString()}
    }
      function t(){
        switch(T.finish_reason){
          case"stop":return{
          type:"complete",stopReason:"end_turn"}
          ;
          case"length":return{
          type:"complete",stopReason:"max_tokens"}
          ;
          case"tool_calls":return{
          type:"complete",stopReason:"tool_use"}
          ;
          case"content_filter":return{
            type:"error",error:{
            message:`model refused to respond due to content filter: ${T.message.refusal??"content_filter"}`}
        }
          ;
          case"function_call":return{
            type:"error",error:{
            message:"model responded with deprecated stop reason 'function_call'"}
        }
          ;
          case null:return{
          type:"streaming"}
      }
    }
      return{
      role:"assistant",messageId:0,content:a(),state:t(),usage:e()}
  }
    function zCR(T){
    return T==="commentary"||T==="final_answer"}
    function FCR(T){
      if(typeof T!=="object"||T===null||!("phase"in T))return;
      let R=T.phase;
    return zCR(R)?R:void 0}
    function GCR(T,R){
      if(T.status==="cancelled"&&T.progress)return`The user cancelled the tool so it is no longer running. Progress until cancelation:
${YCR(T.progress)}
--- Tool was cancelled and is no longer running
`;
      if(T.status!=="done")return B7(T,R);
      let a=T.result;
      if(typeof a==="object"&&a!==null&&"isImage"in a&&a.isImage===!0&&"content"in a&&typeof a.content==="string"){
        let t=a.content,r=a.imageInfo??{
        mimeType:"image/png",size:Math.round(t.length*0.75)}
        ;
        return[{
        type:"input_text",text:`Image: ${a.absolutePath??"unknown"}`}
        ,{
        type:"input_image",detail:"auto",image_url:`data:${r.mimeType};base64,${t}`}
      ]}
      let e=KCR(a);
      if(e)return e;
    return B7(T,R)}
    function KCR(T){
      if(!Array.isArray(T)||T.length===0)return null;
      let R=!1,a=[];
      for(let e of T){
        if(VCR(e)){
          a.push({
          type:"input_text",text:e.text}
        );
        continue}
        if(XCR(e)){
          if(R=!0,e.savedPath)a.push({
          type:"input_text",text:`Generated image: ${e.savedPath}`}
        );
          a.push({
          type:"input_image",detail:"auto",image_url:`data:${e.mimeType};base64,${e.data}`}
        );
        continue}
      return null}
    return R?a:null}
    function VCR(T){
    return typeof T==="object"&&T!==null&&"type"in T&&T.type==="text"&&"text"in T&&typeof T.text==="string"}
    function XCR(T){
    return typeof T==="object"&&T!==null&&"type"in T&&T.type==="image"&&"mimeType"in T&&typeof T.mimeType==="string"&&"data"in T&&typeof T.data==="string"&&(!("savedPath"in T)||typeof T.savedPath==="string")}
    function YCR(T){
      if(!T)return"";
      if(typeof T==="string")return T;
      if(Array.isArray(T)&&T.length>0&&typeof T[0]==="object"){
        let R=T[0];
      if("tool_uses"in R||"message"in R)return QCR(T)}
      if(Array.isArray(T))return T.join(`
`);
      if(typeof T==="object"&&"output"in T&&typeof T.output==="string")return T.output;
    return bb(T,"progress")}
    function QCR(T){
      return T.map((R)=>{
        let a=[];
        if(R.message)a.push(R.message);
        if(R.tool_uses?.length)for(let e of R.tool_uses){
          let t=e.status==="done"?ZCR(e.result):`(${e.status})`;
        a.push(`- ${e.tool_name}: ${t}`)}
      return a.join(`
`)}
  ).join(`

`)}
    function ZCR(T){
      if(T===void 0||T===null)return"done";
      if(typeof T==="string")return T.length>200?T.slice(0,200)+"...":T;
      if(typeof T==="object"){
        let R=T;
        if("exitCode"in R){
          let e=typeof R.output==="string"?R.output:"",t=e.length>200?e.slice(0,200)+"...":e;
        return t?`exit ${R.exitCode}: ${t}`:`exit ${R.exitCode}`}
        let a=JSON.stringify(T);
      return a.length>200?a.slice(0,200)+"...":a}
    return String(T)}
    function JCR({
    model:T,status:R,usage:a,logger:e}
  ){
      let t=Ur(e);
      if(!a)return;
      let r=a.input_tokens_details.cached_tokens,h=a.input_tokens-r,i=E0T(T);
      if(!i)t.warn("[openai-responses] Unknown response model in usage data",{
      model:T}
    );
      let c=i??oN(P9.OPENAI);
      if(R==="completed"&&(a.input_tokens===0||a.output_tokens===0))t.warn("[openai-responses] Missing token counts in completed response",{
      model:T,rawInputTokens:a.input_tokens,rawOutputTokens:a.output_tokens,cachedTokens:r,cacheCreationInputTokens:h,outputTokensDetails:a.output_tokens_details}
    );
      return{
      model:T,maxInputTokens:c.contextWindow-c.maxOutputTokens,inputTokens:0,outputTokens:a.output_tokens,cacheCreationInputTokens:h,cacheReadInputTokens:r,totalInputTokens:a.input_tokens,timestamp:new Date().toISOString()}
  }
    class _UT{
      async*stream(T){
        let R=Ur(T.logger),a=Js(T.serviceAuthToken),e=await uU({
        configService:T.configService}
        ,T.signal,a?{
        defaultHeaders:a}
        :void 0),t=await T.configService.getLatest(T.signal),r=T.serverStatus&&X9(T.serverStatus)?T.serverStatus.features:void 0,h=AUT(T.thread.agentMode,t.settings["openai.speed"],r),i=await R4R({
        ...T,serviceTier:h}
      ),c,s=Date.now();
        try{
          R.info("[openai-responses] Creating Responses stream",{
          model:i.model,threadId:T.thread.id}
        ),c=await e.responses.create(i,{
            signal:T.signal,headers:{
              ...m3T(T.thread,void 0,T.requestHeaders),...a??{
            }
          }
        }
        ),R.info("[openai-responses] Responses.create returned",{
          model:i.model,threadId:T.thread.id}
      )}
        catch(y){
          if(xr(y))throw new DOMException("Aborted","AbortError");
        throw y}
        let A,l=0,o=Date.now(),n=Date.now(),p,_;
        R.info("[openai-responses] Stream started",{
        model:i.model,threadId:T.thread.id}
      );
        let m=30000,b;
        try{
          for await(let y of c){
            l++,b=y.type;
            let u=Date.now();
            if(p===void 0)p=u-s,R.info("[openai-responses] Time to first byte",{
            model:i.model,threadId:T.thread.id,firstEventType:y.type,timeToFirstByteMs:p}
          );
            let P=u-o;
            if(P>m)R.warn("[openai-responses] Long gap between events",{
            eventType:y.type,eventCount:l,timeSinceLastEventMs:P,totalElapsedMs:u-n}
          );
            if(o=u,A=e4R(A,y,R),A){
              let k=a4R(A,R),x=k.content.find((f)=>f.type==="text"&&f.text.length>0||f.type==="thinking"&&f.thinking.length>0||f.type==="tool_use");
              if(_===void 0&&x)_=u-s,R.info("[openai-responses] Time to first token",{
              model:i.model,threadId:T.thread.id,eventType:y.type,firstContentType:x.type,timeToFirstTokenMs:_}
            );
            yield k}
        }
          if(A&&A.status==="in_progress"&&!T.signal.aborted)throw R.warn("[openai-responses] Stream ended without terminal event",{
          eventCount:l,totalElapsedMs:Date.now()-n,timeToFirstByteMs:p,timeToFirstTokenMs:_,responseStatus:A.status,outputCount:A.output.length}
        ),Error("Response incomplete: stream ended unexpectedly");
          if(A&&A.status==="incomplete"){
            let y=A.incomplete_details?.reason??"unknown reason";
          throw Error(`Response incomplete: ${y}`)}
          R.info("[openai-responses] Stream completed",{
          eventCount:l,totalElapsedMs:Date.now()-n,timeToFirstByteMs:p,timeToFirstTokenMs:_}
      )}
        catch(y){
          throw R.error("[openai-responses] Stream error",{
          threadId:T.thread.id,eventCount:l,lastEventType:b,durationMs:Date.now()-n,timeToFirstByteMs:p,timeToFirstTokenMs:_,error:y instanceof Error?y.message:String(y),errorName:y instanceof Error?y.name:void 0}
      ),y}
    }
  }
    function T4R(T){
      let R=["none","minimal","low","medium","high","xhigh"];
      if(!T)return"medium";
    return R.includes(T)?T:"medium"}
    async function R4R({
    model:T,thread:R,systemPrompt:a,tools:e,reasoningEffort:t,serviceTier:r}
  ){
      let h=e,i=P3T(R),c=E0T(T)??oN(P9.OPENAI),s="auto",A=[{
      role:"system",content:a.map((p)=>p.text).join(`

`)}
      ,...O8(i)],l=c.maxOutputTokens,o=c.capabilities?.reasoning??!0,n={
        model:T,input:A,store:!1,include:["reasoning.encrypted_content"],tools:h.map(k3T),stream:!0,max_output_tokens:l,prompt_cache_key:R.id,parallel_tool_calls:!0,stream_options:{
        include_obfuscation:!1}
        ,...o?{
          reasoning:{
          effort:T4R(t),summary:"auto"}
      }
        :{
        temperature:0.1}
    }
      ;
      if(r){
        let p=n;
      p.service_tier=r}
    return n}
    function P3T(T){
      let R=[],{
      summaryBlock:a,index:e}
      =pm(T)??{
      summaryBlock:void 0,index:-1}
      ,t=e+1;
      if(a&&a.summary.type==="message")R.push({
      type:"message",role:"assistant",content:a.summary.summary.trimEnd()}
    );
      for(let r=t;
      r<T.messages.length;
      r++){
        let h=T.messages[r];
        if(!h)continue;
        switch(h.role){
          case"user":{
            let i=[],c=[],s=[];
            if(h.fileMentions&&h.fileMentions.files.length>0)i.push({
            type:"input_text",text:$m(h.fileMentions)}
          );
            if(h.userState)i.push({
            type:"input_text",text:Ox(h.userState)}
          );
            for(let A of h.content)switch(A.type){
              case"tool_result":{
                if(A.run?.status==="done"){
                  let l=A.run.result;
                if(typeof l==="object"&&l!==null&&"discoveredGuidanceFiles"in l&&Array.isArray(l.discoveredGuidanceFiles))s.push(...l.discoveredGuidanceFiles)}
                c.push({
                type:"function_call_output",call_id:A.toolUseID,output:GCR(A.run,!0)}
              );
              break}
              case"image":{
                let l=ZN(A);
                if(l){
                  i.push({
                  type:"input_text",text:l}
                );
                break}
                if(i.push({
                type:"input_text",text:PO(A)}
              ),A.source.type==="url")i.push({
                type:"input_image",detail:"auto",image_url:A.source.url}
              );
                else if(A.source.type==="base64")i.push({
                type:"input_image",detail:"auto",image_url:`data:${A.source.mediaType};base64,${A.source.data}`}
              );
              break}
              case"text":if(A.text.trim())i.push({
              type:"input_text",text:A.text}
            );
            break}
            if(h.discoveredGuidanceFiles)s.push(...h.discoveredGuidanceFiles);
            if(s.length>0)i.unshift({
            type:"input_text",text:Z9T(s,"deep")}
          );
            if(i.length>0)R.push({
            type:"message",role:"user",content:i}
          );
            R.push(...c);
          break}
          case"assistant":{
            let i=h.meta?.openAIResponsePhase,c=new Set;
            for(let s of h.content)if(s.type==="text"){
              let A={
              type:"message",role:"assistant",content:s.text}
              ;
              if(i)A.phase=i;
            R.push(A)}
            else if(s.type==="thinking"){
              let A=s.thinking.match(/<ENCRYPTED>([\s\S]*?)<\/ENCRYPTED><ID>([\s\S]*?)<\/ID>/),l=s.openAIReasoning?.encryptedContent??A?.[1]??"",o=s.openAIReasoning?.id??A?.[2]??"",n=s.openAIReasoning?s.thinking:s.thinking.replace(/<ENCRYPTED>[\s\S]*?<\/ENCRYPTED><ID>[\s\S]*?<\/ID>/g,"");
              if(o.length>0&&l.length>0&&!c.has(o)){
                c.add(o);
                let p=n.length>0?[{
                text:n,type:"summary_text"}
                ]:[];
                R.push({
                type:"reasoning",summary:p,encrypted_content:l,id:o}
            )}
          }
            else if(s.type==="tool_use")R.push({
            type:"function_call",name:s.name,call_id:s.id,arguments:JSON.stringify(s.input)}
          );
          break}
          case"info":{
            let i=[];
            for(let c of h.content)if(c.type==="manual_bash_invocation"){
              let s=dx(c);
              for(let A of s)i.push({
              type:"input_text",text:A.text}
          )}
            else if(c.type==="text"&&c.text.trim().length>0)i.push({
            type:"input_text",text:c.text}
          );
            if(i.length>0)R.push({
            type:"message",role:"user",content:i}
          );
          break}
      }
    }
    return JA(R)}
    function k3T(T){
      let R=T.inputSchema?.properties??{
    }
      ,a=T.inputSchema?.required??[],e={
      type:T.inputSchema?.type??"object",properties:R,required:a,additionalProperties:!0}
      ;
      return{
      type:"function",name:T.name,description:T.description||"",parameters:e,strict:!1}
  }
    function a4R(T,R){
      function a(h){
        if(h.incomplete_details?.reason==="max_output_tokens")return"max_tokens";
        if(h.incomplete_details?.reason==="content_filter")return"refusal";
        if(h.output.some((i)=>i.type==="function_call"))return"tool_use";
      return"end_turn"}
      function e(h){
        return JCR({
        model:T.model,status:T.status,usage:h,logger:R}
    )}
      function t(h,i){
        let c=[];
        for(let[s,A]of h.entries()){
          let l=i?.[s],o={
            ...l?.startTime!==void 0?{
            startTime:l.startTime}
            :{
          }
            ,...l?.finalTime!==void 0?{
            finalTime:l.finalTime}
            :{
          }
        }
          ;
          switch(A.type){
            case"message":for(let n of A.content)if(n.type==="refusal")c.push({
            type:"text",text:n.refusal,...o}
          );
            else c.push({
            type:"text",text:n.text,...o}
          );
            break;
            case"function_call":try{
              let n=JSON.parse(A.arguments);
              c.push({
              type:"tool_use",complete:!0,id:A.call_id,name:A.name,input:n,...o}
          )}
            catch{
              c.push({
                type:"tool_use",complete:!1,id:A.call_id,name:A.name,inputPartialJSON:{
                json:A.arguments}
              ,input:YN(A.arguments||"{}"),inputIncomplete:u8T(A.arguments||"{}"),...o}
          )}
            break;
            case"reasoning":{
              let n=A.summary&&A.summary.length>0?A.summary.map((p)=>p.text):(A.content??[]).filter((p)=>p.type==="reasoning_text").map((p)=>p.text);
              if(n.length===0&&A.encrypted_content&&A.id){
                c.push({
                  type:"thinking",thinking:"",signature:A.encrypted_content,provider:"openai",openAIReasoning:{
                  id:A.id,encryptedContent:A.encrypted_content}
                ,...o}
              );
              break}
              for(let p of n)c.push({
                type:"thinking",thinking:p,signature:A.encrypted_content??"",provider:"openai",...A.encrypted_content&&A.id?{
                  openAIReasoning:{
                  id:A.id,encryptedContent:A.encrypted_content}
              }
                :{
              }
              ,...o}
            );
            break}
          case"file_search_call":case"web_search_call":case"computer_call":case"image_generation_call":case"code_interpreter_call":case"local_shell_call":case"mcp_call":case"mcp_list_tools":case"mcp_approval_request":case"custom_tool_call":throw Error(`unsupported content block type ${A.type}`)}
      }
      return c}
      function r(h){
        switch(h.status){
          case"completed":return{
          type:"complete",stopReason:a(h)}
          ;
          case"in_progress":return{
          type:"streaming"}
          ;
          case"failed":return{
            type:"error",error:h.error??{
            message:"unknown"}
        }
          ;
          case"incomplete":return{
            type:"error",error:{
            message:`Response incomplete: ${h.incomplete_details?.reason??"unknown reason"}`}
        }
          ;
          case"cancelled":return{
          type:"cancelled"}
          ;
          default:return{
          type:"streaming"}
      }
    }
      return{
        role:"assistant",messageId:0,content:t(T.output,T[Mo]),meta:(()=>{
          let h=[...T.output].reverse().map(FCR).find((i)=>i!==void 0);
          if(!h)return;
          return{
          openAIResponsePhase:h}
      }
    )(),state:r(T),usage:e(T.usage)}
  }
    function e4R(T,R,a){
      let e=Ur(a);
      return Lt(T,(t)=>{
        if(!t){
          if(R.type!=="response.created")throw Error(`When snapshot hasn't been set yet, expected 'response.created' event, got ${R.type}`);
          return e.info("[openai-responses] response.created",{
          responseId:R.response.id,model:R.response.model,status:R.response.status}
      ),R.response}
        if(R.type==="keepalive"){
          e.info("[openai-responses] got keep alive event");
        return}
        switch(R.type){
          case"response.output_item.added":{
            let r=Date.now(),h=t[Mo]??=[],i=h[R.output_index];
            if(R.item.type==="function_call")e.debug("[openai-responses] function_call item added",{
            name:R.item.name,hasName:!!R.item.name,callId:R.item.call_id,outputIndex:R.output_index}
          );
            h[R.output_index]={
              startTime:i?.startTime??r,...i?.finalTime!==void 0?{
              finalTime:i.finalTime}
              :{
            }
          }
            ,t.output[R.output_index]=R.item;
          break}
          case"response.output_item.done":{
            let r=Date.now(),h=t[Mo]??=[],i=h[R.output_index];
            if(!t.output[R.output_index])throw Error(`missing output at index ${R.output_index}`);
            h[R.output_index]={
            startTime:i?.startTime??r,finalTime:r}
            ,t.output[R.output_index]=R.item;
          break}
          case"response.function_call_arguments.delta":{
            let r=t.output[R.output_index];
            if(!r)throw Error(`missing output at index ${R.output_index}`);
            if(r.type!=="function_call")throw Error(`expected output to be 'function_call', got ${r.type}`);
            r.arguments+=R.delta;
          break}
          case"response.function_call_arguments.done":{
            let r=t.output[R.output_index];
            if(!r)throw Error(`missing output at index ${R.output_index}`);
            if(r.type!=="function_call")throw Error(`expected output to be 'function_call', got ${r.type}`);
            e.debug("[openai-responses] function_call arguments done",{
            eventName:R.name,existingName:r.name,nameChanged:r.name!==R.name,outputIndex:R.output_index}
          ),r.arguments=R.arguments,r.name=R.name;
          break}
          case"response.content_part.added":{
            let r=t.output[R.output_index];
            if(!r)throw Error(`missing output at index ${R.output_index}`);
            if(r.type==="message"&&(R.part.type==="output_text"||R.part.type==="refusal"))r.content[R.content_index]=R.part;
            else if(r.type==="reasoning"&&R.part.type==="reasoning_text"){
              if(!r.content)r.content=[];
              r.content[R.conten

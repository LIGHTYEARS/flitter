// Module: emit-warning
// Original: MIR
// Type: CJS (RT wrapper)
// Exports: emitWarning
// Category: util

// Module: MIR (CJS)
()=>{if(!globalThis.ReadableStream)try{let T=qT("node:process"),{emitWarning:R}=T;
try{T.emitWarning=()=>{},Object.assign(globalThis,qT("node:stream/web")),T.emitWarning=R}catch(a){throw T.emitWarning=R,a}}catch(T){Object.assign(globalThis,LIR())}try{let{Blob:T}=qT("buffer");
if(T&&!T.prototype.stream)T.prototype.stream=function(R){let a=0,e=this;
return new ReadableStream({type:"bytes",async pull(t){let r=await e.slice(a,Math.min(e.size,a+65536)).arrayBuffer();
if(a+=r.byteLength,t.enqueue(new Uint8Array(r)),a===e.size)t.close()}})}}catch(T){}}
// Module: logger
// Original: rR
// Type: ESM (PT wrapper)
// Exports: J, P2, fD, hiT, xl
// Category: util

// Module: rR (ESM)
()=>{P2=c0(n0(),1),hiT={error:(T,...R)=>console.error(T,...R),warn:(T,...R)=>console.warn(T,...R),info:(T,...R)=>console.info(T,...R),debug:(T,...R)=>{if(ynR())console.debug(T,...R)},audit:(T,...R)=>{let a=R.length>0?R[0]:{};
if(typeof a==="object"&&a!==null&&!("audit"in a))a.audit=!0;
let e=P2.trace.getActiveSpan();
if(e){let t=e.spanContext();
if(t.traceId)a.traceId=t.traceId,a.spanId=t.spanId}console.info(T,a)}},xl=hiT,fD={error:(T,...R)=>xl.error(T,...R),warn:(T,...R)=>xl.warn(T,...R),info:(T,...R)=>xl.info(T,...R),debug:(T,...R)=>xl.debug(T,...R),audit:(T,...R)=>xl.audit(T,...R)},J=fD}
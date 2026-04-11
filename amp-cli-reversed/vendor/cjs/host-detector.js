// Module: host-detector
// Original: FeR
// Type: CJS (RT wrapper)
// Exports: hostDetector, osDetector, processDetector, serviceInstanceIdDetector
// Category: util

// Module: feR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.callWithTimeout=T.TimeoutError=void 0;
class R extends Error{constructor(e){super(e);
Object.setPrototypeOf(this,R.prototype)}}T.TimeoutError=R;
function a(e,t){let r,h=new Promise(function(i,c){r=setTimeout(function(){c(new R("Operation timed out."))},t)});
return Promise.race([e,h]).then((i)=>{return clearTimeout(r),i},(i)=>{throw clearTimeout(r),i})}T.callWithTimeout=a}
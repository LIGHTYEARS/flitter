// Module: host-detector-2
// Original: UeR
// Type: CJS (RT wrapper)
// Exports: hostDetector
// Category: util

// Module: ueR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.validateValue=T.validateKey=void 0;
var R="[_0-9a-z-*/]",a=`[a-z]${R}{0,255}`,e=`[a-z0-9]${R}{0,240}@[a-z]${R}{0,13}`,t=new RegExp(`^(?:${a}|${e})$`),r=/^[ -~]{0,255}[!-~]$/,h=/,|=/;function i(s){return t.test(s)}T.validateKey=i;function c(s){return r.test(s)&&!h.test(s)}T.validateValue=c}
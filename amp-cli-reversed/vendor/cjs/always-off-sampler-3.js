// Module: always-off-sampler-3
// Original: yZ
// Type: CJS (RT wrapper)
// Exports: AlwaysOffSampler
// Category: util

// Module: yZ (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.AlwaysOffSampler=void 0;
var R=NB();
class a{shouldSample(){return{decision:R.SamplingDecision.NOT_RECORD}}toString(){return"AlwaysOffSampler"}}T.AlwaysOffSampler=a}
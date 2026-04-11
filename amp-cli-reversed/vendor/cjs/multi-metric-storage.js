// Module: multi-metric-storage
// Original: vtR
// Type: CJS (RT wrapper)
// Exports: MultiMetricStorage
// Category: util

// Module: vtR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.MultiMetricStorage=void 0;
class R{_backingStorages;
constructor(a){this._backingStorages=a}record(a,e,t,r){this._backingStorages.forEach((h)=>{h.record(a,e,t,r)})}}T.MultiMetricStorage=R}
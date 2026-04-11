// Module: unknown-YrR
// Original: YrR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: yrR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.JsonLogsSerializer=void 0;
var R=ivT();
T.JsonLogsSerializer={serializeRequest:(a)=>{let e=(0,R.createExportLogsServiceRequest)(a,{useHex:!0,useLongBits:!1});
return new TextEncoder().encode(JSON.stringify(e))},deserializeResponse:(a)=>{if(a.length===0)return{};
return JSON.parse(new TextDecoder().decode(a))}}}
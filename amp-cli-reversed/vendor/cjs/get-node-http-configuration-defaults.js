// Module: get-node-http-configuration-defaults
// Original: vZ
// Type: CJS (RT wrapper)
// Exports: getNodeHttpConfigurationDefaults, httpAgentFactoryFromOptions, mergeOtlpNodeHttpConfigurationWithDefaults
// Category: util

// Module: vZ (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.getNodeHttpConfigurationDefaults=T.mergeOtlpNodeHttpConfigurationWithDefaults=T.httpAgentFactoryFromOptions=void 0;
var R=$rR();
function a(r){return async(h)=>{let i=h==="http:",c=i?import("http"):import("https"),{Agent:s}=await c;
if(i){let{ca:A,cert:l,key:o,...n}=r;
return new s(n)}return new s(r)}}T.httpAgentFactoryFromOptions=a;
function e(r,h,i){return{...(0,R.mergeOtlpHttpConfigurationWithDefaults)(r,h,i),agentFactory:r.agentFactory??h.agentFactory??i.agentFactory,userAgent:r.userAgent}}T.mergeOtlpNodeHttpConfigurationWithDefaults=e;
function t(r,h){return{...(0,R.getHttpConfigurationDefaults)(r,h),agentFactory:a({keepAlive:!0})}}T.getNodeHttpConfigurationDefaults=t}
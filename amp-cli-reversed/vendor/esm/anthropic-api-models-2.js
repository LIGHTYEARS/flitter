// Module: anthropic-api-models-2
// Original: WlT
// Type: ESM (PT wrapper)
// Exports: a, rK
// Category: npm-pkg

// Module: WlT (ESM)
()=>{En(),Mi(),gm(),rK=class extends Li{retrieve(R,a={},e){let{betas:t}=a??{};
return this._client.get(xe`/v1/models/${R}?beta=true`,{...e,headers:i8([{...t?.toString()!=null?{"anthropic-beta":t?.toString()}:void 0},e?.headers])})}list(R={},a){let{betas:e,...t}=R??{};return this._client.getAPIList("/v1/models?beta=true",Sx,{query:t,...a,headers:i8([{...e?.toString()!=null?{"anthropic-beta":e?.toString()}:void 0},a?.headers])})}}}
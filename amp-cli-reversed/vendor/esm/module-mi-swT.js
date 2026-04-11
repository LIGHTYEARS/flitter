// Module: module-mi-swT
// Original: swT
// Type: ESM (PT wrapper)
// Exports: oK
// Category: util

// Module: swT (ESM)
()=>{Mi(),oK=class extends Li{create(R,a){let{betas:e,...t}=R;
return this._client.post("/v1/complete",{body:t,timeout:this._client._options.timeout??600000,...a,headers:i8([{...e?.toString()!=null?{"anthropic-beta":e?.toString()}:void 0},a?.headers]),stream:R.stream??!1})}}}
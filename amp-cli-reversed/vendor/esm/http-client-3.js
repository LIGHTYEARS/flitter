// Module: http-client-3
// Original: oAT
// Type: ESM (PT wrapper)
// Exports: nK
// Category: util

// Module: oAT (ESM)
()=>{En(),Mi(),iwT(),mO(),gm(),nK=class extends Li{create(R,a){return this._client.post("/v1/messages/batches",{body:R,...a})}retrieve(R,a){return this._client.get(xe`/v1/messages/batches/${R}`,a)}list(R={},a){return this._client.getAPIList("/v1/messages/batches",Sx,{query:R,...a})}delete(R,a){return this._client.delete(xe`/v1/messages/batches/${R}`,a)}cancel(R,a){return this._client.post(xe`/v1/messages/batches/${R}/cancel`,a)}async results(R,a){let e=await this.retrieve(R);if(!e.results_url)throw new f9(`No batch \`results_url\`; Has it finished processing? ${e.processing_status} - ${e.id}`);return this._client.get(e.results_url,{...a,headers:i8([{Accept:"application/binary"},a?.headers]),stream:!0,__binaryResponse:!0})._thenUnwrap((t,r)=>m8T.fromResponse(r.response,r.controller))}}}
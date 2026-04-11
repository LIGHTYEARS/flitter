// Module: http-client-2
// Original: n8T
// Type: ESM (PT wrapper)
// Exports: e, eI, o8T
// Category: util

// Module: n8T (ESM)
()=>{Tp(),G7T(),o8T=class T extends Promise{constructor(R,a,e=z7T){super((t)=>{t(null)});
this.responsePromise=a,this.parseResponse=e,eI.set(this,void 0),$0(this,eI,R,"f")}_thenUnwrap(R){return new T(mR(this,eI,"f"),this.responsePromise,async(a,e)=>F7T(R(await this.parseResponse(a,e),e),e.response))}asResponse(){return this.responsePromise.then((R)=>R.response)}async withResponse(){let[R,a]=await Promise.all([this.parse(),this.asResponse()]);
return{data:R,response:a,request_id:a.headers.get("request-id")}}parse(){if(!this.parsedPromise)this.parsedPromise=this.responsePromise.then((R)=>this.parseResponse(mR(this,eI,"f"),R));
return this.parsedPromise}then(R,a){return this.parse().then(R,a)}catch(R){return this.parse().catch(R)}finally(R){return this.parse().finally(R)}},eI=new WeakMap}
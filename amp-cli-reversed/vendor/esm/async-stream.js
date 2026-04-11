// Module: async-stream
// Original: En
// Type: ESM (PT wrapper)
// Exports: K7T, Sx, Vq, l8T
// Category: util

// Module: En (ESM)
()=>{Tp(),Ii(),G7T(),n8T(),yk(),Vq=class{constructor(R,a,e,t){QE.set(this,void 0),$0(this,QE,R,"f"),this.options=t,this.response=a,this.body=e}hasNextPage(){if(!this.getPaginatedItems().length)return!1;
return this.nextPageRequestOptions()!=null}async getNextPage(){let R=this.nextPageRequestOptions();
if(!R)throw new f9("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
return await mR(this,QE,"f").requestAPIList(this.constructor,R)}async*iterPages(){let R=this;
yield R;
while(R.hasNextPage())R=await R.getNextPage(),yield R}async*[(QE=new WeakMap,Symbol.asyncIterator)](){for await(let R of this.iterPages())for(let a of R.getPaginatedItems())yield a}},K7T=class extends o8T{constructor(R,a,e){super(R,a,async(t,r)=>new e(t,r.response,await z7T(t,r),r.options))}async*[Symbol.asyncIterator](){let R=await this;
for await(let a of R)yield a}},Sx=class extends Vq{constructor(R,a,e,t){super(R,a,e,t);
this.data=e.data||[],this.has_more=e.has_more||!1,this.first_id=e.first_id||null,this.last_id=e.last_id||null}getPaginatedItems(){return this.data??[]}hasNextPage(){if(this.has_more===!1)return!1;
return super.hasNextPage()}nextPageRequestOptions(){if(this.options.query?.before_id){let a=this.first_id;
if(!a)return null;
return{...this.options,query:{...Kq(this.options.query),before_id:a}}}let R=this.last_id;
if(!R)return null;
return{...this.options,query:{...Kq(this.options.query),after_id:R}}}},l8T=class extends Vq{constructor(R,a,e,t){super(R,a,e,t);
this.data=e.data||[],this.has_more=e.has_more||!1,this.next_page=e.next_page||null}getPaginatedItems(){return this.data??[]}hasNextPage(){if(this.has_more===!1)return!1;
return super.hasNextPage()}nextPageRequestOptions(){let R=this.next_page;
if(!R)return null;
return{...this.options,query:{...Kq(this.options.query),page:R}}}}}
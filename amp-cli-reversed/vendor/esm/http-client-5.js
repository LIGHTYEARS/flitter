// Module: http-client-5
// Original: q7T
// Type: ESM (PT wrapper)
// Exports: a, c, e, kk, r, t
// Category: util

// Module: q7T (ESM)
()=>{Tp(),Ii(),U7T(),yk(),s8T(),Ii(),kk=class T{constructor(R,a,e){this.iterator=R,aI.set(this,void 0),this.controller=a,$0(this,aI,e,"f")}static fromSSEResponse(R,a,e){let t=!1,r=e?It(e):console;
async function*h(){if(t)throw new f9("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
t=!0;
let i=!1;
try{for await(let c of zxR(R,a)){if(c.event==="completion")try{yield JSON.parse(c.data)}catch(s){throw r.error("Could not parse message into JSON:",c.data),r.error("From chunk:",c.raw),s}if(c.event==="message_start"||c.event==="message_delta"||c.event==="message_stop"||c.event==="content_block_start"||c.event==="content_block_delta"||c.event==="content_block_stop")try{yield JSON.parse(c.data)}catch(s){throw r.error("Could not parse message into JSON:",c.data),r.error("From chunk:",c.raw),s}if(c.event==="ping")continue;
if(c.event==="error")throw new pr(void 0,w7T(c.data)??c.data,void 0,R.headers)}i=!0}catch(c){if(Wj(c))return;
throw c}finally{if(!i)a.abort()}}return new T(h,a,e)}static fromReadableStream(R,a,e){let t=!1;
async function*r(){let i=new Pk,c=i8T(R);
for await(let s of c)for(let A of i.decode(s))yield A;
for(let s of i.flush())yield s}async function*h(){if(t)throw new f9("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
t=!0;
let i=!1;
try{for await(let c of r()){if(i)continue;
if(c)yield JSON.parse(c)}i=!0}catch(c){if(Wj(c))return;
throw c}finally{if(!i)a.abort()}}return new T(h,a,e)}[(aI=new WeakMap,Symbol.asyncIterator)](){return this.iterator()}tee(){let R=[],a=[],e=this.iterator(),t=(r)=>{return{next:()=>{if(r.length===0){let h=e.next();
R.push(h),a.push(h)}return r.shift()}}};
return[new T(()=>t(R),this.controller,mR(this,aI,"f")),new T(()=>t(a),this.controller,mR(this,aI,"f"))]}toReadableStream(){let R=this,a;
return B7T({async start(){a=R[Symbol.asyncIterator]()},async pull(e){try{let{value:t,done:r}=await a.next();
if(r)return e.close();
let h=c8T(JSON.stringify(t)+`
`);
e.enqueue(h)}catch(t){e.error(t)}},async cancel(){await a.return?.()}})}}}
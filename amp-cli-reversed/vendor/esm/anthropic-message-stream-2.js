// Module: anthropic-message-stream-2
// Original: sfR
// Type: ESM (PT wrapper)
// Exports: Cu, Fh, Fp, GlT, JE, KlT, Qq, RC, TC, Xq, Yq, ZE, Zq, a, aC, cI, e, eC, hI, hwT, iI, r, rI, sI, t, tC, tI, yo
// Category: npm-pkg

// Module: sfR (ESM)
()=>{Tp(),QN(),mO(),rwT(),twT(),hwT=class T{constructor(R,a){Fh.add(this),this.messages=[],this.receivedMessages=[],Qn.set(this,void 0),Cu.set(this,null),this.controller=new AbortController,tI.set(this,void 0),ZE.set(this,()=>{}),rI.set(this,()=>{}),hI.set(this,void 0),JE.set(this,()=>{}),iI.set(this,()=>{}),yo.set(this,{}),cI.set(this,!1),TC.set(this,!1),RC.set(this,!1),Fp.set(this,!1),aC.set(this,void 0),eC.set(this,void 0),sI.set(this,void 0),tC.set(this,(e)=>{if($0(this,TC,!0,"f"),Wj(e))e=new pi;
if(e instanceof pi)return $0(this,RC,!0,"f"),this._emit("abort",e);
if(e instanceof f9)return this._emit("error",e);
if(e instanceof Error){let t=new f9(e.message);
return t.cause=e,this._emit("error",t)}return this._emit("error",new f9(String(e)))}),$0(this,tI,new Promise((e,t)=>{$0(this,ZE,e,"f"),$0(this,rI,t,"f")}),"f"),$0(this,hI,new Promise((e,t)=>{$0(this,JE,e,"f"),$0(this,iI,t,"f")}),"f"),mR(this,tI,"f").catch(()=>{}),mR(this,hI,"f").catch(()=>{}),$0(this,Cu,R,"f"),$0(this,sI,a?.logger??console,"f")}get response(){return mR(this,aC,"f")}get request_id(){return mR(this,eC,"f")}async withResponse(){$0(this,Fp,!0,"f");
let R=await mR(this,tI,"f");
if(!R)throw Error("Could not resolve a `Response` object");
return{data:this,response:R,request_id:R.headers.get("request-id")}}static fromReadableStream(R){let a=new T(null);
return a._run(()=>a._fromReadableStream(R)),a}static createMessage(R,a,e,{logger:t}={}){let r=new T(a,{logger:t});
for(let h of a.messages)r._addMessageParam(h);
return $0(r,Cu,{...a,stream:!0},"f"),r._run(()=>r._createMessage(R,{...a,stream:!0},{...e,headers:{...e?.headers,"X-Stainless-Helper-Method":"stream"}})),r}_run(R){R().then(()=>{this._emitFinal(),this._emit("end")},mR(this,tC,"f"))}_addMessageParam(R){this.messages.push(R)}_addMessage(R,a=!0){if(this.receivedMessages.push(R),a)this._emit("message",R)}async _createMessage(R,a,e){let t=e?.signal,r;
if(t){if(t.aborted)this.controller.abort();
r=this.controller.abort.bind(this.controller),t.addEventListener("abort",r)}try{mR(this,Fh,"m",Yq).call(this);
let{response:h,data:i}=await R.create({...a,stream:!0},{...e,signal:this.controller.signal}).withResponse();
this._connected(h);
for await(let c of i)mR(this,Fh,"m",Qq).call(this,c);
if(i.controller.signal?.aborted)throw new pi;
mR(this,Fh,"m",Zq).call(this)}finally{if(t&&r)t.removeEventListener("abort",r)}}_connected(R){if(this.ended)return;
$0(this,aC,R,"f"),$0(this,eC,R?.headers.get("request-id"),"f"),mR(this,ZE,"f").call(this,R),this._emit("connect")}get ended(){return mR(this,cI,"f")}get errored(){return mR(this,TC,"f")}get aborted(){return mR(this,RC,"f")}abort(){this.controller.abort()}on(R,a){return(mR(this,yo,"f")[R]||(mR(this,yo,"f")[R]=[])).push({listener:a}),this}off(R,a){let e=mR(this,yo,"f")[R];
if(!e)return this;
let t=e.findIndex((r)=>r.listener===a);
if(t>=0)e.splice(t,1);
return this}once(R,a){return(mR(this,yo,"f")[R]||(mR(this,yo,"f")[R]=[])).push({listener:a,once:!0}),this}emitted(R){return new Promise((a,e)=>{if($0(this,Fp,!0,"f"),R!=="error")this.once("error",e);
this.once(R,a)})}async done(){$0(this,Fp,!0,"f"),await mR(this,hI,"f")}get currentMessage(){return mR(this,Qn,"f")}async finalMessage(){return await this.done(),mR(this,Fh,"m",Xq).call(this)}async finalText(){return await this.done(),mR(this,Fh,"m",GlT).call(this)}_emit(R,...a){if(mR(this,cI,"f"))return;
if(R==="end")$0(this,cI,!0,"f"),mR(this,JE,"f").call(this);
let e=mR(this,yo,"f")[R];
if(e)mR(this,yo,"f")[R]=e.filter((t)=>!t.once),e.forEach(({listener:t})=>t(...a));
if(R==="abort"){let t=a[0];
if(!mR(this,Fp,"f")&&!e?.length)Promise.reject(t);
mR(this,rI,"f").call(this,t),mR(this,iI,"f").call(this,t),this._emit("end");
return}if(R==="error"){let t=a[0];
if(!mR(this,Fp,"f")&&!e?.length)Promise.reject(t);
mR(this,rI,"f").call(this,t),mR(this,iI,"f").call(this,t),this._emit("end")}}_emitFinal(){if(this.receivedMessages.at(-1))this._emit("finalMessage",mR(this,Fh,"m",Xq).call(this))}async _fromReadableStream(R,a){let e=a?.signal,t;
if(e){if(e.aborted)this.controller.abort();
t=this.controller.abort.bind(this.controller),e.addEventListener("abort",t)}try{mR(this,Fh,"m",Yq).call(this),this._connected(null);
let r=kk.fromReadableStream(R,this.controller);
for await(let h of r)mR(this,Fh,"m",Qq).call(this,h);
if(r.controller.signal?.aborted)throw new pi;
mR(this,Fh,"m",Zq).call(this)}finally{if(e&&t)e.removeEventListener("abort",t)}}[(Qn=new WeakMap,Cu=new WeakMap,tI=new WeakMap,ZE=new WeakMap,rI=new WeakMap,hI=new WeakMap,JE=new WeakMap,iI=new WeakMap,yo=new WeakMap,cI=new WeakMap,TC=new WeakMap,RC=new WeakMap,Fp=new WeakMap,aC=new WeakMap,eC=new WeakMap,sI=new WeakMap,tC=new WeakMap,Fh=new WeakSet,Xq=function(){if(this.receivedMessages.length===0)throw new f9("stream ended without producing a Message with role=assistant");
return this.receivedMessages.at(-1)},GlT=function(){if(this.receivedMessages.length===0)throw new f9("stream ended without producing a Message with role=assistant");
let R=this.receivedMessages.at(-1).content.filter((a)=>a.type==="text").map((a)=>a.text);
if(R.length===0)throw new f9("stream ended without producing a content block with type=text");
return R.join(" ")},Yq=function(){if(this.ended)return;
$0(this,Qn,void 0,"f")},Qq=function(R){if(this.ended)return;
let a=mR(this,Fh,"m",KlT).call(this,R);
switch(this._emit("streamEvent",R,a),R.type){case"content_block_delta":{let e=a.content.at(-1);
switch(R.delta.type){case"text_delta":{if(e.type==="text")this._emit("text",R.delta.text,e.text||"");
break}case"citations_delta":{if(e.type==="text")this._emit("citation",R.delta.citation,e.citations??[]);
break}case"input_json_delta":{if(zlT(e)&&e.input)this._emit("inputJson",R.delta.partial_json,e.input);
break}case"thinking_delta":{if(e.type==="thinking")this._emit("thinking",R.delta.thinking,e.thinking);
break}case"signature_delta":{if(e.type==="thinking")this._emit("signature",e.signature);
break}case"compaction_delta":{if(e.type==="compaction"&&e.content)this._emit("compaction",e.content);
break}default:FlT(R.delta)}break}case"message_stop":{this._addMessageParam(a),this._addMessage(qlT(a,mR(this,Cu,"f"),{logger:mR(this,sI,"f")}),!0);
break}case"content_block_stop":{this._emit("contentBlock",a.content.at(-1));
break}case"message_start":{$0(this,Qn,a,"f");
break}case"content_block_start":case"message_delta":break}},Zq=function(){if(this.ended)throw new f9("stream has ended, this shouldn't happen");
let R=mR(this,Qn,"f");
if(!R)throw new f9("request ended without sending any chunks");
return $0(this,Qn,void 0,"f"),qlT(R,mR(this,Cu,"f"),{logger:mR(this,sI,"f")})},KlT=function(R){let a=mR(this,Qn,"f");
if(R.type==="message_start"){if(a)throw new f9(`Unexpected event order, got ${R.type} before receiving "message_stop"`);return R.message}if(!a)throw new f9(`Unexpected event order, got ${R.type} before "message_start"`);switch(R.type){case"message_stop":return a;case"message_delta":if(a.container=R.delta.container,a.stop_reason=R.delta.stop_reason,a.stop_sequence=R.delta.stop_sequence,a.usage.output_tokens=R.usage.output_tokens,a.context_management=R.context_management,R.usage.input_tokens!=null)a.usage.input_tokens=R.usage.input_tokens;if(R.usage.cache_creation_input_tokens!=null)a.usage.cache_creation_input_tokens=R.usage.cache_creation_input_tokens;if(R.usage.cache_read_input_tokens!=null)a.usage.cache_read_input_tokens=R.usage.cache_read_input_tokens;if(R.usage.server_tool_use!=null)a.usage.server_tool_use=R.usage.server_tool_use;if(R.usage.iterations!=null)a.usage.iterations=R.usage.iterations;return a;case"content_block_start":return a.content.push(R.content_block),a;case"content_block_delta":{let e=a.content.at(R.index);switch(R.delta.type){case"text_delta":{if(e?.type==="text")a.content[R.index]={...e,text:(e.text||"")+R.delta.text};break}case"citations_delta":{if(e?.type==="text")a.content[R.index]={...e,citations:[...e.citations??[],R.delta.citation]};break}case"input_json_delta":{if(e&&zlT(e)){let t=e[VlT]||"";t+=R.delta.partial_json;let r={...e};if(Object.defineProperty(r,VlT,{value:t,enumerable:!1,writable:!0}),t)try{r.input=YN(t)}catch(h){let i=new f9(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${h}. JSON: ${t}`);mR(this,tC,"f").call(this,i)}a.content[R.index]=r}break}case"thinking_delta":{if(e?.type==="thinking")a.content[R.index]={...e,thinking:e.thinking+R.delta.thinking};break}case"signature_delta":{if(e?.type==="thinking")a.content[R.index]={...e,signature:R.delta.signature};break}case"compaction_delta":{if(e?.type==="compaction")a.content[R.index]={...e,content:(e.content||"")+R.delta.content};break}default:FlT(R.delta)}return a}case"content_block_stop":return a}},Symbol.asyncIterator)](){let R=[],a=[],e=!1;return this.on("streamEvent",(t)=>{let r=a.shift();if(r)r.resolve(t);else R.push(t)}),this.on("end",()=>{e=!0;for(let t of a)t.resolve(void 0);a.length=0}),this.on("abort",(t)=>{e=!0;for(let r of a)r.reject(t);a.length=0}),this.on("error",(t)=>{e=!0;for(let r of a)r.reject(t);a.length=0}),{next:async()=>{if(!R.length){if(e)return{value:void 0,done:!0};return new Promise((t,r)=>a.push({resolve:t,reject:r})).then((t)=>t?{value:t,done:!1}:{value:void 0,done:!0})}return{value:R.shift(),done:!1}},return:async()=>{return this.abort(),{value:void 0,done:!0}}}}toReadableStream(){return new kk(this[Symbol.asyncIterator].bind(this),this.controller).toReadableStream()}}}
// Module: async-hooks-context-manager
// Original: gaR
// Type: CJS (RT wrapper)
// Exports: AsyncHooksContextManager
// Category: util

// Module: gaR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.AsyncHooksContextManager=void 0;
var R=n0(),a=qT("async_hooks"),e=x$T();
class t extends e.AbstractAsyncHooksContextManager{_asyncHook;
_contexts=new Map;
_stack=[];
constructor(){super();
this._asyncHook=a.createHook({init:this._init.bind(this),before:this._before.bind(this),after:this._after.bind(this),destroy:this._destroy.bind(this),promiseResolve:this._destroy.bind(this)})}active(){return this._stack[this._stack.length-1]??R.ROOT_CONTEXT}with(r,h,i,...c){this._enterContext(r);
try{return h.call(i,...c)}finally{this._exitContext()}}enable(){return this._asyncHook.enable(),this}disable(){return this._asyncHook.disable(),this._contexts.clear(),this._stack=[],this}_init(r,h){if(h==="TIMERWRAP")return;
let i=this._stack[this._stack.length-1];
if(i!==void 0)this._contexts.set(r,i)}_destroy(r){this._contexts.delete(r)}_before(r){let h=this._contexts.get(r);
if(h!==void 0)this._enterContext(h)}_after(){this._exitContext()}_enterContext(r){this._stack.push(r)}_exitContext(){this._stack.pop()}}T.AsyncHooksContextManager=t}
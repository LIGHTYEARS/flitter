// Module: async-local-storage-context-manager
// Original: $aR
// Type: CJS (RT wrapper)
// Exports: AsyncLocalStorageContextManager
// Category: util

// Module: $aR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.AsyncLocalStorageContextManager=void 0;
var R=n0(),a=qT("async_hooks"),e=x$T();
class t extends e.AbstractAsyncHooksContextManager{_asyncLocalStorage;
constructor(){super();
this._asyncLocalStorage=new a.AsyncLocalStorage}active(){return this._asyncLocalStorage.getStore()??R.ROOT_CONTEXT}with(r,h,i,...c){let s=i==null?h:h.bind(i);
return this._asyncLocalStorage.run(r,s,...c)}enable(){return this}disable(){return this._asyncLocalStorage.disable(),this}}T.AsyncLocalStorageContextManager=t}
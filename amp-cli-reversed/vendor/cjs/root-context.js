// Module: root-context
// Original: OB
// Type: CJS (RT wrapper)
// Exports: ROOT_CONTEXT, createContextKey
// Category: util

// Module: OB (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ROOT_CONTEXT=T.createContextKey=void 0;
function R(e){return Symbol.for(e)}T.createContextKey=R;
class a{constructor(e){let t=this;
t._currentContext=e?new Map(e):new Map,t.getValue=(r)=>t._currentContext.get(r),t.setValue=(r,h)=>{let i=new a(t._currentContext);
return i._currentContext.set(r,h),i},t.deleteValue=(r)=>{let h=new a(t._currentContext);
return h._currentContext.delete(r),h}}}T.ROOT_CONTEXT=new a}
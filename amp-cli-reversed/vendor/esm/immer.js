// Module: immer
// Original: Jt
// Type: ESM (PT wrapper)
// Exports: C7T, Cr, DL, E7T, Lt, Nb, R8T, UG, cr, cxR, e, hxR, ixR, nxR, oxR, r, sxR, xy
// Category: npm-pkg

// Module: Jt (ESM)
()=>{R8T=Symbol.for("immer-nothing"),UG=Symbol.for("immer-draftable"),Cr=Symbol.for("immer-state"),Nb=Object.getPrototypeOf,E7T=Object.prototype.constructor.toString(),C7T={},DL={get(T,R){if(R===Cr)return T;
let a=g_(T);
if(!LG(a,R))return exR(T,a,R);
let e=a[R];
if(T.finalized_||!wb(e))return e;
if(e===zq(T.base_,R))return Fq(T),T.copy_[R]=NG(e,T);
return e},has(T,R){return R in g_(T)},ownKeys(T){return Reflect.ownKeys(g_(T))},set(T,R,a){let e=O7T(g_(T),R);
if(e?.set)return e.set.call(T.draft_,a),!0;
if(!T.modified_){let t=zq(g_(T),R),r=t?.[Cr];
if(r&&r.base_===a)return T.copy_[R]=a,T.assigned_[R]=!1,!0;
if(ZkR(a,t)&&(a!==void 0||LG(T.base_,R)))return!0;
Fq(T),BG(T)}if(T.copy_[R]===a&&(a!==void 0||(R in T.copy_))||Number.isNaN(a)&&Number.isNaN(T.copy_[R]))return!0;
return T.copy_[R]=a,T.assigned_[R]=!0,!0},deleteProperty(T,R){if(zq(T.base_,R)!==void 0||R in T.base_)T.assigned_[R]=!1,Fq(T),BG(T);
else delete T.assigned_[R];
if(T.copy_)delete T.copy_[R];
return!0},getOwnPropertyDescriptor(T,R){let a=g_(T),e=Reflect.getOwnPropertyDescriptor(a,R);
if(!e)return e;
return{writable:!0,configurable:T.type_!==1||R!=="length",enumerable:e.enumerable,value:a[R]}},defineProperty(){rc(11)},getPrototypeOf(T){return Nb(T.base_)},setPrototypeOf(){rc(12)}},xy={},a7(DL,(T,R)=>{xy[T]=function(){return arguments[0]=arguments[0][0],R.apply(this,arguments)}}),xy.deleteProperty=function(T,R){return xy.set.call(this,T,R,void 0)},xy.set=function(T,R,a){return DL.set.call(this,T[0],R,a,T[0])},cr=new rxR,Lt=cr.produce,hxR=cr.produceWithPatches.bind(cr),ixR=cr.setAutoFreeze.bind(cr),cxR=cr.setUseStrictShallowCopy.bind(cr),sxR=cr.applyPatches.bind(cr),oxR=cr.createDraft.bind(cr),nxR=cr.finishDraft.bind(cr)}
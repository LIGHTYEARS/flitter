// Module: apply-reviver
// Original: jDT
// Type: CJS (RT wrapper)
// Exports: applyReviver
// Category: util

// Module: jDT (CJS)
(T)=>{function R(a,e,t,r){if(r&&typeof r==="object")if(Array.isArray(r))for(let h=0,i=r.length;
h<i;
++h){let c=r[h],s=R(a,r,String(h),c);
if(s===void 0)delete r[h];
else if(s!==c)r[h]=s}else if(r instanceof Map)for(let h of Array.from(r.keys())){let i=r.get(h),c=R(a,r,h,i);
if(c===void 0)r.delete(h);
else if(c!==i)r.set(h,c)}else if(r instanceof Set)for(let h of Array.from(r)){let i=R(a,r,h,h);
if(i===void 0)r.delete(h);
else if(i!==h)r.delete(h),r.add(i)}else for(let[h,i]of Object.entries(r)){let c=R(a,r,h,i);
if(c===void 0)delete r[h];
else if(c!==i)r[h]=c}return a.call(e,t,r)}T.applyReviver=R}
// Module: stringify
// Original: RkR
// Type: CJS (RT wrapper)
// Exports: stringify
// Category: util

// Module: RkR (CJS)
(T)=>{var R=(t)=>("type"in t)?a(t):e(t);
function a(t){switch(t.type){case"block-scalar":{let r="";
for(let h of t.props)r+=a(h);
return r+t.source}case"block-map":case"block-seq":{let r="";
for(let h of t.items)r+=e(h);
return r}case"flow-collection":{let r=t.start.source;
for(let h of t.items)r+=e(h);
for(let h of t.end)r+=h.source;
return r}case"document":{let r=e(t);
if(t.end)for(let h of t.end)r+=h.source;
return r}default:{let r=t.source;
if("end"in t&&t.end)for(let h of t.end)r+=h.source;
return r}}}function e({start:t,key:r,sep:h,value:i}){let c="";
for(let s of t)c+=s.source;
if(r)c+=a(r);
if(h)for(let s of h)c+=s.source;
if(i)c+=a(i);
return c}T.stringify=R}
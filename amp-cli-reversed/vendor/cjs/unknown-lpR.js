// Module: unknown-lpR
// Original: lpR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: lpR (CJS)
(T,R)=>{var a=(t,r,h,i,c)=>{for(var s=0;
s<c;
s++)h[i+s]=t[s]^r[s&3]},e=(t,r)=>{let h=t.length;
for(var i=0;
i<h;
i++)t[i]^=r[i&3]};
R.exports={mask:a,unmask:e}}
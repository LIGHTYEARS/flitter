// Module: unknown-NyR
// Original: NyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: NyR (CJS)
(T,R)=>{var a=(e={})=>{let t=e.env||process.env;
if((e.platform||"darwin")!=="win32")return"PATH";
return Object.keys(t).reverse().find((r)=>r.toUpperCase()==="PATH")||"Path"};
R.exports=a,R.exports.default=a}
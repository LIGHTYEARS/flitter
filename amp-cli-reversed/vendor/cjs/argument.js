// Module: argument
// Original: HyR
// Type: CJS (RT wrapper)
// Exports: argument, command
// Category: util

// Module: HyR (CJS)
(T,R)=>{var a=/([()\][%!^"`<>&|;, *?])/g;function e(r){return r=r.replace(a,"^$1"),r}function t(r,h){if(r=`${r}`,r=r.replace(/(?=(\\+?)?)\1"/g,"$1$1\\\""),r=r.replace(/(?=(\\+?)?)\1$/,"$1$1"),r=`"${r}"`,r=r.replace(a,"^$1"),h)r=r.replace(a,"^$1");return r}T.command=e,T.argument=t}
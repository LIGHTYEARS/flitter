// Module: unknown-fMT
// Original: fMT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: fMT (CJS)
(T,R)=>{R.exports=function a(e,t){if(e===t)return!0;
if(e&&t&&typeof e=="object"&&typeof t=="object"){if(e.constructor!==t.constructor)return!1;
var r,h,i;
if(Array.isArray(e)){if(r=e.length,r!=t.length)return!1;
for(h=r;
h--!==0;
)if(!a(e[h],t[h]))return!1;
return!0}if(e.constructor===RegExp)return e.source===t.source&&e.flags===t.flags;
if(e.valueOf!==Object.prototype.valueOf)return e.valueOf()===t.valueOf();
if(e.toString!==Object.prototype.toString)return e.toString()===t.toString();
if(i=Object.keys(e),r=i.length,r!==Object.keys(t).length)return!1;
for(h=r;
h--!==0;
)if(!Object.prototype.hasOwnProperty.call(t,i[h]))return!1;
for(h=r;
h--!==0;
){var c=i[h];
if(!a(e[c],t[c]))return!1}return!0}return e!==e&&t!==t}}
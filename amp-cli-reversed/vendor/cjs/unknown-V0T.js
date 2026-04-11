// Module: unknown-V0T
// Original: V0T
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: V0T (CJS)
(T,R)=>{var{tokenChars:a}=tO();
function e(h,i,c){if(h[i]===void 0)h[i]=[c];
else h[i].push(c)}function t(h){let i=Object.create(null),c=Object.create(null),s=!1,A=!1,l=!1,o,n,p=-1,_=-1,m=-1,b=0;
for(;
b<h.length;
b++)if(_=h.charCodeAt(b),o===void 0)if(m===-1&&a[_]===1){if(p===-1)p=b}else if(b!==0&&(_===32||_===9)){if(m===-1&&p!==-1)m=b}else if(_===59||_===44){if(p===-1)throw SyntaxError(`Unexpected character at index ${b}`);if(m===-1)m=b;let u=h.slice(p,m);if(_===44)e(i,u,c),c=Object.create(null);else o=u;p=m=-1}else throw SyntaxError(`Unexpected character at index ${b}`);else if(n===void 0)if(m===-1&&a[_]===1){if(p===-1)p=b}else if(_===32||_===9){if(m===-1&&p!==-1)m=b}else if(_===59||_===44){if(p===-1)throw SyntaxError(`Unexpected character at index ${b}`);if(m===-1)m=b;if(e(c,h.slice(p,m),!0),_===44)e(i,o,c),c=Object.create(null),o=void 0;p=m=-1}else if(_===61&&p!==-1&&m===-1)n=h.slice(p,b),p=m=-1;else throw SyntaxError(`Unexpected character at index ${b}`);else if(A){if(a[_]!==1)throw SyntaxError(`Unexpected character at index ${b}`);if(p===-1)p=b;else if(!s)s=!0;A=!1}else if(l)if(a[_]===1){if(p===-1)p=b}else if(_===34&&p!==-1)l=!1,m=b;else if(_===92)A=!0;else throw SyntaxError(`Unexpected character at index ${b}`);else if(_===34&&h.charCodeAt(b-1)===61)l=!0;else if(m===-1&&a[_]===1){if(p===-1)p=b}else if(p!==-1&&(_===32||_===9)){if(m===-1)m=b}else if(_===59||_===44){if(p===-1)throw SyntaxError(`Unexpected character at index ${b}`);if(m===-1)m=b;let u=h.slice(p,m);if(s)u=u.replace(/\\/g,""),s=!1;if(e(c,n,u),_===44)e(i,o,c),c=Object.create(null),o=void 0;n=void 0,p=m=-1}else throw SyntaxError(`Unexpected character at index ${b}`);if(p===-1||l||_===32||_===9)throw SyntaxError("Unexpected end of input");if(m===-1)m=b;let y=h.slice(p,m);if(o===void 0)e(i,y,c);else{if(n===void 0)e(c,y,!0);else if(s)e(c,n,y.replace(/\\/g,""));else e(c,n,y);e(i,o,c)}return i}function r(h){return Object.keys(h).map((i)=>{let c=h[i];if(!Array.isArray(c))c=[c];return c.map((s)=>{return[i].concat(Object.keys(s).map((A)=>{let l=s[A];if(!Array.isArray(l))l=[l];return l.map((o)=>o===!0?A:`${A}=${o}`).join("; ")})).join("; ")}).join(", ")}).join(", ")}R.exports={format:r,parse:t}}
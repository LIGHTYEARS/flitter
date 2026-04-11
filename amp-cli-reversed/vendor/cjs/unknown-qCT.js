// Module: unknown-qCT
// Original: qCT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: qCT (CJS)
(T,R)=>{var{tokenChars:a}=tO();
function e(t){let r=new Set,h=-1,i=-1,c=0;
for(c;
c<t.length;
c++){let A=t.charCodeAt(c);
if(i===-1&&a[A]===1){if(h===-1)h=c}else if(c!==0&&(A===32||A===9)){if(i===-1&&h!==-1)i=c}else if(A===44){if(h===-1)throw SyntaxError(`Unexpected character at index ${c}`);if(i===-1)i=c;let l=t.slice(h,i);if(r.has(l))throw SyntaxError(`The "${l}" subprotocol is duplicated`);r.add(l),h=i=-1}else throw SyntaxError(`Unexpected character at index ${c}`)}if(h===-1||i!==-1)throw SyntaxError("Unexpected end of input");let s=t.slice(h,c);if(r.has(s))throw SyntaxError(`The "${s}" subprotocol is duplicated`);return r.add(s),r}R.exports={parse:e}}
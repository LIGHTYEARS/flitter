// Module: unknown-_pR
// Original: _pR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: _pR (CJS)
(T,R)=>{function a(e){let t=e.length,r=0;
while(r<t)if((e[r]&128)===0)r++;
else if((e[r]&224)===192){if(r+1===t||(e[r+1]&192)!==128||(e[r]&254)===192)return!1;
r+=2}else if((e[r]&240)===224){if(r+2>=t||(e[r+1]&192)!==128||(e[r+2]&192)!==128||e[r]===224&&(e[r+1]&224)===128||e[r]===237&&(e[r+1]&224)===160)return!1;
r+=3}else if((e[r]&248)===240){if(r+3>=t||(e[r+1]&192)!==128||(e[r+2]&192)!==128||(e[r+3]&192)!==128||e[r]===240&&(e[r+1]&240)===128||e[r]===244&&e[r+1]>143||e[r]>244)return!1;
r+=4}else return!1;
return!0}R.exports=a}
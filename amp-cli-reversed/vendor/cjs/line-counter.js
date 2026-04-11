// Module: line-counter
// Original: GDT
// Type: CJS (RT wrapper)
// Exports: LineCounter
// Category: util

// Module: GDT (CJS)
(T)=>{class R{constructor(){this.lineStarts=[],this.addNewLine=(a)=>this.lineStarts.push(a),this.linePos=(a)=>{let e=0,t=this.lineStarts.length;
while(e<t){let h=e+t>>1;
if(this.lineStarts[h]<a)e=h+1;
else t=h}if(this.lineStarts[e]===a)return{line:e+1,col:1};
if(e===0)return{line:0,col:a};
let r=this.lineStarts[e-1];
return{line:e,col:a-r+1}}}}T.LineCounter=R}
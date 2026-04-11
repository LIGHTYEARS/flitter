// Module: unknown-ppR
// Original: ppR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: ppR (CJS)
(T,R)=>{var a=Symbol("kDone"),e=Symbol("kRun");
class t{constructor(r){this[a]=()=>{this.pending--,this[e]()},this.concurrency=r||1/0,this.jobs=[],this.pending=0}add(r){this.jobs.push(r),this[e]()}[e](){if(this.pending===this.concurrency)return;
if(this.jobs.length){let r=this.jobs.shift();
this.pending++,r(this[a])}}}R.exports=t}
// Module: module-gs-y0t-CnR
// Original: CnR
// Type: ESM (PT wrapper)
// Exports: EnR, subject, tET
// Category: util

// Module: CnR (ESM)
()=>{GS(),y0T(),EnR=class extends Set{subject=new f0(this);
add(R){return super.add(R),this.subject.next(this),this}delete(R){let a=super.delete(R);
if(a)this.subject.next(this);
return a}clear(){super.clear(),this.subject.next(this)}get observable(){return AR.from(this.subject)}dispose(){this.subject.complete()}},tET=class extends Map{subject=new f0(this);
set(R,a){return super.set(R,a),this.subject.next(this),this}delete(R){let a=super.delete(R);
if(a)this.subject.next(this);
return a}clear(){super.clear(),this.subject.next(this)}get observable(){return AR.from(this.subject)}dispose(){this.subject.complete()}}}
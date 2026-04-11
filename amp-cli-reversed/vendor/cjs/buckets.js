// Module: buckets
// Original: otR
// Type: CJS (RT wrapper)
// Exports: Buckets
// Category: util

// Module: otR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.Buckets=void 0;
class R{backing;
indexBase;
indexStart;
indexEnd;
constructor(e=new a,t=0,r=0,h=0){this.backing=e,this.indexBase=t,this.indexStart=r,this.indexEnd=h}get offset(){return this.indexStart}get length(){if(this.backing.length===0)return 0;
if(this.indexEnd===this.indexStart&&this.at(0)===0)return 0;
return this.indexEnd-this.indexStart+1}counts(){return Array.from({length:this.length},(e,t)=>this.at(t))}at(e){let t=this.indexBase-this.indexStart;
if(e<t)e+=this.backing.length;
return e-=t,this.backing.countAt(e)}incrementBucket(e,t){this.backing.increment(e,t)}decrementBucket(e,t){this.backing.decrement(e,t)}trim(){for(let e=0;
e<this.length;
e++)if(this.at(e)!==0){this.indexStart+=e;
break}else if(e===this.length-1){this.indexStart=this.indexEnd=this.indexBase=0;
return}for(let e=this.length-1;
e>=0;
e--)if(this.at(e)!==0){this.indexEnd-=this.length-e-1;
break}this._rotate()}downscale(e){this._rotate();
let t=1+this.indexEnd-this.indexStart,r=1<<e,h=0,i=0;
for(let c=this.indexStart;
c<=this.indexEnd;
){let s=c%r;
if(s<0)s+=r;
for(let A=s;
A<r&&h<t;
A++)this._relocateBucket(i,h),h++,c++;
i++}this.indexStart>>=e,this.indexEnd>>=e,this.indexBase=this.indexStart}clone(){return new R(this.backing.clone(),this.indexBase,this.indexStart,this.indexEnd)}_rotate(){let e=this.indexBase-this.indexStart;
if(e===0)return;
else if(e>0)this.backing.reverse(0,this.backing.length),this.backing.reverse(0,e),this.backing.reverse(e,this.backing.length);
else this.backing.reverse(0,this.backing.length),this.backing.reverse(0,this.backing.length+e);
this.indexBase=this.indexStart}_relocateBucket(e,t){if(e===t)return;
this.incrementBucket(e,this.backing.emptyBucket(t))}}T.Buckets=R;
class a{_counts;
constructor(e=[0]){this._counts=e}get length(){return this._counts.length}countAt(e){return this._counts[e]}growTo(e,t,r){let h=Array(e).fill(0);
h.splice(r,this._counts.length-t,...this._counts.slice(t)),h.splice(0,t,...this._counts.slice(0,t)),this._counts=h}reverse(e,t){let r=Math.floor((e+t)/2)-e;
for(let h=0;
h<r;
h++){let i=this._counts[e+h];
this._counts[e+h]=this._counts[t-h-1],this._counts[t-h-1]=i}}emptyBucket(e){let t=this._counts[e];
return this._counts[e]=0,t}increment(e,t){this._counts[e]+=t}decrement(e,t){if(this._counts[e]>=t)this._counts[e]-=t;
else this._counts[e]=0}clone(){return new a([...this._counts])}}}
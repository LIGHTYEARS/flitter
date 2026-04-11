// Module: apply-patch
// Original: ClR
// Type: CJS (RT wrapper)
// Exports: applyPatch, calcPatch, calcSlices, diff, diff_core, lcs
// Category: util

// Module: ClR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.calcSlices=T.applyPatch=T.calcPatch=T.lcs=T.diff=T.diff_core=void 0;
function R(A,l){let{b:o,eq:n,stack_base:p}=A,{i:_,N:m,j:b,M:y,Z:u,stack_top:P}=A;
for(;
;
)switch(l){case 0:{T:while(m>0&&y>0){o.fill(0,0,2*u);
let k=m-y,x=m+y,f=x&1,v=_+m-1,g=b+y-1,I=(x+f)/2,S;
R:for(let O=0;
O<=I;
O++){let j=2*Math.max(0,O-y)-O,d=O-2*Math.max(0,O-m);
for(let C=j;
C<=d;
C+=2){let L=o[C-1-u*Math.floor((C-1)/u)],w=o[C+1-u*Math.floor((C+1)/u)],D=C===-O||C!==O&&L<w?w:L+1,B=D-C,M=D,V=B;
while(M<m&&V<y&&n(_+M,b+V))M++,V++;
if(o[C-u*Math.floor(C/u)]=M,f===1&&(S=k-C)>=1-O&&S<O&&M+o[u+S-u*Math.floor(S/u)]>=m)if(O>1||M!==D){p[P++]=_+M,p[P++]=m-M,p[P++]=b+V,p[P++]=y-V,m=D,y=B,u=2*(Math.min(m,y)+1);
continue T}else break R}for(let C=j;
C<=d;
C+=2){let L=o[u+C-1-u*Math.floor((C-1)/u)],w=o[u+C+1-u*Math.floor((C+1)/u)],D=C===-O||C!==O&&L<w?w:L+1,B=D-C,M=D,V=B;
while(M<m&&V<y&&n(v-M,g-V))M++,V++;
if(o[u+C-u*Math.floor(C/u)]=M,f===0&&(S=k-C)>=-O&&S<=O&&M+o[S-u*Math.floor(S/u)]>=m)if(O>0||M!==D){p[P++]=_+m-D,p[P++]=D,p[P++]=b+y-B,p[P++]=B,m=m-M,y=y-V,u=2*(Math.min(m,y)+1);
continue T}else break R}}if(m===y)continue;
if(y>m)_+=m,b+=m,y-=m,m=0;
else _+=y,b+=y,m-=y,y=0;
break}if(m+y!==0)if(A.pxe===_||A.pye===b)A.pxe=_+m,A.pye=b+y;
else{let k=A.pxs;
if(A.oxs=A.pxs,A.oxe=A.pxe,A.oys=A.pys,A.oye=A.pye,A.pxs=_,A.pxe=_+m,A.pys=b,A.pye=b+y,k>=0)return A.i=_,A.N=m,A.j=b,A.M=y,A.Z=u,A.stack_top=P,1}}case 1:{if(P===0)return 2;
y=p[--P],b=p[--P],m=p[--P],_=p[--P],u=2*(Math.min(m,y)+1),l=0}}}class a{constructor(A){this.state=A,this.c=0,this.result={value:null,done:!1}}[Symbol.iterator](){return this}next(){let{state:A,result:l}=this;
if(this.c>1)return l.done=!0,l.value=void 0,l;
let o=R(A,this.c);
if(this.c=o,o===1)return l.value=[A.oxs,A.oxe,A.oys,A.oye],l;
if(A.pxs>=0)return l.value=[A.pxs,A.pxe,A.pys,A.pye],l;
return l.done=!0,l.value=void 0,l}}function e(A,l,o,n,p){let _=(Math.min(l,n)+1)*2,m=l+n,b=new(m<256?Uint8Array:m<65536?Uint16Array:Uint32Array)(2*_);
return new a({i:A,N:l,j:o,M:n,Z:_,b,eq:p,pxs:-1,pxe:-1,pys:-1,pye:-1,oxs:-1,oxe:-1,oys:-1,oye:-1,stack_top:0,stack_base:[]})}T.diff_core=e;
function t(A,l,o){let[n,p,_]=[0,A.length,l.length];
if(typeof o==="function"){while(n<p&&n<_&&o(n,n))n++;
if(n===p&&n===_)return[][Symbol.iterator]();
while(o(--p,--_)&&p>n&&_>n);
}else{while(n<p&&n<_&&A[n]===l[n])n++;
if(n===p&&n===_)return[][Symbol.iterator]();
while(A[--p]===l[--_]&&p>n&&_>n);
o=(m,b)=>A[m]===l[b]}return e(n,p+1-n,n,_+1-n,o)}T.diff=t;
class r{constructor(A,l){this.diff=A,this.N=l,this.i=0,this.j=0}[Symbol.iterator](){return this}next(){let A=this.diff.next();
if(A.done){let{i:b,j:y,N:u}=this;
if(b<u)A.done=!1,A.value=[b,y,u-b],this.i=u;
return A}let l=A.value,o=l[0],n=l[1],p=l[3],{i:_,j:m}=this;
if(_!==o)l.length--,l[0]=_,l[1]=m,l[2]=o-_;
return this.i=n,this.j=p,A}}function h(A,l,o){return new r(t(A,l,o),A.length)}T.lcs=h;
function*i(A,l,o){let n=ArrayBuffer.isView(A)?Uint8Array.prototype.subarray:A.slice;
for(let p of t(A,l,o))p[2]=n.call(l,p[2],p[3]),yield p}T.calcPatch=i;
function*c(A,l){let o=0,n=ArrayBuffer.isView(A)?Uint8Array.prototype.subarray:A.slice;
for(let[p,_,m]of l){if(o<p)yield n.call(A,o,p);
if(m.length>0)yield m;
o=_}if(o<A.length)yield n.call(A,o)}T.applyPatch=c;
function*s(A,l,o){let n=0,p=ArrayBuffer.isView(A)?Uint8Array.prototype.subarray:A.slice;
for(let[_,m,b,y]of t(A,l,o)){if(n<_)yield[0,p.call(A,n,_)];
if(_<m)yield[-1,p.call(A,_,m)];
if(b<y)yield[1,p.call(l,b,y)];
n=m}if(n<A.length)yield[0,A.slice(n)]}T.calcSlices=s}
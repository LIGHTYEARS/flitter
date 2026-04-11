// Module: exponent-mapping
// Original: ntR
// Type: CJS (RT wrapper)
// Exports: ExponentMapping
// Category: util

// Module: ntR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ExponentMapping=void 0;
var R=W$T(),a=pZ(),e=_Z();
class t{_shift;
constructor(r){this._shift=-r}mapToIndex(r){if(r<R.MIN_VALUE)return this._minNormalLowerBoundaryIndex();
let h=R.getNormalBase2(r),i=this._rightShift(R.getSignificand(r)-1,R.SIGNIFICAND_WIDTH);
return h+i>>this._shift}lowerBoundary(r){let h=this._minNormalLowerBoundaryIndex();
if(r<h)throw new e.MappingError(`underflow: ${r} is < minimum lower boundary: ${h}`);let i=this._maxNormalLowerBoundaryIndex();if(r>i)throw new e.MappingError(`overflow: ${r} is > maximum lower boundary: ${i}`);return a.ldexp(1,r<<this._shift)}get scale(){if(this._shift===0)return 0;return-this._shift}_minNormalLowerBoundaryIndex(){let r=R.MIN_NORMAL_EXPONENT>>this._shift;if(this._shift<2)r--;return r}_maxNormalLowerBoundaryIndex(){return R.MAX_NORMAL_EXPONENT>>this._shift}_rightShift(r,h){return Math.floor(r*Math.pow(2,-h))}}T.ExponentMapping=t}
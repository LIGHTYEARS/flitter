// Module: opentelemetry-observable-result
// Original: jtR
// Type: CJS (RT wrapper)
// Exports: BatchObservableResultImpl, ObservableResultImpl
// Category: npm-pkg

// Module: jtR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.BatchObservableResultImpl=T.ObservableResultImpl=void 0;
var R=n0(),a=BB(),e=bZ();
class t{_instrumentName;
_valueType;
_buffer=new a.AttributeHashMap;
constructor(h,i){this._instrumentName=h,this._valueType=i}observe(h,i={}){if(typeof h!=="number"){R.diag.warn(`non-number value provided to metric ${this._instrumentName}: ${h}`);return}if(this._valueType===R.ValueType.INT&&!Number.isInteger(h)){if(R.diag.warn(`INT value type cannot accept a floating-point value for ${this._instrumentName}, ignoring the fractional digits.`),h=Math.trunc(h),!Number.isInteger(h))return}this._buffer.set(i,h)}}T.ObservableResultImpl=t;class r{_buffer=new Map;observe(h,i,c={}){if(!(0,e.isObservableInstrument)(h))return;let s=this._buffer.get(h);if(s==null)s=new a.AttributeHashMap,this._buffer.set(h,s);if(typeof i!=="number"){R.diag.warn(`non-number value provided to metric ${h._descriptor.name}: ${i}`);return}if(h._descriptor.valueType===R.ValueType.INT&&!Number.isInteger(i)){if(R.diag.warn(`INT value type cannot accept a floating-point value for ${h._descriptor.name}, ignoring the fractional digits.`),i=Math.trunc(i),!Number.isInteger(i))return}s.set(c,i)}}T.BatchObservableResultImpl=r}
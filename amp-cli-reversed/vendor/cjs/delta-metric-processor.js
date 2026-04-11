// Module: delta-metric-processor
// Original: G$T
// Type: CJS (RT wrapper)
// Exports: DeltaMetricProcessor
// Category: util

// Module: g$T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.massUnwrap=T.unwrap=T.massWrap=T.wrap=void 0;
var R=console.error.bind(console);
function a(c,s,A){let l=!!c[s]&&Object.prototype.propertyIsEnumerable.call(c,s);
Object.defineProperty(c,s,{configurable:!0,enumerable:l,writable:!0,value:A})}var e=(c,s,A)=>{if(!c||!c[s]){R("no original function "+String(s)+" to wrap");
return}if(!A){R("no wrapper function"),R(Error().stack);
return}let l=c[s];
if(typeof l!=="function"||typeof A!=="function"){R("original object and wrapper must be functions");
return}let o=A(l,s);
return a(o,"__original",l),a(o,"__unwrap",()=>{if(c[s]===o)a(c,s,l)}),a(o,"__wrapped",!0),a(c,s,o),o};
T.wrap=e;
var t=(c,s,A)=>{if(!c){R("must provide one or more modules to patch"),R(Error().stack);
return}else if(!Array.isArray(c))c=[c];
if(!(s&&Array.isArray(s))){R("must provide one or more functions to wrap on modules");
return}c.forEach((l)=>{s.forEach((o)=>{T.wrap(l,o,A)})})};
T.massWrap=t;
var r=(c,s)=>{if(!c||!c[s]){R("no function to unwrap."),R(Error().stack);
return}let A=c[s];
if(!A.__unwrap)R("no original to unwrap to -- has "+String(s)+" already been unwrapped?");
else{A.__unwrap();
return}};
T.unwrap=r;
var h=(c,s)=>{if(!c){R("must provide one or more modules to patch"),R(Error().stack);
return}else if(!Array.isArray(c))c=[c];
if(!(s&&Array.isArray(s))){R("must provide one or more functions to unwrap on modules");
return}c.forEach((A)=>{s.forEach((l)=>{T.unwrap(A,l)})})};
T.massUnwrap=h;
function i(c){if(c&&c.logger)if(typeof c.logger!=="function")R("new logger isn't a function, not replacing");
else R=c.logger}T.default=i,i.wrap=T.wrap,i.massWrap=T.massWrap,i.unwrap=T.unwrap,i.massUnwrap=T.massUnwrap}
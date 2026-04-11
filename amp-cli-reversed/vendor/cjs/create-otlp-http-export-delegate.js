// Module: create-otlp-http-export-delegate
// Original: ErR
// Type: CJS (RT wrapper)
// Exports: createOtlpHttpExportDelegate
// Category: util

// Module: erR (CJS)
(T,R)=>{R.exports=a;
function a(){this._listeners={}}a.prototype.on=function(e,t,r){return(this._listeners[e]||(this._listeners[e]=[])).push({fn:t,ctx:r||this}),this},a.prototype.off=function(e,t){if(e===void 0)this._listeners={};
else if(t===void 0)this._listeners[e]=[];
else{var r=this._listeners[e];
for(var h=0;
h<r.length;
)if(r[h].fn===t)r.splice(h,1);
else++h}return this},a.prototype.emit=function(e){var t=this._listeners[e];
if(t){var r=[],h=1;
for(;
h<arguments.length;
)r.push(arguments[h++]);
for(h=0;
h<t.length;
)t[h].fn.apply(t[h++].ctx,r)}return this}}
// Module: module-s0-jc
// Original: jc
// Type: ESM (PT wrapper)
// Exports: Ls, _entries, uris, xh
// Category: util

// Module: jc (ESM)
()=>{s0(),Ls=class{uris=new Map;
constructor(R){if(R)for(let a of R)this.add(a)}add(R){let a=I8(R);
return this.uris.set(a.toString(),a),this}has(R){return this.uris.has(Kf(R))}delete(R){return this.uris.delete(Kf(R))}clear(){this.uris.clear()}get size(){return this.uris.size}*[Symbol.iterator](){yield*this.uris.values()}keys(){return this.uris.values()}},xh=class{_entries=new Map;
constructor(R){if(R)for(let[a,e]of R)this.set(a,e)}set(R,a){let e=I8(R);
return this._entries.set(e.toString(),[e,a]),this}get(R){return this._entries.get(Kf(R))?.[1]}has(R){return this._entries.has(Kf(R))}delete(R){return this._entries.delete(Kf(R))}clear(){this._entries.clear()}get size(){return this._entries.size}*[Symbol.iterator](){for(let[,R]of this._entries)yield R}*keys(){for(let[,[R]]of this._entries)yield R}*values(){for(let[,[,R]]of this._entries)yield R}*entries(){for(let[,R]of this._entries)yield R}}}
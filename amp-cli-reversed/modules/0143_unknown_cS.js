class cS {
  constructor(T) {
    if (T) {
      if ((T.keyMap || T._keyMap) && !T.useRecords) T.useRecords = !1, T.mapsAsObjects = !0;
      if (T.useRecords === !1 && T.mapsAsObjects === void 0) T.mapsAsObjects = !0;
      if (T.getStructures) T.getShared = T.getStructures;
      if (T.getShared && !T.structures) (T.structures = []).uninitialized = !0;
      if (T.keyMap) {
        this.mapKey = new Map();
        for (let [R, a] of Object.entries(T.keyMap)) this.mapKey.set(a, R);
      }
    }
    Object.assign(this, T);
  }
  decodeKey(T) {
    return this.keyMap ? this.mapKey.get(T) || T : T;
  }
  encodeKey(T) {
    return this.keyMap && this.keyMap.hasOwnProperty(T) ? this.keyMap[T] : T;
  }
  encodeKeys(T) {
    if (!this._keyMap) return T;
    let R = new Map();
    for (let [a, e] of Object.entries(T)) R.set(this._keyMap.hasOwnProperty(a) ? this._keyMap[a] : a, e);
    return R;
  }
  decodeKeys(T) {
    if (!this._keyMap || T.constructor.name != "Map") return T;
    if (!this._mapKey) {
      this._mapKey = new Map();
      for (let [a, e] of Object.entries(this._keyMap)) this._mapKey.set(e, a);
    }
    let R = {};
    return T.forEach((a, e) => R[ii(this._mapKey.has(e) ? this._mapKey.get(e) : e)] = a), R;
  }
  mapDecode(T, R) {
    let a = this.decode(T);
    if (this._keyMap) switch (a.constructor.name) {
      case "Array":
        return a.map(e => this.decodeKeys(e));
    }
    return a;
  }
  decode(T, R) {
    if (L0) return v2T(() => {
      return r1(), this ? this.decode(T, R) : cS.prototype.decode.call(DyT, T, R);
    });
    _A = R > -1 ? R : T.length, CR = 0, tS = 0, zb = 0, rS = null, eb = teT, Oa = null, L0 = T;
    try {
      St = T.dataView || (T.dataView = new DataView(T.buffer, T.byteOffset, T.byteLength));
    } catch (a) {
      if (L0 = null, T instanceof Uint8Array) throw a;
      throw Error("Source must be a Uint8Array or Buffer but was a " + (T && typeof T == "object" ? T.constructor.name : typeof T));
    }
    if (this instanceof cS) {
      if (R8 = this, Ir = this.sharedValues && (this.pack ? Array(this.maxPrivatePackedValues || 16).concat(this.sharedValues) : this.sharedValues), this.structures) return ia = this.structures, s4();else if (!ia || ia.length > 0) ia = [];
    } else {
      if (R8 = DyT, !ia || ia.length > 0) ia = [];
      Ir = null;
    }
    return s4();
  }
  decodeMultiple(T, R) {
    let a,
      e = 0;
    try {
      let t = T.length;
      iS = !0;
      let r = this ? this.decode(T, t) : ieT.decode(T, t);
      if (R) {
        if (R(r) === !1) return;
        while (CR < t) if (e = CR, R(s4()) === !1) return;
      } else {
        a = [r];
        while (CR < t) e = CR, a.push(s4());
        return a;
      }
    } catch (t) {
      throw t.lastPosition = e, t.values = a, t;
    } finally {
      iS = !1, r1();
    }
  }
}
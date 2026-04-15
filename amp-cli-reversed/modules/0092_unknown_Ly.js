async function Hs() {
  return {
    trees: [await P1R(zR.file(process.cwd()))],
    platform: k1R()
  };
}
function FO(T) {
  throw Error(`Unreachable case: ${T}`);
}
function Ly(T, R, a = "") {
  if (T === null || T === void 0) return !0;
  if (typeof T === "number") {
    if (!Number.isFinite(T)) return R == null || R(a), !1;
    return !0;
  }
  if (typeof T === "boolean" || typeof T === "string") return !0;
  if (typeof T === "bigint") return !0;
  if (T instanceof Date) return !0;
  if (T instanceof Uint8Array || T instanceof Uint8ClampedArray || T instanceof Uint16Array || T instanceof Uint32Array || T instanceof BigUint64Array || T instanceof Int8Array || T instanceof Int16Array || T instanceof Int32Array || T instanceof BigInt64Array || T instanceof Float32Array || T instanceof Float64Array) return !0;
  if (T instanceof Map) {
    for (let [e, t] of T.entries()) {
      let r = a ? `${a}.key(${String(e)})` : `key(${String(e)})`,
        h = a ? `${a}.value(${String(e)})` : `value(${String(e)})`;
      if (!Ly(e, R, r) || !Ly(t, R, h)) return !1;
    }
    return !0;
  }
  if (T instanceof Set) {
    let e = 0;
    for (let t of T.values()) {
      let r = a ? `${a}.set[${e}]` : `set[${e}]`;
      if (!Ly(t, R, r)) return !1;
      e++;
    }
    return !0;
  }
  if (T instanceof RegExp) return !0;
  if (T instanceof Error) return !0;
  if (Array.isArray(T)) {
    for (let e = 0; e < T.length; e++) {
      let t = a ? `${a}[${e}]` : `[${e}]`;
      if (!Ly(T[e], R, t)) return !1;
    }
    return !0;
  }
  if (typeof T === "object") {
    let e = Object.getPrototypeOf(T);
    if (e !== null && e !== Object.prototype) {
      let t = T.constructor;
      if (t && typeof t.name === "string") ;
    }
    for (let t in T) {
      let r = a ? `${a}.${t}` : t;
      if (!Ly(T[t], R, r)) return !1;
    }
    return !0;
  }
  return R == null || R(a), !1;
}
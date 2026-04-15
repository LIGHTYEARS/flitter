function XER(T) {
  return KER(T, {
    arrayFormat: "brackets"
  });
}
function YER(T) {
  let R = 0;
  for (let t of T) R += t.length;
  let a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a;
}
function Z8T(T) {
  let R;
  return (m_T ?? (R = new globalThis.TextEncoder(), m_T = R.encode.bind(R)))(T);
}
function b_T(T) {
  let R;
  return (u_T ?? (R = new globalThis.TextDecoder(), u_T = R.decode.bind(R)))(T);
}
class Vj {
  constructor() {
    rh.set(this, void 0), hh.set(this, void 0), b9(this, rh, new Uint8Array(), "f"), b9(this, hh, null, "f");
  }
  decode(T) {
    if (T == null) return [];
    let R = T instanceof ArrayBuffer ? new Uint8Array(T) : typeof T === "string" ? Z8T(T) : T;
    b9(this, rh, YER([bR(this, rh, "f"), R]), "f");
    let a = [],
      e;
    while ((e = QER(bR(this, rh, "f"), bR(this, hh, "f"))) != null) {
      if (e.carriage && bR(this, hh, "f") == null) {
        b9(this, hh, e.index, "f");
        continue;
      }
      if (bR(this, hh, "f") != null && (e.index !== bR(this, hh, "f") + 1 || e.carriage)) {
        a.push(b_T(bR(this, rh, "f").subarray(0, bR(this, hh, "f") - 1))), b9(this, rh, bR(this, rh, "f").subarray(bR(this, hh, "f")), "f"), b9(this, hh, null, "f");
        continue;
      }
      let t = bR(this, hh, "f") !== null ? e.preceding - 1 : e.preceding,
        r = b_T(bR(this, rh, "f").subarray(0, t));
      a.push(r), b9(this, rh, bR(this, rh, "f").subarray(e.index), "f"), b9(this, hh, null, "f");
    }
    return a;
  }
  flush() {
    if (!bR(this, rh, "f").length) return [];
    return this.decode(`
`);
  }
}
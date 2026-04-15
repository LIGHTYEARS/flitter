function HxR(T) {
  let R = 0;
  for (let t of T) R += t.length;
  let a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a;
}
function c8T(T) {
  let R;
  return (BlT ?? (R = new globalThis.TextEncoder(), BlT = R.encode.bind(R)))(T);
}
function wlT(T) {
  let R;
  return (NlT ?? (R = new globalThis.TextDecoder(), NlT = R.decode.bind(R)))(T);
}
class Pk {
  constructor() {
    ah.set(this, void 0), eh.set(this, void 0), $0(this, ah, new Uint8Array(), "f"), $0(this, eh, null, "f");
  }
  decode(T) {
    if (T == null) return [];
    let R = T instanceof ArrayBuffer ? new Uint8Array(T) : typeof T === "string" ? c8T(T) : T;
    $0(this, ah, HxR([mR(this, ah, "f"), R]), "f");
    let a = [],
      e;
    while ((e = WxR(mR(this, ah, "f"), mR(this, eh, "f"))) != null) {
      if (e.carriage && mR(this, eh, "f") == null) {
        $0(this, eh, e.index, "f");
        continue;
      }
      if (mR(this, eh, "f") != null && (e.index !== mR(this, eh, "f") + 1 || e.carriage)) {
        a.push(wlT(mR(this, ah, "f").subarray(0, mR(this, eh, "f") - 1))), $0(this, ah, mR(this, ah, "f").subarray(mR(this, eh, "f")), "f"), $0(this, eh, null, "f");
        continue;
      }
      let t = mR(this, eh, "f") !== null ? e.preceding - 1 : e.preceding,
        r = wlT(mR(this, ah, "f").subarray(0, t));
      a.push(r), $0(this, ah, mR(this, ah, "f").subarray(e.index), "f"), $0(this, eh, null, "f");
    }
    return a;
  }
  flush() {
    if (!mR(this, ah, "f").length) return [];
    return this.decode(`
`);
  }
}
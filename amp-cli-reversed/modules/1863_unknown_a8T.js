function O8(T) {
  return T;
}
function ElT(T) {
  return JSON.stringify(T) ?? "";
}
function nA(T) {
  if (T.length > Hj) return T.slice(0, Hj) + r7;
  return T;
}
function a8T(T) {
  if (typeof T === "string") return nA(T);
  if (Array.isArray(T)) {
    let R = 0,
      a = [];
    for (let e of T) {
      let t = e;
      if (typeof e === "string") t = nA(e);else if (typeof e === "object" && e !== null) t = HG(e);
      let r = typeof t === "string" ? t : ElT(t),
        h = typeof e === "string" ? e : ElT(e);
      if (R + r.length > Hj) {
        if (R === 0 && h.length > r.length) a.push(t);else a.push(r7);
        break;
      }
      R += r.length, a.push(t);
    }
    return a;
  }
  if (typeof T === "object" && T !== null && !Array.isArray(T)) {
    let R = {
      ...T
    };
    for (let a of e8T) if (a in R && typeof R[a] === "string") R[a] = nA(R[a]);
    return R;
  }
  return T;
}
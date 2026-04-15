function lxR(T) {
  if (T === void 0) return;
  if (typeof T === "string") return nA(T);
  if (Array.isArray(T)) {
    if (T.length > 0 && typeof T[0] === "string") {
      let R = 0,
        a = [];
      for (let e of T) if (typeof e === "string") {
        let t = nA(e);
        if (R + t.length > Hj) {
          a.push(r7);
          break;
        }
        R += t.length, a.push(t);
      }
      return a;
    }
    if (T.length > 0 && typeof T[0] === "object") {
      let R = 0,
        a = [];
      for (let e of T) if (typeof e === "object" && e !== null) {
        let t = HG(e),
          r = JSON.stringify(t);
        if (R + r.length > Hj) {
          a.push({
            truncated: r7
          });
          break;
        }
        R += r.length, a.push(t);
      }
      return a;
    }
  }
  if (typeof T === "object" && T !== null) return HG(T);
  return T;
}
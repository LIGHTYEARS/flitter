function H(T, R, a = void 0) {
  try {
    if (R.length === 1 && R[0] === "_self") return T;
    for (let e = 0; e < R.length; e++) {
      if (typeof T !== "object" || T === null) return a;
      let t = R[e];
      if (t.endsWith("[]")) {
        let r = t.slice(0, -2);
        if (r in T) {
          let h = T[r];
          if (!Array.isArray(h)) return a;
          return h.map(i => H(i, R.slice(e + 1), a));
        } else return a;
      } else T = T[t];
    }
    return T;
  } catch (e) {
    if (e instanceof TypeError) return a;
    throw e;
  }
}
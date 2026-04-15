function Y(T, R, a) {
  for (let r = 0; r < R.length - 1; r++) {
    let h = R[r];
    if (h.endsWith("[]")) {
      let i = h.slice(0, -2);
      if (!(i in T)) if (Array.isArray(a)) T[i] = Array.from({
        length: a.length
      }, () => ({}));else throw Error(`Value must be a list given an array path ${h}`);
      if (Array.isArray(T[i])) {
        let c = T[i];
        if (Array.isArray(a)) for (let s = 0; s < c.length; s++) {
          let A = c[s];
          Y(A, R.slice(r + 1), a[s]);
        } else for (let s of c) Y(s, R.slice(r + 1), a);
      }
      return;
    } else if (h.endsWith("[0]")) {
      let i = h.slice(0, -3);
      if (!(i in T)) T[i] = [{}];
      let c = T[i];
      Y(c[0], R.slice(r + 1), a);
      return;
    }
    if (!T[h] || typeof T[h] !== "object") T[h] = {};
    T = T[h];
  }
  let e = R[R.length - 1],
    t = T[e];
  if (t !== void 0) {
    if (!a || typeof a === "object" && Object.keys(a).length === 0) return;
    if (a === t) return;
    if (typeof t === "object" && typeof a === "object" && t !== null && a !== null) Object.assign(t, a);else throw Error(`Cannot set value for an existing key. Key: ${e}`);
  } else if (e === "_self" && typeof a === "object" && a !== null && !Array.isArray(a)) Object.assign(T, a);else T[e] = a;
}
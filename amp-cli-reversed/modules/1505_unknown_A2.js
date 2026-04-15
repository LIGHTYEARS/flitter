function A2(T, R) {
  if (T === R) return {
    valid: !0,
    data: T
  };
  if (T instanceof Date && R instanceof Date && +T === +R) return {
    valid: !0,
    data: T
  };
  if (jb(T) && jb(R)) {
    let a = Object.keys(R),
      e = Object.keys(T).filter(r => a.indexOf(r) !== -1),
      t = {
        ...T,
        ...R
      };
    for (let r of e) {
      let h = A2(T[r], R[r]);
      if (!h.valid) return {
        valid: !1,
        mergeErrorPath: [r, ...h.mergeErrorPath]
      };
      t[r] = h.data;
    }
    return {
      valid: !0,
      data: t
    };
  }
  if (Array.isArray(T) && Array.isArray(R)) {
    if (T.length !== R.length) return {
      valid: !1,
      mergeErrorPath: []
    };
    let a = [];
    for (let e = 0; e < T.length; e++) {
      let t = T[e],
        r = R[e],
        h = A2(t, r);
      if (!h.valid) return {
        valid: !1,
        mergeErrorPath: [e, ...h.mergeErrorPath]
      };
      a.push(h.data);
    }
    return {
      valid: !0,
      data: a
    };
  }
  return {
    valid: !1,
    mergeErrorPath: []
  };
}
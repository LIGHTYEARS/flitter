function mLT(T) {
  let R = ybR(T),
    a = [];
  for (let e = 0; e < R.length; e++) {
    let t = R[e];
    if (t.content.startsWith("#")) continue;
    let r = ubR(t.content);
    if (!r.success) return r.error.line = t.lineNumber, r;
    a.push(r.data);
  }
  return {
    success: !0,
    data: a
  };
}
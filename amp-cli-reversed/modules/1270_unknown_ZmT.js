function EX(T, R) {
  return T.substring(0, R.offset) + R.content + T.substring(R.offset + R.length);
}
function QmT(T, R, a, e) {
  return rHR(T, R, a, e);
}
function ZmT(T, R) {
  let a = R.slice(0).sort((t, r) => {
      let h = t.offset - r.offset;
      if (h === 0) return t.length - r.length;
      return h;
    }),
    e = T.length;
  for (let t = a.length - 1; t >= 0; t--) {
    let r = a[t];
    if (r.offset + r.length <= e) T = EX(T, r);else throw Error("Overlapping edit");
    e = r.offset;
  }
  return T;
}
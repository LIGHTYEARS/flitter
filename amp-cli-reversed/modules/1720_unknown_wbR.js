function DbR(T) {
  let R = Jh(T, "jxlc", 0);
  if (R) return T.slice(R.offset + 8, R.offset + R.size);
  let a = wbR(T);
  if (a.length > 0) return BbR(a);
  return;
}
function wbR(T) {
  let R = [],
    a = 0;
  while (a < T.length) {
    let e = Jh(T, "jxlp", a);
    if (!e) break;
    R.push(T.slice(e.offset + 12, e.offset + e.size)), a = e.offset + e.size;
  }
  return R;
}
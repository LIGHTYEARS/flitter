function nyT(T, R = {}) {
  let a = QXR(T, {
    streamIsTTY: T && T.isTTY,
    ...R
  });
  return YXR(a);
}
function T1R(T, R, a) {
  let e = T.indexOf(R);
  if (e === -1) return T;
  let t = R.length,
    r = 0,
    h = "";
  do h += T.slice(r, e) + R + a, r = e + t, e = T.indexOf(R, r); while (e !== -1);
  return h += T.slice(r), h;
}
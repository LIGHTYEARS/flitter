function Hd0(T) {
  if (!T) return null;
  let R = T.split(";")[0]?.trim().toLowerCase();
  if (!R) return null;
  return fN(R) ? R : null;
}
function FQT(T, R, a, e) {
  let t = x9T(T);
  if (t) return t;
  let r = Hd0(R);
  if (r) return r;
  if (a) {
    let h = eG(tB.extname(a.pathname).toLowerCase());
    if (h) return h;
  }
  if (e) {
    let h = eG(tB.extname(e).toLowerCase());
    if (h) return h;
  }
  return null;
}
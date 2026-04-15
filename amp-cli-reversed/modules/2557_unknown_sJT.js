function YH(T, R) {
  var a = T[0];
  for (R *= s9; a >= 10; a /= 10) R++;
  return R;
}
function nB(T, R, a) {
  if (R > w40) {
    if (g9 = !0, a) T.precision = a;
    throw Error(tJT);
  }
  return Q0(new T(sB), R, 1, !0);
}
function Cs(T, R, a) {
  if (R > pQ) throw Error(tJT);
  return Q0(new T(oB), R, a, !0);
}
function cJT(T) {
  var R = T.length - 1,
    a = R * s9 + 1;
  if (R = T[R], R) {
    for (; R % 10 == 0; R /= 10) a--;
    for (R = T[0]; R >= 10; R /= 10) a++;
  }
  return a;
}
function dl(T) {
  var R = "";
  for (; T--;) R += "0";
  return R;
}
function sJT(T, R, a, e) {
  var t,
    r = new T(1),
    h = Math.ceil(e / s9 + 4);
  g9 = !1;
  for (;;) {
    if (a % 2) {
      if (r = r.times(R), MIT(r.d, h)) t = !0;
    }
    if (a = nt(a / 2), a === 0) {
      if (a = r.d.length - 1, t && r.d[a] === 0) ++r.d[a];
      break;
    }
    R = R.times(R), MIT(R.d, h);
  }
  return g9 = !0, r;
}
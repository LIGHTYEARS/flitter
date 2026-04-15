function gO0(T, R, a) {
  return e;
  function e(r) {
    return T.consume(r), t;
  }
  function t(r) {
    return Sr(r) ? a(r) : R(r);
  }
}
function jQT(T) {
  return T === null || T === 40 || T === 42 || T === 95 || T === 91 || T === 93 || T === 126 || o3(T);
}
function SQT(T) {
  return !Mt(T);
}
function OQT(T) {
  return !(T === 47 || ZY(T));
}
function ZY(T) {
  return T === 43 || T === 45 || T === 46 || T === 95 || Sr(T);
}
function crT(T) {
  let R = T.length,
    a = !1;
  while (R--) {
    let e = T[R][1];
    if ((e.type === "labelLink" || e.type === "labelImage") && !e._balanced) {
      a = !0;
      break;
    }
    if (e._gfmAutolinkLiteralWalkedInto) {
      a = !1;
      break;
    }
  }
  if (T.length > 0 && !a) T[T.length - 1][1]._gfmAutolinkLiteralWalkedInto = !0;
  return a;
}
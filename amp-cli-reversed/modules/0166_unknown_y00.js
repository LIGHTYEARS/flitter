function qyT(T, R) {
  b3.setUint32(qa.position + T, aR - qa.position - T + 1);
  let a = qa;
  qa = null, R(a[0]), R(a[1]);
}
function b00(T) {
  return E0(T);
}
function m00(T, R) {
  C0(T, R);
}
function oeT(T) {
  return E0(T);
}
function neT(T, R) {
  C0(T, R);
}
function lp(T) {
  return E0(T);
}
function Ap(T, R) {
  C0(T, R);
}
function ZU(T) {
  return ge(T);
}
function JU(T, R) {
  $e(T, R);
}
function GyT(T) {
  return {
    key: ZU(T),
    value: b00(T)
  };
}
function u00(T, R) {
  JU(T, R.key), m00(T, R.value);
}
function KO(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [GyT(T)];
  for (let e = 1; e < R; e++) a[e] = GyT(T);
  return a;
}
function VO(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) u00(T, R[a]);
}
function y00(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return "UNSET";
    case 1:
      return "OK";
    case 2:
      return "ERROR";
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
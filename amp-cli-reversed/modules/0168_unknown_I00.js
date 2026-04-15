function TH(T) {
  return q0(T) ? KR(T) : null;
}
function RH(T, R) {
  if (z0(T, R !== null), R !== null) YR(T, R);
}
function k00(T) {
  return {
    code: y00(T),
    message: TH(T)
  };
}
function x00(T, R) {
  P00(T, R.code), RH(T, R.message);
}
function KyT(T) {
  return {
    traceId: oeT(T),
    spanId: lp(T),
    traceState: TH(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T)
  };
}
function f00(T, R) {
  neT(T, R.traceId), Ap(T, R.spanId), RH(T, R.traceState), VO(T, R.attributes), $e(T, R.droppedAttributesCount);
}
function O2T(T) {
  return q0(T) ? lp(T) : null;
}
function d2T(T, R) {
  if (z0(T, R !== null), R !== null) Ap(T, R);
}
function E2T(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KyT(T)];
  for (let e = 1; e < R; e++) a[e] = KyT(T);
  return a;
}
function C2T(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) f00(T, R[a]);
}
function I00(T) {
  return {
    traceId: oeT(T),
    spanId: lp(T),
    parentSpanId: O2T(T),
    name: ZU(T),
    kind: ge(T),
    traceState: TH(T),
    flags: ge(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T),
    links: E2T(T),
    droppedLinksCount: ge(T)
  };
}
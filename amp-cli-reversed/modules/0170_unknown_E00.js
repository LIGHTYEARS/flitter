function leT(T) {
  return q0(T) ? k00(T) : null;
}
function AeT(T, R) {
  if (z0(T, R !== null), R !== null) x00(T, R);
}
function $00(T) {
  return {
    spanId: lp(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T),
    status: leT(T)
  };
}
function v00(T, R) {
  Ap(T, R.spanId), VO(T, R.attributes), $e(T, R.droppedAttributesCount), AeT(T, R.status);
}
function j00(T) {
  return {
    spanId: lp(T),
    name: ZU(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T)
  };
}
function S00(T, R) {
  Ap(T, R.spanId), JU(T, R.name), VO(T, R.attributes), $e(T, R.droppedAttributesCount);
}
function O00(T) {
  return {
    spanId: lp(T),
    status: leT(T)
  };
}
function d00(T, R) {
  Ap(T, R.spanId), AeT(T, R.status);
}
function E00(T) {
  return {
    traceId: oeT(T),
    spanId: lp(T),
    parentSpanId: O2T(T),
    name: ZU(T),
    kind: ge(T),
    startTimeUnixNs: Ws(T),
    traceState: TH(T),
    flags: ge(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T),
    links: E2T(T),
    droppedLinksCount: ge(T),
    status: leT(T)
  };
}
function WR0(T) {
  return typeof T === "object" && T !== null && "~standard" in T;
}
function qR0(T) {
  if (y2T(T)) return !1;
  return typeof T === "object" && T !== null && "message" in T && T.message !== void 0;
}
function y2T(T) {
  return typeof T === "object" && T !== null && "schema" in T && T.schema !== void 0;
}
function P2T(T, R) {
  if (!T) return !1;
  return Object.prototype.hasOwnProperty.call(T, R);
}
function zR0(T) {
  if (!T) return;
  if (y2T(T)) return T.schema;
  if (qR0(T)) return T.message;
  if (typeof T === "object" && T !== null && "schema" in T && T.schema !== void 0) return T.schema;
  if (typeof T === "object" && T !== null && "message" in T && T.message !== void 0) return T.message;
  return T;
}
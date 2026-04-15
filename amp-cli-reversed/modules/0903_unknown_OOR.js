function b6T(T) {
  for (let R of T) {
    if (SOR(R)) return !0;
    if (typeof R === "object" && "inputSchema" in R) return !0;
  }
  return hER;
}
function m6T(T) {
  var R;
  let a = (R = T[HK]) !== null && R !== void 0 ? R : "";
  T[HK] = (a + ` ${rER}`).trimStart();
}
function SOR(T) {
  return T !== null && typeof T === "object" && T instanceof F8T;
}
function OOR(T) {
  return ac(this, arguments, function* (R, a = 100) {
    let e = void 0,
      t = 0;
    while (t < a) {
      let r = yield S9(R.listTools({
        cursor: e
      }));
      for (let h of r.tools) yield yield S9(h), t++;
      if (!r.nextCursor) break;
      e = r.nextCursor;
    }
  });
}
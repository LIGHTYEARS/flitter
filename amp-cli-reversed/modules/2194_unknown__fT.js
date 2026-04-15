function _fT(T, R, a) {
  if (typeof a === "string") {
    if (T.number && a && !Number.isNaN(Number(a))) return Number(a);
    if ((T.boolean || T.overloadedBoolean) && (a === "" || PS(a) === PS(R))) return !0;
  }
  return a;
}
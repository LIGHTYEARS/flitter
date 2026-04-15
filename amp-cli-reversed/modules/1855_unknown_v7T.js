function rc(T, ...R) {
  throw Error(`[Immer] minified error nr: ${T}. Full error at: https://bit.ly/3cXEKWf`);
}
function uk(T) {
  return !!T && !!T[Cr];
}
function wb(T) {
  if (!T) return !1;
  return v7T(T) || Array.isArray(T) || !!T[UG] || !!T.constructor?.[UG] || zN(T) || FN(T);
}
function v7T(T) {
  if (!T || typeof T !== "object") return !1;
  let R = Nb(T);
  if (R === null) return !0;
  let a = Object.hasOwnProperty.call(R, "constructor") && R.constructor;
  if (a === Object) return !0;
  return typeof a == "function" && Function.toString.call(a) === E7T;
}
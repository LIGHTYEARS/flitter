function a7(T, R) {
  if (qN(T) === 0) Reflect.ownKeys(T).forEach(a => {
    R(a, T[a], T);
  });else T.forEach((a, e) => R(e, a, T));
}
function qN(T) {
  let R = T[Cr];
  return R ? R.type_ : Array.isArray(T) ? 1 : zN(T) ? 2 : FN(T) ? 3 : 0;
}
function LG(T, R) {
  return qN(T) === 2 ? T.has(R) : Object.prototype.hasOwnProperty.call(T, R);
}
function j7T(T, R, a) {
  let e = qN(T);
  if (e === 2) T.set(R, a);else if (e === 3) T.add(a);else T[R] = a;
}
function ZkR(T, R) {
  if (T === R) return T !== 0 || 1 / T === 1 / R;else return T !== T && R !== R;
}
function zN(T) {
  return T instanceof Map;
}
function FN(T) {
  return T instanceof Set;
}
function g_(T) {
  return T.copy_ || T.base_;
}
function MG(T, R) {
  if (zN(T)) return new Map(T);
  if (FN(T)) return new Set(T);
  if (Array.isArray(T)) return Array.prototype.slice.call(T);
  let a = v7T(T);
  if (R === !0 || R === "class_only" && !a) {
    let e = Object.getOwnPropertyDescriptors(T);
    delete e[Cr];
    let t = Reflect.ownKeys(e);
    for (let r = 0; r < t.length; r++) {
      let h = t[r],
        i = e[h];
      if (i.writable === !1) i.writable = !0, i.configurable = !0;
      if (i.get || i.set) e[h] = {
        configurable: !0,
        writable: !0,
        enumerable: i.enumerable,
        value: T[h]
      };
    }
    return Object.create(Nb(T), e);
  } else {
    let e = Nb(T);
    if (e !== null && a) return {
      ...T
    };
    let t = Object.create(e);
    return Object.assign(t, T);
  }
}
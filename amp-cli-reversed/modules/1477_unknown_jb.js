function xiR(T) {
  return Object.create(Object.getPrototypeOf(T), Object.getOwnPropertyDescriptors(T));
}
function HA(T, R, a) {
  Object.defineProperty(T, R, {
    value: a,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function Sn(...T) {
  let R = {};
  for (let a of T) {
    let e = Object.getOwnPropertyDescriptors(a);
    Object.assign(R, e);
  }
  return Object.defineProperties({}, R);
}
function fiR(T) {
  return Sn(T._zod.def);
}
function IiR(T, R) {
  if (!R) return T;
  return R.reduce((a, e) => a?.[e], T);
}
function giR(T) {
  let R = Object.keys(T),
    a = R.map(e => T[e]);
  return Promise.all(a).then(e => {
    let t = {};
    for (let r = 0; r < R.length; r++) t[R[r]] = e[r];
    return t;
  });
}
function $iR(T = 10) {
  let R = "";
  for (let a = 0; a < T; a++) R += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  return R;
}
function o2(T) {
  return JSON.stringify(T);
}
function qvT(T) {
  return T.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function _P(T) {
  return typeof T === "object" && T !== null && !Array.isArray(T);
}
function jb(T) {
  if (_P(T) === !1) return !1;
  let R = T.constructor;
  if (R === void 0) return !0;
  if (typeof R !== "function") return !0;
  let a = R.prototype;
  if (_P(a) === !1) return !1;
  if (Object.prototype.hasOwnProperty.call(a, "isPrototypeOf") === !1) return !1;
  return !0;
}
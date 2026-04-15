function b70() {
  return !1;
}
function $70(T, R) {
  let a;
  return function (...e) {
    let t = () => {
      clearTimeout(a), T(...e);
    };
    clearTimeout(a), a = setTimeout(t, R);
  };
}
function S70(T) {
  var R;
  if (T >= 55296 && T <= 57343 || T > 1114111) return 65533;
  return (R = v70.get(T)) !== null && R !== void 0 ? R : T;
}
function JJT(T) {
  let R = typeof atob === "function" ? atob(T) : typeof Buffer.from === "function" ? Buffer.from(T, "base64").toString("binary") : new Buffer(T, "base64").toString("binary"),
    a = R.length & -2,
    e = new Uint16Array(a / 2);
  for (let t = 0, r = 0; t < a; t += 2) {
    let h = R.charCodeAt(t),
      i = R.charCodeAt(t + 1);
    e[r++] = h | i << 8;
  }
  return e;
}
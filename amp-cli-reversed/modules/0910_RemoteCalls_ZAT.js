function MOR(T) {
  let R = {};
  return T.forEach((a, e) => {
    R[e] = a;
  }), R;
}
function DOR(T) {
  let R = new Headers();
  for (let [a, e] of Object.entries(T)) R.append(a, e);
  return R;
}
function ZAT(T) {
  var R, a, e;
  if ((R = T === null || T === void 0 ? void 0 : T.automaticFunctionCalling) === null || R === void 0 ? void 0 : R.disable) return !0;
  let t = !1;
  for (let h of (a = T === null || T === void 0 ? void 0 : T.tools) !== null && a !== void 0 ? a : []) if (MP(h)) {
    t = !0;
    break;
  }
  if (!t) return !0;
  let r = (e = T === null || T === void 0 ? void 0 : T.automaticFunctionCalling) === null || e === void 0 ? void 0 : e.maximumRemoteCalls;
  if (r && (r < 0 || !Number.isInteger(r)) || r == 0) return console.warn("Invalid maximumRemoteCalls value provided for automatic function calling. Disabled automatic function calling. Please provide a valid integer value greater than 0. maximumRemoteCalls provided:", r), !0;
  return !1;
}
function MP(T) {
  return "callTool" in T && typeof T.callTool === "function";
}
function wOR(T) {
  var R, a, e;
  return (e = (a = (R = T.config) === null || R === void 0 ? void 0 : R.tools) === null || a === void 0 ? void 0 : a.some(t => MP(t))) !== null && e !== void 0 ? e : !1;
}
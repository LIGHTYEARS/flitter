function ZgR() {
  return {
    geminiUrl: QdR,
    vertexUrl: ZdR
  };
}
function JgR(T, R, a, e) {
  var t, r;
  if (!(T === null || T === void 0 ? void 0 : T.baseUrl)) {
    let h = ZgR();
    if (R) return (t = h.vertexUrl) !== null && t !== void 0 ? t : a;else return (r = h.geminiUrl) !== null && r !== void 0 ? r : e;
  }
  return T.baseUrl;
}
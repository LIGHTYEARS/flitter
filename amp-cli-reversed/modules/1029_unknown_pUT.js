function uU(T, R, a) {
  return m0(WCR(T.configService.config, a?.defaultHeaders), R);
}
function m3T(T, R, a) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...Vs(T),
    ...(R != null ? {
      [zA]: String(R)
    } : {}),
    ...(a ?? {})
  };
}
function qCR(T) {
  return T?.some(R => R.name === dr.OPENAI_FAST && R.enabled) ?? !1;
}
function u3T(T, R) {
  if (T) return T;
  return qCR(R) ? "fast" : void 0;
}
function AUT(T, R, a) {
  let e = u3T(R, a);
  return qo(T) && e === "fast" ? "priority" : void 0;
}
function pUT(T) {
  let R = new Set();
  return T.filter(a => {
    if (R.has(a.name)) return !1;
    return R.add(a.name), !0;
  }).map(a => ({
    type: "function",
    function: {
      name: a.name,
      description: a.description ?? "",
      parameters: a.inputSchema
    }
  }));
}
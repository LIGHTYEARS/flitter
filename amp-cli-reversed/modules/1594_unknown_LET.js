function Va(T) {
  if ("complete" in T) return T.complete;
  return !("inputPartialJSON" in T);
}
function LET(T) {
  if (!T || typeof T !== "object") return;
  let R = T,
    a = typeof R.sentAt === "number" ? R.sentAt : void 0,
    e = R.fromAggman === !0 || "aggman" in R && !!R.aggman ? !0 : void 0,
    t = typeof R.fromExecutorThreadID === "string" && Vt(R.fromExecutorThreadID) ? R.fromExecutorThreadID : void 0;
  if (a === void 0 && e === void 0 && t === void 0) return;
  return {
    ...(a !== void 0 ? {
      sentAt: a
    } : {}),
    ...(e === !0 ? {
      fromAggman: e
    } : {}),
    ...(t !== void 0 ? {
      fromExecutorThreadID: t
    } : {})
  };
}
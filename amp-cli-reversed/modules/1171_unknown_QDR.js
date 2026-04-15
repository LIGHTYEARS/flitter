function XDR(T, R, a) {
  return m0(VDR(T.configService.config, a?.defaultHeaders), R);
}
function YDR(T, R) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...(R != null ? {
      [zA]: String(R)
    } : {}),
    ...Vs(T)
  };
}
function QDR(T) {
  let R = T?.message;
  if (typeof R === "string") {
    if (R.includes("maximum context length") || R.includes("prompt is too long") || R.includes("too many tokens")) return new rp("Token limit exceeded.");
  }
  return T;
}
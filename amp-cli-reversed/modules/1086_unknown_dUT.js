function J4R(T, R, a) {
  return m0(Z4R(T.configService.config, a?.defaultHeaders), R);
}
function OUT(T, R) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...(R != null ? {
      [zA]: String(R)
    } : {}),
    ...Vs(T),
    "x-session-affinity": T.id
  };
}
function dUT(T) {
  let R = T?.message;
  if (typeof R === "string") {
    if (R.includes("maximum context length") || R.includes("prompt is too long") || R.includes("too many tokens")) return new rp("Token limit exceeded.");
  }
  return T;
}
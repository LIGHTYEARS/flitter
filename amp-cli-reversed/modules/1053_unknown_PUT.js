function uUT(T, R, a) {
  return m0(i4R(T.configService.config, a?.defaultHeaders), R);
}
function yUT(T, R) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...(R != null ? {
      [zA]: String(R)
    } : {}),
    "x-grok-conv-id": T.id,
    ...Vs(T)
  };
}
function PUT(T) {
  let R = T?.message;
  if (typeof R === "string") {
    if (R.includes("This model's maximum prompt length is") && R.includes("but the request contains") && R.includes("tokens.")) return new rp("Token limit exceeded.");
  }
  return T;
}
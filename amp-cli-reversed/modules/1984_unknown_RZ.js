async function Mz0(T) {
  try {
    return await $5T(T, "utf-8");
  } catch {
    return T;
  }
}
async function RZ(T, R, a) {
  let e = R3R(T, R);
  if (!e) return;
  let t = X9(a) ? a.features : [],
    r = X9(a) ? a.user.email : void 0;
  if (!SS(t, dr.HARNESS_SYSTEM_PROMPT) && !a3R(r)) throw new GR("You are not allowed to do this.", 1);
  Ms("systemPrompt", await Mz0(e));
}
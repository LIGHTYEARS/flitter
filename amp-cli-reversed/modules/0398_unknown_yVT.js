function s_0() {
  if (process.env.AMP_HEADLESS_OAUTH === "1" || process.env.AMP_HEADLESS_OAUTH === "true") return !0;
  return r_0();
}
function b_0(T) {
  try {
    return process.kill(T, 0), !0;
  } catch (R) {
    return R.code === "EPERM";
  }
}
function uVT(T) {
  let R = T.trim();
  if (!/^\d+$/.test(R)) return;
  let a = Number.parseInt(R, 10);
  return Number.isSafeInteger(a) && a > 0 ? a : void 0;
}
function ctT(T, R) {
  return T.code === R;
}
async function yVT(T) {
  try {
    let R = await A_0(T, "utf-8"),
      a = uVT(R);
    if (a === void 0) return {
      kind: "invalid",
      value: R.trim()
    };
    return {
      kind: "valid",
      pid: a
    };
  } catch (R) {
    if (ctT(R, "ENOENT")) return {
      kind: "missing"
    };
    throw R;
  }
}
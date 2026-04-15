function hVT(T) {
  let R = ZA0(_p0(T), KA0);
  return {
    key: Z3T,
    dataType: "application/json",
    contentBase64: R
  };
}
function bp0(T, R, a, e = iVT) {
  return yH(T, e, t => ({
    type: "executor_guidance_snapshot",
    snapshotId: R,
    files: t,
    isLast: !1,
    userConfigDir: a
  }));
}
function cVT(T, R, a = iVT) {
  return yH(T, a, e => ({
    type: "executor_guidance_discovery",
    toolCallId: R,
    files: e,
    isLast: !1
  }));
}
function sVT(T, R) {
  if (T >= R.maxAttempts) return null;
  let a = Math.max(1, T);
  return Math.min(R.baseDelayMs * 2 ** (a - 1), R.maxDelayMs);
}
function mp0(T) {
  return typeof T === "object" && T !== null && "output" in T && T.output === "";
}
function up0() {
  let T = () => {
      return;
    },
    R = () => {
      return;
    };
  return {
    promise: new Promise((a, e) => {
      T = a, R = e;
    }),
    resolve: T,
    reject: R
  };
}
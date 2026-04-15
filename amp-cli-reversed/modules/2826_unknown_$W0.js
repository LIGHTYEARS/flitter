function fW0(T) {
  return WO(T);
}
function IW0(T) {
  return uzT(WO(T));
}
function gW0(T, R) {
  let a = T.trim();
  if (!a) return;
  let e = $W0(R),
    t = vW0(R);
  return {
    command: a,
    output: e,
    status: R.status,
    exitCode: t
  };
}
function $W0(T) {
  if (T.status === "done" && typeof T.result === "object") {
    let R = R2(T.result);
    if (R) return tL(R);
  }
  if (T.status === "error" && T.error) return tL(String(T.error));
  if (T.status === "cancelled" && T.progress && typeof T.progress === "object") {
    let R = R2(T.progress);
    if (R) return tL(R);
  }
  if (T.status === "in-progress" && T.progress && typeof T.progress === "object") {
    let R = R2(T.progress);
    if (R) return tL(R);
  }
  return;
}
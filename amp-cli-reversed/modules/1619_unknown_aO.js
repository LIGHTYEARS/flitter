function lCT(T) {
  if (!T) return !1;
  return T.range.startLine === T.range.endLine && T.range.startCharacter === T.range.endCharacter;
}
function aO(T) {
  if (T <= 0) return !1;
  try {
    return process.kill(T, 0), !0;
  } catch (R) {
    let a = R?.code;
    if (a === "ESRCH") return !1;
    if (a === "EPERM" || a === "EACCES") return !0;
    return J.debug("PID check error", {
      pid: T,
      code: a
    }), !1;
  }
}
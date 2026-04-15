function xy0(T) {
  try {
    return process.kill(T, 0), !0;
  } catch (R) {
    return R.code === "EPERM";
  }
}
function ItT(T, R) {
  return T.code === R;
}
function fy0(T) {
  return T instanceof Error ? T.message : String(T);
}
function rXT(T) {
  if (typeof T !== "string") return null;
  let R = T.trim();
  return R.length > 0 ? R : null;
}
function Iy0(T, R) {
  let a = Reflect.get(T, R);
  if (typeof a !== "number") return;
  return Number.isSafeInteger(a) && a > 0 ? a : void 0;
}
function gy0(T, R) {
  return rXT(Reflect.get(T, R));
}
function $y0(T) {
  let R;
  try {
    R = JSON.parse(T);
  } catch {
    return;
  }
  if (!R || typeof R !== "object") return;
  let a = Iy0(R, "pid"),
    e = Reflect.get(R, "threadId"),
    t = gy0(R, "threadTitle");
  if (a === void 0 || typeof e !== "string" || !Vt(e)) return;
  return {
    pid: a,
    threadId: e,
    threadTitle: t
  };
}
function JxT(T) {
  return "isTTY" in T && T.isTTY === !0 && typeof T.setRawMode === "function";
}
function Uk0(T) {
  try {
    if (T._refreshSize?.(), T.isTTY && T.columns && T.rows) return {
      width: T.columns,
      height: T.rows
    };
    let R = T.getWindowSize?.();
    if (R && R[0] > 0 && R[1] > 0) return {
      width: R[0],
      height: R[1]
    };
  } catch {}
  return null;
}
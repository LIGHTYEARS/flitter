function vy0(T) {
  let R = {
    pid: T.pid,
    threadId: T.threadId
  };
  if (T.threadTitle) R.threadTitle = T.threadTitle;
  return `${JSON.stringify(R)}
`;
}
function jy0(T) {
  return {
    pid: T.currentPID ?? process.pid,
    threadId: T.currentThreadId,
    threadTitle: rXT(T.currentThreadTitle)
  };
}
async function hXT(T) {
  try {
    let R = await my0(T, "utf-8"),
      a = $y0(R);
    if (a === void 0) return {
      kind: "invalid",
      value: R.trim()
    };
    return {
      kind: "valid",
      contents: a
    };
  } catch (R) {
    if (ItT(R, "ENOENT")) return {
      kind: "missing"
    };
    throw R;
  }
}
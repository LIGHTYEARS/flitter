function Fp0(T) {
  if (typeof T !== "number" || !Number.isFinite(T)) return 0;
  return Math.max(0, Math.trunc(T));
}
function eY(T) {
  if (!T || T.length === 0) return;
  return T.map(R => ({
    uri: R.uri,
    lineCount: Fp0(R.lineCount),
    ...(typeof R.content === "string" ? {
      content: R.content
    } : {})
  }));
}
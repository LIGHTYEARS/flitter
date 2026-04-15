function MVT() {
  if (process.env.AMP_HOME) return !1;
  let T = process.execPath;
  if (T.includes("/node_modules/") || T.includes("\\node_modules\\")) return !1;
  if (sY(T)) return !1;
  return !0;
}
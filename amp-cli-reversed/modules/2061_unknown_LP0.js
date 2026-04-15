function RA(T) {
  return "isTTY" in T && T.isTTY === !0;
}
function OH(T) {
  return RA(T) && OXT(T) >= 8;
}
function OXT(T) {
  if ("getColorDepth" in T && typeof T.getColorDepth === "function") return T.getColorDepth();
  return 1;
}
function CP0(T) {
  if ("columns" in T && typeof T.columns === "number" && T.columns > 0) return T.columns;
  return null;
}
function LP0(T, R) {
  let a = CP0(R);
  if (!a) return T;
  let e = Math.max(1, a - 1);
  if (T.length <= e) return T;
  let t = T.match(/^(\S+ (?:Updating|Removing|Syncing)\.\.\. )(.*)$/u);
  if (!t) return `${T.slice(0, Math.max(0, e - 1))}\u2026`;
  let [, r, h] = t;
  if (!r || !h || r.length + 1 >= e) return `${T.slice(0, Math.max(0, e - 1))}\u2026`;
  let i = e - r.length - 1;
  return `${r}\u2026${h.slice(-i)}`;
}
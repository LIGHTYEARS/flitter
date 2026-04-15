function Hj0(T, R, a) {
  let e = (mQT(a) + (a.options.ruleSpaces ? " " : "")).repeat(Uj0(a));
  return a.options.ruleSpaces ? e.slice(0, -1) : e;
}
function qj0(T, R, a, e) {
  if (R.type === "code" && XY(R, e) && (T.type === "list" || T.type === R.type && XY(T, e))) return !1;
  if ("spread" in a && typeof a.spread === "boolean") {
    if (T.type === "paragraph" && (T.type === R.type || R.type === "definition" || R.type === "heading" && sQT(R, e))) return;
    return a.spread ? 1 : 0;
  }
}
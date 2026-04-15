function FfT(T, R) {
  if (R) T.push(...R);
}
function aj0(T, R) {
  if (R) Object.assign(T, R);
}
function ej0(T, R, a, e) {
  let t = a.enter("blockquote"),
    r = a.createTracker(e);
  r.move("> "), r.shift(2);
  let h = a.indentLines(a.containerFlow(T, r.current()), tj0);
  return t(), h;
}
function tj0(T, R, a) {
  return ">" + (a ? "" : " ") + T;
}
function rQT(T, R) {
  return GfT(T, R.inConstruct, !0) && !GfT(T, R.notInConstruct, !1);
}
function GfT(T, R, a) {
  if (typeof R === "string") R = [R];
  if (!R || R.length === 0) return a;
  let e = -1;
  while (++e < R.length) if (T.includes(R[e])) return !0;
  return !1;
}
function KfT(T, R, a, e) {
  let t = -1;
  while (++t < a.unsafe.length) if (a.unsafe[t].character === `
` && rQT(a.stack, a.unsafe[t])) return /[ \t]/.test(e.before) ? "" : " ";
  return "\\\n";
}
function rj0(T, R) {
  let a = String(T),
    e = a.indexOf(R),
    t = e,
    r = 0,
    h = 0;
  if (typeof R !== "string") throw TypeError("Expected substring");
  while (e !== -1) {
    if (e === t) {
      if (++r > h) h = r;
    } else r = 1;
    t = e + R.length, e = a.indexOf(R, t);
  }
  return h;
}
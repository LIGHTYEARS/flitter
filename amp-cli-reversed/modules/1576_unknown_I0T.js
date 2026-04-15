function f0T(T, R) {
  return a => {
    return AR.from(a).pipe(L9(e => e === Jo ? AR.of(Jo) : T(e).pipe(vs(t => AR.of(t instanceof Error ? t : Error(t))), Y3(Jo))), f3(R));
  };
}
function nET() {
  return T => AR.from(T).pipe(da(R => R !== Jo));
}
async function UnR(T, R) {
  let a = await m0(AR.from(T).pipe(nET()), R);
  if (a instanceof Error) throw a;
  return a;
}
function Ob(T) {
  let R = typeof T === "string" ? T : T.toString();
  return R === Lr || R === Lr.slice(0, -1);
}
function ID(T) {
  return Ob(T) ? Lr : T;
}
function znR(T) {
  let R = (typeof T === "string" ? new URL(T) : T).hostname;
  return R === $2.hostname || R === "localhost" || R === biT.slice(1) || R.endsWith(biT);
}
function GnR(T) {
  return v2.safeParse(T);
}
function fj(T) {
  return lET.safeParse(T);
}
function I0T(T) {
  if (!T || !Array.isArray(T)) return [];
  let R = [];
  for (let [a, e] of T.entries()) {
    let t = GnR(e);
    if (t.success) R.push(t.data);else {
      let r = typeof e === "object" && e !== null && "tool" in e ? String(e.tool) : `entry at index ${a}`;
      J.warn(`Permission entry for tool "${r}" is invalid: ${t.error.issues.map(h => `${h.path.join(".")}: ${h.message}`).join(", ")}`);
    }
  }
  return R;
}
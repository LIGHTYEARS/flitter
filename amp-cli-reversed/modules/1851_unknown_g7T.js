function GkR(T, R, a = () => !0) {
  let e = R();
  for (let [t, r] of T) {
    if (!a(r, t)) continue;
    let h = e.get(t);
    if (!h || r.timestamp >= h.timestamp) e.set(t, r);
  }
  return e;
}
function I7T(T, R = () => !0) {
  function* a() {
    for (let e of T.values()) yield* e;
  }
  return GkR(a(), () => new xh(), R);
}
async function g7T(T, R, a) {
  if (R <= 0) throw Error("chunkSize must be greater than 0");
  if (T.length === 0) return;
  for (let e = 0; e < T.length; e += R) await Promise.all(T.slice(e, e + R).map(a));
}
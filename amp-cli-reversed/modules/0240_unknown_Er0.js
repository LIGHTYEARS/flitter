function vr0(T, R, a) {
  if (typeof T === "string") return {
    refId: T,
    metadata: R,
    options: a
  };
  return {
    refId: void 0,
    metadata: T,
    options: R
  };
}
async function dr0(T, R) {
  let a = await T.formData();
  if (a) return Er0(a, R);
  return {};
}
function Er0(T, R) {
  let a = Object.create(null);
  if (T.forEach((e, t) => {
    if (!(R.all || t.endsWith("[]"))) a[t] = e;else Cr0(a, t, e);
  }), R.dot) Object.entries(a).forEach(([e, t]) => {
    if (e.includes(".")) Lr0(a, e, t), delete a[e];
  });
  return a;
}
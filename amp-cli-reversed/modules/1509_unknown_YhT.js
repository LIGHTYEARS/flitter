function pE(T, R, a, e) {
  if (T.issues.length) return T.aborted = !0, T;
  return a._zod.run({
    value: R,
    issues: T.issues
  }, e);
}
function XhT(T) {
  return T.value = Object.freeze(T.value), T;
}
function YhT(T, R, a, e) {
  if (!T) {
    let t = {
      code: "custom",
      input: a,
      inst: e,
      path: [...(e._zod.def.path ?? [])],
      continue: !e._zod.def.abort
    };
    if (e._zod.def.params) t.params = e._zod.def.params;
    R.issues.push(rD(t));
  }
}
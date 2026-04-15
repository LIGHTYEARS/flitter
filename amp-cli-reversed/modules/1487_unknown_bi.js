function z_(T, R = 0) {
  if (T.aborted === !0) return !0;
  for (let a = R; a < T.issues.length; a++) if (T.issues[a]?.continue !== !0) return !0;
  return !1;
}
function cc(T, R) {
  return R.map(a => {
    var e;
    return (e = a).path ?? (e.path = []), a.path.unshift(T), a;
  });
}
function Eg(T) {
  return typeof T === "string" ? T : T?.message;
}
function bi(T, R, a) {
  let e = {
    ...T,
    path: T.path ?? []
  };
  if (!T.message) {
    let t = Eg(T.inst?._zod.def?.error?.(T)) ?? Eg(R?.error?.(T)) ?? Eg(a.customError?.(T)) ?? Eg(a.localeError?.(T)) ?? "Invalid input";
    e.message = t;
  }
  if (delete e.inst, delete e.continue, !R?.reportInput) delete e.input;
  return e;
}
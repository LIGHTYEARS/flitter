function VxT(T) {
  let R = T.toLowerCase().split("+"),
    a = R.pop() || "";
  return {
    modifiers: new Set(R),
    key: a
  };
}
function XxT(T, R) {
  let a = VxT(T),
    e = VxT(R);
  if (a.key !== e.key) return !1;
  for (let t of e.modifiers) if (!a.modifiers.has(t)) return !1;
  if (e.modifiers.size === 0 && a.modifiers.size > 0) return !1;
  return !0;
}
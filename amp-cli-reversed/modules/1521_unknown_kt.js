function kt(T, R) {
  let a = R ?? {
    seen: new Set()
  };
  if (a.seen.has(T)) return !1;
  a.seen.add(T);
  let e = T._zod.def;
  if (e.type === "transform") return !0;
  if (e.type === "array") return kt(e.element, a);
  if (e.type === "set") return kt(e.valueType, a);
  if (e.type === "lazy") return kt(e.getter(), a);
  if (e.type === "promise" || e.type === "optional" || e.type === "nonoptional" || e.type === "nullable" || e.type === "readonly" || e.type === "default" || e.type === "prefault") return kt(e.innerType, a);
  if (e.type === "intersection") return kt(e.left, a) || kt(e.right, a);
  if (e.type === "record" || e.type === "map") return kt(e.keyType, a) || kt(e.valueType, a);
  if (e.type === "pipe") return kt(e.in, a) || kt(e.out, a);
  if (e.type === "object") {
    for (let t in e.shape) if (kt(e.shape[t], a)) return !0;
    return !1;
  }
  if (e.type === "union") {
    for (let t of e.options) if (kt(t, a)) return !0;
    return !1;
  }
  if (e.type === "tuple") {
    for (let t of e.items) if (kt(t, a)) return !0;
    if (e.rest && kt(e.rest, a)) return !0;
    return !1;
  }
  return !1;
}
function* afR(T) {
  if (!T) return;
  if (p8T in T) {
    let {
      values: e,
      nulls: t
    } = T;
    yield* e.entries();
    for (let r of t) yield [r, null];
    return;
  }
  let R = !1,
    a;
  if (T instanceof Headers) a = T.entries();else if (ZG(T)) a = T;else R = !0, a = Object.entries(T ?? {});
  for (let e of a) {
    let t = e[0];
    if (typeof t !== "string") throw TypeError("expected header name to be a string");
    let r = ZG(e[1]) ? e[1] : [e[1]],
      h = !1;
    for (let i of r) {
      if (i === void 0) continue;
      if (R && !h) h = !0, yield [t, null];
      yield [t, i];
    }
  }
}
function UL(T, R) {
  if (!T || typeof T === "number" || typeof T === "boolean") return T;
  if (typeof T === "string") return R(T);
  if (Array.isArray(T)) return T.map(a => {
    if (typeof a === "string") return R(a);else if (a && typeof a === "object") return UL(a, R);
    return a;
  });
  if (T && typeof T === "object") {
    if ("type" in T && (T.type === "base64" || T.type === "image") && "data" in T) return {
      ...T
    };
    if ("isImage" in T && T.isImage === !0 && "content" in T && typeof T.content === "string") {
      let a = {};
      for (let [e, t] of Object.entries(T)) if (e === "content") a[e] = t;else a[e] = UL(t, R);
      return a;
    }
  }
  return Object.fromEntries(Object.entries(T).map(([a, e]) => [a, UL(e, R)]));
}
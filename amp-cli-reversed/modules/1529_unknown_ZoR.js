function ZoR(T, R) {
  if (typeof T === "boolean") return T ? p0.any() : p0.never();
  let a = YoR(T, R?.defaultTarget),
    e = T.$defs || T.definitions || {},
    t = {
      version: a,
      defs: e,
      refs: new Map(),
      processing: new Set(),
      rootSchema: T,
      registry: R?.registry ?? Ph
    };
  return at(T, t);
}
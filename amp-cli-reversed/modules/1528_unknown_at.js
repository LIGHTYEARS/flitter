function at(T, R) {
  if (typeof T === "boolean") return T ? p0.any() : p0.never();
  let a = DdT(T, R),
    e = T.type || T.enum !== void 0 || T.const !== void 0;
  if (T.anyOf && Array.isArray(T.anyOf)) {
    let i = T.anyOf.map(s => at(s, R)),
      c = p0.union(i);
    a = e ? p0.intersection(a, c) : c;
  }
  if (T.oneOf && Array.isArray(T.oneOf)) {
    let i = T.oneOf.map(s => at(s, R)),
      c = p0.xor(i);
    a = e ? p0.intersection(a, c) : c;
  }
  if (T.allOf && Array.isArray(T.allOf)) if (T.allOf.length === 0) a = e ? a : p0.any();else {
    let i = e ? a : at(T.allOf[0], R),
      c = e ? 0 : 1;
    for (let s = c; s < T.allOf.length; s++) i = p0.intersection(i, at(T.allOf[s], R));
    a = i;
  }
  if (T.nullable === !0 && R.version === "openapi-3.0") a = p0.nullable(a);
  if (T.readOnly === !0) a = p0.readonly(a);
  let t = {},
    r = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
  for (let i of r) if (i in T) t[i] = T[i];
  let h = ["contentEncoding", "contentMediaType", "contentSchema"];
  for (let i of h) if (i in T) t[i] = T[i];
  for (let i of Object.keys(T)) if (!wdT.has(i)) t[i] = T[i];
  if (Object.keys(t).length > 0) R.registry.add(a, t);
  return a;
}
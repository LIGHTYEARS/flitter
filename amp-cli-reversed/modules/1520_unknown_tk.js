function tk(T, R) {
  let a = T.seen.get(R);
  if (!a) throw Error("Unprocessed schema. This is a bug in Zod.");
  let e = h => {
    let i = T.seen.get(h);
    if (i.ref === null) return;
    let c = i.def ?? i.schema,
      s = {
        ...c
      },
      A = i.ref;
    if (i.ref = null, A) {
      e(A);
      let o = T.seen.get(A),
        n = o.schema;
      if (n.$ref && (T.target === "draft-07" || T.target === "draft-04" || T.target === "openapi-3.0")) c.allOf = c.allOf ?? [], c.allOf.push(n);else Object.assign(c, n);
      if (Object.assign(c, s), h._zod.parent === A) for (let p in c) {
        if (p === "$ref" || p === "allOf") continue;
        if (!(p in s)) delete c[p];
      }
      if (n.$ref && o.def) for (let p in c) {
        if (p === "$ref" || p === "allOf") continue;
        if (p in o.def && JSON.stringify(c[p]) === JSON.stringify(o.def[p])) delete c[p];
      }
    }
    let l = h._zod.parent;
    if (l && l !== A) {
      e(l);
      let o = T.seen.get(l);
      if (o?.schema.$ref) {
        if (c.$ref = o.schema.$ref, o.def) for (let n in c) {
          if (n === "$ref" || n === "allOf") continue;
          if (n in o.def && JSON.stringify(c[n]) === JSON.stringify(o.def[n])) delete c[n];
        }
      }
    }
    T.override({
      zodSchema: h,
      jsonSchema: c,
      path: i.path ?? []
    });
  };
  for (let h of [...T.seen.entries()].reverse()) e(h[0]);
  let t = {};
  if (T.target === "draft-2020-12") t.$schema = "https://json-schema.org/draft/2020-12/schema";else if (T.target === "draft-07") t.$schema = "http://json-schema.org/draft-07/schema#";else if (T.target === "draft-04") t.$schema = "http://json-schema.org/draft-04/schema#";else if (T.target === "openapi-3.0") ;
  if (T.external?.uri) {
    let h = T.external.registry.get(R)?.id;
    if (!h) throw Error("Schema is missing an `id` property");
    t.$id = T.external.uri(h);
  }
  Object.assign(t, a.def ?? a.schema);
  let r = T.external?.defs ?? {};
  for (let h of T.seen.entries()) {
    let i = h[1];
    if (i.def && i.defId) r[i.defId] = i.def;
  }
  if (T.external) ;else if (Object.keys(r).length > 0) if (T.target === "draft-2020-12") t.$defs = r;else t.definitions = r;
  try {
    let h = JSON.parse(JSON.stringify(t));
    return Object.defineProperty(h, "~standard", {
      value: {
        ...R["~standard"],
        jsonSchema: {
          input: Yv(R, "input", T.processors),
          output: Yv(R, "output", T.processors)
        }
      },
      enumerable: !1,
      writable: !1
    }), h;
  } catch (h) {
    throw Error("Error converting schema to JSON.");
  }
}
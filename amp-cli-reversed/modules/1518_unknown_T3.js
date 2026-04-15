function T3(T, R, a = {
  path: [],
  schemaPath: []
}) {
  var e;
  let t = T._zod.def,
    r = R.seen.get(T);
  if (r) {
    if (r.count++, a.schemaPath.includes(T)) r.cycle = a.path;
    return r.schema;
  }
  let h = {
    schema: {},
    count: 1,
    cycle: void 0,
    path: a.path
  };
  R.seen.set(T, h);
  let i = T._zod.toJSONSchema?.();
  if (i) h.schema = i;else {
    let s = {
      ...a,
      schemaPath: [...a.schemaPath, T],
      path: a.path
    };
    if (T._zod.processJSONSchema) T._zod.processJSONSchema(R, h.schema, s);else {
      let l = h.schema,
        o = R.processors[t.type];
      if (!o) throw Error(`[toJSONSchema]: Non-representable type encountered: ${t.type}`);
      o(T, R, l, s);
    }
    let A = T._zod.parent;
    if (A) {
      if (!h.ref) h.ref = A;
      T3(A, R, s), R.seen.get(A).isParent = !0;
    }
  }
  let c = R.metadataRegistry.get(T);
  if (c) Object.assign(h.schema, c);
  if (R.io === "input" && kt(T)) delete h.schema.examples, delete h.schema.default;
  if (R.io === "input" && h.schema._prefault) (e = h.schema).default ?? (e.default = h.schema._prefault);
  return delete h.schema._prefault, R.seen.get(T).schema;
}
function Q4R(T) {
  if (T.type) return T;
  if (T.items !== void 0) return {
    ...T,
    type: "array"
  };
  return {
    ...T,
    type: "object"
  };
}
function SUT(T) {
  let R = new Set();
  return T.filter(a => {
    if (R.has(a.name)) return !1;
    return R.add(a.name), !0;
  }).map(a => {
    let e = a.inputSchema,
      t = e?.properties ?? {},
      r = {};
    for (let [i, c] of Object.entries(t)) r[i] = Q4R(c);
    let h = {
      type: e?.type ?? "object",
      properties: r,
      required: e?.required ?? [],
      additionalProperties: !0
    };
    return {
      type: "function",
      function: {
        name: a.name,
        description: a.description ?? "",
        parameters: h
      }
    };
  });
}
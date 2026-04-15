function kO(T) {
  let R = new Set();
  return T.filter(a => {
    if (R.has(a.name)) return !1;
    return R.add(a.name), !0;
  }).map(a => ({
    name: a.name,
    description: a.description ?? "",
    eager_input_streaming: !0,
    input_schema: a.inputSchema
  }));
}
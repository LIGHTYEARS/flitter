function ODR(T) {
  let R = new Set();
  return T.filter(a => {
    if (R.has(a.name)) return !1;
    return R.add(a.name), !0;
  }).map(a => ({
    type: "function",
    function: {
      name: a.name,
      description: a.description ?? "",
      parameters: a.inputSchema
    }
  }));
}
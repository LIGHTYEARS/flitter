function k3T(T) {
  let R = T.inputSchema?.properties ?? {},
    a = T.inputSchema?.required ?? [],
    e = {
      type: T.inputSchema?.type ?? "object",
      properties: R,
      required: a,
      additionalProperties: !0
    };
  return {
    type: "function",
    name: T.name,
    description: T.description || "",
    parameters: e,
    strict: !1
  };
}
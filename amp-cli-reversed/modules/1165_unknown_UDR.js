function wDR(T) {
  return typeof T === "object" && T !== null && "type" in T && "message" in T && typeof T.type === "string" && typeof T.message === "string";
}
function BDR(T) {
  if (wDR(T)) {
    if (T.type === "invalid_request_error" && T.message.toLowerCase().includes("prompt is too long")) return new rp();
  }
  return T;
}
function UDR(T) {
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
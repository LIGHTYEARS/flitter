function SVR(T) {
  if (T.status === "error") {
    let R = T.error;
    return `Error: ${R?.message || JSON.stringify(R) || "Unknown error"}`;
  }
  if (T.status === "done") {
    if (typeof T.result === "string") return T.result;
    if (typeof T.result === "object" && T.result?.content) return T.result.content;
    let R = JSON.stringify(T.result);
    return R === void 0 ? "" : R;
  }
  return `Tool execution status: ${T.status}`;
}
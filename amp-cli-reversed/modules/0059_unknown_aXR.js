function aXR(T) {
  if (T.status === "error") {
    let R = T.error;
    return JSON.stringify(R);
  }
  if (T.status === "done") {
    if (typeof T.result === "string") return T.result;
    let R = JSON.stringify(T.result);
    return R === void 0 ? "" : R;
  }
  return `Tool execution status: ${T.status}`;
}
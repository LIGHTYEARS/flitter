function lCR(T, R) {
  if (T.response_format?.type !== "json_schema") return null;
  if (T.response_format?.type === "json_schema") {
    if ("$parseRaw" in T.response_format) return T.response_format.$parseRaw(R);
    return JSON.parse(R);
  }
  return null;
}
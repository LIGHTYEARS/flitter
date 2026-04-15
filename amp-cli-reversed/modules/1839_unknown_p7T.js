function p7T(T, R) {
  let a = R instanceof Error ? R.message : String(R),
    e = d0(T);
  if (R instanceof _b) return {
    path: e,
    error: R.message,
    hint: R.hint
  };
  if (a.includes("YAMLParseError") || a.includes("YAML") || a.includes("Nested mappings are not allowed") || a.includes("Implicit map keys") || a.includes("at line") || R?.constructor?.name === "YAMLParseError") {
    let {
      message: t,
      hint: r
    } = UkR(R);
    return {
      path: e,
      error: t,
      hint: r
    };
  }
  return {
    path: e,
    error: a
  };
}
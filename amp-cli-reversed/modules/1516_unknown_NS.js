function NS(T, R, a, e = {}) {
  let t = a0(e),
    r = {
      ...a0(e),
      check: "string_format",
      type: "string",
      format: R,
      fn: typeof a === "function" ? a : h => a.test(h),
      ...t
    };
  if (a instanceof RegExp) r.pattern = a;
  return new T(r);
}
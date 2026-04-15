function Q1R(T) {
  if (typeof T === "string" || typeof T === "number" || typeof T === "bigint" || typeof T === "boolean" || T === null || T === void 0) return T;
  if (T instanceof Error) return String(T);
  try {
    return JSON.stringify(T);
  } catch {
    return "[cannot stringify]";
  }
}
function oL(T) {
  if (T instanceof Set) return "set";
  if (T instanceof Map) return "map";
  if (T instanceof File) return "file";
  return "unknown";
}
function nL(T) {
  if (Array.isArray(T)) return "array";
  if (typeof T === "string") return "string";
  return "unknown";
}
function u9(T) {
  let R = typeof T;
  switch (R) {
    case "number":
      return Number.isNaN(T) ? "nan" : "number";
    case "object":
      {
        if (T === null) return "null";
        if (Array.isArray(T)) return "array";
        let a = T;
        if (a && Object.getPrototypeOf(a) !== Object.prototype && "constructor" in a && a.constructor) return a.constructor.name;
      }
  }
  return R;
}
function E7R(T) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(T) ? T : JSON.stringify(T);
}
function C7R(T) {
  if (T === null) return "null";
  switch (typeof T) {
    case "string":
    case "number":
    case "boolean":
      return JSON.stringify(T);
    default:
      return "unknown";
  }
}
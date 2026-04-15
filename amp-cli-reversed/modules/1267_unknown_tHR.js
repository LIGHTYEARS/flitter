function tHR(T) {
  switch (typeof T) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "object":
      {
        if (!T) return "null";else if (Array.isArray(T)) return "array";
        return "object";
      }
    default:
      return "null";
  }
}
function E5R(T) {
  if (T === void 0 || T === null || T === !1 || T === !0) return {
    type: "string",
    description: "generic argument - use a sensible value"
  };
  if (Array.isArray(T)) switch (T.length) {
    case 0:
      return {
        type: "string",
        description: "generic argument - use a sensible value"
      };
    case 1:
      return {
        type: "string",
        description: T[0]
      };
    default:
      return {
        type: T[0],
        description: T[1]
      };
  }
  if (Object.keys(T).length > 0) {
    let R = T;
    return {
      type: R.type || "string",
      description: R.description || "generic argument - use a sensible value"
    };
  }
  return {
    type: "string",
    description: "generic argument - use a sensible value"
  };
}
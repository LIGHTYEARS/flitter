function bF(T, R) {
  switch (T.type) {
    case "rgb":
      return T.value;
    case "index":
      return R?.[T.value] ?? null;
    case "default":
      return null;
    default:
      return null;
  }
}
function uy(T) {
  if (T.length === 0) return T;
  let R = T[T.length - 1];
  if (!R) return T;
  switch (R.type) {
    case "separator":
      return uy(T.slice(0, T.length - 1));
    case "number":
      {
        let a = R.value[R.value.length - 1];
        if (a === "." || a === "-") return uy(T.slice(0, T.length - 1));
        break;
      }
    case "string":
      {
        let a = T[T.length - 2];
        if (a?.type === "delimiter") return uy(T.slice(0, T.length - 1));else if (a?.type === "brace" && a.value === "{") return uy(T.slice(0, T.length - 1));
        break;
      }
    case "delimiter":
      return uy(T.slice(0, T.length - 1));
  }
  return T;
}
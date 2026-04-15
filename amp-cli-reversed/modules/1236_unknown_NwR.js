function NwR(T) {
  if (T.match(/^[A-Za-z]:[\\]/)) return T.replace(/\\(.)/g, (R, a) => {
    if (a === " " || a === "(" || a === ")" || a === "[" || a === "]" || a === "?" || a === "*") return a;
    return R;
  });
  return T.replace(/\\(.)/g, "$1");
}
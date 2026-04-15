function PA(T, R, a, e) {
  let t = T[R];
  if (t?.color) return t.color;
  if (T.length <= 1) return a[e % a.length] ?? LT.index(2);
  return a[R % a.length] ?? LT.index(2);
}
function $s(T) {
  switch (T.type) {
    case "index":
      {
        if (T.value < 8) return {
          type: "index",
          value: T.value + 8
        };
        return T;
      }
    case "rgb":
      {
        let {
          r: R,
          g: a,
          b: e
        } = T.value;
        return {
          type: "rgb",
          value: {
            r: Math.min(255, R + 60),
            g: Math.min(255, a + 60),
            b: Math.min(255, e + 60)
          }
        };
      }
    default:
      return {
        type: "index",
        value: 15
      };
  }
}
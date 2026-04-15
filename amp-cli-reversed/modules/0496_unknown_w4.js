function w4(T, R, a = !0, e = "left", t = " ") {
  let r = q8(T, a);
  if (r >= R) return T;
  let h = R - r,
    i = J8(t, a),
    c = Math.floor(h / i);
  switch (e) {
    case "center":
      {
        let s = Math.floor(c / 2),
          A = c - s;
        return t.repeat(s) + T + t.repeat(A);
      }
    case "right":
      return t.repeat(c) + T;
    default:
      return T + t.repeat(c);
  }
}
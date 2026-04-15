function bXT(T, R, a) {
  let e = Math.max(0, Math.min(1, T)),
    {
      primary: t,
      secondary: r
    } = a ?? _XT(R),
    h = pXT(t, r, e);
  return {
    type: "rgb",
    value: {
      r: h.r,
      g: h.g,
      b: h.b
    }
  };
}
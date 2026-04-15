function wy0(T, R, a, e = 1) {
  return {
    type: "click",
    button: T.button === "left" ? "left" : T.button === "middle" ? "middle" : T.button === "right" ? "right" : "left",
    clickCount: e,
    ...Ol(T, R, a)
  };
}
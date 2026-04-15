function ogT(T, R) {
  if (T.type === "rgb") return {
    type: "rgb",
    value: T.value,
    alpha: R
  };
  if (T.type === "index") return {
    type: "index",
    value: T.value,
    alpha: R
  };
  return {
    type: "default",
    alpha: R
  };
}
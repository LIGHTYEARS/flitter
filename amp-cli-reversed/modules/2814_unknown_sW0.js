function cW0(T) {
  if (T.length <= 1) return "";
  if (T.length >= 3) return ` (${T[0]}-${T.at(-1)})`;
  return ` (${T.join(", ")})`;
}
function sW0(T, R) {
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
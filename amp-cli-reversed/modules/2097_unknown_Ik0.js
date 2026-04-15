function Ik0(T) {
  let R = [];
  if (T.ctrlKey) R.push("ctrl");
  if (T.metaKey) R.push("meta");
  if (T.altKey) R.push("alt");
  if (T.shiftKey) R.push("shift");
  let a = T.key.toLowerCase();
  if (["control", "meta", "alt", "shift"].includes(a)) return "";
  if (a === " ") a = "space";
  return R.push(a), R.join("+");
}
function _gT(T) {
  return mW(T) === "skill";
}
function TH0(T) {
  let R = qRR(T);
  if (R.length === 0) return;
  let a = R.join(", "),
    e = mW(T);
  if (e === "skill") return `skills: ${a}`;
  return `${R.length === 1 ? "skill source" : "skill sources"} overridden by ${ahT[e].description}: ${a}`;
}
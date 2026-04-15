function cN(T, R) {
  for (let a of T.messages) {
    if (a.role !== "user") continue;
    for (let e of a.content) if (e.type === "tool_result" && e.toolUseID === R) return e;
  }
  return;
}
function sA(T) {
  return T.messages.filter(R => R.role === "user").flatMap(R => R.content).filter(R => R.type === "tool_result").reduce((R, a) => {
    return R.set(a.toolUseID, a), R;
  }, new Map());
}
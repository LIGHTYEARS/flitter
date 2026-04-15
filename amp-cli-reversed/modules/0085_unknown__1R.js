function p1R(T) {
  return T.map(R => R.text).join(`

`);
}
function _1R(T, R) {
  let a = [...P3T(T)];
  while (a.length > 0) {
    let e = a.at(-1);
    if (e && typeof e === "object" && "type" in e && e.type === "message" && "role" in e && e.role === "assistant") a.pop();else break;
  }
  return [{
    role: "system",
    content: R
  }, ...a];
}
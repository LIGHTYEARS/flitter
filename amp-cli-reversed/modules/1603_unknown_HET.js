function ve(T) {
  return T.messages.filter(R => R.role === "user" && R.content.some(a => a.type !== "tool_result")).length;
}
function kiT(T) {
  return T.startsWith("functions.") ? T.slice(10) : T;
}
function HET(T) {
  if (T.type === "tool_use" && Va(T)) {
    let R = T.normalizedName ?? T.name;
    if (!R) return null;
    let a = T.input;
    return {
      name: kiT(R),
      input: a
    };
  }
  if (T.type === "server_tool_use") {
    if (!T.name) return null;
    return {
      name: kiT(T.name),
      input: T.input
    };
  }
  return null;
}
function MDR(T) {
  let R = y3T(T);
  return DDR(R);
}
function DDR(T) {
  return T.map(R => {
    if (R.role === "user") return {
      role: "user",
      content: typeof R.content === "string" ? R.content : R.content.map(a => a.type === "text" ? a.text : "").join("")
    };else if (R.role === "assistant") return {
      role: "assistant",
      content: typeof R.content === "string" ? R.content : Array.isArray(R.content) ? R.content.map(a => a.type === "text" ? a.text : "").join("") : null,
      tool_calls: R.tool_calls
    };else if (R.role === "tool") return {
      role: "tool",
      content: typeof R.content === "string" ? R.content : R.content.map(a => a.text).join(""),
      tool_call_id: R.tool_call_id
    };
    throw Error(`Unsupported message role: ${R.role}`);
  });
}
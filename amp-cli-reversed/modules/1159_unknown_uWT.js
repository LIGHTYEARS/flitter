function uWT(T) {
  if ("error" in T) throw Error(`Cerebras error: ${T.error}`);
  let R;
  if ("object" in T && T.object === "chat.completion") {
    let a = T.choices[0];
    if (a?.message) R = {
      role: "assistant",
      content: a.message.content || "",
      tool_calls: a.message.tool_calls
    };
  } else if ("object" in T && T.object === "chat.completion.chunk") {
    let a = T.choices?.[0];
    if (a?.delta) R = {
      role: "assistant",
      content: a.delta.content || "",
      tool_calls: a.delta.tool_calls?.filter(e => e.id)
    };
  }
  return R;
}
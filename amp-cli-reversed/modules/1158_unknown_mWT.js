function mWT(T) {
  let R = [];
  if ("error" in T) throw Error(`Cerebras error: ${T.error}`);else if ("object" in T && T.object === "chat.completion") {
    let a = T.choices[0];
    if (a?.message?.tool_calls) {
      for (let e of a.message.tool_calls) if (e.id) R.push({
        id: e.id,
        name: e.function.name,
        input: e.function.arguments ? JSON.parse(e.function.arguments) : {}
      });
    }
  } else if ("object" in T && T.object === "chat.completion.chunk") {
    let a = T.choices?.[0];
    if (a?.delta?.tool_calls) {
      for (let e of a.delta.tool_calls) if (e.id) R.push({
        id: e.id,
        name: e.function.name ?? "unknown",
        input: e.function.arguments ? JSON.parse(e.function.arguments) : {}
      });
    }
  }
  return R;
}
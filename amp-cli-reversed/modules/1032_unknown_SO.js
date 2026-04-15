function SO(T, R) {
  if (!T) T = {
    id: R.id,
    model: R.model,
    finish_reason: null,
    message: {
      reasoning_content: null,
      content: null,
      refusal: null,
      role: "assistant",
      tool_calls: []
    }
  };
  return Lt(T, a => {
    if (R.usage) a.usage = R.usage;
    let e = R.choices[0];
    if (e) {
      a.finish_reason = e.finish_reason ?? null;
      let t = e.delta.reasoning_content ?? e.delta.reasoning;
      if (t) a.message.reasoning_content = (a.message.reasoning_content ?? "") + t;
      if (e.delta.content) a.message.content = (a.message.content ?? "") + e.delta.content;
      if (e.delta.refusal) a.message.refusal = (a.message.refusal ?? "") + e.delta.refusal;
      for (let r of e.delta.tool_calls ?? []) {
        let h = a.message.tool_calls[r.index];
        a.message.tool_calls[r.index] = {
          type: "function",
          id: h?.id ?? r.id ?? "",
          function: {
            name: h?.function.name ?? r.function?.name ?? "",
            arguments: (h?.function.arguments ?? "") + (r.function?.arguments ?? "")
          }
        };
      }
    }
  });
}
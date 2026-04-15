function $k(T, R) {
  function a() {
    let r = [];
    if (T.message.reasoning_content) r.push({
      type: "thinking",
      thinking: T.message.reasoning_content,
      signature: ""
    });
    if (T.message.content) r.push({
      type: "text",
      text: T.message.content
    });
    for (let h of T.message.tool_calls) try {
      let i = JSON.parse(h.function.arguments);
      r.push({
        type: "tool_use",
        complete: !0,
        name: h.function.name,
        id: h.id.trim(),
        input: i
      });
    } catch {
      let i = h.function.arguments || "{}";
      r.push({
        type: "tool_use",
        complete: !1,
        name: h.function.name,
        id: h.id.trim(),
        input: YN(i),
        inputPartialJSON: {
          json: i
        },
        inputIncomplete: u8T(i)
      });
    }
    return r;
  }
  function e() {
    let r = T.usage;
    if (!r) return;
    let h = r.prompt_tokens_details?.cached_tokens ?? 0,
      i = r.prompt_tokens - h;
    return {
      model: T.model,
      maxInputTokens: R,
      inputTokens: 0,
      cacheReadInputTokens: h,
      cacheCreationInputTokens: i,
      outputTokens: r.completion_tokens,
      totalInputTokens: r.prompt_tokens,
      timestamp: new Date().toISOString()
    };
  }
  function t() {
    switch (T.finish_reason) {
      case "stop":
        return {
          type: "complete",
          stopReason: "end_turn"
        };
      case "length":
        return {
          type: "complete",
          stopReason: "max_tokens"
        };
      case "tool_calls":
        return {
          type: "complete",
          stopReason: "tool_use"
        };
      case "content_filter":
        return {
          type: "error",
          error: {
            message: `model refused to respond due to content filter: ${T.message.refusal ?? "content_filter"}`
          }
        };
      case "function_call":
        return {
          type: "error",
          error: {
            message: "model responded with deprecated stop reason 'function_call'"
          }
        };
      case null:
        return {
          type: "streaming"
        };
    }
  }
  return {
    role: "assistant",
    messageId: 0,
    content: a(),
    state: t(),
    usage: e()
  };
}
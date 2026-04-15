function PAT(T, R, a, e = new Map()) {
  function t() {
    let h = T.stop_reason;
    switch (h) {
      case "end_turn":
      case "stop_sequence":
        return {
          type: "complete",
          stopReason: "end_turn"
        };
      case "tool_use":
        return {
          type: "complete",
          stopReason: "tool_use"
        };
      case "max_tokens":
      case "model_context_window_exceeded":
        return {
          type: "error",
          error: {
            message: h
          }
        };
      case "refusal":
        return {
          type: "error",
          error: {
            message: "The model refused to respond to this request. Please retry with a different prompt."
          }
        };
      case "pause_turn":
        return {
          type: "error",
          error: {
            message: "We received a pause_turn request from the model, but this is not implemented"
          }
        };
      case "compaction":
        return {
          type: "error",
          error: {
            message: "We received a compaction request from the model, but this is not implemented"
          }
        };
      case null:
        return {
          type: "streaming"
        };
    }
  }
  function r() {
    if (!T.usage) return;
    let h = T.model;
    return {
      model: h,
      maxInputTokens: R ?? Ys(`anthropic/${h}`),
      inputTokens: T.usage.input_tokens,
      outputTokens: T.usage.output_tokens,
      cacheCreationInputTokens: T.usage.cache_creation_input_tokens,
      cacheReadInputTokens: T.usage.cache_read_input_tokens,
      totalInputTokens: T.usage.input_tokens + (T.usage.cache_creation_input_tokens ?? 0) + (T.usage.cache_read_input_tokens ?? 0),
      timestamp: new Date().toISOString()
    };
  }
  return {
    role: "assistant",
    messageId: 0,
    content: T.content.flatMap((h, i) => rIR(h, a) ? [VfR(h, e.get(i))] : []),
    state: t(),
    usage: r()
  };
}
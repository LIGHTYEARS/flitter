function TLR(T) {
  return ["<|tool_call", "<|tool_calls_section", "tool_call_begin|>", "tool_call_end|>", "tool_calls_section_begin|>", "tool_calls_section_end|>"].some(R => T.includes(R));
}
function RLR(T, R, a, e) {
  let t = Ur(e);
  if (T.state.type === "complete" && (T.state.stopReason == "end_turn" || T.state.stopReason === "tool_use")) {
    if (T.content.length === 0 || T.content.every(r => r.type === "thinking")) {
      if (T.content.length === 0) throw t.warn("Fireworks: model returned empty content array", {
        model: R,
        threadId: a,
        stopReason: T.state.stopReason
      }), new XV("Model returned empty content array");
      let r = T.content.map(h => h.type === "thinking" ? h.thinking : "").join(`
`);
      if (TLR(r)) throw t.warn("Fireworks: model leaked tool call control tokens in thinking block", {
        model: R,
        threadId: a,
        stopReason: T.state.stopReason,
        thinkingLength: r.length
      }), new XV("Model emitted tool call control tokens in thinking block instead of proper tool_calls");
    }
  }
}
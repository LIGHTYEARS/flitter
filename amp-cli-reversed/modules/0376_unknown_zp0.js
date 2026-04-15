function zp0(T, R, a) {
  if (R.length === 0) return T;
  let e = [],
    t = T.length;
  for (let r of R) {
    if (a.has(r.messageId)) continue;
    a.add(r.messageId);
    let h = t++;
    if (r.role === "assistant") e.push({
      role: "assistant",
      content: r.blocks,
      state: {
        type: "complete",
        stopReason: "end_turn"
      },
      usage: r.usage,
      messageId: h,
      dtwMessageID: r.messageId,
      parentToolUseId: r.parentToolCallId
    });else e.push({
      role: "user",
      content: r.blocks,
      messageId: h,
      dtwMessageID: r.messageId,
      parentToolUseId: r.parentToolCallId
    });
  }
  if (e.length === 0) return T;
  return [...T, ...e];
}
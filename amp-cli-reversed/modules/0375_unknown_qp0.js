function qp0(T, R) {
  let a = T.parentToolCallId,
    e = T.role === "assistant" ? T : null,
    {
      completedMessages: t
    } = R;
  if (T.state === "complete" || T.state === "error") {
    if (R.streamingMessageId !== null && T.messageId !== R.streamingMessageId) {
      if (R.streamingBlocks.length > 0) t.push({
        messageId: R.streamingMessageId,
        role: "assistant",
        blocks: R.streamingBlocks,
        parentToolCallId: R.streamingParentToolCallId
      });
      if (R.streamingMessageId = null, R.streamingBlocks = [], R.streamingParentToolCallId = void 0, T.blocks && T.blocks.length > 0) if (T.role === "user") t.push({
        messageId: T.messageId,
        role: "user",
        blocks: T.blocks ?? [],
        parentToolCallId: a
      });else t.push({
        messageId: T.messageId,
        role: "assistant",
        blocks: T.blocks ?? [],
        usage: e?.usage,
        parentToolCallId: a
      });
      return;
    }
    if (R.streamingMessageId === null && T.blocks && T.blocks.length > 0) {
      if (T.role === "user") {
        let h = T.blocks;
        t.push({
          messageId: T.messageId,
          role: "user",
          blocks: h,
          parentToolCallId: a
        });
      } else {
        let h = T.blocks;
        t.push({
          messageId: T.messageId,
          role: "assistant",
          blocks: h,
          usage: e?.usage,
          parentToolCallId: a
        });
      }
      return;
    }
    let r = R.streamingBlocks;
    if (T.messageId === R.streamingMessageId && T.blocks && T.role === "assistant") r = _g(R.streamingBlocks, T.blocks);
    if (R.streamingMessageId && r.length > 0) t.push({
      messageId: R.streamingMessageId,
      role: "assistant",
      blocks: r,
      usage: e?.usage,
      parentToolCallId: R.streamingParentToolCallId
    });
    R.streamingMessageId = null, R.streamingBlocks = [], R.streamingParentToolCallId = void 0;
    return;
  }
  if (T.state === "tool_use") {
    if (T.role !== "assistant") return;
    if (R.streamingMessageId === null || R.streamingMessageId !== T.messageId) R.streamingMessageId = T.messageId, R.streamingBlocks = _g([], T.blocks ?? []), R.streamingParentToolCallId = a;else if (T.blocks) R.streamingBlocks = _g(R.streamingBlocks, T.blocks);
    if (R.streamingBlocks.length > 0) t.push({
      messageId: R.streamingMessageId ?? T.messageId,
      role: "assistant",
      blocks: R.streamingBlocks,
      usage: e?.usage,
      parentToolCallId: R.streamingParentToolCallId
    });
    R.streamingMessageId = null, R.streamingBlocks = [], R.streamingParentToolCallId = void 0;
    return;
  }
  if (T.state === "start" || T.state === "generating") {
    if (T.role !== "assistant") return;
    if (R.streamingMessageId === null || R.streamingMessageId !== T.messageId) R.streamingMessageId = T.messageId, R.streamingBlocks = _g([], T.blocks ?? []), R.streamingParentToolCallId = a;else if (T.blocks) R.streamingBlocks = _g(R.streamingBlocks, T.blocks);
  }
}
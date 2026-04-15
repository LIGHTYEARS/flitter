function Dp0(T, R) {
  let a = R.messages.map((e, t) => {
    if (e.role === "user") return {
      role: "user",
      content: [...e.content],
      meta: e.meta,
      userState: e.userState,
      readAt: e.readAt,
      messageId: t,
      dtwMessageID: e.messageId,
      parentToolUseId: e.parentToolUseId
    };
    if (e.role === "assistant") {
      let r = e.content.some(h => h.type === "tool_use");
      return {
        role: "assistant",
        content: [...e.content],
        meta: e.meta,
        usage: e.usage,
        readAt: e.readAt,
        state: e.cancelled ? {
          type: "cancelled"
        } : {
          type: "complete",
          stopReason: r ? "tool_use" : "end_turn"
        },
        messageId: t,
        dtwMessageID: e.messageId,
        parentToolUseId: e.parentToolUseId
      };
    }
    return {
      role: "info",
      content: [...e.content],
      messageId: t,
      dtwMessageID: e.messageId,
      parentToolUseId: e.parentToolUseId
    };
  });
  return {
    ...T,
    messages: a
  };
}
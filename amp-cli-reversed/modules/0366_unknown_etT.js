function etT(T) {
  let R = [],
    a = 0;
  for (let t of T.messages) {
    if (t.role === "user") {
      R.push({
        messageId: oF(t),
        role: "user",
        content: [...t.content],
        meta: t.meta,
        userState: t.userState,
        readAt: t.readAt,
        parentToolUseId: t.parentToolUseId
      });
      continue;
    }
    if (t.role === "assistant") {
      R.push({
        messageId: oF(t),
        role: "assistant",
        content: [...t.content],
        meta: t.meta,
        usage: t.usage,
        readAt: t.readAt,
        cancelled: t.state.type === "cancelled",
        parentToolUseId: t.parentToolUseId
      });
      continue;
    }
    let r = t.content.filter(h => h.type === "manual_bash_invocation");
    if (r.length > 0) R.push({
      messageId: oF(t),
      role: "info",
      content: r,
      parentToolUseId: t.parentToolUseId
    });
    for (let h of t.content) {
      if (h.type !== "summary" || h.summary.type !== "message") continue;
      a += 1, R.push({
        messageId: Vb(),
        role: "assistant",
        content: [{
          type: "text",
          text: h.summary.summary
        }],
        parentToolUseId: t.parentToolUseId
      });
    }
  }
  let e = T.meta?.status !== void 0 || T.meta?.executorType !== void 0 ? {
    ...(T.meta?.status !== void 0 ? {
      status: T.meta.status
    } : {}),
    ...(T.meta?.executorType !== void 0 ? {
      executorType: T.meta.executorType
    } : {})
  } : void 0;
  return {
    id: T.id,
    v: T.v,
    ...(T.title ? {
      title: T.title
    } : {}),
    ...(T.agentMode ? {
      agentMode: T.agentMode
    } : {}),
    ...(e ? {
      meta: e
    } : {}),
    messages: R,
    convertedSummaryMessages: a
  };
}
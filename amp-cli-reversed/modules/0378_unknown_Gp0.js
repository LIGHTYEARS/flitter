function Gp0(T, R, a) {
  let e = T.message.messageId;
  if (a.has(e)) {
    let r = J1(R, e);
    if (r < 0) return R;
    let h = R[r];
    if (!h) return R;
    if (T.message.role !== h.role) return R;
    if (h.role === "user" && T.message.role === "user") {
      let i = {
          ...h,
          content: T.message.content,
          agentMode: T.message.agentMode,
          userState: T.message.userState,
          discoveredGuidanceFiles: eY(T.message.discoveredGuidanceFiles),
          parentToolUseId: T.parentToolUseId
        },
        c = [...R];
      return c[r] = i, c;
    }
    if (h.role === "assistant" && T.message.role === "assistant") {
      let i = {
          ...h,
          content: T.message.content,
          usage: T.message.usage,
          state: {
            type: "complete",
            stopReason: "end_turn"
          },
          parentToolUseId: T.parentToolUseId
        },
        c = [...R];
      return c[r] = i, c;
    }
    if (h.role === "info" && T.message.role === "info") {
      let i = {
          ...h,
          content: T.message.content,
          parentToolUseId: T.parentToolUseId
        },
        c = [...R];
      return c[r] = i, c;
    }
    return R;
  }
  a.add(e);
  let t = R.length;
  if (T.message.role === "assistant") return [...R, {
    role: "assistant",
    content: T.message.content,
    state: {
      type: "complete",
      stopReason: "end_turn"
    },
    usage: T.message.usage,
    messageId: t,
    dtwMessageID: e,
    parentToolUseId: T.parentToolUseId
  }];
  if (T.message.role === "info") return [...R, {
    role: "info",
    content: T.message.content,
    messageId: t,
    dtwMessageID: e,
    parentToolUseId: T.parentToolUseId
  }];
  return [...R, {
    role: "user",
    content: T.message.content,
    agentMode: T.message.agentMode,
    userState: T.message.userState,
    discoveredGuidanceFiles: eY(T.message.discoveredGuidanceFiles),
    messageId: t,
    dtwMessageID: e,
    parentToolUseId: T.parentToolUseId
  }];
}
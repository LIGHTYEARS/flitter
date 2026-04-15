async function jp0(T, R, a) {
  let e = R.agentMode ?? a.sourceAgentMode ?? R.parentThread.agentMode,
    t = R.relationshipMessageIndex ?? a.parentMessageIndex,
    r = R.relationshipComment ?? R.goal,
    h = {
      threadID: a.parentThreadID,
      type: "handoff",
      ...(t !== void 0 ? {
        messageIndex: t
      } : {}),
      ...(R.relationshipBlockIndex !== void 0 ? {
        blockIndex: R.relationshipBlockIndex
      } : {}),
      comment: r
    },
    i = R.parentThread.env?.initial?.trees?.[0]?.repository?.url,
    c = await $p0(T, i, e ?? void 0, h);
  return {
    http: T,
    threadID: c,
    prompt: a.content,
    agentMode: e ?? void 0
  };
}
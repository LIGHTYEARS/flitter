function FkT(T) {
  if (T.type === "message_edited") return T.agentMode;
  if (T.message.role === "user") return T.message.agentMode;
  return;
}
function P$(T) {
  if (!T || T.length === 0) return;
  return T.map(R => ({
    ...R,
    queuedMessage: {
      ...R.queuedMessage,
      content: R.queuedMessage.content.map(a => ({
        ...a
      })),
      discoveredGuidanceFiles: R.queuedMessage.discoveredGuidanceFiles?.map(a => ({
        ...a
      }))
    }
  }));
}
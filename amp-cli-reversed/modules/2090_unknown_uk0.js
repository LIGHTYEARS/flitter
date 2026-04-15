function mk0(T) {
  return {
    version: T.v,
    title: T.title ?? null,
    messages: T.messages.map(R => uk0(T, R))
  };
}
function uk0(T, R) {
  let a = yk0(R);
  switch (R.role) {
    case "user":
      return {
        threadId: T.id,
        role: "user",
        content: [...R.content],
        discoveredGuidanceFiles: R.discoveredGuidanceFiles ? [...R.discoveredGuidanceFiles] : void 0,
        meta: LET(R.meta),
        userState: Pk0(R.userState),
        readAt: R.readAt,
        messageId: a
      };
    case "assistant":
      return {
        threadId: T.id,
        role: "assistant",
        content: [...R.content],
        state: R.state?.type === "cancelled" ? {
          type: "cancelled"
        } : void 0,
        usage: R.usage,
        readAt: R.readAt,
        messageId: a
      };
    case "info":
      return {
        threadId: T.id,
        role: "info",
        content: R.content.filter(kk0),
        messageId: a
      };
  }
}
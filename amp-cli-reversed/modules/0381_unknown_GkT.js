function GkT(T) {
  let R = T.queuedMessage,
    a = R.content.map(e => ({
      ...e
    }));
  return {
    id: R.messageId,
    interrupt: T.interrupt,
    queuedMessage: {
      role: "user",
      content: a,
      userState: R.userState,
      discoveredGuidanceFiles: eY(R.discoveredGuidanceFiles),
      meta: R.createdAt ? {
        sentAt: Date.parse(R.createdAt)
      } : void 0,
      messageId: -1,
      dtwMessageID: R.messageId
    }
  };
}
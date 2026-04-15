function $JT(T, R) {
  return {
    role: "user",
    content: T.content,
    userState: T.userState,
    discoveredGuidanceFiles: T.discoveredGuidanceFiles,
    meta: {
      sentAt: T.sentAt
    },
    messageId: R,
    dtwMessageID: T.clientMessageID
  };
}
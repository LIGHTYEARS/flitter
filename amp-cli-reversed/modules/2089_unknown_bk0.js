function bk0(T) {
  return {
    role: "user",
    content: [{
      type: "tool_result",
      toolUseID: T.toolCallId,
      run: {
        status: "in-progress",
        progress: T.progress
      }
    }],
    messageId: 0
  };
}
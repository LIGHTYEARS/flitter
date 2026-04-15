function _k0(T, R) {
  let a = R + 1;
  switch (T.role) {
    case "user":
      {
        let e = LET(T.meta);
        return {
          ...T,
          meta: e,
          messageId: a
        };
      }
    case "assistant":
      {
        let e = T.content.some(r => r.type === "tool_use"),
          t = T.state?.type === "cancelled" ? {
            type: "cancelled"
          } : {
            type: "complete",
            stopReason: e ? "tool_use" : "end_turn"
          };
        return {
          ...T,
          messageId: a,
          state: t
        };
      }
    case "info":
      return {
        role: "info",
        content: T.content.filter(e => e.type === "manual_bash_invocation"),
        messageId: a,
        dtwMessageID: T.messageId
      };
  }
}
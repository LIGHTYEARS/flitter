function CVR(T, R) {
  switch (T.status) {
    case "in-progress":
      return {
        status: "in-progress",
        progress: T.turns.map(a => ({
          message: a.message,
          reasoning: a.reasoning,
          isThinking: a.isThinking,
          tool_uses: [...a.activeTools.values()]
        }))
      };
    case "done":
      return {
        status: "done",
        result: T.message,
        progress: T.turns.map(a => ({
          message: a.message,
          reasoning: a.reasoning,
          isThinking: !1,
          tool_uses: [...a.activeTools.values()]
        })),
        "~debug": {
          ...T["~debug"],
          reasoningEffort: R
        }
      };
    case "error":
      return {
        status: "error",
        error: {
          message: T.message
        }
      };
    case "cancelled":
      return {
        status: "cancelled"
      };
  }
}
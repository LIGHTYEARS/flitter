function x2R(T, R) {
  switch (T.status) {
    case "in-progress":
      return {
        status: "in-progress",
        result: R,
        progress: T.turns.map(a => ({
          message: a.message,
          tool_uses: [...a.activeTools.values()]
        }))
      };
    case "done":
      return {
        status: "done",
        result: R,
        progress: T.turns.map(a => ({
          message: a.message,
          tool_uses: [...a.activeTools.values()]
        })),
        "~debug": T["~debug"]
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
        status: "cancelled",
        reason: "Code tour was cancelled"
      };
  }
}
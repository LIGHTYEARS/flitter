function HzT(T) {
  switch (T.status) {
    case "in-progress":
      return {
        status: "in-progress",
        progress: T.turns.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        }))
      };
    case "done":
      return {
        status: "done",
        result: T.message,
        progress: T.turns.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        })),
        "~debug": T["~debug"]
      };
    case "error":
      return {
        status: "error",
        error: {
          message: T.message,
          displayMessage: T.message
        }
      };
    case "cancelled":
      return {
        status: "cancelled",
        reason: "Codebase search was cancelled"
      };
  }
}
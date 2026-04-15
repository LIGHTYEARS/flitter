function xKR(T) {
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
      if (T.message.includes("context window") || T.message.includes("token")) throw new MaT("Librarian has reached the context window limit. Please try a more specific query.", "Librarian has reached the context window limit and failed to return a result.");
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
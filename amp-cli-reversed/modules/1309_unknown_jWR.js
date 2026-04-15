function jWR(T) {
  switch (T) {
    case "tool.call":
      return {
        action: "allow"
      };
    case "tool.result":
      return;
    case "agent.start":
      return {};
    case "agent.end":
      return {
        action: "done"
      };
    default:
      return;
  }
}
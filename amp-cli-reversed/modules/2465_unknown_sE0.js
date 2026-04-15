function sE0(T) {
  switch (T) {
    case "done":
      return "\u2713";
    case "error":
      return "\u2717";
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return "\u2298";
    case "blocked-on-user":
      return "?";
    case "in-progress":
    case "queued":
      return "\u22EF";
  }
}
function xW(T) {
  switch (T) {
    case "done":
      return "\u2713";
    case "error":
    case "cancelled":
    case "rejected-by-user":
    case "cancellation-requested":
      return "\u2715";
    case "in-progress":
    case "queued":
    case "blocked-on-user":
      return "\u22EF";
  }
}
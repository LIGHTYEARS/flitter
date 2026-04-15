function CPR(T) {
  switch (T) {
    case "done":
      return "done";
    case "error":
      return "error";
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return "cancelled";
    case "in-progress":
      return "running";
    case "queued":
    case "blocked-on-user":
      return "pending";
  }
}
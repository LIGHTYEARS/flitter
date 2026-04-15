function qr(T, R) {
  switch (T) {
    case "done":
      return R.app.toolSuccess;
    case "error":
      return R.app.toolError;
    case "cancellation-requested":
    case "cancelled":
    case "rejected-by-user":
      return R.app.toolCancelled;
    case "in-progress":
      return R.app.toolRunning;
    case "queued":
      return R.app.waiting;
    case "blocked-on-user":
      return R.app.waiting;
  }
}
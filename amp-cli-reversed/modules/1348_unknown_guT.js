function QqR(T) {
  return T.replace(/^https?:\/\//, "");
}
function guT(T, R) {
  switch (T) {
    case "retry":
      if (R?.retryCountdown !== void 0 && R.retryCountdown !== null) return `Retry (auto-retry in ${R.retryCountdown}s)`;
      return "Retry";
    case "add-credits":
      {
        let a = "Add Credits";
        if (R?.ampURL) {
          let e = QqR(new URL("/pay", R.ampURL).toString());
          a += ` (${e})`;
        }
        return a;
      }
    case "new-thread":
      return "New Thread";
    case "handoff":
      return "Handoff";
    case "dismiss":
      return "Dismiss";
    default:
      throw Error(`Unhandled error action: ${String(T)}`);
  }
}
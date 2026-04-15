async function KU0(T, R) {
  if (typeof R !== "string") return Error("Select a log option from the picker");
  switch (R) {
    case "cli-open":
      {
        let a = T.logFile;
        if (!a) return Error("CLI log file is unavailable for this session");
        let e = "less -R +G",
          t = DU0(process.pid, a, e);
        try {
          try {
            d9.instance.tuiInstance.suspend(), C_(t, {
              stdio: "inherit"
            });
          } finally {
            process.stdout.write("\x1B[?25l"), d9.instance.tuiInstance.resume();
          }
          J.info("Opened filtered CLI logs", {
            command: t,
            pid: process.pid,
            logFile: ed(a),
            outputCommand: e ?? null
          });
          return;
        } catch (r) {
          return J.error("Failed to open filtered CLI logs", {
            error: r,
            command: t
          }), Error("Failed to open filtered CLI logs", {
            cause: r
          });
        }
      }
    case "cloudflare-logs":
      {
        await je(T.context ?? T.contextFallback, JrT(T.thread.id));
        return;
      }
    case "cloudflare-data-studio":
      {
        await je(T.context ?? T.contextFallback, ZrT(T.thread.id));
        return;
      }
    default:
      return Error(`Unknown log option: ${R}`);
  }
}
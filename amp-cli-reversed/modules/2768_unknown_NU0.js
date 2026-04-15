function NU0(T) {
  let R = ["# Debug Instructions", "", "## Quick Links", `- Thread URL: <${$P(new URL(T.ampURL), T.thread.id).toString()}>`];
  if (Tm(T.thread)) R.push(`- Cloudflare Logs: <${JrT(T.thread.id)}>`, `- Cloudflare Data Studio: <${ZrT(T.thread.id)}>`), R.push("", "## DTW Commands", "```sh", wU0(T.thread.id, T.ampURL), "```");else R.push("", "## DTW Commands", "- This thread is not DTW-backed, so DTW commands are unavailable.");
  if (T.logFile && T.pid) {
    let a = ed(T.logFile);
    R.push("", "## CLI Logs", `- Log file: \`${a}\``, `- PID: \`${T.pid}\``, "", "Example: filter logs for this session:", "```sh", PB("snapshot", T.pid, T.logFile), "```");
  }
  return R.push("", "## Diagnostics", "", ThT(T, "###")), R.join(`
`);
}
function zU0(T, R, a = []) {
  let e = ["# Bug Report", "", "## Issue Description", "", T, ""];
  if (a.length > 0) {
    for (let [t, r] of a.entries()) e.push(`![Issue image ${t + 1}](./${r})`);
    e.push("");
  }
  if (e.push("## Included Files", "", "- `cli-logs.json` \u2014 CLI logs filtered for this session PID", "- `thread.yaml` \u2014 Full thread data (messages, metadata, agent mode, etc.)"), a.length > 0) e.push("- `issue-image-*.*` \u2014 Images attached to the issue description");
  if (Tm(R.thread)) e.push("- `thread.sqlite` \u2014 DTW Durable Object SQLite dump", "- `cloudflare-logs.json` \u2014 Worker logs from Cloudflare (if CLOUDFLARE_API_TOKEN was set)");
  if (e.push("", "## Debug Instructions", "", "To investigate, start with the issue description above, then:", "", "1. Review `cli-logs.json` for errors, warnings, and the sequence of events"), Tm(R.thread)) e.push("2. Open `thread.sqlite` and inspect the `messages` and `thread_events` tables:", "   ```sh", "   sqlite3 -json thread.sqlite 'SELECT * FROM messages ORDER BY created_at, rowid'", "   sqlite3 -json thread.sqlite 'SELECT * FROM thread_events ORDER BY seq'", "   ```", "3. Review `cloudflare-logs.json` (if present) for server-side worker errors", "4. Check Cloudflare dashboards for more detail:", `   - Logs: <${JrT(R.thread.id)}>`, `   - Data Studio: <${ZrT(R.thread.id)}>`);
  return e.push("", ThT(R)), e.join(`
`);
}
async function wg(T) {
  try {
    return await lk.promises.access(T), !0;
  } catch {
    return !1;
  }
}
async function gAR(T, R) {
  let a = await D0T("sqlite3", ["-readonly", "-json", $AR(T), R], {
    timeout: CAR
  });
  if (a.status !== 0) return J.debug("sqlite3 query failed for VS Code database", {
    status: a.status,
    stderr: a.stderr?.trim()
  }), [];
  let e = a.stdout?.trim();
  if (!e) return [];
  try {
    return JSON.parse(e).filter(t => typeof t.key === "string" && typeof t.value === "string");
  } catch (t) {
    return J.debug("Failed to parse sqlite3 JSON output for VS Code database", {
      error: t instanceof Error ? t.message : String(t)
    }), [];
  }
}
async function w0T(T, R) {
  let a = await W0T("sqlite3", ["-readonly", "-separator", q0T, "-noheader", T, R], {
    timeout: RpR
  });
  if (a.status !== 0) return J.debug("sqlite3 query failed for Zed database", {
    status: a.status,
    stderr: a.stderr?.trim()
  }), [];
  let e = a.stdout?.trim();
  if (!e) return [];
  return e.split(`
`).filter(Boolean);
}
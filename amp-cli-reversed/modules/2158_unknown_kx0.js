function rfT(T) {
  if (T.status === "done" && typeof T.result === "object" && T.result) {
    let R = T.result.exitCode;
    return typeof R === "number" ? R : void 0;
  }
  return;
}
function kx0(T) {
  if (T.status !== "done") return;
  if (typeof T.result !== "object" || T.result === null) return;
  if (!("files" in T.result) || !Array.isArray(T.result.files)) return;
  return T.result.files.map(R => ({
    path: typeof R.path === "string" ? R.path : "(unknown)",
    additions: typeof R.additions === "number" ? R.additions : 0,
    deletions: typeof R.deletions === "number" ? R.deletions : 0,
    diff: typeof R.diff === "string" ? R.diff : ""
  }));
}
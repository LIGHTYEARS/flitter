function aq0(T) {
  if (T.status !== "done") return;
  if (typeof T.result !== "object" || T.result === null) return;
  if (!("files" in T.result) || !Array.isArray(T.result.files)) return;
  return {
    files: T.result.files.map(R => ({
      path: R.path,
      uri: R.uri,
      additions: R.additions,
      deletions: R.deletions,
      diff: R.diff
    }))
  };
}
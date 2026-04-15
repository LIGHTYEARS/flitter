function _p0(T) {
  return {
    provider: T.provider,
    capturedAt: T.capturedAt,
    available: T.available,
    repositoryRoot: T.repositoryRoot,
    repositoryName: T.repositoryName,
    branch: T.branch,
    head: T.head,
    baseRef: T.baseRef ?? null,
    baseRefHead: T.baseRefHead ?? null,
    aheadCount: T.aheadCount ?? 0,
    behindCount: T.behindCount,
    ...(T.unavailableReason !== void 0 ? {
      unavailableReason: T.unavailableReason
    } : {}),
    aheadCommits: T.aheadCommits ?? [],
    files: T.files.map(R => ({
      path: R.path,
      previousPath: R.previousPath,
      changeType: R.changeType,
      created: R.created,
      diff: R.diff,
      fullFileDiff: R.fullFileDiff,
      oldContent: R.oldContent,
      newContent: R.newContent,
      diffStat: R.diffStat
    }))
  };
}
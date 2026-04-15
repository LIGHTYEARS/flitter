function NkT(T, R) {
  return {
    provider: "git",
    capturedAt: T,
    available: !1,
    repositoryRoot: null,
    repositoryName: null,
    branch: null,
    head: null,
    files: [],
    unavailableReason: R
  };
}
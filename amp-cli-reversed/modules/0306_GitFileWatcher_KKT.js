function KKT(T) {
  if (T?.useGit) return new vv(T.pollInterval);
  if (T?.usePolling) return new GKT(T.pollInterval);
  let R = T?.rootPath || process.cwd();
  if (vv.isRepo(R)) {
    let a = new vv(T?.pollInterval);
    if (a.isSupported()) return J.info("Git repository detected, using GitFileWatcher", {
      rootPath: R
    }), a;
  }
  return J.info("Not a git repository, using NoOpFileWatcher", {
    rootPath: R
  }), new FKT();
}
function gA0(T, R) {
  let a = {
    workspaceRoots: T,
    scanOnStartup: !0,
    maxIndexedFiles: 500000,
    enableFileWatching: !0,
    usePollingFallback: !1,
    enableHeadWatching: !0,
    followSymlinkDirs: !0,
    ...R
  };
  return new JeT(a);
}
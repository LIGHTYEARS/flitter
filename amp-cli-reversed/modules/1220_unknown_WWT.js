async function WWT(T, R, a) {
  let e = R.trees?.[0]?.uri,
    t = R.trees?.[0]?.uri ?? e,
    r = await (async () => {
      if (!e) return null;
      return BWT(Ht(e), a, T.filesystem, {
        workingDirectory: t ? Ht(t) : void 0
      });
    })();
  return {
    workspaceRoot: e,
    workingDirectory: t,
    rootDirectoryListing: r
  };
}
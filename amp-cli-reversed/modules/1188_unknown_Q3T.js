function Q3T(T, R, a) {
  async function e(r, h, i) {
    if (h !== null) await R.writeFile(r, h, {
      signal: i
    });else await R.delete(r, {
      signal: i
    });
  }
  let t = dWT(T.fileChangeTrackerStorage, a, e);
  return {
    fileSystem: R,
    trackedFileSystem: r => CWT(R, t, r),
    tracker: t
  };
}
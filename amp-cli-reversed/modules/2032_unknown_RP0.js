function RP0(T, R) {
  let a = new Map();
  for (let h of T?.available ? T.files : []) a.set(h.path, HxT(h));
  let e = new Set(R.files.map(h => h.path)),
    t = R.files.filter(h => a.get(h.path) !== HxT(h)),
    r = fXT([...(T?.available ? T.files.filter(h => !e.has(h.path)).map(h => h.path) : []), ...R.files.flatMap(h => h.changeType === "renamed" && h.previousPath && !e.has(h.previousPath) ? [h.previousPath] : [])]);
  return {
    syncFiles: t,
    restorePaths: r
  };
}
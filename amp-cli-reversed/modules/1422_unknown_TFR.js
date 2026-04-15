function JzR(T) {
  if (process.env.AMP_DISABLE_AMP_COAUTHOR_TRAILER === "1" || process.env.AMP_DISABLE_AMP_COAUTHOR_TRAILER === "true") return !1;
  return T ?? !0;
}
async function TFR(T, R, a, e) {
  if (T.status !== "done") return T;
  let t = WO(R);
  if (t.isWriteLike || !t.path) return T;
  if (t.kind !== "read" && t.kind !== "search" && t.kind !== "list") return T;
  if (t.path === "-" || t.path.startsWith("/dev/fd/")) return T;
  let r = ezR.isAbsolute(t.path) ? t.path : MR.resolvePath(a, t.path).fsPath,
    h = mi(r),
    i = h;
  try {
    if ((await e.filesystem.stat(h)).isDirectory) i = MR.joinPath(h, ".amp-guidance-discovery-probe");
  } catch {}
  let c = await fm(e.filesystem, i, e.dir, e.thread, e.discoveredGuidanceFileURIs);
  if (c.length === 0) return T;
  return {
    ...T,
    result: {
      ...T.result,
      discoveredGuidanceFiles: c
    }
  };
}
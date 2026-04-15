async function rVT(T, R = {}) {
  let {
      maxDiffBufferBytes: a = Qx
    } = R,
    e = Date.now(),
    t = await Qo(T, ["rev-parse", "--show-toplevel"]);
  if (!t) return NkT(e, "not a git repository");
  let r = t.trim(),
    h = qA0(r),
    [i, c, s] = await Promise.all([Qo(r, ["rev-parse", "--verify", "HEAD"]), Qo(r, ["symbolic-ref", "--short", "HEAD"]), Qo(r, ["status", "--porcelain=v1", "--untracked-files=all", "-z"])]);
  if (s === null) return NkT(e, "failed to read git status");
  let A = i?.trim() || null,
    l = c?.trim() || null,
    o = tVT(s),
    n = await pp0(r, A),
    p = n?.aheadCount && n.aheadCount > 0 ? await Ap0(r, n.comparisonRef) : [],
    _ = await GA0(o, ep0, async m => {
      let b = jw(m.changeType === "untracked" ? await cp0(r, m.path, a).catch(() => "") : await UkT(r, m.path, A, void 0, a).catch(() => "")),
        y = jw(m.changeType === "modified" ? await UkT(r, m.path, A, Rp0, a).catch(() => "") : b),
        u = m.changeType !== "added" && m.changeType !== "untracked" ? await sp0(r, m.previousPath ?? m.path, A, a) : void 0,
        P = m.changeType !== "deleted" ? await op0(r, m.path, a) : void 0;
      return {
        path: m.path,
        previousPath: m.previousPath,
        changeType: m.changeType,
        created: m.changeType === "added" || m.changeType === "untracked",
        diff: b,
        fullFileDiff: y,
        oldContent: u,
        newContent: P,
        diffStat: ip0(b)
      };
    });
  return {
    provider: "git",
    capturedAt: e,
    available: !0,
    repositoryRoot: r,
    repositoryName: h,
    branch: l,
    head: A,
    baseRef: n?.baseRef ?? null,
    baseRefHead: n?.baseRefHead ?? null,
    aheadCount: n?.aheadCount ?? 0,
    behindCount: n?.behindCount,
    aheadCommits: p,
    files: _
  };
}
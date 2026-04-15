async function GGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      base: t,
      head: r,
      includePatches: h = !1
    } = a,
    i = `repos/${Kx(a.repository)}/compare/${encodeURIComponent(t)}...${encodeURIComponent(r)}`,
    c = await R.fetchJSON(i, {
      signal: e
    });
  if (!c.ok || !c.data) return {
    ok: !1,
    message: `Failed to get diff: ${c.statusText ?? "Unknown error"}`
  };
  let s = c.data,
    A = {
      sha: s.base_commit?.sha ?? t,
      message: s.base_commit?.commit?.message?.trim() ?? ""
    },
    l = s.commits?.length ? s.commits[s.commits.length - 1] : void 0,
    o = {
      sha: l?.sha ?? r,
      message: l?.commit?.message?.trim() ?? ""
    };
  return {
    ok: !0,
    result: {
      files: (s.files ?? []).map(n => {
        let p;
        if (h && n.patch) p = n.patch.length > GuT ? n.patch.slice(0, GuT) + `
... [truncated]` : n.patch;
        return {
          filename: n.filename,
          status: n.status,
          additions: n.additions,
          deletions: n.deletions,
          changes: n.changes,
          patch: p,
          previous_filename: n.previous_filename,
          sha: n.sha,
          blob_url: n.blob_url,
          raw_url: n.raw_url,
          contents_url: n.contents_url
        };
      }),
      base_commit: A,
      head_commit: o,
      ahead_by: s.ahead_by,
      behind_by: s.behind_by,
      total_commits: s.total_commits
    }
  };
}
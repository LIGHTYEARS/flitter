async function a4(T, R) {
  let {
    stdout: a
  } = await V2R("git", T, {
    cwd: R.cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...R.env
    },
    maxBuffer: 16777216
  });
  return a.trim();
}
function aGR(T) {
  if (typeof T !== "object" || T === null) throw Error("args must be an object. received instead: `" + JSON.stringify(T) + "`");
  if (typeof T.path !== "string") throw Error("path must be a string. received instead: `" + JSON.stringify(T.path) + "`");
}
function cGR(T, R) {
  return R.settings.bitbucketToken;
}
async function cn(T, R, a = {}, e) {
  let {
      headers: t = {},
      method: r = "GET",
      ...h
    } = a,
    i = T.trim().replace(/\/$/, ""),
    c = R.startsWith("/") ? R : `/${R}`,
    s = `${i}${c}`,
    A = cGR(T, e);
  if (!A) return {
    ok: !1,
    status: 401,
    statusText: "Bitbucket Enterprise token not configured for instance"
  };
  let l = await fetch(s, {
    method: r,
    headers: {
      ...t,
      Authorization: `Bearer ${A}`,
      Accept: "application/json"
    },
    ...h
  });
  if (l.status === 304) return {
    ok: !0,
    status: l.status,
    notModified: !0,
    headers: {
      etag: l.headers.get("etag") || void 0
    }
  };
  if (!l.ok) return {
    ok: !1,
    status: l.status,
    statusText: l.statusText
  };
  let o = await l.json();
  return {
    ok: !0,
    status: l.status,
    data: o,
    headers: {
      etag: l.headers.get("etag") || void 0
    }
  };
}
function Gx(T) {
  try {
    let R = new URL(T),
      a = R.pathname,
      e = a.match(/^(.*?)\/projects\/([^/]+)\/repos\/([^/]+)/);
    if (e?.[2] && e[3]) {
      let r = e[1] || "";
      return {
        instanceUrl: `${R.origin}${r}`.replace(/\/$/, ""),
        projectKey: e[2],
        repoSlug: e[3]
      };
    }
    let t = a.match(/^(.*?)\/scm\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (t?.[2] && t[3]) {
      let r = t[1] || "";
      return {
        instanceUrl: `${R.origin}${r}`.replace(/\/$/, ""),
        projectKey: t[2],
        repoSlug: t[3]
      };
    }
    return null;
  } catch {
    return null;
  }
}
function LaT(T) {
  if (!T || T === "." || T === "/") return "";
  let R = T.replace(/^\/+|\/+$/g, "");
  if (!R) return "";
  return R.split("/").map(a => encodeURIComponent(a)).join("/");
}
function lGR(T) {
  switch (T) {
    case "ADD":
      return "added";
    case "DELETE":
      return "removed";
    case "MOVE":
    case "COPY":
      return "renamed";
    default:
      return "modified";
  }
}
function AGR(T) {
  if (!T.hunks || T.hunks.length === 0) return "";
  let R = [];
  for (let a of T.hunks) {
    R.push(`@@ -${a.sourceLine},${a.sourceSpan} +${a.destinationLine},${a.destinationSpan} @@`);
    for (let e of a.segments) {
      let t = e.type === "ADDED" ? "+" : e.type === "REMOVED" ? "-" : " ";
      for (let r of e.lines) R.push(`${t}${r.line}`);
    }
  }
  return R.join(`
`);
}
function uGR(T) {
  let R = T.split("/"),
    a = [];
  for (let e of R) {
    if (e.includes("*") || e.includes("?") || e.includes("{") || e.includes("[")) break;
    a.push(e);
  }
  return a.join("/");
}
async function yGR(T, R, a, e, t, r, h, i, c) {
  let s = [],
    A = mGR.default(t),
    l = 0,
    o = 1000,
    n = 0,
    p = !1,
    _ = uGR(t);
  while (!0) {
    if (i?.aborted) break;
    let m = [`limit=${o}`, `start=${l}`];
    if (e) m.push(`at=${encodeURIComponent(e)}`);
    if (_) m.push(`path=${LaT(_)}`);
    let b = m.join("&"),
      y = `/rest/api/1.0/projects/${R}/repos/${a}/files?${b}`,
      u = await cn(T, y, {
        signal: i
      }, h);
    if (!u.ok || !u.data) throw Error(`Failed to fetch files: ${u.status} ${u.statusText || "Unknown error"}`);
    let P = [],
      k = !0,
      x = l + o;
    if (Array.isArray(u.data)) P = u.data;else {
      let f = u.data;
      if (f.values) {
        for (let v of f.values) if (v.type === "FILE") P.push(v.path.toString);
      }
      k = f.isLastPage !== !1, x = f.nextPageStart ?? l + o;
    }
    n += P.length;
    for (let f of P) if (A(f)) s.push(f);
    if (c?.(n, s.length), s.length >= r) {
      p = !k;
      break;
    }
    if (n >= KzT) {
      p = !k;
      break;
    }
    if (k) break;
    l = x;
  }
  return {
    files: s,
    truncated: p,
    totalFetched: n
  };
}
async function $GR(T, R, a, e, t, r, h) {
  let i = await r.configService.getLatest(h),
    c = [`limit=${e}`, `start=${t}`];
  if (a) c.push(`name=${encodeURIComponent(a)}`);
  let s = c.join("&"),
    A;
  if (R) A = `/rest/api/1.0/projects/${encodeURIComponent(R)}/repos?${s}`;else A = `/rest/api/1.0/repos?${s}`;
  let l = await cn(T, A, {
    signal: h
  }, i);
  if (!l.ok || !l.data) throw Error(`Failed to fetch repositories: ${l.status} ${l.statusText || "Unknown error"}`);
  return {
    repositories: l.data.values,
    totalCount: l.data.size
  };
}
async function DGR(T, R = {}, a) {
  let e = `/api/internal/github-proxy/${T}`,
    {
      body: t,
      headers: r = {},
      method: h = "GET",
      ...i
    } = R,
    c = await ibR(a, e, {
      method: h,
      headers: r,
      body: t ? JSON.stringify(t) : void 0,
      ...i
    });
  if (c.status === 304) return {
    ok: !0,
    status: c.status,
    notModified: !0,
    headers: {
      etag: c.headers.get("etag") || void 0
    }
  };
  if (!c.ok) return {
    ok: !1,
    status: c.status,
    statusText: c.statusText
  };
  let s = await c.json();
  return {
    ok: !0,
    status: c.status,
    data: s,
    headers: {
      location: c.headers.get("location") || void 0,
      etag: c.headers.get("etag") || void 0
    }
  };
}
function Nm(T, R) {
  return {
    async fetchJSON(a, e) {
      let t = await T.getLatest(R),
        r = await DGR(a, {
          ...e,
          signal: R
        }, t);
      return {
        ok: r.ok,
        status: r.status ?? 0,
        data: r.data,
        statusText: r.statusText
      };
    }
  };
}
function Kx(T) {
  let R = T.trim();
  if (R.includes("://")) {
    let e = new URL(R);
    if (e.hostname !== "github.com") throw Error("Only github.com repositories are supported");
    R = e.pathname;
  }
  R = R.replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");
  let a = R.split("/");
  if (a.length < 2 || !a[0] || !a[1]) throw Error(`Invalid repository: expected "owner/repo" but got "${R}"`);
  return `${a[0]}/${a[1]}`;
}
function wGR(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return new TextDecoder().decode(a);
}
function BGR(T, R) {
  let a = "",
    e = 0;
  while (e < T.length) {
    let t = T.charAt(e);
    if (t === "*") {
      if (T.charAt(e + 1) === "*") {
        if (T.charAt(e + 2) === "/") a += "(?:.+/)?", e += 3;else a += ".*", e += 2;
      } else a += "[^/]*", e++;
    } else if (t === "?") a += "[^/]", e++;else if (t === "{") {
      let r = T.indexOf("}", e);
      if (r !== -1) {
        let h = T.slice(e + 1, r).split(",");
        a += `(?:${h.map(e4).join("|")})`, e = r + 1;
      } else a += e4(t), e++;
    } else if (t === "[") {
      let r = T.indexOf("]", e);
      if (r !== -1) a += T.slice(e, r + 1), e = r + 1;else a += e4(t), e++;
    } else a += e4(t), e++;
  }
  return new RegExp(`^${a}$`).test(R);
}
function e4(T) {
  return T.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function VzT(T) {
  let R = T.map(a => a.type === "dir" ? `${a.name}/` : a.name);
  return R.sort((a, e) => {
    let t = a.endsWith("/"),
      r = e.endsWith("/");
    if (t && !r) return -1;
    if (!t && r) return 1;
    return a.localeCompare(e);
  }), R;
}
function NGR(T) {
  return typeof T === "object" && T !== null && !Array.isArray(T) && typeof T.content === "string" && typeof T.encoding === "string";
}
function UGR(T) {
  if (Array.isArray(T)) return "directory";
  if (typeof T === "object" && T !== null) {
    let R = T.type;
    if (typeof R === "string") return R;
  }
  return "unsupported content";
}
async function HGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    t = Kx(a.repository),
    r = a.path.replace(/^\//, ""),
    h = r || "/",
    i = r.split("/").map(encodeURIComponent).join("/"),
    c = await R.fetchJSON(`repos/${t}/contents/${i}`, {
      signal: e
    });
  if (!c.ok || !c.data) return {
    ok: !1,
    message: `Failed to read file: ${c.status} ${c.statusText ?? "Unknown error"}`
  };
  if (!NGR(c.data)) {
    if (Array.isArray(c.data)) {
      let m = VzT(c.data),
        b = NLT(m, a.read_range, m.length),
        y = new TextEncoder().encode(b).length;
      if (y > 131072) return {
        ok: !1,
        message: `Directory listing is too large (${Math.round(y / 1024)}KB). The directory has ${m.length} entries. Use read_range to inspect a smaller slice or list_directory_github with a limit.`
      };
      return {
        ok: !0,
        result: {
          absolutePath: h,
          content: b,
          isDirectory: !0,
          directoryEntries: m
        }
      };
    }
    let _ = UGR(c.data);
    return {
      ok: !1,
      message: `Cannot read "${h}" because GitHub returned ${_} metadata instead of file contents.`
    };
  }
  let s;
  if (c.data.encoding === "base64") s = wGR(c.data.content.replace(/\n/g, ""));else s = c.data.content;
  let A = s;
  if (a.read_range && a.read_range.length === 2) {
    let [_, m] = a.read_range;
    A = s.split(`
`).slice(Math.max(0, _ - 1), m).join(`
`);
  }
  let l = new TextEncoder().encode(A).length;
  if (l > 131072) return {
    ok: !1,
    message: `File is too large (${Math.round(l / 1024)}KB). The file has ${s.split(`
`).length} lines. Please retry with a smaller read_range parameter.`
  };
  let o = A.split(`
`),
    n = a.read_range?.[0] ?? 1,
    p = o.map((_, m) => `${n + m}: ${_}`);
  return {
    ok: !0,
    result: {
      absolutePath: r,
      content: p.join(`
`)
    }
  };
}
async function WGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      pattern: t,
      path: r,
      limit: h = 30,
      offset: i = 0
    } = a;
  if (i % h !== 0) return {
    ok: !1,
    message: `offset (${i}) must be divisible by limit (${h})`
  };
  let c = Kx(a.repository),
    s = Math.min(h, 100),
    A = Math.floor(i / s) + 1,
    l = `${t} repo:${c}`;
  if (r && r !== ".") l += ` path:${r}`;
  let o = `search/code?q=${encodeURIComponent(l)}&per_page=${s}&page=${A}`,
    n = await R.fetchJSON(o, {
      headers: {
        Accept: "application/vnd.github.v3.text-match+json"
      },
      signal: e
    });
  if (!n.ok || !n.data) return {
    ok: !1,
    message: `Failed to search code: ${n.status} ${n.statusText ?? "Unknown error"}`
  };
  let p = n.data;
  if (p.total_count === 0) return {
    ok: !0,
    result: {
      results: [],
      totalCount: 0
    }
  };
  let _ = new Map();
  for (let m of p.items) {
    if (!_.has(m.path)) _.set(m.path, []);
    let b = _.get(m.path);
    for (let y of m.text_matches) if (y.property === "content" && y.fragment) {
      let u = y.fragment.trim();
      if (u.length > 2048) u = `${u.slice(0, 2048)}... (truncated)`;
      b.push(u);
    }
  }
  return {
    ok: !0,
    result: {
      results: Array.from(_.entries()).map(([m, b]) => ({
        file: m,
        chunks: b
      })),
      totalCount: p.total_count
    }
  };
}
async function qGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      limit: t = 100
    } = a,
    r = Kx(a.repository),
    h = (a.path ?? "").replace(/^\//, "");
  if (h === "." || h === "") h = "";
  let i = h.split("/").map(encodeURIComponent).join("/"),
    c = `repos/${r}/contents/${i}`,
    s = await R.fetchJSON(c, {
      signal: e
    });
  if (!s.ok || !s.data) return {
    ok: !1,
    message: `Failed to list directory: ${s.status} ${s.statusText ?? "Unknown error"}`
  };
  return {
    ok: !0,
    result: VzT(s.data).slice(0, t)
  };
}
async function zGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      filePattern: t,
      limit: r = 100,
      offset: h = 0
    } = a,
    i = `repos/${Kx(a.repository)}/git/trees/HEAD?recursive=1`,
    c = await R.fetchJSON(i, {
      signal: e
    });
  if (!c.ok || !c.data) return {
    ok: !1,
    message: `Failed to fetch file tree: ${c.status} ${c.statusText ?? "Unknown error"}`
  };
  if (c.data.truncated) return {
    ok: !1,
    message: "Repository tree is too large for recursive listing. Try a more specific search or use search_github instead."
  };
  return {
    ok: !0,
    result: c.data.tree.filter(s => s.type === "blob").map(s => s.path).filter(s => BGR(t, s)).slice(h, h + r)
  };
}
async function FGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      query: t,
      author: r,
      since: h,
      until: i,
      path: c,
      limit: s = 50,
      offset: A = 0
    } = a;
  if (A % s !== 0) return {
    ok: !1,
    message: `offset (${A}) must be divisible by limit (${s})`
  };
  let l = Kx(a.repository),
    o = Math.min(s, 100),
    n = Math.floor(A / o) + 1,
    p = !1,
    _;
  if (c || !t) {
    let u = new URLSearchParams({
      per_page: String(o),
      page: String(n)
    });
    if (h) u.append("since", h);
    if (i) u.append("until", i);
    if (r) u.append("author", r);
    if (c) u.append("path", c);
    _ = `repos/${l}/commits?${u.toString()}`;
  } else {
    p = !0;
    let u = [t, `repo:${l}`];
    if (r) u.push(`author:${r}`);
    if (h) u.push(`author-date:>=${h}`);
    if (i) u.push(`author-date:<=${i}`);
    let P = u.join(" ");
    _ = `search/commits?q=${encodeURIComponent(P)}&per_page=${o}&page=${n}&sort=author-date&order=desc`;
  }
  let m = await R.fetchJSON(_, {
    signal: e
  });
  if (!m.ok || !m.data) return {
    ok: !1,
    message: `Failed to search commits: ${m.status} ${m.statusText ?? "Unknown error"}`
  };
  let b, y;
  if (p) {
    let u = m.data;
    b = u.items ?? [], y = u.total_count ?? 0;
  } else {
    if (b = m.data, t) {
      let u = t.toLowerCase();
      b = b.filter(P => P.commit.message.toLowerCase().includes(u) || P.commit.author.name.toLowerCase().includes(u) || P.commit.author.email.toLowerCase().includes(u));
    }
    y = b.length;
  }
  return {
    ok: !0,
    result: {
      commits: b.map(u => {
        let P = u.commit.message.trim();
        return {
          sha: u.sha,
          message: P.length > 1024 ? `${P.slice(0, 1024)}... (truncated)` : P,
          author: {
            name: u.commit.author.name,
            email: u.commit.author.email,
            date: u.commit.author.date
          }
        };
      }),
      totalCount: y
    }
  };
}
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
async function KGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      pattern: t,
      organization: r,
      language: h,
      limit: i = 30,
      offset: c = 0
    } = a;
  if (c % i !== 0) return {
    ok: !1,
    message: `offset (${c}) must be divisible by limit (${i})`
  };
  let s = [],
    A = 0,
    l = i * 5,
    o = Math.floor(c / l) + 1,
    n = await R.fetchJSON(`user/repos?per_page=${l}&page=${o}&sort=updated&affiliation=owner,collaborator,organization_member`, {
      signal: e
    });
  if (n.ok && n.data) {
    let p = n.data;
    if (t) {
      let _ = t.toLowerCase();
      p = p.filter(m => m.full_name.toLowerCase().includes(_));
    }
    if (r) {
      let _ = r.toLowerCase();
      p = p.filter(m => {
        return m.full_name.split("/")[0]?.toLowerCase() === _;
      });
    }
    if (h) {
      let _ = h.toLowerCase();
      p = p.filter(m => m.language?.toLowerCase() === _);
    }
    p.sort((_, m) => m.stargazers_count - _.stargazers_count), s.push(...p), A = p.length;
  }
  if (s.length < i) {
    let p = [];
    if (t) p.push(`${t} in:name`);
    if (r) p.push(`org:${r}`);
    if (h) p.push(`language:${h}`);
    let _ = p.length > 0 ? p.join(" ") : "*",
      m = i - s.length,
      b = await R.fetchJSON(`search/repositories?q=${encodeURIComponent(_)}&per_page=${Math.min(m, 100)}&sort=stars&order=desc`, {
        signal: e
      });
    if (b.ok && b.data) {
      let y = new Set(s.map(P => P.full_name)),
        u = b.data.items.filter(P => !y.has(P.full_name));
      s.push(...u.slice(0, m)), A += u.length;
    }
  }
  return {
    ok: !0,
    result: {
      repositories: s.slice(0, i).map(p => ({
        name: p.full_name,
        description: p.description,
        language: p.language,
        stargazersCount: p.stargazers_count,
        forksCount: p.forks_count,
        private: p.private
      })),
      totalCount: A
    }
  };
}
function bKR(T) {
  if (T.settings.bitbucketToken) return "bitbucket-enterprise";
  return "github";
}
function uKR(T, R) {
  return new AR(a => {
    let e = null,
      t = !1;
    return a.next({
      status: "blocked-on-user",
      reason: "The Librarian needs to authenticate with GitHub to search for code on your behalf."
    }), T.toolService.requestApproval({
      threadId: T.thread.id,
      mainThreadId: T.thread.mainThreadID,
      toolUseId: T.toolUseID,
      toolName: uc,
      args: {},
      reason: "The Librarian needs to authenticate with GitHub to search for code on your behalf.",
      context: T.thread.mainThreadID ? "subagent" : "thread"
    }).then(r => {
      if (t) return;
      if (r) a.next({
        status: "in-progress"
      }), e = qX(R, T, "github").subscribe(a);else a.next({
        status: "rejected-by-user",
        reason: "GitHub authentication was cancelled."
      }), a.complete();
    }).catch(r => {
      if (t) return;
      J.error("GitHub auth approval request failed:", r), a.next({
        status: "error",
        error: {
          message: r instanceof Error ? r.message : "Approval request failed"
        }
      }), a.complete();
    }), () => {
      t = !0, e?.unsubscribe();
    };
  });
}
async function yKR(T) {
  try {
    let R = await fi("/api/internal/bitbucket-instance-url", void 0, T);
    if (!R.ok) return;
    return (await R.json()).instanceUrl ?? void 0;
  } catch (R) {
    J.error("Failed to fetch Bitbucket instance URL", {
      error: R instanceof Error ? R.message : String(R)
    });
    return;
  }
}
function qX(T, R, a) {
  let e = [{
      role: "user",
      content: T
    }],
    t = a === "bitbucket-enterprise" ? _LT : Y2,
    r = {
      ...qe.librarian,
      includeTools: t
    },
    h = i => {
      let c = SKR(a, R.config, {
        instanceUrl: i
      });
      return new wi().run(Fx, {
        systemPrompt: c,
        model: qe.librarian.model,
        spec: r
      }, {
        conversation: e,
        toolService: R.toolService,
        env: R
      }).pipe(JR(xKR));
    };
  if (a === "bitbucket-enterprise" && R.config.settings.bitbucketToken) return Q9(() => yKR(R.configService)).pipe(L9(i => h(i)));
  return h();
}
function PKR(T) {
  return new AR(R => {
    kKR(T).then(a => {
      R.next(a), R.complete();
    }).catch(a => {
      R.error(a);
    });
  });
}
async function kKR(T) {
  try {
    let R = await fi("/api/internal/github-auth-status", void 0, T);
    if (!R.ok) return J.warn("GitHub auth status check failed", {
      status: R.status
    }), !1;
    return (await R.json()).authenticated;
  } catch (R) {
    return J.error("Failed to check GitHub authentication", {
      error: R instanceof Error ? R.message : String(R)
    }), !1;
  }
}
function xKR(T) {
  switch (T.status) {
    case "in-progress":
      return {
        status: "in-progress",
        progress: T.turns.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        }))
      };
    case "done":
      return {
        status: "done",
        result: T.message,
        progress: T.turns.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        })),
        "~debug": T["~debug"]
      };
    case "error":
      if (T.message.includes("context window") || T.message.includes("token")) throw new MaT("Librarian has reached the context window limit. Please try a more specific query.", "Librarian has reached the context window limit and failed to return a result.");
      return {
        status: "error",
        error: {
          message: T.message
        }
      };
    case "cancelled":
      return {
        status: "cancelled"
      };
  }
}
function vKR(T) {
  return `
## Repository Provider: Bitbucket Enterprise (self-hosted)

Use the Bitbucket Enterprise tools (read_bitbucket_enterprise, list_directory_bitbucket_enterprise, list_repositories_bitbucket_enterprise, glob_bitbucket_enterprise, search_bitbucket_enterprise, diff_bitbucket_enterprise, commit_search_bitbucket_enterprise) for self-hosted Bitbucket Server/Data Center instances.
\`search_bitbucket_enterprise\` requires the Bitbucket Code Search plugin to be installed.

Instance guidance:
- The configured instance URL is ${T}
- Always pass exactly \`${T}\` as \`instanceUrl\` for every Bitbucket Enterprise tool call
- When a tool expects \`repository\`, pass a repository browse URL on this instance, for example
  ${T}/projects/PROJ/repos/repo-name/browse

Linking:
- Link files as
  \`${T}/projects/<PROJECT>/repos/<repo>/browse/<filepath>?at=<ref>#<line>\`

Example:
<example-file-url>${T}/projects/CORE/repos/api-service/browse/src/auth.ts?at=develop#42</example-file-url>
`;
}
function SKR(T, R, a) {
  let e;
  if (T === "bitbucket-enterprise") {
    let t = a?.instanceUrl;
    if (t) {
      let r = t.trim().replace(/\/+$/, "");
      e = vKR(r);
    } else e = jKR;
  } else e = $KR;
  return gKR + e;
}
class XzT {
  constructor() {
    this.resolve = () => null, this.reject = () => null, this.promise = new Promise((T, R) => {
      this.reject = R, this.resolve = T;
    });
  }
}
class FU {
  constructor() {
    this.endOfStream = !1, this.interrupted = !1, this.peekQueue = [];
  }
  async peek(T, R = !1) {
    let a = await this.read(T, R);
    return this.peekQueue.push(T.subarray(0, a)), a;
  }
  async read(T, R = !1) {
    if (T.length === 0) return 0;
    let a = this.readFromPeekBuffer(T);
    if (!this.endOfStream) a += await this.readRemainderFromStream(T.subarray(a), R);
    if (a === 0 && !R) throw new fe();
    return a;
  }
  readFromPeekBuffer(T) {
    let R = T.length,
      a = 0;
    while (this.peekQueue.length > 0 && R > 0) {
      let e = this.peekQueue.pop();
      if (!e) throw Error("peekData should be defined");
      let t = Math.min(e.length, R);
      if (T.set(e.subarray(0, t), a), a += t, R -= t, t < e.length) this.peekQueue.push(e.subarray(t));
    }
    return a;
  }
  async readRemainderFromStream(T, R) {
    let a = 0;
    while (a < T.length && !this.endOfStream) {
      if (this.interrupted) throw new DaT();
      let e = await this.readFromStream(T.subarray(a), R);
      if (e === 0) break;
      a += e;
    }
    if (!R && a < T.length) throw new fe();
    return a;
  }
}
function DKR(T) {
  try {
    let R = T.getReader({
      mode: "byob"
    });
    if (R instanceof ReadableStreamDefaultReader) return new zX(R);
    return new ZzT(R);
  } catch (R) {
    if (R instanceof TypeError) return new zX(T.getReader());
    throw R;
  }
}
class qO {
  constructor(T) {
    if (this.numBuffer = new Uint8Array(8), this.position = 0, this.onClose = T?.onClose, T?.abortSignal) T.abortSignal.addEventListener("abort", () => {
      this.abort();
    });
  }
  async readToken(T, R = this.position) {
    let a = new Uint8Array(T.len);
    if ((await this.readBuffer(a, {
      position: R
    })) < T.len) throw new fe();
    return T.get(a, 0);
  }
  async peekToken(T, R = this.position) {
    let a = new Uint8Array(T.len);
    if ((await this.peekBuffer(a, {
      position: R
    })) < T.len) throw new fe();
    return T.get(a, 0);
  }
  async readNumber(T) {
    if ((await this.readBuffer(this.numBuffer, {
      length: T.len
    })) < T.len) throw new fe();
    return T.get(this.numBuffer, 0);
  }
  async peekNumber(T) {
    if ((await this.peekBuffer(this.numBuffer, {
      length: T.len
    })) < T.len) throw new fe();
    return T.get(this.numBuffer, 0);
  }
  async ignore(T) {
    if (this.fileInfo.size !== void 0) {
      let R = this.fileInfo.size - this.position;
      if (T > R) return this.position += R, R;
    }
    return this.position += T, T;
  }
  async close() {
    await this.abort(), await this.onClose?.();
  }
  normalizeOptions(T, R) {
    if (!this.supportsRandomAccess() && R && R.position !== void 0 && R.position < this.position) throw Error("`options.position` must be equal or greater than `tokenizer.position`");
    return {
      ...{
        mayBeLess: !1,
        offset: 0,
        length: T.length,
        position: this.position
      },
      ...R
    };
  }
  abort() {
    return Promise.resolve();
  }
}
function BKR(T, R) {
  let a = new YzT(T),
    e = R ?? {},
    t = e.onClose;
  return e.onClose = async () => {
    if (await a.close(), t) return t();
  }, new waT(a, e);
}
function RFT(T, R) {
  let a = DKR(T),
    e = R ?? {},
    t = e.onClose;
  return e.onClose = async () => {
    if (await a.close(), t) return t();
  }, new waT(a, e);
}
function NKR(T, R) {
  return new JzT(T, R);
}
function UKR(T, R) {
  return new TFT(T, R);
}
async function WKR(T, R) {
  let a = BKR(T, R);
  if (T.path) {
    let e = await MKR(T.path);
    a.fileInfo.path = T.path, a.fileInfo.size = e.size;
  }
  return a;
}
function FKR(T, R = "utf-8") {
  switch (R.toLowerCase()) {
    case "utf-8":
    case "utf8":
      if (typeof globalThis.TextDecoder < "u") return new globalThis.TextDecoder("utf-8").decode(T);
      return GKR(T);
    case "utf-16le":
      return KKR(T);
    case "ascii":
      return VKR(T);
    case "latin1":
    case "iso-8859-1":
      return XKR(T);
    case "windows-1252":
      return YKR(T);
    default:
      throw RangeError(`Encoding '${R}' not supported`);
  }
}
function GKR(T) {
  let R = "",
    a = 0;
  while (a < T.length) {
    let e = T[a++];
    if (e < 128) R += String.fromCharCode(e);else if (e < 224) {
      let t = T[a++] & 63;
      R += String.fromCharCode((e & 31) << 6 | t);
    } else if (e < 240) {
      let t = T[a++] & 63,
        r = T[a++] & 63;
      R += String.fromCharCode((e & 15) << 12 | t << 6 | r);
    } else {
      let t = T[a++] & 63,
        r = T[a++] & 63,
        h = T[a++] & 63,
        i = (e & 7) << 18 | t << 12 | r << 6 | h;
      i -= 65536, R += String.fromCharCode(55296 + (i >> 10 & 1023), 56320 + (i & 1023));
    }
  }
  return R;
}
function KKR(T) {
  let R = "";
  for (let a = 0; a < T.length; a += 2) R += String.fromCharCode(T[a] | T[a + 1] << 8);
  return R;
}
function VKR(T) {
  return String.fromCharCode(...T.map(R => R & 127));
}
function XKR(T) {
  return String.fromCharCode(...T);
}
function YKR(T) {
  let R = "";
  for (let a of T) if (a >= 128 && a <= 159 && FX[a]) R += FX[a];else R += String.fromCharCode(a);
  return R;
}
function Dr(T) {
  return new DataView(T.buffer, T.byteOffset);
}
class bs {
  constructor(T, R) {
    this.len = T, this.encoding = R;
  }
  get(T, R = 0) {
    let a = T.subarray(R, R + this.len);
    return FKR(a, this.encoding);
  }
}
function aFT(T) {
  let R = new Uint8Array(Ie.len);
  return Ie.put(R, 0, T), R;
}
class NaT {
  constructor(T) {
    this.tokenizer = T, this.syncBuffer = new Uint8Array(Az);
  }
  async isZip() {
    return (await this.peekSignature()) === rP.LocalFileHeader;
  }
  peekSignature() {
    return this.tokenizer.peekToken(Ie);
  }
  async findEndOfCentralDirectoryLocator() {
    let T = this.tokenizer,
      R = Math.min(16384, T.fileInfo.size),
      a = this.syncBuffer.subarray(0, R);
    await this.tokenizer.readBuffer(a, {
      position: T.fileInfo.size - R
    });
    for (let e = a.length - 4; e >= 0; e--) if (a[e] === t4[0] && a[e + 1] === t4[1] && a[e + 2] === t4[2] && a[e + 3] === t4[3]) return T.fileInfo.size - R + e;
    return -1;
  }
  async readCentralDirectory() {
    if (!this.tokenizer.supportsRandomAccess()) {
      Qc("Cannot reading central-directory without random-read support");
      return;
    }
    Qc("Reading central-directory...");
    let T = this.tokenizer.position,
      R = await this.findEndOfCentralDirectoryLocator();
    if (R > 0) {
      Qc("Central-directory 32-bit signature found");
      let a = await this.tokenizer.readToken(eVR, R),
        e = [];
      this.tokenizer.setPosition(a.offsetOfStartOfCd);
      for (let t = 0; t < a.nrOfEntriesOfSize; ++t) {
        let r = await this.tokenizer.readToken(tVR);
        if (r.signature !== rP.CentralFileHeader) throw Error("Expected Central-File-Header signature");
        r.filename = await this.tokenizer.readToken(new bs(r.filenameLength, "utf-8")), await this.tokenizer.ignore(r.extraFieldLength), await this.tokenizer.ignore(r.fileCommentLength), e.push(r), Qc(`Add central-directory file-entry: n=${t + 1}/${e.length}: filename=${e[t].filename}`);
      }
      return this.tokenizer.setPosition(T), e;
    }
    this.tokenizer.setPosition(T);
  }
  async unzip(T) {
    let R = await this.readCentralDirectory();
    if (R) return this.iterateOverCentralDirectory(R, T);
    let a = !1;
    do {
      let e = await this.readLocalFileHeader();
      if (!e) break;
      let t = T(e);
      a = !!t.stop;
      let r;
      if (await this.tokenizer.ignore(e.extraFieldLength), e.dataDescriptor && e.compressedSize === 0) {
        let h = [],
          i = Az;
        Qc("Compressed-file-size unknown, scanning for next data-descriptor-signature....");
        let c = -1;
        while (c < 0 && i === Az) {
          i = await this.tokenizer.peekBuffer(this.syncBuffer, {
            mayBeLess: !0
          }), c = hVR(this.syncBuffer.subarray(0, i), rVR);
          let s = c >= 0 ? c : i;
          if (t.handler) {
            let A = new Uint8Array(s);
            await this.tokenizer.readBuffer(A), h.push(A);
          } else await this.tokenizer.ignore(s);
        }
        if (Qc(`Found data-descriptor-signature at pos=${this.tokenizer.position}`), t.handler) await this.inflate(e, iVR(h), t.handler);
      } else if (t.handler) Qc(`Reading compressed-file-data: ${e.compressedSize} bytes`), r = new Uint8Array(e.compressedSize), await this.tokenizer.readBuffer(r), await this.inflate(e, r, t.handler);else Qc(`Ignoring compressed-file-data: ${e.compressedSize} bytes`), await this.tokenizer.ignore(e.compressedSize);
      if (Qc(`Reading data-descriptor at pos=${this.tokenizer.position}`), e.dataDescriptor) {
        if ((await this.tokenizer.readToken(XuT)).signature !== 134695760) throw Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - XuT.len}`);
      }
    } while (!a);
  }
  async iterateOverCentralDirectory(T, R) {
    for (let a of T) {
      let e = R(a);
      if (e.handler) {
        this.tokenizer.setPosition(a.relativeOffsetOfLocalHeader);
        let t = await this.readLocalFileHeader();
        if (t) {
          await this.tokenizer.ignore(t.extraFieldLength);
          let r = new Uint8Array(a.compressedSize);
          await this.tokenizer.readBuffer(r), await this.inflate(t, r, e.handler);
        }
      }
      if (e.stop) break;
    }
  }
  async inflate(T, R, a) {
    if (T.compressedMethod === 0) return a(R);
    if (T.compressedMethod !== 8) throw Error(`Unsupported ZIP compression method: ${T.compressedMethod}`);
    Qc(`Decompress filename=${T.filename}, compressed-size=${R.length}`);
    let e = await NaT.decompressDeflateRaw(R);
    return a(e);
  }
  static async decompressDeflateRaw(T) {
    let R = new ReadableStream({
        start(t) {
          t.enqueue(T), t.close();
        }
      }),
      a = new DecompressionStream("deflate-raw"),
      e = R.pipeThrough(a);
    try {
      let t = await new Response(e).arrayBuffer();
      return new Uint8Array(t);
    } catch (t) {
      let r = t instanceof Error ? `Failed to deflate ZIP entry: ${t.message}` : "Unknown decompression error in ZIP entry";
      throw TypeError(r);
    }
  }
  async readLocalFileHeader() {
    let T = await this.tokenizer.peekToken(Ie);
    if (T === rP.LocalFileHeader) {
      let R = await this.tokenizer.readToken(aVR);
      return R.filename = await this.tokenizer.readToken(new bs(R.filenameLength, "utf-8")), R;
    }
    if (T === rP.CentralFileHeader) return !1;
    if (T === 3759263696) throw Error("Encrypted ZIP");
    throw Error("Unexpected signature");
  }
}
function hVR(T, R) {
  let a = T.length,
    e = R.length;
  if (e > a) return -1;
  for (let t = 0; t <= a - e; t++) {
    let r = !0;
    for (let h = 0; h < e; h++) if (T[t + h] !== R[h]) {
      r = !1;
      break;
    }
    if (r) return t;
  }
  return -1;
}
function iVR(T) {
  let R = T.reduce((t, r) => t + r.length, 0),
    a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a;
}
class eFT {
  constructor(T) {
    this.tokenizer = T;
  }
  inflate() {
    let T = this.tokenizer;
    return new ReadableStream({
      async pull(R) {
        let a = new Uint8Array(1024),
          e = await T.readBuffer(a, {
            mayBeLess: !0
          });
        if (e === 0) {
          R.close();
          return;
        }
        R.enqueue(a.subarray(0, e));
      }
    }).pipeThrough(new DecompressionStream("gzip"));
  }
}
function YuT(T) {
  let {
    byteLength: R
  } = T;
  if (R === 6) return T.getUint16(0) * 4294967296 + T.getUint32(2);
  if (R === 5) return T.getUint8(0) * 4294967296 + T.getUint32(1);
  if (R === 4) return T.getUint32(0);
  if (R === 3) return T.getUint8(0) * 65536 + T.getUint16(1);
  if (R === 2) return T.getUint16(0);
  if (R === 1) return T.getUint8(0);
}
function cVR(T, R) {
  if (R === "utf-16le") {
    let a = [];
    for (let e = 0; e < T.length; e++) {
      let t = T.charCodeAt(e);
      a.push(t & 255, t >> 8 & 255);
    }
    return a;
  }
  if (R === "utf-16be") {
    let a = [];
    for (let e = 0; e < T.length; e++) {
      let t = T.charCodeAt(e);
      a.push(t >> 8 & 255, t & 255);
    }
    return a;
  }
  return [...T].map(a => a.charCodeAt(0));
}
function sVR(T, R = 0) {
  let a = Number.parseInt(new bs(6).get(T, 148).replace(/\0.*$/, "").trim(), 8);
  if (Number.isNaN(a)) return !1;
  let e = 256;
  for (let t = R; t < R + 148; t++) e += T[t];
  for (let t = R + 156; t < R + 512; t++) e += T[t];
  return a === e;
}
function pz(T) {
  switch (T = T.toLowerCase(), T) {
    case "application/epub+zip":
      return {
        ext: "epub",
        mime: T
      };
    case "application/vnd.oasis.opendocument.text":
      return {
        ext: "odt",
        mime: T
      };
    case "application/vnd.oasis.opendocument.text-template":
      return {
        ext: "ott",
        mime: T
      };
    case "application/vnd.oasis.opendocument.spreadsheet":
      return {
        ext: "ods",
        mime: T
      };
    case "application/vnd.oasis.opendocument.spreadsheet-template":
      return {
        ext: "ots",
        mime: T
      };
    case "application/vnd.oasis.opendocument.presentation":
      return {
        ext: "odp",
        mime: T
      };
    case "application/vnd.oasis.opendocument.presentation-template":
      return {
        ext: "otp",
        mime: T
      };
    case "application/vnd.oasis.opendocument.graphics":
      return {
        ext: "odg",
        mime: T
      };
    case "application/vnd.oasis.opendocument.graphics-template":
      return {
        ext: "otg",
        mime: T
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.slideshow":
      return {
        ext: "ppsx",
        mime: T
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return {
        ext: "xlsx",
        mime: T
      };
    case "application/vnd.ms-excel.sheet.macroenabled":
      return {
        ext: "xlsm",
        mime: "application/vnd.ms-excel.sheet.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.template":
      return {
        ext: "xltx",
        mime: T
      };
    case "application/vnd.ms-excel.template.macroenabled":
      return {
        ext: "xltm",
        mime: "application/vnd.ms-excel.template.macroenabled.12"
      };
    case "application/vnd.ms-powerpoint.slideshow.macroenabled":
      return {
        ext: "ppsm",
        mime: "application/vnd.ms-powerpoint.slideshow.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return {
        ext: "docx",
        mime: T
      };
    case "application/vnd.ms-word.document.macroenabled":
      return {
        ext: "docm",
        mime: "application/vnd.ms-word.document.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.template":
      return {
        ext: "dotx",
        mime: T
      };
    case "application/vnd.ms-word.template.macroenabledtemplate":
      return {
        ext: "dotm",
        mime: "application/vnd.ms-word.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.template":
      return {
        ext: "potx",
        mime: T
      };
    case "application/vnd.ms-powerpoint.template.macroenabled":
      return {
        ext: "potm",
        mime: "application/vnd.ms-powerpoint.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return {
        ext: "pptx",
        mime: T
      };
    case "application/vnd.ms-powerpoint.presentation.macroenabled":
      return {
        ext: "pptm",
        mime: "application/vnd.ms-powerpoint.presentation.macroenabled.12"
      };
    case "application/vnd.ms-visio.drawing":
      return {
        ext: "vsdx",
        mime: "application/vnd.visio"
      };
    case "application/vnd.ms-package.3dmanufacturing-3dmodel+xml":
      return {
        ext: "3mf",
        mime: "model/3mf"
      };
    default:
  }
}
function Zc(T, R, a) {
  a = {
    offset: 0,
    ...a
  };
  for (let [e, t] of R.entries()) if (a.mask) {
    if (t !== (a.mask[e] & T[e + a.offset])) return !1;
  } else if (t !== T[e + a.offset]) return !1;
  return !0;
}
class tFT {
  constructor(T) {
    this.options = {
      mpegOffsetTolerance: 0,
      ...T
    }, this.detectors = [...(T?.customDetectors ?? []), {
      id: "core",
      detect: this.detectConfident
    }, {
      id: "core.imprecise",
      detect: this.detectImprecise
    }], this.tokenizerOptions = {
      abortSignal: T?.signal
    };
  }
  async fromTokenizer(T) {
    let R = T.position;
    for (let a of this.detectors) {
      let e = await a.detect(T);
      if (e) return e;
      if (R !== T.position) return;
    }
  }
  async fromBuffer(T) {
    if (!(T instanceof Uint8Array || T instanceof ArrayBuffer)) throw TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof T}\``);
    let R = T instanceof Uint8Array ? T : new Uint8Array(T);
    if (!(R?.length > 1)) return;
    return this.fromTokenizer(NKR(R, this.tokenizerOptions));
  }
  async fromBlob(T) {
    let R = UKR(T, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(R);
    } finally {
      await R.close();
    }
  }
  async fromStream(T) {
    let R = RFT(T, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(R);
    } finally {
      await R.close();
    }
  }
  async toDetectionStream(T, R) {
    let {
        sampleSize: a = lM
      } = R,
      e,
      t,
      r = T.getReader({
        mode: "byob"
      });
    try {
      let {
        value: c,
        done: s
      } = await r.read(new Uint8Array(a));
      if (t = c, !s && c) try {
        e = await this.fromBuffer(c.subarray(0, a));
      } catch (A) {
        if (!(A instanceof fe)) throw A;
        e = void 0;
      }
      t = c;
    } finally {
      r.releaseLock();
    }
    let h = new TransformStream({
        async start(c) {
          c.enqueue(t);
        },
        transform(c, s) {
          s.enqueue(c);
        }
      }),
      i = T.pipeThrough(h);
    return i.fileType = e, i;
  }
  check(T, R) {
    return Zc(this.buffer, T, R);
  }
  checkString(T, R) {
    return this.check(cVR(T, R?.encoding), R);
  }
  detectConfident = async T => {
    if (this.buffer = new Uint8Array(lM), T.fileInfo.size === void 0) T.fileInfo.size = Number.MAX_SAFE_INTEGER;
    if (this.tokenizer = T, await T.peekBuffer(this.buffer, {
      length: 32,
      mayBeLess: !0
    }), this.check([66, 77])) return {
      ext: "bmp",
      mime: "image/bmp"
    };
    if (this.check([11, 119])) return {
      ext: "ac3",
      mime: "audio/vnd.dolby.dd-raw"
    };
    if (this.check([120, 1])) return {
      ext: "dmg",
      mime: "application/x-apple-diskimage"
    };
    if (this.check([77, 90])) return {
      ext: "exe",
      mime: "application/x-msdownload"
    };
    if (this.check([37, 33])) {
      if (await T.peekBuffer(this.buffer, {
        length: 24,
        mayBeLess: !0
      }), this.checkString("PS-Adobe-", {
        offset: 2
      }) && this.checkString(" EPSF-", {
        offset: 14
      })) return {
        ext: "eps",
        mime: "application/eps"
      };
      return {
        ext: "ps",
        mime: "application/postscript"
      };
    }
    if (this.check([31, 160]) || this.check([31, 157])) return {
      ext: "Z",
      mime: "application/x-compress"
    };
    if (this.check([199, 113])) return {
      ext: "cpio",
      mime: "application/x-cpio"
    };
    if (this.check([96, 234])) return {
      ext: "arj",
      mime: "application/x-arj"
    };
    if (this.check([239, 187, 191])) return this.tokenizer.ignore(3), this.detectConfident(T);
    if (this.check([71, 73, 70])) return {
      ext: "gif",
      mime: "image/gif"
    };
    if (this.check([73, 73, 188])) return {
      ext: "jxr",
      mime: "image/vnd.ms-photo"
    };
    if (this.check([31, 139, 8])) {
      let R = new eFT(T).inflate(),
        a = !0;
      try {
        let e;
        try {
          e = await this.fromStream(R);
        } catch {
          a = !1;
        }
        if (e && e.ext === "tar") return {
          ext: "tar.gz",
          mime: "application/gzip"
        };
      } finally {
        if (a) await R.cancel();
      }
      return {
        ext: "gz",
        mime: "application/gzip"
      };
    }
    if (this.check([66, 90, 104])) return {
      ext: "bz2",
      mime: "application/x-bzip2"
    };
    if (this.checkString("ID3")) {
      await T.ignore(6);
      let R = await T.readToken(oVR);
      if (T.position + R > T.fileInfo.size) return {
        ext: "mp3",
        mime: "audio/mpeg"
      };
      return await T.ignore(R), this.fromTokenizer(T);
    }
    if (this.checkString("MP+")) return {
      ext: "mpc",
      mime: "audio/x-musepack"
    };
    if ((this.buffer[0] === 67 || this.buffer[0] === 70) && this.check([87, 83], {
      offset: 1
    })) return {
      ext: "swf",
      mime: "application/x-shockwave-flash"
    };
    if (this.check([255, 216, 255])) {
      if (this.check([247], {
        offset: 3
      })) return {
        ext: "jls",
        mime: "image/jls"
      };
      return {
        ext: "jpg",
        mime: "image/jpeg"
      };
    }
    if (this.check([79, 98, 106, 1])) return {
      ext: "avro",
      mime: "application/avro"
    };
    if (this.checkString("FLIF")) return {
      ext: "flif",
      mime: "image/flif"
    };
    if (this.checkString("8BPS")) return {
      ext: "psd",
      mime: "image/vnd.adobe.photoshop"
    };
    if (this.checkString("MPCK")) return {
      ext: "mpc",
      mime: "audio/x-musepack"
    };
    if (this.checkString("FORM")) return {
      ext: "aif",
      mime: "audio/aiff"
    };
    if (this.checkString("icns", {
      offset: 0
    })) return {
      ext: "icns",
      mime: "image/icns"
    };
    if (this.check([80, 75, 3, 4])) {
      let R;
      return await new NaT(T).unzip(a => {
        switch (a.filename) {
          case "META-INF/mozilla.rsa":
            return R = {
              ext: "xpi",
              mime: "application/x-xpinstall"
            }, {
              stop: !0
            };
          case "META-INF/MANIFEST.MF":
            return R = {
              ext: "jar",
              mime: "application/java-archive"
            }, {
              stop: !0
            };
          case "mimetype":
            return {
              async handler(e) {
                let t = new TextDecoder("utf-8").decode(e).trim();
                R = pz(t);
              },
              stop: !0
            };
          case "[Content_Types].xml":
            return {
              async handler(e) {
                let t = new TextDecoder("utf-8").decode(e),
                  r = t.indexOf('.main+xml"');
                if (r === -1) {
                  if (t.includes('ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"')) R = pz("application/vnd.ms-package.3dmanufacturing-3dmodel+xml");
                } else {
                  t = t.slice(0, Math.max(0, r));
                  let h = t.lastIndexOf('"'),
                    i = t.slice(Math.max(0, h + 1));
                  R = pz(i);
                }
              },
              stop: !0
            };
          default:
            if (/classes\d*\.dex/.test(a.filename)) return R = {
              ext: "apk",
              mime: "application/vnd.android.package-archive"
            }, {
              stop: !0
            };
            return {};
        }
      }).catch(a => {
        if (!(a instanceof fe)) throw a;
      }), R ?? {
        ext: "zip",
        mime: "application/zip"
      };
    }
    if (this.checkString("OggS")) {
      await T.ignore(28);
      let R = new Uint8Array(8);
      if (await T.readBuffer(R), Zc(R, [79, 112, 117, 115, 72, 101, 97, 100])) return {
        ext: "opus",
        mime: "audio/ogg; codecs=opus"
      };
      if (Zc(R, [128, 116, 104, 101, 111, 114, 97])) return {
        ext: "ogv",
        mime: "video/ogg"
      };
      if (Zc(R, [1, 118, 105, 100, 101, 111, 0])) return {
        ext: "ogm",
        mime: "video/ogg"
      };
      if (Zc(R, [127, 70, 76, 65, 67])) return {
        ext: "oga",
        mime: "audio/ogg"
      };
      if (Zc(R, [83, 112, 101, 101, 120, 32, 32])) return {
        ext: "spx",
        mime: "audio/ogg"
      };
      if (Zc(R, [1, 118, 111, 114, 98, 105, 115])) return {
        ext: "ogg",
        mime: "audio/ogg"
      };
      return {
        ext: "ogx",
        mime: "application/ogg"
      };
    }
    if (this.check([80, 75]) && (this.buffer[2] === 3 || this.buffer[2] === 5 || this.buffer[2] === 7) && (this.buffer[3] === 4 || this.buffer[3] === 6 || this.buffer[3] === 8)) return {
      ext: "zip",
      mime: "application/zip"
    };
    if (this.checkString("MThd")) return {
      ext: "mid",
      mime: "audio/midi"
    };
    if (this.checkString("wOFF") && (this.check([0, 1, 0, 0], {
      offset: 4
    }) || this.checkString("OTTO", {
      offset: 4
    }))) return {
      ext: "woff",
      mime: "font/woff"
    };
    if (this.checkString("wOF2") && (this.check([0, 1, 0, 0], {
      offset: 4
    }) || this.checkString("OTTO", {
      offset: 4
    }))) return {
      ext: "woff2",
      mime: "font/woff2"
    };
    if (this.check([212, 195, 178, 161]) || this.check([161, 178, 195, 212])) return {
      ext: "pcap",
      mime: "application/vnd.tcpdump.pcap"
    };
    if (this.checkString("DSD ")) return {
      ext: "dsf",
      mime: "audio/x-dsf"
    };
    if (this.checkString("LZIP")) return {
      ext: "lz",
      mime: "application/x-lzip"
    };
    if (this.checkString("fLaC")) return {
      ext: "flac",
      mime: "audio/flac"
    };
    if (this.check([66, 80, 71, 251])) return {
      ext: "bpg",
      mime: "image/bpg"
    };
    if (this.checkString("wvpk")) return {
      ext: "wv",
      mime: "audio/wavpack"
    };
    if (this.checkString("%PDF")) return {
      ext: "pdf",
      mime: "application/pdf"
    };
    if (this.check([0, 97, 115, 109])) return {
      ext: "wasm",
      mime: "application/wasm"
    };
    if (this.check([73, 73])) {
      let R = await this.readTiffHeader(!1);
      if (R) return R;
    }
    if (this.check([77, 77])) {
      let R = await this.readTiffHeader(!0);
      if (R) return R;
    }
    if (this.checkString("MAC ")) return {
      ext: "ape",
      mime: "audio/ape"
    };
    if (this.check([26, 69, 223, 163])) {
      async function R() {
        let r = await T.peekNumber(QKR),
          h = 128,
          i = 0;
        while ((r & h) === 0 && h !== 0) ++i, h >>= 1;
        let c = new Uint8Array(i + 1);
        return await T.readBuffer(c), c;
      }
      async function a() {
        let r = await R(),
          h = await R();
        h[0] ^= 128 >> h.length - 1;
        let i = Math.min(6, h.length),
          c = new DataView(r.buffer),
          s = new DataView(h.buffer, h.length - i, i);
        return {
          id: YuT(c),
          len: YuT(s)
        };
      }
      async function e(r) {
        while (r > 0) {
          let h = await a();
          if (h.id === 17026) return (await T.readToken(new bs(h.len))).replaceAll(/\00.*$/g, "");
          await T.ignore(h.len), --r;
        }
      }
      let t = await a();
      switch (await e(t.len)) {
        case "webm":
          return {
            ext: "webm",
            mime: "video/webm"
          };
        case "matroska":
          return {
            ext: "mkv",
            mime: "video/matroska"
          };
        default:
          return;
      }
    }
    if (this.checkString("SQLi")) return {
      ext: "sqlite",
      mime: "application/x-sqlite3"
    };
    if (this.check([78, 69, 83, 26])) return {
      ext: "nes",
      mime: "application/x-nintendo-nes-rom"
    };
    if (this.checkString("Cr24")) return {
      ext: "crx",
      mime: "application/x-google-chrome-extension"
    };
    if (this.checkString("MSCF") || this.checkString("ISc(")) return {
      ext: "cab",
      mime: "application/vnd.ms-cab-compressed"
    };
    if (this.check([237, 171, 238, 219])) return {
      ext: "rpm",
      mime: "application/x-rpm"
    };
    if (this.check([197, 208, 211, 198])) return {
      ext: "eps",
      mime: "application/eps"
    };
    if (this.check([40, 181, 47, 253])) return {
      ext: "zst",
      mime: "application/zstd"
    };
    if (this.check([127, 69, 76, 70])) return {
      ext: "elf",
      mime: "application/x-elf"
    };
    if (this.check([33, 66, 68, 78])) return {
      ext: "pst",
      mime: "application/vnd.ms-outlook"
    };
    if (this.checkString("PAR1") || this.checkString("PARE")) return {
      ext: "parquet",
      mime: "application/vnd.apache.parquet"
    };
    if (this.checkString("ttcf")) return {
      ext: "ttc",
      mime: "font/collection"
    };
    if (this.check([207, 250, 237, 254])) return {
      ext: "macho",
      mime: "application/x-mach-binary"
    };
    if (this.check([4, 34, 77, 24])) return {
      ext: "lz4",
      mime: "application/x-lz4"
    };
    if (this.checkString("regf")) return {
      ext: "dat",
      mime: "application/x-ft-windows-registry-hive"
    };
    if (this.check([79, 84, 84, 79, 0])) return {
      ext: "otf",
      mime: "font/otf"
    };
    if (this.checkString("#!AMR")) return {
      ext: "amr",
      mime: "audio/amr"
    };
    if (this.checkString("{\\rtf")) return {
      ext: "rtf",
      mime: "application/rtf"
    };
    if (this.check([70, 76, 86, 1])) return {
      ext: "flv",
      mime: "video/x-flv"
    };
    if (this.checkString("IMPM")) return {
      ext: "it",
      mime: "audio/x-it"
    };
    if (this.checkString("-lh0-", {
      offset: 2
    }) || this.checkString("-lh1-", {
      offset: 2
    }) || this.checkString("-lh2-", {
      offset: 2
    }) || this.checkString("-lh3-", {
      offset: 2
    }) || this.checkString("-lh4-", {
      offset: 2
    }) || this.checkString("-lh5-", {
      offset: 2
    }) || this.checkString("-lh6-", {
      offset: 2
    }) || this.checkString("-lh7-", {
      offset: 2
    }) || this.checkString("-lzs-", {
      offset: 2
    }) || this.checkString("-lz4-", {
      offset: 2
    }) || this.checkString("-lz5-", {
      offset: 2
    }) || this.checkString("-lhd-", {
      offset: 2
    })) return {
      ext: "lzh",
      mime: "application/x-lzh-compressed"
    };
    if (this.check([0, 0, 1, 186])) {
      if (this.check([33], {
        offset: 4,
        mask: [241]
      })) return {
        ext: "mpg",
        mime: "video/MP1S"
      };
      if (this.check([68], {
        offset: 4,
        mask: [196]
      })) return {
        ext: "mpg",
        mime: "video/MP2P"
      };
    }
    if (this.checkString("ITSF")) return {
      ext: "chm",
      mime: "application/vnd.ms-htmlhelp"
    };
    if (this.check([202, 254, 186, 190])) return {
      ext: "class",
      mime: "application/java-vm"
    };
    if (this.checkString(".RMF")) return {
      ext: "rm",
      mime: "application/vnd.rn-realmedia"
    };
    if (this.checkString("DRACO")) return {
      ext: "drc",
      mime: "application/vnd.google.draco"
    };
    if (this.check([253, 55, 122, 88, 90, 0])) return {
      ext: "xz",
      mime: "application/x-xz"
    };
    if (this.checkString("<?xml ")) return {
      ext: "xml",
      mime: "application/xml"
    };
    if (this.check([55, 122, 188, 175, 39, 28])) return {
      ext: "7z",
      mime: "application/x-7z-compressed"
    };
    if (this.check([82, 97, 114, 33, 26, 7]) && (this.buffer[6] === 0 || this.buffer[6] === 1)) return {
      ext: "rar",
      mime: "application/x-rar-compressed"
    };
    if (this.checkString("solid ")) return {
      ext: "stl",
      mime: "model/stl"
    };
    if (this.checkString("AC")) {
      let R = new bs(4, "latin1").get(this.buffer, 2);
      if (R.match("^d*") && R >= 1000 && R <= 1050) return {
        ext: "dwg",
        mime: "image/vnd.dwg"
      };
    }
    if (this.checkString("070707")) return {
      ext: "cpio",
      mime: "application/x-cpio"
    };
    if (this.checkString("BLENDER")) return {
      ext: "blend",
      mime: "application/x-blender"
    };
    if (this.checkString("!<arch>")) {
      if (await T.ignore(8), (await T.readToken(new bs(13, "ascii"))) === "debian-binary") return {
        ext: "deb",
        mime: "application/x-deb"
      };
      return {
        ext: "ar",
        mime: "application/x-unix-archive"
      };
    }
    if (this.checkString("WEBVTT") && [`
`, "\r", "\t", " ", "\x00"].some(R => this.checkString(R, {
      offset: 6
    }))) return {
      ext: "vtt",
      mime: "text/vtt"
    };
    if (this.check([137, 80, 78, 71, 13, 10, 26, 10])) {
      await T.ignore(8);
      async function R() {
        return {
          length: await T.readToken(JKR),
          type: await T.readToken(new bs(4, "latin1"))
        };
      }
      do {
        let a = await R();
        if (a.length < 0) return;
        switch (a.type) {
          case "IDAT":
            return {
              ext: "png",
              mime: "image/png"
            };
          case "acTL":
            return {
              ext: "apng",
              mime: "image/apng"
            };
          default:
            await T.ignore(a.length + 4);
        }
      } while (T.position + 8 < T.fileInfo.size);
      return {
        ext: "png",
        mime: "image/png"
      };
    }
    if (this.check([65, 82, 82, 79, 87, 49, 0, 0])) return {
      ext: "arrow",
      mime: "application/vnd.apache.arrow.file"
    };
    if (this.check([103, 108, 84, 70, 2, 0, 0, 0])) return {
      ext: "glb",
      mime: "model/gltf-binary"
    };
    if (this.check([102, 114, 101, 101], {
      offset: 4
    }) || this.check([109, 100, 97, 116], {
      offset: 4
    }) || this.check([109, 111, 111, 118], {
      offset: 4
    }) || this.check([119, 105, 100, 101], {
      offset: 4
    })) return {
      ext: "mov",
      mime: "video/quicktime"
    };
    if (this.check([73, 73, 82, 79, 8, 0, 0, 0, 24])) return {
      ext: "orf",
      mime: "image/x-olympus-orf"
    };
    if (this.checkString("gimp xcf ")) return {
      ext: "xcf",
      mime: "image/x-xcf"
    };
    if (this.checkString("ftyp", {
      offset: 4
    }) && (this.buffer[8] & 96) !== 0) {
      let R = new bs(4, "latin1").get(this.buffer, 8).replace("\x00", " ").trim();
      switch (R) {
        case "avif":
        case "avis":
          return {
            ext: "avif",
            mime: "image/avif"
          };
        case "mif1":
          return {
            ext: "heic",
            mime: "image/heif"
          };
        case "msf1":
          return {
            ext: "heic",
            mime: "image/heif-sequence"
          };
        case "heic":
        case "heix":
          return {
            ext: "heic",
            mime: "image/heic"
          };
        case "hevc":
        case "hevx":
          return {
            ext: "heic",
            mime: "image/heic-sequence"
          };
        case "qt":
          return {
            ext: "mov",
            mime: "video/quicktime"
          };
        case "M4V":
        case "M4VH":
        case "M4VP":
          return {
            ext: "m4v",
            mime: "video/x-m4v"
          };
        case "M4P":
          return {
            ext: "m4p",
            mime: "video/mp4"
          };
        case "M4B":
          return {
            ext: "m4b",
            mime: "audio/mp4"
          };
        case "M4A":
          return {
            ext: "m4a",
            mime: "audio/x-m4a"
          };
        case "F4V":
          return {
            ext: "f4v",
            mime: "video/mp4"
          };
        case "F4P":
          return {
            ext: "f4p",
            mime: "video/mp4"
          };
        case "F4A":
          return {
            ext: "f4a",
            mime: "audio/mp4"
          };
        case "F4B":
          return {
            ext: "f4b",
            mime: "audio/mp4"
          };
        case "crx":
          return {
            ext: "cr3",
            mime: "image/x-canon-cr3"
          };
        default:
          if (R.startsWith("3g")) {
            if (R.startsWith("3g2")) return {
              ext: "3g2",
              mime: "video/3gpp2"
            };
            return {
              ext: "3gp",
              mime: "video/3gpp"
            };
          }
          return {
            ext: "mp4",
            mime: "video/mp4"
          };
      }
    }
    if (this.checkString(`REGEDIT4\r
`)) return {
      ext: "reg",
      mime: "application/x-ms-regedit"
    };
    if (this.check([82, 73, 70, 70])) {
      if (this.checkString("WEBP", {
        offset: 8
      })) return {
        ext: "webp",
        mime: "image/webp"
      };
      if (this.check([65, 86, 73], {
        offset: 8
      })) return {
        ext: "avi",
        mime: "video/vnd.avi"
      };
      if (this.check([87, 65, 86, 69], {
        offset: 8
      })) return {
        ext: "wav",
        mime: "audio/wav"
      };
      if (this.check([81, 76, 67, 77], {
        offset: 8
      })) return {
        ext: "qcp",
        mime: "audio/qcelp"
      };
    }
    if (this.check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216])) return {
      ext: "rw2",
      mime: "image/x-panasonic-rw2"
    };
    if (this.check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
      async function R() {
        let a = new Uint8Array(16);
        return await T.readBuffer(a), {
          id: a,
          size: Number(await T.readToken(TVR))
        };
      }
      await T.ignore(30);
      while (T.position + 24 < T.fileInfo.size) {
        let a = await R(),
          e = a.size - 24;
        if (Zc(a.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
          let t = new Uint8Array(16);
          if (e -= await T.readBuffer(t), Zc(t, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) return {
            ext: "asf",
            mime: "audio/x-ms-asf"
          };
          if (Zc(t, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) return {
            ext: "asf",
            mime: "video/x-ms-asf"
          };
          break;
        }
        await T.ignore(e);
      }
      return {
        ext: "asf",
        mime: "application/vnd.ms-asf"
      };
    }
    if (this.check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10])) return {
      ext: "ktx",
      mime: "image/ktx"
    };
    if ((this.check([126, 16, 4]) || this.check([126, 24, 4])) && this.check([48, 77, 73, 69], {
      offset: 4
    })) return {
      ext: "mie",
      mime: "application/x-mie"
    };
    if (this.check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], {
      offset: 2
    })) return {
      ext: "shp",
      mime: "application/x-esri-shape"
    };
    if (this.check([255, 79, 255, 81])) return {
      ext: "j2c",
      mime: "image/j2c"
    };
    if (this.check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10])) switch (await T.ignore(20), await T.readToken(new bs(4, "ascii"))) {
      case "jp2 ":
        return {
          ext: "jp2",
          mime: "image/jp2"
        };
      case "jpx ":
        return {
          ext: "jpx",
          mime: "image/jpx"
        };
      case "jpm ":
        return {
          ext: "jpm",
          mime: "image/jpm"
        };
      case "mjp2":
        return {
          ext: "mj2",
          mime: "image/mj2"
        };
      default:
        return;
    }
    if (this.check([255, 10]) || this.check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10])) return {
      ext: "jxl",
      mime: "image/jxl"
    };
    if (this.check([254, 255])) {
      if (this.checkString("<?xml ", {
        offset: 2,
        encoding: "utf-16be"
      })) return {
        ext: "xml",
        mime: "application/xml"
      };
      return;
    }
    if (this.check([208, 207, 17, 224, 161, 177, 26, 225])) return {
      ext: "cfb",
      mime: "application/x-cfb"
    };
    if (await T.peekBuffer(this.buffer, {
      length: Math.min(256, T.fileInfo.size),
      mayBeLess: !0
    }), this.check([97, 99, 115, 112], {
      offset: 36
    })) return {
      ext: "icc",
      mime: "application/vnd.iccprofile"
    };
    if (this.checkString("**ACE", {
      offset: 7
    }) && this.checkString("**", {
      offset: 12
    })) return {
      ext: "ace",
      mime: "application/x-ace-compressed"
    };
    if (this.checkString("BEGIN:")) {
      if (this.checkString("VCARD", {
        offset: 6
      })) return {
        ext: "vcf",
        mime: "text/vcard"
      };
      if (this.checkString("VCALENDAR", {
        offset: 6
      })) return {
        ext: "ics",
        mime: "text/calendar"
      };
    }
    if (this.checkString("FUJIFILMCCD-RAW")) return {
      ext: "raf",
      mime: "image/x-fujifilm-raf"
    };
    if (this.checkString("Extended Module:")) return {
      ext: "xm",
      mime: "audio/x-xm"
    };
    if (this.checkString("Creative Voice File")) return {
      ext: "voc",
      mime: "audio/x-voc"
    };
    if (this.check([4, 0, 0, 0]) && this.buffer.length >= 16) {
      let R = new DataView(this.buffer.buffer).getUint32(12, !0);
      if (R > 12 && this.buffer.length >= R + 16) try {
        let a = new TextDecoder().decode(this.buffer.subarray(16, R + 16));
        if (JSON.parse(a).files) return {
          ext: "asar",
          mime: "application/x-asar"
        };
      } catch {}
    }
    if (this.check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2])) return {
      ext: "mxf",
      mime: "application/mxf"
    };
    if (this.checkString("SCRM", {
      offset: 44
    })) return {
      ext: "s3m",
      mime: "audio/x-s3m"
    };
    if (this.check([71]) && this.check([71], {
      offset: 188
    })) return {
      ext: "mts",
      mime: "video/mp2t"
    };
    if (this.check([71], {
      offset: 4
    }) && this.check([71], {
      offset: 196
    })) return {
      ext: "mts",
      mime: "video/mp2t"
    };
    if (this.check([66, 79, 79, 75, 77, 79, 66, 73], {
      offset: 60
    })) return {
      ext: "mobi",
      mime: "application/x-mobipocket-ebook"
    };
    if (this.check([68, 73, 67, 77], {
      offset: 128
    })) return {
      ext: "dcm",
      mime: "application/dicom"
    };
    if (this.check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70])) return {
      ext: "lnk",
      mime: "application/x.ms.shortcut"
    };
    if (this.check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0])) return {
      ext: "alias",
      mime: "application/x.apple.alias"
    };
    if (this.checkString("Kaydara FBX Binary  \x00")) return {
      ext: "fbx",
      mime: "application/x.autodesk.fbx"
    };
    if (this.check([76, 80], {
      offset: 34
    }) && (this.check([0, 0, 1], {
      offset: 8
    }) || this.check([1, 0, 2], {
      offset: 8
    }) || this.check([2, 0, 2], {
      offset: 8
    }))) return {
      ext: "eot",
      mime: "application/vnd.ms-fontobject"
    };
    if (this.check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29])) return {
      ext: "indd",
      mime: "application/x-indesign"
    };
    if (await T.peekBuffer(this.buffer, {
      length: Math.min(512, T.fileInfo.size),
      mayBeLess: !0
    }), this.checkString("ustar", {
      offset: 257
    }) && (this.checkString("\x00", {
      offset: 262
    }) || this.checkString(" ", {
      offset: 262
    })) || this.check([0, 0, 0, 0, 0, 0], {
      offset: 257
    }) && sVR(this.buffer)) return {
      ext: "tar",
      mime: "application/x-tar"
    };
    if (this.check([255, 254])) {
      if (this.checkString("<?xml ", {
        offset: 2,
        encoding: "utf-16le"
      })) return {
        ext: "xml",
        mime: "application/xml"
      };
      if (this.check([255, 14], {
        offset: 2
      }) && this.checkString("SketchUp Model", {
        offset: 4,
        encoding: "utf-16le"
      })) return {
        ext: "skp",
        mime: "application/vnd.sketchup.skp"
      };
      if (this.checkString(`Windows Registry Editor Version 5.00\r
`, {
        offset: 2,
        encoding: "utf-16le"
      })) return {
        ext: "reg",
        mime: "application/x-ms-regedit"
      };
      return;
    }
    if (this.checkString("-----BEGIN PGP MESSAGE-----")) return {
      ext: "pgp",
      mime: "application/pgp-encrypted"
    };
  };
  detectImprecise = async T => {
    if (this.buffer = new Uint8Array(lM), await T.peekBuffer(this.buffer, {
      length: Math.min(8, T.fileInfo.size),
      mayBeLess: !0
    }), this.check([0, 0, 1, 186]) || this.check([0, 0, 1, 179])) return {
      ext: "mpg",
      mime: "video/mpeg"
    };
    if (this.check([0, 1, 0, 0, 0])) return {
      ext: "ttf",
      mime: "font/ttf"
    };
    if (this.check([0, 0, 1, 0])) return {
      ext: "ico",
      mime: "image/x-icon"
    };
    if (this.check([0, 0, 2, 0])) return {
      ext: "cur",
      mime: "image/x-icon"
    };
    if (await T.peekBuffer(this.buffer, {
      length: Math.min(2 + this.options.mpegOffsetTolerance, T.fileInfo.size),
      mayBeLess: !0
    }), this.buffer.length >= 2 + this.options.mpegOffsetTolerance) for (let R = 0; R <= this.options.mpegOffsetTolerance; ++R) {
      let a = this.scanMpeg(R);
      if (a) return a;
    }
  };
  async readTiffTag(T) {
    let R = await this.tokenizer.readToken(T ? zI : Pa);
    switch (this.tokenizer.ignore(10), R) {
      case 50341:
        return {
          ext: "arw",
          mime: "image/x-sony-arw"
        };
      case 50706:
        return {
          ext: "dng",
          mime: "image/x-adobe-dng"
        };
      default:
    }
  }
  async readTiffIFD(T) {
    let R = await this.tokenizer.readToken(T ? zI : Pa);
    for (let a = 0; a < R; ++a) {
      let e = await this.readTiffTag(T);
      if (e) return e;
    }
  }
  async readTiffHeader(T) {
    let R = (T ? zI : Pa).get(this.buffer, 2),
      a = (T ? ZKR : Ie).get(this.buffer, 4);
    if (R === 42) {
      if (a >= 6) {
        if (this.checkString("CR", {
          offset: 8
        })) return {
          ext: "cr2",
          mime: "image/x-canon-cr2"
        };
        if (a >= 8) {
          let e = (T ? zI : Pa).get(this.buffer, 8),
            t = (T ? zI : Pa).get(this.buffer, 10);
          if (e === 28 && t === 254 || e === 31 && t === 11) return {
            ext: "nef",
            mime: "image/x-nikon-nef"
          };
        }
      }
      return await this.tokenizer.ignore(a), (await this.readTiffIFD(T)) ?? {
        ext: "tif",
        mime: "image/tiff"
      };
    }
    if (R === 43) return {
      ext: "tif",
      mime: "image/tiff"
    };
  }
  scanMpeg(T) {
    if (this.check([255, 224], {
      offset: T,
      mask: [255, 224]
    })) {
      if (this.check([16], {
        offset: T + 1,
        mask: [22]
      })) {
        if (this.check([8], {
          offset: T + 1,
          mask: [8]
        })) return {
          ext: "aac",
          mime: "audio/aac"
        };
        return {
          ext: "aac",
          mime: "audio/aac"
        };
      }
      if (this.check([2], {
        offset: T + 1,
        mask: [6]
      })) return {
        ext: "mp3",
        mime: "audio/mpeg"
      };
      if (this.check([4], {
        offset: T + 1,
        mask: [6]
      })) return {
        ext: "mp2",
        mime: "audio/mpeg"
      };
      if (this.check([6], {
        offset: T + 1,
        mask: [6]
      })) return {
        ext: "mp1",
        mime: "audio/mpeg"
      };
    }
  }
}
async function QuT(T, R) {
  return new rFT(R).fromFile(T, R);
}
function _VR(T) {
  let R = [],
    a = T.threadEnvironment.platform;
  if (a?.os) {
    let t = a.osVersion ? `${a.os} (${a.osVersion})` : a.os;
    R.push(`Operating system: ${t}`);
  }
  if (T.dir) R.push(`Working directory: ${T.dir.fsPath}`);
  let e = T.threadEnvironment.trees?.[0];
  if (e?.repository?.url) R.push(`Repository: ${e.repository.url}`);
  if (R.length === 0) return "";
  return `
# Environment

${R.join(`
`)}
`;
}
function bVR(T) {
  let R = dKR(T).toLowerCase().slice(1);
  if (!R) return "text";
  if (R === "csv") return "csv";
  if (R === "tsv") return "tsv";
  return R;
}
function ZuT(T, R, a) {
  let e = R.length > 1e5 ? R.slice(0, 1e5) + `

[Truncated]` : R,
    t = bVR(T);
  return `${a}: ${T}
\`\`\`${t}
${e}
\`\`\``;
}
function JuT(T) {
  return T.startsWith("image/") || uVR.has(T) || yVR.has(T) || T === "application/pdf";
}
function TyT(T) {
  return T = T.replace(/^(\s*)style\s+\S+/gim, "$1%% removed style"), T = T.replace(/^(\s*)classDef\s+/gim, "$1%% removed classDef "), T = T.replaceAll("<br/>", " "), T;
}
function vVR(T, R) {
  switch (T.type) {
    case "response.output_text.delta":
      R.onTextDelta(T.delta);
      break;
    case "response.reasoning_summary_text.delta":
      R.onReasoningDelta(T.delta);
      break;
    case "response.reasoning_summary_text.done":
      R.onReasoningDelta(`

`);
      break;
    case "response.output_item.added":
      if (T.item.type === "function_call") R.onToolCallAdded(T.output_index, {
        id: T.item.call_id,
        name: T.item.name,
        arguments: T.item.arguments
      });
      break;
    case "response.function_call_arguments.delta":
      R.onToolCallArgumentsDelta(T.output_index, T.delta);
      break;
    case "response.completed":
      if (T.response.usage) R.onUsage(T.response.usage);
      break;
  }
}
function jVR(T, R) {
  if (R) return {
    model: T.name,
    maxInputTokens: T.contextWindow - T.maxOutputTokens,
    inputTokens: R.input_tokens,
    outputTokens: R.output_tokens,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: R.input_tokens_details?.cached_tokens ?? null,
    totalInputTokens: R.input_tokens
  };
  return {
    model: T.name,
    maxInputTokens: T.contextWindow - T.maxOutputTokens,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: null,
    totalInputTokens: 0
  };
}
function SVR(T) {
  if (T.status === "error") {
    let R = T.error;
    return `Error: ${R?.message || JSON.stringify(R) || "Unknown error"}`;
  }
  if (T.status === "done") {
    if (typeof T.result === "string") return T.result;
    if (typeof T.result === "object" && T.result?.content) return T.result.content;
    let R = JSON.stringify(T.result);
    return R === void 0 ? "" : R;
  }
  return `Tool execution status: ${T.status}`;
}
function OVR(T, R) {
  let a = R?.imageBlocks?.flatMap(e => {
    if (e.source.type === "base64") {
      let t = XA({
        source: {
          type: "base64",
          data: e.source.data ?? ""
        }
      });
      if (t) return [{
        type: "input_text",
        text: `Image omitted: ${t}`
      }];
    }
    return [{
      type: "input_image",
      detail: "auto",
      image_url: e.source.type === "base64" ? `data:${e.source.mediaType};base64,${e.source.data}` : e.source.url
    }];
  }) ?? [];
  return {
    input: [{
      type: "message",
      role: "user",
      content: [{
        type: "input_text",
        text: T
      }, ...a]
    }],
    reasoningEffort: R?.reasoningEffort ?? "medium"
  };
}
function dVR(T) {
  return T["internal.oracleReasoningEffort"] ?? "high";
}
function EVR(T, R) {
  let a = T.task;
  if (T.context) a = `Context: ${T.context}

Task: ${T.task}`;
  if (R) a += `

Relevant files:

${R}`;
  if (T.parentThreadID) a += `

Parent thread: ${T.parentThreadID}
You can use the read_thread tool with this ID to read the full conversation that invoked you if you need more context.`;
  return a;
}
function hFT(T, R) {
  return `You are the Oracle - an expert AI advisor with advanced reasoning capabilities.

Your role is to provide high-quality technical guidance, code reviews, architectural advice, and strategic planning for software engineering tasks.

You are a subagent inside an AI coding system, called when the main agent needs a smarter, more capable model. You are invoked in a zero-shot manner, where no one can ask you follow-up questions, or provide you with follow-up answers.

Key responsibilities:
- Analyze code and architecture patterns
- Provide specific, actionable technical recommendations
- Plan implementations and refactoring strategies
- Answer deep technical questions with clear reasoning
- Suggest best practices and improvements
- Identify potential issues and propose solutions

## Environment
Working directory: ${T ?? "unknown"}
Workspace root: ${R ?? "unknown"}

Operating principles (simplicity-first):
- Default to the simplest viable solution that meets the stated requirements and constraints.
- Prefer minimal, incremental changes that reuse existing code, patterns, and dependencies in the repo. Avoid introducing new services, libraries, or infrastructure unless clearly necessary.
- Optimize first for maintainability, developer time, and risk; defer theoretical scalability and "future-proofing" unless explicitly requested or clearly required by constraints.
- Apply YAGNI and KISS; avoid premature optimization.
- Provide one primary recommendation. Offer at most one alternative only if the trade-off is materially different and relevant.
- Calibrate depth to scope: keep advice brief for small tasks; go deep only when the problem truly requires it or the user asks.
- Include a rough effort/scope signal (e.g., S <1h, M 1\u20133h, L 1\u20132d, XL >2d) when proposing changes.
- Stop when the solution is "good enough." Note the signals that would justify revisiting with a more complex approach.

Tool usage:
- Use attached files and provided context first. Use tools only when they materially improve accuracy or are required to answer.
- Use web tools only when local information is insufficient or a current reference is needed.
- When calling local file tools, construct paths from the exact working directory or workspace root above.
- Never invent placeholder roots like /workspace, /repo, or /project.
- If you only know a repo-relative path, join it to the workspace root above before calling local file tools.
- If the working directory or workspace root is unknown, use file-search tools first instead of guessing absolute paths.

Response format (keep it concise and action-oriented):
1) TL;DR: 1\u20133 sentences with the recommended simple approach.
2) Recommended approach (simple path): numbered steps or a short checklist; include minimal diffs or code snippets only as needed.
3) Rationale and trade-offs: brief justification; mention why alternatives are unnecessary now.
4) Risks and guardrails: key caveats and how to mitigate them.
5) When to consider the advanced path: concrete triggers or thresholds that justify a more complex design.
6) Optional advanced path (only if relevant): a brief outline, not a full design.

Guidelines:
- Use your reasoning to provide thoughtful, well-structured, and pragmatic advice.
- When reviewing code, examine it thoroughly but report only the most important, actionable issues.
- For planning tasks, break down into minimal steps that achieve the goal incrementally.
- Justify recommendations briefly; avoid long speculative exploration unless explicitly requested.
- Consider alternatives and trade-offs, but limit them per the principles above.
- Be thorough but concise\u2014focus on the highest-leverage insights.

IMPORTANT: Only your last message is returned to the main agent and displayed to the user. Your last message should be comprehensive yet focused, with a clear, simple recommendation that helps the user act immediately.`;
}
function CVR(T, R) {
  switch (T.status) {
    case "in-progress":
      return {
        status: "in-progress",
        progress: T.turns.map(a => ({
          message: a.message,
          reasoning: a.reasoning,
          isThinking: a.isThinking,
          tool_uses: [...a.activeTools.values()]
        }))
      };
    case "done":
      return {
        status: "done",
        result: T.message,
        progress: T.turns.map(a => ({
          message: a.message,
          reasoning: a.reasoning,
          isThinking: !1,
          tool_uses: [...a.activeTools.values()]
        })),
        "~debug": {
          ...T["~debug"],
          reasoningEffort: R
        }
      };
    case "error":
      return {
        status: "error",
        error: {
          message: T.message
        }
      };
    case "cancelled":
      return {
        status: "cancelled"
      };
  }
}
async function HVR(T, R, a, e, t, r, h) {
  let i = performance.now(),
    c = [{
      role: "user",
      parts: [{
        text: Sa`
						Here is the mentioned thread content:

						<mentionedThread>
						${T}
						</mentionedThread>
					`
      }]
    }, {
      role: "user",
      parts: [{
        text: UVR.replace("{GOAL}", R)
      }]
    }],
    s = await gO(nU, c, [], e, t, r, {
      responseMimeType: "application/json",
      responseJsonSchema: K.toJSONSchema(RyT)
    }, void 0, h),
    A = RyT.parse(WVR(s.message.text ?? "")),
    l = performance.now() - i;
  return J.debug("Thread mention extraction completed", {
    currentThreadId: e.id,
    mentionedThreadId: a,
    originalLength: T.length,
    extractedLength: A.relevantContent.length,
    compressionRatio: (A.relevantContent.length / T.length).toFixed(2),
    durationMs: Math.round(l)
  }), A.relevantContent;
}
function WVR(T) {
  try {
    return JSON.parse(T);
  } catch (R) {
    let a = T.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (a) try {
      return JSON.parse(a[1] ?? "");
    } catch (r) {}
    let e = T.indexOf("{"),
      t = T.lastIndexOf("}");
    if (e !== -1 && t !== -1 && t > e) {
      let r = T.substring(e, t + 1);
      try {
        return JSON.parse(r);
      } catch (h) {}
    }
    throw J.error("Failed to parse JSON from thread extraction result", {
      error: R,
      text: T
    }), R;
  }
}
async function qVR({
  markdown: T,
  goal: R,
  mentionedThreadID: a,
  currentThread: e,
  config: t,
  signal: r,
  activatedSkills: h,
  serviceAuthToken: i
}) {
  return await HVR(T, R, a, e, t, r, i);
}
async function KVR(T, R, a) {
  try {
    let e = await fi(`/api/threads/${T}.md?truncate_tool_results=1`, {
      signal: R
    }, a);
    if (!e.ok) throw Error(`Thread ${T} not found (server returned ${e.status})`);
    return await e.text();
  } catch (e) {
    if (e instanceof Error && e.name === "MissingApiKeyError") throw Error(`Thread ${T} not found locally and cannot fetch from server: API key not configured`);
    throw e;
  }
}
async function VVR(T, R, a) {
  let e = Date.now();
  try {
    let t = await a.exclusiveSyncReadWriter(T);
    t.update(h => {
      if (h.v++, h.relationships ??= [], !h.relationships.some(i => i.threadID === R && i.type === "mention" && i.role === "child")) h.relationships.push({
        threadID: R,
        type: "mention",
        role: "child",
        createdAt: e
      });
    }), await t.asyncDispose();
    let r = await a.exclusiveSyncReadWriter(R);
    r.update(h => {
      if (h.v++, h.relationships ??= [], !h.relationships.some(i => i.threadID === T && i.type === "mention" && i.role === "parent")) h.relationships.push({
        threadID: T,
        type: "mention",
        role: "parent",
        createdAt: e
      });
    }), await r.asyncDispose();
  } catch (t) {
    J.warn("Failed to create mention relationship", {
      currentThreadID: T,
      mentionedThreadID: R,
      error: t
    });
  }
}
function YVR(T) {
  return T.length > ayT ? T.slice(0, ayT) + `

[Content truncated at 256KB for context window]` : T;
}
function RXR(T) {
  return {
    runInference: async (R, a, e, t, r, h, i) => {
      let c = await eLR(e, t, a, r, Xt(R), h, i, void 0, void 0, T),
        s = c.message,
        A = [],
        l = s.choices[0];
      if (l?.message?.tool_calls) {
        for (let n of l.message.tool_calls) if (n.id) {
          let p = n;
          A.push({
            id: n.id,
            name: p.function?.name ?? "",
            input: p.function?.arguments ? JSON.parse(p.function.arguments) : void 0
          });
        }
      }
      let o;
      if (s.usage) {
        let n = s.usage,
          p = n.prompt_tokens_details?.cached_tokens ?? n.cached_tokens ?? 0;
        o = {
          model: Xt(R),
          maxInputTokens: 0,
          inputTokens: 0,
          outputTokens: n.completion_tokens,
          cacheReadInputTokens: p,
          cacheCreationInputTokens: n.prompt_tokens - p,
          totalInputTokens: n.prompt_tokens,
          timestamp: new Date().toISOString()
        };
      }
      return {
        result: c,
        toolUses: A,
        debugUsage: o
      };
    },
    extractMessage: R => {
      return R.message.choices[0]?.message?.content || void 0;
    },
    updateConversation: (R, a, e) => {
      let t = a.message.choices[0];
      if (t?.message) {
        let r = t.message,
          h = {
            role: "assistant",
            content: r.content || "",
            reasoning_content: r.reasoning_content?.length ? r.reasoning_content : void 0,
            tool_calls: r.tool_calls
          };
        R.push(h);
      }
      for (let {
        id: r,
        result: h
      } of e) {
        let i = {
          role: "tool",
          content: aXR(h),
          tool_call_id: r
        };
        R.push(i);
      }
    }
  };
}
function aXR(T) {
  if (T.status === "error") {
    let R = T.error;
    return JSON.stringify(R);
  }
  if (T.status === "done") {
    if (typeof T.result === "string") return T.result;
    let R = JSON.stringify(T.result);
    return R === void 0 ? "" : R;
  }
  return `Tool execution status: ${T.status}`;
}
function eXR(T, R, a, e) {
  let t = [{
    role: "user",
    content: T
  }];
  return new wi().run(Fx, {
    systemPrompt: a,
    model: R,
    spec: qe["task-subagent"]
  }, {
    toolService: e.toolService,
    env: e,
    conversation: t
  });
}
function tXR(T, R, a, e) {
  let t = [{
    role: "user",
    content: T
  }];
  return new wi().run(RXR(), {
    systemPrompt: a,
    model: R,
    spec: qe["task-subagent"]
  }, {
    toolService: e.toolService,
    env: e,
    conversation: t
  });
}
function rXR(T) {
  let {
    model: R,
    agentMode: a
  } = pn(T.config.settings, T.thread);
  if (a === "deep") return {
    model: n8.CLAUDE_OPUS_4_6.name,
    provider: P9.ANTHROPIC
  };
  let {
    provider: e
  } = RO(R);
  return {
    model: R,
    provider: e
  };
}
function hXR(T, R, a) {
  let {
    model: e,
    provider: t
  } = rXR(a);
  return J.debug("Task subagent starting:", {
    model: e,
    provider: t,
    description: R.substring(0, 100) + (R.length > 100 ? "..." : "")
  }), Q9(() => nXR(a)).pipe(L9(r => {
    if (t === P9.FIREWORKS) return tXR(T, e, r, a);
    return eXR(T, e, r, a);
  }), JR(iXR));
}
function iXR(T) {
  switch (T.status) {
    case "in-progress":
      return {
        status: "in-progress",
        progress: T.turns.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        }))
      };
    case "done":
      return {
        status: "done",
        result: T.message,
        progress: T.turns.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        })),
        "~debug": T["~debug"]
      };
    case "error":
      return {
        status: "error",
        error: {
          message: T.message
        },
        progress: T.turns?.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        })),
        "~debug": T["~debug"]
      };
    case "cancelled":
      return {
        status: "cancelled",
        progress: T.turns.map(R => ({
          message: R.message,
          tool_uses: [...R.activeTools.values()]
        })),
        reason: oXR(T.turns),
        "~debug": T["~debug"]
      };
  }
}
function tyT(T, R) {
  let a = T.split(`
`);
  if (a.length <= R) return T;
  return a.slice(0, R).join(`
`) + `
... (${a.length - R} more lines)`;
}
function ryT(T, R) {
  let {
      input: a,
      result: e
    } = T,
    t = [];
  if (!a || typeof a !== "object") t.push(T.tool_name);else switch (T.tool_name) {
    case "edit_file":
    case "create_file":
      if (a.path) t.push(`${T.tool_name}(${a.path})`);else t.push(T.tool_name);
      break;
    case "Read":
      if (a.path) t.push(`Read(${a.path})`);else t.push("Read");
      break;
    case "Grep":
      if (a.pattern) {
        let r = a.path ? ` in ${a.path}` : "";
        t.push(`Grep("${a.pattern}"${r})`);
      } else t.push("Grep");
      break;
    case "Bash":
      if (a.cmd) {
        let r = String(a.cmd).length > eyT ? String(a.cmd).substring(0, eyT - 3) + "..." : a.cmd;
        t.push(`Bash("${r}")`);
      } else t.push("Bash");
      break;
    case "glob":
      if (a.filePattern) t.push(`glob("${a.filePattern}")`);else t.push("glob");
      break;
    default:
      t.push(T.tool_name);
  }
  if (R && e && T.status === "done") switch (T.tool_name) {
    case "edit_file":
    case "create_file":
      {
        let r = typeof e === "string" ? e : typeof e.diff === "string" ? e.diff : null;
        if (r) t.push(`
Diff:
${tyT(r, cXR)}`);
        break;
      }
    case "Bash":
      {
        if (e.output) {
          let r = e.exitCode !== void 0 ? ` (exit ${e.exitCode})` : "";
          t.push(`${r}
Output:
${tyT(String(e.output), sXR)}`);
        }
        break;
      }
  }
  return t.join("");
}
function oXR(T) {
  if (T.length === 0) return "Task was cancelled before any work was done.";
  let R = [],
    a = [];
  for (let t of T) for (let [, r] of t.activeTools) if (r.status === "done") R.push(r);else if (r.status === "in-progress" || r.status === "queued") a.push(r);
  let e = ["Task was cancelled."];
  if (R.length > 0) {
    e.push(`

## Completed work:
`);
    for (let t of R) e.push(`
### ${ryT(t, !0)}
`);
  }
  if (a.length > 0) {
    let t = a.map(r => ryT(r, !1)).join(", ");
    e.push(`

## In progress when cancelled:
${t}`);
  }
  return e.join("");
}
async function nXR(T) {
  let {
      model: R,
      agentMode: a
    } = pn(T.config.settings, T.thread),
    e = Xt(R),
    t = R.indexOf("/"),
    r = t !== -1 ? R.slice(0, t) : "anthropic",
    {
      systemPrompt: h
    } = await LO({
      configService: T.configService,
      getThreadEnvironment: T.getThreadEnvironment,
      skillService: T.skillService,
      toolService: T.toolService,
      filesystem: T.filesystem,
      threadService: T.threadService
    }, T.thread, {
      enableTaskList: !1,
      enableTask: !1,
      enableOracle: !1,
      enableDiagnostics: !0,
      enableChart: !1
    }, {
      model: e,
      provider: r,
      agentMode: a
    });
  return h.map(i => i.text).join(`

`);
}
function mXR(T, R, a, e) {
  return new AR(t => {
    let r = new wi(),
      h = bz.model ? Xt(bz.model) : void 0;
    if (!h) {
      t.error(Error("Walkthrough subagent has no model defined"));
      return;
    }
    let i = {
        systemPrompt: xXR,
        model: h,
        spec: bz
      },
      c = [{
        role: "user",
        content: R ? `Context: ${R}

Topic: ${T}` : `Topic: ${T}`
      }],
      s = r.run(Fx, i, {
        conversation: c,
        toolService: a,
        env: e,
        followUps: [A => A.push({
          role: "user",
          content: fXR
        }), A => A.push({
          role: "user",
          content: IXR
        })]
      }).subscribe({
        next: A => t.next(A),
        error: A => t.error(A),
        complete: () => t.complete()
      });
    return () => {
      s.unsubscribe();
    };
  });
}
function yXR(T) {
  try {
    let R = i3(T, "walkthroughPlan");
    if (R) {
      let r = PXR(R);
      if (r) return {
        diagram: r
      };
    }
    let a = T.match(/```json\s*([\s\S]*?)```/i);
    if (a?.[1]) {
      let r = mz(a[1]);
      if (r) {
        let h = JSON.parse(r);
        if (h.diagram?.code && h.diagram?.nodes) return h;
      }
    }
    let e = T.match(/```\s*(\{[\s\S]*?)```/i);
    if (e?.[1]) {
      let r = mz(e[1]);
      if (r) {
        let h = JSON.parse(r);
        if (h.diagram?.code && h.diagram?.nodes) return h;
      }
    }
    let t = T.indexOf('"diagram"');
    if (t !== -1) {
      let r = t;
      while (r > 0 && T[r] !== "{") r--;
      if (T[r] === "{") {
        let h = mz(T.substring(r));
        if (h) {
          let i = JSON.parse(h);
          if (i.diagram?.code && i.diagram?.nodes) return i;
        }
      }
    }
    return null;
  } catch (R) {
    return J.error("Failed to parse walkthrough plan:", R), null;
  }
}
function PXR(T) {
  let R = i3(T, "code");
  if (!R) return null;
  let a = {},
    e = Lk(T, "node");
  for (let t of e) {
    let r = i3(t, "id"),
      h = i3(t, "title"),
      i = i3(t, "description");
    if (!r || !h || !i) continue;
    let c = {
        title: h,
        description: i
      },
      s = i3(t, "links");
    if (s) {
      let A = Lk(s, "link"),
        l = [];
      for (let o of A) {
        let n = i3(o, "label"),
          p = i3(o, "url");
        if (n && p) l.push({
          label: n,
          url: p
        });
      }
      if (l.length > 0) c.links = l;
    }
    a[r] = c;
  }
  if (Object.keys(a).length === 0) return null;
  return {
    code: R.trim(),
    nodes: a
  };
}
function mz(T) {
  let R = 0,
    a = !1,
    e = !1,
    t = -1;
  for (let r = 0; r < T.length; r++) {
    let h = T[r];
    if (e) {
      e = !1;
      continue;
    }
    if (h === "\\" && a) {
      e = !0;
      continue;
    }
    if (h === '"' && !e) {
      a = !a;
      continue;
    }
    if (a) continue;
    if (h === "{") {
      if (t === -1) t = r;
      R++;
    } else if (h === "}") {
      if (R--, R === 0 && t !== -1) return T.substring(t, r + 1);
    }
  }
  return null;
}
function cFT(T) {
  let R = $mR(T),
    a = dXR(R, T);
  return {
    toolService: R,
    dispose: () => {
      a.dispose(), R.dispose();
    }
  };
}
function dXR(T, R) {
  let a = [],
    e,
    t,
    r,
    h,
    i,
    c,
    s;
  a.push(T.registerTool(ZVR)), a.push(T.registerTool(NVR)), a.push(T.registerTool(WX)), a.push(T.registerTool(eFR)), a.push(T.registerTool(TXR)), a.push(T.registerTool(GVR)), a.push(T.registerTool(iGR)), a.push(T.registerTool(wzT)), a.push(T.registerTool(gVR)), a.push(T.registerTool(rFR)), a.push(T.registerTool(mK)), a.push(T.registerTool(F2R)), a.push(T.registerTool(bXR)), a.push(T.registerTool(OXR)), a.push(T.registerTool(pXR)), a.push(T.registerTool(DVR)), a.push(T.registerTool(DWT)), a.push(T.registerTool(IKR)), a.push(T.registerTool(kVR)), a.push(T.registerTool(TzR)), a.push(T.registerTool(nKR)), a.push(T.registerTool(_KR)), a.push(T.registerTool(YGR)), a.push(T.registerTool(JGR)), a.push(T.registerTool(rKR)), a.push(T.registerTool(cKR)), a.push(T.registerTool(aKR)), a.push(T.registerTool(EGR)), a.push(T.registerTool(gGR)), a.push(T.registerTool(SGR)), a.push(T.registerTool(xGR)), a.push(T.registerTool(MGR)), a.push(T.registerTool(bGR)), a.push(T.registerTool(nGR)), a.push(T.registerTool(OzT)), a.push(T.registerTool(I2R)), a.push(T.registerTool(kXR)), a.push(T.registerTool($XR));
  let A = R.configService.config.pipe(JR(({
    settings: l
  }) => ({
    "experimental.autoSnapshot": l["experimental.autoSnapshot"],
    "experimental.tools": l["experimental.tools"],
    "experimental.cerebrasFinder": l["experimental.cerebrasFinder"]
  })), E9((l, o) => l["experimental.autoSnapshot"] === o["experimental.autoSnapshot"] && l["experimental.cerebrasFinder"] === o["experimental.cerebrasFinder"] && JSON.stringify(l["experimental.tools"]) === JSON.stringify(o["experimental.tools"]))).subscribe(l => {
    if (e?.dispose(), e = T.registerTool(OWT), l["experimental.autoSnapshot"]) {
      if (i?.dispose(), i = void 0, !c) c = T.registerTool(J2R);
    } else if (c?.dispose(), c = void 0, !i) i = T.registerTool(tGR);
    if (t?.dispose(), l["experimental.cerebrasFinder"]) t = T.registerTool(W2R);else t = T.registerTool(qzT);
    Promise.resolve().then(() => (vBR(), TqT)).then(({
      painterToolReg: n
    }) => {
      if (!r) r = T.registerTool(n);
    });
    let o = l["experimental.tools"] ?? [];
    if (J.debug("repl tool registration check", {
      experimentalTools: o
    }), Promise.resolve().then(() => (WBR(), hqT)).then(({
      replToolReg: n
    }) => {
      let p = n.spec.name,
        _ = o.includes(p),
        m = n.fn !== null;
      if (J.debug("repl tool dynamic import resolved", {
        toolName: p,
        isEnabled: _,
        hasFn: m,
        hasExistingDisposable: !!h
      }), _) {
        if (!h) J.debug("registering repl tool", {
          toolName: p,
          hasFn: m
        }), h = T.registerTool(n), J.debug("repl tool registered", {
          toolName: p,
          disposableIsNoop: h === void 0
        });
      } else {
        if (h) J.debug("unregistering repl tool", {
          toolName: p
        });
        h?.dispose(), h = void 0;
      }
    }), !s) Promise.resolve().then(() => (FBR(), cqT)).then(({
      handoffToolReg: n
    }) => {
      s = T.registerTool(n);
    });
  });
  return {
    dispose() {
      A.unsubscribe(), e?.dispose(), t?.dispose(), r?.dispose(), s?.dispose(), c?.dispose(), i?.dispose(), h?.dispose();
      for (let l of a) l.dispose();
    }
  };
}
function LXR() {
  return EXR.trace.getTracer(CXR);
}
async function DXR(T, R) {
  let a = [AM.join(T, "secrets.json"), AM.join(T, "history.jsonl"), AM.join(R, "settings.json")];
  await Promise.all(a.map(e => wXR(e)));
}
async function wXR(T) {
  try {
    let R = await hyT.stat(T);
    if ((R.mode & 63) !== 0) await hyT.chmod(T, MXR), J.info("Fixed insecure file permissions", {
      file: AM.basename(T),
      oldMode: `0o${(R.mode & 511).toString(8)}`,
      newMode: "0o600"
    });
  } catch (R) {
    if (R.code === "ENOENT") return;
    J.warn("Failed to check/fix file permissions", {
      file: T,
      error: R instanceof Error ? R.message : String(R)
    });
  }
}
function UXR(T = "idle") {
  try {
    if (T === "idle") uz("afplay /System/Library/Sounds/Submarine.aiff");else if (T === "idle-review") uz("afplay /System/Library/Sounds/Glass.aiff");else if (T === "requires-user-input") uz("afplay /System/Library/Sounds/Ping.aiff");
  } catch (R) {
    J.error(`Failed to play notification sound (${T}):`, R);
  }
}
function HXR() {
  try {
    let T = NXR(process.cwd()) || process.cwd();
    BXR("say", [`Amp is done in ${T}`]);
  } catch (T) {
    J.error("Failed to play voice completion notification:", T);
  }
}
function qXR(T) {
  let R = 0,
    a = async i => {
      let c = Date.now();
      if (c - R < 2000) return;
      if (R = c, e === !1) return;
      let s = !1;
      try {
        s = T.windowFocused ? await T.windowFocused() : !1;
      } catch (A) {
        J.debug("Could not determine window focus state:", A);
      }
      if (s && !WXR) return;
      await T.playNotificationSound(i);
    },
    e = !0,
    t = T.configService.config.subscribe(i => {
      e = i.settings["notifications.enabled"] ?? !0;
    }),
    r = new Map(),
    h = (T.threadViewStates$?.() ?? ct.statuses).subscribe(async i => {
      let c = !1,
        s = !1;
      for (let [A, l] of Object.entries(i)) {
        if (!l || l.state !== "active") {
          r.delete(A);
          continue;
        }
        try {
          if ((await T.threadService.getPrimitiveProperty(A, "mainThreadID")) && l.interactionState !== "user-tool-approval") continue;
        } catch (y) {
          J.debug("Failed to check thread for subagent status", {
            threadId: A,
            error: y
          });
        }
        let o = l.toolState?.running ?? (l.interactionState === "tool-running" ? 1 : 0),
          n = l.toolState?.blocked ?? (l.interactionState === "user-tool-approval" ? 1 : 0),
          p = l.interactionState === "user-message-reply" || l.interactionState === "user-message-initial",
          _ = !!l.ephemeralError,
          m = l.inferenceState === "idle" && o === 0 && n === 0 && (p || _),
          b = r.get(A) ?? {
            running: 0,
            blocked: 0,
            idle: !0
          };
        if (n > 0) {
          if (b.blocked === 0 || b.running > 0 && o === 0) c = !0;
        }
        if (!b.idle && m) s = !0;
        r.set(A, {
          running: o,
          blocked: n,
          idle: m
        });
      }
      if (c) await a("requires-user-input");else if (s) await a("idle");
    });
  return {
    unsubscribe() {
      h.unsubscribe(), t.unsubscribe(), r.clear();
    }
  };
}
function GXR() {
  let T = new Map();
  for (let [R, a] of Object.entries(D3)) {
    for (let [e, t] of Object.entries(a)) D3[e] = {
      open: `\x1B[${t[0]}m`,
      close: `\x1B[${t[1]}m`
    }, a[e] = D3[e], T.set(t[0], t[1]);
    Object.defineProperty(D3, R, {
      value: a,
      enumerable: !1
    });
  }
  return Object.defineProperty(D3, "codes", {
    value: T,
    enumerable: !1
  }), D3.color.close = "\x1B[39m", D3.bgColor.close = "\x1B[49m", D3.color.ansi = iyT(), D3.color.ansi256 = cyT(), D3.color.ansi16m = syT(), D3.bgColor.ansi = iyT(10), D3.bgColor.ansi256 = cyT(10), D3.bgColor.ansi16m = syT(10), Object.defineProperties(D3, {
    rgbToAnsi256: {
      value(R, a, e) {
        if (R === a && a === e) {
          if (R < 8) return 16;
          if (R > 248) return 231;
          return Math.round((R - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(R / 255 * 5) + 6 * Math.round(a / 255 * 5) + Math.round(e / 255 * 5);
      },
      enumerable: !1
    },
    hexToRgb: {
      value(R) {
        let a = /[a-f\d]{6}|[a-f\d]{3}/i.exec(R.toString(16));
        if (!a) return [0, 0, 0];
        let [e] = a;
        if (e.length === 3) e = [...e].map(r => r + r).join("");
        let t = Number.parseInt(e, 16);
        return [t >> 16 & 255, t >> 8 & 255, t & 255];
      },
      enumerable: !1
    },
    hexToAnsi256: {
      value: R => D3.rgbToAnsi256(...D3.hexToRgb(R)),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value(R) {
        if (R < 8) return 30 + R;
        if (R < 16) return 90 + (R - 8);
        let a, e, t;
        if (R >= 232) a = ((R - 232) * 10 + 8) / 255, e = a, t = a;else {
          R -= 16;
          let i = R % 36;
          a = Math.floor(R / 36) / 5, e = Math.floor(i / 6) / 5, t = i % 6 / 5;
        }
        let r = Math.max(a, e, t) * 2;
        if (r === 0) return 30;
        let h = 30 + (Math.round(t) << 2 | Math.round(e) << 1 | Math.round(a));
        if (r === 2) h += 60;
        return h;
      },
      enumerable: !1
    },
    rgbToAnsi: {
      value: (R, a, e) => D3.ansi256ToAnsi(D3.rgbToAnsi256(R, a, e)),
      enumerable: !1
    },
    hexToAnsi: {
      value: R => D3.ansi256ToAnsi(D3.hexToAnsi256(R)),
      enumerable: !1
    }
  }), D3;
}
function Ti(T, R = globalThis.Deno ? globalThis.Deno.args : UaT.argv) {
  let a = T.startsWith("-") ? "" : T.length === 1 ? "-" : "--",
    e = R.indexOf(a + T),
    t = R.indexOf("--");
  return e !== -1 && (t === -1 || e < t);
}
function XXR() {
  if ("FORCE_COLOR" in ea) {
    if (ea.FORCE_COLOR === "true") return 1;
    if (ea.FORCE_COLOR === "false") return 0;
    return ea.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(ea.FORCE_COLOR, 10), 3);
  }
}
function YXR(T) {
  if (T === 0) return !1;
  return {
    level: T,
    hasBasic: !0,
    has256: T >= 2,
    has16m: T >= 3
  };
}
function QXR(T, {
  streamIsTTY: R,
  sniffFlags: a = !0
} = {}) {
  let e = XXR();
  if (e !== void 0) nw = e;
  let t = a ? nw : e;
  if (t === 0) return 0;
  if (a) {
    if (Ti("color=16m") || Ti("color=full") || Ti("color=truecolor")) return 3;
    if (Ti("color=256")) return 2;
  }
  if ("TF_BUILD" in ea && "AGENT_NAME" in ea) return 1;
  if (T && !R && t === void 0) return 0;
  let r = t || 0;
  if (ea.TERM === "dumb") return r;
  if (UaT.platform === "win32") {
    let h = VXR.release().split(".");
    if (Number(h[0]) >= 10 && Number(h[2]) >= 10586) return Number(h[2]) >= 14931 ? 3 : 2;
    return 1;
  }
  if ("CI" in ea) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some(h => h in ea)) return 3;
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some(h => h in ea) || ea.CI_NAME === "codeship") return 1;
    return r;
  }
  if ("TEAMCITY_VERSION" in ea) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(ea.TEAMCITY_VERSION) ? 1 : 0;
  if (ea.COLORTERM === "truecolor") return 3;
  if (ea.TERM === "xterm-kitty") return 3;
  if ("TERM_PROGRAM" in ea) {
    let h = Number.parseInt((ea.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (ea.TERM_PROGRAM) {
      case "iTerm.app":
        return h >= 3 ? 3 : 2;
      case "Apple_Terminal":
        return 2;
    }
  }
  if (/-256(color)?$/i.test(ea.TERM)) return 2;
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(ea.TERM)) return 1;
  if ("COLORTERM" in ea) return 1;
  return r;
}
function nyT(T, R = {}) {
  let a = QXR(T, {
    streamIsTTY: T && T.isTTY,
    ...R
  });
  return YXR(a);
}
function T1R(T, R, a) {
  let e = T.indexOf(R);
  if (e === -1) return T;
  let t = R.length,
    r = 0,
    h = "";
  do h += T.slice(r, e) + R + a, r = e + t, e = T.indexOf(R, r); while (e !== -1);
  return h += T.slice(r), h;
}
function R1R(T, R, a, e) {
  let t = 0,
    r = "";
  do {
    let h = T[e - 1] === "\r";
    r += T.slice(t, h ? e - 1 : e) + R + (h ? `\r
` : `
`) + a, t = e + 1, e = T.indexOf(`
`, t);
  } while (e !== -1);
  return r += T.slice(t), r;
}
function zO(T) {
  return e1R(T);
}
function n1R(T) {
  return Math.ceil(T.length / o1R);
}
function l1R(T, R, a, e) {
  let t = T.thread.messages.length > 0 ? k8T(T.thread) : [{
    role: "user",
    content: "x"
  }];
  while (t.length > 0 && t.at(-1)?.role === "assistant") t = t.slice(0, -1);
  t = f8T(t);
  let r = kO(T.tools);
  return {
    client: R,
    model: a,
    headers: e,
    systemPrompt: T.systemPrompt,
    messages: t,
    tools: r,
    toolSpecs: T.tools
  };
}
async function Qu(T, R, a, e) {
  try {
    return (await T.messages.countTokens({
      model: R,
      messages: e.messages ?? [{
        role: "user",
        content: "x"
      }],
      ...(e.tools && e.tools.length > 0 ? {
        tools: e.tools
      } : {}),
      ...(e.system && e.system.length > 0 ? {
        system: e.system
      } : {}),
      thinking: {
        type: "enabled",
        budget_tokens: 1e4
      }
    }, {
      headers: a
    })).input_tokens;
  } catch (t) {
    J.warn("countTokens failed, falling back to estimate", {
      error: t
    });
    let r = JSON.stringify(e.messages ?? []),
      h = JSON.stringify(e.tools ?? []),
      i = JSON.stringify(e.system ?? []);
    return n1R(r + h + i);
  }
}
function p1R(T) {
  return T.map(R => R.text).join(`

`);
}
function _1R(T, R) {
  let a = [...P3T(T)];
  while (a.length > 0) {
    let e = a.at(-1);
    if (e && typeof e === "object" && "type" in e && e.type === "message" && "role" in e && e.role === "assistant") a.pop();else break;
  }
  return [{
    role: "system",
    content: R
  }, ...a];
}
function sFT(T) {
  return T.map(k3T);
}
async function FI(T, R) {
  return (await T.client.responses.inputTokens.count({
    model: T.model,
    input: R.input,
    ...(R.tools.length > 0 ? {
      tools: R.tools
    } : {})
  })).input_tokens;
}
function b1R(T, R, a) {
  let e = p1R(T.systemPrompt),
    t;
  if (T.thread.messages.length > 0) t = _1R(T.thread, e);else t = [{
    role: "system",
    content: e
  }, {
    type: "message",
    role: "user",
    content: "x"
  }];
  let r = [{
      role: "system",
      content: e
    }, {
      type: "message",
      role: "user",
      content: "x"
    }],
    h = sFT(T.tools);
  return {
    client: R,
    model: a,
    systemPromptContent: e,
    fullInput: t,
    systemOnlyInput: r,
    tools: h
  };
}
async function Ts(T, R) {
  if (T.provider === "anthropic") return A1R.count(T.ctx, R);
  return m1R.count(T.ctx, R);
}
async function oFT(T, R, a) {
  let {
      onProgress: e
    } = T,
    t = 8,
    r = 0,
    h = F => {
      r++, e?.(F, r, 8);
    };
  if (h("Initializing..."), T.mcpInitialized) await T.mcpInitialized, await new Promise(F => setTimeout(F, 100));
  let i = await T.configService.getLatest(a),
    c = ve(R),
    s,
    A;
  if (T.agentModeOverride && c === 0) A = T.agentModeOverride, s = nk(A);else {
    let F = pn(i.settings, R);
    s = F.model, A = F.agentMode;
  }
  J.debug("Context analyzer model selection", {
    agentModeOverride: T.agentModeOverride,
    humanMsgCount: c,
    threadAgentMode: R.agentMode,
    resolvedAgentMode: A,
    selectedModel: s
  });
  let {
      provider: l,
      model: o
    } = RO(s),
    n = l === "anthropic" && x8T(A, o),
    p = $h(R),
    _ = dn(s),
    m = _.displayName,
    b = l === "anthropic" ? TU(o, {
      enableLargeContext: n
    }) : _.contextWindow - _.maxOutputTokens;
  J.debug("Context analysis model spec", {
    modelName: o,
    provider: l,
    modelDisplayName: m,
    maxContextTokens: b,
    lastUsageModel: p?.model
  }), h("Building system prompt...");
  let {
      systemPrompt: y,
      tools: u
    } = await LO(T.buildSystemPromptDeps, R, {
      enableTaskList: !1,
      enableTask: !0,
      enableOracle: !0
    }, {
      model: o,
      provider: l,
      agentMode: A
    }, a),
    P = u.filter(F => F.source === "builtin"),
    k = u.filter(F => typeof F.source === "object" && "mcp" in F.source),
    x = u.filter(F => typeof F.source === "object" && "toolbox" in F.source),
    f = [...P, ...k, ...x];
  J.debug("Context analysis tools breakdown", {
    totalTools: f.length,
    builtinCount: P.length,
    mcpCount: k.length,
    toolboxCount: x.length
  });
  let v = (await _O({
      ...T.buildSystemPromptDeps,
      configService: T.configService
    }, R, a)).filter(F => F.type === "project" || F.type === "parent" || F.type === "user" || F.type === "mentioned"),
    g = [];
  for (let F of R.messages) if (F.role === "user") {
    for (let E of F.content) if (E.type === "tool_result" && E.run?.status === "done") {
      let U = E.run.result;
      if (typeof U === "object" && U !== null && "discoveredGuidanceFiles" in U && Array.isArray(U.discoveredGuidanceFiles)) {
        for (let Z of U.discoveredGuidanceFiles) if (Z.content) g.push({
          uri: Z.uri,
          content: Z.content
        });
      }
    }
    if (F.discoveredGuidanceFiles) {
      for (let E of F.discoveredGuidanceFiles) if (E.content) g.push({
        uri: E.uri,
        content: E.content
      });
    }
  }
  let I = {
      thread: R,
      systemPrompt: y,
      tools: f
    },
    S = Js(T.workersServiceAuthToken),
    O;
  if (l === "openai") {
    let F = {
        ...(S ?? {}),
        ...Xs(),
        ...Vs(R),
        [yc]: "amp.context-analyze",
        "x-amp-override-provider": "openai"
      },
      E = await uU({
        configService: T.configService
      }, a, {
        defaultHeaders: F
      });
    O = {
      provider: "openai",
      ctx: b1R(I, E, o)
    };
  } else {
    let F = await ep({
        configService: T.configService
      }, a, S ? {
        defaultHeaders: S
      } : void 0),
      E = {
        ...JN(i.settings, {
          id: R.id,
          agentMode: A
        }, o, void 0, {
          enableLargeContext: n
        }),
        ...(S ?? {}),
        [yc]: "amp.context-analyze",
        "x-amp-override-provider": "anthropic"
      };
    O = {
      provider: "anthropic",
      ctx: l1R(I, F, tp(o), E)
    };
  }
  h("Counting total tokens...");
  let j = await Ts(O, {
    kind: "full"
  });
  h("Counting messages...");
  let d = await Ts(O, {
    kind: "no_messages"
  });
  h("Counting tools...");
  let C = await Ts(O, {
    kind: "no_tools"
  });
  h("Counting system prompt...");
  let L = await Ts(O, {
    kind: "system_only"
  });
  h("Counting AGENTS.md files...");
  let w = [];
  if (v.length > 0) {
    let F = await Promise.all(v.map(async E => {
      let U = await Ts(O, {
        kind: "text",
        text: E.content
      });
      return {
        uri: E.uri,
        tokens: U
      };
    }));
    w.push(...F);
  }
  let D = w.reduce((F, E) => F + E.tokens, 0),
    B = [],
    M = 0;
  if (g.length > 0) {
    let F = await Promise.all(g.map(async E => {
      let U = Z9T([{
          uri: E.uri,
          lineCount: E.content.split(`
`).length,
          content: E.content
        }]),
        Z = await Ts(O, {
          kind: "text",
          text: U
        });
      return {
        uri: E.uri,
        tokens: Z
      };
    }));
    B.push(...F), M = B.reduce((E, U) => E + U.tokens, 0);
  }
  let V = j - d,
    Q = Math.max(0, V - M),
    W = j - C,
    eT = Math.max(0, L - D),
    iT = W,
    aT = 0,
    oT = [];
  if (k.length > 0 && (P.length > 0 || x.length > 0)) {
    let F = await Ts(O, {
        kind: "tools_only",
        tools: [...P, ...x]
      }),
      E = await Ts(O, {
        kind: "system_only"
      }),
      U = F - E;
    aT = W - U, iT = U;
  } else if (k.length > 0) aT = W, iT = 0;
  if (h("Finalizing..."), k.length > 0) {
    let F = new Map();
    for (let U of k) {
      let Z = U.source.mcp,
        X = F.get(Z) ?? [];
      X.push(U), F.set(Z, X);
    }
    let E = await Promise.all(Array.from(F.entries()).map(async ([U, Z]) => {
      let X = await Ts(O, {
          kind: "tools_only",
          tools: Z
        }),
        rT = await Ts(O, {
          kind: "system_only"
        });
      return {
        server: U,
        tokens: X - rT
      };
    }));
    oT.push(...E);
  }
  let TT = [];
  TT.push({
    name: "System prompt",
    tokens: eT,
    percentage: eT / b * 100
  });
  let tT = x.length > 0 ? "Builtin + toolbox tools" : "Builtin tools";
  TT.push({
    name: tT,
    tokens: iT,
    percentage: iT / b * 100
  });
  let lT = [...w, ...B],
    N = D + M;
  if (lT.length > 0) {
    let F = null,
      E = R.env?.initial?.trees?.find(X => X.uri !== void 0)?.uri ?? null;
    if (E) F = E;else {
      let X = await m0(T.configService.workspaceRoot, a);
      if (X) F = d0(X);
    }
    let U = {
        workspaceFolders: F ? [F] : null,
        isWindows: JS().os === "windows",
        homeDir: T.configService.homeDir ? d0(T.configService.homeDir) : void 0
      },
      Z = lT.map(X => ({
        name: Mr(X.uri, U),
        tokens: X.tokens,
        percentage: X.tokens / b * 100
      }));
    TT.push({
      name: "AGENTS.md files",
      tokens: N,
      percentage: N / b * 100,
      children: Z
    });
  }
  if (k.length > 0) {
    let F = oT.map(E => ({
      name: E.server,
      tokens: E.tokens,
      percentage: E.tokens / b * 100
    }));
    TT.push({
      name: "MCP tools",
      tokens: aT,
      percentage: aT / b * 100,
      children: F.length > 1 ? F : void 0
    });
  }
  if (R.messages.length > 0) TT.push({
    name: "Messages",
    tokens: Q,
    percentage: Q / b * 100
  });
  let q = Math.max(0, b - j);
  return {
    model: o,
    modelDisplayName: m,
    maxContextTokens: b,
    sections: TT,
    totalTokens: j,
    freeSpace: q,
    toolCounts: {
      builtin: P.length,
      mcp: k.length,
      toolbox: x.length,
      total: f.length
    }
  };
}
function y1R(T) {
  if (T.startsWith("http://") || T.startsWith("https://")) try {
    let R = new URL(T);
    return R.username = "", R.password = "", R.toString();
  } catch {}
  return T;
}
function pFT(T) {
  let R = ["github.com", "gitlab.com"];
  T = y1R(T);
  let a = null,
    e = null,
    t = T.match(/^([^@]+)@([^:/]+)[:/](.+)$/);
  if (t && t[1] && t[2] && t[3]) {
    let r = t[1],
      h = t[2],
      i = t[3],
      c = r === "git",
      s = h === "github.com" && r.startsWith("org-");
    if (c || s) a = h, e = i;
  }
  if (!a || !e) {
    let r = T.match(/^https?:\/\/([^/]+)\/(.+)$/);
    if (r && r[1] && r[2]) a = r[1], e = r[2];
  }
  if (!a || !e) {
    let r = T.match(/^([^:]+):(.+)$/);
    if (r && r[1] && r[2]) a = r[1], e = r[2];
  }
  if (a && e && R.includes(a)) {
    let r = e.replace(/\.git$/, "").replace(/\/+$/, "").replace(/@[^/]+$/, "");
    return `https://${a}/${r}`.toLowerCase();
  }
  return T.replace(/\.git$/, "").replace(/\/+$/, "").replace(/@[^/]+$/, "").toLowerCase();
}
async function P1R(T) {
  let R = {
    displayName: MR.basename(T)
  };
  if (!Pj(T)) return R;
  R.uri = d0(T);
  try {
    if (!(await lFT.access(AFT.join(T.fsPath, ".git")).then(() => !0).catch(() => !1))) return R;
    let {
      stdout: a
    } = await yz("git remote get-url origin", {
      cwd: T.fsPath
    }).catch(() => ({
      stdout: ""
    }));
    if (!a.trim()) return R;
    let {
        stdout: e
      } = await yz("git symbolic-ref HEAD", {
        cwd: T.fsPath
      }).catch(() => ({
        stdout: ""
      })),
      {
        stdout: t
      } = await yz("git rev-parse HEAD", {
        cwd: T.fsPath
      }).catch(() => ({
        stdout: ""
      }));
    return {
      ...R,
      repository: {
        type: "git",
        url: pFT(a.trim()),
        ref: e.trim() || void 0,
        sha: t.trim() ?? void 0
      }
    };
  } catch (a) {
    return J.error("Error getting repository info:", a, {
      dir: T.fsPath
    }), R;
  }
}
function k1R() {
  let T = sN(),
    R = JS(),
    a = JlR();
  return {
    os: R.os,
    osVersion: R.osVersion,
    cpuArchitecture: R.cpuArchitecture,
    webBrowser: R.webBrowser,
    client: T.name,
    clientVersion: T.version,
    clientType: T.type,
    installationID: a?.installationID,
    deviceFingerprint: a?.deviceFingerprint
  };
}
async function Hs() {
  return {
    trees: [await P1R(zR.file(process.cwd()))],
    platform: k1R()
  };
}
function FO(T) {
  throw Error(`Unreachable case: ${T}`);
}
function Ly(T, R, a = "") {
  if (T === null || T === void 0) return !0;
  if (typeof T === "number") {
    if (!Number.isFinite(T)) return R == null || R(a), !1;
    return !0;
  }
  if (typeof T === "boolean" || typeof T === "string") return !0;
  if (typeof T === "bigint") return !0;
  if (T instanceof Date) return !0;
  if (T instanceof Uint8Array || T instanceof Uint8ClampedArray || T instanceof Uint16Array || T instanceof Uint32Array || T instanceof BigUint64Array || T instanceof Int8Array || T instanceof Int16Array || T instanceof Int32Array || T instanceof BigInt64Array || T instanceof Float32Array || T instanceof Float64Array) return !0;
  if (T instanceof Map) {
    for (let [e, t] of T.entries()) {
      let r = a ? `${a}.key(${String(e)})` : `key(${String(e)})`,
        h = a ? `${a}.value(${String(e)})` : `value(${String(e)})`;
      if (!Ly(e, R, r) || !Ly(t, R, h)) return !1;
    }
    return !0;
  }
  if (T instanceof Set) {
    let e = 0;
    for (let t of T.values()) {
      let r = a ? `${a}.set[${e}]` : `set[${e}]`;
      if (!Ly(t, R, r)) return !1;
      e++;
    }
    return !0;
  }
  if (T instanceof RegExp) return !0;
  if (T instanceof Error) return !0;
  if (Array.isArray(T)) {
    for (let e = 0; e < T.length; e++) {
      let t = a ? `${a}[${e}]` : `[${e}]`;
      if (!Ly(T[e], R, t)) return !1;
    }
    return !0;
  }
  if (typeof T === "object") {
    let e = Object.getPrototypeOf(T);
    if (e !== null && e !== Object.prototype) {
      let t = T.constructor;
      if (t && typeof t.name === "string") ;
    }
    for (let t in T) {
      let r = a ? `${a}.${t}` : t;
      if (!Ly(T[t], R, r)) return !1;
    }
    return !0;
  }
  return R == null || R(a), !1;
}
function HaT(T, R, a, e = !1) {
  let t, r, h, i, c, s;
  if (Sh.isActorError(T) && T.public) t = "statusCode" in T && T.statusCode ? T.statusCode : 400, r = !0, h = T.group, i = T.code, c = p$(T), s = T.metadata, R.info({
    msg: "public error",
    group: h,
    code: i,
    message: c,
    ...r4,
    ...a
  });else if (e) {
    if (Sh.isActorError(T)) t = 500, r = !1, h = T.group, i = T.code, c = p$(T), s = T.metadata, R.info({
      msg: "internal error",
      group: h,
      code: i,
      message: c,
      stack: T == null ? void 0 : T.stack,
      ...r4,
      ...a
    });else t = 500, r = !1, h = "rivetkit", i = XX, c = p$(T), R.info({
      msg: "internal error",
      group: h,
      code: i,
      message: c,
      stack: T == null ? void 0 : T.stack,
      ...r4,
      ...a
    });
  } else t = 500, r = !1, h = "rivetkit", i = XX, c = x1R, s = {}, R.warn({
    msg: "internal error",
    error: p$(T),
    stack: T == null ? void 0 : T.stack,
    ...r4,
    ...a
  });
  return {
    __type: "ActorError",
    statusCode: t,
    public: r,
    group: h,
    code: i,
    message: c,
    metadata: s
  };
}
function _r(T) {
  if (T instanceof Error) {
    if (typeof process < "u" && q1R()) return `${T.name}: ${T.message}${T.stack ? `
${T.stack}` : ""}`;else return `${T.name}: ${T.message}`;
  } else if (typeof T === "string") return T;else if (typeof T === "object" && T !== null) try {
    return `${JSON.stringify(T)}`;
  } catch {
    return "[cannot stringify error]";
  } else return `Unknown error: ${p$(T)}`;
}
function p$(T) {
  if (T && typeof T === "object" && "message" in T && typeof T.message === "string") return T.message;else return String(T);
}
function F1R() {
  return async () => {};
}
function X1R(T) {
  let R = "",
    a = Object.entries(T);
  for (let e = 0; e < a.length; e++) {
    let [t, r] = a[e],
      h = !1,
      i;
    if (r == null) h = !0, i = "";else i = r.toString();
    if (i.length > 512 && t !== "msg" && t !== "error") i = `${i.slice(0, 512)}...`;
    let c = i.indexOf(" ") > -1 || i.indexOf("=") > -1,
      s = i.indexOf('"') > -1 || i.indexOf("\\") > -1;
    if (i = i.replace(/\n/g, "\\n"), s) i = i.replace(/["\\]/g, "\\$&");
    if (c || s) i = `"${i}"`;
    if (i === "" && !h) i = '""';
    if (Z1R.enableColor) {
      let A = "\x1B[2m";
      if (t === "level") {
        let l = S_[i],
          o = K1R[l];
        if (o) A = o;
      } else if (t === "msg") A = "\x1B[32m";else if (t === "trace") A = "\x1B[34m";
      R += `\x1B[0m\x1B[1m${t}\x1B[0m\x1B[2m=\x1B[0m${A}${i}${V1R}`;
    } else R += `${t}=${i}`;
    if (e !== a.length - 1) R += " ";
  }
  return R;
}
function Y1R(T) {
  let R = T.getUTCFullYear(),
    a = String(T.getUTCMonth() + 1).padStart(2, "0"),
    e = String(T.getUTCDate()).padStart(2, "0"),
    t = String(T.getUTCHours()).padStart(2, "0"),
    r = String(T.getUTCMinutes()).padStart(2, "0"),
    h = String(T.getUTCSeconds()).padStart(2, "0"),
    i = String(T.getUTCMilliseconds()).padStart(3, "0");
  return `${R}-${a}-${e}T${t}:${r}:${h}.${i}Z`;
}
function Q1R(T) {
  if (typeof T === "string" || typeof T === "number" || typeof T === "bigint" || typeof T === "boolean" || T === null || T === void 0) return T;
  if (T instanceof Error) return String(T);
  try {
    return JSON.stringify(T);
  } catch {
    return "[cannot stringify]";
  }
}
function J1R(T) {
  if (T) return T;
  if (ZX) return ZX;
  let R = (U1R() || "warn").toString().toLowerCase(),
    a = WaT.safeParse(R);
  if (a.success) return a.data;
  return "info";
}
function TYR() {
  return H1R();
}
function Rs(T, R) {
  let a = {};
  if (YX() && R.time) {
    let t = typeof R.time === "number" ? new Date(R.time) : new Date();
    a.ts = Y1R(t);
  }
  if (a.level = T.toUpperCase(), R.target) a.target = R.target;
  if (R.msg) a.msg = R.msg;
  for (let [t, r] of Object.entries(R)) if (t !== "time" && t !== "level" && t !== "target" && t !== "msg" && t !== "pid" && t !== "hostname") a[t] = Q1R(r);
  let e = X1R(a);
  console.log(e);
}
function RYR(T) {
  if (T) ZX = T;
  QX = byT.pino({
    level: J1R(T),
    messageKey: "msg",
    base: {},
    formatters: {
      level(R, a) {
        return {
          level: a
        };
      }
    },
    timestamp: YX() ? byT.stdTimeFunctions.epochTime : !1,
    browser: {
      write: {
        fatal: Rs.bind(null, "fatal"),
        error: Rs.bind(null, "error"),
        warn: Rs.bind(null, "warn"),
        info: Rs.bind(null, "info"),
        debug: Rs.bind(null, "debug"),
        trace: Rs.bind(null, "trace")
      }
    },
    hooks: {
      logMethod(R, a, e) {
        var t;
        let r = {
            10: "trace",
            20: "debug",
            30: "info",
            40: "warn",
            50: "error",
            60: "fatal"
          }[e] || "info",
          h = YX() ? Date.now() : void 0,
          i = ((t = this.bindings) == null ? void 0 : t.call(this)) || {};
        if (R.length >= 2) {
          let [c, s] = R;
          if (typeof c === "object" && c !== null) Rs(r, {
            ...i,
            ...c,
            msg: s,
            time: h
          });else Rs(r, {
            ...i,
            msg: String(c),
            time: h
          });
        } else if (R.length === 1) {
          let [c] = R;
          if (typeof c === "object" && c !== null) Rs(r, {
            ...i,
            ...c,
            time: h
          });else Rs(r, {
            ...i,
            msg: String(c),
            time: h
          });
        }
      }
    }
  }), JX.clear();
}
function aYR() {
  if (!QX) RYR();
  return QX;
}
function Vx(T = "default") {
  let R = JX.get(T);
  if (R) return R;
  let a = aYR(),
    e = TYR() ? a.child({
      target: T
    }) : a;
  return JX.set(T, e), e;
}
function myT() {
  return Vx("utils");
}
function eYR() {
  if (Pz !== void 0) return Pz;
  let T = `RivetKit/${GU}`,
    R = typeof navigator < "u" ? navigator : void 0;
  if (R == null ? void 0 : R.userAgent) T += ` ${R.userAgent}`;
  return Pz = T, T;
}
function sa(T) {
  if (typeof Deno < "u") return Deno.env.get(T);else if (typeof process < "u") return process.env[T];
}
function pM(T) {
  let R,
    a,
    e = new Promise((t, r) => {
      R = t, a = r;
    });
  return e.catch(T), {
    promise: e,
    resolve: R,
    reject: a
  };
}
function KU(T) {
  return T.buffer.slice(T.byteOffset, T.byteOffset + T.byteLength);
}
function qaT(T, R, a) {
  let e = new URL(T),
    t = R.split("?"),
    r = t[0],
    h = t[1] || "",
    i = e.pathname.replace(/\/$/, ""),
    c = r.startsWith("/") ? r : `/${r}`,
    s = (i + c).replace(/\/\//g, "/"),
    A = [];
  if (h) A.push(h);
  if (a) {
    for (let [o, n] of Object.entries(a)) if (n !== void 0) A.push(`${encodeURIComponent(o)}=${encodeURIComponent(n)}`);
  }
  let l = A.length > 0 ? `?${A.join("&")}` : "";
  return `${e.protocol}//${e.host}${s}${l}`;
}
function g0() {
  return Vx("actor-client");
}
async function gFT() {
  if (h4 !== null) return h4;
  return h4 = (async () => {
    let T;
    if (typeof WebSocket < "u") T = WebSocket;else try {
      T = (await Promise.resolve().then(() => (Q0T(), Y0T))).default, g0().debug("using websocket from npm");
    } catch {
      T = class {
        constructor() {
          throw Error('WebSocket support requires installing the "ws" peer dependency.');
        }
      }, g0().debug("using mock websocket");
    }
    return T;
  })(), h4;
}
function ze(T, R = "") {
  if (!T) {
    let a = new $FT(R);
    throw tYR.captureStackTrace?.(a, ze), a;
  }
}
function rYR(T) {
  return T === BigInt.asIntN(64, T);
}
function hYR(T) {
  return T === (T & 255);
}
function iYR(T) {
  return T === (T & 65535);
}
function un(T) {
  return T === T >>> 0;
}
function cYR(T) {
  return T === BigInt.asUintN(64, T);
}
function sYR(T) {
  return Number.isSafeInteger(T) && T >= 0;
}
class A0 {
  constructor(T, R) {
    if (this.offset = 0, T.length > R.maxBufferLength) throw new I0(0, jFT);
    this.bytes = T, this.config = R, this.view = new DataView(T.buffer, T.byteOffset, T.length);
  }
}
function Um(T, R) {
  if (Hr) ze(un(R));
  if (T.offset + R > T.bytes.length) throw new I0(T.offset, "missing bytes");
}
function Hm(T, R) {
  if (Hr) ze(un(R));
  let a = T.offset + R | 0;
  if (a > T.bytes.length) lYR(T, a);
}
function lYR(T, R) {
  if (R > T.config.maxBufferLength) throw new I0(0, jFT);
  let a = T.bytes.buffer,
    e;
  if (AYR(a) && T.bytes.byteOffset + T.bytes.byteLength === a.byteLength && T.bytes.byteLength + R <= a.maxByteLength) {
    let t = Math.min(R << 1, T.config.maxBufferLength, a.maxByteLength);
    if (a instanceof ArrayBuffer) a.resize(t);else a.grow(t);
    e = new Uint8Array(a, T.bytes.byteOffset, t);
  } else {
    let t = Math.min(R << 1, T.config.maxBufferLength);
    e = new Uint8Array(t), e.set(T.bytes);
  }
  T.bytes = e, T.view = new DataView(e.buffer);
}
function AYR(T) {
  return "maxByteLength" in T;
}
function q0(T) {
  let R = s3(T);
  if (R > 1) throw T.offset--, new I0(T.offset, "a bool must be equal to 0 or 1");
  return R > 0;
}
function z0(T, R) {
  dR(T, R ? 1 : 0);
}
function jA(T) {
  Um(T, 8);
  let R = T.view.getBigInt64(T.offset, !0);
  return T.offset += 8, R;
}
function SA(T, R) {
  if (Hr) ze(rYR(R), $i);
  Hm(T, 8), T.view.setBigInt64(T.offset, R, !0), T.offset += 8;
}
function s3(T) {
  return Um(T, 1), T.bytes[T.offset++];
}
function dR(T, R) {
  if (Hr) ze(hYR(R), $i);
  Hm(T, 1), T.bytes[T.offset++] = R;
}
function pw(T) {
  Um(T, 2);
  let R = T.view.getUint16(T.offset, !0);
  return T.offset += 2, R;
}
function _w(T, R) {
  if (Hr) ze(iYR(R), $i);
  Hm(T, 2), T.view.setUint16(T.offset, R, !0), T.offset += 2;
}
function ge(T) {
  Um(T, 4);
  let R = T.view.getUint32(T.offset, !0);
  return T.offset += 4, R;
}
function $e(T, R) {
  if (Hr) ze(un(R), $i);
  Hm(T, 4), T.view.setUint32(T.offset, R, !0), T.offset += 4;
}
function Ws(T) {
  Um(T, 8);
  let R = T.view.getBigUint64(T.offset, !0);
  return T.offset += 8, R;
}
function qs(T, R) {
  if (Hr) ze(cYR(R), $i);
  Hm(T, 8), T.view.setBigUint64(T.offset, R, !0), T.offset += 8;
}
function UR(T) {
  let R = s3(T);
  if (R >= 128) {
    R &= 127;
    let a = 128,
      e = 1,
      t;
    do t = s3(T), R += (t & 127) * a, a *= 128, e++; while (t >= 128 && e < 7);
    let r = 0;
    a = 1;
    while (t >= 128 && e < uyT) t = s3(T), r += (t & 127) * a, a *= 128, e++;
    if (t === 0 || e === uyT && t > 1) throw T.offset -= e, new I0(T.offset, zaT);
    return BigInt(R) + (BigInt(r) << BigInt(49));
  }
  return BigInt(R);
}
function HR(T, R) {
  let a = BigInt.asUintN(64, R);
  if (Hr) ze(a === R, $i);
  pYR(T, a);
}
function pYR(T, R) {
  let a = Number(BigInt.asUintN(49, R)),
    e = Number(R >> BigInt(49)),
    t = 0;
  while (a >= 128 || e > 0) if (dR(T, 128 | a & 127), a = Math.floor(a / 128), t++, t === 7) a = e, e = 0;
  dR(T, a);
}
function SFT(T) {
  let R = s3(T);
  if (R >= 128) {
    R &= 127;
    let a = 7,
      e = 1,
      t;
    do t = s3(T), R += (t & 127) << a >>> 0, a += 7, e++; while (t >= 128 && e < yyT);
    if (t === 0) throw T.offset -= e - 1, new I0(T.offset - e + 1, zaT);
    if (e === yyT && t > 15) throw T.offset -= e - 1, new I0(T.offset, $i);
  }
  return R;
}
function T1(T, R) {
  if (Hr) ze(un(R), $i);
  let a = R >>> 0;
  while (a >= 128) dR(T, 128 | a & 127), a >>>= 7;
  dR(T, a);
}
function M8(T) {
  let R = s3(T);
  if (R >= 128) {
    R &= 127;
    let a = 128,
      e = 1,
      t;
    do t = s3(T), R += (t & 127) * a, a *= 128, e++; while (t >= 128 && e < Aw);
    if (t === 0) throw T.offset -= e - 1, new I0(T.offset - e + 1, zaT);
    if (e === Aw && t > 15) throw T.offset -= e - 1, new I0(T.offset, $i);
  }
  return R;
}
function D8(T, R) {
  if (Hr) ze(sYR(R), $i);
  let a = 1,
    e = R;
  while (e >= 128 && a < Aw) dR(T, 128 | e & 127), e = Math.floor(e / 128), a++;
  if (a === Aw) e &= 15;
  dR(T, e);
}
function _YR(T) {
  return OFT(T, SFT(T));
}
function bYR(T, R) {
  T1(T, R.length), FaT(T, R);
}
function OFT(T, R) {
  return dFT(T, R).slice();
}
function FaT(T, R) {
  let a = R.length;
  if (a > 0) Hm(T, a), T.bytes.set(R, T.offset), T.offset += a;
}
function dFT(T, R) {
  if (Hr) ze(un(R));
  Um(T, R);
  let a = T.offset;
  return T.offset += R, T.bytes.subarray(a, a + R);
}
function E0(T) {
  return _YR(T).buffer;
}
function C0(T, R) {
  bYR(T, new Uint8Array(R));
}
function VU(T, R) {
  if (Hr) ze(un(R));
  return OFT(T, R).buffer;
}
function XU(T, R) {
  FaT(T, new Uint8Array(R));
}
function KR(T) {
  return mYR(T, SFT(T));
}
function YR(T, R) {
  if (R.length < nYR) {
    let a = PYR(R);
    T1(T, a), Hm(T, a), yYR(T, R);
  } else {
    let a = xYR.encode(R);
    T1(T, a.length), FaT(T, a);
  }
}
function mYR(T, R) {
  if (Hr) ze(un(R));
  if (R < oYR) return uYR(T, R);
  try {
    return kYR.decode(dFT(T, R));
  } catch (a) {
    throw new I0(T.offset, vFT);
  }
}
function uYR(T, R) {
  Um(T, R);
  let a = "",
    e = T.bytes,
    t = T.offset,
    r = t + R;
  while (t < r) {
    let h = e[t++];
    if (h > 127) {
      let i = !0,
        c = h;
      if (t < r && h < 224) {
        let s = e[t++];
        h = (c & 31) << 6 | s & 63, i = h >> 7 === 0 || c >> 5 !== 6 || s >> 6 !== 2;
      } else if (t + 1 < r && h < 240) {
        let s = e[t++],
          A = e[t++];
        h = (c & 15) << 12 | (s & 63) << 6 | A & 63, i = h >> 11 === 0 || h >> 11 === 27 || c >> 4 !== 14 || s >> 6 !== 2 || A >> 6 !== 2;
      } else if (t + 2 < r) {
        let s = e[t++],
          A = e[t++],
          l = e[t++];
        h = (c & 7) << 18 | (s & 63) << 12 | (A & 63) << 6 | l & 63, i = h >> 16 === 0 || h > 1114111 || c >> 3 !== 30 || s >> 6 !== 2 || A >> 6 !== 2 || l >> 6 !== 2;
      }
      if (i) throw new I0(T.offset, vFT);
    }
    a += String.fromCodePoint(h);
  }
  return T.offset = t, a;
}
function yYR(T, R) {
  let {
      bytes: a,
      offset: e
    } = T,
    t = 0;
  while (t < R.length) {
    let r = R.codePointAt(t++);
    if (r < 128) a[e++] = r;else {
      if (r < 2048) a[e++] = 192 | r >> 6;else {
        if (r < 65536) a[e++] = 224 | r >> 12;else a[e++] = 240 | r >> 18, a[e++] = 128 | r >> 12 & 63, t++;
        a[e++] = 128 | r >> 6 & 63;
      }
      a[e++] = 128 | r & 63;
    }
  }
  T.offset = e;
}
function PYR(T) {
  let R = T.length;
  for (let a = 0; a < T.length; a++) {
    let e = T.codePointAt(a);
    if (e > 127) {
      if (R++, e > 2047) {
        if (R++, e > 65535) a++;
      }
    }
  }
  return R;
}
function Wr({
  initialBufferLength: T = 1024,
  maxBufferLength: R = 33554432
}) {
  if (Hr) ze(un(T), $i), ze(un(R), $i), ze(T <= R, "initialBufferLength must be lower than or equal to maxBufferLength");
  return {
    initialBufferLength: T,
    maxBufferLength: R
  };
}
function pt(T) {
  return new fYR(T);
}
function IYR(T) {
  return {
    state: E0(T)
  };
}
function gYR(T, R) {
  C0(T, R.state);
}
function $YR(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function vYR(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function jYR(T) {
  return {
    id: UR(T)
  };
}
function SYR(T, R) {
  HR(T, R.id);
}
function OYR(T) {
  return {
    id: UR(T)
  };
}
function dYR(T, R) {
  HR(T, R.id);
}
function EYR(T) {
  return {
    id: UR(T)
  };
}
function CYR(T, R) {
  HR(T, R.id);
}
function LYR(T) {
  return {
    id: UR(T),
    startMs: UR(T),
    endMs: UR(T),
    limit: UR(T)
  };
}
function MYR(T, R) {
  HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit);
}
function DYR(T) {
  return {
    id: UR(T),
    limit: UR(T)
  };
}
function wYR(T, R) {
  HR(T, R.id), HR(T, R.limit);
}
function BYR(T) {
  return {
    id: UR(T)
  };
}
function NYR(T, R) {
  HR(T, R.id);
}
function UYR(T) {
  return q0(T) ? KR(T) : null;
}
function HYR(T, R) {
  if (z0(T, R !== null), R !== null) YR(T, R);
}
function WYR(T) {
  return {
    id: UR(T),
    entryId: UYR(T)
  };
}
function qYR(T, R) {
  HR(T, R.id), HYR(T, R.entryId);
}
function zYR(T) {
  return {
    id: UR(T)
  };
}
function FYR(T, R) {
  HR(T, R.id);
}
function GYR(T) {
  return {
    id: UR(T),
    table: KR(T),
    limit: UR(T),
    offset: UR(T)
  };
}
function KYR(T, R) {
  HR(T, R.id), YR(T, R.table), HR(T, R.limit), HR(T, R.offset);
}
function VYR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: IYR(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: jYR(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: OYR(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: $YR(T)
      };
    case 4:
      return {
        tag: "RpcsListRequest",
        val: EYR(T)
      };
    case 5:
      return {
        tag: "TraceQueryRequest",
        val: LYR(T)
      };
    case 6:
      return {
        tag: "QueueRequest",
        val: DYR(T)
      };
    case 7:
      return {
        tag: "WorkflowHistoryRequest",
        val: BYR(T)
      };
    case 8:
      return {
        tag: "WorkflowReplayRequest",
        val: WYR(T)
      };
    case 9:
      return {
        tag: "DatabaseSchemaRequest",
        val: zYR(T)
      };
    case 10:
      return {
        tag: "DatabaseTableRowsRequest",
        val: GYR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function XYR(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), gYR(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), SYR(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), dYR(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), vYR(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 4), CYR(T, R.val);
        break;
      }
    case "TraceQueryRequest":
      {
        dR(T, 5), MYR(T, R.val);
        break;
      }
    case "QueueRequest":
      {
        dR(T, 6), wYR(T, R.val);
        break;
      }
    case "WorkflowHistoryRequest":
      {
        dR(T, 7), NYR(T, R.val);
        break;
      }
    case "WorkflowReplayRequest":
      {
        dR(T, 8), qYR(T, R.val);
        break;
      }
    case "DatabaseSchemaRequest":
      {
        dR(T, 9), FYR(T, R.val);
        break;
      }
    case "DatabaseTableRowsRequest":
      {
        dR(T, 10), KYR(T, R.val);
        break;
      }
  }
}
function YYR(T) {
  return {
    body: VYR(T)
  };
}
function QYR(T, R) {
  XYR(T, R.body);
}
function ZYR(T) {
  let R = new A0(new Uint8Array(wk.initialBufferLength), wk);
  return QYR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function JYR(T) {
  let R = new A0(T, wk),
    a = YYR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function EFT(T) {
  return E0(T);
}
function CFT(T, R) {
  C0(T, R);
}
function PyT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function TQR(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function LFT(T) {
  return E0(T);
}
function MFT(T, R) {
  C0(T, R);
}
function GaT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [PyT(T)];
  for (let e = 1; e < R; e++) a[e] = PyT(T);
  return a;
}
function KaT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) TQR(T, R[a]);
}
function DFT(T) {
  return q0(T) ? EFT(T) : null;
}
function wFT(T, R) {
  if (z0(T, R !== null), R !== null) CFT(T, R);
}
function BFT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function NFT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function VaT(T) {
  return q0(T) ? LFT(T) : null;
}
function XaT(T, R) {
  if (z0(T, R !== null), R !== null) MFT(T, R);
}
function RQR(T) {
  return {
    connections: GaT(T),
    state: DFT(T),
    isStateEnabled: q0(T),
    rpcs: BFT(T),
    isDatabaseEnabled: q0(T),
    queueSize: UR(T),
    workflowHistory: VaT(T),
    isWorkflowEnabled: q0(T)
  };
}
function aQR(T, R) {
  KaT(T, R.connections), wFT(T, R.state), z0(T, R.isStateEnabled), NFT(T, R.rpcs), z0(T, R.isDatabaseEnabled), HR(T, R.queueSize), XaT(T, R.workflowHistory), z0(T, R.isWorkflowEnabled);
}
function eQR(T) {
  return {
    rid: UR(T),
    connections: GaT(T)
  };
}
function tQR(T, R) {
  HR(T, R.rid), KaT(T, R.connections);
}
function rQR(T) {
  return {
    rid: UR(T),
    state: DFT(T),
    isStateEnabled: q0(T)
  };
}
function hQR(T, R) {
  HR(T, R.rid), wFT(T, R.state), z0(T, R.isStateEnabled);
}
function iQR(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function cQR(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function sQR(T) {
  return {
    rid: UR(T),
    payload: E0(T)
  };
}
function oQR(T, R) {
  HR(T, R.rid), C0(T, R.payload);
}
function kyT(T) {
  return {
    id: UR(T),
    name: KR(T),
    createdAtMs: UR(T)
  };
}
function nQR(T, R) {
  HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs);
}
function lQR(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [kyT(T)];
  for (let e = 1; e < R; e++) a[e] = kyT(T);
  return a;
}
function AQR(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) nQR(T, R[a]);
}
function pQR(T) {
  return {
    size: UR(T),
    maxSize: UR(T),
    messages: lQR(T),
    truncated: q0(T)
  };
}
function _QR(T, R) {
  HR(T, R.size), HR(T, R.maxSize), AQR(T, R.messages), z0(T, R.truncated);
}
function bQR(T) {
  return {
    rid: UR(T),
    status: pQR(T)
  };
}
function mQR(T, R) {
  HR(T, R.rid), _QR(T, R.status);
}
function uQR(T) {
  return {
    rid: UR(T),
    history: VaT(T),
    isWorkflowEnabled: q0(T)
  };
}
function yQR(T, R) {
  HR(T, R.rid), XaT(T, R.history), z0(T, R.isWorkflowEnabled);
}
function PQR(T) {
  return {
    rid: UR(T),
    history: VaT(T),
    isWorkflowEnabled: q0(T)
  };
}
function kQR(T, R) {
  HR(T, R.rid), XaT(T, R.history), z0(T, R.isWorkflowEnabled);
}
function xQR(T) {
  return {
    rid: UR(T),
    schema: E0(T)
  };
}
function fQR(T, R) {
  HR(T, R.rid), C0(T, R.schema);
}
function IQR(T) {
  return {
    rid: UR(T),
    result: E0(T)
  };
}
function gQR(T, R) {
  HR(T, R.rid), C0(T, R.result);
}
function $QR(T) {
  return {
    state: EFT(T)
  };
}
function vQR(T, R) {
  CFT(T, R.state);
}
function jQR(T) {
  return {
    queueSize: UR(T)
  };
}
function SQR(T, R) {
  HR(T, R.queueSize);
}
function OQR(T) {
  return {
    history: LFT(T)
  };
}
function dQR(T, R) {
  MFT(T, R.history);
}
function EQR(T) {
  return {
    rid: UR(T),
    rpcs: BFT(T)
  };
}
function CQR(T, R) {
  HR(T, R.rid), NFT(T, R.rpcs);
}
function LQR(T) {
  return {
    connections: GaT(T)
  };
}
function MQR(T, R) {
  KaT(T, R.connections);
}
function DQR(T) {
  return {
    message: KR(T)
  };
}
function wQR(T, R) {
  YR(T, R.message);
}
function BQR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: rQR(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: eQR(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: iQR(T)
      };
    case 3:
      return {
        tag: "ConnectionsUpdated",
        val: LQR(T)
      };
    case 4:
      return {
        tag: "QueueUpdated",
        val: jQR(T)
      };
    case 5:
      return {
        tag: "StateUpdated",
        val: $QR(T)
      };
    case 6:
      return {
        tag: "WorkflowHistoryUpdated",
        val: OQR(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: EQR(T)
      };
    case 8:
      return {
        tag: "TraceQueryResponse",
        val: sQR(T)
      };
    case 9:
      return {
        tag: "QueueResponse",
        val: bQR(T)
      };
    case 10:
      return {
        tag: "WorkflowHistoryResponse",
        val: uQR(T)
      };
    case 11:
      return {
        tag: "WorkflowReplayResponse",
        val: PQR(T)
      };
    case 12:
      return {
        tag: "Error",
        val: DQR(T)
      };
    case 13:
      return {
        tag: "Init",
        val: RQR(T)
      };
    case 14:
      return {
        tag: "DatabaseSchemaResponse",
        val: xQR(T)
      };
    case 15:
      return {
        tag: "DatabaseTableRowsResponse",
        val: IQR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function NQR(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), hQR(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), tQR(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), cQR(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 3), MQR(T, R.val);
        break;
      }
    case "QueueUpdated":
      {
        dR(T, 4), SQR(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 5), vQR(T, R.val);
        break;
      }
    case "WorkflowHistoryUpdated":
      {
        dR(T, 6), dQR(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), CQR(T, R.val);
        break;
      }
    case "TraceQueryResponse":
      {
        dR(T, 8), oQR(T, R.val);
        break;
      }
    case "QueueResponse":
      {
        dR(T, 9), mQR(T, R.val);
        break;
      }
    case "WorkflowHistoryResponse":
      {
        dR(T, 10), yQR(T, R.val);
        break;
      }
    case "WorkflowReplayResponse":
      {
        dR(T, 11), kQR(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 12), wQR(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 13), aQR(T, R.val);
        break;
      }
    case "DatabaseSchemaResponse":
      {
        dR(T, 14), fQR(T, R.val);
        break;
      }
    case "DatabaseTableRowsResponse":
      {
        dR(T, 15), gQR(T, R.val);
        break;
      }
  }
}
function UQR(T) {
  return {
    body: BQR(T)
  };
}
function HQR(T, R) {
  NQR(T, R.body);
}
function WQR(T) {
  let R = new A0(new Uint8Array(wk.initialBufferLength), wk);
  return HQR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function qQR(T) {
  let R = new A0(T, wk),
    a = UQR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function zQR(T) {
  return {
    state: E0(T)
  };
}
function FQR(T, R) {
  C0(T, R.state);
}
function GQR(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function KQR(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function VQR(T) {
  return {
    id: UR(T)
  };
}
function XQR(T, R) {
  HR(T, R.id);
}
function YQR(T) {
  return {
    id: UR(T)
  };
}
function QQR(T, R) {
  HR(T, R.id);
}
function ZQR(T) {
  return {
    id: UR(T)
  };
}
function JQR(T, R) {
  HR(T, R.id);
}
function TZR(T) {
  return {
    id: UR(T)
  };
}
function RZR(T, R) {
  HR(T, R.id);
}
function aZR(T) {
  return {
    id: UR(T)
  };
}
function eZR(T, R) {
  HR(T, R.id);
}
function tZR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: zQR(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: VQR(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: YQR(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: GQR(T)
      };
    case 4:
      return {
        tag: "EventsRequest",
        val: ZQR(T)
      };
    case 5:
      return {
        tag: "ClearEventsRequest",
        val: TZR(T)
      };
    case 6:
      return {
        tag: "RpcsListRequest",
        val: aZR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function rZR(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), FQR(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), XQR(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), QQR(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), KQR(T, R.val);
        break;
      }
    case "EventsRequest":
      {
        dR(T, 4), JQR(T, R.val);
        break;
      }
    case "ClearEventsRequest":
      {
        dR(T, 5), RZR(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 6), eZR(T, R.val);
        break;
      }
  }
}
function hZR(T) {
  return {
    body: tZR(T)
  };
}
function iZR(T, R) {
  rZR(T, R.body);
}
function cZR(T) {
  let R = new A0(new Uint8Array(Bk.initialBufferLength), Bk);
  return iZR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function sZR(T) {
  let R = new A0(T, Bk),
    a = hZR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function UFT(T) {
  return E0(T);
}
function HFT(T, R) {
  C0(T, R);
}
function xyT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function oZR(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function nZR(T) {
  return {
    name: KR(T),
    args: E0(T),
    connId: KR(T)
  };
}
function lZR(T, R) {
  YR(T, R.name), C0(T, R.args), YR(T, R.connId);
}
function AZR(T) {
  return {
    eventName: KR(T),
    args: E0(T)
  };
}
function pZR(T, R) {
  YR(T, R.eventName), C0(T, R.args);
}
function _ZR(T) {
  return {
    eventName: KR(T),
    connId: KR(T)
  };
}
function bZR(T, R) {
  YR(T, R.eventName), YR(T, R.connId);
}
function mZR(T) {
  return {
    eventName: KR(T),
    connId: KR(T)
  };
}
function uZR(T, R) {
  YR(T, R.eventName), YR(T, R.connId);
}
function yZR(T) {
  return {
    eventName: KR(T),
    args: E0(T),
    connId: KR(T)
  };
}
function PZR(T, R) {
  YR(T, R.eventName), C0(T, R.args), YR(T, R.connId);
}
function kZR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionEvent",
        val: nZR(T)
      };
    case 1:
      return {
        tag: "BroadcastEvent",
        val: AZR(T)
      };
    case 2:
      return {
        tag: "SubscribeEvent",
        val: _ZR(T)
      };
    case 3:
      return {
        tag: "UnSubscribeEvent",
        val: mZR(T)
      };
    case 4:
      return {
        tag: "FiredEvent",
        val: yZR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function xZR(T, R) {
  switch (R.tag) {
    case "ActionEvent":
      {
        dR(T, 0), lZR(T, R.val);
        break;
      }
    case "BroadcastEvent":
      {
        dR(T, 1), pZR(T, R.val);
        break;
      }
    case "SubscribeEvent":
      {
        dR(T, 2), bZR(T, R.val);
        break;
      }
    case "UnSubscribeEvent":
      {
        dR(T, 3), uZR(T, R.val);
        break;
      }
    case "FiredEvent":
      {
        dR(T, 4), PZR(T, R.val);
        break;
      }
  }
}
function fyT(T) {
  return {
    id: KR(T),
    timestamp: UR(T),
    body: kZR(T)
  };
}
function fZR(T, R) {
  YR(T, R.id), HR(T, R.timestamp), xZR(T, R.body);
}
function YaT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [xyT(T)];
  for (let e = 1; e < R; e++) a[e] = xyT(T);
  return a;
}
function QaT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) oZR(T, R[a]);
}
function ZaT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [fyT(T)];
  for (let e = 1; e < R; e++) a[e] = fyT(T);
  return a;
}
function JaT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) fZR(T, R[a]);
}
function WFT(T) {
  return q0(T) ? UFT(T) : null;
}
function qFT(T, R) {
  if (z0(T, R !== null), R !== null) HFT(T, R);
}
function zFT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function FFT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function IZR(T) {
  return {
    connections: YaT(T),
    events: ZaT(T),
    state: WFT(T),
    isStateEnabled: q0(T),
    rpcs: zFT(T),
    isDatabaseEnabled: q0(T)
  };
}
function gZR(T, R) {
  QaT(T, R.connections), JaT(T, R.events), qFT(T, R.state), z0(T, R.isStateEnabled), FFT(T, R.rpcs), z0(T, R.isDatabaseEnabled);
}
function $ZR(T) {
  return {
    rid: UR(T),
    connections: YaT(T)
  };
}
function vZR(T, R) {
  HR(T, R.rid), QaT(T, R.connections);
}
function jZR(T) {
  return {
    rid: UR(T),
    state: WFT(T),
    isStateEnabled: q0(T)
  };
}
function SZR(T, R) {
  HR(T, R.rid), qFT(T, R.state), z0(T, R.isStateEnabled);
}
function OZR(T) {
  return {
    rid: UR(T),
    events: ZaT(T)
  };
}
function dZR(T, R) {
  HR(T, R.rid), JaT(T, R.events);
}
function EZR(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function CZR(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function LZR(T) {
  return {
    state: UFT(T)
  };
}
function MZR(T, R) {
  HFT(T, R.state);
}
function DZR(T) {
  return {
    events: ZaT(T)
  };
}
function wZR(T, R) {
  JaT(T, R.events);
}
function BZR(T) {
  return {
    rid: UR(T),
    rpcs: zFT(T)
  };
}
function NZR(T, R) {
  HR(T, R.rid), FFT(T, R.rpcs);
}
function UZR(T) {
  return {
    connections: YaT(T)
  };
}
function HZR(T, R) {
  QaT(T, R.connections);
}
function WZR(T) {
  return {
    message: KR(T)
  };
}
function qZR(T, R) {
  YR(T, R.message);
}
function zZR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: jZR(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: $ZR(T)
      };
    case 2:
      return {
        tag: "EventsResponse",
        val: OZR(T)
      };
    case 3:
      return {
        tag: "ActionResponse",
        val: EZR(T)
      };
    case 4:
      return {
        tag: "ConnectionsUpdated",
        val: UZR(T)
      };
    case 5:
      return {
        tag: "EventsUpdated",
        val: DZR(T)
      };
    case 6:
      return {
        tag: "StateUpdated",
        val: LZR(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: BZR(T)
      };
    case 8:
      return {
        tag: "Error",
        val: WZR(T)
      };
    case 9:
      return {
        tag: "Init",
        val: IZR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function FZR(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), SZR(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), vZR(T, R.val);
        break;
      }
    case "EventsResponse":
      {
        dR(T, 2), dZR(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 3), CZR(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 4), HZR(T, R.val);
        break;
      }
    case "EventsUpdated":
      {
        dR(T, 5), wZR(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 6), MZR(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), NZR(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 8), qZR(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 9), gZR(T, R.val);
        break;
      }
  }
}
function GZR(T) {
  return {
    body: zZR(T)
  };
}
function KZR(T, R) {
  FZR(T, R.body);
}
function VZR(T) {
  let R = new A0(new Uint8Array(Bk.initialBufferLength), Bk);
  return KZR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function XZR(T) {
  let R = new A0(T, Bk),
    a = GZR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function YZR(T) {
  return {
    state: E0(T)
  };
}
function QZR(T, R) {
  C0(T, R.state);
}
function ZZR(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function JZR(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function TJR(T) {
  return {
    id: UR(T)
  };
}
function RJR(T, R) {
  HR(T, R.id);
}
function aJR(T) {
  return {
    id: UR(T)
  };
}
function eJR(T, R) {
  HR(T, R.id);
}
function tJR(T) {
  return {
    id: UR(T)
  };
}
function rJR(T, R) {
  HR(T, R.id);
}
function hJR(T) {
  return {
    id: UR(T),
    startMs: UR(T),
    endMs: UR(T),
    limit: UR(T)
  };
}
function iJR(T, R) {
  HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit);
}
function cJR(T) {
  return {
    id: UR(T),
    limit: UR(T)
  };
}
function sJR(T, R) {
  HR(T, R.id), HR(T, R.limit);
}
function oJR(T) {
  return {
    id: UR(T)
  };
}
function nJR(T, R) {
  HR(T, R.id);
}
function lJR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: YZR(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: TJR(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: aJR(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: ZZR(T)
      };
    case 4:
      return {
        tag: "RpcsListRequest",
        val: tJR(T)
      };
    case 5:
      return {
        tag: "TraceQueryRequest",
        val: hJR(T)
      };
    case 6:
      return {
        tag: "QueueRequest",
        val: cJR(T)
      };
    case 7:
      return {
        tag: "WorkflowHistoryRequest",
        val: oJR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function AJR(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), QZR(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), RJR(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), eJR(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), JZR(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 4), rJR(T, R.val);
        break;
      }
    case "TraceQueryRequest":
      {
        dR(T, 5), iJR(T, R.val);
        break;
      }
    case "QueueRequest":
      {
        dR(T, 6), sJR(T, R.val);
        break;
      }
    case "WorkflowHistoryRequest":
      {
        dR(T, 7), nJR(T, R.val);
        break;
      }
  }
}
function pJR(T) {
  return {
    body: lJR(T)
  };
}
function _JR(T, R) {
  AJR(T, R.body);
}
function bJR(T) {
  let R = new A0(new Uint8Array(Nk.initialBufferLength), Nk);
  return _JR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function mJR(T) {
  let R = new A0(T, Nk),
    a = pJR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function GFT(T) {
  return E0(T);
}
function KFT(T, R) {
  C0(T, R);
}
function IyT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function uJR(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function VFT(T) {
  return E0(T);
}
function XFT(T, R) {
  C0(T, R);
}
function TeT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [IyT(T)];
  for (let e = 1; e < R; e++) a[e] = IyT(T);
  return a;
}
function ReT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) uJR(T, R[a]);
}
function YFT(T) {
  return q0(T) ? GFT(T) : null;
}
function QFT(T, R) {
  if (z0(T, R !== null), R !== null) KFT(T, R);
}
function ZFT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function JFT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function T2T(T) {
  return q0(T) ? VFT(T) : null;
}
function R2T(T, R) {
  if (z0(T, R !== null), R !== null) XFT(T, R);
}
function yJR(T) {
  return {
    connections: TeT(T),
    state: YFT(T),
    isStateEnabled: q0(T),
    rpcs: ZFT(T),
    isDatabaseEnabled: q0(T),
    queueSize: UR(T),
    workflowHistory: T2T(T),
    isWorkflowEnabled: q0(T)
  };
}
function PJR(T, R) {
  ReT(T, R.connections), QFT(T, R.state), z0(T, R.isStateEnabled), JFT(T, R.rpcs), z0(T, R.isDatabaseEnabled), HR(T, R.queueSize), R2T(T, R.workflowHistory), z0(T, R.isWorkflowEnabled);
}
function kJR(T) {
  return {
    rid: UR(T),
    connections: TeT(T)
  };
}
function xJR(T, R) {
  HR(T, R.rid), ReT(T, R.connections);
}
function fJR(T) {
  return {
    rid: UR(T),
    state: YFT(T),
    isStateEnabled: q0(T)
  };
}
function IJR(T, R) {
  HR(T, R.rid), QFT(T, R.state), z0(T, R.isStateEnabled);
}
function gJR(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function $JR(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function vJR(T) {
  return {
    rid: UR(T),
    payload: E0(T)
  };
}
function jJR(T, R) {
  HR(T, R.rid), C0(T, R.payload);
}
function gyT(T) {
  return {
    id: UR(T),
    name: KR(T),
    createdAtMs: UR(T)
  };
}
function SJR(T, R) {
  HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs);
}
function OJR(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [gyT(T)];
  for (let e = 1; e < R; e++) a[e] = gyT(T);
  return a;
}
function dJR(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) SJR(T, R[a]);
}
function EJR(T) {
  return {
    size: UR(T),
    maxSize: UR(T),
    messages: OJR(T),
    truncated: q0(T)
  };
}
function CJR(T, R) {
  HR(T, R.size), HR(T, R.maxSize), dJR(T, R.messages), z0(T, R.truncated);
}
function LJR(T) {
  return {
    rid: UR(T),
    status: EJR(T)
  };
}
function MJR(T, R) {
  HR(T, R.rid), CJR(T, R.status);
}
function DJR(T) {
  return {
    rid: UR(T),
    history: T2T(T),
    isWorkflowEnabled: q0(T)
  };
}
function wJR(T, R) {
  HR(T, R.rid), R2T(T, R.history), z0(T, R.isWorkflowEnabled);
}
function BJR(T) {
  return {
    state: GFT(T)
  };
}
function NJR(T, R) {
  KFT(T, R.state);
}
function UJR(T) {
  return {
    queueSize: UR(T)
  };
}
function HJR(T, R) {
  HR(T, R.queueSize);
}
function WJR(T) {
  return {
    history: VFT(T)
  };
}
function qJR(T, R) {
  XFT(T, R.history);
}
function zJR(T) {
  return {
    rid: UR(T),
    rpcs: ZFT(T)
  };
}
function FJR(T, R) {
  HR(T, R.rid), JFT(T, R.rpcs);
}
function GJR(T) {
  return {
    connections: TeT(T)
  };
}
function KJR(T, R) {
  ReT(T, R.connections);
}
function VJR(T) {
  return {
    message: KR(T)
  };
}
function XJR(T, R) {
  YR(T, R.message);
}
function YJR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: fJR(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: kJR(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: gJR(T)
      };
    case 3:
      return {
        tag: "ConnectionsUpdated",
        val: GJR(T)
      };
    case 4:
      return {
        tag: "QueueUpdated",
        val: UJR(T)
      };
    case 5:
      return {
        tag: "StateUpdated",
        val: BJR(T)
      };
    case 6:
      return {
        tag: "WorkflowHistoryUpdated",
        val: WJR(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: zJR(T)
      };
    case 8:
      return {
        tag: "TraceQueryResponse",
        val: vJR(T)
      };
    case 9:
      return {
        tag: "QueueResponse",
        val: LJR(T)
      };
    case 10:
      return {
        tag: "WorkflowHistoryResponse",
        val: DJR(T)
      };
    case 11:
      return {
        tag: "Error",
        val: VJR(T)
      };
    case 12:
      return {
        tag: "Init",
        val: yJR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function QJR(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), IJR(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), xJR(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), $JR(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 3), KJR(T, R.val);
        break;
      }
    case "QueueUpdated":
      {
        dR(T, 4), HJR(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 5), NJR(T, R.val);
        break;
      }
    case "WorkflowHistoryUpdated":
      {
        dR(T, 6), qJR(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), FJR(T, R.val);
        break;
      }
    case "TraceQueryResponse":
      {
        dR(T, 8), jJR(T, R.val);
        break;
      }
    case "QueueResponse":
      {
        dR(T, 9), MJR(T, R.val);
        break;
      }
    case "WorkflowHistoryResponse":
      {
        dR(T, 10), wJR(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 11), XJR(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 12), PJR(T, R.val);
        break;
      }
  }
}
function ZJR(T) {
  return {
    body: YJR(T)
  };
}
function JJR(T, R) {
  QJR(T, R.body);
}
function TT0(T) {
  let R = new A0(new Uint8Array(Nk.initialBufferLength), Nk);
  return JJR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function RT0(T) {
  let R = new A0(T, Nk),
    a = ZJR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function aT0(T) {
  return {
    state: E0(T)
  };
}
function eT0(T, R) {
  C0(T, R.state);
}
function tT0(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function rT0(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function hT0(T) {
  return {
    id: UR(T)
  };
}
function iT0(T, R) {
  HR(T, R.id);
}
function cT0(T) {
  return {
    id: UR(T)
  };
}
function sT0(T, R) {
  HR(T, R.id);
}
function oT0(T) {
  return {
    id: UR(T)
  };
}
function nT0(T, R) {
  HR(T, R.id);
}
function lT0(T) {
  return {
    id: UR(T),
    startMs: UR(T),
    endMs: UR(T),
    limit: UR(T)
  };
}
function AT0(T, R) {
  HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit);
}
function pT0(T) {
  return {
    id: UR(T),
    limit: UR(T)
  };
}
function _T0(T, R) {
  HR(T, R.id), HR(T, R.limit);
}
function bT0(T) {
  return {
    id: UR(T)
  };
}
function mT0(T, R) {
  HR(T, R.id);
}
function uT0(T) {
  return {
    id: UR(T)
  };
}
function yT0(T, R) {
  HR(T, R.id);
}
function PT0(T) {
  return {
    id: UR(T),
    table: KR(T),
    limit: UR(T),
    offset: UR(T)
  };
}
function kT0(T, R) {
  HR(T, R.id), YR(T, R.table), HR(T, R.limit), HR(T, R.offset);
}
function xT0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: aT0(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: hT0(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: cT0(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: tT0(T)
      };
    case 4:
      return {
        tag: "RpcsListRequest",
        val: oT0(T)
      };
    case 5:
      return {
        tag: "TraceQueryRequest",
        val: lT0(T)
      };
    case 6:
      return {
        tag: "QueueRequest",
        val: pT0(T)
      };
    case 7:
      return {
        tag: "WorkflowHistoryRequest",
        val: bT0(T)
      };
    case 8:
      return {
        tag: "DatabaseSchemaRequest",
        val: uT0(T)
      };
    case 9:
      return {
        tag: "DatabaseTableRowsRequest",
        val: PT0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function fT0(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), eT0(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), iT0(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), sT0(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), rT0(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 4), nT0(T, R.val);
        break;
      }
    case "TraceQueryRequest":
      {
        dR(T, 5), AT0(T, R.val);
        break;
      }
    case "QueueRequest":
      {
        dR(T, 6), _T0(T, R.val);
        break;
      }
    case "WorkflowHistoryRequest":
      {
        dR(T, 7), mT0(T, R.val);
        break;
      }
    case "DatabaseSchemaRequest":
      {
        dR(T, 8), yT0(T, R.val);
        break;
      }
    case "DatabaseTableRowsRequest":
      {
        dR(T, 9), kT0(T, R.val);
        break;
      }
  }
}
function IT0(T) {
  return {
    body: xT0(T)
  };
}
function gT0(T, R) {
  fT0(T, R.body);
}
function $T0(T) {
  let R = new A0(new Uint8Array(Uk.initialBufferLength), Uk);
  return gT0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function vT0(T) {
  let R = new A0(T, Uk),
    a = IT0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function a2T(T) {
  return E0(T);
}
function e2T(T, R) {
  C0(T, R);
}
function $yT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function jT0(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function t2T(T) {
  return E0(T);
}
function r2T(T, R) {
  C0(T, R);
}
function aeT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [$yT(T)];
  for (let e = 1; e < R; e++) a[e] = $yT(T);
  return a;
}
function eeT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) jT0(T, R[a]);
}
function h2T(T) {
  return q0(T) ? a2T(T) : null;
}
function i2T(T, R) {
  if (z0(T, R !== null), R !== null) e2T(T, R);
}
function c2T(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function s2T(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function o2T(T) {
  return q0(T) ? t2T(T) : null;
}
function n2T(T, R) {
  if (z0(T, R !== null), R !== null) r2T(T, R);
}
function ST0(T) {
  return {
    connections: aeT(T),
    state: h2T(T),
    isStateEnabled: q0(T),
    rpcs: c2T(T),
    isDatabaseEnabled: q0(T),
    queueSize: UR(T),
    workflowHistory: o2T(T),
    isWorkflowEnabled: q0(T)
  };
}
function OT0(T, R) {
  eeT(T, R.connections), i2T(T, R.state), z0(T, R.isStateEnabled), s2T(T, R.rpcs), z0(T, R.isDatabaseEnabled), HR(T, R.queueSize), n2T(T, R.workflowHistory), z0(T, R.isWorkflowEnabled);
}
function dT0(T) {
  return {
    rid: UR(T),
    connections: aeT(T)
  };
}
function ET0(T, R) {
  HR(T, R.rid), eeT(T, R.connections);
}
function CT0(T) {
  return {
    rid: UR(T),
    state: h2T(T),
    isStateEnabled: q0(T)
  };
}
function LT0(T, R) {
  HR(T, R.rid), i2T(T, R.state), z0(T, R.isStateEnabled);
}
function MT0(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function DT0(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function wT0(T) {
  return {
    rid: UR(T),
    payload: E0(T)
  };
}
function BT0(T, R) {
  HR(T, R.rid), C0(T, R.payload);
}
function vyT(T) {
  return {
    id: UR(T),
    name: KR(T),
    createdAtMs: UR(T)
  };
}
function NT0(T, R) {
  HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs);
}
function UT0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [vyT(T)];
  for (let e = 1; e < R; e++) a[e] = vyT(T);
  return a;
}
function HT0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) NT0(T, R[a]);
}
function WT0(T) {
  return {
    size: UR(T),
    maxSize: UR(T),
    messages: UT0(T),
    truncated: q0(T)
  };
}
function qT0(T, R) {
  HR(T, R.size), HR(T, R.maxSize), HT0(T, R.messages), z0(T, R.truncated);
}
function zT0(T) {
  return {
    rid: UR(T),
    status: WT0(T)
  };
}
function FT0(T, R) {
  HR(T, R.rid), qT0(T, R.status);
}
function GT0(T) {
  return {
    rid: UR(T),
    history: o2T(T),
    isWorkflowEnabled: q0(T)
  };
}
function KT0(T, R) {
  HR(T, R.rid), n2T(T, R.history), z0(T, R.isWorkflowEnabled);
}
function VT0(T) {
  return {
    rid: UR(T),
    schema: E0(T)
  };
}
function XT0(T, R) {
  HR(T, R.rid), C0(T, R.schema);
}
function YT0(T) {
  return {
    rid: UR(T),
    result: E0(T)
  };
}
function QT0(T, R) {
  HR(T, R.rid), C0(T, R.result);
}
function ZT0(T) {
  return {
    state: a2T(T)
  };
}
function JT0(T, R) {
  e2T(T, R.state);
}
function TR0(T) {
  return {
    queueSize: UR(T)
  };
}
function RR0(T, R) {
  HR(T, R.queueSize);
}
function aR0(T) {
  return {
    history: t2T(T)
  };
}
function eR0(T, R) {
  r2T(T, R.history);
}
function tR0(T) {
  return {
    rid: UR(T),
    rpcs: c2T(T)
  };
}
function rR0(T, R) {
  HR(T, R.rid), s2T(T, R.rpcs);
}
function hR0(T) {
  return {
    connections: aeT(T)
  };
}
function iR0(T, R) {
  eeT(T, R.connections);
}
function cR0(T) {
  return {
    message: KR(T)
  };
}
function sR0(T, R) {
  YR(T, R.message);
}
function oR0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: CT0(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: dT0(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: MT0(T)
      };
    case 3:
      return {
        tag: "ConnectionsUpdated",
        val: hR0(T)
      };
    case 4:
      return {
        tag: "QueueUpdated",
        val: TR0(T)
      };
    case 5:
      return {
        tag: "StateUpdated",
        val: ZT0(T)
      };
    case 6:
      return {
        tag: "WorkflowHistoryUpdated",
        val: aR0(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: tR0(T)
      };
    case 8:
      return {
        tag: "TraceQueryResponse",
        val: wT0(T)
      };
    case 9:
      return {
        tag: "QueueResponse",
        val: zT0(T)
      };
    case 10:
      return {
        tag: "WorkflowHistoryResponse",
        val: GT0(T)
      };
    case 11:
      return {
        tag: "Error",
        val: cR0(T)
      };
    case 12:
      return {
        tag: "Init",
        val: ST0(T)
      };
    case 13:
      return {
        tag: "DatabaseSchemaResponse",
        val: VT0(T)
      };
    case 14:
      return {
        tag: "DatabaseTableRowsResponse",
        val: YT0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function nR0(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), LT0(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), ET0(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), DT0(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 3), iR0(T, R.val);
        break;
      }
    case "QueueUpdated":
      {
        dR(T, 4), RR0(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 5), JT0(T, R.val);
        break;
      }
    case "WorkflowHistoryUpdated":
      {
        dR(T, 6), eR0(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), rR0(T, R.val);
        break;
      }
    case "TraceQueryResponse":
      {
        dR(T, 8), BT0(T, R.val);
        break;
      }
    case "QueueResponse":
      {
        dR(T, 9), FT0(T, R.val);
        break;
      }
    case "WorkflowHistoryResponse":
      {
        dR(T, 10), KT0(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 11), sR0(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 12), OT0(T, R.val);
        break;
      }
    case "DatabaseSchemaResponse":
      {
        dR(T, 13), XT0(T, R.val);
        break;
      }
    case "DatabaseTableRowsResponse":
      {
        dR(T, 14), QT0(T, R.val);
        break;
      }
  }
}
function lR0(T) {
  return {
    body: oR0(T)
  };
}
function AR0(T, R) {
  nR0(T, R.body);
}
function pR0(T) {
  let R = new A0(new Uint8Array(Uk.initialBufferLength), Uk);
  return AR0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function _R0(T) {
  let R = new A0(T, Uk),
    a = lR0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Xx(T, R) {
  let a = new Uint8Array(T.length + R.length);
  return a.set(T, 0), a.set(R, T.length), a;
}
function Wi(T) {
  let R = new Uint8Array(pA.KV.length + T.length);
  return R.set(pA.KV, 0), R.set(T, pA.KV.length), R;
}
function SyT(T) {
  return T.slice(pA.KV.length);
}
function qi(T, R) {
  if (T instanceof Uint8Array) return T;
  if ((R ?? "text") === "binary") throw TypeError("Expected a Uint8Array when keyType is binary");
  return m2T.encode(T);
}
function OyT(T, R) {
  switch (R ?? "text") {
    case "text":
      return u2T.decode(T);
    case "binary":
      return T;
    default:
      throw TypeError("Invalid kv key type");
  }
}
function wR0(T) {
  if (typeof T === "string") return "text";
  if (T instanceof Uint8Array) return "binary";
  if (T instanceof ArrayBuffer) return "arrayBuffer";
  throw TypeError("Invalid kv value");
}
function dyT(T, R) {
  switch ((R == null ? void 0 : R.type) ?? wR0(T)) {
    case "text":
      if (typeof T !== "string") throw TypeError("Expected a string when type is text");
      return m2T.encode(T);
    case "arrayBuffer":
      if (!(T instanceof ArrayBuffer)) throw TypeError("Expected an ArrayBuffer when type is arrayBuffer");
      return new Uint8Array(T);
    case "binary":
      if (!(T instanceof Uint8Array)) throw TypeError("Expected a Uint8Array when type is binary");
      return T;
    default:
      throw TypeError("Invalid kv value type");
  }
}
function c4(T, R) {
  switch ((R == null ? void 0 : R.type) ?? "text") {
    case "text":
      return u2T.decode(T);
    case "arrayBuffer":
      {
        let a = new Uint8Array(T.byteLength);
        return a.set(T), a.buffer;
      }
    case "binary":
      return T;
    default:
      throw TypeError("Invalid kv value type");
  }
}
function NR0() {
  return Vx("actor-runtime");
}
function EyT(T) {
  throw NR0().error({
    msg: "unreachable",
    value: `${T}`,
    stack: Error().stack
  }), new f1R(T);
}
function UR0(...T) {
  let R = T.filter(r => r !== void 0);
  if (R.length === 0) return {
    signal: void 0,
    cleanup: () => {}
  };
  if (R.length === 1) return {
    signal: R[0],
    cleanup: () => {}
  };
  let a = new AbortController();
  if (R.some(r => r.aborted)) return a.abort(), {
    signal: a.signal,
    cleanup: () => {}
  };
  let e = () => {
      for (let r of R) r.removeEventListener("abort", t);
    },
    t = () => {
      a.abort(), e();
    };
  for (let r of R) r.addEventListener("abort", t, {
    once: !0
  });
  return {
    signal: a.signal,
    cleanup: e
  };
}
function WR0(T) {
  return typeof T === "object" && T !== null && "~standard" in T;
}
function qR0(T) {
  if (y2T(T)) return !1;
  return typeof T === "object" && T !== null && "message" in T && T.message !== void 0;
}
function y2T(T) {
  return typeof T === "object" && T !== null && "schema" in T && T.schema !== void 0;
}
function P2T(T, R) {
  if (!T) return !1;
  return Object.prototype.hasOwnProperty.call(T, R);
}
function zR0(T) {
  if (!T) return;
  if (y2T(T)) return T.schema;
  if (qR0(T)) return T.message;
  if (typeof T === "object" && T !== null && "schema" in T && T.schema !== void 0) return T.schema;
  if (typeof T === "object" && T !== null && "message" in T && T.message !== void 0) return T.message;
  return T;
}
function FR0(T) {
  return typeof T === "object" && T !== null && "then" in T && typeof T.then === "function";
}
function k2T(T, R, a) {
  let e = zR0(T == null ? void 0 : T[R]);
  if (!e) return {
    success: !0,
    data: a
  };
  if (WR0(e)) {
    let t = e["~standard"].validate(a);
    if (FR0(t)) throw new v1R("async schema validation");
    if (t.issues) return {
      success: !1,
      issues: [...t.issues]
    };
    return {
      success: !0,
      data: t.value
    };
  }
  return {
    success: !0,
    data: a
  };
}
class cS {
  constructor(T) {
    if (T) {
      if ((T.keyMap || T._keyMap) && !T.useRecords) T.useRecords = !1, T.mapsAsObjects = !0;
      if (T.useRecords === !1 && T.mapsAsObjects === void 0) T.mapsAsObjects = !0;
      if (T.getStructures) T.getShared = T.getStructures;
      if (T.getShared && !T.structures) (T.structures = []).uninitialized = !0;
      if (T.keyMap) {
        this.mapKey = new Map();
        for (let [R, a] of Object.entries(T.keyMap)) this.mapKey.set(a, R);
      }
    }
    Object.assign(this, T);
  }
  decodeKey(T) {
    return this.keyMap ? this.mapKey.get(T) || T : T;
  }
  encodeKey(T) {
    return this.keyMap && this.keyMap.hasOwnProperty(T) ? this.keyMap[T] : T;
  }
  encodeKeys(T) {
    if (!this._keyMap) return T;
    let R = new Map();
    for (let [a, e] of Object.entries(T)) R.set(this._keyMap.hasOwnProperty(a) ? this._keyMap[a] : a, e);
    return R;
  }
  decodeKeys(T) {
    if (!this._keyMap || T.constructor.name != "Map") return T;
    if (!this._mapKey) {
      this._mapKey = new Map();
      for (let [a, e] of Object.entries(this._keyMap)) this._mapKey.set(e, a);
    }
    let R = {};
    return T.forEach((a, e) => R[ii(this._mapKey.has(e) ? this._mapKey.get(e) : e)] = a), R;
  }
  mapDecode(T, R) {
    let a = this.decode(T);
    if (this._keyMap) switch (a.constructor.name) {
      case "Array":
        return a.map(e => this.decodeKeys(e));
    }
    return a;
  }
  decode(T, R) {
    if (L0) return v2T(() => {
      return r1(), this ? this.decode(T, R) : cS.prototype.decode.call(DyT, T, R);
    });
    _A = R > -1 ? R : T.length, CR = 0, tS = 0, zb = 0, rS = null, eb = teT, Oa = null, L0 = T;
    try {
      St = T.dataView || (T.dataView = new DataView(T.buffer, T.byteOffset, T.byteLength));
    } catch (a) {
      if (L0 = null, T instanceof Uint8Array) throw a;
      throw Error("Source must be a Uint8Array or Buffer but was a " + (T && typeof T == "object" ? T.constructor.name : typeof T));
    }
    if (this instanceof cS) {
      if (R8 = this, Ir = this.sharedValues && (this.pack ? Array(this.maxPrivatePackedValues || 16).concat(this.sharedValues) : this.sharedValues), this.structures) return ia = this.structures, s4();else if (!ia || ia.length > 0) ia = [];
    } else {
      if (R8 = DyT, !ia || ia.length > 0) ia = [];
      Ir = null;
    }
    return s4();
  }
  decodeMultiple(T, R) {
    let a,
      e = 0;
    try {
      let t = T.length;
      iS = !0;
      let r = this ? this.decode(T, t) : ieT.decode(T, t);
      if (R) {
        if (R(r) === !1) return;
        while (CR < t) if (e = CR, R(s4()) === !1) return;
      } else {
        a = [r];
        while (CR < t) e = CR, a.push(s4());
        return a;
      }
    } catch (t) {
      throw t.lastPosition = e, t.values = a, t;
    } finally {
      iS = !1, r1();
    }
  }
}
function s4() {
  try {
    let T = r8();
    if (Oa) {
      if (CR >= Oa.postBundlePosition) {
        let R = Error("Unexpected bundle position");
        throw R.incomplete = !0, R;
      }
      CR = Oa.postBundlePosition, Oa = null;
    }
    if (CR == _A) {
      if (ia = null, L0 = null, hi) hi = null;
    } else if (CR > _A) {
      let R = Error("Unexpected end of CBOR data");
      throw R.incomplete = !0, R;
    } else if (!iS) throw Error("Data read, but end of buffer not reached");
    return T;
  } catch (T) {
    if (r1(), T instanceof RangeError || T.message.startsWith("Unexpected end of buffer")) T.incomplete = !0;
    throw T;
  }
}
function r8() {
  let T = L0[CR++],
    R = T >> 5;
  if (T = T & 31, T > 23) switch (T) {
    case 24:
      T = L0[CR++];
      break;
    case 25:
      if (R == 7) return a00();
      T = St.getUint16(CR), CR += 2;
      break;
    case 26:
      if (R == 7) {
        let a = St.getFloat32(CR);
        if (R8.useFloat32 > 2) {
          let e = heT[(L0[CR] & 127) << 1 | L0[CR + 1] >> 7];
          return CR += 4, (e * a + (a > 0 ? 0.5 : -0.5) >> 0) / e;
        }
        return CR += 4, a;
      }
      if (T = St.getUint32(CR), CR += 4, R === 1) return -1 - T;
      break;
    case 27:
      if (R == 7) {
        let a = St.getFloat64(CR);
        return CR += 8, a;
      }
      if (R > 1) {
        if (St.getUint32(CR) > 0) throw Error("JavaScript does not support arrays, maps, or strings with length over 4294967295");
        T = St.getUint32(CR + 4);
      } else if (R8.int64AsNumber) T = St.getUint32(CR) * 4294967296, T += St.getUint32(CR + 4);else T = St.getBigUint64(CR);
      CR += 8;
      break;
    case 31:
      switch (R) {
        case 2:
        case 3:
          throw Error("Indefinite length not supported for byte or text strings");
        case 4:
          let a = [],
            e,
            t = 0;
          while ((e = r8()) != Zu) {
            if (t >= GI) throw Error(`Array length exceeds ${GI}`);
            a[t++] = e;
          }
          return R == 4 ? a : R == 3 ? a.join("") : Buffer.concat(a);
        case 5:
          let r;
          if (R8.mapsAsObjects) {
            let h = {},
              i = 0;
            if (R8.keyMap) while ((r = r8()) != Zu) {
              if (i++ >= Io) throw Error(`Property count exceeds ${Io}`);
              h[ii(R8.decodeKey(r))] = r8();
            } else while ((r = r8()) != Zu) {
              if (i++ >= Io) throw Error(`Property count exceeds ${Io}`);
              h[ii(r)] = r8();
            }
            return h;
          } else {
            if (_$) R8.mapsAsObjects = !0, _$ = !1;
            let h = new Map();
            if (R8.keyMap) {
              let i = 0;
              while ((r = r8()) != Zu) {
                if (i++ >= Io) throw Error(`Map size exceeds ${Io}`);
                h.set(R8.decodeKey(r), r8());
              }
            } else {
              let i = 0;
              while ((r = r8()) != Zu) {
                if (i++ >= Io) throw Error(`Map size exceeds ${Io}`);
                h.set(r, r8());
              }
            }
            return h;
          }
        case 7:
          return Zu;
        default:
          throw Error("Invalid major type for indefinite length " + R);
      }
    default:
      throw Error("Unknown token " + T);
  }
  switch (R) {
    case 0:
      return T;
    case 1:
      return ~T;
    case 2:
      return R00(T);
    case 3:
      if (zb >= CR) return rS.slice(CR - hS, (CR += T) - hS);
      if (zb == 0 && _A < 140 && T < 32) {
        let t = T < 16 ? I2T(T) : T00(T);
        if (t != null) return t;
      }
      return f2T(T);
    case 4:
      if (T >= GI) throw Error(`Array length exceeds ${GI}`);
      let a = Array(T);
      for (let t = 0; t < T; t++) a[t] = r8();
      return a;
    case 5:
      if (T >= Io) throw Error(`Map size exceeds ${GI}`);
      if (R8.mapsAsObjects) {
        let t = {};
        if (R8.keyMap) for (let r = 0; r < T; r++) t[ii(R8.decodeKey(r8()))] = r8();else for (let r = 0; r < T; r++) t[ii(r8())] = r8();
        return t;
      } else {
        if (_$) R8.mapsAsObjects = !0, _$ = !1;
        let t = new Map();
        if (R8.keyMap) for (let r = 0; r < T; r++) t.set(R8.decodeKey(r8()), r8());else for (let r = 0; r < T; r++) t.set(r8(), r8());
        return t;
      }
    case 6:
      if (T >= LyT) {
        let t = ia[T & 8191];
        if (t) {
          if (!t.read) t.read = e1(t);
          return t.read();
        }
        if (T < 65536) {
          if (T == VR0) {
            let r = hP(),
              h = r8(),
              i = r8();
            t1(h, i);
            let c = {};
            if (R8.keyMap) for (let s = 2; s < r; s++) {
              let A = R8.decodeKey(i[s - 2]);
              c[ii(A)] = r8();
            } else for (let s = 2; s < r; s++) {
              let A = i[s - 2];
              c[ii(A)] = r8();
            }
            return c;
          } else if (T == KR0) {
            let r = hP(),
              h = r8();
            for (let i = 2; i < r; i++) t1(h++, r8());
            return r8();
          } else if (T == LyT) return c00();
          if (R8.getShared) {
            if (reT(), t = ia[T & 8191], t) {
              if (!t.read) t.read = e1(t);
              return t.read();
            }
          }
        }
      }
      let e = Ea[T];
      if (e) {
        if (e.handlesRead) return e(r8);else return e(r8());
      } else {
        let t = r8();
        for (let r = 0; r < a1.length; r++) {
          let h = a1[r](T, t);
          if (h !== void 0) return h;
        }
        return new OA(t, T);
      }
    case 7:
      switch (T) {
        case 20:
          return !1;
        case 21:
          return !0;
        case 22:
          return null;
        case 23:
          return;
        case 31:
        default:
          let t = (Ir || O_())[T];
          if (t !== void 0) return t;
          throw Error("Unknown token " + T);
      }
    default:
      if (isNaN(T)) {
        let t = Error("Unexpected end of CBOR data");
        throw t.incomplete = !0, t;
      }
      throw Error("Unknown CBOR token " + T);
  }
}
function e1(T) {
  if (!T) throw Error("Structure is required in record definition");
  function R() {
    let a = L0[CR++];
    if (a = a & 31, a > 23) switch (a) {
      case 24:
        a = L0[CR++];
        break;
      case 25:
        a = St.getUint16(CR), CR += 2;
        break;
      case 26:
        a = St.getUint32(CR), CR += 4;
        break;
      default:
        throw Error("Expected array header, but got " + L0[CR - 1]);
    }
    let e = this.compiledReader;
    while (e) {
      if (e.propertyCount === a) return e(r8);
      e = e.next;
    }
    if (this.slowReads++ >= x2T) {
      let r = this.length == a ? this : this.slice(0, a);
      if (e = R8.keyMap ? Function("r", "return {" + r.map(h => R8.decodeKey(h)).map(h => wyT.test(h) ? ii(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}") : Function("r", "return {" + r.map(h => wyT.test(h) ? ii(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}"), this.compiledReader) e.next = this.compiledReader;
      return e.propertyCount = a, this.compiledReader = e, e(r8);
    }
    let t = {};
    if (R8.keyMap) for (let r = 0; r < a; r++) t[ii(R8.decodeKey(this[r]))] = r8();else for (let r = 0; r < a; r++) t[ii(this[r])] = r8();
    return t;
  }
  return T.slowReads = 0, R;
}
function ii(T) {
  if (typeof T === "string") return T === "__proto__" ? "__proto_" : T;
  if (typeof T === "number" || typeof T === "boolean" || typeof T === "bigint") return T.toString();
  if (T == null) return T + "";
  throw Error("Invalid property name type " + typeof T);
}
function JR0(T) {
  ZR0 = !0, f2T = R(1), XR0 = R(2), YR0 = R(3), QR0 = R(5);
  function R(a) {
    return function (e) {
      let t = eb[tS++];
      if (t == null) {
        if (Oa) return Fb(e);
        let h = T(CR, _A, e, L0);
        if (typeof h == "string") t = h, eb = teT;else if (eb = h, tS = 1, zb = 1, t = eb[0], t === void 0) throw Error("Unexpected end of buffer");
      }
      let r = t.length;
      if (r <= e) return CR += e, t;
      return rS = t, hS = CR, zb = CR + r, CR += e, t.slice(0, e);
    };
  }
}
function Fb(T) {
  let R;
  if (T < 16) {
    if (R = I2T(T)) return R;
  }
  if (T > 64 && R1) return R1.decode(L0.subarray(CR, CR += T));
  let a = CR + T,
    e = [];
  R = "";
  while (CR < a) {
    let t = L0[CR++];
    if ((t & 128) === 0) e.push(t);else if ((t & 224) === 192) {
      let r = L0[CR++] & 63,
        h = (t & 31) << 6 | r;
      if (h < 128) e.push(65533);else e.push(h);
    } else if ((t & 240) === 224) {
      let r = L0[CR++] & 63,
        h = L0[CR++] & 63,
        i = (t & 31) << 12 | r << 6 | h;
      if (i < 2048 || i >= 55296 && i <= 57343) e.push(65533);else e.push(i);
    } else if ((t & 248) === 240) {
      let r = L0[CR++] & 63,
        h = L0[CR++] & 63,
        i = L0[CR++] & 63,
        c = (t & 7) << 18 | r << 12 | h << 6 | i;
      if (c < 65536 || c > 1114111) e.push(65533);else if (c > 65535) c -= 65536, e.push(c >>> 10 & 1023 | 55296), c = 56320 | c & 1023, e.push(c);else e.push(c);
    } else e.push(65533);
    if (e.length >= 4096) R += le.apply(String, e), e.length = 0;
  }
  if (e.length > 0) R += le.apply(String, e);
  return R;
}
function T00(T) {
  let R = CR,
    a = Array(T);
  for (let e = 0; e < T; e++) {
    let t = L0[CR++];
    if ((t & 128) > 0) {
      CR = R;
      return;
    }
    a[e] = t;
  }
  return le.apply(String, a);
}
function I2T(T) {
  if (T < 4) {
    if (T < 2) {
      if (T === 0) return "";else {
        let R = L0[CR++];
        if ((R & 128) > 1) {
          CR -= 1;
          return;
        }
        return le(R);
      }
    } else {
      let R = L0[CR++],
        a = L0[CR++];
      if ((R & 128) > 0 || (a & 128) > 0) {
        CR -= 2;
        return;
      }
      if (T < 3) return le(R, a);
      let e = L0[CR++];
      if ((e & 128) > 0) {
        CR -= 3;
        return;
      }
      return le(R, a, e);
    }
  } else {
    let R = L0[CR++],
      a = L0[CR++],
      e = L0[CR++],
      t = L0[CR++];
    if ((R & 128) > 0 || (a & 128) > 0 || (e & 128) > 0 || (t & 128) > 0) {
      CR -= 4;
      return;
    }
    if (T < 6) {
      if (T === 4) return le(R, a, e, t);else {
        let r = L0[CR++];
        if ((r & 128) > 0) {
          CR -= 5;
          return;
        }
        return le(R, a, e, t, r);
      }
    } else if (T < 8) {
      let r = L0[CR++],
        h = L0[CR++];
      if ((r & 128) > 0 || (h & 128) > 0) {
        CR -= 6;
        return;
      }
      if (T < 7) return le(R, a, e, t, r, h);
      let i = L0[CR++];
      if ((i & 128) > 0) {
        CR -= 7;
        return;
      }
      return le(R, a, e, t, r, h, i);
    } else {
      let r = L0[CR++],
        h = L0[CR++],
        i = L0[CR++],
        c = L0[CR++];
      if ((r & 128) > 0 || (h & 128) > 0 || (i & 128) > 0 || (c & 128) > 0) {
        CR -= 8;
        return;
      }
      if (T < 10) {
        if (T === 8) return le(R, a, e, t, r, h, i, c);else {
          let s = L0[CR++];
          if ((s & 128) > 0) {
            CR -= 9;
            return;
          }
          return le(R, a, e, t, r, h, i, c, s);
        }
      } else if (T < 12) {
        let s = L0[CR++],
          A = L0[CR++];
        if ((s & 128) > 0 || (A & 128) > 0) {
          CR -= 10;
          return;
        }
        if (T < 11) return le(R, a, e, t, r, h, i, c, s, A);
        let l = L0[CR++];
        if ((l & 128) > 0) {
          CR -= 11;
          return;
        }
        return le(R, a, e, t, r, h, i, c, s, A, l);
      } else {
        let s = L0[CR++],
          A = L0[CR++],
          l = L0[CR++],
          o = L0[CR++];
        if ((s & 128) > 0 || (A & 128) > 0 || (l & 128) > 0 || (o & 128) > 0) {
          CR -= 12;
          return;
        }
        if (T < 14) {
          if (T === 12) return le(R, a, e, t, r, h, i, c, s, A, l, o);else {
            let n = L0[CR++];
            if ((n & 128) > 0) {
              CR -= 13;
              return;
            }
            return le(R, a, e, t, r, h, i, c, s, A, l, o, n);
          }
        } else {
          let n = L0[CR++],
            p = L0[CR++];
          if ((n & 128) > 0 || (p & 128) > 0) {
            CR -= 14;
            return;
          }
          if (T < 15) return le(R, a, e, t, r, h, i, c, s, A, l, o, n, p);
          let _ = L0[CR++];
          if ((_ & 128) > 0) {
            CR -= 15;
            return;
          }
          return le(R, a, e, t, r, h, i, c, s, A, l, o, n, p, _);
        }
      }
    }
  }
}
function R00(T) {
  return R8.copyBuffers ? Uint8Array.prototype.slice.call(L0, CR, CR += T) : L0.subarray(CR, CR += T);
}
function a00() {
  let T = L0[CR++],
    R = L0[CR++],
    a = (T & 127) >> 2;
  if (a === 31) {
    if (R || T & 3) return NaN;
    return T & 128 ? -1 / 0 : 1 / 0;
  }
  if (a === 0) {
    let e = ((T & 3) << 8 | R) / 16777216;
    return T & 128 ? -e : e;
  }
  return o4[3] = T & 128 | (a >> 1) + 56, o4[2] = (T & 7) << 5 | R >> 3, o4[1] = R << 5, o4[0] = 0, g2T[0];
}
class OA {
  constructor(T, R) {
    this.value = T, this.tag = R;
  }
}
function Ju(T, R) {
  if (typeof T === "string") return T + R;
  if (T instanceof Array) return T.concat(R);
  return Object.assign({}, T, R);
}
function O_() {
  if (!Ir) if (R8.getShared) reT();else throw Error("No packed values available");
  return Ir;
}
function i00(T, R) {
  let a = "get" + T.name.slice(0, -5),
    e;
  if (typeof T === "function") e = T.BYTES_PER_ELEMENT;else T = null;
  for (let t = 0; t < 2; t++) {
    if (!t && e == 1) continue;
    let r = e == 2 ? 1 : e == 4 ? 2 : e == 8 ? 3 : 0;
    Ea[t ? R : R - 4] = e == 1 || t == r00 ? h => {
      if (!T) throw Error("Could not find typed array for code " + R);
      if (!R8.copyBuffers) {
        if (e === 1 || e === 2 && !(h.byteOffset & 1) || e === 4 && !(h.byteOffset & 3) || e === 8 && !(h.byteOffset & 7)) return new T(h.buffer, h.byteOffset, h.byteLength >> r);
      }
      return new T(Uint8Array.prototype.slice.call(h, 0).buffer);
    } : h => {
      if (!T) throw Error("Could not find typed array for code " + R);
      let i = new DataView(h.buffer, h.byteOffset, h.byteLength),
        c = h.length >> r,
        s = new T(c),
        A = i[a];
      for (let l = 0; l < c; l++) s[l] = A.call(i, l << r, t);
      return s;
    };
  }
}
function c00() {
  let T = hP(),
    R = CR + r8();
  for (let e = 2; e < T; e++) {
    let t = hP();
    CR += t;
  }
  let a = CR;
  return CR = R, Oa = [Fb(hP()), Fb(hP())], Oa.position0 = 0, Oa.position1 = 0, Oa.postBundlePosition = CR, CR = a, r8();
}
function hP() {
  let T = L0[CR++] & 31;
  if (T > 23) switch (T) {
    case 24:
      T = L0[CR++];
      break;
    case 25:
      T = St.getUint16(CR), CR += 2;
      break;
    case 26:
      T = St.getUint32(CR), CR += 4;
      break;
  }
  return T;
}
function reT() {
  if (R8.getShared) {
    let T = v2T(() => {
        return L0 = null, R8.getShared();
      }) || {},
      R = T.structures || [];
    if (R8.sharedVersion = T.version, Ir = R8.sharedValues = T.packedValues, ia === !0) R8.structures = ia = R;else ia.splice.apply(ia, [0, R.length].concat(R));
  }
}
function v2T(T) {
  let R = _A,
    a = CR,
    e = tS,
    t = hS,
    r = zb,
    h = rS,
    i = eb,
    c = hi,
    s = Oa,
    A = new Uint8Array(L0.slice(0, _A)),
    l = ia,
    o = R8,
    n = iS,
    p = T();
  return _A = R, CR = a, tS = e, hS = t, zb = r, rS = h, eb = i, hi = c, Oa = s, L0 = A, iS = n, ia = l, R8 = o, St = new DataView(L0.buffer, L0.byteOffset, L0.byteLength), p;
}
function r1() {
  L0 = null, hi = null, ia = null;
}
function WyT(T, R) {
  if (T < 24) _R[aR++] = R | T;else if (T < 256) _R[aR++] = R | 24, _R[aR++] = T;else if (T < 65536) _R[aR++] = R | 25, _R[aR++] = T >> 8, _R[aR++] = T & 255;else _R[aR++] = R | 26, b3.setUint32(aR, T), aR += 4;
}
class ceT {
  constructor(T, R, a) {
    this.structures = T, this.packedValues = R, this.version = a;
  }
}
function ps(T) {
  if (T < 24) _R[aR++] = 128 | T;else if (T < 256) _R[aR++] = 152, _R[aR++] = T;else if (T < 65536) _R[aR++] = 153, _R[aR++] = T >> 8, _R[aR++] = T & 255;else _R[aR++] = 154, b3.setUint32(aR, T), aR += 4;
}
function fz(T) {
  if (T instanceof n00) return !0;
  let R = T[Symbol.toStringTag];
  return R === "Blob" || R === "File";
}
function bM(T, R) {
  switch (typeof T) {
    case "string":
      if (T.length > 3) {
        if (R.objectMap[T] > -1 || R.values.length >= R.maxValues) return;
        let e = R.get(T);
        if (e) {
          if (++e.count == 2) R.values.push(T);
        } else if (R.set(T, {
          count: 1
        }), R.samplingPackedValues) {
          let t = R.samplingPackedValues.get(T);
          if (t) t.count++;else R.samplingPackedValues.set(T, {
            count: 1
          });
        }
      }
      break;
    case "object":
      if (T) if (T instanceof Array) for (let e = 0, t = T.length; e < t; e++) bM(T[e], R);else {
        let e = !R.encoder.useRecords;
        for (var a in T) if (T.hasOwnProperty(a)) {
          if (e) bM(a, R);
          bM(T[a], R);
        }
      }
      break;
    case "function":
      console.log(T);
  }
}
function as(T, R) {
  if (!l00 && R > 1) T -= 4;
  return {
    tag: T,
    encode: function (a, e) {
      let t = a.byteLength,
        r = a.byteOffset || 0,
        h = a.buffer || a;
      e(GO ? QU.from(h, r, t) : new Uint8Array(h, r, t));
    }
  };
}
function i1(T, R) {
  let a = T.byteLength;
  if (a < 24) _R[aR++] = 64 + a;else if (a < 256) _R[aR++] = 88, _R[aR++] = a;else if (a < 65536) _R[aR++] = 89, _R[aR++] = a >> 8, _R[aR++] = a & 255;else _R[aR++] = 90, b3.setUint32(aR, a), aR += 4;
  if (aR + a >= _R.length) R(aR + a);
  _R.set(T.buffer ? T : new Uint8Array(T), aR), aR += a;
}
function A00(T, R) {
  let a,
    e = R.length * 2,
    t = T.length - e;
  R.sort((r, h) => r.offset > h.offset ? 1 : -1);
  for (let r = 0; r < R.length; r++) {
    let h = R[r];
    h.id = r;
    for (let i of h.references) T[i++] = r >> 8, T[i] = r & 255;
  }
  while (a = R.pop()) {
    let r = a.offset;
    T.copyWithin(r + e, r, t), e -= 2;
    let h = r + e;
    T[h++] = 216, T[h++] = 28, t = r;
  }
  return T;
}
function qyT(T, R) {
  b3.setUint32(qa.position + T, aR - qa.position - T + 1);
  let a = qa;
  qa = null, R(a[0]), R(a[1]);
}
function b00(T) {
  return E0(T);
}
function m00(T, R) {
  C0(T, R);
}
function oeT(T) {
  return E0(T);
}
function neT(T, R) {
  C0(T, R);
}
function lp(T) {
  return E0(T);
}
function Ap(T, R) {
  C0(T, R);
}
function ZU(T) {
  return ge(T);
}
function JU(T, R) {
  $e(T, R);
}
function GyT(T) {
  return {
    key: ZU(T),
    value: b00(T)
  };
}
function u00(T, R) {
  JU(T, R.key), m00(T, R.value);
}
function KO(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [GyT(T)];
  for (let e = 1; e < R; e++) a[e] = GyT(T);
  return a;
}
function VO(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) u00(T, R[a]);
}
function y00(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return "UNSET";
    case 1:
      return "OK";
    case 2:
      return "ERROR";
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function P00(T, R) {
  switch (R) {
    case "UNSET":
      {
        dR(T, 0);
        break;
      }
    case "OK":
      {
        dR(T, 1);
        break;
      }
    case "ERROR":
      {
        dR(T, 2);
        break;
      }
  }
}
function TH(T) {
  return q0(T) ? KR(T) : null;
}
function RH(T, R) {
  if (z0(T, R !== null), R !== null) YR(T, R);
}
function k00(T) {
  return {
    code: y00(T),
    message: TH(T)
  };
}
function x00(T, R) {
  P00(T, R.code), RH(T, R.message);
}
function KyT(T) {
  return {
    traceId: oeT(T),
    spanId: lp(T),
    traceState: TH(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T)
  };
}
function f00(T, R) {
  neT(T, R.traceId), Ap(T, R.spanId), RH(T, R.traceState), VO(T, R.attributes), $e(T, R.droppedAttributesCount);
}
function O2T(T) {
  return q0(T) ? lp(T) : null;
}
function d2T(T, R) {
  if (z0(T, R !== null), R !== null) Ap(T, R);
}
function E2T(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KyT(T)];
  for (let e = 1; e < R; e++) a[e] = KyT(T);
  return a;
}
function C2T(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) f00(T, R[a]);
}
function I00(T) {
  return {
    traceId: oeT(T),
    spanId: lp(T),
    parentSpanId: O2T(T),
    name: ZU(T),
    kind: ge(T),
    traceState: TH(T),
    flags: ge(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T),
    links: E2T(T),
    droppedLinksCount: ge(T)
  };
}
function g00(T, R) {
  neT(T, R.traceId), Ap(T, R.spanId), d2T(T, R.parentSpanId), JU(T, R.name), $e(T, R.kind), RH(T, R.traceState), $e(T, R.flags), VO(T, R.attributes), $e(T, R.droppedAttributesCount), C2T(T, R.links), $e(T, R.droppedLinksCount);
}
function leT(T) {
  return q0(T) ? k00(T) : null;
}
function AeT(T, R) {
  if (z0(T, R !== null), R !== null) x00(T, R);
}
function $00(T) {
  return {
    spanId: lp(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T),
    status: leT(T)
  };
}
function v00(T, R) {
  Ap(T, R.spanId), VO(T, R.attributes), $e(T, R.droppedAttributesCount), AeT(T, R.status);
}
function j00(T) {
  return {
    spanId: lp(T),
    name: ZU(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T)
  };
}
function S00(T, R) {
  Ap(T, R.spanId), JU(T, R.name), VO(T, R.attributes), $e(T, R.droppedAttributesCount);
}
function O00(T) {
  return {
    spanId: lp(T),
    status: leT(T)
  };
}
function d00(T, R) {
  Ap(T, R.spanId), AeT(T, R.status);
}
function E00(T) {
  return {
    traceId: oeT(T),
    spanId: lp(T),
    parentSpanId: O2T(T),
    name: ZU(T),
    kind: ge(T),
    startTimeUnixNs: Ws(T),
    traceState: TH(T),
    flags: ge(T),
    attributes: KO(T),
    droppedAttributesCount: ge(T),
    links: E2T(T),
    droppedLinksCount: ge(T),
    status: leT(T)
  };
}
function C00(T, R) {
  neT(T, R.traceId), Ap(T, R.spanId), d2T(T, R.parentSpanId), JU(T, R.name), $e(T, R.kind), qs(T, R.startTimeUnixNs), RH(T, R.traceState), $e(T, R.flags), VO(T, R.attributes), $e(T, R.droppedAttributesCount), C2T(T, R.links), $e(T, R.droppedLinksCount), AeT(T, R.status);
}
function L00(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "SpanStart",
        val: I00(T)
      };
    case 1:
      return {
        tag: "SpanEvent",
        val: j00(T)
      };
    case 2:
      return {
        tag: "SpanUpdate",
        val: $00(T)
      };
    case 3:
      return {
        tag: "SpanEnd",
        val: O00(T)
      };
    case 4:
      return {
        tag: "SpanSnapshot",
        val: E00(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function M00(T, R) {
  switch (R.tag) {
    case "SpanStart":
      {
        dR(T, 0), g00(T, R.val);
        break;
      }
    case "SpanEvent":
      {
        dR(T, 1), S00(T, R.val);
        break;
      }
    case "SpanUpdate":
      {
        dR(T, 2), v00(T, R.val);
        break;
      }
    case "SpanEnd":
      {
        dR(T, 3), d00(T, R.val);
        break;
      }
    case "SpanSnapshot":
      {
        dR(T, 4), C00(T, R.val);
        break;
      }
  }
}
function VyT(T) {
  return {
    timeOffsetNs: Ws(T),
    body: L00(T)
  };
}
function D00(T, R) {
  qs(T, R.timeOffsetNs), M00(T, R.body);
}
function L2T(T) {
  return {
    prefix: ge(T),
    bucketStartSec: Ws(T),
    chunkId: ge(T),
    recordIndex: ge(T)
  };
}
function M2T(T, R) {
  $e(T, R.prefix), qs(T, R.bucketStartSec), $e(T, R.chunkId), $e(T, R.recordIndex);
}
function w00(T) {
  return q0(T) ? L2T(T) : null;
}
function B00(T, R) {
  if (z0(T, R !== null), R !== null) M2T(T, R);
}
function XyT(T) {
  return {
    spanId: lp(T),
    startKey: L2T(T),
    latestSnapshotKey: w00(T)
  };
}
function N00(T, R) {
  Ap(T, R.spanId), M2T(T, R.startKey), B00(T, R.latestSnapshotKey);
}
function U00(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function H00(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function W00(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [VyT(T)];
  for (let e = 1; e < R; e++) a[e] = VyT(T);
  return a;
}
function q00(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) D00(T, R[a]);
}
function z00(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [XyT(T)];
  for (let e = 1; e < R; e++) a[e] = XyT(T);
  return a;
}
function F00(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) N00(T, R[a]);
}
function s1(T) {
  return {
    baseUnixNs: Ws(T),
    strings: U00(T),
    records: W00(T),
    activeSpans: z00(T)
  };
}
function D2T(T, R) {
  qs(T, R.baseUnixNs), H00(T, R.strings), q00(T, R.records), F00(T, R.activeSpans);
}
function YyT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [s1(T)];
  for (let e = 1; e < R; e++) a[e] = s1(T);
  return a;
}
function QyT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) D2T(T, R[a]);
}
function G00(T) {
  return {
    startTimeMs: Ws(T),
    endTimeMs: Ws(T),
    limit: ge(T),
    clamped: q0(T),
    baseChunks: YyT(T),
    chunks: YyT(T)
  };
}
function K00(T, R) {
  qs(T, R.startTimeMs), qs(T, R.endTimeMs), $e(T, R.limit), z0(T, R.clamped), QyT(T, R.baseChunks), QyT(T, R.chunks);
}
function V00(T) {
  let R = new A0(new Uint8Array(c1.initialBufferLength), c1);
  return K00(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function X00(T) {
  let R = new A0(T, c1),
    a = G00(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Y00(T) {
  let R = new A0(new Uint8Array(o1.initialBufferLength), o1);
  return D2T(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Q00(T) {
  let R = new A0(T, o1);
  return s1(R);
}
function n1(T) {
  return T instanceof Date || T instanceof Set || T instanceof Map || T instanceof WeakSet || T instanceof WeakMap || ArrayBuffer.isView(T);
}
function Z00(T) {
  return T === null || typeof T !== "object" && typeof T !== "function" || T instanceof RegExp || T instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && T instanceof SharedArrayBuffer;
}
function bw(T) {
  return typeof T === "symbol";
}
function mw(T) {
  return Object.prototype.toString.call(T) === "[object Object]";
}
function T90(T) {
  return T !== null && typeof T === "object" && typeof T.next === "function";
}
function R90(T, R, a, e, t) {
  let r = T?.next;
  if (typeof r !== "function") return T;
  if (R.name === "entries") T.next = function () {
    let h = r.call(this);
    if (h && h.done === !1) h.value[0] = t(h.value[0], R, h.value[0], e), h.value[1] = t(h.value[1], R, h.value[0], e);
    return h;
  };else if (R.name === "values") {
    let h = a[peT].keys();
    T.next = function () {
      let i = r.call(this);
      if (i && i.done === !1) i.value = t(i.value, R, h.next().value, e);
      return i;
    };
  } else T.next = function () {
    let h = r.call(this);
    if (h && h.done === !1) h.value = t(h.value, R, h.value, e);
    return h;
  };
  return T;
}
function ZyT(T, R, a) {
  if (T.isUnsubscribed) return !0;
  if (R.ignoreSymbols && bw(a)) return !0;
  if (R.ignoreUnderscores && typeof a === "string" && a.charAt(0) === "_") return !0;
  let e = R.ignoreKeys;
  if (e) return Array.isArray(e) ? e.includes(a) : e instanceof Set ? e.has(a) : !1;
  return !1;
}
class B2T {
  constructor(T) {
    this._equals = T, this._proxyCache = new WeakMap(), this._pathCache = new WeakMap(), this._allPathsCache = new WeakMap(), this.isUnsubscribed = !1;
  }
  _pathsEqual(T, R) {
    if (!Array.isArray(T) || !Array.isArray(R)) return T === R;
    return T.length === R.length && T.every((a, e) => a === R[e]);
  }
  _getDescriptorCache() {
    if (this._descriptorCache === void 0) this._descriptorCache = new WeakMap();
    return this._descriptorCache;
  }
  _getProperties(T) {
    let R = this._getDescriptorCache(),
      a = R.get(T);
    if (a === void 0) a = {}, R.set(T, a);
    return a;
  }
  _getOwnPropertyDescriptor(T, R) {
    if (this.isUnsubscribed) return Reflect.getOwnPropertyDescriptor(T, R);
    let a = this._getProperties(T),
      e = a[R];
    if (e === void 0) e = Reflect.getOwnPropertyDescriptor(T, R), a[R] = e;
    return e;
  }
  getProxy(T, R, a, e) {
    if (this.isUnsubscribed) return T;
    let t = e === void 0 ? void 0 : T[e],
      r = t ?? T;
    this._pathCache.set(r, R);
    let h = this._allPathsCache.get(r);
    if (!h) h = [], this._allPathsCache.set(r, h);
    if (!h.some(c => this._pathsEqual(c, R))) h.push(R);
    let i = this._proxyCache.get(r);
    if (i === void 0) i = t === void 0 ? new Proxy(T, a) : T, this._proxyCache.set(r, i);
    return i;
  }
  getPath(T) {
    return this.isUnsubscribed ? void 0 : this._pathCache.get(T);
  }
  getAllPaths(T) {
    if (this.isUnsubscribed) return;
    return this._allPathsCache.get(T);
  }
  isDetached(T, R) {
    return !Object.is(T, Ot.get(R, this.getPath(T)));
  }
  defineProperty(T, R, a) {
    if (!Reflect.defineProperty(T, R, a)) return !1;
    if (!this.isUnsubscribed) this._getProperties(T)[R] = a;
    return !0;
  }
  setProperty(T, R, a, e, t) {
    if (!this._equals(t, a) || !(R in T)) {
      let r = !1,
        h = T;
      while (h) {
        let i = Reflect.getOwnPropertyDescriptor(h, R);
        if (i && "set" in i) {
          r = !0;
          break;
        }
        h = Object.getPrototypeOf(h);
      }
      if (r) return Reflect.set(T, R, a, e);
      return Reflect.set(T, R, a);
    }
    return !0;
  }
  deleteProperty(T, R, a) {
    if (Reflect.deleteProperty(T, R)) {
      if (!this.isUnsubscribed) {
        let e = this._getDescriptorCache().get(T);
        if (e) delete e[R], this._pathCache.delete(a);
      }
      return !0;
    }
    return !1;
  }
  isSameDescriptor(T, R, a) {
    let e = this._getOwnPropertyDescriptor(R, a);
    return T !== void 0 && e !== void 0 && Object.is(T.value, e.value) && (T.writable || !1) === (e.writable || !1) && (T.enumerable || !1) === (e.enumerable || !1) && (T.configurable || !1) === (e.configurable || !1) && T.get === e.get && T.set === e.set;
  }
  isGetInvariant(T, R) {
    let a = this._getOwnPropertyDescriptor(T, R);
    return a !== void 0 && a.configurable !== !0 && a.writable !== !0;
  }
  unsubscribe() {
    this._descriptorCache = null, this._pathCache = null, this._proxyCache = null, this._allPathsCache = null, this.isUnsubscribed = !0;
  }
}
function n4() {
  return !0;
}
function Ty(T, R) {
  if (T === R) return !1;
  return T.length !== R.length || T.some((a, e) => R[e] !== a);
}
function l4(T, R) {
  if (T === R) return !1;
  if (T.size !== R.size) return !0;
  for (let a of T) if (!R.has(a)) return !0;
  return !1;
}
function A4(T, R) {
  if (T === R) return !1;
  if (T.size !== R.size) return !0;
  for (let [a, e] of T) {
    let t = R.get(a);
    if (t !== e || t === void 0 && !R.has(a)) return !0;
  }
  return !1;
}
class yn {
  constructor(T, R, a, e) {
    this._path = R, this._isChanged = !1, this._clonedCache = new Set(), this._hasOnValidate = e, this._changes = e ? [] : null, this.clone = R === void 0 ? T : this._shallowClone(T);
  }
  static isHandledMethod(T) {
    return N2T.has(T);
  }
  _shallowClone(T) {
    let R = T;
    if (mw(T)) R = {
      ...T
    };else if (pv(T) || ArrayBuffer.isView(T)) R = [...T];else if (T instanceof Date) R = new Date(T);else if (T instanceof Set) R = new Set([...T].map(a => this._shallowClone(a)));else if (T instanceof Map) {
      R = new Map();
      for (let [a, e] of T.entries()) R.set(a, this._shallowClone(e));
    }
    return this._clonedCache.add(R), R;
  }
  preferredThisArg(T, R, a, e) {
    if (T) {
      if (pv(e)) this._onIsChanged = U2T[R];else if (e instanceof Set) this._onIsChanged = q2T[R];else if (e instanceof Map) this._onIsChanged = z2T[R];
      return e;
    }
    return a;
  }
  update(T, R, a) {
    let e = Ot.after(T, this._path);
    if (R !== "length") {
      let t = this.clone;
      if (Ot.walk(e, r => {
        if (t?.[r]) {
          if (!this._clonedCache.has(t[r])) t[r] = this._shallowClone(t[r]);
          t = t[r];
        }
      }), this._hasOnValidate) this._changes.push({
        path: e,
        property: R,
        previous: a
      });
      if (t?.[R]) t[R] = a;
    }
    this._isChanged = !0;
  }
  undo(T) {
    let R;
    for (let a = this._changes.length - 1; a !== -1; a--) R = this._changes[a], Ot.get(T, R.path)[R.property] = R.previous;
  }
  isChanged(T, R) {
    return this._onIsChanged === void 0 ? this._isChanged : this._onIsChanged(this.clone, T);
  }
  isPathApplicable(T) {
    return Ot.isRootPath(this._path) || Ot.isSubPath(T, this._path);
  }
}
class Bo {
  constructor(T) {
    this._stack = [], this._hasOnValidate = T;
  }
  static isHandledType(T) {
    return mw(T) || pv(T) || n1(T);
  }
  static isHandledMethod(T, R) {
    if (mw(T)) return yn.isHandledMethod(R);
    if (pv(T)) return l1.isHandledMethod(R);
    if (T instanceof Set) return A1.isHandledMethod(R);
    if (T instanceof Map) return p1.isHandledMethod(R);
    return n1(T);
  }
  get isCloning() {
    return this._stack.length > 0;
  }
  start(T, R, a) {
    let e = yn;
    if (pv(T)) e = l1;else if (T instanceof Date) e = F2T;else if (T instanceof Set) e = A1;else if (T instanceof Map) e = p1;else if (T instanceof WeakSet) e = G2T;else if (T instanceof WeakMap) e = K2T;
    this._stack.push(new e(T, R, a, this._hasOnValidate));
  }
  update(T, R, a) {
    this._stack.at(-1).update(T, R, a);
  }
  preferredThisArg(T, R, a) {
    let {
        name: e
      } = T,
      t = Bo.isHandledMethod(a, e);
    return this._stack.at(-1).preferredThisArg(t, e, R, a);
  }
  isChanged(T, R) {
    return this._stack.at(-1).isChanged(T, R);
  }
  isPartOfClone(T) {
    return this._stack.at(-1).isPathApplicable(T);
  }
  undo(T) {
    if (this._previousClone !== void 0) this._previousClone.undo(T);
  }
  stop() {
    return this._previousClone = this._stack.pop(), this._previousClone.clone;
  }
}
function _1(T, R) {
  let {
      endpoint: a,
      path: e = ["endpoint"],
      namespace: t,
      token: r
    } = R,
    h;
  try {
    h = new URL(a);
  } catch {
    T.addIssue({
      code: "custom",
      message: `invalid URL: ${a}`,
      path: e
    });
    return;
  }
  if (h.search) {
    T.addIssue({
      code: "custom",
      message: "endpoint cannot contain a query string",
      path: e
    });
    return;
  }
  if (h.hash) {
    T.addIssue({
      code: "custom",
      message: "endpoint cannot contain a fragment",
      path: e
    });
    return;
  }
  let i = h.username ? decodeURIComponent(h.username) : void 0,
    c = h.password ? decodeURIComponent(h.password) : void 0;
  if (c && !i) {
    T.addIssue({
      code: "custom",
      message: "endpoint cannot have a token without a namespace",
      path: e
    });
    return;
  }
  if (i && t) T.addIssue({
    code: "custom",
    message: "cannot specify namespace both in endpoint URL and as a separate config option",
    path: ["namespace"]
  });
  if (c && r) T.addIssue({
    code: "custom",
    message: "cannot specify token both in endpoint URL and as a separate config option",
    path: ["token"]
  });
  return h.username = "", h.password = "", {
    endpoint: h.toString(),
    namespace: i,
    token: c
  };
}
function rPT(T) {
  if (typeof Buffer < "u") return Buffer.from(T).toString("base64");
  let R = "",
    a = T.byteLength;
  for (let e = 0; e < a; e++) R += String.fromCharCode(T[e]);
  return btoa(R);
}
function S90(T) {
  if (T === "json") return "application/json";else if (T === "cbor" || T === "bare") return "application/octet-stream";else FO(T);
}
function meT(T, R, a, e, t, r, h) {
  if (T === "json") {
    let i = r(R),
      c = t.parse(i);
    return Q2T(c);
  } else if (T === "cbor") {
    let i = r(R),
      c = t.parse(i);
    return Gb(c);
  } else if (T === "bare") {
    if (!a) throw Error("VersionedDataHandler is required for 'bare' encoding");
    if (e === void 0) throw Error("version is required for 'bare' encoding");
    let i = h(R);
    return a.serializeWithEmbeddedVersion(i, e);
  } else FO(T);
}
function b1(T, R, a, e, t, r) {
  if (T === "json") {
    let h;
    if (typeof R === "string") h = hPT(R);else {
      let c = new TextDecoder("utf-8").decode(R);
      h = hPT(c);
    }
    let i = e.parse(h);
    return t(i);
  } else if (T === "cbor") {
    FyT.default(typeof R !== "string", "buffer cannot be string for cbor encoding");
    let h = kb(R),
      i = e.parse(h);
    return t(i);
  } else if (T === "bare") {
    if (FyT.default(typeof R !== "string", "buffer cannot be string for bare encoding"), !a) throw Error("VersionedDataHandler is required for 'bare' encoding");
    let h = a.deserializeWithEmbeddedVersion(R);
    return r(h);
  } else FO(T);
}
function X2T(T) {
  let R = "",
    a = T.byteLength;
  for (let e = 0; e < a; e++) R += String.fromCharCode(T[e]);
  return btoa(R);
}
function E90(T) {
  let R = new Uint8Array(T);
  return X2T(R);
}
function Y2T(T) {
  if (typeof Buffer < "u") return new Uint8Array(Buffer.from(T, "base64"));
  let R = atob(T),
    a = R.length,
    e = new Uint8Array(a);
  for (let t = 0; t < a; t++) e[t] = R.charCodeAt(t);
  return e;
}
function C90(T) {
  return Y2T(T).buffer;
}
function Q2T(T) {
  return JSON.stringify(T, (R, a) => {
    if (typeof a === "bigint") return ["$BigInt", a.toString()];else if (a instanceof ArrayBuffer) return ["$ArrayBuffer", E90(a)];else if (a instanceof Uint8Array) return ["$Uint8Array", X2T(a)];
    if (Array.isArray(a) && a.length === 2 && typeof a[0] === "string" && a[0].startsWith("$")) return ["$" + a[0], a[1]];
    return a;
  });
}
function hPT(T) {
  return JSON.parse(T, (R, a) => {
    if (Array.isArray(a) && a.length === 2 && typeof a[0] === "string" && a[0].startsWith("$")) {
      if (a[0] === "$BigInt") return BigInt(a[1]);else if (a[0] === "$ArrayBuffer") return C90(a[1]);else if (a[0] === "$Uint8Array") return Y2T(a[1]);
      if (a[0].startsWith("$$")) return [a[0].substring(1), a[1]];
      throw Error(`Unknown JSON encoding type: ${a[0]}. This may indicate corrupted data or a version mismatch.`);
    }
    return a;
  });
}
function L90(T) {
  return {
    actorId: KR(T),
    connectionId: KR(T),
    connectionToken: KR(T)
  };
}
function M90(T, R) {
  YR(T, R.actorId), YR(T, R.connectionId), YR(T, R.connectionToken);
}
function Z2T(T) {
  return q0(T) ? E0(T) : null;
}
function J2T(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function D90(T) {
  return q0(T) ? UR(T) : null;
}
function w90(T, R) {
  if (z0(T, R !== null), R !== null) HR(T, R);
}
function B90(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: Z2T(T),
    actionId: D90(T)
  };
}
function N90(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), J2T(T, R.metadata), w90(T, R.actionId);
}
function U90(T) {
  return {
    id: UR(T),
    output: E0(T)
  };
}
function H90(T, R) {
  HR(T, R.id), C0(T, R.output);
}
function W90(T) {
  return {
    name: KR(T),
    args: E0(T)
  };
}
function q90(T, R) {
  YR(T, R.name), C0(T, R.args);
}
function z90(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "Init",
        val: L90(T)
      };
    case 1:
      return {
        tag: "Error",
        val: B90(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: U90(T)
      };
    case 3:
      return {
        tag: "Event",
        val: W90(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function F90(T, R) {
  switch (R.tag) {
    case "Init":
      {
        dR(T, 0), M90(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 1), N90(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), H90(T, R.val);
        break;
      }
    case "Event":
      {
        dR(T, 3), q90(T, R.val);
        break;
      }
  }
}
function G90(T) {
  return {
    body: z90(T)
  };
}
function K90(T, R) {
  F90(T, R.body);
}
function V90(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return K90(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function X90(T) {
  let R = new A0(T, Se),
    a = G90(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Y90(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function Q90(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function Z90(T) {
  return {
    eventName: KR(T),
    subscribe: q0(T)
  };
}
function J90(T, R) {
  YR(T, R.eventName), z0(T, R.subscribe);
}
function T80(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionRequest",
        val: Y90(T)
      };
    case 1:
      return {
        tag: "SubscriptionRequest",
        val: Z90(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function R80(T, R) {
  switch (R.tag) {
    case "ActionRequest":
      {
        dR(T, 0), Q90(T, R.val);
        break;
      }
    case "SubscriptionRequest":
      {
        dR(T, 1), J90(T, R.val);
        break;
      }
  }
}
function a80(T) {
  return {
    body: T80(T)
  };
}
function e80(T, R) {
  R80(T, R.body);
}
function t80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return e80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function r80(T) {
  let R = new A0(T, Se),
    a = a80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function h80(T) {
  return {
    args: E0(T)
  };
}
function i80(T, R) {
  C0(T, R.args);
}
function c80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return i80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function s80(T) {
  let R = new A0(T, Se),
    a = h80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function o80(T) {
  return {
    output: E0(T)
  };
}
function n80(T, R) {
  C0(T, R.output);
}
function l80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return n80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function A80(T) {
  let R = new A0(T, Se),
    a = o80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function p80(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: Z2T(T)
  };
}
function _80(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), J2T(T, R.metadata);
}
function b80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return _80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function m80(T) {
  let R = new A0(T, Se),
    a = p80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function u80(T) {
  return {
    actorId: KR(T)
  };
}
function y80(T, R) {
  YR(T, R.actorId);
}
function P80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return y80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function k80(T) {
  let R = new A0(T, Se),
    a = u80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function x80(T) {
  return {
    actorId: KR(T),
    connectionId: KR(T)
  };
}
function f80(T, R) {
  YR(T, R.actorId), YR(T, R.connectionId);
}
function TGT(T) {
  return q0(T) ? E0(T) : null;
}
function RGT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function I80(T) {
  return q0(T) ? UR(T) : null;
}
function g80(T, R) {
  if (z0(T, R !== null), R !== null) HR(T, R);
}
function $80(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: TGT(T),
    actionId: I80(T)
  };
}
function v80(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), RGT(T, R.metadata), g80(T, R.actionId);
}
function j80(T) {
  return {
    id: UR(T),
    output: E0(T)
  };
}
function S80(T, R) {
  HR(T, R.id), C0(T, R.output);
}
function O80(T) {
  return {
    name: KR(T),
    args: E0(T)
  };
}
function d80(T, R) {
  YR(T, R.name), C0(T, R.args);
}
function E80(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "Init",
        val: x80(T)
      };
    case 1:
      return {
        tag: "Error",
        val: $80(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: j80(T)
      };
    case 3:
      return {
        tag: "Event",
        val: O80(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function C80(T, R) {
  switch (R.tag) {
    case "Init":
      {
        dR(T, 0), f80(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 1), v80(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), S80(T, R.val);
        break;
      }
    case "Event":
      {
        dR(T, 3), d80(T, R.val);
        break;
      }
  }
}
function L80(T) {
  return {
    body: E80(T)
  };
}
function M80(T, R) {
  C80(T, R.body);
}
function D80(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return M80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function w80(T) {
  let R = new A0(T, Oe),
    a = L80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function B80(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function N80(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function U80(T) {
  return {
    eventName: KR(T),
    subscribe: q0(T)
  };
}
function H80(T, R) {
  YR(T, R.eventName), z0(T, R.subscribe);
}
function W80(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionRequest",
        val: B80(T)
      };
    case 1:
      return {
        tag: "SubscriptionRequest",
        val: U80(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function q80(T, R) {
  switch (R.tag) {
    case "ActionRequest":
      {
        dR(T, 0), N80(T, R.val);
        break;
      }
    case "SubscriptionRequest":
      {
        dR(T, 1), H80(T, R.val);
        break;
      }
  }
}
function z80(T) {
  return {
    body: W80(T)
  };
}
function F80(T, R) {
  q80(T, R.body);
}
function G80(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return F80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function K80(T) {
  let R = new A0(T, Oe),
    a = z80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function V80(T) {
  return {
    args: E0(T)
  };
}
function X80(T, R) {
  C0(T, R.args);
}
function Y80(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return X80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Q80(T) {
  let R = new A0(T, Oe),
    a = V80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Z80(T) {
  return {
    output: E0(T)
  };
}
function J80(T, R) {
  C0(T, R.output);
}
function T30(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return J80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function R30(T) {
  let R = new A0(T, Oe),
    a = Z80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function a30(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: TGT(T)
  };
}
function e30(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), RGT(T, R.metadata);
}
function t30(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return e30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function r30(T) {
  let R = new A0(T, Oe),
    a = a30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function h30(T) {
  return {
    actorId: KR(T)
  };
}
function i30(T, R) {
  YR(T, R.actorId);
}
function c30(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return i30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function s30(T) {
  let R = new A0(T, Oe),
    a = h30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function o30(T) {
  return {
    actorId: KR(T),
    connectionId: KR(T)
  };
}
function n30(T, R) {
  YR(T, R.actorId), YR(T, R.connectionId);
}
function ueT(T) {
  return q0(T) ? E0(T) : null;
}
function yeT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function l30(T) {
  return q0(T) ? UR(T) : null;
}
function A30(T, R) {
  if (z0(T, R !== null), R !== null) HR(T, R);
}
function p30(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: ueT(T),
    actionId: l30(T)
  };
}
function _30(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), yeT(T, R.metadata), A30(T, R.actionId);
}
function b30(T) {
  return {
    id: UR(T),
    output: E0(T)
  };
}
function m30(T, R) {
  HR(T, R.id), C0(T, R.output);
}
function u30(T) {
  return {
    name: KR(T),
    args: E0(T)
  };
}
function y30(T, R) {
  YR(T, R.name), C0(T, R.args);
}
function P30(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "Init",
        val: o30(T)
      };
    case 1:
      return {
        tag: "Error",
        val: p30(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: b30(T)
      };
    case 3:
      return {
        tag: "Event",
        val: u30(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function k30(T, R) {
  switch (R.tag) {
    case "Init":
      {
        dR(T, 0), n30(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 1), _30(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), m30(T, R.val);
        break;
      }
    case "Event":
      {
        dR(T, 3), y30(T, R.val);
        break;
      }
  }
}
function x30(T) {
  return {
    body: P30(T)
  };
}
function f30(T, R) {
  k30(T, R.body);
}
function I30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return f30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function g30(T) {
  let R = new A0(T, W3),
    a = x30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function $30(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function v30(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function j30(T) {
  return {
    eventName: KR(T),
    subscribe: q0(T)
  };
}
function S30(T, R) {
  YR(T, R.eventName), z0(T, R.subscribe);
}
function O30(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionRequest",
        val: $30(T)
      };
    case 1:
      return {
        tag: "SubscriptionRequest",
        val: j30(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function d30(T, R) {
  switch (R.tag) {
    case "ActionRequest":
      {
        dR(T, 0), v30(T, R.val);
        break;
      }
    case "SubscriptionRequest":
      {
        dR(T, 1), S30(T, R.val);
        break;
      }
  }
}
function E30(T) {
  return {
    body: O30(T)
  };
}
function C30(T, R) {
  d30(T, R.body);
}
function L30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return C30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function M30(T) {
  let R = new A0(T, W3),
    a = E30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function D30(T) {
  return {
    args: E0(T)
  };
}
function w30(T, R) {
  C0(T, R.args);
}
function B30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return w30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function N30(T) {
  let R = new A0(T, W3),
    a = D30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function U30(T) {
  return {
    output: E0(T)
  };
}
function H30(T, R) {
  C0(T, R.output);
}
function W30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return H30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function q30(T) {
  let R = new A0(T, W3),
    a = U30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function z30(T) {
  return q0(T) ? KR(T) : null;
}
function F30(T, R) {
  if (z0(T, R !== null), R !== null) YR(T, R);
}
function G30(T) {
  return q0(T) ? q0(T) : null;
}
function K30(T, R) {
  if (z0(T, R !== null), R !== null) z0(T, R);
}
function V30(T) {
  return q0(T) ? Ws(T) : null;
}
function X30(T, R) {
  if (z0(T, R !== null), R !== null) qs(T, R);
}
function Y30(T) {
  return {
    body: E0(T),
    name: z30(T),
    wait: G30(T),
    timeout: V30(T)
  };
}
function Q30(T, R) {
  C0(T, R.body), F30(T, R.name), K30(T, R.wait), X30(T, R.timeout);
}
function Z30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return Q30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function J30(T) {
  let R = new A0(T, W3),
    a = Y30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Ta0(T) {
  return {
    status: KR(T),
    response: ueT(T)
  };
}
function Ra0(T, R) {
  YR(T, R.status), yeT(T, R.response);
}
function aa0(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return Ra0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function ea0(T) {
  let R = new A0(T, W3),
    a = Ta0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function ta0(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: ueT(T)
  };
}
function ra0(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), yeT(T, R.metadata);
}
function ha0(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return ra0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function ia0(T) {
  let R = new A0(T, W3),
    a = ta0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function ca0(T) {
  return {
    actorId: KR(T)
  };
}
function sa0(T, R) {
  YR(T, R.actorId);
}
function oa0(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return sa0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function na0(T) {
  let R = new A0(T, W3),
    a = ca0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
async function qa0(T) {
  if (typeof T === "string") return T;else if (T instanceof Blob) {
    let R = await T.arrayBuffer();
    return new Uint8Array(R);
  } else if (T instanceof Uint8Array) return T;else if (T instanceof ArrayBuffer || T instanceof SharedArrayBuffer) return new Uint8Array(T);else throw new g1R();
}
function oPT(T) {
  return {
    eventName: KR(T)
  };
}
function za0(T, R) {
  YR(T, R.eventName);
}
function Fa0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [oPT(T)];
  for (let e = 1; e < R; e++) a[e] = oPT(T);
  return a;
}
function Ga0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) za0(T, R[a]);
}
function nPT(T) {
  return {
    id: KR(T),
    token: KR(T),
    parameters: E0(T),
    state: E0(T),
    subscriptions: Fa0(T),
    lastSeen: Ws(T)
  };
}
function Ka0(T, R) {
  YR(T, R.id), YR(T, R.token), C0(T, R.parameters), C0(T, R.state), Ga0(T, R.subscriptions), qs(T, R.lastSeen);
}
function tGT(T) {
  return q0(T) ? E0(T) : null;
}
function rGT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function Va0(T) {
  return {
    action: KR(T),
    args: tGT(T)
  };
}
function Xa0(T, R) {
  YR(T, R.action), rGT(T, R.args);
}
function Ya0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "GenericPersistedScheduleEvent",
        val: Va0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function Qa0(T, R) {
  switch (R.tag) {
    case "GenericPersistedScheduleEvent":
      {
        dR(T, 0), Xa0(T, R.val);
        break;
      }
  }
}
function lPT(T) {
  return {
    eventId: KR(T),
    timestamp: Ws(T),
    kind: Ya0(T)
  };
}
function Za0(T, R) {
  YR(T, R.eventId), qs(T, R.timestamp), Qa0(T, R.kind);
}
function Ja0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [nPT(T)];
  for (let e = 1; e < R; e++) a[e] = nPT(T);
  return a;
}
function Te0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Ka0(T, R[a]);
}
function Re0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [lPT(T)];
  for (let e = 1; e < R; e++) a[e] = lPT(T);
  return a;
}
function ae0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Za0(T, R[a]);
}
function ee0(T) {
  return {
    input: tGT(T),
    hasInitialized: q0(T),
    state: E0(T),
    connections: Ja0(T),
    scheduledEvents: Re0(T)
  };
}
function te0(T, R) {
  rGT(T, R.input), z0(T, R.hasInitialized), C0(T, R.state), Te0(T, R.connections), ae0(T, R.scheduledEvents);
}
function re0(T) {
  let R = new A0(new Uint8Array(m1.initialBufferLength), m1);
  return te0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function he0(T) {
  let R = new A0(T, m1),
    a = ee0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function APT(T) {
  return {
    eventName: KR(T)
  };
}
function ie0(T, R) {
  YR(T, R.eventName);
}
function ce0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [APT(T)];
  for (let e = 1; e < R; e++) a[e] = APT(T);
  return a;
}
function se0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) ie0(T, R[a]);
}
function keT(T) {
  return q0(T) ? E0(T) : null;
}
function xeT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function pPT(T) {
  return {
    id: KR(T),
    token: KR(T),
    parameters: E0(T),
    state: E0(T),
    subscriptions: ce0(T),
    lastSeen: jA(T),
    hibernatableRequestId: keT(T)
  };
}
function oe0(T, R) {
  YR(T, R.id), YR(T, R.token), C0(T, R.parameters), C0(T, R.state), se0(T, R.subscriptions), SA(T, R.lastSeen), xeT(T, R.hibernatableRequestId);
}
function ne0(T) {
  return {
    action: KR(T),
    args: keT(T)
  };
}
function le0(T, R) {
  YR(T, R.action), xeT(T, R.args);
}
function Ae0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "GenericPersistedScheduleEvent",
        val: ne0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}
function pe0(T, R) {
  switch (R.tag) {
    case "GenericPersistedScheduleEvent":
      {
        dR(T, 0), le0(T, R.val);
        break;
      }
  }
}
function _PT(T) {
  return {
    eventId: KR(T),
    timestamp: jA(T),
    kind: Ae0(T)
  };
}
function _e0(T, R) {
  YR(T, R.eventId), SA(T, R.timestamp), pe0(T, R.kind);
}
function bPT(T) {
  return {
    requestId: E0(T),
    lastSeenTimestamp: jA(T),
    msgIndex: jA(T)
  };
}
function be0(T, R) {
  C0(T, R.requestId), SA(T, R.lastSeenTimestamp), SA(T, R.msgIndex);
}
function me0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [pPT(T)];
  for (let e = 1; e < R; e++) a[e] = pPT(T);
  return a;
}
function ue0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) oe0(T, R[a]);
}
function ye0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [_PT(T)];
  for (let e = 1; e < R; e++) a[e] = _PT(T);
  return a;
}
function Pe0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) _e0(T, R[a]);
}
function ke0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [bPT(T)];
  for (let e = 1; e < R; e++) a[e] = bPT(T);
  return a;
}
function xe0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) be0(T, R[a]);
}
function fe0(T) {
  return {
    input: keT(T),
    hasInitialized: q0(T),
    state: E0(T),
    connections: me0(T),
    scheduledEvents: ye0(T),
    hibernatableWebSockets: ke0(T)
  };
}
function Ie0(T, R) {
  xeT(T, R.input), z0(T, R.hasInitialized), C0(T, R.state), ue0(T, R.connections), Pe0(T, R.scheduledEvents), xe0(T, R.hibernatableWebSockets);
}
function ge0(T) {
  let R = new A0(new Uint8Array(u1.initialBufferLength), u1);
  return Ie0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function $e0(T) {
  let R = new A0(T, u1),
    a = fe0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function ve0(T) {
  return VU(T, 4);
}
function je0(T, R) {
  cGT(R.byteLength === 4), XU(T, R);
}
function Se0(T) {
  return VU(T, 4);
}
function Oe0(T, R) {
  cGT(R.byteLength === 4), XU(T, R);
}
function uw(T) {
  return E0(T);
}
function yw(T, R) {
  C0(T, R);
}
function mPT(T) {
  return {
    eventName: KR(T)
  };
}
function de0(T, R) {
  YR(T, R.eventName);
}
function Ee0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [mPT(T)];
  for (let e = 1; e < R; e++) a[e] = mPT(T);
  return a;
}
function Ce0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) de0(T, R[a]);
}
function Le0(T) {
  let R = M8(T),
    a = new Map();
  for (let e = 0; e < R; e++) {
    let t = T.offset,
      r = KR(T);
    if (a.has(r)) throw T.offset = t, new I0(t, "duplicated key");
    a.set(r, KR(T));
  }
  return a;
}
function Me0(T, R) {
  D8(T, R.size);
  for (let a of R) YR(T, a[0]), YR(T, a[1]);
}
function De0(T) {
  return {
    id: KR(T),
    parameters: uw(T),
    state: uw(T),
    subscriptions: Ee0(T),
    gatewayId: ve0(T),
    requestId: Se0(T),
    serverMessageIndex: pw(T),
    clientMessageIndex: pw(T),
    requestPath: KR(T),
    requestHeaders: Le0(T)
  };
}
function we0(T, R) {
  YR(T, R.id), yw(T, R.parameters), yw(T, R.state), Ce0(T, R.subscriptions), je0(T, R.gatewayId), Oe0(T, R.requestId), _w(T, R.serverMessageIndex), _w(T, R.clientMessageIndex), YR(T, R.requestPath), Me0(T, R.requestHeaders);
}
function Be0(T) {
  let R = new A0(new Uint8Array(Wk.initialBufferLength), Wk);
  return we0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Ne0(T) {
  let R = new A0(T, Wk),
    a = De0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function hGT(T) {
  return q0(T) ? uw(T) : null;
}
function iGT(T, R) {
  if (z0(T, R !== null), R !== null) yw(T, R);
}
function uPT(T) {
  return {
    eventId: KR(T),
    timestamp: jA(T),
    action: KR(T),
    args: hGT(T)
  };
}
function Ue0(T, R) {
  YR(T, R.eventId), SA(T, R.timestamp), YR(T, R.action), iGT(T, R.args);
}
function He0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [uPT(T)];
  for (let e = 1; e < R; e++) a[e] = uPT(T);
  return a;
}
function We0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Ue0(T, R[a]);
}
function qe0(T) {
  return {
    input: hGT(T),
    hasInitialized: q0(T),
    state: uw(T),
    scheduledEvents: He0(T)
  };
}
function ze0(T, R) {
  iGT(T, R.input), z0(T, R.hasInitialized), yw(T, R.state), We0(T, R.scheduledEvents);
}
function Fe0(T) {
  let R = new A0(new Uint8Array(Wk.initialBufferLength), Wk);
  return ze0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Ge0(T) {
  let R = new A0(T, Wk),
    a = qe0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function cGT(T, R) {
  if (!T) throw Error(R ?? "Assertion failed");
}
function Ke0(T) {
  return VU(T, 4);
}
function Ve0(T, R) {
  nGT(R.byteLength === 4), XU(T, R);
}
function Xe0(T) {
  return VU(T, 4);
}
function Ye0(T, R) {
  nGT(R.byteLength === 4), XU(T, R);
}
function sS(T) {
  return E0(T);
}
function oS(T, R) {
  C0(T, R);
}
function yPT(T) {
  return {
    eventName: KR(T)
  };
}
function Qe0(T, R) {
  YR(T, R.eventName);
}
function Ze0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [yPT(T)];
  for (let e = 1; e < R; e++) a[e] = yPT(T);
  return a;
}
function Je0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Qe0(T, R[a]);
}
function Tt0(T) {
  let R = M8(T),
    a = new Map();
  for (let e = 0; e < R; e++) {
    let t = T.offset,
      r = KR(T);
    if (a.has(r)) throw T.offset = t, new I0(t, "duplicated key");
    a.set(r, KR(T));
  }
  return a;
}
function Rt0(T, R) {
  D8(T, R.size);
  for (let a of R) YR(T, a[0]), YR(T, a[1]);
}
function at0(T) {
  return {
    id: KR(T),
    parameters: sS(T),
    state: sS(T),
    subscriptions: Ze0(T),
    gatewayId: Ke0(T),
    requestId: Xe0(T),
    serverMessageIndex: pw(T),
    clientMessageIndex: pw(T),
    requestPath: KR(T),
    requestHeaders: Tt0(T)
  };
}
function et0(T, R) {
  YR(T, R.id), oS(T, R.parameters), oS(T, R.state), Je0(T, R.subscriptions), Ve0(T, R.gatewayId), Ye0(T, R.requestId), _w(T, R.serverMessageIndex), _w(T, R.clientMessageIndex), YR(T, R.requestPath), Rt0(T, R.requestHeaders);
}
function tt0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return et0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function rt0(T) {
  let R = new A0(T, vi),
    a = at0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function sGT(T) {
  return q0(T) ? sS(T) : null;
}
function oGT(T, R) {
  if (z0(T, R !== null), R !== null) oS(T, R);
}
function PPT(T) {
  return {
    eventId: KR(T),
    timestamp: jA(T),
    action: KR(T),
    args: sGT(T)
  };
}
function ht0(T, R) {
  YR(T, R.eventId), SA(T, R.timestamp), YR(T, R.action), oGT(T, R.args);
}
function it0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [PPT(T)];
  for (let e = 1; e < R; e++) a[e] = PPT(T);
  return a;
}
function ct0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) ht0(T, R[a]);
}
function st0(T) {
  return {
    input: sGT(T),
    hasInitialized: q0(T),
    state: sS(T),
    scheduledEvents: it0(T)
  };
}
function ot0(T, R) {
  oGT(T, R.input), z0(T, R.hasInitialized), oS(T, R.state), ct0(T, R.scheduledEvents);
}
function nt0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return ot0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function lt0(T) {
  let R = new A0(T, vi),
    a = st0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function At0(T) {
  return {
    nextId: Ws(T),
    size: ge(T)
  };
}
function pt0(T, R) {
  qs(T, R.nextId), $e(T, R.size);
}
function _t0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return pt0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function bt0(T) {
  let R = new A0(T, vi),
    a = At0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function mt0(T) {
  return q0(T) ? ge(T) : null;
}
function ut0(T, R) {
  if (z0(T, R !== null), R !== null) $e(T, R);
}
function kPT(T) {
  return q0(T) ? jA(T) : null;
}
function xPT(T, R) {
  if (z0(T, R !== null), R !== null) SA(T, R);
}
function yt0(T) {
  return q0(T) ? q0(T) : null;
}
function Pt0(T, R) {
  if (z0(T, R !== null), R !== null) z0(T, R);
}
function kt0(T) {
  return {
    name: KR(T),
    body: sS(T),
    createdAt: jA(T),
    failureCount: mt0(T),
    availableAt: kPT(T),
    inFlight: yt0(T),
    inFlightAt: kPT(T)
  };
}
function xt0(T, R) {
  YR(T, R.name), oS(T, R.body), SA(T, R.createdAt), ut0(T, R.failureCount), xPT(T, R.availableAt), Pt0(T, R.inFlight), xPT(T, R.inFlightAt);
}
function ft0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return xt0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function It0(T) {
  let R = new A0(T, vi),
    a = kt0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function nGT(T, R) {
  if (!T) throw Error(R ?? "Assertion failed");
}
function P1(T) {
  if (T.length === 0) return lGT;
  return T.map(R => {
    if (R === "") return "\\0";
    let a = R.replace(/\\/g, "\\\\");
    return a = a.replace(/\//g, `\\${y1}`), a;
  }).join(y1);
}
function Ct0(T) {
  if (T === void 0 || T === null || T === lGT) return [];
  let R = [],
    a = "",
    e = !1,
    t = !1;
  for (let r = 0; r < T.length; r++) {
    let h = T[r];
    if (e) {
      if (h === "0") t = !0;else a += h;
      e = !1;
    } else if (h === "\\") e = !0;else if (h === y1) {
      if (t) R.push(""), t = !1;else R.push(a);
      a = "";
    } else a += h;
  }
  if (e) R.push(a + "\\");else if (t) R.push("");else if (a !== "" || R.length > 0) R.push(a);
  return R;
}
function Bt0(T) {
  if (!(T && Dt0(T) && T.name === "TypeError" && typeof T.message === "string")) return !1;
  let {
    message: R,
    stack: a
  } = T;
  if (R === "Load failed") return a === void 0 || "__sentry_captured__" in T;
  if (R.startsWith("error sending request for url")) return !0;
  if (R === "Failed to fetch" || R.startsWith("Failed to fetch (") && R.endsWith(")")) return !0;
  return wt0.has(R);
}
async function pGT(T, R) {
  return new Promise((a, e) => {
    R = {
      ...R
    }, R.onFailedAttempt ??= () => {}, R.shouldRetry ??= () => !0, R.retries ??= 10;
    let t = Lt0.default.operation(R),
      r = () => {
        t.stop(), e(R.signal?.reason);
      };
    if (R.signal && !R.signal.aborted) R.signal.addEventListener("abort", r, {
      once: !0
    });
    let h = () => {
      R.signal?.removeEventListener("abort", r), t.stop();
    };
    t.attempt(async i => {
      try {
        let c = await T(i);
        h(), a(c);
      } catch (c) {
        try {
          if (!(c instanceof Error)) throw TypeError(`Non-error was thrown: "${c}". You should only throw errors.`);
          if (c instanceof AGT) throw c.originalError;
          if (c instanceof TypeError && !Bt0(c)) throw c;
          if (IPT(c, i, R), !(await R.shouldRetry(c))) t.stop(), e(c);
          if (await R.onFailedAttempt(c), !t.retry(c)) throw t.mainError();
        } catch (s) {
          IPT(s, i, R), h(), e(s);
        }
      }
    });
  });
}
function k1(T, R) {
  return T === "guard" && (R === "actor_ready_timeout" || R === "actor_runner_failed");
}
async function nS(T, R, a) {
  g0().debug({
    msg: "querying actor",
    query: JSON.stringify(R)
  });
  let e;
  if ("getForId" in R) {
    let t = await a.getForId({
      c: T,
      name: R.getForId.name,
      actorId: R.getForId.actorId
    });
    if (!t) throw new _yT(R.getForId.actorId);
    e = t;
  } else if ("getForKey" in R) {
    let t = await a.getWithKey({
      c: T,
      name: R.getForKey.name,
      key: R.getForKey.key
    });
    if (!t) throw new _yT(`${R.getForKey.name}:${JSON.stringify(R.getForKey.key)}`);
    e = t;
  } else if ("getOrCreateForKey" in R) e = {
    actorId: (await a.getOrCreateWithKey({
      c: T,
      name: R.getOrCreateForKey.name,
      key: R.getOrCreateForKey.key,
      input: R.getOrCreateForKey.input,
      region: R.getOrCreateForKey.region
    })).actorId
  };else if ("create" in R) e = {
    actorId: (await a.createActor({
      c: T,
      name: R.create.name,
      key: R.create.key,
      input: R.create.input,
      region: R.create.region
    })).actorId
  };else throw new mFT("Invalid query format");
  return g0().debug({
    msg: "actor query result",
    actorId: e.actorId
  }), {
    actorId: e.actorId
  };
}
function x1(T) {
  if ("getForId" in T) return T.getForId.name;
  if ("getForKey" in T) return T.getForKey.name;
  if ("getOrCreateForKey" in T) return T.getOrCreateForKey.name;
  if ("create" in T) return T.create.name;
  throw new mFT("Invalid query format");
}
function zt0(T) {
  return {
    actorQuery: T
  };
}
function feT(T) {
  return "getForKey" in T || "getOrCreateForKey" in T;
}
async function vl(T, R) {
  if ("getForId" in T.actorQuery) return T.actorQuery.getForId.actorId;
  if (!feT(T.actorQuery)) {
    let {
      actorId: e
    } = await nS(void 0, T.actorQuery, R);
    return e;
  }
  if (T.resolvedActorId !== void 0) return T.resolvedActorId;
  if (T.pendingResolve) return await T.pendingResolve;
  let a = nS(void 0, T.actorQuery, R).then(({
    actorId: e
  }) => {
    return T.resolvedActorId = e, T.pendingResolve = void 0, e;
  }).catch(e => {
    if (T.pendingResolve === a) T.pendingResolve = void 0;
    throw e;
  });
  return T.pendingResolve = a, await a;
}
function Ft0(T, R) {
  if (!feT(T.actorQuery)) return;
  T.resolvedActorId = R, T.pendingResolve = void 0;
}
function f1(T, R) {
  return T === "actor" && (R === "not_found" || R.startsWith("destroyed_"));
}
function Gt0(T, R) {
  let {
    group: a,
    code: e
  } = HaT(R, g0(), {}, !0);
  if (!f1(a, e)) return !1;
  return bGT(T), !0;
}
function bGT(T) {
  if (!feT(T.actorQuery)) return;
  T.resolvedActorId = void 0, T.pendingResolve = void 0;
}
async function My(T, R, a) {
  let e = !1;
  while (!0) try {
    return await R();
  } catch (t) {
    if (e || !Gt0(T, t)) throw t;
    a == null || a(), e = !0;
  }
}
async function I1(T, R, a, e, t) {
  let r = x1(e);
  try {
    let h = await t.getForId({
      name: r,
      actorId: a
    });
    if (h == null ? void 0 : h.error) return g0().info({
      msg: "found actor scheduling error",
      actorId: a,
      error: h.error
    }), new qt0(T, R, a, h.error);
  } catch (h) {
    g0().warn({
      msg: "failed to fetch actor details for scheduling error check",
      actorId: a,
      error: _r(h)
    });
  }
  return null;
}
function Kt0(T) {
  let [R, a] = T.split("#"),
    [e, t] = R.split(".");
  if (!e || !t) {
    g0().warn({
      msg: "failed to parse close reason",
      reason: T
    });
    return;
  }
  return {
    group: e,
    code: t,
    rayId: a
  };
}
function Vt0(T) {
  if (T instanceof Blob) return T.size;
  if (T instanceof ArrayBuffer) return T.byteLength;
  if (T instanceof Uint8Array) return T.byteLength;
  if (typeof T === "string") return T.length;
  FO(T);
}
async function IeT(T) {
  g0().debug({
    msg: "sending http request",
    url: T.url,
    encoding: T.encoding
  });
  let R, a;
  if (T.method === "POST" || T.method === "PUT") Ut0.default(T.body !== void 0, "missing body"), R = S90(T.encoding), a = meT(T.encoding, T.body, T.requestVersionedDataHandler, T.requestVersion, T.requestZodSchema, T.requestToJson, T.requestToBare);
  let e;
  try {
    e = await (T.customFetch ?? fetch)(new globalThis.Request(T.url, {
      method: T.method,
      headers: {
        ...T.headers,
        ...(R ? {
          "Content-Type": R
        } : {}),
        "User-Agent": eYR()
      },
      body: a,
      credentials: "include",
      signal: T.signal
    }));
  } catch (t) {
    throw new p4(`Request failed: ${t}`, {
      cause: t
    });
  }
  if (!e.ok) {
    let t = await e.arrayBuffer(),
      r = e.headers.get("content-type"),
      h = e.headers.get("x-rivet-ray-id"),
      i = (r == null ? void 0 : r.includes("application/json")) ? "json" : T.encoding;
    try {
      let c = b1(i, new Uint8Array(t), ga0, Ua0, s => s, s => ({
        group: s.group,
        code: s.code,
        message: s.message,
        metadata: s.metadata ? kb(new Uint8Array(s.metadata)) : void 0
      }));
      throw new nh(c.group, c.code, c.message, c.metadata);
    } catch (c) {
      if (c instanceof nh) throw c;
      let s = new TextDecoder("utf-8", {
        fatal: !1
      }).decode(t);
      if (h) throw new p4(`${e.statusText} (${e.status}) (Ray ID: ${h}):
${s}`);else throw new p4(`${e.statusText} (${e.status}):
${s}`);
    }
  }
  if (T.skipParseResponse) return;
  try {
    let t = new Uint8Array(await e.arrayBuffer());
    return b1(T.encoding, t, T.responseVersionedDataHandler, T.responseZodSchema, T.responseFromJson, T.responseFromBare);
  } catch (t) {
    throw new p4(`Failed to parse response: ${t}`, {
      cause: t
    });
  }
}
function mGT(T) {
  async function R(a, e, t) {
    let r = (t == null ? void 0 : t.wait) ?? !1,
      h = t == null ? void 0 : t.timeout,
      i = await IeT({
        url: `http://actor/queue/${encodeURIComponent(a)}`,
        method: "POST",
        headers: {
          [V2T]: T.encoding,
          ...(T.params !== void 0 ? {
            [beT]: JSON.stringify(T.params)
          } : {})
        },
        body: {
          body: e,
          wait: r,
          timeout: h
        },
        encoding: T.encoding,
        customFetch: T.customFetch,
        signal: t == null ? void 0 : t.signal,
        requestVersion: Hk,
        requestVersionedDataHandler: fa0,
        responseVersion: Hk,
        responseVersionedDataHandler: Ia0,
        requestZodSchema: Ba0,
        responseZodSchema: Na0,
        requestToJson: c => ({
          ...c,
          name: a
        }),
        requestToBare: c => ({
          name: c.name ?? a,
          body: KU(Gb(c.body)),
          wait: c.wait ?? !1,
          timeout: c.timeout !== void 0 ? BigInt(c.timeout) : null
        }),
        responseFromJson: c => {
          if (c.response === void 0) return {
            status: c.status
          };
          return {
            status: c.status,
            response: c.response
          };
        },
        responseFromBare: c => {
          if (c.response === null || c.response === void 0) return {
            status: c.status
          };
          return {
            status: c.status,
            response: kb(new Uint8Array(c.response))
          };
        }
      });
    if (r) return i;
    return;
  }
  return {
    send: R
  };
}
async function Xt0(T, R, a, e, t) {
  let r,
    h = t || {};
  if (typeof e === "string") r = e;else if (e instanceof URL) r = e.pathname + e.search;else if (e instanceof Request) {
    let i = new URL(e.url);
    r = i.pathname + i.search;
    let c = new Headers(e.headers),
      s = new Headers((t == null ? void 0 : t.headers) || {}),
      A = new Headers(c);
    if (s.forEach((l, o) => {
      A.set(o, l);
    }), h = {
      method: e.method,
      body: e.body,
      mode: e.mode,
      credentials: e.credentials,
      redirect: e.redirect,
      referrer: e.referrer,
      referrerPolicy: e.referrerPolicy,
      integrity: e.integrity,
      keepalive: e.keepalive,
      signal: e.signal,
      ...h,
      headers: A
    }, h.body) h.duplex = "half";
  } else throw TypeError("Invalid input type for fetch");
  try {
    let {
      actorId: i
    } = await nS(void 0, R, T);
    g0().debug({
      msg: "found actor for raw http",
      actorId: i
    }), _GT.default(i, "Missing actor ID");
    let c = r.startsWith("/") ? r.slice(1) : r,
      s = new URL(`http://actor/request/${c}`),
      A = new Headers(h.headers);
    if (a) A.set(beT, JSON.stringify(a));
    let l = new Request(s, {
      ...h,
      headers: A
    });
    return T.sendRequest(i, l);
  } catch (i) {
    let {
      group: c,
      code: s,
      message: A,
      metadata: l
    } = HaT(i, g0(), {}, !0);
    throw new nh(c, s, A, l);
  }
}
async function Yt0(T, R, a, e, t) {
  let {
    actorId: r
  } = await nS(void 0, R, T);
  g0().debug({
    msg: "found actor for action",
    actorId: r
  }), _GT.default(r, "Missing actor ID");
  let h = "",
    i = "";
  if (e) {
    let s = e.indexOf("?");
    if (s !== -1) h = e.substring(0, s), i = e.substring(s);else h = e;
    if (h.startsWith("/")) h = h.slice(1);
  }
  let c = `${p90}${h}${i}`;
  return g0().debug({
    msg: "opening websocket",
    actorId: r,
    encoding: "bare",
    path: c
  }), await T.openWebSocket(c, r, "bare", a);
}
function Jt0(T, R = {}) {
  let a = new Zt0(T, R.encoding);
  return new Proxy(a, {
    get: (e, t, r) => {
      if (typeof t === "symbol" || t in e) {
        let h = Reflect.get(e, t, r);
        if (typeof h === "function") return h.bind(e);
        return h;
      }
      if (typeof t === "string") return {
        get: (h, i) => {
          return e.get(t, h, i);
        },
        getOrCreate: (h, i) => {
          return e.getOrCreate(t, h, i);
        },
        getForId: (h, i) => {
          return e.getForId(t, h, i);
        },
        create: async (h, i = {}) => {
          return await e.create(t, h, i);
        }
      };
      return;
    }
  });
}
function KI(T) {
  let R = new Map();
  return new Proxy(T, {
    get(a, e, t) {
      if (typeof e === "symbol") return Reflect.get(a, e, t);
      if (e === "constructor" || e in a) {
        let r = Reflect.get(a, e, a);
        if (typeof r === "function") return r.bind(a);
        return r;
      }
      if (typeof e === "string") {
        if (e === "then") return;
        let r = R.get(e);
        if (!r) r = (...h) => a.action({
          name: e,
          args: h
        }), R.set(e, r);
        return r;
      }
    },
    has(a, e) {
      if (typeof e === "string") return !0;
      return Reflect.has(a, e);
    },
    getPrototypeOf(a) {
      return Reflect.getPrototypeOf(a);
    },
    ownKeys(a) {
      return Reflect.ownKeys(a);
    },
    getOwnPropertyDescriptor(a, e) {
      let t = Reflect.getOwnPropertyDescriptor(a, e);
      if (t) return t;
      if (typeof e === "string") return {
        configurable: !0,
        enumerable: !1,
        writable: !1,
        value: (...r) => a.action({
          name: e,
          args: r
        })
      };
      return;
    }
  });
}
function er0(T, R) {
  let a = _1(R, {
    endpoint: T.endpoint,
    path: ["endpoint"],
    namespace: T.namespace,
    token: T.token
  });
  return {
    ...T,
    endpoint: a == null ? void 0 : a.endpoint,
    namespace: (a == null ? void 0 : a.namespace) ?? T.namespace ?? "default",
    token: (a == null ? void 0 : a.token) ?? T.token
  };
}
function m8() {
  return Vx("remote-manager-driver");
}
function qk(T) {
  return T.endpoint ?? "http://127.0.0.1:6420";
}
async function pp(T, R, a, e) {
  let t = qk(T),
    r = qaT(t, a, {
      namespace: T.namespace
    });
  m8().debug({
    msg: "making api call",
    method: R,
    url: r
  });
  let h = {
    ...T.headers
  };
  if (T.token) h.Authorization = `Bearer ${T.token}`;
  return await IeT({
    method: R,
    url: r,
    headers: h,
    body: e,
    encoding: "json",
    skipParseResponse: !1,
    requestVersionedDataHandler: void 0,
    requestVersion: void 0,
    responseVersionedDataHandler: void 0,
    responseVersion: void 0,
    requestZodSchema: K.any(),
    responseZodSchema: K.any(),
    requestToJson: i => i,
    requestToBare: i => i,
    responseFromJson: i => i,
    responseFromBare: i => i
  });
}
function geT(T, R, a, e = "") {
  let t = a !== void 0 ? `@${encodeURIComponent(a)}` : "",
    r = `/gateway/${encodeURIComponent(R)}${t}${e}`;
  return qaT(T, r);
}
async function rr0(T, R, a, e, t) {
  let r = await gFT(),
    h = qk(T),
    i = geT(h, a, T.token, R);
  m8().debug({
    msg: "opening websocket to actor via guard",
    actorId: a,
    path: R,
    guardUrl: i
  });
  let c = new r(i, PGT(T, e, t));
  return c.binaryType = "arraybuffer", m8().debug({
    msg: "websocket connection opened",
    actorId: a
  }), c;
}
function PGT(T, R, a) {
  let e = [];
  if (e.push(b90), e.push(`${m90}${R}`), a) e.push(`${u90}${encodeURIComponent(JSON.stringify(a))}`);
  return e;
}
async function vPT(T, R, a) {
  let e = new URL(a.url),
    t = qk(T),
    r = geT(t, R, T.token, `${e.pathname}${e.search}`),
    h = null,
    i = ir0(T, a, R);
  if (a.method !== "GET" && a.method !== "HEAD") {
    if (a.bodyUsed) throw Error("Request body has already been consumed");
    let s = await a.arrayBuffer();
    if (s.byteLength !== 0) h = s, i.delete("transfer-encoding"), i.set("content-length", String(h.byteLength));
  }
  let c = new Request(r, {
    method: a.method,
    headers: i,
    body: h,
    signal: a.signal
  });
  return hr0(await fetch(c));
}
function hr0(T) {
  return new Response(T.body, T);
}
function ir0(T, R, a) {
  let e = new Headers();
  R.headers.forEach((t, r) => {
    e.set(r, t);
  });
  for (let [t, r] of Object.entries(T.headers)) e.set(t, r);
  if (T.token) e.set(_90, T.token);
  return e;
}
async function cr0(T, R, a) {
  return pp(T, "GET", `/actors?actor_ids=${encodeURIComponent(a)}`);
}
async function sr0(T, R, a) {
  let e = P1(a);
  return pp(T, "GET", `/actors?name=${encodeURIComponent(R)}&key=${encodeURIComponent(e)}`);
}
async function or0(T, R) {
  return pp(T, "GET", `/actors?name=${encodeURIComponent(R)}`);
}
async function nr0(T, R) {
  return pp(T, "PUT", "/actors", R);
}
async function lr0(T, R) {
  return pp(T, "POST", "/actors", R);
}
async function Ar0(T, R) {
  return pp(T, "DELETE", `/actors/${encodeURIComponent(R)}`);
}
async function pr0(T) {
  return pp(T, "GET", "/metadata");
}
async function _r0(T, R, a) {
  return pp(T, "GET", `/actors/${encodeURIComponent(R)}/kv/keys/${encodeURIComponent(a)}`);
}
async function br0(T) {
  let R = qk(T),
    a = jPT.get(R);
  if (a) return a;
  let e = pGT(async () => {
    m8().debug({
      msg: "fetching metadata",
      endpoint: R
    });
    let t = await pr0(T);
    return m8().debug({
      msg: "received metadata",
      endpoint: R,
      clientEndpoint: t.clientEndpoint
    }), t;
  }, {
    forever: !0,
    minTimeout: 500,
    maxTimeout: 15000,
    onFailedAttempt: t => {
      if (t.attemptNumber > 1) m8().warn({
        msg: "failed to fetch metadata, retrying",
        endpoint: R,
        attempt: t.attemptNumber,
        error: _r(t)
      });
    }
  });
  return jPT.set(R, e), e;
}
async function mr0(T, R, a) {
  let e = await gFT(),
    t = {};
  return {
    onOpen: async (r, h) => {
      if (m8().debug({
        msg: "client websocket connected",
        targetUrl: R
      }), h.readyState !== 1) {
        m8().warn({
          msg: "client websocket not open on connection",
          targetUrl: R,
          readyState: h.readyState
        });
        return;
      }
      let i = new e(R, a);
      t.targetWs = i, t.connectPromise = new Promise((c, s) => {
        i.addEventListener("open", () => {
          if (m8().debug({
            msg: "target websocket connected",
            targetUrl: R
          }), h.readyState !== 1) {
            m8().warn({
              msg: "client websocket closed before target connected",
              targetUrl: R,
              clientReadyState: h.readyState
            }), i.close(1001, "Client disconnected"), s(Error("Client disconnected"));
            return;
          }
          c();
        }), i.addEventListener("error", A => {
          m8().warn({
            msg: "target websocket error during connection",
            targetUrl: R
          }), s(A);
        });
      }), t.targetWs.addEventListener("message", c => {
        if (typeof c.data === "string" || c.data instanceof ArrayBuffer) h.send(c.data);else if (c.data instanceof Blob) c.data.arrayBuffer().then(s => {
          h.send(s);
        });
      }), t.targetWs.addEventListener("close", c => {
        m8().debug({
          msg: "target websocket closed",
          targetUrl: R,
          code: c.code,
          reason: c.reason
        }), $z(h, c.code, c.reason);
      }), t.targetWs.addEventListener("error", c => {
        m8().error({
          msg: "target websocket error",
          targetUrl: R,
          error: _r(c)
        }), $z(h, 1011, "Target WebSocket error");
      });
    },
    onMessage: async (r, h) => {
      if (!t.targetWs || !t.connectPromise) {
        m8().error({
          msg: "websocket state not initialized",
          targetUrl: R
        });
        return;
      }
      try {
        if (await t.connectPromise, t.targetWs.readyState === e.OPEN) t.targetWs.send(r.data);else m8().warn({
          msg: "target websocket not open",
          targetUrl: R,
          readyState: t.targetWs.readyState
        });
      } catch (i) {
        m8().error({
          msg: "failed to connect to target websocket",
          targetUrl: R,
          error: i
        }), $z(h, 1011, "Failed to connect to target");
      }
    },
    onClose: (r, h) => {
      if (m8().debug({
        msg: "client websocket closed",
        targetUrl: R,
        code: r.code,
        reason: r.reason,
        wasClean: r.wasClean
      }), t.targetWs) {
        if (t.targetWs.readyState === e.OPEN || t.targetWs.readyState === e.CONNECTING) t.targetWs.close(1000, r.reason || "Client disconnected");
      }
    },
    onError: (r, h) => {
      if (m8().error({
        msg: "client websocket error",
        targetUrl: R,
        event: r
      }), t.targetWs) {
        if (t.targetWs.readyState === e.OPEN) t.targetWs.close(1011, "Client WebSocket error");else if (t.targetWs.readyState === e.CONNECTING) t.targetWs.close();
      }
    }
  };
}
function $z(T, R, a) {
  if (T.readyState === 1) T.close(R, a);else if ("close" in T && T.readyState === WebSocket.OPEN) T.close(R, a);
}
function VI(T) {
  return {
    actorId: T.actor_id,
    name: T.name,
    key: Ct0(T.key),
    createTs: T.create_ts,
    startTs: T.start_ts ?? null,
    connectableTs: T.connectable_ts ?? null,
    sleepTs: T.sleep_ts ?? null,
    destroyTs: T.destroy_ts ?? null,
    error: T.error ?? void 0
  };
}
function yr0() {
  return Vx("devtools");
}
function kr0(T) {
  if (!window) {
    yr0().warn("devtools not available outside browser environment");
    return;
  }
  if (!document.getElementById(SPT)) {
    let R = document.createElement("script");
    R.id = SPT, R.src = Pr0(), R.async = !0, document.head.appendChild(R);
  }
  window.__rivetkit = window.__rivetkit || [], window.__rivetkit.push(T);
}
function xr0(T) {
  let R = T === void 0 ? {} : typeof T === "string" ? {
      endpoint: T
    } : T,
    a = ar0.parse(R),
    e = new ur0(a);
  if (a.devtools) kr0(a);
  return Jt0(e, a);
}
function NP(T, R) {
  var a = {};
  for (var e in T) if (Object.prototype.hasOwnProperty.call(T, e) && R.indexOf(e) < 0) a[e] = T[e];
  if (T != null && typeof Object.getOwnPropertySymbols === "function") {
    for (var t = 0, e = Object.getOwnPropertySymbols(T); t < e.length; t++) if (R.indexOf(e[t]) < 0 && Object.prototype.propertyIsEnumerable.call(T, e[t])) a[e[t]] = T[e[t]];
  }
  return a;
}
function No(T, R) {
  return (Array.isArray(R) ? R : [R]).some(a => {
    var e;
    let t = ((e = T === null || T === void 0 ? void 0 : T.def) === null || e === void 0 ? void 0 : e.type) === fr0[a];
    if (a === "ZodDiscriminatedUnion") return t && "discriminator" in T.def;
    return t;
  });
}
function Ry(T) {
  return T && "def" in T;
}
class kGT {
  constructor() {
    this._map = new Map(), this._idmap = new Map();
  }
  add(T, ...R) {
    let a = R[0];
    if (this._map.set(T, a), a && typeof a === "object" && "id" in a) {
      if (this._idmap.has(a.id)) throw Error(`ID ${a.id} already exists in the registry`);
      this._idmap.set(a.id, T);
    }
    return this;
  }
  clear() {
    return this._map = new Map(), this._idmap = new Map(), this;
  }
  remove(T) {
    let R = this._map.get(T);
    if (R && typeof R === "object" && "id" in R) this._idmap.delete(R.id);
    return this._map.delete(T), this;
  }
  get(T) {
    let R = T._zod.parent;
    if (R) {
      let a = {
        ...(this.get(R) ?? {})
      };
      return delete a.id, {
        ...a,
        ...this._map.get(T)
      };
    }
    return this._map.get(T);
  }
  has(T) {
    return this._map.has(T);
  }
}
function Ir0() {
  return new kGT();
}
function vz(T) {
  return T === void 0;
}
function gr0(T, R) {
  let a = {};
  return Object.entries(T).forEach(([e, t]) => {
    if (!R.some(r => r === e)) a[e] = t;
  }), a;
}
function jz(T, R) {
  let a = {};
  return Object.entries(T).forEach(([e, t]) => {
    if (!R(t, e)) a[e] = t;
  }), a;
}
class Ho {
  static collectMetadata(T, R) {
    let a = this.getMetadataFromRegistry(T),
      e = Object.assign(Object.assign({}, a === null || a === void 0 ? void 0 : a._internal), R === null || R === void 0 ? void 0 : R._internal),
      t = Object.assign(Object.assign({}, a === null || a === void 0 ? void 0 : a.param), R === null || R === void 0 ? void 0 : R.param),
      r = Object.assign(Object.assign(Object.assign(Object.assign({}, Object.keys(e).length > 0 ? {
        _internal: e
      } : {}), a), R), Object.keys(t).length > 0 ? {
        param: t
      } : {});
    if (No(T, ["ZodOptional", "ZodNullable", "ZodDefault", "ZodPrefault", "ZodReadonly", "ZodNonOptional"]) && Ry(T._zod.def.innerType)) return this.collectMetadata(T._zod.def.innerType, r);
    if (No(T, "ZodPipe")) {
      let h = T._zod.def.in,
        i = T._zod.def.out;
      if (No(h, "ZodTransform") && Ry(i)) return this.collectMetadata(i, r);
      if (Ry(h)) return this.collectMetadata(h, r);
    }
    return r;
  }
  static getMetadata(T) {
    return this.collectMetadata(T);
  }
  static getOpenApiMetadata(T) {
    let R = this.collectMetadata(T),
      a = R !== null && R !== void 0 ? R : {},
      {
        _internal: e
      } = a;
    return NP(a, ["_internal"]);
  }
  static getInternalMetadata(T) {
    var R;
    return (R = this.collectMetadata(T)) === null || R === void 0 ? void 0 : R._internal;
  }
  static getParamMetadata(T) {
    let R = this.collectMetadata(T);
    return Object.assign(Object.assign({}, R), {
      param: Object.assign(Object.assign({}, (R === null || R === void 0 ? void 0 : R.description) ? {
        description: R.description
      } : {}), R === null || R === void 0 ? void 0 : R.param)
    });
  }
  static buildSchemaMetadata(T) {
    return jz(gr0(T, ["param", "_internal"]), vz);
  }
  static buildParameterMetadata(T) {
    return jz(T, vz);
  }
  static applySchemaMetadata(T, R) {
    return jz(Object.assign(Object.assign({}, T), this.buildSchemaMetadata(R)), vz);
  }
  static getRefId(T) {
    var R;
    return (R = this.getInternalMetadata(T)) === null || R === void 0 ? void 0 : R.refId;
  }
  static unwrapChained(T) {
    return this.unwrapUntil(T);
  }
  static getDefaultValue(T) {
    var R;
    let a = (R = this.unwrapUntil(T, "ZodDefault")) !== null && R !== void 0 ? R : this.unwrapUntil(T, "ZodPrefault");
    return a === null || a === void 0 ? void 0 : a._zod.def.defaultValue;
  }
  static unwrapUntil(T, R) {
    if (R && No(T, R)) return T;
    if (No(T, ["ZodOptional", "ZodNullable", "ZodDefault", "ZodPrefault", "ZodReadonly", "ZodNonOptional"]) && Ry(T._zod.def.innerType)) return this.unwrapUntil(T._zod.def.innerType, R);
    if (No(T, "ZodPipe")) {
      let a = T._zod.def.in,
        e = T._zod.def.out;
      if (No(a, "ZodTransform") && Ry(e)) return this.unwrapUntil(e, R);
      if (Ry(a)) return this.unwrapUntil(a, R);
    }
    return R ? void 0 : T;
  }
  static getMetadataFromInternalRegistry(T) {
    return OPT.get(T);
  }
  static getMetadataFromRegistry(T) {
    let R = this.getMetadataFromInternalRegistry(T),
      a = T.meta();
    if (!R) return a;
    let {
        _internal: e
      } = R,
      t = NP(R, ["_internal"]),
      r = a !== null && a !== void 0 ? a : {},
      {
        id: h,
        title: i
      } = r,
      c = NP(r, ["id", "title"]);
    return Object.assign(Object.assign(Object.assign({
      _internal: Object.assign(Object.assign({}, h ? {
        refId: h
      } : {}), e)
    }, t), i ? {
      description: i
    } : {}), c);
  }
  static setMetadataInRegistry(T, R) {
    OPT.add(T, R);
  }
}
function $o(T, R) {
  let a = T[R];
  if (typeof a !== "function") return;
  T[R] = function (...e) {
    let t = a.apply(this, e),
      r = Ho.getMetadataFromRegistry(this);
    if (r) Ho.setMetadataInRegistry(t, r);
    return t;
  };
}
function $r0(T) {
  if (typeof T.ZodType.prototype.openapi < "u") return;
  T.ZodType.prototype.openapi = function (...R) {
    let {
        refId: a,
        metadata: e,
        options: t
      } = vr0(...R),
      r = e !== null && e !== void 0 ? e : {},
      {
        param: h
      } = r,
      i = NP(r, ["param"]),
      c = Ho.getMetadataFromRegistry(this),
      s = c !== null && c !== void 0 ? c : {},
      {
        _internal: A
      } = s,
      l = NP(s, ["_internal"]),
      o = Object.assign(Object.assign(Object.assign({}, A), t), a ? {
        refId: a
      } : void 0),
      n = Object.assign(Object.assign(Object.assign({}, l), i), (l === null || l === void 0 ? void 0 : l.param) || h ? {
        param: Object.assign(Object.assign({}, l === null || l === void 0 ? void 0 : l.param), h)
      } : void 0),
      p = new this.constructor(this._def);
    function _(b) {
      Ho.setMetadataInRegistry(b, Object.assign(Object.assign({}, Object.keys(o).length > 0 ? {
        _internal: o
      } : void 0), n));
    }
    if (_(p), No(p, "ZodLazy")) _(this);
    if (No(p, "ZodObject")) {
      let b = Ho.getMetadataFromRegistry(p),
        y = p.extend;
      p.extend = function (...u) {
        let P = y.apply(p, u),
          k = b !== null && b !== void 0 ? b : {},
          {
            _internal: x
          } = k,
          f = NP(k, ["_internal"]);
        return Ho.setMetadataInRegistry(P, {
          _internal: {
            extendedFrom: (x === null || x === void 0 ? void 0 : x.refId) ? {
              refId: x.refId,
              schema: p
            } : x === null || x === void 0 ? void 0 : x.extendedFrom
          }
        }), P.openapi(f);
      }, $o(p, "catchall");
    }
    $o(p, "optional"), $o(p, "nullable"), $o(p, "default"), $o(p, "transform"), $o(p, "refine"), $o(p, "length"), $o(p, "min"), $o(p, "max");
    let m = p.meta;
    return p.meta = function (...b) {
      let y = m.apply(this, b);
      if (b[0]) {
        let u = Ho.getMetadataFromInternalRegistry(this);
        if (u) Ho.setMetadataInRegistry(y, Object.assign(Object.assign({}, u), b[0]));
      }
      return y;
    }, p;
  };
}
function vr0(T, R, a) {
  if (typeof T === "string") return {
    refId: T,
    metadata: R,
    options: a
  };
  return {
    refId: void 0,
    metadata: T,
    options: R
  };
}
async function dr0(T, R) {
  let a = await T.formData();
  if (a) return Er0(a, R);
  return {};
}
function Er0(T, R) {
  let a = Object.create(null);
  if (T.forEach((e, t) => {
    if (!(R.all || t.endsWith("[]"))) a[t] = e;else Cr0(a, t, e);
  }), R.dot) Object.entries(a).forEach(([e, t]) => {
    if (e.includes(".")) Lr0(a, e, t), delete a[e];
  });
  return a;
}
function fGT(T, R) {
  let a = this.buildAllMatchers(),
    e = (t, r) => {
      let h = a[t] || a[ta],
        i = h[2][r];
      if (i) return i;
      let c = r.match(h[0]);
      if (!c) return [[], $eT];
      let s = c.indexOf("", 1);
      return [h[1][s], c];
    };
  return this.match = e, e(T, R);
}
function Ur0(T, R) {
  if (T.length === 1) return R.length === 1 ? T < R ? -1 : 1 : -1;
  if (R.length === 1) return 1;
  if (T === _v || T === bv) return 1;else if (R === _v || R === bv) return -1;
  if (T === Pw) return 1;else if (R === Pw) return -1;
  return T.length === R.length ? T < R ? -1 : 1 : R.length - T.length;
}
function gGT(T) {
  return IGT[T] ??= new RegExp(T === "*" ? "" : `^${T.replace(/\/\*$|([.\\+*[^\]$()])/g, (R, a) => a ? `\\${a}` : "(?:|/.*)")}$`);
}
function zr0() {
  IGT = Object.create(null);
}
function Fr0(T) {
  let R = new Wr0(),
    a = [];
  if (T.length === 0) return qr0;
  let e = T.map(s => [!/\*|\/:/.test(s[0]), ...s]).sort(([s, A], [l, o]) => s ? 1 : l ? -1 : A.length - o.length),
    t = Object.create(null);
  for (let s = 0, A = -1, l = e.length; s < l; s++) {
    let [o, n, p] = e[s];
    if (o) t[n] = [p.map(([m]) => [m, Object.create(null)]), $eT];else A++;
    let _;
    try {
      _ = R.insert(n, A, o);
    } catch (m) {
      throw m === Dy ? new iaT(n) : m;
    }
    if (o) continue;
    a[A] = p.map(([m, b]) => {
      let y = Object.create(null);
      b -= 1;
      for (; b >= 0; b--) {
        let [u, P] = _[b];
        y[u] = P;
      }
      return [m, y];
    });
  }
  let [r, h, i] = R.buildRegExp();
  for (let s = 0, A = a.length; s < A; s++) for (let l = 0, o = a[s].length; l < o; l++) {
    let n = a[s][l]?.[1];
    if (!n) continue;
    let p = Object.keys(n);
    for (let _ = 0, m = p.length; _ < m; _++) n[p[_]] = i[n[p[_]]];
  }
  let c = [];
  for (let s in h) c[s] = a[h[s]];
  return [r, c, t];
}
function ay(T, R) {
  if (!T) return;
  for (let a of Object.keys(T).sort((e, t) => t.length - e.length)) if (gGT(a).test(R)) return [...T[a]];
  return;
}
function Pi0(T, R, a) {
  let e = R,
    t = R ? R.next : T.head,
    r = new LeT(a, e, t, T);
  return r.next === void 0 && (T.tail = r), r.prev === void 0 && (T.head = r), T.length++, r;
}
function ki0(T, R) {
  T.tail = new LeT(R, T.tail, void 0, T), T.head || (T.head = T.tail), T.length++;
}
function xi0(T, R) {
  T.head = new LeT(R, void 0, T.head, T), T.tail || (T.tail = T.head), T.length++;
}
function nH(T) {
  return xr0(T);
}
function Pi(T) {
  if (T.includes("staging.ampcodedev.org")) return ic0;
  return hc0;
}
function lH(T) {
  if (T.includes("staging.ampcodedev.org")) return sc0;
  return cc0;
}
async function RKT(T) {
  let R = T.workerURL ?? Pi(T.ampURL),
    a = await T.configService.getLatest(T.signal),
    e = await a.secrets.getToken("apiKey", a.settings.url);
  if (!e) throw Error("API key required. Please run `amp login` first.");
  let t = await fetch(`${R}/threads/${T.threadID}/context-analysis`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${e}`
    },
    signal: T.signal
  });
  if (!t.ok) {
    let h = await t.text();
    throw Error(`Context analysis request failed (${t.status}): ${h}`);
  }
  let r = await t.json();
  if (!r.ok || !r.analysis) throw Error(r.error ?? "Invalid context analysis response from DTW");
  return r.analysis;
}
async function oc0(T) {
  let R = lH(T.ampURL),
    a = nH({
      endpoint: R
    }),
    e = await T.configService.getLatest(T.signal),
    t = await e.secrets.getToken("apiKey", e.settings.url);
  if (!t) throw Error("API key required. Please run `amp login` first.");
  let r = await a.threadActor.get([T.threadID]).fetch("/context-analysis", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${t}`
    },
    signal: T.signal
  });
  if (!r.ok) {
    let i = await r.text();
    throw Error(`Context analysis request failed (${r.status}): ${i}`);
  }
  let h = await r.json();
  if (!h.ok || !h.analysis) throw Error(h.error ?? "Invalid context analysis response from DTW");
  return h.analysis;
}
function Ki(T, R = !1) {
  if (R || T < 1000) return T.toLocaleString();
  return `${(T / 1000).toFixed(1)}k`;
}
function lc0(T, R, a, e, t, r, h) {
  return;
}
async function eX0(T, R, a, e, t, r, h, i, c) {
  r(t, T);
  let s = await h(R, T);
  try {
    let A = e.v2 === !0;
    nc0.write(oR.dim(A ? `Analyzing context tokens via v2 worker...
` : `Analyzing context tokens...
`));
    let l = A ? await RKT({
      ampURL: R.ampURL,
      configService: s.configService,
      threadID: a,
      workerURL: e.workerUrl
    }) : await (async () => {
      let y = await i(a, s),
        u = await m0(ln(s.configService).pipe(da(P => P !== "pending")));
      return oFT({
        configService: s.configService,
        buildSystemPromptDeps: {
          configService: s.configService,
          toolService: s.toolService,
          filesystem: He,
          skillService: s.skillService,
          getThreadEnvironment: Hs,
          threadService: s.threadService,
          serverStatus: X9(u) ? u : void 0
        },
        mcpInitialized: s.mcpService.initialized
      }, y);
    })();
    if (Ba.write(`
`), Ba.write(oR.bold(`Context Usage Analysis
`)), Ba.write(oR.dim("\u2500".repeat(50) + `
`)), A) Ba.write(oR.dim(`Source: v2 worker
`));
    Ba.write(`Model: ${l.modelDisplayName} (${Ki(l.maxContextTokens)} context)

`);
    let o = l.sections.flatMap(y => [y.name, ...(y.children?.map(u => `  ${u.name}`) ?? [])]),
      n = Math.max(...o.map(y => y.length));
    for (let y of l.sections) {
      let u = y.name.padEnd(n + 2),
        P = Ki(y.tokens).padStart(8),
        k = `(${y.percentage.toFixed(1)}%)`.padStart(8);
      if (Ba.write(`  ${u}${P} ${k}
`), y.children && y.children.length > 0) for (let x of y.children) {
        let f = `  ${x.name}`.padEnd(n + 2),
          v = Ki(x.tokens).padStart(8),
          g = `(${x.percentage.toFixed(1)}%)`.padStart(8);
        Ba.write(oR.dim(`  ${f}${v} ${g}
`));
      }
    }
    Ba.write(`
`);
    let p = (l.totalTokens / l.maxContextTokens * 100).toFixed(1);
    Ba.write(`Used:  ${Ki(l.totalTokens, !0)} tokens (${p}% used)
`), Ba.write(`Free:  ${Ki(l.freeSpace, !0)} tokens
`);
    let _ = [`${l.toolCounts.builtin} builtin`];
    if (l.toolCounts.toolbox > 0) _.push(`${l.toolCounts.toolbox} toolbox`);
    if (l.toolCounts.mcp > 0) _.push(`${l.toolCounts.mcp} MCP`);
    Ba.write(oR.dim(`Tools: ${l.toolCounts.total} (${_.join(", ")})
`));
    let m = await i(a, s).catch(() => null),
      b = m ? $h(m) : null;
    if (b?.totalInputTokens) {
      let y = b.totalInputTokens,
        u = l.totalTokens - y;
      if (Ba.write(`
`), Ba.write(oR.dim("\u2500".repeat(50) + `
`)), Ba.write(oR.dim(`Comparison with last inference:
`)), Ba.write(oR.dim(`  Last inference:   ${Ki(y, !0).padStart(8)} tokens
`)), b.cacheCreationInputTokens || b.cacheReadInputTokens) Ba.write(oR.dim(`    (input: ${Ki(b.inputTokens)}, cache-create: ${Ki(b.cacheCreationInputTokens ?? 0)}, cache-read: ${Ki(b.cacheReadInputTokens ?? 0)})
`));
      Ba.write(oR.dim(`  Current analysis: ${Ki(l.totalTokens, !0).padStart(8)} tokens
`));
      let P = u >= 0 ? "+" : "-";
      if (Ba.write(oR.dim(`  Difference:       ${P}${Ki(Math.abs(u), !0).padStart(7)} tokens
`)), Math.abs(u) > 100) Ba.write(oR.dim(`  (Analysis regenerates context; differences expected due to dynamic content)
`));
    }
    await s.asyncDispose(), process.exit(0);
  } catch (A) {
    await s.asyncDispose();
    let l = `Failed to analyze thread context: ${A instanceof Error ? A.message : String(A)}`;
    c(l);
  }
}
function pc0() {
  G1 = process.hrtime.bigint();
}
function _c0() {
  if (G1 === null) return null;
  return Number(process.hrtime.bigint() - G1) / 1e6;
}
function Pc0(T) {
  try {
    if (K1.statSync(T).size > yc0) K1.truncateSync(T, 0);
  } catch {}
}
function kc0(T) {
  return T instanceof Error && T.message.includes("write after end");
}
function og(T, R, a, e) {
  if (NeT) return;
  try {
    T[R](a, ...e);
  } catch (t) {
    if (!kc0(t)) throw t;
  }
}
function xc0(T) {
  NeT = !1, u$ = null;
  let {
    logFile: R,
    logLevel: a
  } = T;
  if (!AkT.includes(a)) console.warn(`Invalid log level: ${a}. Using 'info' instead.`);
  try {
    K1.mkdirSync(BeT.dirname(R), {
      recursive: !0
    });
  } catch (i) {
    console.error(`Failed to create log directory: ${i}`);
  }
  Pc0(R);
  let e = Xh.default.format(i => {
      for (let c of Object.keys(i)) {
        let s = i[c];
        if (s instanceof Error) i[c] = {
          name: s.name,
          message: s.message,
          stack: s.stack
        };
      }
      return i;
    }),
    t = Xh.default.format(i => {
      return i.pid = process.pid, i;
    }),
    r = [new Xh.default.transports.File({
      filename: R
    }), new eKT()];
  if (process.env.AMP_CLI_STDOUT_DEBUG === "true") r.push(new Xh.default.transports.Console({
    level: "debug",
    format: Xh.default.format.combine(Xh.default.format.colorize(), Xh.default.format.simple())
  }));
  gv = Xh.default.createLogger({
    level: AkT.includes(a) ? a : "info",
    format: Xh.default.format.combine(Xh.default.format.timestamp(), t(), e(), Xh.default.format.json(), Xh.default.format.errors({
      stack: !0
    })),
    transports: r
  });
  let h = gv;
  return PnR({
    error: (i, ...c) => {
      og(h, "error", i, c);
    },
    warn: (i, ...c) => {
      og(h, "warn", i, c);
    },
    info: (i, ...c) => {
      og(h, "info", i, c);
    },
    debug: (i, ...c) => {
      og(h, "debug", i, c);
    },
    audit: (i, ...c) => {
      let s = typeof c[0] === "object" && c[0] !== null ? {
        audit: !0,
        ...c[0]
      } : {
        audit: !0
      };
      og(h, "info", i, [s]);
    }
  }), R;
}
function xb() {
  if (u$) return u$;
  let T = gv;
  if (!T) return Promise.resolve();
  return NeT = !0, u$ = new Promise(R => {
    let a = !1,
      e = () => {
        if (!a) {
          if (a = !0, gv === T) gv = void 0;
          R();
        }
      };
    setImmediate(() => {
      try {
        T.once("finish", e).once("error", e).end();
      } catch {
        e();
      }
    }), setTimeout(e, 500);
  }), u$;
}
function eF(T) {
  return T.endsWith("/") ? T.slice(0, -1) : T;
}
function vc0(T) {
  let R = pFT(T);
  try {
    let t = new URL(R);
    return eF(`${t.host}${t.pathname}`).replace(/^\//, "");
  } catch {}
  let a = R.match(/^[^@]+@([^:/]+)[:/](.+)$/);
  if (a?.[1] && a[2]) return eF(`${a[1]}/${a[2]}`).replace(/\.git$/, "");
  let e = R.match(/^([^:]+):(.+)$/);
  if (e?.[1] && e[2]) return eF(`${e[1]}/${e[2]}`).replace(/\.git$/, "");
  return null;
}
async function tKT(T) {
  try {
    let {
        stdout: R
      } = await gc0("git", ["remote", "get-url", "origin"], {
        cwd: T
      }),
      a = R.trim();
    if (!a) return null;
    return vc0(a);
  } catch {
    return null;
  }
}
function jc0(T) {
  let R = [...$c0];
  if (T?.team?.disablePrivateThreads) {
    let a = R.indexOf("private");
    if (a !== -1) R.splice(a, 1);
  }
  if (T?.team?.groups && T.team.groups.length > 0) R.push("group");
  return R;
}
function pkT(T) {
  let R = T?.team?.disablePrivateThreads ?? !1,
    a = T?.team?.defaultThreadVisibility;
  if (!a || a === "private") return R ? "workspace" : "private";
  if (a === "thread_workspace_shared") return "workspace";
  if (a === "creator_groups_fallback_private") {
    if (T?.team?.groups?.length) return "group";
    return R ? "workspace" : "private";
  }
  return R ? "workspace" : "private";
}
function Sc0(T) {
  if (T?.team?.groups !== void 0) return Error(["Group visibility is not available. ", `You are not a member of any group in this workspace.
`].join(""));
  return Error(`Group visibility is not available.
`);
}
function _kT(T, R) {
  let a = [`Invalid ${T ? `visibility for amp.defaultVisibility.${T}` : "visibility"}. `, `Must be one of: ${R.join(", ")}.
`].join("");
  return Error(a);
}
function Oc0(T, R) {
  return R.includes(T);
}
function dc0(T) {
  return T?.team?.billingMode === "enterprise" || T?.team?.billingMode === "enterprise.selfserve";
}
function rKT(T, R, a) {
  if (T === void 0 || T === null) return;
  let e = jc0(R);
  if (typeof T !== "string") return _kT(a, e);
  if (T === "group" && !e.includes("group")) return Sc0(R);
  if (Oc0(T, e)) return T;
  return _kT(a, e);
}
async function Ec0(T, R, a) {
  let e = await tKT(R);
  if (!e) return;
  let t;
  try {
    t = await T.get("defaultVisibility");
  } catch (h) {
    J.warn("Failed to read defaultVisibility setting", {
      error: h
    });
    return;
  }
  let r = t?.[e];
  return rKT(r, a, e);
}
async function UeT(T, R, a, e) {
  if (e) return e;
  if (!dc0(a)) return pkT(a);
  let t = await Ec0(T, R, a);
  if (t instanceof Error) return t;
  return t ?? pkT(a);
}
function Cc0(T, R) {
  return rKT(T, R);
}
async function Lc0(T, R, a) {
  let e = await tKT(R);
  if (!e) return Error("No git origin remote found for this repository.");
  let t = {
    ...((await T.get("defaultVisibility", "global")) ?? {}),
    [e]: a
  };
  return await T.set("defaultVisibility", t, "global"), {
    repoKey: e
  };
}
function HeT(T) {
  let R = T.replace(/-/g, "");
  if (R.length !== 32) throw Error(`Invalid UUID hex length: ${R.length}`);
  let a = BigInt("0x" + R),
    e = "";
  while (a > 0n) e = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Number(a % 62n)] + e, a = a / 62n;
  return e.padStart(22, "0");
}
function Vb() {
  return `M-${HeT(VS())}`;
}
function Nc0() {
  return `TU-${HeT(VS())}`;
}
function bkT() {
  return `E-${HeT(VS())}`;
}
function bo0(T) {
  if (typeof T !== "string") return !1;
  return _o0.has(T);
}
function mH(T, R) {
  if (T && typeof T === "object" && "type" in T) {
    let e = T;
    if (e.type === "delta" || e.type === "snapshot") return e;
  }
  if (R === "snapshot") return {
    type: "snapshot",
    value: T
  };
  let a = typeof T === "string" ? T : T !== void 0 ? JSON.stringify(T) : "";
  return {
    type: "delta",
    blocks: a ? [{
      type: "text",
      text: a
    }] : void 0,
    state: "generating"
  };
}
function xn0(T, R = {}) {
  let a = (R.mode ?? "lenient") === "strict";
  if (!Array.isArray(T)) return a ? null : [];
  let e = [];
  for (let t of T) {
    if (typeof t !== "object" || t === null) {
      if (a) return null;
      continue;
    }
    let r = t;
    if (typeof r.uri !== "string" || r.uri.length === 0) {
      if (a) return null;
      continue;
    }
    let h;
    try {
      h = d0(zR.parse(r.uri));
    } catch {
      if (a) return null;
      continue;
    }
    let i = {
      uri: h
    };
    if (typeof r.content === "string") i.content = r.content;
    if (typeof r.lineCount === "number" && Number.isFinite(r.lineCount)) i.lineCount = r.lineCount;
    if (typeof r.hash === "string") i.hash = r.hash;
    e.push(i);
  }
  return e;
}
function Y1(T, R) {
  if (T.length <= R) return T;
  return `${T.slice(0, R)}...<truncated>`;
}
function In0(T) {
  return T.replace(/\s+/g, " ").trim();
}
function gn0(T) {
  if (!T || typeof T !== "object") return [];
  let R = T.issues;
  return Array.isArray(R) ? R.slice(0, 5) : [];
}
function $n0(T) {
  if (T === void 0) return null;
  if (typeof T === "string") return JSON.stringify(T);
  if (typeof T === "number" || typeof T === "boolean" || T === null) return JSON.stringify(T);
  try {
    return Y1(JSON.stringify(T), 120);
  } catch {
    return Y1(String(T), 120);
  }
}
function $KT(T) {
  if (!Array.isArray(T) || T.length === 0) return null;
  let R = T.map(a => typeof a === "number" ? `[${a}]` : String(a)).join(".").replace(/\.\[/g, "[");
  return R.length > 0 ? R : null;
}
function vn0(T) {
  if (!T || typeof T !== "object") return null;
  let R = T,
    a = typeof R.message === "string" ? R.message : null,
    e = typeof R.note === "string" ? R.note : null,
    t = $KT(R.path);
  if (t && a && a !== "Invalid input") return `${t}: ${a}`;
  if (t && e) return `${t}: ${e}`;
  if (t && a) return `invalid value at ${t}`;
  return e ?? a;
}
function vKT(T) {
  for (let R of T) {
    let a = vn0(R);
    if (a) return a;
  }
  return null;
}
function jn0(T) {
  return T.some(R => {
    if (!R || typeof R !== "object") return !1;
    let a = R;
    return a.code === "invalid_union" && (a.note === "No matching discriminator" || a.discriminator === "type" || $KT(a.path) === "type");
  });
}
function Sn0(T, R) {
  let a = vKT(R);
  if (T && a) return `type ${JSON.stringify(T)} failed validation: ${a}`;
  if (T) return `type ${JSON.stringify(T)} failed validation`;
  if (a) return `message payload failed validation: ${a}`;
  return "message payload failed validation";
}
function On0(T, R, a) {
  let e = gn0(R),
    t = (() => {
      let s = In0(T);
      if (s.length === 0) return null;
      return Y1(s, a?.payloadPreviewMaxChars ?? 1200);
    })(),
    r;
  try {
    r = JSON.parse(T);
  } catch {
    let s = vKT(e);
    return {
      failureType: "invalid_json",
      summary: s ? `malformed JSON: ${s}` : "malformed JSON",
      messageType: null,
      typePreview: null,
      payloadPreview: t,
      issues: e
    };
  }
  if (!r || typeof r !== "object" || Array.isArray(r)) return {
    failureType: "invalid_shape",
    summary: "expected a JSON object payload",
    messageType: null,
    typePreview: null,
    payloadPreview: t,
    issues: e
  };
  let h = r;
  if (!Object.hasOwn(h, "type")) return {
    failureType: "missing_type",
    summary: 'missing string "type"',
    messageType: null,
    typePreview: null,
    payloadPreview: t,
    issues: e
  };
  let i = h.type,
    c = $n0(i);
  if (typeof i !== "string") return {
    failureType: "invalid_type",
    summary: `expected string "type", got ${c ?? "unknown value"}`,
    messageType: null,
    typePreview: c,
    payloadPreview: t,
    issues: e
  };
  if (jn0(e)) return {
    failureType: "unknown_type",
    summary: `unsupported type ${JSON.stringify(i)} (likely protocol version mismatch)`,
    messageType: i,
    typePreview: c,
    payloadPreview: t,
    issues: e
  };
  return {
    failureType: "invalid_shape",
    summary: Sn0(i, e),
    messageType: i,
    typePreview: c,
    payloadPreview: t,
    issues: e
  };
}
function dn0(T) {
  let R = Number.isFinite(T) ? T : 0,
    a = 0,
    e = R;
  function t(h = R) {
    if (Number.isFinite(h)) R = h;
    return a = 0, e = R, R;
  }
  function r(h) {
    if (!Number.isFinite(h) || h < 1) return R;
    if (h <= a) return R;
    if (a === 0) e = R - (h - 1);
    return R = Math.max(R, e + h), a = h, R;
  }
  return {
    getVersion: () => R,
    reset: t,
    advanceFromSeq: r
  };
}
function Q1(T) {
  return {
    kind: jKT,
    failureType: T.failureType ?? null,
    source: T.source ?? null,
    direction: T.direction ?? null,
    stage: T.stage ?? null,
    summary: T.summary ?? null,
    messageType: T.messageType ?? null,
    typePreview: T.typePreview ?? null,
    payloadPreview: T.payloadPreview ?? null,
    issues: T.issues ?? []
  };
}
function Ln0(T) {
  let R = Q1(T);
  return JSON.stringify(R);
}
function SKT(T, R) {
  let a = On0(T, R);
  return Ln0({
    failureType: a.failureType,
    source: "dtw-transport",
    direction: "server->client",
    stage: "decode-server-message",
    summary: a.summary,
    messageType: a.messageType,
    typePreview: a.typePreview,
    payloadPreview: a.payloadPreview,
    issues: a.issues
  });
}
function Mn0(T) {
  let R = T.startsWith(mkT) ? T.slice(mkT.length) : T,
    a;
  try {
    a = JSON.parse(R);
  } catch {
    return null;
  }
  let e = En0.safeParse(a);
  if (e.success) return Q1(e.data);
  let t = Cn0.safeParse(a);
  if (t.success) return Q1(t.data);
  return null;
}
function XeT() {
  return globalThis;
}
function dKT(T) {
  if (!T || typeof T !== "object") return null;
  let R = T;
  if (typeof R.addEventListener !== "function" || typeof R.removeEventListener !== "function") return null;
  return R;
}
function PkT() {
  return dKT(XeT().window);
}
function tF() {
  let T = XeT().document;
  if (!dKT(T)) return null;
  return T;
}
function zn0() {
  let T = XeT().navigator;
  if (!T || typeof T !== "object") return null;
  return T;
}
function Fn0(T) {
  if (!T) return "none";
  let R = [T.type];
  if (T.code !== void 0) R.push(`code=${T.code}`);
  if (T.reason !== void 0) R.push(`reason=${T.reason}`);
  if (T.error !== void 0) R.push(`error=${T.error}`);
  return R.join(" ");
}
function EKT(T) {
  return !!(T.apiKey && T.WebSocketClass);
}
function Gn0(T) {
  if (EKT(T)) return "one-step";
  return "two-step";
}
class YeT {
  ws = null;
  connectionInfo = {
    state: "disconnected",
    role: null,
    clientId: null,
    threadId: null
  };
  reconnectCause = null;
  reconnectAttempts = 0;
  reconnectTimeoutID = null;
  reconnectResetTimeoutID = null;
  pingIntervalID = null;
  disposed = !1;
  lastPongAt = Date.now();
  intentionallyClosedSockets = new WeakSet();
  reconnectActivityCleanup = null;
  lifecycleEventID = 0;
  lifecycleEvents = [];
  connectionSubject = new f0({
    state: "disconnected",
    role: null,
    clientId: null,
    threadId: null
  });
  lifecycleEventSubject = new f0([]);
  config;
  currentThreadID = null;
  currentWsToken = null;
  constructor(T) {
    this.config = {
      baseURL: T.baseURL,
      threadId: T.threadId,
      apiKey: T.apiKey,
      wsToken: T.wsToken,
      wsTokenProvider: T.wsTokenProvider,
      webSocketProvider: T.webSocketProvider,
      reconnectDelayMs: T.reconnectDelayMs ?? Dn0,
      maxReconnectDelayMs: T.maxReconnectDelayMs ?? wn0,
      maxReconnectAttempts: T.maxReconnectAttempts ?? Bn0,
      pingIntervalMs: T.pingIntervalMs ?? Nn0,
      connectTimeoutMs: T.connectTimeoutMs ?? Un0,
      WebSocketClass: T.WebSocketClass,
      useThreadActors: T.useThreadActors
    }, this.currentThreadID = T.threadId ?? null, this.currentWsToken = T.wsToken ?? null, this.recordLifecycleEvent("transport_initialized", `flow=${Gn0(this.config)} threadId=${this.currentThreadID ?? "none"}`);
  }
  getThreadId() {
    return this.currentThreadID;
  }
  connectionChanges() {
    return this.connectionSubject;
  }
  getConnectionInfo() {
    return {
      ...this.connectionInfo
    };
  }
  waitForConnected(T) {
    if (this.connectionInfo.state === "connected") return Promise.resolve(!0);
    if (this.disposed || T <= 0) return Promise.resolve(!1);
    return new Promise(R => {
      let a = !1,
        e = null,
        t = null,
        r = h => {
          if (a) return;
          if (a = !0, e) clearTimeout(e), e = null;
          t?.unsubscribe(), t = null, R(h);
        };
      e = setTimeout(() => {
        r(!1);
      }, T), t = this.connectionSubject.subscribe({
        next: h => {
          if (h.state === "connected") r(!0);
        },
        error: () => {
          r(!1);
        },
        complete: () => {
          r(!1);
        }
      });
    });
  }
  connectionLifecycleChanges() {
    return this.lifecycleEventSubject;
  }
  getConnectionLifecycleEvents() {
    return [...this.lifecycleEvents];
  }
  async connect() {
    return this.connectInternal({
      fromReconnect: !1
    });
  }
  recordLifecycleEvent(T, R) {
    let a = {
        id: ++this.lifecycleEventID,
        at: Date.now(),
        type: T,
        ...(R ? {
          details: R
        } : {})
      },
      e = Wn0,
      t = this.lifecycleEvents.slice(-(e - 1));
    this.lifecycleEvents = [...t, a], this.lifecycleEventSubject.next([...this.lifecycleEvents]);
  }
  async connectInternal(T) {
    if (this.disposed) throw new z8("Transport is disposed");
    if (this.ws) return;
    this.recordLifecycleEvent("connect_requested", T.fromReconnect ? `mode=reconnect attempt=${this.reconnectAttempts}` : "mode=initial"), this.updateConnectionState("connecting");
    try {
      let R = this.config.WebSocketClass ?? WebSocket,
        a;
      if (this.config.webSocketProvider) a = await this.config.webSocketProvider();else if (EKT(this.config)) {
        let e = this.config.baseURL.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
          t = this.config.apiKey;
        if (!t) throw new z8("1-step flow requires apiKey");
        let r = this.currentThreadID ?? this.config.threadId;
        if (!r) r = (await this.fetchWsToken()).threadId;
        let h = `${e}/threads`;
        if (r) h = `${h}?threadId=${encodeURIComponent(r)}`;
        a = new R(h, {
          headers: {
            Authorization: `Bearer ${t}`
          }
        });
      } else {
        let e = this.config.baseURL.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
          {
            threadId: t,
            wsToken: r
          } = await this.ensureWsToken();
        this.currentThreadID = t, this.currentWsToken = r;
        let h = `${e}/threads`;
        a = new R(h, ["amp", r]);
      }
      try {
        a.binaryType = "arraybuffer";
      } catch {}
      await this.waitForOpen(a), this.ws = a, this.lastPongAt = Date.now(), this.setupWebSocketHandlers(a), this.stopWaitingForReconnectActivity(), this.scheduleReconnectAttemptsReset(), this.reconnectCause = null, this.updateConnectionState("connected"), this.recordLifecycleEvent("connect_succeeded", `threadId=${this.currentThreadID ?? "none"} attempt=${this.reconnectAttempts}`);
    } catch (R) {
      let a = R instanceof Error ? R.message : String(R);
      if (this.recordLifecycleEvent("connect_failed", `mode=${T.fromReconnect ? "reconnect" : "initial"} error=${a}`), !T.fromReconnect && !this.disposed) this.reconnectCause = {
        type: "connect_failed",
        at: Date.now(),
        error: a
      }, this.scheduleReconnect();
      throw R;
    }
  }
  disconnect() {
    this.recordLifecycleEvent("disconnect_requested"), this.stopPingInterval(), this.cancelReconnect(), this.reconnectCause = null;
    let T = this.ws;
    if (T) {
      if (this.ws = null, this.intentionallyClosedSockets.add(T), T.readyState === WebSocket.OPEN) T.close(1000, "Client disconnect");
    }
    this.updateConnectionState("disconnected");
  }
  async disconnectAndWait(T) {
    let R = this.ws;
    if (!R || R.readyState !== WebSocket.OPEN) return this.disconnect(), {
      status: "not_connected"
    };
    let a = this.waitForSocketClose(R, T?.waitForCloseTimeoutMs ?? Hn0);
    return this.disconnect(), a;
  }
  dispose() {
    if (this.disposed) return;
    this.recordLifecycleEvent("disposed"), this.disposed = !0, this.disconnect(), this.connectionSubject.complete(), this.lifecycleEventSubject.complete();
  }
  sendRaw(T) {
    if (!this.hasOpenSocket()) throw new z8("WebSocket is not connected");
    this.ws?.send(T);
  }
  hasOpenSocket() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
  waitForSocketClose(T, R) {
    return new Promise(a => {
      let e = !1,
        t = null,
        r = i => {
          if (e) return;
          if (e = !0, t) clearTimeout(t);
          T.removeEventListener("close", h), a(i);
        },
        h = i => {
          let c = i;
          r({
            status: c.code === 1000 ? "server_acknowledged" : "timeout",
            ...(typeof c.code === "number" ? {
              closeCode: c.code
            } : {}),
            ...(typeof c.reason === "string" ? {
              closeReason: c.reason
            } : {})
          });
        };
      if (t = setTimeout(() => {
        r({
          status: "timeout"
        });
      }, R), T.addEventListener("close", h), T.readyState === WebSocket.CLOSED) r({
        status: "timeout"
      });
    });
  }
  updateConnectionState(T) {
    if (T === "disconnected" || T === "reconnecting") {
      let R = {
        state: T,
        role: null,
        clientId: null,
        threadId: null
      };
      if (this.reconnectCause) R.reconnectCause = this.reconnectCause;
      this.connectionInfo = R;
    } else if (this.connectionInfo.state = T, T === "connected") this.connectionInfo.threadId = this.currentThreadID, this.reconnectCause = null, delete this.connectionInfo.reconnectCause;else if (this.reconnectCause) this.connectionInfo.reconnectCause = this.reconnectCause;
    this.connectionSubject.next({
      ...this.connectionInfo
    }), this.recordLifecycleEvent("state_changed", `state=${T} cause=${Fn0(this.reconnectCause)}`);
  }
  async handleAuthExpired() {
    this.recordLifecycleEvent("auth_refresh_started");
    try {
      if (this.currentWsToken = null, this.config.wsTokenProvider) {
        let T = await this.config.wsTokenProvider({
          forceRefresh: !0
        });
        this.currentThreadID = T.threadId, this.currentWsToken = T.wsToken;
      }
      this.recordLifecycleEvent("auth_refresh_succeeded", `threadId=${this.currentThreadID ?? "none"}`);
    } catch {
      this.recordLifecycleEvent("auth_refresh_failed");
    }
  }
  onRawMessage(T) {}
  onMaxReconnectExceeded(T) {}
  async ensureWsToken() {
    let T = this.reconnectAttempts > 0;
    if (!T && this.currentWsToken && this.currentThreadID) return {
      threadId: this.currentThreadID,
      wsToken: this.currentWsToken
    };
    if (this.config.wsTokenProvider) {
      let R = await this.config.wsTokenProvider(T ? {
        forceRefresh: !0
      } : void 0);
      return this.currentThreadID = R.threadId, this.currentWsToken = R.wsToken, R;
    }
    if (!T && this.config.wsToken && this.config.threadId) return {
      threadId: this.config.threadId,
      wsToken: this.config.wsToken
    };
    return this.fetchWsToken();
  }
  async fetchWsToken() {
    let T = `${this.config.baseURL.replace(/^ws:/, "http:").replace(/^wss:/, "https:")}/threads`,
      R = {
        "Content-Type": "application/json"
      };
    if (this.config.apiKey) R.Authorization = `Bearer ${this.config.apiKey}`;
    let a = this.currentThreadID ?? this.config.threadId,
      e = {};
    if (a) e.threadId = a;
    let t = await fetch(T, {
      method: "POST",
      headers: R,
      body: JSON.stringify(e)
    });
    if (!t.ok) {
      let h = await t.text().catch(() => "");
      throw new z8(`Failed to get wsToken: ${t.status} ${h}`);
    }
    let r = await t.json();
    if (!r.threadId || !r.wsToken) throw new z8("Invalid response from /threads: missing threadId or wsToken");
    return this.currentThreadID = r.threadId, this.currentWsToken = r.wsToken, {
      threadId: r.threadId,
      wsToken: r.wsToken
    };
  }
  async waitForOpen(T) {
    if (T.readyState === WebSocket.OPEN) return;
    return new Promise((R, a) => {
      let e = setTimeout(() => {
          t(), this.updateConnectionState("disconnected");
          try {
            if (T.readyState === WebSocket.CONNECTING) T.close();
          } catch {}
          a(new z8(`WebSocket connection timed out after ${this.config.connectTimeoutMs}ms`));
        }, this.config.connectTimeoutMs),
        t = () => {
          clearTimeout(e), T.removeEventListener("open", r), T.removeEventListener("error", h), T.removeEventListener("close", i);
        },
        r = () => {
          t(), R();
        },
        h = c => {
          t(), this.updateConnectionState("disconnected");
          let s = "message" in c ? c.message : "error" in c && c.error instanceof Error ? c.error.message : c.type;
          a(new z8(`WebSocket connection failed: ${s}`));
        },
        i = c => {
          t(), this.updateConnectionState("disconnected"), a(new z8(`WebSocket closed during connect: code=${c.code} reason=${c.reason || "none"}`));
        };
      if (T.addEventListener("open", r), T.addEventListener("error", h), T.addEventListener("close", i), T.readyState === WebSocket.OPEN) return r();
      if (T.readyState === WebSocket.CLOSED || T.readyState === WebSocket.CLOSING) return i({
        code: 1006,
        reason: "Socket already closed before connect"
      });
    });
  }
  setupWebSocketHandlers(T) {
    if (T.addEventListener("message", R => {
      let a = R.data;
      if (typeof a === "string") {
        if (a === "pong") {
          this.lastPongAt = Date.now(), this.startPingIntervalOnce();
          return;
        }
        this.startPingIntervalOnce(), this.onRawMessage(a);
      } else if (a instanceof ArrayBuffer) this.startPingIntervalOnce(), this.onRawMessage(new TextDecoder().decode(a));
    }), T.addEventListener("close", R => {
      this.handleClose(T, R.code, R.reason);
    }), T.addEventListener("error", () => {
      this.handleError(T);
    }), !this.config.useThreadActors) this.startPingInterval();
  }
  handleClose(T, R, a) {
    let e = this.intentionallyClosedSockets.has(T);
    if (e) this.intentionallyClosedSockets.delete(T);
    if (this.recordLifecycleEvent("socket_closed", `code=${R} reason=${a || "none"} intentional=${e}`), T !== this.ws) return;
    if (this.ws = null, this.stopPingInterval(), this.cancelReconnectAttemptsReset(), !this.disposed && !e) {
      let t = this.reconnectCause,
        r = t?.type === "ping_timeout" && R === 4000 && !a ? {
          ...t,
          at: Date.now(),
          code: R
        } : {
          type: "close",
          at: Date.now(),
          code: R,
          ...(a ? {
            reason: a
          } : {})
        };
      if (this.reconnectCause = r, R === 4001 || a.includes("Token expired")) this.handleAuthExpired().catch(() => {
        return;
      }).finally(() => {
        if (!this.disposed) this.scheduleReconnect();
      });else this.scheduleReconnect();
    } else this.reconnectCause = null, this.updateConnectionState("disconnected");
  }
  handleError(T) {
    if (T !== this.ws) return;
    if (this.recordLifecycleEvent("socket_error", "error=WebSocket error event"), this.reconnectCause = {
      type: "error",
      at: Date.now(),
      error: "WebSocket error event"
    }, this.ws) this.ws.close();
  }
  scheduleReconnect(T) {
    if (this.disposed || this.reconnectTimeoutID) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.stopWaitingForReconnectActivity(), this.recordLifecycleEvent("reconnect_exhausted", `attempts=${this.reconnectAttempts} max=${this.config.maxReconnectAttempts}`), this.updateConnectionState("disconnected"), this.onMaxReconnectExceeded(this.config.maxReconnectAttempts);
      return;
    }
    if (!T?.bypassActivityGate && this.shouldWaitForReconnectActivity()) {
      this.recordLifecycleEvent("reconnect_waiting_for_activity", `offline=${this.isBrowserOffline()} hidden=${this.isDocumentHidden()}`), this.updateConnectionState("reconnecting"), this.waitForReconnectActivity();
      return;
    }
    this.stopWaitingForReconnectActivity(), this.updateConnectionState("reconnecting"), this.reconnectAttempts++;
    let R = T?.immediate ? 0 : this.getReconnectDelayMs();
    this.recordLifecycleEvent("reconnect_scheduled", `attempt=${this.reconnectAttempts} delayMs=${Math.round(R)}`), this.reconnectTimeoutID = setTimeout(() => {
      this.reconnectTimeoutID = null, this.connectInternal({
        fromReconnect: !0
      }).catch(a => {
        if (this.reconnectCause = {
          type: "connect_failed",
          at: Date.now(),
          error: a instanceof Error ? a.message : String(a)
        }, !this.disposed) this.scheduleReconnect();
      });
    }, R);
  }
  cancelReconnect() {
    if (this.reconnectTimeoutID) clearTimeout(this.reconnectTimeoutID), this.reconnectTimeoutID = null;
    this.stopWaitingForReconnectActivity(), this.cancelReconnectAttemptsReset(), this.reconnectAttempts = 0;
  }
  getReconnectDelayMs() {
    let T = this.config.reconnectDelayMs * 2 ** (this.reconnectAttempts - 1),
      R = 0.8 + Math.random() * 0.4;
    return Math.min(T * R, this.config.maxReconnectDelayMs);
  }
  shouldWaitForReconnectActivity() {
    let T = PkT(),
      R = tF();
    if (!T && !R) return !1;
    return this.isBrowserOffline() || this.isDocumentHidden();
  }
  isBrowserOffline() {
    let T = zn0();
    if (typeof T?.onLine !== "boolean") return !1;
    return T.onLine === !1;
  }
  isDocumentHidden() {
    let T = tF();
    if (!T) return !1;
    return T.visibilityState === "hidden";
  }
  waitForReconnectActivity() {
    if (this.reconnectActivityCleanup) return;
    let T = PkT(),
      R = tF();
    if (!T && !R) return;
    let a = () => {
      this.handleReconnectActivity();
    };
    for (let e of ukT) T?.addEventListener(e, a);
    for (let e of ykT) R?.addEventListener(e, a);
    this.reconnectActivityCleanup = () => {
      for (let e of ukT) T?.removeEventListener(e, a);
      for (let e of ykT) R?.removeEventListener(e, a);
    };
  }
  stopWaitingForReconnectActivity() {
    this.reconnectActivityCleanup?.(), this.reconnectActivityCleanup = null;
  }
  handleReconnectActivity() {
    if (this.disposed || this.ws) {
      this.stopWaitingForReconnectActivity();
      return;
    }
    if (this.shouldWaitForReconnectActivity()) return;
    this.stopWaitingForReconnectActivity(), this.recordLifecycleEvent("reconnect_activity_detected"), this.scheduleReconnect({
      immediate: !0,
      bypassActivityGate: !0
    });
  }
  scheduleReconnectAttemptsReset() {
    this.cancelReconnectAttemptsReset(), this.reconnectResetTimeoutID = setTimeout(() => {
      this.reconnectResetTimeoutID = null, this.reconnectAttempts = 0;
    }, qn0);
  }
  cancelReconnectAttemptsReset() {
    if (this.reconnectResetTimeoutID) clearTimeout(this.reconnectResetTimeoutID), this.reconnectResetTimeoutID = null;
  }
  startPingIntervalOnce() {
    if (this.pingIntervalID) return;
    this.startPingInterval();
  }
  startPingInterval() {
    this.stopPingInterval();
    let T = Date.now();
    this.pingIntervalID = setInterval(() => {
      let R = Date.now(),
        a = R - T;
      if (T = R, a > this.config.pingIntervalMs * 3) {
        this.lastPongAt = R;
        return;
      }
      if (this.hasOpenSocket()) {
        let e = R - this.lastPongAt,
          t = this.config.pingIntervalMs * 2;
        if (e > t) {
          this.recordLifecycleEvent("ping_timeout", `elapsedMs=${e} thresholdMs=${t}`), this.reconnectCause = {
            type: "ping_timeout",
            at: R,
            code: 4000,
            reason: "Pong timeout",
            error: `No pong received for ${e}ms (threshold ${t}ms)`
          }, this.ws?.close(4000, "Pong timeout");
          return;
        }
        try {
          this.ws?.send("ping");
        } catch {}
      }
    }, this.config.pingIntervalMs);
  }
  stopPingInterval() {
    if (this.pingIntervalID) clearInterval(this.pingIntervalID), this.pingIntervalID = null;
  }
}
function rF(T) {
  switch (T.type) {
    case "queued_messages":
      return {
        type: "queued_messages",
        message: T
      };
    case "queued_message_added":
      return {
        type: "queued_message_added",
        message: T
      };
    case "queued_message_removed":
      return {
        type: "queued_message_removed",
        message: T
      };
  }
}
function Qn0(T) {
  switch (T.type) {
    case "retry_scheduled":
      return {
        type: "retry_scheduled",
        message: T
      };
    case "retry_started":
      return {
        type: "retry_started",
        message: T
      };
    case "retry_cancelled":
      return {
        type: "retry_cancelled",
        message: T
      };
  }
}
function Zn0(T) {
  switch (T.type) {
    case "error_set":
      return {
        type: "active_error_set",
        message: T
      };
    case "error_cleared":
      return {
        type: "active_error_cleared",
        message: T
      };
  }
}
function Jn0(T) {
  switch (T.type) {
    case "artifacts_snapshot":
      return {
        type: "artifacts_snapshot",
        message: T
      };
    case "artifact_upserted":
      return {
        type: "artifact_upserted",
        message: T
      };
    case "artifact_deleted":
      return {
        type: "artifact_deleted",
        message: T
      };
  }
}
function Tl0(T) {
  switch (T.type) {
    case "compaction_started":
      return {
        type: "compaction_started",
        message: T
      };
    case "compaction_complete":
      return {
        type: "compaction_complete",
        message: T
      };
  }
}
function Rl0(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return a;
}
function QeT(T, R) {
  return {
    ...T,
    pendingOptimisticUserMessages: R
  };
}
function kkT() {
  return {
    latestAgentLoopState: null,
    pendingOptimisticUserMessages: new Map()
  };
}
function al0(T, R) {
  if (T.latestAgentLoopState === R) return T;
  return {
    ...T,
    latestAgentLoopState: R
  };
}
function el0(T) {
  if (T.latestAgentLoopState === null || T.latestAgentLoopState === "idle") return "message_added";
  return "queued_message_added";
}
function tl0(T, R, a) {
  if (R === "message_added") return {
    type: "message_added",
    message: {
      type: "message_added",
      message: {
        role: "user",
        messageId: T.messageId,
        content: T.content,
        threadId: a ?? Yn0
      },
      seq: 0
    }
  };
  return {
    type: "queued_message_added",
    message: {
      type: "queued_message_added",
      message: {
        interrupt: !1,
        queuedMessage: {
          role: "user",
          messageId: T.messageId,
          content: T.content,
          userState: T.userState,
          discoveredGuidanceFiles: T.discoveredGuidanceFiles
        }
      },
      seq: 0
    }
  };
}
function rl0(T, R, a) {
  let e = new Map(T.pendingOptimisticUserMessages);
  return e.set(R, a), QeT(T, e);
}
function Z1(T, R) {
  if (!T.pendingOptimisticUserMessages.has(R)) return T;
  let a = new Map(T.pendingOptimisticUserMessages);
  return a.delete(R), QeT(T, a);
}
function hl0(T, R) {
  let a = T.pendingOptimisticUserMessages.get(R);
  if (!a) return {
    state: T,
    suppressMessageAdded: !1,
    syntheticQueuedMessageRemoved: null
  };
  let e = Z1(T, R);
  if (a === "message_added") return {
    state: e,
    suppressMessageAdded: !1,
    syntheticQueuedMessageRemoved: null
  };
  return {
    state: e,
    suppressMessageAdded: !1,
    syntheticQueuedMessageRemoved: {
      type: "queued_message_removed",
      queuedMessageId: R,
      seq: 0
    }
  };
}
function CKT(T, R) {
  let a = T.pendingOptimisticUserMessages.get(R);
  if (a === "queued_message_added") return {
    state: T,
    suppressQueuedMessageAdded: !0
  };
  if (a !== "message_added") return {
    state: T,
    suppressQueuedMessageAdded: !1
  };
  let e = new Map(T.pendingOptimisticUserMessages);
  return e.set(R, "queued_message_added"), {
    state: QeT(T, e),
    suppressQueuedMessageAdded: !1
  };
}
function il0(T, R) {
  let a = T;
  for (let e of R) a = CKT(a, e).state;
  return a;
}
function cl0(T, R) {
  let a = new Set(R.messages.map(e => e.queuedMessage.messageId));
  for (let [e, t] of T.pendingOptimisticUserMessages) {
    if (t !== "queued_message_added") continue;
    if (!a.has(e)) return !0;
  }
  return !1;
}
function sl0(T, R, a) {
  let e = el0(T);
  return {
    state: rl0(T, R.messageId, e),
    event: tl0(R, e, a)
  };
}
function ol0(T) {
  return {
    type: "error",
    message: `Failed to send user message: ${T}`,
    code: "MESSAGE_ERROR"
  };
}
function pl0(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return a;
}
function _l0(T) {
  if (!T || typeof T !== "object") return !1;
  let R = T.queuedMessage;
  if (!R || typeof R !== "object") return !1;
  return typeof R.messageId === "string";
}
function bl0(T) {
  if (!T || typeof T !== "object") return !1;
  return typeof T.id === "string";
}
function ml0(T) {
  if (_l0(T)) return T.queuedMessage.messageId;
  if (bl0(T)) return T.id;
  throw Error("reduceQueuedMessages requires getQueuedMessageId for this message shape");
}
function ul0(T, R, a = {}) {
  let e = a.getQueuedMessageId ?? ml0;
  if (R.type === "queued_messages") return [...R.messages];
  if (R.type === "queued_message_added") {
    if (a.dedupeAdded && T.some(t => e(t) === e(R.message))) return [...T];
    return [...T, R.message];
  }
  if (!T.some(t => e(t) === R.queuedMessageId)) return [...T];
  return T.filter(t => e(t) !== R.queuedMessageId);
}
function LKT(T) {
  let R = z9.safeParse(T.dtwMessageID);
  if (R.success) return R.data;
  let a = z9.safeParse(`${T.messageId}`);
  return a.success ? a.data : null;
}
function yl0(T) {
  return T.map((R, a) => ({
    ...R,
    messageId: a
  }));
}
function MKT(T) {
  let R = new Set();
  for (let a of T) {
    let e = LKT(a);
    if (e) R.add(e);
  }
  return R;
}
function J1(T, R) {
  for (let [a, e] of T.entries()) if (LKT(e) === R) return a;
  return -1;
}
function kl0(T, R, a) {
  let e = !1,
    t = null,
    r = () => {
      if (e) return;
      if (e = !0, t) clearTimeout(t), t = null;
      T.setObserverCallbacks(null);
    };
  return {
    promise: new Promise((h, i) => {
      let c = {
        onMessageEvent: s => {
          if (s.message.messageId === R) r(), h(s);
        },
        onError: s => {
          r(), i(Error(s.message));
        },
        onExecutorError: s => {
          r(), i(Error(s.message));
        },
        onConnectionChange: s => {
          if (s.state === "disconnected") r(), i(Error("Disconnected before message was acknowledged"));
        }
      };
      T.setObserverCallbacks(c), t = setTimeout(() => {
        r(), i(Error(`Timed out waiting for message_added after ${a}ms`));
      }, a);
    }),
    dispose: r
  };
}
async function xkT(T) {
  let R = T.workerUrl ?? Pi(T.ampURL),
    a = new uH({
      baseURL: R,
      apiKey: T.apiKey,
      threadId: T.threadId,
      WebSocketClass: WebSocket,
      maxReconnectAttempts: 1,
      pingIntervalMs: 5000
    }),
    e = T.timeoutMs ?? Pl0;
  if (!(await a.ensureConnected({
    maxAttempts: 1,
    waitForConnectedTimeoutMs: e
  }))) throw Error(`Timed out waiting for DTW connection after ${e}ms`);
  a.resumeFromVersion(0);
  let t = a.sendUserMessage([{
      type: "text",
      text: T.message
    }], T.agentMode),
    r = kl0(a, t, e);
  try {
    return {
      messageId: (await r.promise).message.messageId
    };
  } finally {
    r.dispose(), await a.disconnectAndWait(), a.dispose();
  }
}
function Zi(T) {
  throw new GR(`Invalid thread ID or URL: ${T}`, 1, "Provide a valid thread ID (e.g., T-5928a90d-d53b-488f-a829-4e36442142ee) or thread URL (e.g., https://ampcode.com/threads/T-5928a90d-d53b-488f-a829-4e36442142ee)");
}
function Il0(T) {
  if (!(T instanceof Error)) return !1;
  let R = (T.message ?? "").toLowerCase() + (T.stack ?? "").toLowerCase();
  return ["thread", "threadservice", "threadsync", "threadworker", "threadhistory", "threadsummary", "thread-"].some(a => R.includes(a));
}
function WP() {
  try {
    J.debug("cleanupTerminal() called"), xl0.disable(), ul.write("\x1B[?25h");
  } catch (T) {}
}
function $v(T) {
  if (T instanceof GR) return {
    message: T.userMessage,
    suggestion: T.suggestion
  };
  if (T instanceof s1R) return {
    message: T.message
  };
  if (T instanceof Error) {
    let R = (T.message ?? "").toLowerCase();
    if (R.includes("401") || R.includes("unauthorized")) return {
      message: V3.invalidAPIKey
    };
    if (R.includes("403") || R.includes("forbidden")) return {
      message: V3.authExpired
    };
    if (R.includes("timeout") || R.includes("etimedout")) return {
      message: V3.networkTimeout
    };
    if (R.includes("websocket connection failed") || R.includes("websocket closed during connect") || R.includes("expected 101 status code") || R.includes("failed to get wstoken") || R.includes("websocket is not connected")) return {
      message: V3.webSocketConnectionFailed
    };
    if (R.includes("enotfound") || R.includes("econnrefused") || R.includes("unable to connect")) return {
      message: V3.networkOffline
    };
    if (R.includes("thread") && R.includes("not found")) return {
      message: "Thread not found or you don't have access."
    };
    if (R.includes("fetch failed") || R.includes("failed to fetch")) return {
      message: V3.networkOffline
    };
  }
  return {
    message: V3.internalBug
  };
}
function DKT(T, R) {
  let a = process.env.AMP_DEBUG === "1" || process.argv.includes("--debug");
  J.error("CLI Error", T);
  let {
    message: e,
    suggestion: t
  } = $v(T);
  if (ul.write(oR.red.bold("Error: ") + e + `
`), t) {
    ul.write(`
`);
    let r = t.split(`
`);
    for (let h of r) ul.write(oR.blue(h) + `
`);
  }
  if (!(T instanceof GR) && e === V3.internalBug && (R !== void 0 || Il0(T))) {
    let r = R ? ` ${R}` : "";
    ul.write(`Use 'amp threads share${r} --support' to share this with the Amp team.
`);
  }
  if (a && T instanceof Error) if (ul.write(`
` + oR.grey("Debug details:") + `
`), T.stack) ul.write(T.stack + `
`);else ul.write(String(T) + `
`);
  return WP(), T instanceof GR ? T.exitCode : 1;
}
function gl0(T, R) {
  let a = DKT(T, R);
  process.exit(a);
}
async function Jl(T, R) {
  let a = DKT(T, R);
  await xb(), process.exit(a);
}
function jl0(T, R) {
  switch (R.code) {
    case "auth-required":
      return "Authentication required to label threads";
    case "thread-not-found":
      return `Thread ${T} not found`;
    case "permission-denied":
      return `Permission denied to label thread ${T}`;
    case "rate-limit-exceeded":
      return "Rate limit exceeded while labeling thread";
    case "invalid-argument":
      return R.message ?? "Invalid labels";
    default:
      return R.message || `Failed to label thread ${T}`;
  }
}
async function BKT(T, R, a) {
  if (R.length === 0) return [];
  let e = await N3.addThreadLabels({
    thread: T,
    labels: R
  }, {
    config: a
  });
  if (!e.ok) throw new GR(jl0(T, e.error));
  return e.result.map(t => t.name);
}
async function NKT(T, R, a) {
  if (R.length === 0) return;
  try {
    await BKT(T, R, a);
  } catch (e) {
    J.error("Failed to label thread", {
      error: e
    });
  }
}
function UKT(T) {
  return {
    type: "text",
    text: T.text
  };
}
function Sl0(T) {
  return {
    type: "tool_use",
    id: T.id,
    name: T.name,
    input: T.input
  };
}
function Ol0(T) {
  let R = "",
    a = !1;
  switch (T.run.status) {
    case "done":
      R = typeof T.run.result === "string" ? T.run.result : JSON.stringify(T.run.result), a = !1;
      break;
    case "error":
      R = typeof T.run.error === "string" ? T.run.error : T.run.error?.message || "Tool execution error", a = !0;
      break;
    case "cancelled":
      R = `Tool execution cancelled: ${T.run.reason || "Unknown reason"}`, a = !0;
      break;
    case "rejected-by-user":
      R = `Tool execution rejected by user: ${T.run.reason || "User declined permission"}`, a = !0;
      break;
    default:
      R = `Tool status: ${T.run.status}`, a = !1;
  }
  return {
    type: "tool_result",
    tool_use_id: T.toolUseID,
    content: R,
    is_error: a
  };
}
function dl0(T) {
  return {
    type: "thinking",
    thinking: T.thinking
  };
}
function El0(T) {
  return {
    type: "redacted_thinking",
    data: T.data
  };
}
function Cl0(T, R, a, e) {
  let t = [],
    r = e?.includeThinking ?? !1;
  for (let h of T.content) if (h.type === "text") t.push(UKT(h));else if (h.type === "tool_use") t.push(Sl0(h));else if (r && h.type === "thinking") t.push(dl0(h));else if (r && h.type === "redacted_thinking") t.push(El0(h));
  return {
    type: "assistant",
    message: {
      type: "message",
      role: "assistant",
      content: t,
      stop_reason: T.state.type === "complete" ? T.state.stopReason : null,
      usage: T.usage ? Ml0(T.usage) : void 0
    },
    parent_tool_use_id: a ?? null,
    session_id: R
  };
}
function Ll0(T, R, a) {
  let e = [];
  for (let t of T.content) if (t.type === "text") e.push(UKT(t));else if (t.type === "tool_result") e.push(Ol0(t));
  return {
    type: "user",
    message: {
      role: "user",
      content: e
    },
    parent_tool_use_id: a ?? null,
    session_id: R
  };
}
function Ml0(T) {
  if (!T) return;
  return {
    input_tokens: T.inputTokens || 0,
    cache_creation_input_tokens: T.cacheCreationInputTokens ?? void 0,
    cache_read_input_tokens: T.cacheReadInputTokens ?? void 0,
    output_tokens: T.outputTokens || 0,
    max_tokens: T.maxInputTokens,
    service_tier: "standard"
  };
}
function Wl0(T) {
  return T !== void 0;
}
function ql0(T) {
  for (let R of T) if (R.type === "tool_result" && !wt(R.run.status)) return !1;
  return !0;
}
function HKT(T) {
  return T.parentToolUseId === void 0;
}
function WKT(T) {
  return T.role === "assistant" && HKT(T);
}
function IkT(T) {
  return T.filter(R => WKT(R) && R.state.type !== "streaming").length;
}
function gkT(T) {
  return T.messages.findLast(WKT);
}
function zl0(T) {
  return T.dtwMessageID ?? (T.messageId !== void 0 ? `${T.role}:${T.parentToolUseId ?? "top-level"}:${T.messageId}` : void 0);
}
async function ng(T) {
  let R = JSON.stringify(T) + `
`;
  try {
    if (!process.stdout.write(R)) await $l0(process.stdout, "drain");
  } catch (a) {
    throw J.error("Failed to emit JSON message", {
      error: a,
      messageType: T.type
    }), a;
  }
}
function Fl0(T) {
  let R = Promise.resolve();
  return a => {
    let e = R.then(() => T(a));
    return R = e.catch(() => {}), e;
  };
}
function cy(T, R) {
  let a;
  if (T && typeof T === "object" && "message" in T && typeof T.message === "string") {
    if (a = Error(T.message), "stack" in T && typeof T.stack === "string") a.stack = T.stack;
  } else if (T instanceof Error) a = T;
  if (a && (v3T(a) || dO(a) || fU(a) || IU(a) || $3T(a))) {
    let e = OaT(a, {
      freeTierEnabled: !1
    });
    return e.description ? `${e.title} ${e.description}` : e.title;
  }
  if (a) return a.message;
  return String(T);
}
function Gl0(T) {
  if (!HKT(T)) return 1;
  switch (T.role) {
    case "user":
      return ql0(T.content) ? 0 : 2;
    case "assistant":
      return T.state.type !== "streaming" ? 0 : 2;
    default:
      return 1;
  }
}
async function Kl0({
  handle: T,
  threadID: R,
  initialThread: a,
  userInput: e,
  stdinInput: t,
  dependencies: r,
  streamJsonInput: h = !1,
  streamJsonThinking: i = !1,
  stdin: c = process.stdin,
  ampURL: s = "https://ampcode.com",
  isDogfooding: A = !1,
  agentMode: l,
  labels: o
}) {
  let n = a ?? (await m0(T.thread$.pipe(ti(1), Gl(5000)))),
    p = l ?? n.agentMode ?? "smart";
  if (qt(p) && !A) throw new GR(`Stream JSON mode is not permitted with '${p}' mode.`, 1);
  let _ = R,
    m = Date.now(),
    b = 0,
    y = !1,
    u = n,
    P = null;
  if (t && t.length > fkT) throw Error(`Stdin input too large: ${t.length} bytes (max ${fkT})`);
  let k,
    x = wKT(() => {
      if (!y) k("User cancelled (SIGINT/SIGTERM)");
    });
  try {
    x.install();
    let f = (await m0(r.toolService.getTools(p).pipe(ti(1), Gl(5000)))).map(D => D.spec.name),
      v = [];
    try {
      v = (await m0(r.mcpService.servers.pipe(ti(1), Gl(5000)))).map(D => ({
        name: D.name,
        status: D.status.type
      }));
    } catch (D) {
      J.warn("Unable to obtain MCP server list for system init message", {
        err: D
      });
    }
    let g = {
      type: "system",
      subtype: "init",
      cwd: process.cwd(),
      session_id: _,
      tools: f,
      mcp_servers: v
    };
    await ng(g);
    let I = IkT(n.messages),
      S = n.messages.length,
      O = new Set(),
      j = [],
      d = !h,
      C = !1,
      L = [],
      w = Fl0(async D => {
        while (S < D.messages.length) {
          let B = D.messages[S],
            M = Gl0(B);
          if (M === 1) {
            S++;
            continue;
          }
          if (M === 2) break;
          let V = zl0(B);
          if (!V || !O.has(V)) {
            if (B.role === "user") await ng(Ll0(B, _, null));else if (B.role === "assistant") {
              if (B.content.length > 0) {
                let Q = Cl0(B, _, null, {
                  includeThinking: i
                });
                await ng(Q);
              }
              b++;
            }
            if (V) O.add(V);
          }
          S++;
        }
      });
    return new Promise((D, B) => {
      k = async eT => {
        if (y) {
          J.debug("Complete called multiple times, ignoring", {
            error: eT
          });
          return;
        }
        y = !0, x.remove();
        try {
          try {
            let iT = await m0(T.thread$.pipe(ti(1), Gl(1000)));
            u = iT, await w(iT);
          } catch (iT) {
            J.debug("Unable to flush pending thread messages before completion", {
              error: iT
            });
          }
          if (eT) {
            let iT = {
              type: "result",
              subtype: "error_during_execution",
              duration_ms: Date.now() - m,
              is_error: !0,
              num_turns: b,
              error: eT,
              session_id: _
            };
            await ng(iT);
          } else {
            let iT = u ? gkT(u) : null,
              aT = iT ? kr(iT.content) : "",
              oT = {
                type: "result",
                subtype: "success",
                duration_ms: Date.now() - m,
                is_error: !1,
                num_turns: b,
                result: aT,
                session_id: _
              };
            await ng(oT);
          }
          if (M.unsubscribe(), V.unsubscribe(), j.forEach(iT => iT.unsubscribe()), await T.postExecuteMode?.(), o && o.length > 0) await NKT(R, o, r.configService);
          D();
        } catch (iT) {
          J.error("Error during completion", {
            error: iT
          }), B(iT);
        }
      };
      let M = T.threadViewState$.subscribe(async eT => {
          try {
            if (P = eT, eT.state === "active" && eT.ephemeralError) {
              await k(cy(eT.ephemeralError, s));
              return;
            }
            if (L.length > 0) {
              let iT = [...new Set(L.map(oT => oT.toolName))],
                aT = iT.length > 0 ? `The following tools require user approval, which is not supported in stream JSON mode: ${iT.join(", ")}` : "A tool requires user approval, which is not supported in stream JSON mode";
              await k(aT);
              return;
            }
            if (eT.state === "active" && eT.inferenceState === "idle" && u) {
              let iT = u.messages.flatMap(aT => aT.content.map(oT => {
                if (oT.type === "tool_result" && oT.run.status === "blocked-on-user") return Tn(u, oT.toolUseID);
              }).filter(Wl0));
              if (iT.length > 0) {
                J.warn("Tools require user consent - exiting stream JSON mode", {
                  blockedTools: iT.map(oT => ({
                    name: oT.name,
                    id: oT.id
                  }))
                });
                let aT = `The following tools require user approval, which is not supported in stream JSON mode: ${iT.map(oT => oT.name).join(", ")}`;
                await k(aT);
                return;
              }
            }
            if (d && C && eT.state === "active" && eT.inferenceState === "idle") await k();
          } catch (iT) {
            J.error("Error in status subscription", {
              error: iT
            }), await k(cy(iT, s));
          }
        }),
        V = T.thread$.subscribe(async eT => {
          try {
            u = eT, await w(eT);
            let iT = IkT(eT.messages),
              aT = gkT(eT);
            if (C = iT > I && aT !== void 0 && aT.state.type !== "streaming" && UET(aT) && !aT.content.some(oT => oT.type === "tool_use"), d && C && P?.state === "active" && P.inferenceState === "idle") await k();
          } catch (iT) {
            J.error("Error in thread subscription", {
              error: iT
            }), await k(cy(iT, s));
          }
        }),
        Q = T.pendingApprovals$.subscribe(eT => {
          if (L = eT, eT.length > 0) {
            let iT = [...new Set(eT.map(oT => oT.toolName))],
              aT = iT.length > 0 ? `The following tools require user approval, which is not supported in stream JSON mode: ${iT.join(", ")}` : "A tool requires user approval, which is not supported in stream JSON mode";
            k(aT);
          }
        });
      j.push(Q);
      let W = T.inferenceErrors$?.subscribe(eT => {
        k(cy(eT, s));
      });
      if (W) j.push(W);
      if (h) (async () => {
        try {
          for await (let eT of Vl0(c)) {
            if (y) break;
            await T.sendMessage({
              content: eT.contentBlocks,
              agentMode: p
            });
          }
          if (d = !0, C && P?.state === "active" && P.inferenceState === "idle") await k();
        } catch (eT) {
          J.error("Error processing streaming input", {
            error: eT
          }), await k(cy(eT, s));
        }
      })();else (async () => {
        try {
          let eT = [{
            type: "text",
            text: e
          }];
          if (t) eT.unshift({
            type: "text",
            text: `Input received on stdin:
\`\`\`
${t}
\`\`\``
          });
          if (await T.sendMessage({
            content: eT,
            agentMode: p
          }), d = !0, C && P?.state === "active" && P.inferenceState === "idle") await k();
        } catch (eT) {
          J.error("Error processing input", {
            error: eT
          }), await k(cy(eT, s));
        }
      })();
    });
  } catch (f) {
    throw x.remove(), f;
  }
}
async function* Vl0(T) {
  let R = vl0({
      input: T,
      crlfDelay: Number.POSITIVE_INFINITY
    }),
    a = 0;
  try {
    for await (let e of R) {
      if (a++, e.trim() === "") continue;
      let t;
      try {
        t = JSON.parse(e);
      } catch (i) {
        throw new GR(`Invalid JSON on stdin line ${a}: ${i instanceof Error ? i.message : String(i)}`, 1, `Line content: ${e.slice(0, 100)}${e.length > 100 ? "..." : ""}`);
      }
      let r = Hl0.safeParse(t);
      if (!r.success) {
        let i = r.error.issues.map(c => `${c.path.join(".")}: ${c.message}`).join(", ");
        throw new GR(`Invalid message format on stdin line ${a}: ${i}`, 1, 'Expected format: {"type":"user","message":{"role":"user","content":[{"type":"text","text":"your message"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"..."}}]}}');
      }
      let h = r.data;
      yield {
        contentBlocks: Xl0(h.message.content, a)
      };
    }
  } finally {
    R.close();
  }
}
function Xl0(T, R) {
  let a = 0;
  return T.map(e => {
    if (e.type === "text") return {
      type: "text",
      text: e.text
    };
    if (a++, a > pb) throw new GR(`Too many images on stdin line ${R}: ${a} (max ${pb})`, 1);
    let t = e.source_path ?? `stream-json://stdin/line-${R}/image-${a}`,
      r = Buffer.from(e.source.data, "base64"),
      h = x9T(r);
    if (!h) throw new GR(`Invalid image on stdin line ${R}: could not decode image bytes`, 1);
    if (h !== e.source.media_type) throw new GR(`Invalid image on stdin line ${R}: declared media type ${e.source.media_type} does not match detected type ${h}`, 1);
    let i = XA({
      source: {
        type: "base64",
        data: e.source.data
      }
    });
    if (i) throw new GR(`Invalid image on stdin line ${R}: ${i}`, 1);
    return {
      type: "image",
      sourcePath: t,
      source: {
        type: "base64",
        mediaType: e.source.media_type,
        data: e.source.data
      }
    };
  });
}
async function Yl0(T) {
  let {
      threadPool: R,
      userInput: a,
      stdinInput: e,
      dependencies: t,
      streamJson: r,
      streamJsonInput: h,
      streamJsonThinking: i,
      stats: c,
      ampURL: s,
      isDogfooding: A,
      agentMode: l,
      labels: o
    } = T,
    n = await m0(R.threadHandles$.pipe(da(y => y !== null), ti(1), Gl(5000))),
    p = await m0(n.thread$.pipe(ti(1), Gl(5000))),
    _ = p.id;
  if (p.agentMode && qt(p.agentMode) && !A) throw new GR(`Execute mode is not permitted for threads in '${p.agentMode}' mode.`, 1);
  if (await n.preExecuteMode?.(), r) return await Kl0({
    handle: n,
    threadID: _,
    initialThread: p,
    userInput: a,
    stdinInput: e,
    dependencies: t,
    streamJsonInput: h,
    streamJsonThinking: i,
    ampURL: s,
    isDogfooding: A,
    agentMode: l,
    labels: o
  }), _;
  let m = $kT(p.messages),
    b = [{
      type: "text",
      text: a
    }];
  if (e) b.unshift({
    type: "text",
    text: `Input received on stdin:
\`\`\`
${e}
\`\`\``
  });
  return await n.sendMessage({
    content: b,
    agentMode: l ?? "smart"
  }), new Promise((y, u) => {
    let P = !1,
      k = p,
      x = [],
      f = setInterval(() => {}, 1000),
      v = wKT(() => {
        if (!P) J.debug("User cancelled (SIGINT/SIGTERM)"), g();
      });
    v.install();
    let g = async () => {
        if (P) return;
        P = !0, v.remove(), clearInterval(f), I.unsubscribe(), S.unsubscribe(), j.unsubscribe(), O?.unsubscribe();
        try {
          if (await n.postExecuteMode?.(), o && o.length > 0) await NKT(_, o, t.configService);
          y(_);
        } catch (d) {
          u(d);
        }
      },
      I = n.threadViewState$.subscribe(async d => {
        if (d.state === "active" && d.ephemeralError) {
          J.error("error", {
            error: d.ephemeralError
          }), process.stderr.write("Error: " + vkT(d.ephemeralError) + `
`), await g();
          return;
        }
        if (d.state === "active" && d.inferenceState === "idle") {
          if (x.length > 0) {
            let L = x[0];
            if (L?.toolName === U8) {
              let w = IuT(L.args);
              process.stderr.write(`Error: The ${U8} tool tried to run a command that isn't allowlisted. Rerun with --dangerously-allow-all to bypass, or add to the command allowlist in permissions (https://ampcode.com/manual#permissions).

Command:

${jkT("\t", w ?? "(unknown)")}

`);
            } else if (L) process.stderr.write(`Error: The ${L.toolName} tool is not allowed to run in execute mode. Rerun with --dangerously-allow-all to bypass.
`);
            await g();
            return;
          }
          let C = k.messages.flatMap(L => L.content.map(w => {
            if (w.type === "tool_result" && w.run.status === "blocked-on-user") return Tn(k, w.toolUseID);
          }).filter(w => w !== void 0));
          if (C.length > 0) {
            J.warn("Tools require user consent - exiting execute mode", {
              blockedTools: C.map(w => ({
                name: w.name,
                id: w.id
              }))
            });
            let L = C[0];
            if (L.name === U8) {
              let w = IuT(L.input);
              process.stderr.write(`Error: The ${U8} tool tried to run a command that isn't allowlisted. Rerun with --dangerously-allow-all to bypass, or add to the command allowlist in permissions (https://ampcode.com/manual#permissions).

Command:

${jkT("\t", w ?? "(unknown)")}

`);
            } else process.stderr.write(`Error: The ${L.name} tool is not allowed to run in execute mode. Rerun with --dangerously-allow-all to bypass.`);
            await g();
          }
        }
      }),
      S = n.pendingApprovals$.subscribe(d => {
        x = d;
      }),
      O = n.inferenceErrors$?.subscribe(async d => {
        J.error("error", {
          error: d
        }), process.stderr.write("Error: " + vkT(d) + `
`), await g();
      }),
      j = n.thread$.subscribe(async d => {
        if (k = d, $kT(d.messages) > m) {
          let C = dt(d, "assistant");
          if (C && UET(C)) {
            if (C.content.some(w => w.type === "tool_use")) return;
            let L = kr(C.content).trim();
            if (c) {
              let w = C.usage,
                D = {
                  result: L,
                  usage: {
                    input_tokens: w?.inputTokens || 0,
                    output_tokens: w?.outputTokens || 0,
                    cache_creation_input_tokens: w?.cacheCreationInputTokens || 0,
                    cache_read_input_tokens: w?.cacheReadInputTokens || 0
                  }
                };
              process.stdout.write(JSON.stringify(D) + `
`);
            } else if (L) process.stdout.write(L + `
`);
            await g();
          }
        }
      });
  });
}
function $kT(T) {
  return T.filter(R => R.role === "assistant" && R.state.type !== "streaming").length;
}
function vkT(T) {
  if (T instanceof Error) if (v3T(T)) return "Unauthorized. Check your access token.";else if (dO(T)) return "Context window limit reached.";else if (fU(T)) return "Model provider overloaded. Try again in a few seconds.";else if (IU(T)) return "Model stream timed out. Try again in a few seconds.";else if ($3T(T)) return "Insufficient credit balance.";else return T.message;
  if (typeof T === "object" && T && "message" in T && typeof T.message === "string") return T.message;
  return String(T);
}
function jkT(T, R) {
  if (!R) return R;
  return T + R.split(`
`).join(`
` + T);
}
class qKT {
  history = [];
  index = -1;
  loaded = !1;
  historyFile;
  maxSize;
  constructor(T) {
    this.historyFile = T?.historyFile || TA0, this.maxSize = T?.maxSize || RA0, this.ensureLoaded();
  }
  async ensureLoaded() {
    if (!this.loaded) await this.cleanupStaleLockFile(), this.history = await this.readHistoryFromDisk(), this.loaded = !0;
  }
  async cleanupStaleLockFile() {
    let T = this.historyFile + ".lock";
    try {
      await dkT(T), J.info("Cleaned up stale lock file", {
        lockFile: T
      });
    } catch (R) {
      if (R.code !== "ENOENT") J.warn("Failed to clean up stale lock file", {
        lockFile: T,
        error: R instanceof Error ? R.message : String(R)
      });
    }
  }
  async readHistoryFromDisk() {
    try {
      let T = await OkT(this.historyFile, "utf-8");
      if (!T.trim()) return [];
      return this.parseJsonlContent(T);
    } catch (T) {
      if (T.code !== "ENOENT") return J.warn("Failed to read history file", {
        error: T instanceof Error ? T.message : String(T)
      }), [];
      if (this.historyFile.endsWith(".jsonl")) {
        let R = this.historyFile.replace(".jsonl", ".json");
        try {
          let a = await OkT(R, "utf-8");
          if (a.trim()) {
            let e = JSON.parse(a);
            J.info("Migrating from old history.json to history.jsonl", {
              oldFile: R,
              newFile: this.historyFile,
              size: e.length
            });
            let t = e.map(r => ({
              text: r
            }));
            await this.writeHistoryToDisk(t);
            try {
              await import("fs/promises").then(r => r.unlink(R));
            } catch {}
            return t;
          }
        } catch {}
      }
      return [];
    }
  }
  parseJsonlContent(T) {
    let R = T.trim().split(`
`),
      a = [];
    for (let e of R) if (e.trim()) try {
      let t = JSON.parse(e);
      if (typeof t === "string") a.push({
        text: t
      });else if (typeof t === "object" && t !== null && typeof t.text === "string") a.push({
        text: t.text,
        cwd: typeof t.cwd === "string" ? t.cwd : void 0
      });else J.warn("Skipping invalid entry in history", {
        line: e,
        type: typeof t
      });
    } catch (t) {
      J.warn("Skipping invalid JSONL line in history", {
        line: e
      });
    }
    return a;
  }
  async writeHistoryToDisk(T) {
    await SkT(AS.dirname(this.historyFile), {
      recursive: !0
    });
    let R = T.map(a => JSON.stringify(a)).join(`
`) + `
`;
    await hF(this.historyFile, R, {
      encoding: "utf-8",
      mode: 384
    });
  }
  async add(T, R) {
    if (!T.trim()) return;
    if (await this.ensureLoaded(), this.history.length > 0 && this.history[this.history.length - 1]?.text === T) return;
    let a = {
      text: T,
      cwd: R
    };
    try {
      if (await SkT(AS.dirname(this.historyFile), {
        recursive: !0
      }), await this.atomicAppend(a), this.history.push(a), this.history.length > this.maxSize) {
        let e = await this.readHistoryFromDisk();
        if (e.length > this.maxSize) {
          let t = e.slice(e.length - this.maxSize);
          await this.writeHistoryToDisk(t), this.history = t;
        }
      }
    } catch (e) {
      J.error(`Failed to save history: ${e instanceof Error ? e.message : String(e)}`);
    }
    this.reset();
  }
  async atomicAppend(T) {
    let R = JSON.stringify(T) + `
`,
      a = this.historyFile + ".lock",
      e = 10,
      t = 50;
    for (let r = 0; r < 10; r++) try {
      let h = await Ql0(a, "wx");
      try {
        await hF(this.historyFile, R, {
          flag: "a",
          encoding: "utf-8",
          mode: 384
        });
      } finally {
        await h.close(), await hF(a, "", {
          flag: "w"
        });
        try {
          await dkT(a);
        } catch {}
      }
      return;
    } catch (h) {
      if (h.code === "EEXIST" && r < 9) {
        await new Promise(i => setTimeout(i, 50));
        continue;
      }
      throw h;
    }
    throw Error("Failed to acquire lock for history file after multiple attempts");
  }
  getAll() {
    return [...this.history];
  }
  previous() {
    if (this.history.length === 0) return null;
    if (this.index === 0) return this.history[0]?.text ?? null;
    if (this.index === -1) this.index = this.history.length - 1;else this.index--;
    return this.history[this.index]?.text ?? null;
  }
  next() {
    if (this.history.length === 0 || this.index === -1) return null;
    if (this.index++, this.index >= this.history.length) return this.index = -1, null;
    return this.history[this.index]?.text ?? null;
  }
  reset() {
    this.index = -1;
  }
}
class FKT {
  async watch(T) {}
  unwatch(T) {}
  dispose() {}
  onFileSystemEvent(T) {}
  offFileSystemEvent(T) {}
  getWatchedPaths() {
    return [];
  }
  isSupported() {
    return !1;
  }
}
class GKT {
  watchedPaths = new Map();
  callbacks = [];
  pollInterval;
  constructor(T = 1000) {
    this.pollInterval = T;
  }
  async watch(T) {
    if (this.watchedPaths.has(T)) return;
    let {
        promises: R
      } = await import("fs"),
      a = new Map();
    try {
      await this.scanPath(R, T, a);
    } catch (t) {
      throw Error(`Failed to watch path ${T}: ${t}`);
    }
    let e = setInterval(async () => {
      try {
        await this.checkForChanges(R, T, a);
      } catch (t) {
        J.warn("Error polling path", {
          path: T,
          error: t
        });
      }
    }, this.pollInterval);
    this.watchedPaths.set(T, {
      interval: e,
      lastModified: a
    });
  }
  unwatch(T) {
    let R = this.watchedPaths.get(T);
    if (R) clearInterval(R.interval), this.watchedPaths.delete(T);
  }
  dispose() {
    for (let T of Array.from(this.watchedPaths.keys())) this.unwatch(T);
    this.callbacks.length = 0;
  }
  onFileSystemEvent(T) {
    this.callbacks.push(T);
  }
  offFileSystemEvent(T) {
    let R = this.callbacks.indexOf(T);
    if (R >= 0) this.callbacks.splice(R, 1);
  }
  getWatchedPaths() {
    return Array.from(this.watchedPaths.keys());
  }
  isSupported() {
    return !0;
  }
  async scanPath(T, R, a) {
    try {
      let e = await T.stat(R);
      if (a.set(R, e.mtime.getTime()), e.isDirectory()) {
        let t = await T.readdir(R);
        for (let r of t) {
          let h = y$(R, r);
          await this.scanPath(T, h, a);
        }
      }
    } catch (e) {}
  }
  async checkForChanges(T, R, a) {
    let e = [],
      t = new Map();
    await this.scanPath(T, R, t);
    for (let [r, h] of Array.from(t.entries())) {
      let i = a.get(r);
      if (i === void 0) e.push({
        type: "created",
        path: r,
        timestamp: Date.now(),
        isDirectory: await this.isDirectory(T, r)
      });else if (h > i) e.push({
        type: "modified",
        path: r,
        timestamp: Date.now(),
        isDirectory: await this.isDirectory(T, r)
      });
    }
    for (let r of Array.from(a.keys())) if (!t.has(r)) e.push({
      type: "deleted",
      path: r,
      timestamp: Date.now(),
      isDirectory: !1
    });
    a.clear();
    for (let [r, h] of Array.from(t.entries())) a.set(r, h);
    if (e.length > 0) for (let r of this.callbacks) try {
      r(e);
    } catch (h) {
      J.error("Error in file watcher callback", {
        error: h
      });
    }
  }
  async isDirectory(T, R) {
    try {
      return (await T.stat(R)).isDirectory();
    } catch {
      return !1;
    }
  }
}
class vv {
  static isRepo(T) {
    try {
      return EkT("git rev-parse --is-inside-work-tree", {
        cwd: T,
        stdio: "ignore"
      }), !0;
    } catch {
      return !1;
    }
  }
  repos = new Map();
  callbacks = [];
  ongoingScans = new Map();
  scanCooldownMs;
  constructor(T = 5000) {
    this.scanCooldownMs = T;
  }
  async resolveRepoRoot(T) {
    let {
      stdout: R
    } = await O4("git", ["rev-parse", "--show-toplevel"], {
      cwd: T
    });
    return R.trim();
  }
  async watch(T) {
    let R = await this.resolveRepoRoot(T);
    if (this.repos.has(R)) return;
    await this.initialise(R);
  }
  unwatch(T) {
    if (!this.repos.get(T)) return;
    this.repos.delete(T), this.ongoingScans.delete(T);
  }
  dispose() {
    for (let T of Array.from(this.repos.keys())) this.unwatch(T);
    this.callbacks.length = 0;
  }
  onFileSystemEvent(T) {
    this.callbacks.push(T);
  }
  offFileSystemEvent(T) {
    let R = this.callbacks.indexOf(T);
    if (R !== -1) this.callbacks.splice(R, 1);
  }
  getWatchedPaths() {
    return Array.from(this.repos.keys());
  }
  isSupported() {
    try {
      return EkT("git --version", {
        stdio: "ignore"
      }), !0;
    } catch {
      return !1;
    }
  }
  async triggerScan(T, R = !1) {
    let a = await this.resolveRepoRoot(T),
      e = this.repos.get(a);
    if (!e) {
      if (J.debug("First time watching repo", {
        repoRoot: a
      }), await this.watch(T), e = this.repos.get(a), !e) return;
      return;
    }
    let t = Date.now(),
      r = t - e.lastScanTime;
    if (!R && r < this.scanCooldownMs) return;
    J.debug("Starting scan", {
      repoRoot: a,
      force: R,
      timeSinceLastScan: r
    }), e.lastScanTime = t, await this.scan(a);
  }
  async reset(T) {
    let R = await this.resolveRepoRoot(T),
      a = this.repos.get(R);
    if (!a) return;
    a.cancelled = !0;
    let e = this.ongoingScans.get(R);
    if (e) await e.catch(() => {});
    this.repos.delete(R), this.ongoingScans.delete(R), await this.watch(T);
  }
  async initialise(T) {
    let R = Date.now(),
      a = await O4("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
        cwd: T,
        maxBuffer: 67108864
      }),
      e = new Set(),
      t = a.stdout.split("\x00").filter(Boolean);
    for (let r of t) {
      let h = y$(T, r);
      e.add(h);
    }
    this.repos.set(T, {
      lastScanTime: R,
      seenUntracked: e
    });
  }
  async scan(T) {
    let R = this.repos.get(T);
    if (!R || R.cancelled) return;
    let a = this.performScan(T);
    this.ongoingScans.set(T, a);
    try {
      await a;
    } finally {
      if (this.ongoingScans.get(T) === a) this.ongoingScans.delete(T);
    }
  }
  async performScan(T) {
    let R = this.repos.get(T);
    if (!R || R.cancelled) return;
    let a = Date.now();
    try {
      let [e, t] = await Promise.all([O4("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
          cwd: T,
          maxBuffer: 1 / 0,
          timeout: 60000
        }), O4("git", ["ls-files", "--deleted", "-z"], {
          cwd: T,
          maxBuffer: 1 / 0,
          timeout: 60000
        })]),
        r = e.stdout.split("\x00").filter(Boolean),
        h = t.stdout.split("\x00").filter(Boolean),
        i = [],
        c = [],
        s = this.repos.get(T);
      if (!s || s.cancelled) return;
      let A = [],
        l = new Set();
      for (let o of r) {
        let n = y$(T, o);
        l.add(n);
        try {
          let p = await iF.stat(n);
          if (!p.isFile()) continue;
          if (!s.seenUntracked.has(n)) i.push(n), A.push({
            type: "created",
            path: n,
            timestamp: p.mtimeMs,
            isDirectory: !1
          });else c.push(n);
        } catch {}
      }
      for (let o of Array.from(s.seenUntracked)) if (!l.has(o)) {
        if (!(await iF.access(o).then(() => !0).catch(() => !1))) A.push({
          type: "deleted",
          path: o,
          timestamp: a,
          isDirectory: !1
        });
      }
      for (let o of h) {
        let n = y$(T, o);
        A.push({
          type: "deleted",
          path: n,
          timestamp: a,
          isDirectory: !1
        });
      }
      if (s.seenUntracked = l, s.lastScanTime = a, A.length) for (let o of this.callbacks) o(A);
    } catch (e) {
      J.warn("Fast ls-files scan failed, falling back to full status", {
        repoRoot: T,
        error: e instanceof Error ? e.message : String(e),
        duration: Date.now() - a
      }), await this.performFullStatusScan(T);
    }
  }
  async performFullStatusScan(T) {
    let R = this.repos.get(T);
    if (!R || R.cancelled) return;
    let a = Date.now(),
      {
        stdout: e
      } = await rA0(hA0, {
        cwd: T,
        maxBuffer: 16777216
      }),
      t = this.repos.get(T);
    if (!t || t.cancelled) return;
    let r = [],
      h = [],
      i = [],
      c = [],
      s = [];
    for (let A of this.parseStatus(e)) {
      let l = y$(T, A.path);
      if (A.type === "created") {
        h.push(l);
        let o = await iF.stat(l).catch(() => null);
        if (!o) {
          s.push(l);
          continue;
        }
        if (o.isFile() && o.mtimeMs > t.lastScanTime) c.push(l), r.push({
          type: "created",
          path: l,
          timestamp: o.mtimeMs,
          isDirectory: !1
        });else s.push(l);
      }
      if (A.type === "deleted") i.push(l), r.push({
        type: "deleted",
        path: l,
        timestamp: a,
        isDirectory: !1
      });
    }
    if (J.debug("Git status discovery (status)", {
      repoRoot: T,
      createdDiscovered: h,
      deletedDiscovered: i,
      createdNew: c,
      createdNotNew: s,
      counts: {
        createdDiscovered: h.length,
        deletedDiscovered: i.length,
        createdNew: c.length,
        createdNotNew: s.length
      }
    }), r.length) for (let A of this.callbacks) A(r);
  }
  parseStatus(T) {
    let R = [],
      a = T.split("\x00");
    for (let e of a) {
      if (!e) continue;
      let t = e[0];
      if (t === "?") {
        let r = e.slice(2);
        R.push({
          type: "created",
          path: r
        });
        continue;
      }
      if (t === "1") {
        let r = e[2],
          h = e.substring(e.indexOf("\t") + 1);
        if (r === "D") R.push({
          type: "deleted",
          path: h
        });else if (r === "A") R.push({
          type: "created",
          path: h
        });
      }
    }
    return R;
  }
}
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
class oh {
  bits;
  constructor(T) {
    this.bits = T;
  }
  static empty() {
    return new oh(0n);
  }
  static fromString(T) {
    let R = 0n;
    for (let a = 0; a < T.length; a++) {
      let e = T.charCodeAt(a),
        t = oh.charToBitIndex(e);
      if (t >= 0) R |= 1n << BigInt(t);
    }
    return new oh(R);
  }
  static fromPath(T) {
    let R = 0n,
      a = T.split(/[/\\]/);
    for (let e of a) {
      if (e === "" || e === "." || e === "..") continue;
      for (let t = 0; t < e.length; t++) {
        let r = e.charCodeAt(t),
          h = oh.charToBitIndex(r);
        if (h >= 0) R |= 1n << BigInt(h);
      }
    }
    return new oh(R);
  }
  hasChars(T) {
    return (this.bits & T.bits) === T.bits;
  }
  union(T) {
    return new oh(this.bits | T.bits);
  }
  intersection(T) {
    return new oh(this.bits & T.bits);
  }
  isEmpty() {
    return this.bits === 0n;
  }
  getCharCount() {
    return this.bits.toString(2).split("").filter(T => T === "1").length;
  }
  toString() {
    let T = [];
    for (let R = 0; R < 64; R++) if ((this.bits & 1n << BigInt(R)) !== 0n) {
      let a = oh.bitIndexToChar(R);
      if (a) T.push(a);
    }
    return `CharBag{${T.join("")}}`;
  }
  toJSON() {
    return {
      bits: this.bits.toString()
    };
  }
  static fromJSON(T) {
    return new oh(BigInt(T.bits));
  }
  equals(T) {
    return this.bits === T.bits;
  }
  static charToBitIndex(T) {
    if (T >= 65 && T <= 90) T += 32;
    if (T >= 48 && T <= 57) return T - 48;
    if (T >= 97 && T <= 122) return T - 97 + 10;
    return -1;
  }
  static bitIndexToChar(T) {
    if (T >= 0 && T <= 9) return String.fromCharCode(48 + T);
    if (T >= 10 && T <= 35) return String.fromCharCode(97 + T - 10);
    return null;
  }
}
class Fk {
  id;
  kind;
  path;
  uri;
  charBag;
  metadata;
  isIgnored;
  isExternal;
  isPrivate;
  isAlwaysIncluded;
  constructor(T) {
    this.id = T.id, this.kind = T.kind, this.path = T.path, this.uri = T.uri, this.metadata = T.metadata, this.isIgnored = T.isIgnored ?? !1, this.isExternal = T.isExternal ?? !1, this.isPrivate = T.isPrivate ?? !1, this.isAlwaysIncluded = T.isAlwaysIncluded ?? !1, this.charBag = oh.fromPath(this.path);
  }
  withUpdates(T) {
    return new Fk({
      id: this.id,
      kind: T.kind ?? this.kind,
      path: this.path,
      uri: this.uri,
      metadata: T.metadata ?? this.metadata,
      isIgnored: T.isIgnored ?? this.isIgnored,
      isExternal: T.isExternal ?? this.isExternal,
      isPrivate: T.isPrivate ?? this.isPrivate,
      isAlwaysIncluded: T.isAlwaysIncluded ?? this.isAlwaysIncluded
    });
  }
  isFile() {
    return this.kind === "file";
  }
  isDirectory() {
    return this.kind === "directory" || this.kind === "unloaded-directory" || this.kind === "pending-directory";
  }
  isLoadedDirectory() {
    return this.kind === "directory";
  }
  getFilename() {
    return this.path.split(/[/\\]/).pop() || this.path;
  }
  getExtension() {
    let T = this.getFilename(),
      R = T.lastIndexOf(".");
    return R > 0 ? T.slice(R + 1) : "";
  }
  getDirectory() {
    let T = this.path.split(/[/\\]/);
    return T.length > 1 ? T.slice(0, -1).join("/") : "";
  }
  shouldIncludeInResults() {
    if (this.isAlwaysIncluded) return !0;
    if (this.isIgnored || this.isPrivate) return !1;
    return !0;
  }
  shouldIncludeInMentions() {
    if (this.isAlwaysIncluded) return !0;
    if (this.isIgnored || this.isPrivate) return !1;
    if (this.isFile()) return !0;
    return this.isLoadedDirectory();
  }
  getImportanceBoost() {
    return this.isAlwaysIncluded ? 0.1 : 0;
  }
  toJSON() {
    return {
      id: this.id,
      kind: this.kind,
      path: this.path,
      uri: this.uri.toString(),
      metadata: this.metadata,
      isIgnored: this.isIgnored,
      isExternal: this.isExternal,
      isPrivate: this.isPrivate,
      isAlwaysIncluded: this.isAlwaysIncluded,
      charBag: this.charBag.toJSON()
    };
  }
  static fromJSON(T, R) {
    return new Fk({
      id: T.id,
      kind: T.kind,
      path: T.path,
      uri: R(T.uri),
      metadata: T.metadata,
      isIgnored: T.isIgnored,
      isExternal: T.isExternal,
      isPrivate: T.isPrivate,
      isAlwaysIncluded: T.isAlwaysIncluded
    });
  }
  equals(T) {
    return this.id === T.id && this.kind === T.kind && this.path === T.path && this.metadata.mtime === T.metadata.mtime && this.metadata.size === T.metadata.size;
  }
  hashCode() {
    return `${this.path}:${this.metadata.mtime}:${this.metadata.size}`;
  }
  toString() {
    return `Entry{${this.kind}:${this.path}}`;
  }
}
class VKT {
  async scanDirectory(T, R = {
    respectIgnorePatterns: !0
  }) {
    let a = Date.now(),
      e = pA0(T),
      {
        respectIgnorePatterns: t = !0,
        maxDepth: r = 20,
        maxFiles: h = 1e5,
        onProgress: i,
        signal: c,
        forceNodeJS: s = !1,
        strategy: A = "auto",
        followSymlinks: l = !1,
        alwaysIncludePaths: o = []
      } = R,
      n = o.length > 0 ? nA0.default(o, {
        dot: !0
      }) : void 0,
      p = "nodejs",
      _ = [],
      m = !1,
      b = 0,
      y = await CkT(e).catch(() => e),
      u = new Set();
    try {
      if (s || A === "nodejs") p = "nodejs";else {
        let f = await this.tryExternalTools(e, A, c, {
          followSymlinks: l,
          alwaysIncludeMatcher: n
        });
        if (f) _ = f.entries, p = f.strategy, m = !0;else p = "nodejs";
      }
      if (p === "nodejs") {
        let f = await this.scanWithNodeJS(e, {
          respectIgnorePatterns: t,
          maxDepth: r,
          maxFiles: h,
          onProgress: i || (() => {}),
          signal: c || new AbortController().signal,
          alwaysIncludeMatcher: n
        }, {
          followSymlinks: l,
          rootRealPath: y,
          visitedRealDirs: u
        });
        _ = f.entries, b = f.skippedPaths;
      }
      if (p !== "nodejs") {
        if (isFinite(h)) _ = _.slice(0, h);
        if (i) {
          let f = _.filter(g => g.kind === "file").length,
            v = _.filter(g => g.kind === "directory").length;
          i({
            scannedFiles: f,
            scannedDirectories: v,
            currentPath: e
          });
        }
        if (o.length > 0) {
          let f = await this.scanAlwaysIncludePaths(e, o, n, _, {
            followSymlinks: l,
            rootRealPath: y,
            visitedRealDirs: u
          });
          _ = [..._, ...f];
        }
      }
    } catch (f) {
      if (f instanceof Error && (f.name === "AbortError" || f.message === "Scan aborted")) throw f;
      J.warn("Directory scan completed with errors", {
        error: f
      });
    }
    let P = Date.now() - a,
      k = _.filter(f => f.kind === "file").length,
      x = _.filter(f => f.kind === "directory").length;
    return {
      entries: _,
      stats: {
        totalFiles: k,
        totalDirectories: x,
        scanDuration: P,
        skippedPaths: b,
        strategy: p,
        externalToolsAvailable: m
      }
    };
  }
  async tryExternalTools(T, R, a, e) {
    let t = [];
    if (R === "auto") {
      if (e.followSymlinks) t.push("ripgrep");else t.push("git", "ripgrep");
    } else if (R === "git") {
      if (!e.followSymlinks) t.push("git");
    } else if (R === "ripgrep") t.push("ripgrep");
    for (let r of t) try {
      let h = await this.runExternalTool(r, T, a, {
        followSymlinks: e.followSymlinks,
        alwaysIncludeMatcher: e.alwaysIncludeMatcher
      });
      if (h.length > 0) return {
        entries: h,
        strategy: r
      };else J.debug("External tool returned no entries, trying next", {
        tool: r
      });
    } catch (h) {
      J.debug("External tool failed, trying next", {
        tool: r,
        error: h
      });
    }
    return J.debug("All external tools failed, falling back to Node.js scanning"), null;
  }
  async runExternalTool(T, R, a, e) {
    let t = T === "git" ? "git" : await faT(),
      r = T === "git" ? ["ls-files", "--exclude-standard", "--cached", "--others"] : e.followSymlinks ? ["--files", "--follow", "--hidden", "--glob", "!.git/", "--glob", "!.jj/"] : ["--files", "--hidden", "--glob", "!.git/", "--glob", "!.jj/"];
    return new Promise((h, i) => {
      let c = lA0(t, r, {
          cwd: R,
          stdio: ["ignore", "pipe", "pipe"]
        }),
        s = [],
        A = "",
        l = "",
        o = !1,
        n = p => {
          if (!p || o) return;
          if (s.push(p), s.length >= LkT) {
            if (!o) J.warn("External directory scan limit reached. Returning partial results.", {
              tool: T,
              rootPath: R,
              limit: LkT
            }), o = !0, c.kill();
          }
        };
      if (c.stdout?.on("data", p => {
        if (o) return;
        A += p.toString("utf8");
        let _;
        while ((_ = A.indexOf(`
`)) !== -1) {
          let m = A.slice(0, _).replace(/\r$/, "");
          if (A = A.slice(_ + 1), n(m), o) break;
        }
      }), c.stderr?.on("data", p => {
        if (l.length >= cF) return;
        let _ = p.toString("utf8");
        if (l.length + _.length > cF) l += _.slice(0, cF - l.length);else l += _;
      }), a) {
        let p = () => {
          if (!o) c.kill("SIGTERM"), i(Error("Scan aborted"));
        };
        if (a.aborted) p();else a.addEventListener("abort", p, {
          once: !0
        });
      }
      c.on("close", p => {
        if (!o && A) {
          let _ = A.replace(/\r$/, "");
          n(_);
        }
        if (!o && p !== 0) {
          if (!l.trim().split(`
`).filter(_ => _.length > 0).every(_ => _.includes("No such file or directory"))) {
            J.debug("External tool failed", {
              command: t,
              code: p,
              stderr: l
            }), i(Error(`${t} exited with code ${p}: ${l}`));
            return;
          }
        }
        try {
          let _ = new Set(),
            m = {
              rootPath: R,
              alwaysIncludeMatcher: e.alwaysIncludeMatcher
            },
            b = s.map(P => {
              let k = this.createEntryFromPath(lg(R, P), {
                  size: 0,
                  mtime: new Date(),
                  isDirectory: !1,
                  isFile: !0,
                  isSymlink: !1
                }, m),
                x = P;
              while (x !== "" && x !== ".") if (x = AA0(x), x && x !== "." && !_.has(x)) _.add(x);
              return k;
            }),
            y = Array.from(_).map(P => {
              return this.createEntryFromPath(lg(R, P), {
                size: 0,
                mtime: new Date(),
                isDirectory: !0,
                isFile: !1,
                isSymlink: !1
              }, m);
            }),
            u = [...b, ...y];
          h(u);
        } catch (_) {
          i(_);
        }
      }), c.on("error", p => {
        i(p);
      });
    });
  }
  async scanWithNodeJS(T, R, a) {
    if (R.signal?.aborted) throw Error("Scan aborted");
    let e = [],
      t = {
        scannedFiles: 0,
        scannedDirectories: 0,
        skippedPaths: 0
      };
    return await this.scanDirectoryRecursive(T, T, 0, R, e, t, a), {
      entries: e,
      skippedPaths: t.skippedPaths
    };
  }
  async scanDirectoryRecursive(T, R, a, e, t, r, h) {
    if (e.signal?.aborted) throw Error("Scan aborted");
    if (a > e.maxDepth) return;
    if (t.length >= e.maxFiles) return;
    let i = Ag(R, T);
    if (e.respectIgnorePatterns && i) {
      if (!(e.alwaysIncludeMatcher?.(i) ?? !1) && Ri.shouldIgnore(i, !0)) {
        r.skippedPaths++;
        return;
      }
    }
    let c;
    try {
      c = await b_.readdir(T, {
        withFileTypes: !0
      });
    } catch (s) {
      if (s instanceof Error) {
        if ("code" in s && (s.code === "EACCES" || s.code === "EPERM")) {
          r.skippedPaths++;
          return;
        }
        if ("code" in s && s.code === "ENOENT") return;
      }
      throw s;
    }
    for (let s of c) {
      if (e.signal?.aborted) throw Error("Scan aborted");
      if (t.length >= e.maxFiles) break;
      let A = lg(T, s.name),
        l = Ag(R, A);
      if (e.respectIgnorePatterns) {
        if (!(e.alwaysIncludeMatcher?.(l) ?? !1) && Ri.shouldIgnore(l, s.isDirectory())) {
          r.skippedPaths++;
          continue;
        }
      }
      try {
        let o,
          n = !1,
          p = {
            rootPath: R,
            alwaysIncludeMatcher: e.alwaysIncludeMatcher
          };
        if (s.isDirectory()) o = this.createEntryFromPath(A, {
          size: 0,
          mtime: new Date(),
          isDirectory: !0,
          isFile: !1,
          isSymlink: !1
        }, p), r.scannedDirectories++, n = !0;else if (s.isSymbolicLink() && h.followSymlinks) {
          let _ = await b_.stat(A).catch(() => null);
          if (_ && _.isDirectory()) o = this.createEntryFromPath(A, {
            size: 0,
            mtime: _.mtime,
            isDirectory: !0,
            isFile: !1,
            isSymlink: !0
          }, p), r.scannedDirectories++, n = !0;else if (_) o = this.createEntryFromPath(A, {
            size: _.size,
            mtime: _.mtime,
            isDirectory: !1,
            isFile: !0,
            isSymlink: !0
          }, p), r.scannedFiles++;else {
            r.skippedPaths++;
            continue;
          }
        } else {
          let _ = await b_.stat(A);
          o = this.createEntryFromPath(A, {
            size: _.size,
            mtime: _.mtime,
            isDirectory: !1,
            isFile: !0,
            isSymlink: _.isSymbolicLink()
          }, p), r.scannedFiles++;
        }
        if (t.push(o), e.onProgress && t.length % 100 === 0) e.onProgress({
          scannedFiles: r.scannedFiles,
          scannedDirectories: r.scannedDirectories,
          currentPath: A
        });
        if (n) {
          let _ = await CkT(A).catch(() => null);
          if (!_) {
            r.skippedPaths++;
            continue;
          }
          if (h.visitedRealDirs.has(_)) continue;
          h.visitedRealDirs.add(_), await this.scanDirectoryRecursive(A, R, a + 1, e, t, r, h);
        }
      } catch (o) {
        if (o instanceof Error) {
          if ("code" in o && (o.code === "EACCES" || o.code === "EPERM" || o.code === "ENOENT")) {
            r.skippedPaths++;
            continue;
          }
        }
        J.warn("Error processing file", {
          error: o
        }), r.skippedPaths++;
      }
    }
  }
  async scanAlwaysIncludePaths(T, R, a, e, t) {
    let r = [],
      h = new Set(e.map(c => c.path)),
      i = new Set();
    for (let c of R) {
      let s = c.split("/"),
        A = "";
      for (let l of s) {
        if (l.includes("*") || l.includes("?") || l.includes("[")) break;
        A = A ? `${A}/${l}` : l;
      }
      if (A) i.add(A);
    }
    for (let c of i) {
      let s = lg(T, c);
      try {
        let A = await b_.stat(s);
        if (A.isDirectory()) await this.scanAlwaysIncludeDir(s, T, a, h, r, t);else if (!h.has(s)) {
          let l = Ag(T, s);
          if (a?.(l)) r.push(this.createEntryFromPath(s, {
            size: A.size,
            mtime: A.mtime,
            isDirectory: !1,
            isFile: !0,
            isSymlink: A.isSymbolicLink()
          }, {
            rootPath: T,
            alwaysIncludeMatcher: a
          }));
        }
      } catch {}
    }
    return r;
  }
  async scanAlwaysIncludeDir(T, R, a, e, t, r) {
    let h;
    try {
      h = await b_.readdir(T, {
        withFileTypes: !0
      });
    } catch {
      return;
    }
    for (let i of h) {
      let c = lg(T, i.name),
        s = Ag(R, c);
      if (e.has(c)) continue;
      if (!(a?.(s) ?? !1)) continue;
      try {
        if (i.isDirectory()) t.push(this.createEntryFromPath(c, {
          size: 0,
          mtime: new Date(),
          isDirectory: !0,
          isFile: !1,
          isSymlink: !1
        }, {
          rootPath: R,
          alwaysIncludeMatcher: a
        })), await this.scanAlwaysIncludeDir(c, R, a, e, t, r);else if (i.isSymbolicLink() && r.followSymlinks) {
          let A = await b_.stat(c).catch(() => null);
          if (A) {
            if (t.push(this.createEntryFromPath(c, {
              size: A.size,
              mtime: A.mtime,
              isDirectory: A.isDirectory(),
              isFile: A.isFile(),
              isSymlink: !0
            }, {
              rootPath: R,
              alwaysIncludeMatcher: a
            })), A.isDirectory()) await this.scanAlwaysIncludeDir(c, R, a, e, t, r);
          }
        } else {
          let A = await b_.stat(c);
          t.push(this.createEntryFromPath(c, {
            size: A.size,
            mtime: A.mtime,
            isDirectory: !1,
            isFile: !0,
            isSymlink: A.isSymbolicLink()
          }, {
            rootPath: R,
            alwaysIncludeMatcher: a
          }));
        }
      } catch {}
    }
  }
  createEntryFromPath(T, R, a) {
    let e;
    if (R.isDirectory) e = "directory";else e = "file";
    let t = {
        size: R.size,
        mtime: R.mtime.getTime(),
        isSymlink: R.isSymlink
      },
      r = T,
      h = zR.file(T),
      i = !1;
    if (a?.alwaysIncludeMatcher && a?.rootPath) {
      let c = Ag(a.rootPath, T);
      i = a.alwaysIncludeMatcher(c);
    }
    return new Fk({
      id: r,
      kind: e,
      path: T,
      uri: h,
      metadata: t,
      isAlwaysIncluded: i
    });
  }
}
class XKT {
  config;
  queryChars;
  queryLower;
  constructor(T, R = {}) {
    this.config = {
      ..._A0,
      ...R
    };
    let a = T.replace(/^[@#]+/, "");
    if (this.queryChars = Array.from(a), this.queryLower = Array.from(a.toLowerCase()), this.config.smartCase) this.config.caseSensitive = a !== a.toLowerCase();
  }
  match(T) {
    if (this.queryChars.length === 0) return T.filter(a => a.shouldIncludeInResults()).map(a => {
      let e = this.config.openFiles?.includes(a.path) ? 500 : 0,
        t = this.config.dirtyFiles?.includes(a.path) ? 300 : 0,
        r = a.getImportanceBoost() + e + t - this.getTestAndStoryPathPenalty(a.path);
      return {
        entry: a,
        score: r,
        matchPositions: [],
        highlightedPath: a.path
      };
    }).sort((a, e) => e.score - a.score).slice(0, this.config.maxResults);
    let R = this.matchWithSemanticScoring(T);
    if (R.length > 0) return R;
    return this.matchWithFuzzyScoring(T);
  }
  matchWithSemanticScoring(T) {
    let R = [],
      a = 0,
      e = 50000,
      t = this.queryChars.join(""),
      r = T.filter(i => i.shouldIncludeInResults() && this.passesCharBagFilter(t, i)),
      h = i => {
        let c = this.matchEntrySemantic(i);
        if (c && c.score >= this.config.minScore) R.push(c);
        return a++, a >= e;
      };
    for (let i of r) if (i.isDirectory()) {
      if (h(i)) break;
    }
    if (a < e) {
      for (let i of r) if (!i.isDirectory()) {
        if (h(i)) break;
      }
    }
    return R.sort((i, c) => {
      let s = c.score - i.score;
      if (Math.abs(s) > 0.001) return s;
      return i.entry.path.length - c.entry.path.length;
    }), R.slice(0, this.config.maxResults);
  }
  matchWithFuzzyScoring(T) {
    let R = [],
      a = 0,
      e = 50000,
      t = this.queryChars.join(""),
      r = T.filter(i => i.shouldIncludeInResults() && this.passesCharBagFilter(t, i)),
      h = i => {
        let c = this.matchEntryFuzzy(i);
        if (c) R.push(c);
        return a++, a >= e;
      };
    for (let i of r) if (i.isDirectory()) {
      if (h(i)) break;
    }
    if (a < e) {
      for (let i of r) if (!i.isDirectory()) {
        if (h(i)) break;
      }
    }
    return R.sort((i, c) => {
      let s = c.score - i.score;
      if (Math.abs(s) > 0.001) return s;
      return i.entry.path.length - c.entry.path.length;
    }), R.slice(0, this.config.maxResults);
  }
  matchEntrySemantic(T) {
    let R = T.path,
      a = this.queryLower.join(""),
      e = this.calculateSemanticScore(a, T);
    if (e === 0) return null;
    let t = this.applyTieBreakers(e, a, T),
      r = this.findMatchPositions(a, R),
      h = this.createHighlightedPath(R, r);
    return {
      entry: T,
      score: t,
      matchPositions: r,
      highlightedPath: h
    };
  }
  matchEntryFuzzy(T) {
    let R = T.path,
      a = this.queryLower.join(""),
      e = this.calculateFuzzyScore(a, T);
    if (e === 0) return null;
    let t = this.applyTieBreakers(e, a, T),
      r = this.findMatchPositions(a, R),
      h = this.createHighlightedPath(R, r);
    return {
      entry: T,
      score: t,
      matchPositions: r,
      highlightedPath: h
    };
  }
  calculateSemanticScore(T, R) {
    let a = T.toLowerCase(),
      e = R.path,
      t = e.toLowerCase(),
      r = this.normalizeMatchString(a),
      h = this.getFilename(e),
      i = this.removeExtension(h).toLowerCase(),
      c = this.splitPathSegments(t);
    if (T.endsWith("/") && R.isDirectory()) {
      let o = a.slice(0, -1);
      if (t === o || t.endsWith("/" + o)) return Je.EXACT_FILENAME + 100;
      if (t.includes(o)) return Je.SUBSTRING_FILENAME + 50;
    }
    if (i === a || h.toLowerCase() === a) return Je.EXACT_FILENAME;
    if (i.startsWith(a)) return Je.PREFIX_FILENAME;
    if (i.endsWith(a)) return Je.SUFFIX_FILENAME;
    if (i.includes(a)) return Je.SUBSTRING_FILENAME;
    if (r.length > 6 && (T.includes("/") || T.includes("\\"))) {
      let o = this.progressiveSegmentMatch(r, c);
      if (o) return o;
    }
    let s = this.simpleTokens(a);
    if (s.length > 1) {
      let o = this.matchTokensToSegments(s, c);
      if (o) return o;
    }
    if (s.length === 1 && a.length > 6) {
      let o = this.progressiveSegmentMatch(a, c);
      if (o) return o;
    }
    if (c.includes(a)) return Je.SEGMENT_EXACT;
    if (c.some(o => o.includes(a))) return Je.SEGMENT_SUBSTRING;
    let A = c.join("");
    if (r && A.includes(r)) return Je.SEGMENT_SUBSTRING;
    let l = this.normalizeMatchString(t);
    if (r && l.includes(r)) return Je.PATH_SUBSTRING;
    if (r && this.fuzzyIn(r, l)) return Je.PATH_SUBSTRING;
    return 0;
  }
  calculateFuzzyScore(T, R) {
    let a = T.toLowerCase(),
      e = R.path.toLowerCase();
    if (this.fuzzyIn(a, e)) return Je.FUZZY;
    return 0;
  }
  applyTieBreakers(T, R, a) {
    let e = T,
      t = Math.abs(a.path.length - R.length);
    e -= 0.01 * t;
    let r = a.path.split(/[/\\]/).length - 1;
    e -= 0.1 * r;
    let h = this.getFilename(a.path),
      i = this.removeExtension(h).toLowerCase();
    if (/^(license|readme|copy(ing|left))$/i.test(i) && r === 1) e -= 200;
    if (a.metadata.mtime) {
      let c = (Date.now() - a.metadata.mtime) / 86400000;
      if (c < 30) {
        let s = Math.max(0, 1 - c / 30);
        e += 50 * s;
      }
    }
    if (this.config.openFiles?.includes(a.path)) e += 500;
    if (this.config.dirtyFiles?.includes(a.path)) e += 300;
    return e -= this.getTestAndStoryPathPenalty(a.path), e;
  }
  getTestAndStoryPathPenalty(T) {
    if (!this.config.downrankTestAndStoryPaths) return 0;
    return bA0.some(R => T.includes(R)) ? mA0 : 0;
  }
  simpleTokens(T) {
    return T.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }
  normalizeMatchString(T) {
    return T.replace(/[^a-z0-9]+/g, "");
  }
  splitPathSegments(T) {
    return T.split(/[/\\]/).flatMap(R => R.split(/[^a-z0-9]+/).filter(Boolean));
  }
  progressiveSegmentMatch(T, R) {
    let a = 0,
      e = 0,
      t = 0;
    for (let r of R) {
      if (a >= T.length) break;
      let h = "",
        i = "none";
      if (a + r.length <= T.length) {
        if (T.slice(a, a + r.length) === r) h = r, i = "exact";
      }
      if (!h && r.length >= 3) {
        if (T.slice(a).startsWith(r)) h = r, i = "prefix";
      }
      if (!h && r.length >= 3) {
        let c = T.slice(a);
        if (c.includes(r) && c.indexOf(r) === 0) h = r, i = "substring";
      }
      if (!h) {
        let c = T.slice(a);
        if (c.length >= 3 && r.includes(c)) h = c, i = "substring";
      }
      if (h) {
        if (a += h.length, e++, i === "exact") t++;
      }
    }
    if (a / T.length >= 0.8 && e >= 2) return t >= 2 ? Je.SEGMENT_ORDERED_EXACT : Je.SEGMENT_ORDERED_PARTIAL;
    return 0;
  }
  matchTokensToSegments(T, R) {
    let a = this.findTokenMatches(T, R),
      e = this.getWorstMatchType(a);
    return this.scoreFromMatchType(e);
  }
  findTokenMatches(T, R) {
    let a = 0,
      e = [];
    for (let t of T) {
      let r = !1;
      for (let h = a; h < R.length; h++) {
        let i = R[h];
        if (!i) continue;
        if (t === i) {
          e.push("exact"), a = h + 1, r = !0;
          break;
        } else if (i.startsWith(t) || t.startsWith(i) || i.endsWith(t) || i.includes(t) || t.includes(i)) {
          e.push("partial"), a = h + 1, r = !0;
          break;
        }
      }
      if (!r) return [];
    }
    return e;
  }
  getWorstMatchType(T) {
    if (T.length === 0) return "none";
    if (T.includes("partial")) return "partial";
    return "exact";
  }
  scoreFromMatchType(T) {
    switch (T) {
      case "exact":
        return Je.SEGMENT_ORDERED_EXACT;
      case "partial":
        return Je.SEGMENT_ORDERED_PARTIAL;
      default:
        return 0;
    }
  }
  fuzzyIn(T, R) {
    let a = 0;
    for (let e = 0; e < R.length && a < T.length; e++) if (R[e] === T[a]) a++;
    return a === T.length;
  }
  getFilename(T) {
    return T.split(/[/\\]/).pop() || T;
  }
  removeExtension(T) {
    let R = T.lastIndexOf(".");
    return R > 0 ? T.substring(0, R) : T;
  }
  findMatchPositions(T, R) {
    let a = [],
      e = R.toLowerCase(),
      t = T.toLowerCase();
    if (e.includes(t)) {
      let h = e.indexOf(t);
      for (let i = 0; i < t.length; i++) a.push(h + i);
      return a;
    }
    let r = 0;
    for (let h of t) {
      let i = e.indexOf(h, r);
      if (i !== -1) a.push(i), r = i + 1;
    }
    return a;
  }
  passesCharBagFilter(T, R) {
    if (T.includes("/") || T.includes("\\")) {
      let a = T.split(/[/\\]/);
      for (let e of a) {
        if (e.trim() === "") continue;
        let t = oh.fromString(e);
        if (!R.charBag.hasChars(t)) return !1;
      }
      return !0;
    } else {
      let a = oh.fromString(T);
      return R.charBag.hasChars(a);
    }
  }
  createHighlightedPath(T, R) {
    if (R.length === 0) return T;
    let a = "",
      e = 0;
    for (let t of R) {
      if (t >= T.length) continue;
      a += T.slice(e, t), a += `**${T[t]}**`, e = t + 1;
    }
    return a += T.slice(e), a;
  }
}
function uA0(T, R, a) {
  return new XKT(T, a).match(R);
}
class $w {
  metadata;
  entries;
  entriesByPath;
  entriesById;
  constructor(T, R = [], a, e) {
    if (this.metadata = T, this.entries = R, a && e) this.entriesByPath = a, this.entriesById = e;else {
      let t = new Map(),
        r = new Map();
      for (let h of R) t.set(h.path, h), r.set(h.id, h);
      this.entriesByPath = t, this.entriesById = r;
    }
    this.cachedArray = Array.from(this.entriesByPath.values()), this.entriesArrayDirty = !1;
  }
  static create(T) {
    let R = Date.now();
    return new $w({
      id: R,
      createdAt: R,
      rootPath: T,
      entryCount: 0,
      scanStatus: "scanning"
    }, []);
  }
  static fromEntries(T, R) {
    let a = Date.now(),
      e = {
        id: a,
        createdAt: a,
        rootPath: T,
        entryCount: R.length,
        scanStatus: "complete"
      };
    return new $w(e, R);
  }
  entriesArrayDirty = !1;
  cachedArray = [];
  getAllEntries() {
    if (this.entriesArrayDirty) this.cachedArray = [...this.entriesByPath.values()], this.entriesArrayDirty = !1;
    return this.cachedArray;
  }
  getEntryByPath(T) {
    return this.entriesByPath.get(T) ?? null;
  }
  getEntryById(T) {
    return this.entriesById.get(T) ?? null;
  }
  applyChanges(T) {
    let {
      added: R = [],
      removed: a = [],
      modified: e = []
    } = T;
    for (let t of a) {
      let r = this.entriesByPath.get(t);
      if (r) {
        if (this.entriesByPath.delete(t), this.entriesById.delete(r.id), !this.entriesArrayDirty) {
          let h = this.cachedArray.findIndex(i => i.path === t);
          if (h >= 0) this.cachedArray.splice(h, 1);
        }
      }
    }
    for (let t of [...R, ...e]) if (this.entriesByPath.set(t.path, t), this.entriesById.set(t.id, t), !this.entriesArrayDirty) {
      let r = this.cachedArray.findIndex(h => h.path === t.path);
      if (r >= 0) this.cachedArray.splice(r, 1);
      this.cachedArray.unshift(t);
    }
    this.metadata.entryCount = this.entriesByPath.size;
  }
  findEntries(T) {
    return this.entries.filter(T);
  }
  getFiles() {
    return this.findEntries(T => T.kind === "file");
  }
  getDirectories() {
    return this.findEntries(T => T.kind === "directory");
  }
  getInDirectory(T) {
    let R = T.endsWith("/") ? T : T + "/";
    return this.findEntries(a => a.path.startsWith(R) && a.path !== T);
  }
  hasPath(T) {
    return this.entriesByPath.has(T);
  }
  getStats() {
    let T = this.metadata.entryCount || this.entries.length,
      R = this.getFiles().length,
      a = T - R,
      e = T * 250;
    return {
      totalEntries: T,
      fileEntries: R,
      directoryEntries: a,
      memoryUsage: e
    };
  }
}
async function IA0(T, R) {
  if (!(await TY.isRepo(T))) return null;
  return new TY(T, R?.pollInterval);
}
class JeT {
  indexes = new Map();
  headWatchers = new Map();
  reindexingWorkspaces = new Set();
  config;
  disposed = !1;
  static forWorkspace(T) {
    return new JeT({
      workspaceRoots: [T],
      scanOnStartup: !0,
      maxIndexedFiles: 500000,
      enableFileWatching: !0,
      usePollingFallback: !1,
      enableHeadWatching: !0,
      followSymlinkDirs: !0
    });
  }
  constructor(T) {
    this.config = {
      ...T
    };
  }
  async initialize() {
    if (this.disposed) throw Error("Service has been disposed");
    if (this.config.scanOnStartup) {
      let T = this.config.workspaceRoots.map(R => this.indexWorkspace(R));
      await Promise.allSettled(T);
    }
  }
  async indexWorkspace(T) {
    if (this.disposed) throw Error("Service has been disposed");
    if (this.indexes.has(T)) {
      await this.indexes.get(T).rescan();
      return;
    }
    let R = this.config.enableFileWatching ? KKT({
        rootPath: T,
        usePolling: this.config.usePollingFallback
      }) : void 0,
      a = new YKT(T, R);
    a.on("scan-error", t => {
      J.error("Scan error in workspace", {
        rootPath: T,
        error: t
      });
    });
    let e = {
      respectIgnorePatterns: !0,
      maxFiles: this.config.maxIndexedFiles,
      followSymlinks: this.config.followSymlinkDirs,
      alwaysIncludePaths: this.config.alwaysIncludePaths
    };
    try {
      if (await a.initialize(e), this.indexes.set(T, a), this.config.enableHeadWatching) await this.setupHeadWatching(T, a, R);
    } catch (t) {
      a.dispose();
      let r = this.headWatchers.get(T);
      if (r) r.dispose(), this.headWatchers.delete(T);
      throw t;
    }
  }
  async removeWorkspace(T) {
    let R = this.indexes.get(T);
    if (R) R.dispose(), this.indexes.delete(T);
    let a = this.headWatchers.get(T);
    if (a) a.dispose(), this.headWatchers.delete(T);
  }
  searchAll(T, R) {
    let a = [];
    for (let e of this.indexes.values()) try {
      let t = e.search(T, R);
      a.push(...t);
    } catch (t) {}
    return a.sort((e, t) => t.score - e.score), R?.limit ? a.slice(0, R.limit) : a;
  }
  searchWorkspace(T, R, a) {
    let e = this.indexes.get(T);
    if (!e) return [];
    try {
      return e.search(R, a);
    } catch (t) {
      return J.error(`Search error in workspace ${T}:`, t), [];
    }
  }
  getIndexStats(T) {
    if (T) {
      let a = this.indexes.get(T);
      if (a) return [{
        ...a.getStats(),
        rootPath: T
      }];
      return [];
    }
    let R = [];
    for (let [a, e] of this.indexes.entries()) R.push({
      ...e.getStats(),
      rootPath: a
    });
    return R;
  }
  getConfig() {
    return {
      ...this.config
    };
  }
  updateConfig(T) {
    this.config = {
      ...this.config,
      ...T
    };
  }
  async rescanAll() {
    let T = [];
    for (let [R, a] of this.indexes.entries()) T.push(a.rescan().catch(e => {
      J.error(`Rescan error in workspace ${R}:`, e);
    }));
    await Promise.allSettled(T);
  }
  getIndexedWorkspaces() {
    return Array.from(this.indexes.keys());
  }
  isWorkspaceIndexed(T) {
    return this.indexes.has(T);
  }
  dispose() {
    if (this.disposed) return;
    for (let [, T] of this.indexes.entries()) T.dispose();
    for (let [, T] of this.headWatchers.entries()) T.dispose();
    this.indexes.clear(), this.headWatchers.clear(), this.disposed = !0;
  }
  isDisposed() {
    return this.disposed;
  }
  async setupHeadWatching(T, R, a) {
    try {
      let e = await IA0(T);
      if (!e) return;
      e.on("head-change", async ({
        oldSha: t,
        newSha: r
      }) => {
        if (this.reindexingWorkspaces.has(T)) {
          J.debug("Re-index already in progress, skipping", {
            rootPath: T
          });
          return;
        }
        this.reindexingWorkspaces.add(T);
        try {
          if (await R.rescan(), a && a instanceof vv) await a.reset(T);
        } catch (h) {
          J.error("Failed to re-index after change", {
            rootPath: T,
            error: h
          });
        } finally {
          this.reindexingWorkspaces.delete(T);
        }
      }), await e.start(), this.headWatchers.set(T, e), J.debug("Git HEAD watching enabled", {
        rootPath: T
      });
    } catch (e) {
      J.warn("Failed to setup git HEAD watching", {
        rootPath: T,
        error: e
      });
    }
  }
}
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
class vw {
  opts;
  fuzzyService = null;
  state = "unstarted";
  initPromise = null;
  workspaceRoot;
  constructor(T = process.cwd(), R = {}, a = !1) {
    if (this.opts = R, this.workspaceRoot = T, a) this.initPromise = this.init(), this.initPromise.then(() => {
      J.debug("Fuzzy service background initialization completed");
    }).catch(e => {
      J.debug("Fuzzy service background initialization failed", e);
    });
  }
  async start() {
    if (this.initPromise !== null) return this.initPromise;
    return this.initPromise = this.init(), this.initPromise;
  }
  async init() {
    if (S4.resolve(this.workspaceRoot) === S4.resolve(aA0.homedir())) {
      J.debug("Skipping fuzzy service initialization for home directory");
      return;
    }
    this.state = "initializing";
    try {
      this.fuzzyService = gA0([this.workspaceRoot], {
        scanOnStartup: !0,
        enableFileWatching: !0,
        usePollingFallback: !1,
        ...this.opts
      }), await this.fuzzyService.initialize(), this.state = "ready";
    } catch (T) {
      this.state = "failed";
      let R = T instanceof Error ? T.message : String(T);
      J.warn("Failed to initialize fuzzy service, will use fallback", {
        error: R
      });
    }
  }
  async query(T, R = 50, a, e) {
    if (this.initPromise !== void 0) try {
      await this.initPromise;
    } catch (r) {
      return J.warn("Background fuzzy initialization failed, returning empty results", r), [];
    }
    if (!this.fuzzyService) return J.warn("Fuzzy service not initialized, returning empty results"), [];
    let t = r => S4.relative(this.workspaceRoot, r);
    try {
      let r = T.trim();
      return this.fuzzyService.searchAll(r, {
        limit: R,
        minScore: r ? 0.1 : void 0,
        openFiles: a,
        dirtyFiles: e
      }).map(h => t(h.entry.path));
    } catch (r) {
      return J.error("Fuzzy search failed", r), [];
    }
  }
  async queryCompletions(T, R = 50, a, e) {
    if (this.initPromise !== void 0) try {
      await this.initPromise;
    } catch (r) {
      return J.warn("Background fuzzy initialization failed, returning empty results", r), [];
    }
    if (!this.fuzzyService) return J.warn("Fuzzy service not initialized, returning empty results"), [];
    let t = r => S4.relative(this.workspaceRoot, r);
    try {
      let r = T.trim();
      return this.fuzzyService.searchAll(r, {
        limit: R,
        minScore: r ? 0.1 : void 0,
        openFiles: a,
        dirtyFiles: e,
        downrankTestAndStoryPaths: !0
      }).map(h => ({
        path: t(h.entry.path),
        kind: h.entry.isDirectory() ? "folder" : "file"
      }));
    } catch (r) {
      return J.error("Fuzzy search failed", r), [];
    }
  }
  getStats() {
    return {
      state: this.state,
      stats: this.fuzzyService?.getIndexStats() ?? []
    };
  }
  dispose() {
    if (this.fuzzyService) this.fuzzyService.dispose(), this.fuzzyService = null;
    this.state = "unstarted", this.initPromise = null;
  }
}
async function $A0() {
  let T = QKT.createInterface({
      input: process.stdin
    }),
    R = {};
  try {
    for await (let a of T) {
      if (a === "") break;
      let e = a.indexOf("=");
      if (e !== -1) {
        let t = a.slice(0, e),
          r = a.slice(e + 1);
        R[t] = r;
      }
    }
  } finally {
    T.close();
  }
  return R;
}
async function vA0(T, R) {
  let a = await fetch(`${T}/api/internal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${R}`
    },
    body: JSON.stringify({
      method: "getGitHubGitAccessToken",
      params: {
        host: "github.com",
        protocol: "https"
      }
    })
  });
  if (!a.ok) return J.error("Failed to fetch GitHub git token", {
    status: a.status
  }), process.stderr.write(`Unable to fetch GitHub credentials.
`), null;
  let e = await a.json();
  if (!e.ok || !e.result?.accessToken) {
    if (J.debug("GitHub git token not available", {
      error: e.error
    }), e.error?.message) process.stderr.write(`${e.error.message}
`);
    return null;
  }
  return e.result.accessToken;
}
async function jA0(T, R, a) {
  if (T !== "get") return;
  let e = await $A0();
  if (e.protocol !== "https" || e.host !== "github.com") return;
  let t = await a.get("apiKey", R);
  if (!t) {
    J.error("No API key found. Run `amp login` first."), process.exitCode = 1;
    return;
  }
  let r = await vA0(R, t);
  if (!r) {
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`protocol=https
host=github.com
username=x-access-token
password=${r}

`);
}
async function SA0(T, R, a) {
  let e = await fetch(`${T}/api/internal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${R}`
    },
    body: JSON.stringify({
      method: "signCommit",
      params: {
        commitObject: a
      }
    })
  });
  if (!e.ok) return J.error("Failed to fetch commit signature", {
    status: e.status
  }), null;
  let t = await e.json();
  if (!t.ok || !t.result?.signature) return J.error("Commit signing failed", {
    error: t.error
  }), null;
  return t.result.signature;
}
async function OA0(T, R) {
  let a = await R.get("apiKey", T);
  if (!a) {
    J.error("No API key found. Run `amp login` first."), process.exitCode = 1;
    return;
  }
  let e = [];
  for await (let h of process.stdin) e.push(h);
  let t = Buffer.concat(e).toString("utf-8"),
    r = await SA0(T, a, t);
  if (!r) {
    process.exitCode = 1;
    return;
  }
  process.stdout.write(r), process.stdout.write(`
`), process.stderr.write(`
[GNUPG:] SIG_CREATED 
`);
}
function pS(T) {
  return T.toolUseId;
}
function dA0(T) {
  return T.parentToolUseId;
}
function ZKT(T) {
  let R = pS(T);
  return {
    id: T.id || R,
    toolCallId: R,
    toolName: T.toolName,
    args: T.args,
    reason: T.reason,
    toAllow: T.toAllow,
    context: T.context,
    subagentToolName: T.subagentToolName,
    parentToolCallId: dA0(T),
    timestamp: T.timestamp,
    matchedRule: T.matchedRule,
    ruleSource: T.ruleSource
  };
}
function JKT(T, R) {
  let a = zR.parse(T);
  if (a.scheme !== "file") throw new U_("INVALID_URI", "Only file:// URIs are supported");
  if (!a.path.startsWith("/")) throw new U_("INVALID_URI", "File URI path must be absolute");
  if (a.path.split("/").some(i => i === "..")) throw new U_("ACCESS_DENIED", "File URI resolves outside workspace root");
  let e = pg.posix.normalize(a.path).replace(/^\/+/u, "");
  if (e === ".." || e.startsWith("../")) throw new U_("ACCESS_DENIED", "File URI resolves outside workspace root");
  let t = pg.resolve(R),
    r = e.length > 0 ? pg.resolve(t, e) : t,
    h = pg.relative(t, r);
  if (h.startsWith("..") || pg.isAbsolute(h)) throw new U_("ACCESS_DENIED", "File URI resolves outside workspace root");
  return r;
}
async function TtT(T, R) {
  try {
    let a = JKT(R, T.workspaceRoot),
      e = await T.fileSystem.readdir(zR.file(a));
    return {
      ok: !0,
      entries: await Promise.all(e.map(async t => {
        let r = t.isDirectory ? "directory" : "file",
          h = r === "file" ? await EA0(T.fileSystem, t.uri) : void 0;
        return [MR.basename(t.uri), r, h];
      }))
    };
  } catch (a) {
    return {
      ok: !1,
      error: RVT(a, "read_directory")
    };
  }
}
async function EA0(T, R) {
  try {
    let a = await T.getMtime(R);
    if (!Number.isFinite(a) || a < 0) return;
    return {
      mtimeMs: a
    };
  } catch {
    return;
  }
}
async function TVT(T, R) {
  try {
    let a = JKT(R, T.workspaceRoot),
      e = await T.fileSystem.readBinaryFile(zR.file(a));
    return {
      ok: !0,
      contentBase64: Buffer.from(e).toString("base64")
    };
  } catch (a) {
    return {
      ok: !1,
      error: RVT(a, "read_file")
    };
  }
}
function RVT(T, R) {
  if (T instanceof U_) return {
    code: T.code,
    message: T.message
  };
  if (Er(T)) return {
    code: "NOT_FOUND",
    message: "File or directory not found"
  };
  if (E4(T, "EISDIR")) return {
    code: "IS_DIRECTORY",
    message: "Expected a file but found a directory"
  };
  if (E4(T, "ENOTDIR")) return {
    code: R === "read_directory" ? "NOT_DIRECTORY" : "INTERNAL_ERROR",
    message: R === "read_directory" ? "Expected a directory" : DkT(T)
  };
  if (E4(T, "EACCES") || E4(T, "EPERM")) return {
    code: "ACCESS_DENIED",
    message: "Permission denied"
  };
  return {
    code: "INTERNAL_ERROR",
    message: DkT(T)
  };
}
function E4(T, R) {
  if (!(T instanceof Error)) return !1;
  return "code" in T && T.code === R;
}
function DkT(T) {
  if (T instanceof Error) return T.message;
  return String(T);
}
async function CA0(T) {
  let R = await Hs(),
    a = Vt(T) ? T : Eh(),
    e = await WWT({
      filesystem: He
    }, R, a);
  return {
    ...R,
    ...e,
    updatedAt: new Date().toISOString()
  };
}
function LA0(T) {
  return new TextEncoder().encode(JSON.stringify(T)).length;
}
function yH(T, R, a) {
  if (T.length === 0) return [];
  let e = [],
    t = [];
  for (let r of T) {
    let h = [...t, r],
      i = LA0(a(h));
    if (t.length > 0 && i > R) {
      e.push(t), t = [r];
      continue;
    }
    t = h;
  }
  if (t.length > 0) e.push(t);
  return e;
}
function wkT(T) {
  let R = new Map();
  for (let a of T) R.set(a.name, {
    schema: a,
    serializedSchema: JSON.stringify(a)
  });
  return R;
}
function MA0(T) {
  let R = {
    ...(T.executionProfile?.serial !== void 0 ? {
      serial: T.executionProfile.serial
    } : {}),
    ...(T.meta?.deferred !== void 0 ? {
      deferred: T.meta.deferred
    } : {}),
    ...(T.meta?.skillNames !== void 0 ? {
      skillNames: [...T.meta.skillNames]
    } : {})
  };
  return Object.keys(R).length > 0 ? R : void 0;
}
function DA0(T) {
  return {
    name: T.name,
    description: T.description ?? "",
    inputSchema: {
      type: "object",
      properties: T.inputSchema.properties ?? {},
      required: T.inputSchema.required,
      additionalProperties: T.inputSchema.additionalProperties
    },
    source: T.source,
    meta: MA0(T)
  };
}
function RtT(T) {
  return T.map(R => DA0(R.spec));
}
function wA0(T, R) {
  let a = wkT(T),
    e = wkT(R);
  return {
    toolsToRegister: R.filter(t => {
      let r = a.get(t.name),
        h = e.get(t.name);
      return r?.serializedSchema !== h?.serializedSchema;
    }),
    toolNamesToUnregister: [...a.keys()].filter(t => !e.has(t))
  };
}
function BA0(T, R = aVT) {
  return yH(T, R, a => ({
    type: "executor_tools_register",
    tools: a
  }));
}
function NA0(T, R = aVT) {
  return yH(T, R, a => ({
    type: "executor_tools_unregister",
    toolNames: a
  }));
}
async function GA0(T, R, a) {
  let e = [];
  for (let t = 0; t < T.length; t += R) {
    let r = T.slice(t, t + R);
    e.push(...(await Promise.all(r.map(a))));
  }
  return e;
}
function VA0(T) {
  return (T.fullFileDiff?.length ?? 0) + (T.oldContent?.length ?? 0) + (T.newContent?.length ?? 0);
}
function XA0(T) {
  let R = !1;
  if (T.fullFileDiff !== void 0 && T.fullFileDiff !== T.diff) T.fullFileDiff = T.diff, R = !0;
  if (T.oldContent !== void 0 && T.oldContent !== TA) T.oldContent = TA, R = !0;
  if (T.newContent !== void 0 && T.newContent !== TA) T.newContent = TA, R = !0;
  return R;
}
function YA0(T) {
  let R = !1;
  if (T.oldContent !== void 0) T.oldContent = void 0, R = !0;
  if (T.newContent !== void 0) T.newContent = void 0, R = !0;
  if (T.fullFileDiff !== void 0) T.fullFileDiff = void 0, R = !0;
  return R;
}
function QA0(T) {
  let R = !1;
  if (T.diff !== TA) T.diff = TA, R = !0;
  if (T.fullFileDiff !== void 0 && T.fullFileDiff !== TA) T.fullFileDiff = TA, R = !0;
  return R;
}
function sy(T) {
  let R = Buffer.from(JSON.stringify(T), "utf8").toString("base64"),
    a = new TextEncoder().encode(JSON.stringify({
      type: "executor_artifact_upsert",
      artifact: {
        key: Z3T,
        dataType: "application/json",
        contentBase64: R
      }
    })).length;
  return {
    contentBase64: R,
    messageSizeBytes: a
  };
}
function ZA0(T, R) {
  let a = {
      ...T,
      aheadCommits: [...T.aheadCommits],
      files: T.files.map(h => ({
        ...h
      }))
    },
    e = sy(a);
  if (e.messageSizeBytes <= R) return e.contentBase64;
  let t = a.files.map((h, i) => ({
    index: i,
    weight: VA0(h)
  })).filter(h => h.weight > 0).sort((h, i) => i.weight - h.weight);
  for (let {
    index: h
  } of t) {
    let i = a.files[h];
    if (!i || !XA0(i)) continue;
    if (e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  for (let {
    index: h
  } of t) {
    let i = a.files[h];
    if (!i || !YA0(i)) continue;
    if (e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  let r = a.files.map((h, i) => ({
    index: i,
    weight: h.diff.length + (h.fullFileDiff?.length ?? 0)
  })).filter(h => h.weight > 0).sort((h, i) => i.weight - h.weight);
  for (let {
    index: h
  } of r) {
    let i = a.files[h];
    if (!i || !QA0(i)) continue;
    if (e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  if (a.aheadCommits.length > 0) {
    if (a.aheadCommits = [], e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  while (a.files.length > 0) if (a.files.pop(), e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  return e.contentBase64;
}
function jw(T) {
  return T.replace(/\n+$/, "");
}
function tp0(T = eVT.env, R = {}) {
  let {
      isolateGitConfig: a = !0
    } = R,
    e = {
      ...T
    };
  if (a) {
    for (let t of Object.keys(e)) if (Tp0.includes(t) || t.startsWith("GIT_CONFIG_KEY_") || t.startsWith("GIT_CONFIG_VALUE_")) delete e[t];
    e.GIT_CONFIG_NOSYSTEM = "1", e.GIT_CONFIG_SYSTEM = RY, e.GIT_CONFIG_GLOBAL = RY;
  }
  return e;
}
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
function rp0(T) {
  return T instanceof Error;
}
async function qP(T, R, a = {}) {
  try {
    let {
      stdout: e
    } = await JA0("git", R, {
      cwd: T,
      env: tp0(),
      maxBuffer: a.maxBufferBytes ?? Qx
    });
    return e;
  } catch (e) {
    if (a?.allowExitCodeOne && rp0(e) && (e.code === 1 || e.code === "1") && typeof e.stdout === "string") return e.stdout;
    throw e;
  }
}
async function Qo(T, R) {
  try {
    return await qP(T, R);
  } catch {
    return null;
  }
}
function hp0(T) {
  if (T === "??") return "untracked";
  let R = T[0] ?? " ",
    a = T[1] ?? " ";
  if (R === "U" || a === "U" || T === "AA" || T === "DD") return "unmerged";
  if (R === "R" || a === "R") return "renamed";
  if (R === "C" || a === "C") return "copied";
  if (R === "A" || a === "A") return "added";
  if (R === "D" || a === "D") return "deleted";
  if (R === "T" || a === "T") return "type_changed";
  return "modified";
}
function tVT(T) {
  let R = [],
    a = T.split("\x00");
  for (let e = 0; e < a.length; e++) {
    let t = a[e];
    if (!t || t.length < 4) continue;
    let r = t.slice(0, 2),
      h = t.slice(3);
    if (!h) continue;
    let i = hp0(r);
    if (i === "renamed" || i === "copied") {
      let c = a[e + 1];
      if (c) {
        R.push({
          path: h,
          previousPath: c,
          changeType: i
        }), e += 1;
        continue;
      }
    }
    R.push({
      path: h,
      changeType: i
    });
  }
  return R.sort((e, t) => e.path.localeCompare(t.path));
}
function ip0(T) {
  let R = 0,
    a = 0,
    e = 0,
    t = 0,
    r = 0,
    h = () => {
      if (t === 0 && r === 0) return;
      e += Math.min(t, r), t = 0, r = 0;
    };
  for (let i of T.split(`
`)) {
    if (i.startsWith("+") && !i.startsWith("+++")) {
      R += 1, t += 1;
      continue;
    }
    if (i.startsWith("-") && !i.startsWith("---")) {
      a += 1, r += 1;
      continue;
    }
    h();
  }
  return h(), {
    added: R,
    deleted: a,
    changed: e
  };
}
async function UkT(T, R, a, e, t = Qx) {
  let r = e !== void 0 ? [`--unified=${e}`] : [];
  if (a) return qP(T, [...SM, ...r, "HEAD", "--", R], {
    maxBufferBytes: t
  });
  let [h, i] = await Promise.all([qP(T, [...SM, ...r, "--cached", "--", R], {
    maxBufferBytes: t
  }).catch(() => ""), qP(T, [...SM, ...r, "--", R], {
    maxBufferBytes: t
  }).catch(() => "")]);
  return [jw(h), jw(i)].filter(Boolean).join(`
`);
}
async function cp0(T, R, a = Qx) {
  return qP(T, [...SM, "--no-index", "--", RY, R], {
    allowExitCodeOne: !0,
    maxBufferBytes: a
  });
}
async function sp0(T, R, a, e = Qx) {
  let t = a ?? "HEAD";
  try {
    return await qP(T, ["show", `${t}:${R}`], {
      maxBufferBytes: e
    });
  } catch {
    return;
  }
}
async function op0(T, R, a = Qx) {
  try {
    let e = zA0(T, R);
    if ((await WA0(e)).size > a) return;
    return await HA0(e, "utf-8");
  } catch {
    return;
  }
}
function HkT(T) {
  let R = Number.parseInt(T.trim(), 10);
  if (!Number.isFinite(R)) return null;
  return R;
}
async function np0(T) {
  let R = (await Qo(T, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]))?.trim();
  if (!R?.startsWith(BkT)) return null;
  let a = R.slice(BkT.length);
  if (!a) return null;
  let e = `origin/${a}`,
    t = (await Qo(T, ["rev-parse", "--verify", "--quiet", `${e}^{commit}`]))?.trim();
  if (!t) return null;
  return {
    baseRef: a,
    comparisonRef: e,
    baseRefHead: t
  };
}
function lp0(T) {
  let R = T.split("\x00"),
    a = [];
  for (let e = 0; e + 1 < R.length; e += 2) {
    let t = R[e],
      r = R[e + 1] ?? "";
    if (!t) continue;
    a.push({
      hash: t,
      shortHash: t.slice(0, 12),
      subject: r
    });
  }
  return a;
}
async function Ap0(T, R) {
  let a = await Qo(T, ["log", "-z", `--max-count=${ap0}`, "--format=%H%x00%s", `${R}..HEAD`]);
  if (!a) return [];
  return lp0(a);
}
async function pp0(T, R) {
  if (!R) return null;
  let a = await np0(T);
  if (!a) return null;
  let e = await Qo(T, ["rev-list", "--count", `${a.comparisonRef}..HEAD`]);
  if (!e) return null;
  let t = await Qo(T, ["rev-list", "--count", `HEAD..${a.comparisonRef}`]);
  if (!t) return null;
  let r = HkT(e);
  if (r === null) return null;
  let h = HkT(t);
  if (h === null) return null;
  return {
    baseRef: a.baseRef,
    comparisonRef: a.comparisonRef,
    baseRefHead: a.baseRefHead,
    aheadCount: r,
    behindCount: h
  };
}
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
function hVT(T) {
  let R = ZA0(_p0(T), KA0);
  return {
    key: Z3T,
    dataType: "application/json",
    contentBase64: R
  };
}
function bp0(T, R, a, e = iVT) {
  return yH(T, e, t => ({
    type: "executor_guidance_snapshot",
    snapshotId: R,
    files: t,
    isLast: !1,
    userConfigDir: a
  }));
}
function cVT(T, R, a = iVT) {
  return yH(T, a, e => ({
    type: "executor_guidance_discovery",
    toolCallId: R,
    files: e,
    isLast: !1
  }));
}
function sVT(T, R) {
  if (T >= R.maxAttempts) return null;
  let a = Math.max(1, T);
  return Math.min(R.baseDelayMs * 2 ** (a - 1), R.maxDelayMs);
}
function mp0(T) {
  return typeof T === "object" && T !== null && "output" in T && T.output === "";
}
function up0() {
  let T = () => {
      return;
    },
    R = () => {
      return;
    };
  return {
    promise: new Promise((a, e) => {
      T = a, R = e;
    }),
    resolve: T,
    reject: R
  };
}
function yp0(T) {
  if (T === "darwin") return "darwin";
  if (T === "win32") return "windows";
  return "linux";
}
async function Pp0(T) {
  let R = await T.getLatest();
  return hCT(R.settings);
}
function oVT(T) {
  let R = T.previouslyAdvertisedTools ?? [],
    {
      toolsToRegister: a,
      toolNamesToUnregister: e
    } = wA0(R, T.nextTools),
    t = T.forceRegisterAll ? [...T.nextTools] : a;
  for (let r of BA0(t)) T.logMessage?.("SEND", {
    type: "executor_tools_register",
    tools: r.map(h => h.name)
  }), T.transport.registerTools(r);
  for (let r of NA0(e)) T.logMessage?.("SEND", {
    type: "executor_tools_unregister",
    toolNames: r
  }), T.transport.unregisterTools(r);
  return [...T.nextTools];
}
async function kp0(T) {
  let {
      transport: R,
      threadId: a,
      configService: e,
      skillService: t,
      logMessage: r
    } = T,
    h = T.fileSystem ?? He,
    i = {
      settings: await Pp0(e),
      workspaceId: T.workspaceRoot,
      workingDirectory: T.workspaceRoot,
      environment: {
        os: yp0("darwin")
      },
      tags: []
    };
  r?.("SEND", {
    type: "executor_connect",
    clientId: T.executorClientID,
    capabilities: i,
    executorType: T.executorType
  });
  let c = await R.executorHandshake(T.executorClientID, i, {
    executorType: T.executorType
  });
  r?.("RECV", c);
  try {
    let s = await CA0(a);
    r?.("SEND", {
      type: "executor_environment_snapshot",
      environment: s
    }), R.sendEnvironmentSnapshot(s);
    let A = {
      trees: s.workspaceRoot ? [{
        uri: s.workspaceRoot
      }] : [],
      platform: s.platform,
      tags: s.tags
    };
    await fp0(R, h, e, A, r), await Ip0(R, t, r), await T.initialToolDiscovery;
    let l = await m0(T.toolService.tools),
      o = RtT(l),
      n = oVT({
        transport: R,
        nextTools: o,
        previouslyAdvertisedTools: T.previouslyAdvertisedTools,
        forceRegisterAll: !0,
        logMessage: r
      });
    if (T.sendGitSnapshot !== !1) try {
      let p = await rVT(T.workspaceRoot);
      r?.("SEND", {
        type: "executor_artifact_upsert",
        available: p.available,
        fileCount: p.files.length,
        branch: p.branch,
        head: p.head
      }), R.sendExecutorArtifactUpsert(hVT(p));
    } catch {}
    return r?.("SEND", {
      type: "executor_tools_bootstrap_complete",
      ok: !0
    }), R.sendExecutorToolsBootstrapComplete(!0), {
      advertisedTools: n
    };
  } catch (s) {
    let A = s instanceof Error ? s.message : String(s);
    throw r?.("SEND", {
      type: "executor_tools_bootstrap_complete",
      ok: !1,
      error: A
    }), R.sendExecutorToolsBootstrapComplete(!1, A), s;
  }
}
function xp0(T, R, a) {
  let e = hCT(R.settings),
    t = JSON.stringify(e);
  if (t === a) return a;
  let r = T.getConnectionInfo();
  if (r.state !== "connected" || r.role !== "executor") return a;
  try {
    return T.sendExecutorSettingsUpdate(e), t;
  } catch {
    return a;
  }
}
async function fp0(T, R, a, e, t) {
  let r = (await _O({
      filesystem: R,
      configService: a,
      threadService: {
        observe: () => AR.of({
          id: Eh(),
          created: Date.now(),
          v: 0,
          messages: [],
          env: {
            initial: e
          }
        })
      }
    }, {
      messages: [],
      env: {
        initial: e
      }
    })).map(s => ({
      uri: s.uri,
      content: s.content,
      lineCount: s.content.split(`
`).length
    })),
    h = crypto.randomUUID(),
    i = a.userConfigDir ? d0(a.userConfigDir) : void 0;
  if (r.length === 0) {
    t?.("SEND", {
      type: "executor_guidance_snapshot",
      snapshotId: h,
      fileCount: 0,
      isLast: !0
    }), T.sendExecutorGuidanceSnapshot({
      snapshotId: h,
      files: [],
      isLast: !0,
      userConfigDir: i
    });
    return;
  }
  let c = bp0(r, h, i);
  for (let s = 0; s < c.length; s++) {
    let A = c[s];
    if (!A) continue;
    let l = s === c.length - 1;
    t?.("SEND", {
      type: "executor_guidance_snapshot",
      snapshotId: h,
      fileCount: A.length,
      isLast: l
    }), T.sendExecutorGuidanceSnapshot({
      snapshotId: h,
      files: A,
      isLast: l,
      userConfigDir: i
    });
  }
}
async function Ip0(T, R, a) {
  let e = await R.getSkills(),
    t = crypto.randomUUID(),
    r = 20,
    h = e.map(i => ({
      name: i.name,
      description: i.description,
      baseDir: i.baseDir,
      frontmatter: i.frontmatter,
      files: i.files
    }));
  if (h.length === 0) {
    a?.("SEND", {
      type: "executor_skill_snapshot",
      snapshotId: t,
      skillCount: 0,
      isLast: !0
    }), T.sendExecutorSkillSnapshot({
      snapshotId: t,
      skills: [],
      isLast: !0
    });
    return;
  }
  for (let i = 0; i < h.length; i += 20) {
    let c = h.slice(i, i + 20),
      s = i + 20 >= h.length;
    a?.("SEND", {
      type: "executor_skill_snapshot",
      snapshotId: t,
      skillCount: c.length,
      isLast: s
    }), T.sendExecutorSkillSnapshot({
      snapshotId: t,
      skills: c,
      isLast: s
    });
  }
}
class nVT {
  options;
  inFlight = null;
  readyWaiter = null;
  retryTimer = null;
  attempt = 0;
  generation = 0;
  lastInfo = null;
  disposed = !1;
  baseDelayMs;
  maxDelayMs;
  maxAttempts;
  constructor(T) {
    this.options = T, this.baseDelayMs = T.baseDelayMs ?? OM.baseDelayMs, this.maxDelayMs = T.maxDelayMs ?? OM.maxDelayMs, this.maxAttempts = T.maxAttempts ?? OM.maxAttempts;
  }
  ensureHandshake(T) {
    return this.tryHandshake(T);
  }
  ensureReady(T) {
    if (this.disposed) return Promise.reject(Error("Executor handshake manager is disposed"));
    if (this.isReady()) return Promise.resolve();
    if (!this.readyWaiter) this.readyWaiter = up0();
    this.tryHandshake("connect");
    let R = this.readyWaiter.promise;
    if (!T?.timeoutMs) return R;
    let a = T.timeoutMessage ?? `Timed out waiting for handshake after ${T.timeoutMs}ms`;
    return this.withTimeout(R, T.timeoutMs, a);
  }
  handleConnectionChange(T) {
    if (this.lastInfo = T, T.state !== "connected") {
      this.reset("disconnected");
      return;
    }
    if (T.role === "executor") {
      this.reset("executor"), this.resolveReadyWaiter();
      return;
    }
    this.tryHandshake("connect");
  }
  dispose() {
    this.disposed = !0, this.generation++, this.clearRetryTimer(), this.rejectReadyWaiter(Error("Executor handshake manager is disposed"));
  }
  isReady() {
    return this.lastInfo?.state === "connected" && this.lastInfo.role === "executor";
  }
  resolveReadyWaiter() {
    let T = this.readyWaiter;
    if (!T) return;
    this.readyWaiter = null, T.resolve();
  }
  rejectReadyWaiter(T) {
    let R = this.readyWaiter;
    if (!R) return;
    this.readyWaiter = null, R.reject(T);
  }
  reset(T) {
    this.generation++, this.attempt = 0, this.clearRetryTimer();
  }
  clearRetryTimer() {
    if (!this.retryTimer) return;
    clearTimeout(this.retryTimer), this.retryTimer = null;
  }
  async withTimeout(T, R, a) {
    let e = null;
    try {
      return await Promise.race([T, new Promise((t, r) => {
        e = setTimeout(() => {
          r(Error(a));
        }, R);
      })]);
    } finally {
      if (e) clearTimeout(e);
    }
  }
  tryHandshake(T) {
    if (this.disposed || this.inFlight) return this.inFlight;
    let R = this.generation,
      a = this.options.handshake(T);
    return this.inFlight = a, a.then(() => {
      if (this.disposed || R !== this.generation) return;
      this.attempt = 0, this.clearRetryTimer(), this.resolveReadyWaiter();
    }).catch(e => {
      if (this.disposed || R !== this.generation) return;
      this.scheduleRetry(T, e);
    }).finally(() => {
      if (this.inFlight === a) this.inFlight = null;
    }), a;
  }
  scheduleRetry(T, R) {
    if (this.disposed) return;
    if (!this.lastInfo || this.lastInfo.state !== "connected" || this.lastInfo.role === "executor") return;
    this.attempt += 1;
    let a = sVT(this.attempt, {
      baseDelayMs: this.baseDelayMs,
      maxDelayMs: this.maxDelayMs,
      maxAttempts: this.maxAttempts
    });
    if (a === null) {
      this.clearRetryTimer(), this.options.onExhausted?.({
        attempt: this.attempt,
        maxAttempts: this.maxAttempts,
        error: R
      }), this.rejectReadyWaiter(R instanceof Error ? R : Error("Executor handshake failed and exhausted retries"));
      return;
    }
    this.clearRetryTimer(), this.options.onError?.({
      trigger: T,
      attempt: this.attempt,
      delayMs: a,
      error: R
    }), this.retryTimer = setTimeout(() => {
      if (this.retryTimer = null, !this.lastInfo || this.lastInfo.state !== "connected" || this.lastInfo.role === "executor") return;
      this.tryHandshake("retry");
    }, a);
  }
}
class lVT {
  options;
  clientID;
  transport;
  sentApprovalRequests = new Set();
  discoveredGuidanceFileURIs = new Set();
  activeTools = new Map();
  pendingTerminalResults = new Map();
  gitStatusQueue = {
    inFlight: !1,
    queued: !1,
    queuedToolCallId: void 0
  };
  disposing = !1;
  constructor(T) {
    this.options = T, this.clientID = T.clientID, this.transport = T.transport;
  }
  async handleToolLease(T) {
    if (this.disposing) return;
    let {
      toolCallId: R,
      toolName: a
    } = T;
    if (this.activeTools.has(R)) {
      this.options.log.info(`${this.clientID} ignoring duplicate active lease`, {
        toolCallId: R,
        toolName: a
      });
      return;
    }
    let e = this.pendingTerminalResults.get(R);
    if (e) {
      this.options.log.info(`${this.clientID} replaying pending terminal result for duplicate lease`, {
        toolCallId: R,
        toolName: a
      }), this.sendTerminalResult(R, e, "flush");
      return;
    }
    let t = Date.now();
    this.options.log.info(`${this.clientID} executing tool: ${a}`, {
      toolCallId: R
    }), this.options.log.wsMessage("SEND", this.clientID, {
      type: "executor_tool_lease_ack",
      toolCallId: R
    }), this.transport.ackToolLease(R);
    let r = new AbortController(),
      h = {
        subscription: {
          unsubscribe: () => {}
        },
        abortController: r
      };
    this.activeTools.set(R, h);
    let i = () => {
      this.activeTools.delete(R);
    };
    try {
      let c = await this.options.invokeTool(T);
      this.options.log.info(`${this.clientID} tool service returned observable`, {
        toolCallId: R,
        toolName: a,
        elapsedMs: Date.now() - t
      });
      let s = c.subscribe({
        next: A => {
          if (r.signal.aborted) return;
          let l = A.status === "in-progress" ? A.progress ?? A.result : void 0;
          if (l !== void 0 && !mp0(l)) this.options.log.wsMessage("SEND", this.clientID, {
            type: "tool_progress",
            toolCallId: R,
            progress: l
          }), this.sendTransportMessage("tool_progress", () => this.transport.sendToolProgress(R, l), {
            toolCallId: R
          });
          if (wt(A.status)) this.sendToolResult(R, A), i(), s.unsubscribe();
          if (A.status === "blocked-on-user") this.options.log.info(`${this.clientID} awaiting tool approval`, {
            toolCallId: R,
            toolName: a
          });
        },
        error: A => {
          if (r.signal.aborted) {
            i();
            return;
          }
          this.options.log.error(`${this.clientID} tool execution failed: ${a}`, A);
          let l = {
            status: "error",
            error: {
              message: A instanceof Error ? A.message : "Unknown error"
            }
          };
          this.sendToolResult(R, l), i();
        }
      });
      h.subscription = s;
    } catch (c) {
      this.options.log.error(`${this.clientID} tool execution setup failed: ${a}`, c);
      let s = {
        status: "error",
        error: {
          message: c instanceof Error ? c.message : String(c)
        }
      };
      this.sendToolResult(R, s), i();
    }
  }
  flushBufferedTerminalResults() {
    if (this.disposing || this.pendingTerminalResults.size === 0) return;
    for (let [T, R] of this.pendingTerminalResults) this.sendTerminalResult(T, R, "flush");
  }
  handleToolRevocation(T) {
    if (this.disposing) return;
    let {
      toolCallId: R,
      reason: a
    } = T;
    this.options.log.info(`${this.clientID} lease revoked: ${R}`, {
      reason: a
    });
    let e = this.activeTools.get(R);
    if (e) e.abortController.abort(), e.subscription.unsubscribe(), this.activeTools.delete(R);
    this.sentApprovalRequests.delete(R);
  }
  async handleRollbackRequest(T, R, a) {
    if (this.disposing) return;
    try {
      if (R.length > 0) await a(new Set(R));
      this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_rollback_ack",
        editId: T,
        ok: !0
      }), this.sendTransportMessage("executor_rollback_ack", () => this.transport.sendExecutorRollbackAck(T, !0), {
        editId: T
      }), this.queueGitStatusSnapshot();
    } catch (e) {
      let t = e instanceof Error ? e.message : String(e);
      this.options.log.error(`${this.clientID} rollback failed`, e), this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_rollback_ack",
        editId: T,
        ok: !1,
        error: t
      }), this.sendTransportMessage("executor_rollback_ack", () => this.transport.sendExecutorRollbackAck(T, !1, t), {
        editId: T
      });
    }
  }
  triggerGitStatus(T) {
    this.queueGitStatusSnapshot(T);
  }
  dispose() {
    this.disposing = !0;
    for (let [, T] of this.activeTools) T.abortController.abort(), T.subscription.unsubscribe();
    this.activeTools.clear(), this.pendingTerminalResults.clear();
  }
  sendToolResult(T, R) {
    let a = Date.now(),
      e = this.toToolRun(R),
      {
        run: t,
        files: r
      } = this.extractGuidanceFromRun(e);
    if (r.length > 0) this.sendGuidanceDiscovery(T, r);
    this.sendTerminalResult(T, t, "live", {
      guidanceFileCount: r.length,
      elapsedMs: Date.now() - a
    }), this.sentApprovalRequests.delete(T), this.queueGitStatusSnapshot(T);
  }
  sendTerminalResult(T, R, a, e) {
    this.options.log.wsMessage("SEND", this.clientID, {
      type: "executor_tool_result",
      toolCallId: T,
      run: R
    });
    let t = this.sendTransportMessage("executor_tool_result", () => this.transport.sendExecutorToolResult(T, R), {
      toolCallId: T,
      source: a
    });
    if (t) this.pendingTerminalResults.delete(T);else this.pendingTerminalResults.set(T, R);
    return this.options.log.info(`${this.clientID} executor_tool_result send attempted`, {
      toolCallId: T,
      status: R.status,
      sent: t,
      source: a,
      ...e
    }), t;
  }
  sendGuidanceDiscovery(T, R) {
    let a = this.options.batchGuidanceFiles(R, T);
    for (let e = 0; e < a.length; e++) {
      let t = a[e];
      if (!t) continue;
      let r = e === a.length - 1;
      if (this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_guidance_discovery",
        toolCallId: T,
        fileCount: t.length,
        isLast: r
      }), !this.sendTransportMessage("executor_guidance_discovery", () => this.transport.sendExecutorGuidanceDiscovery({
        toolCallId: T,
        files: t,
        isLast: r
      }), {
        toolCallId: T,
        isLast: r,
        fileCount: t.length
      })) return;
    }
  }
  queueGitStatusSnapshot(T) {
    if (this.disposing || !this.options.captureGitStatus) return;
    if (this.gitStatusQueue.inFlight) {
      if (this.gitStatusQueue.queued = !0, T) this.gitStatusQueue.queuedToolCallId = T;
      return;
    }
    this.gitStatusQueue.inFlight = !0, this.sendGitStatusSnapshot(T).finally(() => {
      if (this.gitStatusQueue.inFlight = !1, !this.gitStatusQueue.queued) return;
      let R = this.gitStatusQueue.queuedToolCallId;
      this.gitStatusQueue.queued = !1, this.gitStatusQueue.queuedToolCallId = void 0, this.queueGitStatusSnapshot(R);
    });
  }
  async sendGitStatusSnapshot(T) {
    try {
      if (!this.options.captureGitStatus) return;
      let R = await this.options.captureGitStatus();
      this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_artifact_upsert",
        available: R.available,
        fileCount: R.files.length,
        toolCallId: T,
        branch: R.branch,
        head: R.head
      }), this.transport.sendExecutorArtifactUpsert(hVT(R), T);
    } catch (R) {
      this.options.log.error("Failed to send git status snapshot", R);
    }
  }
  toToolRun(T) {
    switch (T.status) {
      case "done":
        return {
          status: "done",
          result: T.result,
          progress: T.progress,
          trackFiles: T.trackFiles ? [...T.trackFiles] : void 0
        };
      case "error":
        return {
          status: "error",
          error: {
            message: T.error ? this.options.renderToolRunError(T.error) : "Tool execution failed"
          }
        };
      case "rejected-by-user":
        return {
          status: "rejected-by-user",
          reason: T.reason
        };
      case "cancelled":
        return {
          status: "cancelled",
          reason: T.reason
        };
      default:
        return {
          status: "error",
          error: {
            message: `Unexpected status: ${T.status}`
          }
        };
    }
  }
  extractGuidanceFromRun(T) {
    if (T.status !== "done") return {
      run: T,
      files: []
    };
    if (!T.result || typeof T.result !== "object" || Array.isArray(T.result)) return {
      run: T,
      files: []
    };
    let R = T.result;
    if (!("discoveredGuidanceFiles" in R)) return {
      run: T,
      files: []
    };
    let a = xn0(R.discoveredGuidanceFiles),
      {
        discoveredGuidanceFiles: e,
        ...t
      } = R;
    return {
      run: {
        ...T,
        result: t
      },
      files: a
    };
  }
  sendTransportMessage(T, R, a) {
    try {
      return R(), !0;
    } catch (e) {
      if (e instanceof z8) return this.options.log.info(`${this.clientID} dropped ${T} while reconnecting`, {
        messageType: T,
        ...a
      }), this.options.onTransportSendFailure?.(this.clientID, T, e, a), !1;
      return this.options.log.error(`${this.clientID} failed to send ${T}`, e), !1;
    }
  }
}
class PH {
  options;
  toolRunner;
  sentApprovalRequests;
  discoveredGuidanceFileURIs;
  handshakeManager;
  runtimeLog;
  advertisedExecutorTools = [];
  lastSentSettingsJSON = "";
  settingsSubscription = null;
  executorCallbacksAttached = !1;
  constructor(T) {
    this.options = T, this.runtimeLog = this.options.log ?? {
      info: (a, e) => J.info(`[executor-client] ${a}`, e),
      error: (a, e) => J.error(`[executor-client] ${a}`, {
        error: e
      }),
      wsMessage: (a, e, t) => {
        J.info("[executor-client] websocket message", {
          direction: a,
          clientID: e,
          ...(typeof t === "object" && t !== null ? t : {
            message: t
          })
        });
      }
    };
    let R = async () => {
      J.info("[executor-client] executor handshake requested", {
        clientID: this.options.clientID
      });
    };
    this.handshakeManager = new nVT({
      handshake: this.options.handshake ?? R,
      ...this.options.handshakeManagerOptions
    }), this.toolRunner = new lVT({
      clientID: this.options.clientID,
      transport: this.options.transport,
      log: this.runtimeLog,
      invokeTool: a => this.invokeTool(a),
      captureGitStatus: this.options.captureGitStatus,
      batchGuidanceFiles: this.options.batchGuidanceFiles ?? (a => [a]),
      renderToolRunError: this.options.renderToolRunError ?? (a => a?.message ?? "Tool run failed"),
      onTransportSendFailure: this.options.onTransportSendFailure
    }), this.sentApprovalRequests = this.toolRunner.sentApprovalRequests, this.discoveredGuidanceFileURIs = this.toolRunner.discoveredGuidanceFileURIs;
  }
  async connect(T) {
    if (!this.executorCallbacksAttached) this.attachTransportExecutorCallbacks({
      includeConnectionChanges: !0
    }), this.handleConnectionChange(this.options.transport.getConnectionInfo());
    await this.bootstrapExecutor({
      executorType: T,
      trigger: "connect"
    });
  }
  ensureHandshake(T) {
    return this.handshakeManager.ensureHandshake(T);
  }
  ensureReady(T) {
    return this.handshakeManager.ensureReady(T);
  }
  async bootstrapExecutor(T) {
    await this.connectAsExecutor(T.executorType, T.workspaceRoot ?? this.options.workspaceRoot ?? "", T.threadID ?? this.options.threadID, T.trigger, T.suppressConnectLog);
  }
  syncExecutorToolRegistrations(T, R) {
    let a = this.options.transport.getConnectionInfo();
    if (a.state !== "connected" || a.role !== "executor") return;
    this.advertisedExecutorTools = oVT({
      transport: this.options.transport,
      nextTools: T,
      previouslyAdvertisedTools: this.advertisedExecutorTools,
      logMessage: R?.logMessage
    });
  }
  handleConnectionChange(T) {
    this.handshakeManager.handleConnectionChange(T);
  }
  onToolLeaseMessage(T) {
    this.handleToolLease(T);
  }
  onToolLeaseRevokedMessage(T) {
    this.handleToolLeaseRevoked(T);
  }
  onExecutorRollbackRequestMessage(T) {
    this.handleExecutorRollbackRequest(T);
  }
  onExecutorFileSystemReadDirectoryRequestMessage(T) {
    this.handleExecutorFileSystemReadDirectoryRequest(T);
  }
  onExecutorFileSystemReadFileRequestMessage(T) {
    this.handleExecutorFileSystemReadFileRequest(T);
  }
  attachTransportExecutorCallbacks(T) {
    if (!this.options.transport.setExecutorCallbacks) {
      this.executorCallbacksAttached = !0;
      return;
    }
    let R = T?.includeConnectionChanges ?? !1,
      a = this.getInboundExecutorHandlers(),
      e = {
        onToolLease: a.onToolLease,
        onToolLeaseRevoked: a.onToolLeaseRevoked,
        onFileSystemReadFileRequest: a.onFileSystemReadFileRequest
      };
    if (R) e.onConnectionChange = t => {
      this.handleConnectionChange(t);
    };
    if (a.onExecutorRollbackRequest) e.onExecutorRollbackRequest = a.onExecutorRollbackRequest;
    if (a.onFileSystemReadDirectoryRequest) e.onFileSystemReadDirectoryRequest = a.onFileSystemReadDirectoryRequest;
    this.options.transport.setExecutorCallbacks(e), this.executorCallbacksAttached = !0;
  }
  clearTransportExecutorCallbacks() {
    if (!this.executorCallbacksAttached) return;
    this.options.transport.setExecutorCallbacks?.(null), this.executorCallbacksAttached = !1;
  }
  dispose() {
    this.clearTransportExecutorCallbacks(), this.toolRunner.dispose(), this.handshakeManager.dispose(), this.settingsSubscription?.unsubscribe(), this.settingsSubscription = null;
  }
  async invokeTool(T) {
    if (this.options.invokeTool) return await this.options.invokeTool(T);
    if (!this.options.getEnvironment) throw Error("Executor runtime requires getEnvironment or invokeTool");
    let {
        toolCallId: R,
        toolName: a,
        args: e
      } = T,
      t = typeof e === "object" && e !== null ? e : {},
      r = await this.options.getEnvironment();
    return r.thread = {
      ...r.thread,
      id: this.options.threadID
    }, r.toolUseID = R, this.options.toolService.invokeTool(a, {
      args: t
    }, r);
  }
  async connectAsExecutor(T, R, a, e, t = !1) {
    if (this.settingsSubscription?.unsubscribe(), this.settingsSubscription = null, !t) J.info(`Connecting ${this.options.clientID} as executor...`);
    try {
      let {
        advertisedTools: r
      } = await kp0({
        transport: this.options.transport,
        executorClientID: this.options.executorClientID ?? this.options.clientID,
        workspaceRoot: R,
        threadId: a,
        configService: this.options.configService,
        toolService: this.options.toolService,
        skillService: this.options.skillService,
        fileSystem: this.options.fileSystem,
        logMessage: this.options.bootstrapLogMessage,
        executorType: T,
        initialToolDiscovery: this.options.initialToolDiscovery,
        sendGitSnapshot: this.options.sendGitSnapshot ?? !1,
        previouslyAdvertisedTools: this.advertisedExecutorTools
      });
      if (this.advertisedExecutorTools = r, this.toolRunner.flushBufferedTerminalResults(), this.options.onBootstrapSuccess) await this.options.onBootstrapSuccess(e);
      this.startSettingsSync();
    } catch (r) {
      throw J.error(`executor ${this.options.clientID} bootstrap failed`, r), r;
    }
  }
  startSettingsSync() {
    if (this.settingsSubscription) return;
    this.settingsSubscription = this.options.configService.config.subscribe({
      next: T => {
        this.lastSentSettingsJSON = xp0(this.options.transport, T, this.lastSentSettingsJSON);
      }
    });
  }
  getInboundExecutorHandlers() {
    let T = {
      onToolLease: R => {
        this.handleToolLease(R);
      },
      onToolLeaseRevoked: R => {
        this.handleToolLeaseRevoked(R);
      },
      onFileSystemReadFileRequest: R => {
        this.handleExecutorFileSystemReadFileRequest(R);
      }
    };
    if (this.options.handleExecutorRollbackRequest) T.onExecutorRollbackRequest = R => {
      this.handleExecutorRollbackRequest(R);
    };
    if (this.options.handleExecutorFileSystemReadDirectoryRequest || this.options.readFileSystemDirectory) T.onFileSystemReadDirectoryRequest = R => {
      this.handleExecutorFileSystemReadDirectoryRequest(R);
    };
    return T;
  }
  maybeLogInboundExecutorMessage(T) {
    if (!this.options.logInboundExecutorMessages) return;
    this.runtimeLog.wsMessage("RECV", this.options.clientID, T);
  }
  handleToolLease(T) {
    this.maybeLogInboundExecutorMessage(T), this.toolRunner.handleToolLease(T);
  }
  handleToolLeaseRevoked(T) {
    this.maybeLogInboundExecutorMessage(T), this.toolRunner.handleToolRevocation(T);
  }
  handleExecutorRollbackRequest(T) {
    if (this.maybeLogInboundExecutorMessage(T), !this.options.handleExecutorRollbackRequest) return;
    this.options.handleExecutorRollbackRequest(T);
  }
  async handleExecutorFileSystemReadDirectoryRequest(T) {
    if (this.maybeLogInboundExecutorMessage(T), this.options.handleExecutorFileSystemReadDirectoryRequest) {
      await this.options.handleExecutorFileSystemReadDirectoryRequest(T);
      return;
    }
    if (!this.options.readFileSystemDirectory) throw Error("Method not implemented.");
    let R = await this.options.readFileSystemDirectory(T);
    this.options.transport.sendExecutorFileSystemReadDirectoryResult(T.requestId, R);
  }
  handleExecutorFileSystemReadFileRequest(T) {
    if (this.maybeLogInboundExecutorMessage(T), this.options.handleExecutorFileSystemReadFileRequest) {
      this.options.handleExecutorFileSystemReadFileRequest(T);
      return;
    }
    throw Error("Method not implemented.");
  }
}
function AVT(T) {
  return {
    async createHandoffDraft(R) {
      let a = await qkT(T, R.signal);
      return WkT(a, R.parentThread.id, R.goal, R.images);
    },
    createHandoffThread: async R => {
      let a = await qkT(T, R.signal),
        e = await WkT(a, R.parentThread.id, R.goal, R.images),
        t = await jp0(a, R, e);
      if (await vp0(t.http, t.threadID, t.prompt, t.agentMode), R.follow && T.onFollow) try {
        await T.onFollow({
          sourceThreadID: R.parentThread.id,
          targetThreadID: t.threadID
        });
      } catch (r) {
        J.error("Failed to follow handoff thread", {
          error: r,
          sourceThreadID: R.parentThread.id,
          targetThreadID: t.threadID
        });
      }
      return t.threadID;
    }
  };
}
function gp0(T) {
  let R = new Headers({
    "Content-Type": "application/json"
  });
  if (T) R.set("Authorization", `Bearer ${T}`);
  return R;
}
async function atT(T, R, a) {
  return fetch(`${T.workerURL}${R}`, {
    method: "POST",
    headers: gp0(T.apiKey),
    body: JSON.stringify(a),
    signal: T.signal
  });
}
async function WkT(T, R, a, e) {
  let t = await atT(T, `/threads/${R}/handoff`, {
    goal: a,
    images: e
  });
  if (!t.ok) throw Error(`Failed to generate handoff prompt: ${t.status} ${await t.text()}`);
  return await t.json();
}
async function $p0(T, R, a, e) {
  let t = await atT(T, "/threads", {
    ...(R ? {
      repositoryURL: R
    } : {}),
    ...(a ? {
      agentMode: a
    } : {}),
    relationship: e
  });
  if (!t.ok) throw Error(`Failed to create handoff thread: ${t.status} ${await t.text()}`);
  let r = await t.json();
  if (!r.threadId) throw Error("Thread creation response missing threadId");
  return r.threadId;
}
async function vp0(T, R, a, e) {
  let t = await atT(T, `/threads/${R}/message`, {
    content: a,
    ...(e ? {
      agentMode: e
    } : {})
  });
  if (!t.ok) throw Error(`Failed to start handoff thread: ${t.status} ${await t.text()}`);
}
async function qkT(T, R) {
  let a = await T.configService.getLatest(),
    e = T.apiKey ?? (await a.secrets.getToken("apiKey", a.settings.url)),
    t = T.workerURL ?? process.env.AMP_WORKER_URL ?? Pi(a.settings.url);
  return {
    apiKey: e,
    workerURL: t,
    signal: R
  };
}
async function jp0(T, R, a) {
  let e = R.agentMode ?? a.sourceAgentMode ?? R.parentThread.agentMode,
    t = R.relationshipMessageIndex ?? a.parentMessageIndex,
    r = R.relationshipComment ?? R.goal,
    h = {
      threadID: a.parentThreadID,
      type: "handoff",
      ...(t !== void 0 ? {
        messageIndex: t
      } : {}),
      ...(R.relationshipBlockIndex !== void 0 ? {
        blockIndex: R.relationshipBlockIndex
      } : {}),
      comment: r
    },
    i = R.parentThread.env?.initial?.trees?.[0]?.repository?.url,
    c = await $p0(T, i, e ?? void 0, h);
  return {
    http: T,
    threadID: c,
    prompt: a.content,
    agentMode: e ?? void 0
  };
}
function Sw(T) {
  return typeof T === "object" && T !== null;
}
function aY(T) {
  if (!Array.isArray(T)) return;
  return T;
}
function zkT(T) {
  let R = T.trim();
  if (R.length === 0) return;
  try {
    let a = JSON.parse(R);
    return aY(a);
  } catch {
    return;
  }
}
function dM(T) {
  if (typeof T === "string") return T;
  if (!Sw(T)) return;
  if ("output" in T && typeof T.output === "string") return T.output;
  if ("displayMessage" in T && typeof T.displayMessage === "string") return T.displayMessage;
  if ("message" in T && typeof T.message === "string") return T.message;
  if ("reason" in T && typeof T.reason === "string") return T.reason;
  if ("result" in T) {
    let R = dM(T.result);
    if (R !== void 0) return R;
  }
  if ("error" in T) {
    let R = dM(T.error);
    if (R !== void 0) return R;
  }
  if ("value" in T) return dM(T.value);
  return;
}
function Sp0(T) {
  return T.type === "text";
}
function Op0(T) {
  if (T === void 0) return;
  let R;
  try {
    R = mH(T, "snapshot");
  } catch {
    return;
  }
  if (R.type === "snapshot") return dM(R.value);
  let a = (R.blocks ?? []).filter(Sp0).map(e => e.text).join("");
  return a.length > 0 ? a : void 0;
}
function Ep0(T) {
  return typeof T === "string" && dp0.includes(T);
}
function Cp0(T) {
  if (T === void 0) return;
  let R;
  try {
    R = mH(T, "snapshot");
  } catch {
    return;
  }
  if (R.type !== "snapshot") return;
  let a = R.value;
  if (!Sw(a)) return;
  if (!("status" in a) || !Ep0(a.status)) return;
  return a.status;
}
function Lp0(T) {
  let R = aY(T);
  if (R !== void 0) return R;
  if (!Sw(T) || typeof T.type !== "string") return;
  if (T.type === "snapshot") {
    let e = T.value,
      t = aY(e);
    if (t !== void 0) return t;
    if (typeof e === "string") return zkT(e);
    return;
  }
  if (T.type !== "delta" || !Array.isArray(T.blocks)) return;
  let a = T.blocks.map(e => {
    if (!Sw(e) || e.type !== "text" || typeof e.text !== "string") return "";
    return e.text;
  }).join("");
  return zkT(a);
}
function oF(T) {
  let R = z9.safeParse(T.dtwMessageID);
  return R.success ? R.data : Vb();
}
function Mp0(T, R) {
  if (!T.usesDtw) return R ? "legacy-import-to-thread-actors" : "legacy-import-to-dtw";
  if (R && !T.usesThreadActors && T.executorType === "local-client") return "local-client-dtw-to-thread-actors";
  return "none";
}
function etT(T) {
  let R = [],
    a = 0;
  for (let t of T.messages) {
    if (t.role === "user") {
      R.push({
        messageId: oF(t),
        role: "user",
        content: [...t.content],
        meta: t.meta,
        userState: t.userState,
        readAt: t.readAt,
        parentToolUseId: t.parentToolUseId
      });
      continue;
    }
    if (t.role === "assistant") {
      R.push({
        messageId: oF(t),
        role: "assistant",
        content: [...t.content],
        meta: t.meta,
        usage: t.usage,
        readAt: t.readAt,
        cancelled: t.state.type === "cancelled",
        parentToolUseId: t.parentToolUseId
      });
      continue;
    }
    let r = t.content.filter(h => h.type === "manual_bash_invocation");
    if (r.length > 0) R.push({
      messageId: oF(t),
      role: "info",
      content: r,
      parentToolUseId: t.parentToolUseId
    });
    for (let h of t.content) {
      if (h.type !== "summary" || h.summary.type !== "message") continue;
      a += 1, R.push({
        messageId: Vb(),
        role: "assistant",
        content: [{
          type: "text",
          text: h.summary.summary
        }],
        parentToolUseId: t.parentToolUseId
      });
    }
  }
  let e = T.meta?.status !== void 0 || T.meta?.executorType !== void 0 ? {
    ...(T.meta?.status !== void 0 ? {
      status: T.meta.status
    } : {}),
    ...(T.meta?.executorType !== void 0 ? {
      executorType: T.meta.executorType
    } : {})
  } : void 0;
  return {
    id: T.id,
    v: T.v,
    ...(T.title ? {
      title: T.title
    } : {}),
    ...(T.agentMode ? {
      agentMode: T.agentMode
    } : {}),
    ...(e ? {
      meta: e
    } : {}),
    messages: R,
    convertedSummaryMessages: a
  };
}
function Dp0(T, R) {
  let a = R.messages.map((e, t) => {
    if (e.role === "user") return {
      role: "user",
      content: [...e.content],
      meta: e.meta,
      userState: e.userState,
      readAt: e.readAt,
      messageId: t,
      dtwMessageID: e.messageId,
      parentToolUseId: e.parentToolUseId
    };
    if (e.role === "assistant") {
      let r = e.content.some(h => h.type === "tool_use");
      return {
        role: "assistant",
        content: [...e.content],
        meta: e.meta,
        usage: e.usage,
        readAt: e.readAt,
        state: e.cancelled ? {
          type: "cancelled"
        } : {
          type: "complete",
          stopReason: r ? "tool_use" : "end_turn"
        },
        messageId: t,
        dtwMessageID: e.messageId,
        parentToolUseId: e.parentToolUseId
      };
    }
    return {
      role: "info",
      content: [...e.content],
      messageId: t,
      dtwMessageID: e.messageId,
      parentToolUseId: e.parentToolUseId
    };
  });
  return {
    ...T,
    messages: a
  };
}
async function uA(T, R, a, e = {}) {
  let t = {
      ...(T ? {
        threadId: T
      } : {}),
      ...(e.repositoryURL ? {
        repositoryURL: e.repositoryURL
      } : {}),
      ...(!T && e.executorType ? {
        executorType: e.executorType
      } : {}),
      ...(e.agentMode ? {
        agentMode: e.agentMode
      } : {}),
      ...(e.relationship ? {
        relationship: e.relationship
      } : {}),
      ...(e.usesThreadActors ? {
        usesThreadActors: !0
      } : {})
    },
    r = await fi("/api/durable-thread-workers", _VT({
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(t),
      signal: e.signal
    }, a), R);
  if (!r.ok) throw Error(`Failed to create DTW thread: ${r.status} ${await r.text()}`);
  let h = await r.json();
  if (!h.threadId || !h.wsToken) throw Error("DTW thread creation response missing threadId or wsToken");
  if (!h.ownerUserId || typeof h.threadVersion !== "number") throw Error("DTW thread creation response missing ownerUserId or threadVersion");
  return {
    threadId: h.threadId,
    wsToken: h.wsToken,
    usesDtw: h.usesDtw ?? !0,
    usesThreadActors: h.usesThreadActors ?? !1,
    executorType: h.executorType ?? null,
    ownerUserId: h.ownerUserId,
    threadVersion: h.threadVersion,
    ...(h.agentMode ? {
      agentMode: h.agentMode
    } : {})
  };
}
async function pVT(T, R) {
  let a = await T.getLatest(),
    e = R ?? (await a.secrets.getToken("apiKey", a.settings.url));
  if (!e) throw Error("API key required. Please run `amp login` first.");
  return e;
}
async function wp0(T, R, a, e) {
  let t = await pVT(R, a),
    r = e.payload ?? etT(T),
    h = e.workerURL ?? Pi(e.ampURL),
    i = await fetch(`${h}/threads/${T.id}/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        thread: r
      })
    });
  if (i.status === 409) return "already-imported";
  if (!i.ok) throw Error(`Failed to import thread into DTW: ${i.status} ${await i.text()}`);
  if ((await i.json()).ok !== !0) throw Error("Failed to import thread into DTW: import endpoint returned an invalid response");
  return "imported";
}
async function Bp0(T, R, a, e) {
  let t = await pVT(R, a),
    r = e.payload ?? etT(T),
    h = lH(e.ampURL),
    i = await nH({
      endpoint: h
    }).threadActor.getOrCreate([T.id], {
      createWithInput: {
        threadId: T.id,
        ownerUserId: e.ownerUserId,
        threadVersion: e.threadVersion,
        ...(e.agentMode ? {
          agentMode: e.agentMode
        } : {})
      }
    }).fetch("/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        thread: r
      })
    });
  if (i.status === 409) return "already-imported";
  if (!i.ok) throw Error(`Failed to import thread into thread actors: ${i.status} ${await i.text()}`);
  if ((await i.json()).ok !== !0) throw Error("Failed to import thread into thread actors: import endpoint returned an invalid response");
  return "imported";
}
async function Np0(T, R, a, e = {}) {
  let t = e.executorType ?? "local-client",
    r = await fi(`/api/durable-thread-workers/${T}`, _VT({
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        executorType: t,
        ...(e.usesThreadActors ? {
          usesThreadActors: !0
        } : {})
      })
    }, a), R);
  if (!r.ok) throw Error(`Failed to mark thread as imported: ${r.status} ${await r.text()}`);
  let h = await r.json();
  if (h.ok !== !0 || h.usesDtw !== !0 || h.executorType !== t || typeof h.usesThreadActors !== "boolean") throw Error("Failed to mark thread as imported: server returned an invalid response");
  if (e.usesThreadActors && h.usesThreadActors !== !0) throw Error("Failed to mark thread as actor-backed: server returned an invalid response");
}
async function kH(T, R) {
  let a = await R.get(T);
  if (!a) throw Error(`Failed to fetch thread snapshot: thread ${T} not found`);
  return a;
}
function _VT(T, R) {
  if (!R) return T;
  return {
    ...T,
    headers: {
      ...T?.headers,
      Authorization: `Bearer ${R}`
    }
  };
}
function Up0(T) {
  let R = yl0(T.messages),
    a = MKT(R);
  return {
    messages: R,
    processedIds: a
  };
}
function Hp0(T) {
  return MKT(T);
}
function _g(T, R) {
  let a = [...T];
  for (let e of R) if (e.type === "text") {
    let t = a[a.length - 1];
    if (t?.type === "text") a[a.length - 1] = {
      ...t,
      text: t.text + e.text
    };else a.push(e);
  } else if (e.type === "tool_use") {
    let t = a.findIndex(r => r.type === "tool_use" && r.id === e.id);
    if (t >= 0) a[t] = e;else a.push(e);
  } else if (e.type === "thinking") {
    let t = a[a.length - 1];
    if (t?.type === "thinking") a[a.length - 1] = {
      ...t,
      thinking: t.thinking + e.thinking
    };else a.push(e);
  } else a.push(e);
  return a;
}
function Wp0(T, R, a, e) {
  if (!T || R.length === 0) return null;
  return {
    role: "assistant",
    content: R,
    state: {
      type: "streaming"
    },
    messageId: a,
    parentToolUseId: e
  };
}
function qp0(T, R) {
  let a = T.parentToolCallId,
    e = T.role === "assistant" ? T : null,
    {
      completedMessages: t
    } = R;
  if (T.state === "complete" || T.state === "error") {
    if (R.streamingMessageId !== null && T.messageId !== R.streamingMessageId) {
      if (R.streamingBlocks.length > 0) t.push({
        messageId: R.streamingMessageId,
        role: "assistant",
        blocks: R.streamingBlocks,
        parentToolCallId: R.streamingParentToolCallId
      });
      if (R.streamingMessageId = null, R.streamingBlocks = [], R.streamingParentToolCallId = void 0, T.blocks && T.blocks.length > 0) if (T.role === "user") t.push({
        messageId: T.messageId,
        role: "user",
        blocks: T.blocks ?? [],
        parentToolCallId: a
      });else t.push({
        messageId: T.messageId,
        role: "assistant",
        blocks: T.blocks ?? [],
        usage: e?.usage,
        parentToolCallId: a
      });
      return;
    }
    if (R.streamingMessageId === null && T.blocks && T.blocks.length > 0) {
      if (T.role === "user") {
        let h = T.blocks;
        t.push({
          messageId: T.messageId,
          role: "user",
          blocks: h,
          parentToolCallId: a
        });
      } else {
        let h = T.blocks;
        t.push({
          messageId: T.messageId,
          role: "assistant",
          blocks: h,
          usage: e?.usage,
          parentToolCallId: a
        });
      }
      return;
    }
    let r = R.streamingBlocks;
    if (T.messageId === R.streamingMessageId && T.blocks && T.role === "assistant") r = _g(R.streamingBlocks, T.blocks);
    if (R.streamingMessageId && r.length > 0) t.push({
      messageId: R.streamingMessageId,
      role: "assistant",
      blocks: r,
      usage: e?.usage,
      parentToolCallId: R.streamingParentToolCallId
    });
    R.streamingMessageId = null, R.streamingBlocks = [], R.streamingParentToolCallId = void 0;
    return;
  }
  if (T.state === "tool_use") {
    if (T.role !== "assistant") return;
    if (R.streamingMessageId === null || R.streamingMessageId !== T.messageId) R.streamingMessageId = T.messageId, R.streamingBlocks = _g([], T.blocks ?? []), R.streamingParentToolCallId = a;else if (T.blocks) R.streamingBlocks = _g(R.streamingBlocks, T.blocks);
    if (R.streamingBlocks.length > 0) t.push({
      messageId: R.streamingMessageId ?? T.messageId,
      role: "assistant",
      blocks: R.streamingBlocks,
      usage: e?.usage,
      parentToolCallId: R.streamingParentToolCallId
    });
    R.streamingMessageId = null, R.streamingBlocks = [], R.streamingParentToolCallId = void 0;
    return;
  }
  if (T.state === "start" || T.state === "generating") {
    if (T.role !== "assistant") return;
    if (R.streamingMessageId === null || R.streamingMessageId !== T.messageId) R.streamingMessageId = T.messageId, R.streamingBlocks = _g([], T.blocks ?? []), R.streamingParentToolCallId = a;else if (T.blocks) R.streamingBlocks = _g(R.streamingBlocks, T.blocks);
  }
}
function zp0(T, R, a) {
  if (R.length === 0) return T;
  let e = [],
    t = T.length;
  for (let r of R) {
    if (a.has(r.messageId)) continue;
    a.add(r.messageId);
    let h = t++;
    if (r.role === "assistant") e.push({
      role: "assistant",
      content: r.blocks,
      state: {
        type: "complete",
        stopReason: "end_turn"
      },
      usage: r.usage,
      messageId: h,
      dtwMessageID: r.messageId,
      parentToolUseId: r.parentToolCallId
    });else e.push({
      role: "user",
      content: r.blocks,
      messageId: h,
      dtwMessageID: r.messageId,
      parentToolUseId: r.parentToolCallId
    });
  }
  if (e.length === 0) return T;
  return [...T, ...e];
}
function Fp0(T) {
  if (typeof T !== "number" || !Number.isFinite(T)) return 0;
  return Math.max(0, Math.trunc(T));
}
function eY(T) {
  if (!T || T.length === 0) return;
  return T.map(R => ({
    uri: R.uri,
    lineCount: Fp0(R.lineCount),
    ...(typeof R.content === "string" ? {
      content: R.content
    } : {})
  }));
}
function Gp0(T, R, a) {
  let e = T.message.messageId;
  if (a.has(e)) {
    let r = J1(R, e);
    if (r < 0) return R;
    let h = R[r];
    if (!h) return R;
    if (T.message.role !== h.role) return R;
    if (h.role === "user" && T.message.role === "user") {
      let i = {
          ...h,
          content: T.message.content,
          agentMode: T.message.agentMode,
          userState: T.message.userState,
          discoveredGuidanceFiles: eY(T.message.discoveredGuidanceFiles),
          parentToolUseId: T.parentToolUseId
        },
        c = [...R];
      return c[r] = i, c;
    }
    if (h.role === "assistant" && T.message.role === "assistant") {
      let i = {
          ...h,
          content: T.message.content,
          usage: T.message.usage,
          state: {
            type: "complete",
            stopReason: "end_turn"
          },
          parentToolUseId: T.parentToolUseId
        },
        c = [...R];
      return c[r] = i, c;
    }
    if (h.role === "info" && T.message.role === "info") {
      let i = {
          ...h,
          content: T.message.content,
          parentToolUseId: T.parentToolUseId
        },
        c = [...R];
      return c[r] = i, c;
    }
    return R;
  }
  a.add(e);
  let t = R.length;
  if (T.message.role === "assistant") return [...R, {
    role: "assistant",
    content: T.message.content,
    state: {
      type: "complete",
      stopReason: "end_turn"
    },
    usage: T.message.usage,
    messageId: t,
    dtwMessageID: e,
    parentToolUseId: T.parentToolUseId
  }];
  if (T.message.role === "info") return [...R, {
    role: "info",
    content: T.message.content,
    messageId: t,
    dtwMessageID: e,
    parentToolUseId: T.parentToolUseId
  }];
  return [...R, {
    role: "user",
    content: T.message.content,
    agentMode: T.message.agentMode,
    userState: T.message.userState,
    discoveredGuidanceFiles: eY(T.message.discoveredGuidanceFiles),
    messageId: t,
    dtwMessageID: e,
    parentToolUseId: T.parentToolUseId
  }];
}
function Kp0(T, R) {
  let a = J1(R, T.messageId),
    e = J1(R, T.truncateToMessageId);
  if (a < 0 || e < 0) throw Error("Unable to apply edit: message mapping not found");
  let t = R[a];
  if (!t || t.role !== "user") throw Error("Unable to apply edit: target message is not editable");
  let r = {
      role: "user",
      content: T.content,
      agentMode: T.agentMode,
      messageId: t.messageId,
      dtwMessageID: T.messageId
    },
    h = R.slice(0, e + 1);
  return h[a] = r, h;
}
function FkT(T) {
  if (T.type === "message_edited") return T.agentMode;
  if (T.message.role === "user") return T.message.agentMode;
  return;
}
function P$(T) {
  if (!T || T.length === 0) return;
  return T.map(R => ({
    ...R,
    queuedMessage: {
      ...R.queuedMessage,
      content: R.queuedMessage.content.map(a => ({
        ...a
      })),
      discoveredGuidanceFiles: R.queuedMessage.discoveredGuidanceFiles?.map(a => ({
        ...a
      }))
    }
  }));
}
function GkT(T) {
  let R = T.queuedMessage,
    a = R.content.map(e => ({
      ...e
    }));
  return {
    id: R.messageId,
    interrupt: T.interrupt,
    queuedMessage: {
      role: "user",
      content: a,
      userState: R.userState,
      discoveredGuidanceFiles: eY(R.discoveredGuidanceFiles),
      meta: R.createdAt ? {
        sentAt: Date.parse(R.createdAt)
      } : void 0,
      messageId: -1,
      dtwMessageID: R.messageId
    }
  };
}
function Vp0(T) {
  if (T.type === "queued_messages") return {
    type: "queued_messages",
    messages: T.messages.map(R => GkT(R))
  };
  if (T.type === "queued_message_added") return {
    type: "queued_message_added",
    message: GkT(T.message)
  };
  return {
    type: "queued_message_removed",
    queuedMessageId: T.queuedMessageId
  };
}
function Xp0(T, R) {
  let a = Vp0(R);
  return ul0(P$(T) ?? [], a, {
    dedupeAdded: !0,
    getQueuedMessageId: e => e.id
  });
}
async function Yp0(T, R) {
  if (R.usesThreadActors) {
    let a = lH(T.ampURL),
      e = nH({
        endpoint: a
      });
    return {
      baseURL: a,
      threadId: R.threadId,
      wsToken: R.wsToken,
      wsTokenProvider: async () => uA(R.threadId, T.configService, T.apiKey, {
        repositoryURL: T.repositoryURL
      }),
      webSocketProvider: async () => {
        let t = await uA(R.threadId, T.configService, T.apiKey, {
          repositoryURL: T.repositoryURL
        });
        return await e.threadActor.getOrCreate([t.threadId], {
          params: {
            wsToken: t.wsToken
          },
          createWithInput: {
            threadId: t.threadId,
            threadVersion: t.threadVersion,
            ownerUserId: t.ownerUserId,
            agentMode: t.agentMode
          }
        }).webSocket("/");
      },
      WebSocketClass: WebSocket,
      maxReconnectAttempts: Number.POSITIVE_INFINITY,
      pingIntervalMs: 5000,
      useThreadActors: !0
    };
  }
  return {
    baseURL: T.workerUrl ?? Pi(T.ampURL),
    threadId: R.threadId,
    wsToken: R.wsToken,
    wsTokenProvider: async () => uA(R.threadId, T.configService, T.apiKey, {
      repositoryURL: T.repositoryURL
    }),
    WebSocketClass: WebSocket,
    maxReconnectAttempts: Number.POSITIVE_INFINITY,
    pingIntervalMs: 5000
  };
}
function KkT(T) {
  if (!T) return {};
  let R = {
    reconnectCauseType: T.type,
    reconnectCauseAt: new Date(T.at).toISOString()
  };
  if (T.code !== void 0) R.reconnectCauseCode = T.code;
  if (T.reason) R.reconnectCauseReason = T.reason;
  if (T.error) R.reconnectCauseError = T.error;
  return R;
}
class ttT {
  threadSubject;
  agentLoopStateSubject = new f0("idle");
  executorReadySubject = new f0(!1);
  deltaState = {
    streamingMessageId: null,
    streamingBlocks: [],
    completedMessages: []
  };
  toolProgressByToolUseIDSubject = new f0(new Map());
  threadResumeCursor;
  messages;
  queuedMessages;
  relationships;
  threadTitle;
  processedIds;
  agentLoopState = "idle";
  toolProgressByToolUseID = new Map();
  compactionStateSubject = new f0("idle");
  compactionState = "idle";
  lastConnectionState = "disconnected";
  lastConnectionInfo = null;
  connectionMode;
  pendingClientWritesByMessageID = new Map();
  connectedTransportGeneration = 0;
  pendingClientWriteReplayGeneration = null;
  observerCallbacksAttached = !1;
  transport;
  usesThreadActorsBackend;
  threadId;
  constructor(T, R, a, e, t) {
    this.threadId = T.id, this.threadTitle = T.title, this.messages = [...T.messages], this.queuedMessages = P$(T.queuedMessages) ?? [], this.relationships = T.relationships ?? [], this.processedIds = a, this.transport = R, this.usesThreadActorsBackend = t?.usesThreadActors ?? !1, this.threadResumeCursor = dn0(e), this.threadSubject = new f0(T), this.connectionMode = t?.connectionMode ?? "observer", this.subscribeToTransport();
  }
  static async create(T) {
    let R = await uA(T.threadId, T.configService, T.apiKey, {
        repositoryURL: T.repositoryURL,
        executorType: T.executorType,
        usesThreadActors: T.useThreadActors
      }),
      a = R,
      e = await kH(R.threadId, T.threadService),
      t = Mp0(R, T.useThreadActors);
    if (t !== "none") {
      T.onLegacyImportStateChange?.("importing");
      try {
        let A = etT(e),
          l = t === "legacy-import-to-dtw" ? await wp0(e, T.configService, T.apiKey, {
            ampURL: T.ampURL,
            workerURL: T.workerUrl,
            payload: A
          }) : await Bp0(e, T.configService, T.apiKey, {
            ampURL: T.ampURL,
            payload: A,
            ownerUserId: R.ownerUserId,
            threadVersion: R.threadVersion,
            agentMode: R.agentMode
          }),
          o = t !== "legacy-import-to-dtw";
        if (await Np0(R.threadId, T.configService, T.apiKey, {
          executorType: "local-client",
          usesThreadActors: o
        }), a = {
          ...R,
          usesDtw: !0,
          usesThreadActors: o,
          executorType: "local-client"
        }, l === "imported" && t !== "local-client-dtw-to-thread-actors") e = Dp0(e, A);
      } finally {
        T.onLegacyImportStateChange?.("idle");
      }
    }
    let {
        messages: r,
        processedIds: h
      } = Up0(e),
      i = {
        ...e,
        id: R.threadId,
        messages: r,
        queuedMessages: P$(e.queuedMessages),
        relationships: e.relationships ? [...e.relationships] : void 0
      },
      c = new uH(await Yp0(T, a)),
      s = new ttT(i, c, h, e.v, {
        connectionMode: T.connectionMode,
        usesThreadActors: a.usesThreadActors
      });
    try {
      if (T.connectOnCreate ?? !0) await s.transport.ensureConnected({
        maxAttempts: 1,
        waitForConnectedTimeoutMs: 0,
        onRetryableConnectError: A => {
          let l = s.transport.getConnectionInfo();
          J.warn("[dtw] Initial transport connect failed; waiting for reconnect", {
            threadId: s.threadId,
            connectionState: l.state,
            ...KkT(l.reconnectCause),
            error: A
          });
        }
      }), s.emitThread();
      return s;
    } catch (A) {
      throw s.dispose(), A;
    }
  }
  threadChanges() {
    return this.threadSubject;
  }
  agentLoopStateChanges() {
    return this.agentLoopStateSubject;
  }
  executorReadyChanges() {
    return this.executorReadySubject;
  }
  toolProgressByToolUseIDChanges() {
    return this.toolProgressByToolUseIDSubject;
  }
  getThread() {
    return this.threadSubject.getValue();
  }
  getAgentLoopState() {
    return this.agentLoopState;
  }
  getConnectionState() {
    return this.lastConnectionInfo?.state ?? this.transport.getConnectionInfo().state;
  }
  getConnectionRole() {
    return this.lastConnectionInfo?.role ?? this.transport.getConnectionInfo().role;
  }
  usesThreadActors() {
    return this.usesThreadActorsBackend;
  }
  getCompactionState() {
    return this.compactionState;
  }
  compactionStateChanges() {
    return this.compactionStateSubject;
  }
  setEnvironment(T) {
    let R = this.threadSubject.getValue();
    if (R.env?.initial) return;
    let a = {
      ...R,
      ...{
        env: T
      }
    };
    this.threadSubject.next(a);
  }
  setRelationships(T) {
    if (this.relationships.length > 0) return;
    this.relationships = T, this.emitThread();
  }
  setAgentMode(T, R) {
    if (!T) return;
    let a = this.threadSubject.getValue();
    if (!R?.overwrite && a.agentMode) return;
    if (a.agentMode === T) return;
    let e = {
      ...a,
      agentMode: T
    };
    this.threadSubject.next(e);
  }
  async ensureConnectedForAction(T) {
    if (this.transport.getConnectionInfo().state === "reconnecting") {
      let a = T === "client-write" ? "client write action" : "executor action";
      J.info(`Forcing transport reconnect before ${a}`);
    }
    if (await this.transport.ensureConnected({
      forceReconnectWhenReconnecting: !0,
      onAttemptTimeout: ({
        attempt: a,
        maxAttempts: e,
        nextDelayMs: t
      }) => {
        J.info("[dtw] Connection attempt timed out, retrying", {
          attempt: a,
          maxAttempts: e,
          nextDelayMs: t,
          threadId: this.threadId
        });
      }
    })) return;
    let R = this.transport.getConnectionInfo().state;
    throw Error(R === "reconnecting" ? "Timed out while reconnecting. Please retry after reconnecting." : "Timed out waiting for connection. Please retry.");
  }
  editUserMessage(...T) {
    this.transport.editUserMessage(...T);
  }
  setThreadTitle(...T) {
    this.transport.setThreadTitle(...T);
  }
  cancelAgentLoop(...T) {
    this.transport.cancelAgentLoop(...T);
  }
  retryAgentLoop(...T) {
    this.transport.retryAgentLoop(...T);
  }
  appendManualBashInvocation(...T) {
    this.transport.appendManualBashInvocation(...T);
  }
  resolveToolApproval(...T) {
    this.transport.resolveToolApproval(...T);
  }
  errorEvents() {
    return this.transport.errorEvents();
  }
  errors() {
    return this.transport.errors();
  }
  cancelledEvents() {
    return this.transport.cancelledEvents();
  }
  getTransport() {
    return this.transport;
  }
  emitThread(T) {
    let R = this.threadSubject.getValue(),
      a = T?.agentMode ?? R.agentMode,
      e = Wp0(this.deltaState.streamingMessageId, this.deltaState.streamingBlocks, this.messages.length, this.deltaState.streamingParentToolCallId),
      t = e ? [...this.messages, e] : [...this.messages],
      r = t.reduce((i, c) => Math.max(i, c.messageId), -1) + 1,
      h = {
        ...R,
        id: this.threadId,
        ...(a ? {
          agentMode: a
        } : {}),
        v: this.threadResumeCursor.getVersion(),
        title: this.threadTitle,
        messages: t,
        queuedMessages: this.queuedMessages.length > 0 ? P$(this.queuedMessages) : void 0,
        relationships: this.relationships.length > 0 ? [...this.relationships] : void 0,
        nextMessageId: Math.max(r, 0)
      };
    this.threadSubject.next(h), this.reconcilePendingClientWrites(h), this.replayPendingClientWritesIfNeeded(h);
  }
  reconcilePendingClientWrites(T) {
    if (this.pendingClientWritesByMessageID.size === 0) return;
    let R = new Set();
    for (let a of T.messages) {
      let e = z9.safeParse(a.dtwMessageID);
      if (e.success) R.add(e.data);
    }
    for (let a of T.queuedMessages ?? []) {
      let e = z9.safeParse(a.id);
      if (e.success) R.add(e.data);
      let t = z9.safeParse(a.queuedMessage.dtwMessageID);
      if (t.success) R.add(t.data);
    }
    for (let a of R) this.pendingClientWritesByMessageID.delete(a);
  }
  replayPendingClientWritesIfNeeded(T) {
    if (this.pendingClientWritesByMessageID.size === 0) {
      this.pendingClientWriteReplayGeneration = null;
      return;
    }
    if (this.pendingClientWriteReplayGeneration !== this.connectedTransportGeneration) return;
    if (this.transport.getConnectionInfo().state !== "connected") return;
    let R = !1;
    for (let [a, e] of this.pendingClientWritesByMessageID) try {
      this.sendUserMessage(e.content, e.agentMode, e.userState, a, e.discoveredGuidanceFiles);
    } catch (t) {
      R = !0, J.warn("Failed to replay pending client write", {
        threadId: this.threadId,
        messageID: a,
        error: t
      });
      break;
    }
    if (!R) this.pendingClientWriteReplayGeneration = null;
    this.reconcilePendingClientWrites(T);
  }
  emitToolProgress() {
    this.toolProgressByToolUseIDSubject.next(new Map(this.toolProgressByToolUseID));
  }
  clearToolProgress(T) {
    if (this.toolProgressByToolUseID.delete(T)) this.emitToolProgress();
  }
  clearToolProgressFromBlocks(T) {
    for (let R of T) if (R.type === "tool_result") this.clearToolProgress(R.toolUseID);
  }
  setCompactionState(T) {
    if (this.compactionState === T) return;
    this.compactionState = T, this.compactionStateSubject.next(T);
  }
  advanceThreadVersionFromSeq(T) {
    this.threadResumeCursor.advanceFromSeq(T);
  }
  runTransportHandler(T, R) {
    try {
      R();
    } catch (a) {
      J.error("[dtw] Transport handler failed", {
        threadId: this.threadId,
        handler: T,
        connectionState: this.lastConnectionState,
        error: a
      });
    }
  }
  subscribeToTransport() {
    let T = {
      onConnectionChange: R => {
        this.runTransportHandler("connectionChanges", () => {
          let a = this.lastConnectionState,
            e = this.lastConnectionInfo,
            t = R.state !== this.lastConnectionState,
            r = e !== null && (R.role !== e.role || R.clientId !== e.clientId);
          if (!t && !r) return;
          if (t) this.logConnectionStateTransition(this.lastConnectionState, R);else if (r && e) this.logConnectionRoleTransition(e, R);
          let h = R.state,
            i = h === "connected" && this.lastConnectionState !== "connected";
          if (i) this.threadResumeCursor.reset();
          this.lastConnectionState = h, this.lastConnectionInfo = {
            ...R
          };
          let c = R.state === "connected" && R.role === "executor";
          this.executorReadySubject.next(c);
          let s = c && e?.role !== "executor";
          if (i && this.connectionMode === "observer" || s && this.connectionMode === "executor+observer") this.transport.resumeFromVersion(this.threadResumeCursor.getVersion());
          if (h === "connected" && a !== "connected") this.connectedTransportGeneration += 1, this.pendingClientWriteReplayGeneration = this.connectedTransportGeneration, this.replayPendingClientWritesIfNeeded(this.threadSubject.getValue());
        });
      },
      onError: R => {
        this.runTransportHandler("errors", () => {
          let a = R.code === "PARSE_ERROR" ? Mn0(R.message) : null;
          if (J.warn("[dtw] Transport error", {
            threadId: this.threadId,
            connectionState: this.lastConnectionState,
            code: R.code,
            message: a !== null ? "Received invalid DTW payload (see parse details)" : R.message,
            parseErrorSource: a?.source,
            parseErrorDirection: a?.direction,
            parseErrorStage: a?.stage,
            parseErrorSummary: a?.summary,
            parseErrorMessageType: a?.messageType,
            parseErrorIssues: a?.issues,
            parseErrorPayloadPreview: a?.payloadPreview
          }), R.code === "PARSE_ERROR") {
            let e = a?.messageType ? ` (type="${a.messageType}")` : "";
            J.warn("[dtw] Invalid DTW parse payload received", {
              threadId: this.threadId,
              messageType: a?.messageType,
              messageTypeSuffix: e
            });
          }
        });
      },
      onAgentState: R => {
        this.runTransportHandler("agentStates", () => {
          this.agentLoopState = R.state, this.agentLoopStateSubject.next(R.state);
        });
      },
      onDelta: R => {
        this.runTransportHandler("deltas", () => {
          if (qp0(R, this.deltaState), R.role === "user" && R.state === "complete" && R.blocks) this.clearToolProgressFromBlocks(R.blocks);
          if (this.deltaState.completedMessages.length > 0) {
            for (let a of this.deltaState.completedMessages) if (a.role === "user") this.clearToolProgressFromBlocks(a.blocks);
            this.messages = zp0(this.messages, this.deltaState.completedMessages, this.processedIds), this.deltaState.completedMessages = [];
          }
          this.emitThread();
        });
      },
      onToolProgress: R => {
        this.runTransportHandler("toolProgress", () => {
          let a = R.toolCallId,
            e = Op0(R.progress),
            t = Cp0(R.progress),
            r = this.toolProgressByToolUseID.get(a),
            h = R.progress !== void 0 ? Lp0(R.progress) : r?.subagentProgressTurns,
            i = R.progress !== void 0;
          if (e === void 0 && t === void 0 && !i) {
            if (this.toolProgressByToolUseID.delete(a)) this.emitToolProgress();
            return;
          }
          let c = {
            status: t ?? r?.status ?? "in-progress",
            content: e ?? r?.content ?? "",
            ...(h !== void 0 ? {
              subagentProgressTurns: h
            } : {})
          };
          if (r?.status === c.status && r?.content === c.content && r?.subagentProgressTurns === c.subagentProgressTurns) return;
          this.toolProgressByToolUseID.set(a, c), this.emitToolProgress();
        });
      },
      onCompactionEvent: R => {
        this.runTransportHandler("compactionEvents", () => {
          if (R.type === "compaction_started") {
            this.setCompactionState("compacting");
            return;
          }
          this.setCompactionState("idle");
        });
      },
      onMessageEvent: R => {
        this.runTransportHandler("messageEvents", () => {
          let a = FkT(R);
          if (this.messages = Gp0(R, this.messages, this.processedIds), R.message.role === "user") this.clearToolProgressFromBlocks(R.message.content);
          if (this.deltaState.streamingMessageId === R.message.messageId) this.deltaState.streamingMessageId = null, this.deltaState.streamingBlocks = [], this.deltaState.streamingParentToolCallId = void 0;
          this.advanceThreadVersionFromSeq(R.seq), this.emitThread({
            agentMode: a
          });
        });
      },
      onMessageEdited: R => {
        this.runTransportHandler("messageEdited", () => {
          let a = FkT(R);
          this.messages = Kp0(R, this.messages), this.processedIds = Hp0(this.messages), this.advanceThreadVersionFromSeq(R.seq), this.emitThread({
            agentMode: a
          });
        });
      },
      onThreadTitle: R => {
        this.runTransportHandler("threadTitles", () => {
          this.threadTitle = R.title ?? void 0, this.emitThread();
        });
      },
      onThreadRelationships: R => {
        this.runTransportHandler("threadRelationships", () => {
          if (R.relationships.length > 0 || this.relationships.length === 0) this.relationships = R.relationships;
          this.advanceThreadVersionFromSeq(R.seq), this.emitThread();
        });
      },
      onQueuedMessages: R => {
        this.runTransportHandler("queuedMessages", () => {
          this.queuedMessages = Xp0(this.queuedMessages, R), this.emitThread();
        });
      }
    };
    this.transport.setObserverCallbacks(T), this.observerCallbacksAttached = !0;
  }
  clearTransportObserverCallbacks() {
    if (!this.observerCallbacksAttached) return;
    this.transport.setObserverCallbacks(null), this.observerCallbacksAttached = !1;
  }
  logConnectionStateTransition(T, R) {
    let a = {
      threadId: this.threadId,
      from: T,
      to: R.state,
      threadVersion: this.threadResumeCursor.getVersion(),
      ...KkT(R.reconnectCause)
    };
    if (R.role) a.role = R.role;
    if (R.clientId) a.clientId = R.clientId;
    if (R.threadId && R.threadId !== this.threadId) a.transportThreadId = R.threadId;
    if (R.state === "connected") {
      if (T === "reconnecting") {
        J.info("[dtw] Transport reconnected", a);
        return;
      }
      J.info("[dtw] Transport connected", a);
      return;
    }
    if (R.state === "reconnecting") {
      J.warn("[dtw] Transport reconnecting", a);
      return;
    }
    if (R.state === "disconnected") {
      J.warn("[dtw] Transport disconnected", a);
      return;
    }
    J.info("[dtw] Transport state changed", a);
  }
  logConnectionRoleTransition(T, R) {
    let a = {
      threadId: this.threadId,
      state: R.state,
      fromRole: T.role,
      toRole: R.role,
      threadVersion: this.threadResumeCursor.getVersion()
    };
    if (T.clientId || R.clientId) a.fromClientId = T.clientId, a.toClientId = R.clientId;
    if (R.threadId && R.threadId !== this.threadId) a.transportThreadId = R.threadId;
    J.info("[dtw] Transport role changed", a);
  }
  sendUserMessage(T, R, a, e, t) {
    this.setAgentMode(R);
    let r = this.transport.sendUserMessage(T, R, {
      userState: a,
      messageId: e,
      discoveredGuidanceFiles: t
    });
    return this.pendingClientWritesByMessageID.set(r, {
      content: T,
      agentMode: R,
      userState: a,
      discoveredGuidanceFiles: t
    }), r;
  }
  interruptQueuedMessage(T) {
    this.transport.interruptQueuedMessage(T);
  }
  discardQueuedMessages() {
    let T = P$(this.queuedMessages);
    if (this.queuedMessages.length === 0) return;
    let R = this.queuedMessages.map(a => z9.safeParse(a.id)).filter(a => a.success).map(a => a.data);
    this.queuedMessages = [], this.emitThread();
    try {
      for (let a of R) this.transport.removeQueuedMessage(a);
    } catch (a) {
      throw this.queuedMessages = T ?? [], this.emitThread(), a;
    }
  }
  resumeFromVersion(T) {
    this.transport.resumeFromVersion(T);
  }
  disposeSubscriptionsAndState() {
    this.clearTransportObserverCallbacks(), this.pendingClientWritesByMessageID.clear(), this.pendingClientWriteReplayGeneration = null, this.compactionStateSubject.complete(), this.agentLoopStateSubject.complete(), this.executorReadySubject.complete(), this.toolProgressByToolUseIDSubject.complete();
  }
  async disposeAndWaitForClose() {
    if (this.disposeSubscriptionsAndState(), (await this.transport.disconnectAndWait()).status === "timeout") J.info("[dtw] Timed out waiting for close acknowledgement before dispose", {
      threadId: this.threadId
    });
    this.transport.dispose();
  }
  dispose() {
    this.disposeSubscriptionsAndState(), this.transport.dispose();
  }
}
async function Gk(T) {
  let {
      toolName: R,
      dtwHandoffService: a,
      dtwArtifactSyncService: e,
      configService: t,
      toolService: r,
      mcpService: h,
      skillService: i,
      fsTracker: c,
      toolUseID: s,
      discoveredGuidanceFileURIs: A,
      threadID: l
    } = T,
    o = {
      id: l ?? Eh(),
      created: Date.now(),
      v: 0,
      messages: []
    },
    n = zR.file(process.cwd()),
    p = s ?? fx(),
    _ = await t.getLatest(),
    m,
    b;
  if (c) m = c.trackedFileSystem(p), b = c.tracker;else b = dWT(CG, o.id, async () => {}), m = CWT(He, b, p);
  return {
    dir: n,
    tool: R,
    thread: o,
    dtwHandoffService: a,
    dtwArtifactSyncService: e,
    trackedFiles: new Ls(),
    toolUseID: p,
    todos: void 0,
    configService: t,
    toolService: r,
    mcpService: h,
    config: _,
    filesystem: m,
    fileChangeTracker: b,
    getAllTrackedChanges: async () => b.getAllRecords(),
    threadEnvironment: {
      trees: [],
      platform: "cli"
    },
    handleThreadDelta: () => Promise.resolve(),
    threadService: {
      observe: () => AR.of(o),
      get: () => Promise.resolve(o),
      getPrimitiveProperty: (y, u) => Promise.resolve(o[u]),
      flushVersion: () => Promise.resolve(),
      updateThreadMeta: () => Promise.resolve()
    },
    getThreadEnvironment: () => Promise.resolve({
      trees: [],
      platform: "cli"
    }),
    threadSummaryService: {
      summarizeThread: () => Promise.resolve({
        summary: "CLI execution",
        prompt: "CLI execution",
        title: "CLI Tool"
      })
    },
    osFileSystem: He,
    deleteThread: () => Promise.resolve(),
    generateThreadTitle: () => Promise.resolve({
      title: "CLI Tool Execution"
    }),
    fileChangeTrackerStorage: CG,
    discoveredGuidanceFileURIs: A ?? new Set(),
    skillService: i ?? {
      getSkills: () => Promise.resolve([]),
      getTargetDir: () => Promise.resolve("/tmp/skills"),
      listInstalled: () => [],
      reload: () => {}
    }
  };
}
function rtT() {
  return new Date().toISOString();
}
function Qp0(T) {
  let R = T.trim();
  if (!(R.startsWith("{") && R.endsWith("}") || R.startsWith("[") && R.endsWith("]"))) return null;
  try {
    return JSON.parse(R);
  } catch {
    return null;
  }
}
function itT(T) {
  if (T instanceof Error) return T.stack ?? T.message;
  if (typeof T === "string") {
    let R = Qp0(T);
    if (R !== null) return JSON.stringify(R, null, 2);
    return T;
  }
  if (T === void 0) return "";
  try {
    return JSON.stringify(T, null, 2);
  } catch {
    return String(T);
  }
}
function Th(T, R, a) {
  if (J.info("[headless-dtw] websocket message", {
    direction: T,
    clientId: R,
    ...(typeof a === "object" && a !== null ? a : {
      message: a
    })
  }), !htT) return;
  let e = oR.dim(`[${rtT()}]`),
    t = oR.magenta(`[${R}]`),
    r = T === "SEND" ? oR.green(">>>") : oR.yellow("<<<"),
    h = itT(a);
  process.stderr.write(`${e} ${t} ${r} ${h}
`);
}
function ie(T, R) {
  if (R) J.info(`[headless-dtw] ${T}`, R);else J.info(`[headless-dtw] ${T}`);
  if (!htT) return;
  let a = oR.dim(`[${rtT()}]`),
    e = oR.cyan("[INFO]"),
    t = R ? ` ${itT(R)}` : "";
  process.stderr.write(`${a} ${e} ${T}${t}
`);
}
function Vi(T, R) {
  if (R !== void 0) J.error(`[headless-dtw] ${T}`, {
    error: R
  });else J.error(`[headless-dtw] ${T}`);
  if (!htT) return;
  let a = oR.dim(`[${rtT()}]`),
    e = oR.red("[ERROR]"),
    t = itT(R);
  process.stderr.write(`${a} ${e} ${T} ${t}
`);
}
function Zp0(T) {
  let R = {
    reconnectCauseType: T.type,
    reconnectCauseAt: new Date(T.at).toISOString()
  };
  if (T.code !== void 0) R.reconnectCode = T.code;
  if (T.reason) R.reconnectReason = T.reason;
  if (T.error) R.reconnectError = T.error;
  return R;
}
function Jp0(T, R) {
  let a = new URL(T);
  if (!a.pathname.endsWith("/")) a.pathname += "/";
  return new URL(`threads/${R}`, a).toString();
}
class bVT {
  options;
  clients = new Map();
  clientCounter = 0;
  disposed = !1;
  pluginsBootstrapped = !1;
  pendingExitCode = null;
  toolSyncSubscription = null;
  resolveRunLoop = null;
  constructor(T) {
    this.options = T;
  }
  bindClientThread(T, R) {
    let a = T.threadId !== R;
    if (T.threadId = R, T.fsTracker && !a) return;
    let e = this.options.fileSystem ?? He,
      t = new Im(e);
    T.fsTracker = Q3T({
      fileChangeTrackerStorage: t
    }, e, R);
  }
  async connectTransport(T, R, a) {
    let e = await T.ensureConnected({
      maxAttempts: 1,
      waitForConnectedTimeoutMs: VkT
    });
    if (!e) {
      let t = T.getConnectionInfo();
      ie(`${R} waiting for reconnect during ${a}`, {
        connectionState: t.state,
        reconnectCauseType: t.reconnectCause?.type,
        reconnectCauseCode: t.reconnectCause?.code,
        reconnectCauseReason: t.reconnectCause?.reason,
        waitedMs: VkT
      });
    }
    return e;
  }
  async recoverTransport(T, R, a, e) {
    let t = this.clients.get(T);
    if (!t || t.recoveringTransport || this.disposed) return;
    t.recoveringTransport = !0, ie(`${T} recovering transport after send failure`, {
      messageType: R,
      error: a.message,
      ...e
    });
    try {
      let r = t.transport.getConnectionInfo();
      if (r.state === "connecting" || r.state === "authenticating" || r.state === "reconnecting") {
        ie(`${T} recovery waiting for in-flight connection`, {
          connectionState: r.state,
          reconnectCauseType: r.reconnectCause?.type,
          reconnectCauseCode: r.reconnectCause?.code,
          reconnectCauseReason: r.reconnectCause?.reason
        });
        return;
      }
      if (r.state === "connected") t.transport.disconnect();
      let h = await this.connectTransport(t.transport, T, "recovery"),
        i = t.transport.getThreadId();
      if (i) this.bindClientThread(t, i);
      if (!h) return;
      t.executorRuntime.ensureHandshake("retry");
    } catch (r) {
      Vi(`${T} transport recovery failed`, r);
    } finally {
      t.recoveringTransport = !1;
    }
  }
  async start() {
    ie("Starting Headless DTW Harness", {
      ampURL: this.options.ampURL,
      workerUrl: this.options.workerUrl ?? Pi(this.options.ampURL),
      workspaceRoot: this.options.workspaceRoot,
      threadId: this.options.threadId ?? null
    }), this.toolSyncSubscription ??= this.options.toolService.tools.subscribe({
      next: T => {
        let R = RtT(T);
        for (let a of this.clients.values()) this.syncExecutorTools(a, R);
      }
    });
    try {
      let T = await this.createClient(this.options.threadId);
      ie("Initial client created", {
        clientId: T.id,
        threadId: T.threadId
      }), this.logThreadURL(T.threadId);
      let R = await this.runLoop();
      if (R !== 0) throw Error(`Headless DTW harness exited with code ${R}`);
    } catch (T) {
      throw Vi("Failed to start harness", T), T;
    }
  }
  logThreadURL(T) {
    if (!T) return;
    let R = Jp0(this.options.ampURL, T);
    ie(`Thread URL: ${oR.blue.underline(R)}`);
  }
  async shutdown(T, R) {
    if (this.pendingExitCode === null || T > this.pendingExitCode) this.pendingExitCode = T;
    let a = this.resolveRunLoop;
    if (a) this.resolveRunLoop = null;
    if (!this.disposed) {
      if (T === 0) ie(R);else Vi(R);
      await this.dispose();
    }
    if (a) {
      let e = this.pendingExitCode ?? T;
      this.pendingExitCode = null, a(e);
    }
  }
  async invokeToolForClient(T, R) {
    let {
      toolService: a,
      configService: e,
      mcpService: t,
      skillService: r
    } = this.options;
    if (!a || !e || !t) throw Error("Tool service not available");
    let {
        toolName: h,
        toolCallId: i,
        args: c
      } = R,
      s = typeof c === "object" && c !== null ? c : {},
      A = AVT({
        configService: e,
        apiKey: this.options.apiKey
      }),
      l = await Gk({
        toolName: h,
        dtwHandoffService: A,
        dtwArtifactSyncService: {
          upsertArtifact: (o, n) => {
            let p = Ca.safeParse(n);
            T.transport.sendExecutorArtifactUpsert(o, p.success ? p.data : void 0);
          },
          deleteArtifact: o => {
            T.transport.sendExecutorArtifactDelete(o);
          }
        },
        configService: e,
        toolService: a,
        mcpService: t,
        skillService: r,
        fsTracker: T.fsTracker ?? void 0,
        toolUseID: i,
        discoveredGuidanceFileURIs: T.toolRunner.discoveredGuidanceFileURIs,
        threadID: T.threadId
      });
    return a.invokeTool(h, {
      args: s
    }, l);
  }
  async createClient(T) {
    let R = `client-${++this.clientCounter}`,
      a = `cli-headless-${crypto.randomUUID()}`,
      e = this.options.workerUrl ?? Pi(this.options.ampURL),
      t = {
        current: null
      },
      r = () => {
        let m = t.current;
        if (!m) throw Error("Headless client callbacks invoked before initialization");
        return m;
      },
      h = this.options.useThreadActors ? process.env.RIVET_PUBLIC_ENDPOINT ?? lH(this.options.ampURL) : void 0;
    ie(`Creating client ${R}`, {
      threadId: T,
      workerUrl: e,
      useThreadActors: this.options.useThreadActors ?? !1,
      rivetPublicEndpoint: h ?? "(not used)",
      options: this.options
    });
    let i;
    if (this.options.useThreadActors && h) {
      let m = nH({
        endpoint: h
      });
      i = {
        baseURL: h,
        threadId: T,
        webSocketProvider: async () => {
          return await m.threadActor.getOrCreate([T], {
            params: {
              apiKey: this.options.apiKey,
              threadId: T,
              executorClientId: a
            },
            ...(this.options.ownerUserId && typeof this.options.threadVersion === "number" ? {
              createWithInput: {
                threadId: T,
                ownerUserId: this.options.ownerUserId,
                threadVersion: this.options.threadVersion
              }
            } : {})
          }).webSocket("/");
        },
        WebSocketClass: WebSocket,
        maxReconnectAttempts: Number.POSITIVE_INFINITY,
        pingIntervalMs: 5000,
        useThreadActors: !0
      };
    } else i = {
      baseURL: e,
      apiKey: this.options.apiKey,
      threadId: T,
      WebSocketClass: WebSocket,
      maxReconnectAttempts: Number.POSITIVE_INFINITY,
      pingIntervalMs: 5000
    };
    let c = null,
      s = new ZeT({
        transport: i,
        observerCallbacks: {
          onEvent: m => {
            this.handleObserverEvent(r(), m);
          }
        },
        executorCallbacks: {
          onToolLease: m => {
            c?.onToolLeaseMessage(m);
          },
          onToolLeaseRevoked: m => {
            c?.onToolLeaseRevokedMessage(m);
          },
          onExecutorRollbackRequest: m => {
            c?.onExecutorRollbackRequestMessage(m);
          },
          onFileSystemReadDirectoryRequest: m => {
            c?.onExecutorFileSystemReadDirectoryRequestMessage(m);
          },
          onFileSystemReadFileRequest: m => {
            c?.onExecutorFileSystemReadFileRequestMessage(m);
          }
        }
      }),
      A = m => ({
        ...(m ?? {}),
        threadId: T
      }),
      l = {
        info: (m, b) => {
          ie(m, A(b));
        },
        error: (m, b) => {
          Vi(m, b);
        },
        wsMessage: (m, b, y) => {
          Th(m, b, A(typeof y === "object" && y !== null ? y : {
            message: y
          }));
        }
      },
      o = new PH({
        transport: s,
        toolService: this.options.toolService,
        configService: this.options.configService,
        clientID: R,
        executorClientID: a,
        threadID: T,
        invokeTool: m => this.invokeToolForClient(r(), m),
        skillService: this.options.skillService,
        fileSystem: this.options.fileSystem,
        bootstrapLogMessage: (m, b) => {
          Th(m, R, b);
        },
        initialToolDiscovery: this.options.initialToolDiscovery,
        onBootstrapSuccess: async () => {
          let m = r();
          if (!m.hasLoggedPostBootstrapThreadURL && m.threadId) this.logThreadURL(m.threadId), m.hasLoggedPostBootstrapThreadURL = !0;
          this.setNotifyForwarder(m), this.bootstrapPluginsAfterExecutorConnect(m);
        },
        sendGitSnapshot: !0,
        handshake: m => this.connectAsExecutor(r(), m),
        handshakeManagerOptions: {
          onError: ({
            error: m,
            attempt: b,
            delayMs: y
          }) => {
            Vi(`${R} executor handshake failed`, {
              error: m,
              attempt: b,
              delayMs: y
            });
          },
          onExhausted: ({
            error: m,
            maxAttempts: b
          }) => {
            this.shutdown(1, `${R} executor handshake failed after ${b} attempts: ${m instanceof Error ? m.message : String(m)}`);
          }
        },
        captureGitStatus: () => rVT(this.options.workspaceRoot),
        batchGuidanceFiles: cVT,
        renderToolRunError: I8T,
        onTransportSendFailure: (m, b, y, u) => {
          this.recoverTransport(m, b, y, u);
        },
        log: l,
        autoResolvePendingApprovals: !1,
        handleExecutorRollbackRequest: async m => {
          let b = r();
          await this.handleExecutorRollbackRequest(b, m);
        },
        handleExecutorFileSystemReadDirectoryRequest: async m => {
          let b = r();
          await this.handleExecutorFileSystemReadDirectoryRequest(b, m);
        },
        handleExecutorFileSystemReadFileRequest: async m => {
          let b = r();
          await this.handleExecutorFileSystemReadFileRequest(b, m);
        },
        logInboundExecutorMessages: !0
      });
    c = o;
    let n = {
      id: R,
      transport: s,
      threadId: T,
      hasLoggedPostBootstrapThreadURL: !1,
      executorRuntime: o,
      toolRunner: o.toolRunner,
      fsTracker: null,
      recoveringTransport: !1
    };
    t.current = n, this.clients.set(R, n), o.handleConnectionChange(s.getConnectionInfo()), this.subscribeToApprovalRequests(n), ie(`Connecting ${R}...`);
    let p = await this.connectTransport(s, R, "startup"),
      _ = s.getThreadId();
    if (_) this.bindClientThread(n, _);
    if (p) ie(`Connected ${R}`, {
      threadId: _
    });
    if (p) n.executorRuntime.ensureHandshake("connect");
    return n;
  }
  async connectAsExecutor(T, R) {
    ie(`Connecting ${T.id} as executor...`, {
      trigger: R
    });
    try {
      await T.executorRuntime.bootstrapExecutor({
        executorType: "sandbox",
        trigger: R,
        workspaceRoot: this.options.workspaceRoot,
        threadID: T.threadId,
        suppressConnectLog: !0
      });
    } catch (a) {
      throw Vi(`${T.id} executor bootstrap failed`, a), a;
    }
  }
  setNotifyForwarder(T) {
    let R = this.options.pluginPlatform;
    if (!R) return;
    R.setNotifyForwarder(async a => {
      let e = {
        type: "event",
        event: "ui.notify",
        data: {
          message: a
        }
      };
      try {
        Th("SEND", T.id, {
          type: "executor_plugin_message",
          message: e
        }), T.transport.sendPluginMessage(e);
      } catch (t) {
        Vi(`${T.id} failed to forward plugin notification`, t);
      }
    });
  }
  bootstrapPluginsAfterExecutorConnect(T) {
    let R = this.options.pluginService;
    if (!R || this.pluginsBootstrapped) return;
    this.pluginsBootstrapped = !0, ie(`${T.id} reloading plugins after executor bootstrap`), R.reload();
  }
  syncExecutorTools(T, R) {
    T.executorRuntime.syncExecutorToolRegistrations(R, {
      logMessage: (a, e) => {
        Th(a, T.id, e);
      }
    });
  }
  syncApprovalRequests(T, R) {
    if (!T.threadId) return;
    let a = R.filter(t => t.threadId === T.threadId || t.mainThreadId === T.threadId),
      e = new Set(a.map(pS));
    for (let t of [...T.toolRunner.sentApprovalRequests]) if (!e.has(t)) T.toolRunner.sentApprovalRequests.delete(t);
    for (let t of a) {
      let r = pS(t);
      if (T.toolRunner.sentApprovalRequests.has(r)) continue;
      let h = ZKT(t);
      Th("SEND", T.id, {
        type: "executor_tool_approval_request",
        toolCallId: h.toolCallId,
        toolName: h.toolName
      }), T.transport.sendExecutorToolApprovalRequest(h), T.toolRunner.sentApprovalRequests.add(r);
    }
  }
  handleExecutorToolApprovalResponse(T, R) {
    let {
      toolService: a
    } = this.options;
    if (!a) {
      Vi(`${T.id} received approval response without tool service`);
      return;
    }
    ie(`${T.id} approval resolved`, {
      toolCallId: R.toolCallId,
      accepted: R.accepted
    }), a.resolveApproval(R.toolCallId, R.accepted, R.input?.denyFeedback);
  }
  handleObserverEvent(T, R) {
    let a = T.id;
    switch (R.type) {
      case "connection_changed":
        {
          let {
            info: e
          } = R;
          if (e.state === "connected" && e.threadId) this.bindClientThread(T, e.threadId);
          let t = {
            role: e.role ?? "unclaimed"
          };
          if (e.state === "reconnecting" && e.reconnectCause) Object.assign(t, Zp0(e.reconnectCause));
          ie(`${a} connection: ${e.state}`, t), T.executorRuntime.handleConnectionChange(e);
          return;
        }
      case "delta":
        Th("RECV", a, {
          eventType: "delta",
          ...R.message
        });
        return;
      case "error_notice":
        Th("RECV", a, R.message), Vi(`${a} error`, R.message.message);
        return;
      case "executor_tool_approval_response":
        Th("RECV", a, R.message), this.handleExecutorToolApprovalResponse(T, R.message);
        return;
      case "executor_error":
        Th("RECV", a, R.message), Vi(`${a} executor error`, R.message.message);
        return;
      default:
        Th("RECV", a, R.message);
    }
  }
  subscribeToApprovalRequests(T) {
    let {
      toolService: R
    } = this.options;
    if (R) R.pendingApprovals$.subscribe(a => {
      this.syncApprovalRequests(T, a);
    });
  }
  async handleExecutorRollbackRequest(T, R) {
    let {
        id: a,
        fsTracker: e
      } = T,
      {
        editId: t,
        toolUseIdsToRevert: r
      } = R;
    if (!e) {
      Vi(`${a} rollback failed: no file tracker`), Th("SEND", a, {
        type: "executor_rollback_ack",
        editId: t,
        ok: !1,
        error: "File tracker not initialized"
      }), T.transport.sendExecutorRollbackAck(t, !1, "File tracker not initialized");
      return;
    }
    await T.toolRunner.handleRollbackRequest(t, r, h => e.tracker.revertChanges(h));
  }
  async handleExecutorFileSystemReadDirectoryRequest(T, R) {
    let a = await TtT({
      fileSystem: this.options.fileSystem ?? He,
      workspaceRoot: this.options.workspaceRoot
    }, R.uri);
    Th("SEND", T.id, {
      type: "executor_filesystem_read_directory_result",
      requestId: R.requestId,
      ...a
    }), T.transport.sendExecutorFileSystemReadDirectoryResult(R.requestId, a);
  }
  async handleExecutorFileSystemReadFileRequest(T, R) {
    let a = await TVT({
      fileSystem: this.options.fileSystem ?? He,
      workspaceRoot: this.options.workspaceRoot
    }, R.uri);
    Th("SEND", T.id, {
      type: "executor_filesystem_read_file_result",
      requestId: R.requestId,
      ...a
    }), T.transport.sendExecutorFileSystemReadFileResult(R.requestId, a);
  }
  async runLoop() {
    if (ie("Harness running. Press Ctrl+C to exit."), this.pendingExitCode !== null) return this.pendingExitCode;
    return await new Promise(T => {
      let R = !1,
        a = r => {
          if (R) {
            ie(`Received ${r} while shutdown is already in progress`);
            return;
          }
          R = !0, this.shutdown(0, `Received ${r}, shutting down harness...`);
        },
        e = () => a("SIGINT"),
        t = () => a("SIGTERM");
      this.resolveRunLoop = r => {
        process.off("SIGINT", e), process.off("SIGTERM", t), T(r);
      }, process.on("SIGINT", e), process.on("SIGTERM", t);
    });
  }
  getClients() {
    return Array.from(this.clients.values());
  }
  async dispose() {
    this.disposed = !0, this.toolSyncSubscription?.unsubscribe(), this.toolSyncSubscription = null, this.options.pluginPlatform?.setNotifyForwarder(null);
    for (let T of this.clients.values()) {
      if (T.executorRuntime.dispose(), (await T.transport.disconnectAndWait()).status === "timeout") ie(`${T.id} timed out waiting for close acknowledgement before dispose`);
      T.transport.dispose();
    }
    this.clients.clear();
  }
}
async function T_0(T) {
  let R = await uA(T.threadId, T.configService, T.apiKey, {
    usesThreadActors: T.useThreadActors
  });
  if (!R.usesDtw) throw Error("Headless DTW requires a durable thread. Open the thread in the CLI first to import it.");
  await new bVT({
    ...T,
    threadId: R.threadId,
    ownerUserId: R.ownerUserId,
    threadVersion: R.threadVersion,
    agentMode: R.agentMode,
    useThreadActors: R.usesThreadActors
  }).start();
}
function t_0() {
  return !!(process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION);
}
function r_0() {
  if (!e_0.isTTY) return !0;
  if (t_0()) return !0;
  return !1;
}
function XkT(T) {
  if (tY = T, T && EM.length > 0) {
    for (let R of EM) T(R);
    EM = [];
  }
}
function h_0(T) {
  return async (R, a) => {
    return new Promise((e, t) => {
      let r = {
        serverName: T,
        authorizationUrl: R,
        redirectUrl: a,
        resolve: e,
        reject: t
      };
      if (tY) tY(r);else EM.push(r);
    });
  };
}
function i_0() {
  return async (T, R) => {
    return Qi.write(`
`), Qi.write(oR.yellow.bold(`OAuth Authorization Required
`)), Qi.write(oR.dim("\u2500".repeat(60) + `
`)), Qi.write(`
`), Qi.write(`Open this URL in your browser to authorize:

`), Qi.write(oR.blue.bold(T) + `

`), Qi.write(oR.dim(`After authorizing, you will be redirected to a localhost URL.
`)), Qi.write(oR.dim(`The redirect will fail - this is expected in headless mode.
`)), Qi.write(oR.dim(`Copy the full URL from your browser address bar and paste it below.
`)), Qi.write(`
`), await c_0("Paste the callback URL or authorization code: ");
  };
}
async function c_0(T) {
  let R = a_0({
    input: R_0,
    output: Qi
  });
  return new Promise((a, e) => {
    R.on("SIGINT", () => {
      R.close(), e(Error("OAuth authorization cancelled"));
    }), R.question(T, t => {
      R.close(), a(t.trim());
    });
  });
}
function s_0() {
  if (process.env.AMP_HEADLESS_OAUTH === "1" || process.env.AMP_HEADLESS_OAUTH === "true") return !0;
  return r_0();
}
function b_0(T) {
  try {
    return process.kill(T, 0), !0;
  } catch (R) {
    return R.code === "EPERM";
  }
}
function uVT(T) {
  let R = T.trim();
  if (!/^\d+$/.test(R)) return;
  let a = Number.parseInt(R, 10);
  return Number.isSafeInteger(a) && a > 0 ? a : void 0;
}
function ctT(T, R) {
  return T.code === R;
}
async function yVT(T) {
  try {
    let R = await A_0(T, "utf-8"),
      a = uVT(R);
    if (a === void 0) return {
      kind: "invalid",
      value: R.trim()
    };
    return {
      kind: "valid",
      pid: a
    };
  } catch (R) {
    if (ctT(R, "ENOENT")) return {
      kind: "missing"
    };
    throw R;
  }
}
async function m_0(T, R) {
  let a = await yVT(T);
  if (a.kind !== "valid" || a.pid !== R) return;
  await rY(T, {
    force: !0
  }), J.info("Removed headless PID file", {
    currentPID: R,
    pidFilePath: T
  });
}
function u_0(T, R) {
  try {
    let a = o_0(T, "utf-8");
    if (uVT(a) !== R) return;
  } catch (a) {
    if (ctT(a, "ENOENT")) return;
    throw a;
  }
  n_0(T, {
    force: !0
  });
}
async function y_0(T, R = {}) {
  let a = R.pidDir ?? __0,
    e = R.currentPID ?? process.pid,
    t = R.isProcessRunning ?? b_0,
    r = mVT.join(a, `${T}.pid`);
  await l_0(a, {
    recursive: !0
  });
  while (!0) {
    let h = await yVT(r);
    if (h.kind === "valid") {
      if (t(h.pid)) return J.info("Headless instance already running for thread, exiting", {
        pidFilePath: r,
        runningPID: h.pid,
        threadID: T
      }), {
        status: "already-running",
        pidFilePath: r,
        runningPID: h.pid
      };
      J.info("Replacing stale headless PID file", {
        pidFilePath: r,
        stalePID: h.pid,
        threadID: T
      }), await rY(r, {
        force: !0
      });
    }
    if (h.kind === "invalid") J.warn("Replacing invalid headless PID file content", {
      invalidPID: h.value,
      pidFilePath: r,
      threadID: T
    }), await rY(r, {
      force: !0
    });
    try {
      await p_0(r, `${e}
`, {
        encoding: "utf-8",
        flag: "wx",
        mode: 384
      }), J.info("Claimed headless PID file", {
        currentPID: e,
        pidFilePath: r,
        threadID: T
      });
      let i = !1,
        c = () => {
          if (i) return;
          i = !0, u_0(r, e);
        },
        s = o => {
          if (c(), process.off("SIGINT", A), process.off("SIGTERM", l), process.listenerCount(o) === 0) process.kill(process.pid, o);
        },
        A = () => s("SIGINT"),
        l = () => s("SIGTERM");
      return process.once("exit", c), process.on("SIGINT", A), process.on("SIGTERM", l), {
        status: "claimed",
        pidFilePath: r,
        release: async () => {
          if (i) return;
          await m_0(r, e), i = !0, process.off("exit", c), process.off("SIGINT", A), process.off("SIGTERM", l);
        }
      };
    } catch (i) {
      if (ctT(i, "EEXIST")) continue;
      throw i;
    }
  }
}
async function iY(T, R, a) {
  let e = await yl.realpath(T).catch(s => s.code === "ENOENT" ? T : Promise.reject(s)),
    t = await yl.readFile(e, "utf-8").catch(s => s.code === "ENOENT" ? "{}" : Promise.reject(s)),
    r = R(t);
  if (t === r.newContent) return;
  let h = bg.dirname(e);
  await yl.mkdir(h, {
    recursive: !0
  });
  let i = await yl.mkdtemp(bg.join(h, ".amp-temp-")),
    c = bg.join(i, bg.basename(T));
  try {
    await yl.writeFile(c, r.newContent, {
      encoding: "utf-8",
      flush: !0,
      ...(a?.mode !== void 0 ? {
        mode: a.mode
      } : {})
    }), await yl.rename(c, e), await P_0(bg.dirname(e));
    return;
  } finally {
    await yl.rm(i, {
      recursive: !0,
      force: !0
    });
  }
}
async function P_0(T) {
  let R = await yl.open(T, "r");
  try {
    await R.sync();
  } catch (a) {
    if (a.code === "EPERM" || a.code === "EINVAL") ;else throw a;
  } finally {
    await R.close();
  }
}
function k_0(T, R) {
  let {
    default: a,
    global: e,
    workspace: t
  } = R;
  if (!iCT(T)) return;
  let r = [];
  for (let i of [t, e, a]) if (Array.isArray(i)) r.push(...i);else if (i !== void 0) J.warn("Expected array value for merged array key", {
    key: T,
    value: i
  });
  let h = new Map();
  for (let i of r) {
    let c = JSON.stringify(i);
    if (!h.has(c)) h.set(c, i);
  }
  return h.size > 0 ? Array.from(h.values()) : void 0;
}
function cY(T) {
  let R = {};
  if (T.default && typeof T.default === "object") for (let [a, e] of Object.entries(T.default)) R[a] = {
    ...e,
    _target: "default"
  };else if (T.default !== void 0) J.warn("Expected object for mcpServers default", {
    value: T.default
  });
  if (T.global && typeof T.global === "object") for (let [a, e] of Object.entries(T.global)) R[a] = {
    ...e,
    _target: "global"
  };else if (T.global !== void 0) J.warn("Expected object for mcpServers global", {
    value: T.global
  });
  if (T.workspace && typeof T.workspace === "object") for (let [a, e] of Object.entries(T.workspace)) R[a] = {
    ...e,
    _target: "workspace"
  };else if (T.workspace !== void 0) J.warn("Expected object for mcpServers workspace", {
    value: T.workspace
  });
  if (T.override && typeof T.override === "object") for (let [a, e] of Object.entries(T.override)) R[a] = {
    ...e
  };else if (T.override !== void 0) J.warn("Expected object for mcpServers override", {
    value: T.override
  });
  return Object.keys(R).length > 0 ? R : void 0;
}
function x_0(T, R) {
  if (T === "mcpServers") return cY(R);
  if (iCT(T)) return k_0(T, R);
  return R.workspace ?? R.global ?? R.default;
}
async function kVT(T, R) {
  try {
    return await _S.access(T), T;
  } catch {
    if (T === R) {
      let a = Ih.join(Ih.dirname(T), "settings.jsonc");
      try {
        return await _S.access(a), J.info("Settings file not found, falling back to .jsonc", {
          jsonPath: T,
          jsoncPath: a
        }), a;
      } catch {
        return T;
      }
    }
    return T;
  }
}
async function YkT(T) {
  try {
    return await _S.access(T), !0;
  } catch {
    return !1;
  }
}
async function f_0(T) {
  let R = qU(T) || T,
    a = T,
    e = 100;
  for (let r = 0; r < e; r++) {
    let h = Ih.join(a, ".amp", "settings.json"),
      i = Ih.join(a, ".amp", "settings.jsonc");
    if (await YkT(h)) return {
      workspaceRootPath: a,
      workspaceSettingsPath: h
    };
    if (await YkT(i)) return {
      workspaceRootPath: a,
      workspaceSettingsPath: i
    };
    if (a === R) break;
    a = Ih.dirname(a);
  }
  let t = Ih.join(R, ".amp", "settings.json");
  return {
    workspaceRootPath: R,
    workspaceSettingsPath: t
  };
}
function Kk(T, R) {
  if (R === "admin") throw Error("Cannot set admin settings in file storage");
  if (R === "global") return;
  if (QdT[`amp.${T}`]?.scope === "application") throw Error(`Unable to write ${String(T)} to Workspace Settings. This setting can be written only into User settings.`);
}
function I_0(T, R) {
  let a = [];
  if (T) {
    for (let e of Object.keys(R)) if (T[e] !== R[e]) a.push(e);
    for (let e of Object.keys(T)) if (!(e in R) && !a.includes(e)) a.push(e);
  } else a.push(...Object.keys(R));
  return a;
}
async function xVT(T) {
  let R = await kVT(T.settingsFile ?? dA, dA),
    a = T.watchFactory ?? g_0,
    e = T.fallbackWatchFactory ?? $_0,
    t = T.debounceMs ?? 100,
    r = T.fileReadDelayMs ?? 10,
    h = new W0(),
    i,
    c,
    s,
    A = !1,
    l;
  async function o() {
    try {
      let u = Ih.dirname(R);
      await _S.mkdir(u, {
        recursive: !0
      });
    } catch (u) {
      throw J.error(`Failed to create config directory: ${u}`), u;
    }
  }
  async function n(u = !1) {
    if (i && !u) return i;
    _();
    try {
      let P = await _S.readFile(R, "utf-8"),
        k = [],
        x = O5T(P, k, {
          allowTrailingComma: !0
        });
      if (k.length > 0) {
        let v = k.map(g => {
          return P.substring(0, g.offset).split(`
`).length - 1;
        });
        throw new GR(`Invalid JSON in settings file ${R}`, 1, `Fix the JSON syntax errors. Errors found on lines [${v.join(", ")}].`);
      }
      J.debug("readSettings", {
        settingsPath: R,
        rawConfig: x
      });
      let f = {};
      for (let [v, g] of Object.entries(x)) if (v.startsWith("amp.")) {
        let I = v.substring(4);
        f[I] = g;
      }
      return i = f, f;
    } catch (P) {
      if (P.code === "ENOENT") return i = {}, i;
      throw J.error(`Failed to read settings: ${P}`), P;
    }
  }
  async function p(u) {
    await C4.acquire();
    try {
      await o(), await iY(R, P => {
        let k = P;
        for (let [x, f] of Object.entries(u)) {
          let v = QmT(k, [`amp.${x}`], f, {
            formattingOptions: {
              tabSize: 2,
              insertSpaces: !0
            }
          });
          if (v.length > 0) k = ZmT(k, v);
        }
        return {
          newContent: k
        };
      }, {
        mode: 384
      }), i = u;
    } catch (P) {
      throw J.error(`Failed to write settings: ${P}`), P;
    } finally {
      C4.release();
    }
  }
  function _() {
    if (A) return;
    try {
      l = e(R, (u, P) => {
        J.debug("Settings file change detected (fallback watcher)", {
          settingsPath: R,
          curr: u,
          prev: P
        }), m();
      }), A = !0, J.debug("Started watching settings file with fallback watcher (Bun)", {
        settingsPath: R
      });
    } catch (u) {
      J.error("Failed to start fallback file watcher", {
        settingsPath: R,
        error: u
      });
    }
    return;
  }
  function m() {
    if (s) clearTimeout(s);
    s = setTimeout(b, t);
  }
  async function b() {
    try {
      let u = i;
      i = void 0, await new Promise(x => setTimeout(x, r));
      let P = await n(!0),
        k = I_0(u, P);
      if (k.length > 0) i = void 0, h.next(k), J.info("Settings reloaded", {
        changedKeys: k
      });
    } catch (u) {
      J.warn("Failed to handle settings file change", {
        settingsPath: R,
        error: u
      });
    }
  }
  function y() {
    if (c) c.close(), c = void 0;
    if (l) l.close(), l = void 0;
    if (s) clearTimeout(s), s = void 0;
    A = !1, J.debug("Stopped watching settings directory", {
      settingsPath: R
    });
  }
  return {
    async get(u) {
      return (await n())[u];
    },
    async set(u, P, k) {
      let x = await n();
      x[u] = P, await p(x), h.next([u]);
    },
    async delete(u, P) {
      await C4.acquire();
      try {
        await iY(R, x => {
          let f = `amp.${u}`,
            v = QmT(x, [f], void 0, {
              formattingOptions: {
                tabSize: 2,
                insertSpaces: !0
              }
            });
          return {
            newContent: v.length > 0 ? ZmT(x, v) : x
          };
        }, {
          mode: 384
        });
        let k = await n();
        delete k[u], i = k, h.next([u]);
      } catch (k) {
        throw J.error(`Failed to delete setting: ${k}`), k;
      } finally {
        C4.release();
      }
    },
    async keys() {
      let u = await n();
      return Object.keys(u);
    },
    getSettingsFilePath() {
      return R;
    },
    changes: h,
    [Symbol.dispose]() {
      y();
    }
  };
}
async function v_0(T) {
  let R = await kVT(T.settingsFile ?? dA, dA),
    a = await xVT({
      ...T,
      settingsFile: R
    });
  return {
    ...a,
    async set(e, t) {
      return Kk(e, "global"), a.set(e, t);
    },
    async delete(e) {
      return Kk(e, "global"), a.delete(e);
    }
  };
}
async function j_0(T) {
  let {
      workspaceRootPath: R,
      workspaceSettingsPath: a
    } = await f_0(T.cwd),
    e = await xVT({
      ...T,
      settingsFile: a
    }),
    t = new W0(),
    r = e.changes.subscribe(c => t.next(c)),
    h = T.workspaceTrust?.current ?? !1,
    i = T.workspaceTrust?.changes?.subscribe(async c => {
      let s = h;
      if (h = c, !s && c) {
        let A = (await e.keys()).filter(l => bL.includes(l));
        if (A.length > 0) t.next(A);
      }
    });
  return {
    ...e,
    changes: t,
    getWorkspaceRootPath() {
      return R;
    },
    async get(c) {
      if (!h && bL.includes(c)) return;
      return e.get(c);
    },
    async set(c, s) {
      return Kk(c, "workspace"), e.set(c, s);
    },
    async delete(c) {
      return Kk(c, "workspace"), e.delete(c);
    },
    async keys() {
      let c = await e.keys();
      if (!h) return c.filter(s => !bL.includes(s));
      return c;
    },
    [Symbol.dispose]() {
      r.unsubscribe(), i?.unsubscribe(), e[Symbol.dispose]();
    }
  };
}
async function S_0(T) {
  let R = T.getHook,
    a = new W0(),
    e = await v_0(T),
    t = await j_0({
      ...T,
      cwd: T.cwd || process.cwd()
    });
  J.info("Using settings file", {
    settingsPath: e.getSettingsFilePath(),
    workspaceSettingsPath: t.getSettingsFilePath(),
    workspaceRootPath: t.getWorkspaceRootPath()
  });
  let r = e.changes.subscribe(i => a.next(i)),
    h = t.changes.subscribe(i => a.next(i));
  return {
    async get(i, c) {
      let s = async () => {
        switch (c) {
          case "global":
            return e.get(i);
          case "workspace":
            return t.get(i);
          case "admin":
            throw Error("Cannot get admin settings from file storage");
          case void 0:
            break;
        }
        let [A, l] = await Promise.all([e.get(i), t.get(i)]);
        return x_0(i, {
          global: A,
          workspace: l
        });
      };
      return R ? R(i, s) : s();
    },
    async set(i, c, s = "workspace") {
      switch (Kk(i, s), s) {
        case "workspace":
          await t.set(i, c);
          break;
        case "global":
          await e.set(i, c);
          break;
        default:
      }
      a.next([i]);
    },
    async delete(i, c = "workspace") {
      switch (Kk(i, c), c) {
        case "workspace":
          await t.delete(i);
          break;
        case "global":
          await e.delete(i);
          break;
        default:
      }
      a.next([i]);
    },
    async keys() {
      let i = await e.keys(),
        c = await t.keys(),
        s = new Set([...i, ...c]);
      return Array.from(s);
    },
    getSettingsFilePath() {
      return e.getSettingsFilePath();
    },
    getWorkspaceRootPath() {
      return t.getWorkspaceRootPath();
    },
    getWorkspaceSettingsPath() {
      return t.getSettingsFilePath();
    },
    changes: a,
    [Symbol.dispose]() {
      r.unsubscribe(), h.unsubscribe(), e[Symbol.dispose](), t[Symbol.dispose]();
    }
  };
}
function fVT(T) {
  return d_0.join(T.dataDir, C_0);
}
function L_0(T) {
  let R = new Sb(J).scoped("secrets.file"),
    a = new W0(),
    e,
    t = fVT(T),
    r = new Cm();
  async function h() {
    try {
      await Ow.mkdir(T.dataDir, {
        recursive: !0
      });
    } catch (s) {
      throw R.error(`Failed to create data directory: ${s}`), s;
    }
  }
  async function i() {
    if (e) return e;
    try {
      await h();
      let s = await Ow.readFile(t, "utf-8");
      return e = JSON.parse(s), e;
    } catch (s) {
      if (s.code === "ENOENT") return e = {}, e;
      throw R.error("Failed to read secrets", {
        secretsPath: t,
        error: s
      }), s;
    }
  }
  async function c(s) {
    await r.acquire();
    try {
      await h(), await iY(t, () => ({
        newContent: JSON.stringify(s, null, 2)
      }), {
        mode: 384
      }), e = s;
    } catch (A) {
      throw R.error("Failed to write secrets", {
        secretsPath: t,
        error: A
      }), A;
    } finally {
      r.release();
    }
  }
  return {
    async get(s, A) {
      let l = await i(),
        o = ID(A);
      return l[`${s}@${o}`];
    },
    async set(s, A, l) {
      let o = ID(l),
        n = `${s}@${o}`,
        p = await i();
      p[n] = A, await c(p), a.next(n);
    },
    changes: a
  };
}
async function M_0(T, R) {
  let a = new Sb(J).scoped("secrets.file.migrate"),
    e = fVT(T);
  if (!O_0.existsSync(e)) return;
  let t = await Ow.readFile(e, "utf-8"),
    r = JSON.parse(t);
  if (Object.keys(r).length === 0) return;
  if (!T.quiet) E_0.write(`Migrating secrets from file storage to native secret storage...
`);
  let h = [];
  for (let [i, c] of Object.entries(r)) if (typeof c === "string") {
    let s = i.match(/^(.+)@(.+)$/);
    if (s) {
      let [, A, l] = s;
      if (A && l) try {
        await R.set(A, c, l), h.push(i), a.debug(`Successfully migrated secret: ${i}`);
      } catch (o) {
        throw QkT.write(`Failed to migrate secret ${i} to native secret storage
`), o;
      }
    }
  }
  if (h.length > 0) try {
    await Ow.rm(e), a.info("Successfully migrated secrets and removed file storage", {
      migratedKeys: h,
      removed: e
    });
  } catch (i) {
    throw QkT.write(`Failed to remove file storage after migration
`), i;
  }
}
function D_0(T) {
  return typeof T === "function";
}
async function w_0() {
  let T = Reflect.get(globalThis, "__AMP_KEYRING_ENTRY_CLASS__");
  if (D_0(T)) return T;
  return (await Promise.resolve().then(() => E3R(MhT(), 1))).Entry;
}
async function B_0() {
  let T = new Sb(J).scoped("secrets.native"),
    R = new W0(),
    a = {},
    e = await w_0();
  async function t(r, h) {
    let i;
    try {
      i = new URL(h).hostname;
    } catch {
      i = h;
    }
    return new e(`amp.cli.${r}`, i);
  }
  return {
    async get(r, h) {
      let i = ID(h),
        c = `${r}@${i}`;
      if (c in a) return a[c];
      let s = await t(r, i);
      try {
        let A = s.getPassword() || void 0;
        return a[c] = A, A;
      } catch (A) {
        T.warn("failed to get secret", {
          name: r,
          url: h,
          error: A
        }), a[c] = void 0;
        return;
      }
    },
    async set(r, h, i) {
      let c = ID(i),
        s = await t(r, c);
      if (h) s.setPassword(h);else s.deleteCredential();
      let A = `${r}@${c}`;
      a[A] = h, R.next(A);
    },
    changes: R
  };
}
async function otT(T, R) {
  let a = {
    dataDir: T.dataDir || stT
  };
  if (!(await R.get("experimental.cli.nativeSecretsStorage.enabled", "global"))) return J.info("using file-based secrets storage", a), L_0(a);
  J.info("using native secrets storage");
  let e;
  try {
    e = await B_0();
  } catch (t) {
    throw J.error("failed to initialize native secrets storage", {
      error: t,
      platform: "darwin"
    }), Error("Native secret storage is not supported on this machine");
  }
  return await M_0(a, e), e;
}
async function IVT(T) {
  return S_0(T);
}
function U_0({
  onlyFirst: T = !1
} = {}) {
  let R = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"].join("|");
  return new RegExp(R, T ? void 0 : "g");
}
function $VT(T) {
  if (typeof T !== "string") throw TypeError(`Expected a \`string\`, got \`${typeof T}\``);
  return T.replace(H_0, "");
}
function W_0(T) {
  return T === 161 || T === 164 || T === 167 || T === 168 || T === 170 || T === 173 || T === 174 || T >= 176 && T <= 180 || T >= 182 && T <= 186 || T >= 188 && T <= 191 || T === 198 || T === 208 || T === 215 || T === 216 || T >= 222 && T <= 225 || T === 230 || T >= 232 && T <= 234 || T === 236 || T === 237 || T === 240 || T === 242 || T === 243 || T >= 247 && T <= 250 || T === 252 || T === 254 || T === 257 || T === 273 || T === 275 || T === 283 || T === 294 || T === 295 || T === 299 || T >= 305 && T <= 307 || T === 312 || T >= 319 && T <= 322 || T === 324 || T >= 328 && T <= 331 || T === 333 || T === 338 || T === 339 || T === 358 || T === 359 || T === 363 || T === 462 || T === 464 || T === 466 || T === 468 || T === 470 || T === 472 || T === 474 || T === 476 || T === 593 || T === 609 || T === 708 || T === 711 || T >= 713 && T <= 715 || T === 717 || T === 720 || T >= 728 && T <= 731 || T === 733 || T === 735 || T >= 768 && T <= 879 || T >= 913 && T <= 929 || T >= 931 && T <= 937 || T >= 945 && T <= 961 || T >= 963 && T <= 969 || T === 1025 || T >= 1040 && T <= 1103 || T === 1105 || T === 8208 || T >= 8211 && T <= 8214 || T === 8216 || T === 8217 || T === 8220 || T === 8221 || T >= 8224 && T <= 8226 || T >= 8228 && T <= 8231 || T === 8240 || T === 8242 || T === 8243 || T === 8245 || T === 8251 || T === 8254 || T === 8308 || T === 8319 || T >= 8321 && T <= 8324 || T === 8364 || T === 8451 || T === 8453 || T === 8457 || T === 8467 || T === 8470 || T === 8481 || T === 8482 || T === 8486 || T === 8491 || T === 8531 || T === 8532 || T >= 8539 && T <= 8542 || T >= 8544 && T <= 8555 || T >= 8560 && T <= 8569 || T === 8585 || T >= 8592 && T <= 8601 || T === 8632 || T === 8633 || T === 8658 || T === 8660 || T === 8679 || T === 8704 || T === 8706 || T === 8707 || T === 8711 || T === 8712 || T === 8715 || T === 8719 || T === 8721 || T === 8725 || T === 8730 || T >= 8733 && T <= 8736 || T === 8739 || T === 8741 || T >= 8743 && T <= 8748 || T === 8750 || T >= 8756 && T <= 8759 || T === 8764 || T === 8765 || T === 8776 || T === 8780 || T === 8786 || T === 8800 || T === 8801 || T >= 8804 && T <= 8807 || T === 8810 || T === 8811 || T === 8814 || T === 8815 || T === 8834 || T === 8835 || T === 8838 || T === 8839 || T === 8853 || T === 8857 || T === 8869 || T === 8895 || T === 8978 || T >= 9312 && T <= 9449 || T >= 9451 && T <= 9547 || T >= 9552 && T <= 9587 || T >= 9600 && T <= 9615 || T >= 9618 && T <= 9621 || T === 9632 || T === 9633 || T >= 9635 && T <= 9641 || T === 9650 || T === 9651 || T === 9654 || T === 9655 || T === 9660 || T === 9661 || T === 9664 || T === 9665 || T >= 9670 && T <= 9672 || T === 9675 || T >= 9678 && T <= 9681 || T >= 9698 && T <= 9701 || T === 9711 || T === 9733 || T === 9734 || T === 9737 || T === 9742 || T === 9743 || T === 9756 || T === 9758 || T === 9792 || T === 9794 || T === 9824 || T === 9825 || T >= 9827 && T <= 9829 || T >= 9831 && T <= 9834 || T === 9836 || T === 9837 || T === 9839 || T === 9886 || T === 9887 || T === 9919 || T >= 9926 && T <= 9933 || T >= 9935 && T <= 9939 || T >= 9941 && T <= 9953 || T === 9955 || T === 9960 || T === 9961 || T >= 9963 && T <= 9969 || T === 9972 || T >= 9974 && T <= 9977 || T === 9979 || T === 9980 || T === 9982 || T === 9983 || T === 10045 || T >= 10102 && T <= 10111 || T >= 11094 && T <= 11097 || T >= 12872 && T <= 12879 || T >= 57344 && T <= 63743 || T >= 65024 && T <= 65039 || T === 65533 || T >= 127232 && T <= 127242 || T >= 127248 && T <= 127277 || T >= 127280 && T <= 127337 || T >= 127344 && T <= 127373 || T === 127375 || T === 127376 || T >= 127387 && T <= 127404 || T >= 917760 && T <= 917999 || T >= 983040 && T <= 1048573 || T >= 1048576 && T <= 1114109;
}
function q_0(T) {
  return T === 12288 || T >= 65281 && T <= 65376 || T >= 65504 && T <= 65510;
}
function z_0(T) {
  return T >= 4352 && T <= 4447 || T === 8986 || T === 8987 || T === 9001 || T === 9002 || T >= 9193 && T <= 9196 || T === 9200 || T === 9203 || T === 9725 || T === 9726 || T === 9748 || T === 9749 || T >= 9776 && T <= 9783 || T >= 9800 && T <= 9811 || T === 9855 || T >= 9866 && T <= 9871 || T === 9875 || T === 9889 || T === 9898 || T === 9899 || T === 9917 || T === 9918 || T === 9924 || T === 9925 || T === 9934 || T === 9940 || T === 9962 || T === 9970 || T === 9971 || T === 9973 || T === 9978 || T === 9981 || T === 9989 || T === 9994 || T === 9995 || T === 10024 || T === 10060 || T === 10062 || T >= 10067 && T <= 10069 || T === 10071 || T >= 10133 && T <= 10135 || T === 10160 || T === 10175 || T === 11035 || T === 11036 || T === 11088 || T === 11093 || T >= 11904 && T <= 11929 || T >= 11931 && T <= 12019 || T >= 12032 && T <= 12245 || T >= 12272 && T <= 12287 || T >= 12289 && T <= 12350 || T >= 12353 && T <= 12438 || T >= 12441 && T <= 12543 || T >= 12549 && T <= 12591 || T >= 12593 && T <= 12686 || T >= 12688 && T <= 12773 || T >= 12783 && T <= 12830 || T >= 12832 && T <= 12871 || T >= 12880 && T <= 42124 || T >= 42128 && T <= 42182 || T >= 43360 && T <= 43388 || T >= 44032 && T <= 55203 || T >= 63744 && T <= 64255 || T >= 65040 && T <= 65049 || T >= 65072 && T <= 65106 || T >= 65108 && T <= 65126 || T >= 65128 && T <= 65131 || T >= 94176 && T <= 94180 || T === 94192 || T === 94193 || T >= 94208 && T <= 100343 || T >= 100352 && T <= 101589 || T >= 101631 && T <= 101640 || T >= 110576 && T <= 110579 || T >= 110581 && T <= 110587 || T === 110589 || T === 110590 || T >= 110592 && T <= 110882 || T === 110898 || T >= 110928 && T <= 110930 || T === 110933 || T >= 110948 && T <= 110951 || T >= 110960 && T <= 111355 || T >= 119552 && T <= 119638 || T >= 119648 && T <= 119670 || T === 126980 || T === 127183 || T === 127374 || T >= 127377 && T <= 127386 || T >= 127488 && T <= 127490 || T >= 127504 && T <= 127547 || T >= 127552 && T <= 127560 || T === 127568 || T === 127569 || T >= 127584 && T <= 127589 || T >= 127744 && T <= 127776 || T >= 127789 && T <= 127797 || T >= 127799 && T <= 127868 || T >= 127870 && T <= 127891 || T >= 127904 && T <= 127946 || T >= 127951 && T <= 127955 || T >= 127968 && T <= 127984 || T === 127988 || T >= 127992 && T <= 128062 || T === 128064 || T >= 128066 && T <= 128252 || T >= 128255 && T <= 128317 || T >= 128331 && T <= 128334 || T >= 128336 && T <= 128359 || T === 128378 || T === 128405 || T === 128406 || T === 128420 || T >= 128507 && T <= 128591 || T >= 128640 && T <= 128709 || T === 128716 || T >= 128720 && T <= 128722 || T >= 128725 && T <= 128727 || T >= 128732 && T <= 128735 || T === 128747 || T === 128748 || T >= 128756 && T <= 128764 || T >= 128992 && T <= 129003 || T === 129008 || T >= 129292 && T <= 129338 || T >= 129340 && T <= 129349 || T >= 129351 && T <= 129535 || T >= 129648 && T <= 129660 || T >= 129664 && T <= 129673 || T >= 129679 && T <= 129734 || T >= 129742 && T <= 129756 || T >= 129759 && T <= 129769 || T >= 129776 && T <= 129784 || T >= 131072 && T <= 196605 || T >= 196608 && T <= 262141;
}
function F_0(T) {
  if (!Number.isSafeInteger(T)) throw TypeError(`Expected a code point, got \`${typeof T}\`.`);
}
function G_0(T, {
  ambiguousAsWide: R = !1
} = {}) {
  if (F_0(T), q_0(T) || z_0(T) || R && W_0(T)) return 2;
  return 1;
}
function bS(T, R = {}) {
  if (typeof T !== "string" || T.length === 0) return 0;
  let {
    ambiguousIsNarrow: a = !0,
    countAnsiEscapeCodes: e = !1
  } = R;
  if (!e) T = $VT(T);
  if (T.length === 0) return 0;
  let t = 0,
    r = {
      ambiguousAsWide: !a
    };
  for (let {
    segment: h
  } of V_0.segment(T)) {
    let i = h.codePointAt(0);
    if (i <= 31 || i >= 127 && i <= 159) continue;
    if (i >= 8203 && i <= 8207 || i === 65279) continue;
    if (i >= 768 && i <= 879 || i >= 6832 && i <= 6911 || i >= 7616 && i <= 7679 || i >= 8400 && i <= 8447 || i >= 65056 && i <= 65071) continue;
    if (i >= 55296 && i <= 57343) continue;
    if (i >= 65024 && i <= 65039) continue;
    if (X_0.test(h)) continue;
    if (K_0.default().test(h)) {
      t += 2;
      continue;
    }
    t += G_0(i, r);
  }
  return t;
}
function Z_0() {
  let T = new Map();
  for (let [R, a] of Object.entries(w3)) {
    for (let [e, t] of Object.entries(a)) w3[e] = {
      open: `\x1B[${t[0]}m`,
      close: `\x1B[${t[1]}m`
    }, a[e] = w3[e], T.set(t[0], t[1]);
    Object.defineProperty(w3, R, {
      value: a,
      enumerable: !1
    });
  }
  return Object.defineProperty(w3, "codes", {
    value: T,
    enumerable: !1
  }), w3.color.close = "\x1B[39m", w3.bgColor.close = "\x1B[49m", w3.color.ansi = ZkT(), w3.color.ansi256 = JkT(), w3.color.ansi16m = TxT(), w3.bgColor.ansi = ZkT(10), w3.bgColor.ansi256 = JkT(10), w3.bgColor.ansi16m = TxT(10), Object.defineProperties(w3, {
    rgbToAnsi256: {
      value: (R, a, e) => {
        if (R === a && a === e) {
          if (R < 8) return 16;
          if (R > 248) return 231;
          return Math.round((R - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(R / 255 * 5) + 6 * Math.round(a / 255 * 5) + Math.round(e / 255 * 5);
      },
      enumerable: !1
    },
    hexToRgb: {
      value: R => {
        let a = /[a-f\d]{6}|[a-f\d]{3}/i.exec(R.toString(16));
        if (!a) return [0, 0, 0];
        let [e] = a;
        if (e.length === 3) e = [...e].map(r => r + r).join("");
        let t = Number.parseInt(e, 16);
        return [t >> 16 & 255, t >> 8 & 255, t & 255];
      },
      enumerable: !1
    },
    hexToAnsi256: {
      value: R => w3.rgbToAnsi256(...w3.hexToRgb(R)),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value: R => {
        if (R < 8) return 30 + R;
        if (R < 16) return 90 + (R - 8);
        let a, e, t;
        if (R >= 232) a = ((R - 232) * 10 + 8) / 255, e = a, t = a;else {
          R -= 16;
          let i = R % 36;
          a = Math.floor(R / 36) / 5, e = Math.floor(i / 6) / 5, t = i % 6 / 5;
        }
        let r = Math.max(a, e, t) * 2;
        if (r === 0) return 30;
        let h = 30 + (Math.round(t) << 2 | Math.round(e) << 1 | Math.round(a));
        if (r === 2) h += 60;
        return h;
      },
      enumerable: !1
    },
    rgbToAnsi: {
      value: (R, a, e) => w3.ansi256ToAnsi(w3.rgbToAnsi256(R, a, e)),
      enumerable: !1
    },
    hexToAnsi: {
      value: R => w3.ansi256ToAnsi(w3.hexToAnsi256(R)),
      enumerable: !1
    }
  }), w3;
}
function hb0(T, R, a) {
  return String(T).normalize().replaceAll(`\r
`, `
`).split(`
`).map(e => rb0(e, R, a)).join(`
`);
}
function SVT(T, R) {
  return hb0(T, R, {
    hard: !0,
    wordWrap: !0,
    trim: !0
  });
}
function ltT(T, R = {}) {
  let a = {
      baseIndent: "  ",
      firstColumnColor: oR.green
    },
    {
      baseIndent: e,
      firstColumnColor: t
    } = {
      ...a,
      ...R
    };
  if (T.length === 0) return "";
  let r = T.reduce((h, [i]) => Math.max(h, i.length), 0) + 2;
  return T.map(([h, i]) => {
    let c = h.padEnd(r),
      s = t(c),
      A = e + " ".repeat(r),
      l = (process.stdout.columns || 120) - A.length,
      o = SVT(i, l).split(`
`).map((n, p) => p === 0 ? n : A + n).join(`
`);
    return e + s + o;
  }).join(`
`) + `
`;
}
function AtT(T, R = {}) {
  let a = {
      baseIndent: "  ",
      descriptionIndent: "    ",
      labelColor: oR.green
    },
    {
      baseIndent: e,
      descriptionIndent: t,
      labelColor: r
    } = {
      ...a,
      ...R
    };
  if (T.length === 0) return "";
  return T.map(([h, i]) => {
    let c = r(h),
      s = e + t,
      A = (process.stdout.columns || 120) - s.length,
      l = SVT(i, A).split(`
`).map((o, n) => n === 0 ? o : s + o).join(`
`);
    return e + c + `
` + s + l;
  }).join(`
`) + `
`;
}
function ib0() {
  let T = "";
  T += oR.bold("Environment variables:") + `

`;
  let R = [["AMP_API_KEY", "Access token for Amp (see https://ampcode.com/settings)"], ["AMP_URL", `URL for the Amp service (default is ${Lr})`], ["AMP_LOG_LEVEL", "Set log level (can also use --log-level)"], ["AMP_LOG_FILE", "Set log file location (can also use --log-file)"], ["AMP_SETTINGS_FILE", `Set settings file path (can also use --settings-file, default: ${dA})`]];
  T += ltT(R), T += `
`, T += oR.bold("Examples:") + `

`;
  for (let e of L4.examples) if (T += e.description + `

`, T += `  $ ${oR.green(e.command)}
`, e.output) {
    let t = e.output.split(`
`).filter(r => r.trim() !== "");
    T += t.map(r => "  " + oR.dim(r)).join(`
`), T += `

`;
  } else T += `
`;
  T += oR.bold("Configuration:") + `

`, T += L4.configuration.description + `

`, T += oR.bold("Settings reference:") + `

`;
  let a = L4.configuration.keyDescriptions.map(e => [e.key, e.description]);
  return T += AtT(a), T += `
`, T += oR.bold("Example configuration:") + `

`, T += L4.configuration.sampleConfig + `

`, T;
}
function cb0(T, R) {
  let a = (i, c) => {
      if (i.length === 0) return "";
      let s = oR.bold(c) + `

`,
        A = i.map(l => [l.flags, l.description]);
      return s += AtT(A), s + `
`;
    },
    e = "";
  if (T.parent === null) e += oR.bold("Amp CLI") + `

`;
  let t = [];
  {
    let i = T;
    while (i.parent) t.unshift(i.name()), i = i.parent;
    t.unshift(i.name());
  }
  let r = T.usage().replace(/^[^ ]*/, t.join(" ") + " [options]");
  if (e += oR.bold("Usage:") + " " + oR.green(r) + `

`, T.parent !== null && T.description()) e += T.description() + `

`;
  let h = T.commands.filter(i => !i._hidden);
  if (h.length > 0) e += oR.bold("Commands:") + `

`, e += sb0(h), e += `
`;
  if (e += a(T.options.filter(i => !i.hidden), "Options:"), T.parent) {
    let i = T.parent;
    while (i.parent) i = i.parent;
    let c = new Set(T.options.map(s => s.flags));
    e += a(i.options.filter(s => !s.hidden).filter(s => !c.has(s.flags)).filter(s => {
      let A = s.flags.includes("--execute"),
        l = s.flags.includes("--interactive");
      return !A && !l;
    }), "Global options:");
  }
  return e;
}
function OVT(T, R = 0) {
  let a = [];
  for (let e of T) {
    a.push({
      cmd: e,
      level: R
    });
    let t = e.commands.filter(r => !r._hidden);
    if (t.length > 0) a.push(...OVT(t, R + 1));
  }
  return a;
}
function sb0(T, R = "  ") {
  let a = OVT(T).map(({
    cmd: e,
    level: t
  }) => {
    let r = R.repeat(t),
      h = e.aliases(),
      i = e.summary() || e.description(),
      c = h.length > 0 ? `[alias: ${h.join(", ")}] ` : "";
    return [r + e.name(), c + i];
  });
  return ltT(a);
}
function ji() {
  return process.env.TERMINAL_EMULATOR?.includes("JetBrains") ?? !1;
}
function ob0() {
  return process.env.TERM_PROGRAM !== void 0 && process.env.TERM_PROGRAM === "vscode";
}
function nb0() {
  return process.env.NVIM !== void 0;
}
function ub0() {
  return !1;
}
function yA(T) {
  let R = EVT.homedir();
  if (T.startsWith(R)) return T.replace(R, "~");
  return T;
}
async function CVT() {
  let T = process.env.PATH || "",
    R = ub0(),
    a = T.split(":").filter(r => r.trim()),
    e = !1,
    t = a.flatMap(r => {
      if (e) return [lF(r, "amp.bat"), lF(r, "amp.exe")];else return [lF(r, "amp")];
    });
  return (await Promise.all(t.map(async r => {
    try {
      let h = e ? txT.F_OK : txT.X_OK;
      return await mb0(r, h), r;
    } catch {
      return null;
    }
  }))).filter(r => r !== null);
}
function fb(T, R, a = 1e4) {
  return new Promise(e => {
    let t = bb0(T, R, {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: a,
        shell: !1
      }),
      r = "";
    t.stdout.on("data", h => {
      r += h.toString();
    }), t.stderr.on("data", h => {
      r += h.toString();
    }), t.on("close", (h, i) => {
      if (i === "SIGTERM") e({
        reason: "fail",
        output: (r + `
timeout`).trim()
      });else if (h === 0) e({
        reason: "success",
        output: r.trim()
      });else e({
        reason: "fail",
        output: (r + `
Exit code ${h}`).trim()
      });
    }), t.on("error", h => {
      e({
        reason: "missing",
        output: h.message.trim()
      });
    });
  });
}
function rxT(T) {
  return T.replace(/\\/g, "/");
}
function LVT() {
  return "which amp";
}
async function yb0(T, R) {
  let a = await CVT(),
    [e] = a;
  if (!e) return {
    status: "missing",
    warning: "[WARN] amp not accessible via PATH"
  };
  if (rxT(e) === rxT(R)) return {
    status: "same"
  };
  let t = `[WARN] Found amp at ${yA(e)} in PATH, but expected version ${T} from ${yA(R)}. Another version may be installed.`;
  if (a.length > 0) {
    t += `
[WARN] Found amp executables at these locations:`;
    for (let r of a) t += `
  ${yA(r)}`;
  }
  return t += `
[WARN] To resolve this, ensure the correct amp is at the front of your PATH.`, t += `
[WARN] Run "${LVT()}" in your shell to see which amp executable is currently being used.`, {
    status: "different",
    warning: t
  };
}
async function Ew(T, R = {}) {
  if (R.currentExecutablePath) return yb0(T, R.currentExecutablePath);
  let {
    reason: a,
    output: e
  } = await fb("amp", ["--version"]);
  switch (a) {
    case "success":
      {
        let t = e.trim().split(" ")[0];
        if (t === T) return {
          status: "same"
        };else {
          let r = await CVT(),
            h = `[WARN] Found amp ${t} in PATH, but expected ${T}. Another version is installed.`;
          if (r.length > 0) {
            h += `
[WARN] Found amp executables at these locations:`;
            for (let i of r) h += `
  ${yA(i)}`;
          }
          return h += `
[WARN] To resolve this, ensure the correct amp is at the front of your PATH.`, h += `
[WARN] Run "${LVT()}" in your shell to see which amp executable is currently being used.`, {
            status: "different",
            warning: h
          };
        }
      }
    case "missing":
      return {
        status: "missing",
        warning: "[WARN] amp not accessible via PATH"
      };
    case "fail":
      {
        let t = '[WARN] failed to run "amp --version":';
        if (e) t += `
${e.trim()}`;
        return {
          status: "fail",
          warning: t
        };
      }
  }
}
function Pb0() {
  let T = process.env.AMP_HOME;
  if (!T) return {
    ripgrepTargetDir: null,
    installLocalBin: !1,
    checkVersion: !0
  };
  let R = mh.join(T, "bin"),
    a = mh.join(H_.homedir(), ".amp");
  if (T !== a) return rt.blue("[INFO] Custom AMP_HOME detected - skipping installation of ~/.local/bin/amp (assuming testing mode)"), {
    ripgrepTargetDir: R,
    installLocalBin: !1,
    checkVersion: !1
  };
  return {
    ripgrepTargetDir: R,
    installLocalBin: !0,
    checkVersion: !0
  };
}
async function kb0(T, R, a) {
  if (await lb0(T, {
    recursive: !0
  }), await GHR(T, R)) {
    if (a) rt.green("\u2713 ripgrep spell successfully conjured");
  } else {
    rt.red("\u2717 Failed to install ripgrep"), process.exitCode = 1;
    return;
  }
}
async function xb0() {
  let T = !1,
    R = mh.join(H_.homedir(), ".local", "bin");
  if (!dVT(R)) _b0(R, {
    recursive: !0
  });
  if (T) {
    let e = mh.join(R, "amp.bat"),
      t = `@echo off
REM Amp CLI PATH wrapper - simply execs the main script
if defined AMP_HOME (
    "%AMP_HOME%\\bin\\amp.bat" %*
) else (
    "%USERPROFILE%\\.amp\\bin\\amp.bat" %*
)
`;
    exT(e, `@echo off
REM Amp CLI PATH wrapper - simply execs the main script
if defined AMP_HOME (
    "%AMP_HOME%\\bin\\amp.bat" %*
) else (
    "%USERPROFILE%\\.amp\\bin\\amp.bat" %*
)
`);
  } else {
    let e = mh.join(R, "amp"),
      t = `#!/usr/bin/env bash
# Amp CLI PATH wrapper - simply execs the main script
exec "\${AMP_HOME:-$HOME/.amp}/bin/amp" "$@"
`;
    exT(e, `#!/usr/bin/env bash
# Amp CLI PATH wrapper - simply execs the main script
exec "\${AMP_HOME:-$HOME/.amp}/bin/amp" "$@"
`);
    try {
      pb0(e, 493);
    } catch {}
  }
  let a = T ? mh.join(R, "amp.bat") : mh.join(R, "amp");
  rt.green(`\u2713 The wizard's staff is ready at ${yA(a)}`);
}
async function fb0() {
  let T = "zsh",
    R = mh.basename(process.env.SHELL || T),
    a = {
      fish: {
        configPaths: [mh.join(H_.homedir(), ".config", "fish", "config.fish")],
        command: 'fish_add_path "~/.local/bin"',
        refreshCommand: "source ~/.config/fish/config.fish"
      },
      nu: {
        configPaths: [mh.join(H_.homedir(), ".config", "nushell", "env.nu")],
        command: "$env.PATH ++= ['~/.local/bin']",
        refreshCommand: "source ~/.config/nushell/env.nu"
      },
      zsh: {
        configPaths: [mh.join(H_.homedir(), ".zshrc")],
        command: 'export PATH="$HOME/.local/bin:$PATH"',
        refreshCommand: "exec $SHELL"
      },
      bash: {
        configPaths: [mh.join(H_.homedir(), ".bashrc"), mh.join(H_.homedir(), ".bash_profile")],
        command: 'export PATH="$HOME/.local/bin:$PATH"',
        refreshCommand: "source ~/.bashrc"
      }
    }[R];
  if (!a) {
    rt.yellow("Manually add the directory to your shell configuration:"), rt.bold('  export PATH="$HOME/.local/bin:$PATH"');
    return;
  }
  if (await Ib0(a)) rt.blue(`
To awaken the orb, run:
`), rt.bold(`  ${a.refreshCommand}`), rt.bold("  amp --help");else rt.yellow(`
Manually weave this spell into your shell configuration:`), rt.bold(`  ${a.command}`);
}
async function Ib0(T) {
  for (let R of T.configPaths) {
    let a = yA(R);
    if (dVT(R)) try {
      return rt.blue(`[INFO] Adding PATH to "${a}"`), await Ab0(R, `
# amp
` + T.command + `
`, {
        flag: "a"
      }), rt.green(`\u2713 Added "~/.local/bin" to PATH in "${a}"`), !0;
    } catch (e) {
      rt.red(`[WARN] Failed to update ${a}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return !1;
}
async function gb0(T, R, a) {
  let e = Pb0();
  if (e.ripgrepTargetDir) await kb0(e.ripgrepTargetDir, T, R);
  if (e.installLocalBin) await xb0();
  let t = !1;
  if (e.checkVersion) {
    let r = await Ew(a);
    if (R) rt.blue(`[INFO] "amp --version" state is ${r.status}`);
    if (r.warning) rt.yellow(r.warning);
    t = r.status === "missing";
  }
  if (t && e.installLocalBin) await fb0();
}
async function Sb0(T) {
  switch (T) {
    case "npm":
      {
        let R = await fb("npm", ["list", "-g", "-p"]);
        if (R.reason !== "success") return J.debug("Failed to get npm global path", {
          result: R
        }), ["/usr/local/lib/node_modules/"];
        if (!R.output) return ["/usr/local/lib/node_modules/"];
        let a = `/usr/local/lib/node_modules/
${R.output}`.split(`
`).map(e => e.trim()).filter(e => e).sort();
        return a.filter((e, t) => {
          let r = a[t + 1];
          return !r || !r.includes(e);
        });
      }
    case "pnpm":
      {
        let R = await fb("pnpm", ["list", "-g", "--json"]);
        if (R.reason !== "success") return J.debug("Failed to get pnpm global path", {
          result: R
        }), [];
        let a = JSON.parse(R.output);
        if (Array.isArray(a) && a[0]?.path) return [a[0].path];
        return [];
      }
    case "yarn":
      {
        let R = await fb("yarn", ["global", "dir"]);
        if (R.reason !== "success") return J.debug("Failed to get yarn global path", {
          result: R
        }), [];
        return R.output ? [R.output] : [];
      }
    case "bun":
      return ["/.bun/install/global/"];
    case "brew":
      return [];
    case "bootstrap":
      return [];
    case "binary":
      return [];
  }
}
function MVT() {
  if (process.env.AMP_HOME) return !1;
  let T = process.execPath;
  if (T.includes("/node_modules/") || T.includes("\\node_modules\\")) return !1;
  if (sY(T)) return !1;
  return !0;
}
function sY(T) {
  return ["/opt/homebrew/Cellar/ampcode/", "/usr/local/Cellar/ampcode/", "/home/linuxbrew/.linuxbrew/Cellar/ampcode/"].some(R => T.includes(R));
}
async function DVT() {
  if (sY(process.execPath)) return "brew";
  if (MVT()) return "binary";
  if (process.env.AMP_HOME) return "bootstrap";
  try {
    let T = process.argv[1] || "";
    J.debug("Detecting package manager from script path", {
      currentScript: T
    });
    let R = T;
    try {
      R = await $b0(T), J.debug("Resolved path", {
        from: T,
        to: R
      });
    } catch (r) {
      J.debug("Error resolving path", {
        error: r
      });
    }
    if (J.debug("Resolved installation path", {
      actualPath: R
    }), sY(R)) return "brew";
    let a = ["pnpm", "yarn", "bun", "npm"];
    for (let r of a) try {
      let h = await Sb0(r);
      if (h.length === 0) continue;
      if (J.debug("package manager global paths found", {
        packageManager: r,
        globalPaths: h
      }), h.some(i => R.includes(i))) return r;
    } catch (h) {
      J.debug("Failed to query package manager global path", {
        packageManager: r,
        error: h
      });
    }
    J.debug("Checking installation directory for lockfiles");
    let e = hxT(hxT(R));
    J.debug("Checking installation directory", {
      installDir: e
    });
    let t = [{
      file: "pnpm-lock.yaml",
      manager: "pnpm"
    }, {
      file: "yarn.lock",
      manager: "yarn"
    }, {
      file: "bun.lockb",
      manager: "bun"
    }, {
      file: "package-lock.json",
      manager: "npm"
    }];
    for (let {
      file: r,
      manager: h
    } of t) try {
      let i = jb0(e, r);
      return J.debug("Checking for lockfile", {
        filePath: i
      }), await vb0(i), J.debug("Found package manager lockfile", {
        file: r,
        manager: h,
        filePath: i
      }), h;
    } catch (i) {
      J.debug("Lockfile not found", {
        file: r,
        error: i
      });
    }
    return J.debug("Could not determine package manager from node_modules path"), null;
  } catch (T) {
    return J.debug("Error detecting installed package manager", {
      error: T
    }), null;
  }
}
async function Ob0() {
  let T = process.env.npm_config_user_agent;
  if (T) {
    if (T.includes("pnpm")) return "pnpm";
    if (T.includes("yarn")) return "yarn";
    if (T.includes("bun")) return "bun";
    if (T.includes("npm")) return "npm";
  }
  if (process.env.PNPM_HOME || process.env.PNPM_SCRIPT_SRC_DIR) return "pnpm";
  if (process.env.YARN_WRAP_OUTPUT || process.env.YARNPKG_LOCKFILE_VERSION) return "yarn";
  if (process.env.BUN_INSTALL) return "bun";
  let [R, a, e, t] = await Promise.allSettled([M4("pnpm"), M4("yarn"), M4("bun"), M4("npm")]);
  if (R.status === "fulfilled" && R.value) return "pnpm";
  if (a.status === "fulfilled" && a.value) return "yarn";
  if (e.status === "fulfilled" && e.value) return "bun";
  if (t.status === "fulfilled" && t.value) return "npm";
  return null;
}
async function M4(T) {
  J.debug("Checking command existence", {
    command: T
  });
  let R = await fb(T, ["--version"]);
  if (R.reason === "success") return J.debug("Command found", {
    command: T,
    version: R.output
  }), !0;else return J.debug("Command not found or failed", {
    command: T,
    result: R
  }), !1;
}
function db0(T, R) {
  let a = R ? `@sourcegraph/amp@${R}` : "@sourcegraph/amp";
  switch (T) {
    case "npm":
      return ["npm", ["install", "-g", a]];
    case "pnpm":
      return ["pnpm", ["add", "-g", a]];
    case "yarn":
      return ["yarn", ["global", "add", a]];
    case "bun":
      return ["bun", ["add", "-g", a]];
    case "brew":
      return ["brew", ["upgrade", "ampcode/tap/ampcode"]];
    case "bootstrap":
      throw Error("Bootstrap updates are handled separately");
    case "binary":
      throw Error("Binary updates are handled separately");
  }
}
function cxT(T, R) {
  let a = R?.decimalPlaces ?? 2;
  if (T < 1024) return `${T} ${o9(T, "byte")}`;
  let e = T / 1024,
    t = 0;
  while (e >= 1024 && t < ixT.length - 1) e /= 1024, t += 1;
  let r = ixT[t];
  if (!r) throw Error(`(bug) missing byte size unit for index ${t}`);
  return `${e.toFixed(a)} ${r}`;
}
function Nb0(T) {
  if (!T) return;
  let R = Number(T);
  if (!Number.isFinite(R) || R <= 0) return;
  return R;
}
function Ub0(T, R) {
  let a = cxT(T, {
    decimalPlaces: 2
  });
  if (R === void 0) return `(${a})`;
  let e = cxT(R, {
    decimalPlaces: 2
  });
  return `(${a}/${e})`;
}
async function Hb0(T, R) {
  let a = Nb0(T.headers?.get?.("content-length") ?? null),
    e = T.body?.getReader();
  if (!e) {
    let c = new Uint8Array(await T.arrayBuffer());
    return R?.(c.byteLength, a), c;
  }
  let t = [],
    r = 0;
  while (!0) {
    let {
      done: c,
      value: s
    } = await e.read();
    if (c) break;
    if (!s) continue;
    t.push(s), r += s.byteLength, R?.(r, a);
  }
  if (t.length === 1) {
    let [c] = t;
    if (c) return c;
  }
  let h = new Uint8Array(r),
    i = 0;
  for (let c of t) h.set(c, i), i += c.byteLength;
  return h;
}
function BVT() {
  if (process.env.AMP_HOME) return process.env.AMP_HOME;
  let T = wb0();
  if (!T) throw Error("Cannot determine home directory");
  return mS(T, ".amp");
}
function sxT(T) {
  Lb0(T, {
    recursive: !0,
    mode: 448
  }), wVT(T, 448);
}
function Wb0() {
  try {
    return Eb0("sysctl -a 2>/dev/null", {
      encoding: "utf8"
    }).includes("AVX2");
  } catch {}
  return !1;
}
function qb0() {
  let {
    platform: T,
    arch: R
  } = process;
  if (T === "darwin") {
    if (R === "arm64") return "darwin-arm64";
    return "darwin-x64";
  }
  if (T === "win32") return "windows-x64";
  if (T === "linux") {
    if (R === "arm64") return "linux-arm64";
    return Wb0() ? "linux-x64" : "linux-x64-baseline";
  }
  return "linux-x64";
}
async function lY(T, R = 300000) {
  let a = new AbortController(),
    e = setTimeout(() => a.abort(), R);
  try {
    let t = await fetch(T, {
      signal: a.signal
    });
    return clearTimeout(e), t;
  } catch (t) {
    if (clearTimeout(e), t instanceof Error && t.name === "AbortError") throw Error(`Network timeout after ${R}ms while fetching: ${T}`);
    throw t;
  }
}
function zb0(T, R) {
  let a = Mb0(T),
    e = Cb0("sha256");
  e.update(a);
  let t = e.digest("hex");
  if (t !== R) throw Error(`Checksum verification failed for ${T}
Expected: ${R}
Actual:   ${t}`);
}
function NVT() {
  let T = BVT(),
    R = mS(T, "bin");
  return mS(R, !1 ? "amp.exe" : "amp");
}
async function Fb0() {
  let T = `${nY}/cli-version.txt`,
    R = await lY(T);
  if (!R.ok) throw Error(`Failed to fetch latest version: ${R.status}`);
  return (await R.text()).trim();
}
function oxT(T) {
  return T;
}
function UVT(T) {
  let R = Bb0(T);
  return `${R ? T.slice(0, T.length - R.length) : T}.old${R}`;
}
function Gb0(T) {
  return oxT(process.execPath) === oxT(T);
}
function Kb0(T, R) {
  let a = UVT(T);
  if (ptT(a)) _tT(a);
  jv(T, a);
  try {
    jv(R, T);
  } catch (e) {
    try {
      jv(a, T);
    } catch (t) {
      throw Error(`Failed to install Windows binary update and restore original binary: ${t instanceof Error ? t.message : String(t)}`);
    }
    throw e;
  }
  J.info("Binary updated successfully", {
    binaryPath: T,
    oldBinaryPath: a
  });
}
function tQ0() {
  return;
}
async function Vb0(T, R) {
  let a = qb0(),
    e = BVT();
  sxT(e);
  let t = mS(e, "bin");
  sxT(t);
  let r = T || (await Fb0()),
    h = a.startsWith("windows"),
    i = h ? `amp-${a}.exe` : `amp-${a}`,
    c = `${a}-amp.sha256`,
    s = `${nY}/${r}/${i}`,
    A = `${nY}/${r}/${c}`,
    l = NVT(),
    o = mS(t, h ? "amp.download.tmp.exe" : "amp.download.tmp");
  J.debug("Downloading binary update", {
    platform: a,
    version: r,
    binaryUrl: s
  });
  try {
    let n = await lY(A);
    if (!n.ok) throw Error(`Failed to fetch checksum: ${n.status}`);
    let p = (await n.text()).trim();
    J.debug("Downloading binary", {
      binaryUrl: s
    });
    let _ = await lY(s);
    if (!_.ok) throw Error(`Failed to download binary: ${_.status}`);
    let m = await Hb0(_, (b, y) => {
      R?.(`Downloading update ${Ub0(b, y)}`);
    });
    if (Db0(o, m), zb0(o, p), !h) wVT(o, 493);
    if (h) {
      if (Gb0(l)) {
        Kb0(l, o);
        return;
      }
      jv(o, l), J.info("Binary updated successfully", {
        binaryPath: l
      });
      return;
    }
    jv(o, l), J.info("Binary updated successfully", {
      binaryPath: l
    });
  } catch (n) {
    if (ptT(o)) try {
      _tT(o);
    } catch {}
    throw Error(`Binary update failed: ${n instanceof Error ? n.message : String(n)}`);
  }
}
function pF(T) {
  if (T = T.replace(/\/$/, ""), !T.startsWith("http://") && !T.startsWith("https://")) T = `https://${T}`;
  try {
    return new URL(T), T;
  } catch {
    return J.warn(`Invalid registry URL: ${T}, falling back to npmjs.org`), "https://registry.npmjs.org";
  }
}
function fH() {
  if (hs) return hs;
  let T = process.env.NPM_CONFIG_REGISTRY;
  if (T) return hs = pF(T), hs;
  try {
    try {
      let a = lxT("npm config get @sourcegraph:registry", {
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      if (a && a !== "undefined") return hs = pF(a), hs;
    } catch {}
    let R = lxT("npm config get registry", {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (R && R !== "undefined") return hs = pF(R), hs;
  } catch {}
  return hs = "https://registry.npmjs.org", hs;
}
function Jb0() {
  if (process.env.AMP_HOME) return process.env.AMP_HOME;
  let T = Zb0();
  if (!T) throw Error("Cannot determine home directory. Set AMP_HOME environment variable to ~/.amp and try again.");
  return gs(T, ".amp");
}
async function btT(T, R = 300000) {
  let a = new AbortController(),
    e = setTimeout(() => a.abort(), R);
  try {
    let t = await fetch(T, {
      signal: a.signal
    });
    return clearTimeout(e), t;
  } catch (t) {
    if (clearTimeout(e), t instanceof Error && t.name === "AbortError") throw Error(`Network timeout after ${R}ms while fetching: ${T}`);
    throw t;
  }
}
async function Tm0() {
  let T = process.env.AMP_VERSION;
  if (T) return T;
  let R = fH(),
    a = await btT(`${R}/@sourcegraph%2Famp`);
  if (!a.ok) throw Error("Failed to fetch package metadata from npm registry");
  let e = (await a.json())["dist-tags"]?.latest;
  if (!e) throw Error("Failed to find latest version in npm registry");
  return e;
}
async function Rm0(T) {
  let R = fH(),
    a = await btT(`${R}/@sourcegraph%2Famp/${T}`);
  if (!a.ok) throw Error(`Failed to fetch metadata for version ${T}`);
  let e = await a.json(),
    t = e.dist?.tarball,
    r = e.dist?.integrity;
  if (!t) throw Error(`Failed to find tarball URL for version ${T}`);
  return {
    tarballUrl: t,
    integrity: r
  };
}
function am0(T) {
  if (!T) return null;
  let R = T.match(/sha256-([A-Za-z0-9+/=]+)/);
  if (R?.[1]) {
    let e = R[1];
    return {
      algorithm: "sha256",
      hash: Buffer.from(e, "base64").toString("hex")
    };
  }
  let a = T.match(/sha512-([A-Za-z0-9+/=]+)/);
  if (a?.[1]) {
    let e = a[1];
    return {
      algorithm: "sha512",
      hash: Buffer.from(e, "base64").toString("hex")
    };
  }
  return null;
}
function em0(T, R) {
  if (!R) return;
  let a = HVT(T),
    e = Xb0(R.algorithm);
  e.update(a);
  let t = e.digest("hex");
  if (t !== R.hash) throw Error(`Checksum verification failed for ${T}
Expected: ${R.hash}
Actual:   ${t}`);
}
async function tm0(T, R, a) {
  let e = gs(R, "package.tgz");
  J.debug("Downloading package from npm registry", {
    tarballUrl: T
  });
  let t = await btT(T);
  if (!t.ok) throw Error("Failed to download package from npm registry");
  let r = await t.arrayBuffer();
  Qb0(e, new Uint8Array(r));
  let h = am0(a);
  em0(e, h);
  let i = !1;
  try {
    if (i) AF("where tar", {
      stdio: "pipe"
    });else AF("which tar", {
      stdio: "pipe"
    });
  } catch {
    throw Error("tar command not found. Please install tar to extract packages.");
  }
  try {
    AF(`tar -xzf "${e}" -C "${R}"`, {
      stdio: "pipe"
    });
  } catch (c) {
    throw Error(`Failed to extract tarball: ${c instanceof Error ? c.message : String(c)}`);
  }
  k$(e);
}
function rm0(T, R) {
  let a = gs(T, "package"),
    e = gs(a, "dist", "main.js"),
    t = gs(a, "package.json");
  if (!Sl(e) || !Sl(t)) return !0;
  try {
    return JSON.parse(HVT(t, "utf8")).version !== R;
  } catch {
    return !0;
  }
}
async function hm0(T) {
  let R = Jb0(),
    a = gs(R, "package"),
    e = T || (await Tm0());
  if (!rm0(R, e)) {
    J.debug("Bootstrap installation is already up to date", {
      version: e
    });
    return;
  }
  J.debug("Updating bootstrap installation", {
    version: e,
    ampHome: R
  });
  let {
      tarballUrl: t,
      integrity: r
    } = await Rm0(e),
    h = gs(R, ".package.staging");
  try {
    if (Sl(h)) k$(h, {
      recursive: !0
    });
    Yb0(h, {
      recursive: !0
    }), await tm0(t, h, r);
    let i = gs(h, "package");
    if (!Sl(i)) throw Error("package/ directory not found in npm tarball");
    let c = gs(i, "dist", "main.js");
    if (!Sl(c)) throw Error("dist/main.js not found in extracted package");
    if (Sl(a)) {
      let s = gs(R, ".package.backup");
      if (Sl(s)) k$(s, {
        recursive: !0
      });
      nxT(a, s);
    }
    nxT(i, a), k$(h, {
      recursive: !0
    }), J.debug("Bootstrap installation updated successfully", {
      version: e
    });
  } catch (i) {
    if (Sl(h)) k$(h, {
      recursive: !0
    });
    throw i;
  }
}
function WVT(T) {
  let R = T.replace(/^v/, ""),
    [a, e, t] = R.split(".").map(Number);
  if (a === void 0 || e === void 0 || t === void 0) return;
  if (Number.isNaN(a) || Number.isNaN(e) || Number.isNaN(t)) return;
  return [a, e, t];
}
async function AxT(T) {
  let {
    reason: R,
    output: a
  } = await fb(T, ["--version"]);
  if (R !== "success") {
    J.error("Failed to get current Bun version", {
      output: a
    });
    return;
  }
  let e = a.trim(),
    t = WVT(e);
  if (!t) {
    J.error("Failed to parse Bun version from output", {
      output: a
    });
    return;
  }
  return t;
}
function im0(T, R) {
  for (let a = 0; a < T.length; a++) {
    if (T[a] < R[a]) return -1;
    if (T[a] > R[a]) return 1;
  }
  return 0;
}
function cm0(T, R) {
  return im0(T, R) < 0;
}
async function sm0(T, R = 300000) {
  J.info("Running bun upgrade", {
    bunPath: T
  });
  let {
    reason: a,
    output: e
  } = await fb(T, ["upgrade"], R);
  if (a === "success") {
    J.info("Bun upgrade completed successfully");
    return;
  }
  throw J.error("Failed to upgrade Bun", {
    reason: a,
    output: e
  }), Error(`Failed to upgrade Bun: ${a}`);
}
async function om0(T) {
  try {
    let R = process.env.AMP_HOME;
    if (!R) throw Error("AMP_HOME environment variable is not set");
    let a = `${R}/bin/bun`,
      e = await AxT(a);
    if (!e) return J.warn("Unable to determine Bun version, skipping update"), !1;
    let t = WVT(_F);
    if (!t) throw Error(`Invalid EXPECTED_BUN_VERSION: ${_F}`);
    if (J.debug("Checking Bun version", {
      currentVersion: e,
      expectedVersion: t
    }), !cm0(e, t)) return !1;
    J.info("Updating Bun", {
      currentVersion: e.join("."),
      expectedMinimum: _F
    }), T?.("bun upgrade"), await sm0(a);
    let r = await AxT(a);
    return J.info("Bun updated", {
      newVersion: r
    }), !0;
  } catch (R) {
    return J.warn("Failed to update Bun", {
      error: R instanceof Error ? R.message : String(R)
    }), !1;
  }
}
async function qVT(T, R, a, e) {
  let t = R ?? null;
  if (!t) t = await DVT();
  if (!t) t = await Ob0();
  if (!t) {
    if ((process.argv[1] || "").includes("/nix/store/")) throw Error("Cannot update amp: this installation was not installed via npm/pnpm/yarn/bun and cannot be updated using the update command. Please use your system package manager or installation method to update amp.");
    throw Error("Could not detect which package manager was used to install Amp. Please specify one explicitly or ensure the package manager is available in PATH.");
  }
  if (J.debug("Using package manager for update", {
    packageManager: t,
    targetVersion: T
  }), t === "binary") try {
    await Vb0(T, e);
    return;
  } catch (i) {
    throw Error(`Binary update failed: ${i instanceof Error ? i.message : String(i)}`);
  }
  if (t === "bootstrap") try {
    await hm0(T), await om0(a);
    return;
  } catch (i) {
    throw Error(`Bootstrap update failed: ${i instanceof Error ? i.message : String(i)}`);
  }
  if (t === "brew") return a?.("brew upgrade ampcode/tap/ampcode"), new Promise((i, c) => {
    J.debug("Running update command", {
      packageManager: t,
      command: "brew"
    });
    let s = Ej("brew", ["upgrade", "ampcode/tap/ampcode"], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: oY.platform() === "win32"
      }),
      A = "",
      l = "",
      o = !1;
    s.subscribe({
      next: n => {
        if (n.stdout) l = n.stdout;
        if (n.stderr) A = n.stderr;
        if (n.exited && !o) if (o = !0, n.exitCode === 0) i();else {
          let p = A || l || "No output";
          c(Error(`brew upgrade ampcode/tap/ampcode failed with code ${n.exitCode}:
${p}`));
        }
      },
      error: n => {
        if (!o) o = !0, c(Error(`Failed to spawn brew: ${n.message}`));
      },
      complete: () => {
        if (!o) o = !0, i();
      }
    });
  });
  let [r, h] = db0(t, T);
  return a?.(`${r} ${h.join(" ")}`), new Promise((i, c) => {
    J.debug("Running update command", {
      packageManager: t,
      command: r,
      args: h
    });
    let s = "",
      A = "",
      l = !1;
    Ej(r, h, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: oY.platform() === "win32"
    }).subscribe({
      next: o => {
        if (o.stdout) A = o.stdout;
        if (o.stderr) s = o.stderr;
        if (o.exited && !l) if (l = !0, o.exitCode === 0) i();else {
          let n = s || A || "No output",
            p = `${r} ${h.join(" ")} failed with code ${o.exitCode}:
${n}`;
          if (r === "pnpm" && n.includes("Unable to find the global bin directory")) p += `

Hint: Try running "pnpm setup" to configure pnpm global directory, or use npm instead:
  npm install -g @sourcegraph/amp`;
          c(Error(p));
        }
      },
      error: o => {
        if (!l) l = !0, c(Error(`Failed to spawn ${r}: ${o.message}`));
      },
      complete: () => {
        if (!l) l = !0, i();
      }
    });
  });
}
async function zVT(T, R) {
  let a = `${R || "https://registry.npmjs.org"}/@sourcegraph/amp/latest`,
    e = new AbortController(),
    t = setTimeout(() => e.abort(), 5000);
  try {
    let r = await fetch(a, {
      signal: e.signal
    });
    if (!r.ok) return {
      hasUpdate: !1,
      currentVersion: T,
      source: "npm"
    };
    let h = await r.json(),
      i = h.version ?? h["dist-tags"]?.latest;
    if (!i) return {
      hasUpdate: !1,
      currentVersion: T,
      source: "npm"
    };
    let c = GVT(T, i),
      s = c < 0,
      A,
      l;
    if (h.time) {
      let o = h.time[T],
        n = h.time[i],
        p = Date.now();
      if (o) A = Math.floor((p - new Date(o).getTime()) / 3600000);
      if (n) l = Math.floor((p - new Date(n).getTime()) / 3600000);
    }
    return J.info("NPM version comparison", {
      currentVersion: T,
      latestVersion: i,
      compareResult: c,
      hasUpdate: s,
      currentVersionAge: A,
      latestVersionAge: l
    }), {
      hasUpdate: s,
      latestVersion: i,
      currentVersion: T,
      currentVersionAge: A,
      latestVersionAge: l,
      source: "npm"
    };
  } catch (r) {
    return J.debug("Error checking npm version", {
      error: r
    }), {
      hasUpdate: !1,
      currentVersion: T,
      source: "npm"
    };
  } finally {
    clearTimeout(t);
  }
}
async function FVT(T) {
  let R = new AbortController(),
    a = setTimeout(() => R.abort(), 5000);
  try {
    let e = await fetch(`${nm0}?t=${Date.now()}`, {
      signal: R.signal,
      cache: "no-store"
    });
    if (!e.ok) return {
      hasUpdate: !1,
      currentVersion: T,
      source: "bin"
    };
    let t = (await e.text()).trim();
    if (!t || !/^\d+\.\d+\.\d+/.test(t)) return {
      hasUpdate: !1,
      currentVersion: T,
      source: "bin"
    };
    let r = GVT(T, t),
      h = r < 0;
    return J.info("Bin version comparison", {
      currentVersion: T,
      latestVersion: t,
      compareResult: r,
      hasUpdate: h
    }), {
      hasUpdate: h,
      latestVersion: t,
      currentVersion: T,
      source: "bin"
    };
  } catch (e) {
    return J.debug("Error checking bin version", {
      error: e
    }), {
      hasUpdate: !1,
      currentVersion: T,
      source: "bin"
    };
  } finally {
    clearTimeout(a);
  }
}
function Am0(T) {
  if (!T) return null;
  let R = typeof T === "number" ? T : new Date(T).getTime();
  if (isNaN(R)) return null;
  let a = Date.now() - R;
  if (a > lm0) return {
    ageMs: a
  };
  return null;
}
function GVT(T, R) {
  let a = h => {
      let [i, c] = h.split("-");
      return {
        parts: i?.split(".").map(Number) || [],
        label: c
      };
    },
    e = a(T),
    t = a(R),
    r = Math.max(e.parts.length, t.parts.length);
  for (let h = 0; h < r; h++) {
    let i = e.parts[h] || 0,
      c = t.parts[h] || 0;
    if (i < c) return -1;
    if (i > c) return 1;
  }
  if (e.label === t.label) return 0;
  if (!e.label && t.label) return 1;
  if (e.label && !t.label) return -1;
  if (e.label && t.label) return e.label < t.label ? -1 : 1;
  return 0;
}
function pxT(T) {
  try {
    let R = T.match(/^0\.0\.(\d+)(?:-g?([a-f0-9]+))?/);
    if (!R) return null;
    let a = parseInt(R[1], 10) * 1000,
      e = R[2],
      t = a !== 0 ? OO(a) : void 0;
    return {
      sha: e,
      age: t
    };
  } catch {
    return null;
  }
}
function pm0(T, R, a = {}) {
  let e = new W0(),
    t = e.pipe(f3({
      shouldCountRefs: !1
    }));
  return setImmediate(async () => {
    let r = new Sb().scoped("update"),
      h = a.startDelayMs ?? 0;
    if (h > 0) await wP(h);
    let i = t.subscribe({
      next: c => {
        r.debug("emit new state", c);
      }
    });
    try {
      let c = process.env.AMP_TEST_UPDATE_STATUS;
      if (c) {
        r.debug("using fake update status for testing", {
          status: c
        }), await wP(500), e.next(c);
        return;
      }
      if (process.env.AMP_SKIP_UPDATE_CHECK === "1") {
        r.debug("checking disabled via AMP_SKIP_UPDATE_CHECK environment variable");
        return;
      }
      let s = await R.get("updates.mode");
      if (s === "disabled") {
        r.debug("checking disabled");
        return;
      }
      let A = await DVT(),
        l = A === "binary" || A === "brew";
      r.debug("checking", {
        currentVersion: T,
        mode: s,
        packageManager: A,
        isBinaryDistribution: l
      });
      let o = l ? await FVT(T) : await zVT(T, fH());
      if (!(o.latestVersion && o.hasUpdate)) {
        r.debug("no update available");
        return;
      }
      let n = () => {
        if (o.currentVersionAge !== void 0 && o.latestVersionAge !== void 0) {
          let p = o.currentVersionAge - o.latestVersionAge,
            _ = 0.5;
          if (Math.abs(p) < 0.5) return r.debug("versions too close together, suppressing update warning", {
            currentVersionAge: o.currentVersionAge,
            latestVersionAge: o.latestVersionAge,
            ageDifferenceHours: p
          }), !0;
        }
        return !1;
      };
      if (!s) s = A === "pnpm" ? "warn" : "auto", r.debug("no configured update mode; selected default based on package manager", {
        packageManager: A,
        mode: s
      });
      if (A === "brew") {
        if (!n()) e.next("update-available-brew");
        return;
      }
      if (A === "binary" && process.execPath !== NVT()) {
        if (r.debug("non-standard binary path, showing warning"), !n()) e.next("update-available-unrecognized-path");
        return;
      }
      if (s === "warn") {
        if (!n()) e.next("update-available");
        return;
      }
      if (!A) {
        if (r.debug("auto-update not supported, falling back to warn mode"), !n()) e.next("update-available");
        return;
      }
      try {
        await qVT(o.latestVersion, A);
        let p = await Ew(o.latestVersion),
          _ = {
            from: o.currentVersion,
            to: o.latestVersion,
            ...p
          };
        if (p.status === "same") r.info("success", _), e.next("updated");else r.warn("success with warning", _), e.next("updated-with-warning");
      } catch (p) {
        e.next("update-error");
      }
    } catch (c) {
      r.debug("check failed", {
        error: c
      });
    } finally {
      await wP(5000), e.next("hidden"), i.unsubscribe(), e.complete();
    }
  }), {
    state: t
  };
}
function _m0(T) {
  let R = new eS().name("install").description("Install required tools like ripgrep to $AMP_HOME/bin").option("--force", "Force reinstallation even if already installed").option("--verbose", "Show installation progress and results").action(async e => {
    await gb0(e.force || !1, e.verbose || !1, "0.0.1775894934-g5bb49b"), process.exit();
  });
  T.addCommand(R, {
    hidden: !0
  });
  let a = new eS("update").alias("up").summary("Update Amp CLI").description("Update Amp CLI to the latest version. You can specify a particular version to install, or leave blank to get the latest stable release.").option("--target-version <version>", "Update to a specific version").allowUnknownOption(!1).action(async e => {
    await mm0(e.targetVersion);
  });
  T.addCommand(a);
}
function bm0(T) {
  let R = Boolean(T.isTTY),
    a = 0,
    e = !1;
  function t() {
    if (!R || !e) return;
    T.write(`
`), e = !1, a = 0;
  }
  function r(h) {
    if (!R) return;
    let i = h.padEnd(a, " ");
    T.write(`\r${i}`), e = !0, a = i.length;
  }
  return {
    flushProgressLine: t,
    renderProgress: r
  };
}
async function mm0(T) {
  let R = void 0,
    {
      flushProgressLine: a,
      renderProgress: e
    } = bm0(Xi);
  if (process.env.AMP_SKIP_UPDATE_CHECK === "1") Xi.write(oR.yellow(`Note: AMP_SKIP_UPDATE_CHECK=1 is set, which disables automatic update checking. Manual updates will still work.

`));
  try {
    if (!T) {
      Xi.write(oR.blue(`Checking for updates...
`));
      let {
        hasUpdate: h,
        latestVersion: i
      } = MVT() ? await FVT("0.0.1775894934-g5bb49b") : await zVT("0.0.1775894934-g5bb49b", fH());
      if (!h) {
        let c = pxT("0.0.1775894934-g5bb49b"),
          s = c?.age ? `released ${c.age} ago` : `built ${OO(new Date("2026-04-11T08:12:39.144Z"))} ago`;
        Xi.write(oR.green(`\u2713 Amp is already up to date on version ${"0.0.1775894934-g5bb49b"} (${s})
`));
        let A = await Ew("0.0.1775894934-g5bb49b", R);
        if (A.warning) Xi.write(`
` + oR.yellow(A.warning) + `
`);
        process.exit(0);
      }
      if (!i) Xi.write(oR.yellow("[WARN] could not find latest version")), process.exit(0);
      T = i;
    }
    Xi.write(oR.blue(`Updating to version ${T}...
`)), await qVT(T, void 0, h => {
      a(), Xi.write(oR.dim(`Running: ${h}
`));
    }, e), a();
    let t = pxT(T);
    Xi.write(oR.green(`\u2713 Amp updated to version ${T}${t ? ` (released ${t.age} ago)` : ""}
`));
    let r = await Ew(T);
    if (r.warning) Xi.write(`
` + oR.yellow(r.warning) + `
`);
    process.exit(0);
  } catch (t) {
    a();
    let r = t instanceof Error ? t.message : String(t);
    Xi.write(oR.red.bold("Error: ") + r + `
`), process.exit(1);
  }
}
function km0(T) {
  let R = (T & 4) !== 0,
    a = (T & 8) !== 0,
    e = (T & 16) !== 0,
    t = (T & 32) !== 0,
    r = T & -61,
    h = "unknown";
  switch (r) {
    case 0:
      h = "left";
      break;
    case 1:
      h = "middle";
      break;
    case 2:
      h = "right";
      break;
    case 64:
      h = "wheel_up";
      break;
    case 65:
      h = "wheel_down";
      break;
    case 66:
      h = "wheel_left";
      break;
    case 67:
      h = "wheel_right";
      break;
    default:
      h = "unknown";
      break;
  }
  return {
    button: h,
    modifiers: {
      shift: R,
      ctrl: e,
      alt: a,
      meta: !1
    },
    motion: t
  };
}
function AY(T, R, a, e) {
  let t = km0(T.button),
    r;
  if (t.button === "wheel_up" || t.button === "wheel_down" || t.button === "wheel_left" || t.button === "wheel_right") r = "scroll";else if (t.motion) r = "move";else if (T.pressed) r = "press";else r = "release";
  let h, i;
  if (R && a && e) h = (T.x - 1) / a, i = (T.y - 1) / e;else h = T.x - 1, i = T.y - 1;
  return {
    type: "mouse",
    action: r,
    button: t.button,
    x: h,
    y: i,
    modifiers: t.modifiers,
    drag: t.motion && T.pressed
  };
}
function ib(T, R, a, e) {
  return `${T}${R}${a}${e}`;
}
function uxT(T) {
  let R = 0;
  if (T.up > 0) R |= 1;
  if (T.down > 0) R |= 2;
  if (T.left > 0) R |= 4;
  if (T.right > 0) R |= 8;
  return R;
}
function xm0(T) {
  let R = 0;
  if ((T & 1) !== 0) R++;
  if ((T & 2) !== 0) R++;
  if ((T & 4) !== 0) R++;
  if ((T & 8) !== 0) R++;
  return R;
}
function yxT(T) {
  return Cw[T] !== void 0;
}
function fm0(T, R) {
  let a = Cw[T],
    e = Cw[R];
  if (!a || !e) return null;
  let t = Math.max(a.up, e.up),
    r = Math.max(a.down, e.down),
    h = Math.max(a.left, e.left),
    i = Math.max(a.right, e.right),
    c = uxT({
      up: t,
      down: r,
      left: h,
      right: i,
      rounded: !1
    });
  if (xm0(c) >= 3) {
    let y = ib(t, r, h, i),
      u = bxT[y];
    if (u) return u;
  }
  let s = Math.max(t, r),
    A = Math.max(h, i),
    l = t === 0 ? 0 : s,
    o = r === 0 ? 0 : s,
    n = h === 0 ? 0 : A,
    p = i === 0 ? 0 : A,
    _ = ib(l, o, n, p),
    m = uxT({
      up: l,
      down: o,
      left: n,
      right: p,
      rounded: !1
    });
  if (a.rounded && e.rounded && l <= 1 && o <= 1 && n <= 1 && p <= 1 && (m === 10 || m === 6 || m === 9 || m === 5) && mxT[_]) return mxT[_];
  let b = bxT[_];
  if (b) return b;
  return R;
}
function Im0(T, R) {
  return {
    ...T,
    ...R,
    bg: R.bg ?? T.bg,
    dim: R.dim ?? T.dim
  };
}
function $m0(T) {
  let R = T.split(".").pop()?.toLowerCase() || "";
  return {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    javascript: "javascript",
    ts: "typescript",
    tsx: "typescript",
    typescript: "typescript",
    py: "python",
    pyw: "python",
    python: "python",
    java: "java",
    c: "c",
    h: "c",
    cc: "cpp",
    cpp: "cpp",
    cxx: "cpp",
    "c++": "cpp",
    hpp: "cpp",
    hh: "cpp",
    hxx: "cpp",
    cs: "csharp",
    csharp: "csharp",
    go: "go",
    golang: "go",
    rs: "rust",
    rust: "rust",
    rb: "ruby",
    ruby: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    kts: "kotlin",
    kotlin: "kotlin",
    dart: "dart",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    shell: "bash",
    sql: "sql",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    markdown: "markdown",
    zig: "zig",
    pas: "pascal",
    pascal: "pascal",
    html: "markup",
    htm: "markup",
    xml: "markup",
    svg: "markup",
    markup: "markup",
    css: "css"
  }[R] || "plain";
}
function vm0(T, R) {
  switch (T.split(" ")[0]) {
    case "keyword":
    case "important":
    case "atrule":
      return R.keyword;
    case "string":
    case "char":
    case "regex":
    case "url":
    case "selector":
    case "attr-value":
    case "inserted":
      return R.string;
    case "number":
    case "constant":
    case "boolean":
    case "symbol":
      return R.number;
    case "comment":
    case "prolog":
    case "doctype":
    case "cdata":
      return R.comment;
    case "function":
    case "class":
      return R.function;
    case "variable":
    case "property":
    case "attr-name":
    case "class-name":
      return R.variable;
    case "type":
    case "tag":
      return R.type;
    case "operator":
    case "punctuation":
    case "delimiter":
    case "entity":
    case "builtin":
    case "deleted":
      return R.operator;
    default:
      return R.operator;
  }
}
function XVT(T, R) {
  Lw = T, VVT = R;
}
function IH() {
  return Lw;
}
function jm0() {
  return VVT;
}
function Sm0(T, R, a) {
  if (Lw === "unknown") return null;
  if (T.type !== "rgb" || R.type !== "rgb") return null;
  let e = Lw === "light" ? 0.15 : 0.12,
    t = r => {
      if (r.type === "rgb") return {
        ...r,
        alpha: e
      };
      if (r.type === "index") return {
        ...r,
        alpha: e
      };
      return {
        type: "default",
        alpha: e
      };
    };
  return {
    added: t(T),
    removed: t(R)
  };
}
function Om0(T, R, a) {
  let e = [];
  function t(r, h) {
    if (typeof r === "string") e.push({
      content: r,
      color: h
    });else {
      let i = h ?? vm0(r.type, R);
      if (typeof r.content === "string") e.push({
        content: r.content,
        color: i
      });else if (Array.isArray(r.content)) r.content.forEach(c => t(c, i));else t(r.content, i);
    }
  }
  return T.forEach(r => t(r, a)), e;
}
function Sv(T, R, a) {
  try {
    let e = a ? $m0(a) : "plain";
    if (e === "plain" || !zP.default.languages[e]) return [{
      content: T
    }];
    let t = zP.default.tokenize(T, zP.default.languages[e]);
    return Om0(t, R);
  } catch (e) {
    return [{
      content: T
    }];
  }
}
function a9(T = " ", R = {}, a = 1, e) {
  return {
    char: T,
    style: {
      ...R
    },
    width: a,
    hyperlink: e
  };
}
function dm0(T, R) {
  return T.char === R.char && T.width === R.width && YVT(T.style, R.style) && gH(T.hyperlink, R.hyperlink);
}
function YVT(T, R) {
  return PxT(T.fg, R.fg) && PxT(T.bg, R.bg) && T.bold === R.bold && T.italic === R.italic && T.underline === R.underline && T.strikethrough === R.strikethrough && T.reverse === R.reverse && T.dim === R.dim;
}
function gH(T, R) {
  if (T === R) return !0;
  if (T === void 0 || R === void 0) return !1;
  return T.uri === R.uri && T.id === R.id;
}
function uS(T) {
  if (T.type === "none") return;
  return T.alpha;
}
function PxT(T, R) {
  if (T === R) return !0;
  if (T === void 0 || R === void 0) return !1;
  if (T.type !== R.type) return !1;
  if (uS(T) !== uS(R)) return !1;
  switch (T.type) {
    case "none":
      return !0;
    case "default":
      return !0;
    case "index":
      return R.value === T.value;
    case "rgb":
      {
        let a = R.value;
        return a.r === T.value.r && a.g === T.value.g && a.b === T.value.b;
      }
    default:
      return !1;
  }
}
function bF(T, R) {
  switch (T.type) {
    case "rgb":
      return T.value;
    case "index":
      return R?.[T.value] ?? null;
    case "default":
      return null;
    default:
      return null;
  }
}
function D4(T, R, a) {
  if (T.type === "none") return R;
  if (R.type === "none") {
    let s = T.alpha ?? 1;
    if (s >= 1) return T;
    let A = jm0(),
      l = IH(),
      o = A ?? (l === "light" ? {
        r: 255,
        g: 255,
        b: 255
      } : {
        r: 0,
        g: 0,
        b: 0
      }),
      n = bF(T, a);
    if (!n) return T;
    let p = Math.round(n.r * s + o.r * (1 - s)),
      _ = Math.round(n.g * s + o.g * (1 - s)),
      m = Math.round(n.b * s + o.b * (1 - s));
    return {
      type: "rgb",
      value: {
        r: Math.max(0, Math.min(255, p)),
        g: Math.max(0, Math.min(255, _)),
        b: Math.max(0, Math.min(255, m))
      }
    };
  }
  let e = T.alpha ?? 1;
  if (e >= 1) return T;
  if (e <= 0) return R;
  let t = bF(T, a),
    r = bF(R, a);
  if (!t || !r) return e > 0.5 ? T : R;
  let h = Math.round(t.r * e + r.r * (1 - e)),
    i = Math.round(t.g * e + r.g * (1 - e)),
    c = Math.round(t.b * e + r.b * (1 - e));
  return {
    type: "rgb",
    value: {
      r: Math.max(0, Math.min(255, h)),
      g: Math.max(0, Math.min(255, i)),
      b: Math.max(0, Math.min(255, c))
    }
  };
}
function Em0(T, R, a, e, t) {
  let r = {
    ...R
  };
  if (T.fg) if (R.fg) r.fg = D4(T.fg, R.fg, t);else r.fg = D4(T.fg, e, t);
  if (T.bg) {
    let h = uS(T.bg);
    if (T.bg.type === "none" || h === 0) {
      if (R.bg) r.bg = R.bg;
    } else if (R.bg) r.bg = D4(T.bg, R.bg, t);else r.bg = D4(T.bg, a, t);
  }
  if (T.bold !== void 0) r.bold = T.bold;
  if (T.italic !== void 0) r.italic = T.italic;
  if (T.underline !== void 0) r.underline = T.underline;
  if (T.strikethrough !== void 0) r.strikethrough = T.strikethrough;
  if (T.reverse !== void 0) r.reverse = T.reverse;
  if (T.dim !== void 0) r.dim = T.dim;
  return r;
}
class pY {
  cells;
  width;
  height;
  indexToRgb = [];
  defaultBg = LT.default();
  defaultFg = LT.default();
  constructor(T, R) {
    this.width = T, this.height = R, this.cells = [], this.resize(T, R);
  }
  setDefaultColors(T, R) {
    this.defaultBg = T, this.defaultFg = R;
  }
  setIndexRgbMapping(T) {
    this.indexToRgb = T;
  }
  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }
  resize(T, R) {
    this.width = T, this.height = R, this.cells = Array(R).fill(null).map(() => Array(T).fill(null).map(() => Ul));
  }
  getCell(T, R) {
    if (T < 0 || T >= this.width || R < 0 || R >= this.height) return null;
    return this.cells[R]?.[T] || null;
  }
  setCell(T, R, a) {
    if (T < 0 || T >= this.width || R < 0 || R >= this.height) return;
    let e = a.style.fg ? uS(a.style.fg) : void 0,
      t = a.style.bg ? uS(a.style.bg) : void 0;
    if (e !== void 0 && e < 1 || t !== void 0 && t < 1) {
      let r = this.cells[R]?.[T] || Ul,
        h = Em0(a.style, r.style, this.defaultBg, this.defaultFg, this.indexToRgb);
      if (this.cells[R]) this.cells[R][T] = {
        char: a.char,
        style: h,
        width: a.width
      };
    } else if (this.cells[R]) this.cells[R][T] = {
      ...a,
      style: {
        ...a.style
      }
    };
    if (a.width > 1) {
      for (let r = 1; r < a.width; r++) if (T + r < this.width && this.cells[R]) this.cells[R][T + r] = a9(" ", a.style, 1);
    }
  }
  setChar(T, R, a, e, t) {
    this.setCell(T, R, a9(a, e, t));
  }
  mergeBorderChar(T, R, a, e) {
    if (!yxT(a)) {
      this.setChar(T, R, a, e, 1);
      return;
    }
    let t = this.getCell(T, R);
    if (!t || !yxT(t.char)) {
      this.setChar(T, R, a, e, 1);
      return;
    }
    let r = fm0(t.char, a);
    if (!r) {
      this.setChar(T, R, a, e, 1);
      return;
    }
    this.setChar(T, R, r, Im0(t.style, e), 1);
  }
  clear() {
    for (let T = 0; T < this.height; T++) for (let R = 0; R < this.width; R++) {
      let a = this.cells[T];
      if (a) a[R] = Ul;
    }
  }
  fill(T, R, a, e, t = " ", r = {}) {
    let h = a9(t, r);
    for (let i = 0; i < e; i++) for (let c = 0; c < a; c++) this.setCell(T + c, R + i, h);
  }
  copyTo(T) {
    let {
      width: R,
      height: a
    } = T.getSize();
    for (let e = 0; e < Math.min(this.height, a); e++) for (let t = 0; t < Math.min(this.width, R); t++) {
      let r = this.getCell(t, e);
      if (r) T.setCell(t, e, r);
    }
  }
  getCells() {
    return this.cells.map(T => T.map(R => ({
      ...R,
      style: {
        ...R.style
      }
    })));
  }
  getCellRows() {
    return this.cells;
  }
  setCursor(T, R) {}
  clearCursor() {}
  setCursorShape(T) {}
  markForRefresh() {}
}
class Zx {
  frontBuffer;
  backBuffer;
  width;
  height;
  needsFullRefresh = !1;
  cursorPosition = null;
  cursorVisible = !1;
  cursorShape = 0;
  constructor(T = 80, R = 24) {
    this.width = T, this.height = R, this.frontBuffer = new pY(T, R), this.backBuffer = new pY(T, R);
  }
  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }
  resize(T, R) {
    this.width = T, this.height = R, this.frontBuffer.resize(T, R), this.backBuffer.resize(T, R);
  }
  getBuffer() {
    return this.backBuffer;
  }
  setDefaultColors(T, R) {
    this.frontBuffer.setDefaultColors(T, R), this.backBuffer.setDefaultColors(T, R);
  }
  setIndexRgbMapping(T) {
    this.frontBuffer.setIndexRgbMapping(T), this.backBuffer.setIndexRgbMapping(T);
  }
  getCell(T, R) {
    return this.backBuffer.getCell(T, R);
  }
  setCell(T, R, a) {
    this.backBuffer.setCell(T, R, a);
  }
  setChar(T, R, a, e, t) {
    this.backBuffer.setChar(T, R, a, e, t);
  }
  mergeBorderChar(T, R, a, e) {
    this.backBuffer.mergeBorderChar(T, R, a, e);
  }
  clear() {
    this.backBuffer.clear();
  }
  fill(T, R, a, e, t = " ", r = {}) {
    this.backBuffer.fill(T, R, a, e, t, r);
  }
  present() {
    let T = this.frontBuffer;
    this.frontBuffer = this.backBuffer, this.backBuffer = T;
  }
  getDiff() {
    let T = [],
      R = this.frontBuffer.getCellRows(),
      a = this.backBuffer.getCellRows(),
      e = (t, r, h) => {
        if (h.width <= 1) return !1;
        for (let i = 1; i < h.width; i++) {
          let c = t[r + i];
          if (!c) return !1;
          if (!(c.char === " " && c.width === 1 && YVT(c.style, h.style) && gH(c.hyperlink, h.hyperlink))) return !1;
        }
        return !0;
      };
    if (this.needsFullRefresh) {
      for (let t = 0; t < this.height; t++) {
        let r = a[t];
        if (!r) continue;
        for (let h = 0; h < this.width; h++) {
          let i = r[h] ?? Ul;
          if (T.push({
            x: h,
            y: t,
            cell: i
          }), e(r, h, i)) h += i.width - 1;
        }
      }
      return this.needsFullRefresh = !1, T;
    }
    for (let t = 0; t < this.height; t++) {
      let r = R[t],
        h = a[t];
      if (!r || !h) continue;
      for (let i = 0; i < this.width; i++) {
        let c = r[i] ?? Ul,
          s = h[i] ?? Ul;
        if (c === Ul && s === Ul) continue;
        if (!dm0(c, s)) {
          if (T.push({
            x: i,
            y: t,
            cell: s
          }), e(h, i, s)) i += s.width - 1;
        } else if (e(h, i, s)) i += s.width - 1;
      }
    }
    return T;
  }
  getFrontBuffer() {
    return this.frontBuffer;
  }
  getBackBuffer() {
    return this.backBuffer;
  }
  markForRefresh() {
    this.needsFullRefresh = !0;
  }
  get requiresFullRefresh() {
    return this.needsFullRefresh;
  }
  setCursor(T, R) {
    this.cursorPosition = {
      x: T,
      y: R
    }, this.cursorVisible = !0;
  }
  setCursorPositionHint(T, R) {
    this.cursorPosition = {
      x: T,
      y: R
    };
  }
  clearCursor() {
    this.cursorPosition = null, this.cursorVisible = !1;
  }
  getCursor() {
    return this.cursorPosition;
  }
  isCursorVisible() {
    return this.cursorVisible;
  }
  setCursorShape(T) {
    this.cursorShape = T;
  }
  getCursorShape() {
    return this.cursorShape;
  }
}
function Lm0() {
  return `amp-${++Cm0}`;
}
function QVT(T, R) {
  return {
    uri: T,
    id: R ?? Lm0()
  };
}
function Mm0(T) {
  return `\x1B]8;id=${T.id};${T.uri}\x1B\\`;
}
function _Y() {
  return "\x1B]8;;\x1B\\";
}
function Dm0(T) {
  return /\p{Extended_Pictographic}/u.test(T);
}
function wm0(T) {
  let R = String.fromCodePoint(T);
  return !/\p{Emoji_Presentation}/u.test(R);
}
function Bm0(T) {
  return /\p{M}/u.test(T);
}
function Nm0(T, R = !0) {
  if (!T) return 0;
  let a = Array.from(T);
  if (R) {
    let e = 0;
    for (let t = 0; t < a.length; t++) {
      let r = a[t];
      if (!r) continue;
      let h = r.codePointAt(0);
      if (!h) continue;
      let i = xxT(h);
      if (i !== 0) {
        if (t + 1 < a.length) {
          let c = a[t + 1]?.codePointAt(0);
          if (c === 65038) i = 1;else if (c === 65039) i = 2;
        }
        if (e === 0) {
          e = i;
          break;
        }
      }
    }
    return e;
  } else {
    let e = 0;
    for (let t of a) {
      if (!t) continue;
      let r = t.codePointAt(0);
      if (!r) continue;
      e += xxT(r);
    }
    return e;
  }
}
function xxT(T) {
  if (T === 9) return mtT;
  if (Bm0(String.fromCodePoint(T)) || T >= 8203 && T <= 8205 || T === 8206 || T === 8207 || T === 8288 || T === 65279 || T >= 65024 && T <= 65039 || T >= 917760 && T <= 917999 || T >= 127995 && T <= 127999) return 0;
  if (Um0(T)) {
    if (ji() && (T >= 9728 && T <= 10175 || T === 8986 || T === 8987 || T === 9203 || T >= 9193 && T <= 9196 || T === 9200)) return 1;
    if (wm0(T)) return 1;
    return 2;
  }
  if (Hm0(T)) return 2;
  return 1;
}
function Um0(T) {
  let R = String.fromCodePoint(T);
  return Dm0(R);
}
function Hm0(T) {
  return T >= 19968 && T <= 40959 || T >= 13312 && T <= 19903 || T >= 131072 && T <= 173791 || T >= 173824 && T <= 177983 || T >= 177984 && T <= 178207 || T >= 178208 && T <= 183983 || T >= 183984 && T <= 191471 || T >= 44032 && T <= 55215 || T >= 12352 && T <= 12447 || T >= 12448 && T <= 12543 || T >= 12784 && T <= 12799 || T >= 65280 && T <= 65519 || T >= 12288 && T <= 12351 || T >= 65281 && T <= 65376 || T === 9001 || T === 9002 || T >= 65040 && T <= 65049 || T >= 65072 && T <= 65103 || T >= 127462 && T <= 127487;
}
function J8(T, R = !0) {
  let a = kxT.get(T);
  if (a !== void 0) return a;
  let e = Nm0(T, R);
  return kxT.set(T, e), e;
}
function B9(T) {
  try {
    if (!mF) mF = new Intl.Segmenter("en", {
      granularity: "grapheme"
    });
    return Array.from(mF.segment(T), R => R.segment);
  } catch (R) {
    return Array.from(T);
  }
}
function q8(T, R = !0) {
  let a = 0,
    e = B9(T);
  for (let t of e) a += J8(t, R);
  return a;
}
function Mw(T, R, a = !0, e = "\u2026") {
  if (R <= 0) return "";
  let t = 0,
    r = "",
    h = B9(T);
  for (let i of h) {
    let c = J8(i, a);
    if (t + c > R) {
      let s = q8(e, a);
      if (t + s <= R) r += e;
      break;
    }
    r += i, t += c;
  }
  return r;
}
function w4(T, R, a = !0, e = "left", t = " ") {
  let r = q8(T, a);
  if (r >= R) return T;
  let h = R - r,
    i = J8(t, a),
    c = Math.floor(h / i);
  switch (e) {
    case "center":
      {
        let s = Math.floor(c / 2),
          A = c - s;
        return t.repeat(s) + T + t.repeat(A);
      }
    case "right":
      return t.repeat(c) + T;
    default:
      return T + t.repeat(c);
  }
}
class utT {
  context;
  eventHandlers = [];
  constructor() {
    this.context = {
      state: "ground",
      private: [],
      intermediates: [],
      final: "",
      params: [],
      paramBuffer: [],
      subparamBuffer: [],
      currentSubparams: [],
      oscData: [],
      dcsData: [],
      apcData: [],
      printBuffer: [],
      textBuffer: "",
      oscEscSeen: !1,
      apcEscSeen: !1,
      dcsEscSeen: !1
    };
  }
  onEvent(T) {
    this.eventHandlers.push(T);
  }
  offEvent(T) {
    let R = this.eventHandlers.indexOf(T);
    if (R !== -1) this.eventHandlers.splice(R, 1);
  }
  parse(T) {
    let R = typeof T === "string" ? this.stringToBytes(T) : T;
    for (let a of R) this.processByte(a);
  }
  flush() {
    this.flushPrintBuffer(), this.flushTextBuffer();
  }
  stringToBytes(T) {
    return new TextEncoder().encode(T);
  }
  processByte(T) {
    if (this.context.state === "osc_string" && T === 27) {
      this.context.oscEscSeen = !0;
      return;
    }
    if (this.context.oscEscSeen && T === 92) {
      this.context.oscEscSeen = !1, this.performAction("osc_end", T), this.context.state = "ground";
      return;
    }
    if (this.context.oscEscSeen) this.context.oscEscSeen = !1;
    if (this.context.state === "sos_pm_apc_string" && T === 27) {
      this.context.apcEscSeen = !0;
      return;
    }
    if (this.context.apcEscSeen && T === 92) {
      this.context.apcEscSeen = !1, this.performAction("apc_end", T), this.context.state = "ground";
      return;
    }
    if (this.context.apcEscSeen) {
      this.context.apcEscSeen = !1, this.performAction("clear", 27), this.context.state = "escape";
      let e = Ov.escape[T];
      if (e) this.performAction(e.action, T), this.context.state = e.nextState;
      return;
    }
    let R = Ov[this.context.state][T];
    if (!R) return;
    let a = this.context.state;
    if (this.performAction(R.action, T), this.context.state === "ground" && R.nextState !== "ground") this.flushTextBuffer();
    if (this.context.state === a) this.context.state = R.nextState;
  }
  performAction(T, R) {
    if (this.context.dcsEscSeen && R === 92) {
      this.context.dcsEscSeen = !1;
      return;
    }
    if (this.context.dcsEscSeen) this.context.dcsEscSeen = !1;
    switch (T) {
      case "ignore":
        break;
      case "print":
        this.addToPrintBuffer(R);
        break;
      case "execute":
        this.flushTextBuffer(), this.emitEvent({
          type: "execute",
          code: R
        });
        break;
      case "clear":
        this.flushTextBuffer(), this.context.private.length = 0, this.context.intermediates.length = 0, this.context.final = "", this.context.params = [], this.context.oscEscSeen = !1, this.context.paramBuffer.length = 0, this.context.subparamBuffer.length = 0, this.context.currentSubparams = [], this.context.oscData.length = 0, this.context.dcsData.length = 0;
        break;
      case "collect":
        if (R >= 60 && R <= 63) this.context.private.push(String.fromCharCode(R));else this.context.intermediates.push(String.fromCharCode(R));
        break;
      case "param":
        if (R >= 48 && R <= 57) {
          if (this.context.currentSubparams.length > 0) this.context.subparamBuffer.push(String.fromCharCode(R));else this.context.paramBuffer.push(String.fromCharCode(R));
        } else if (R === 59) this.finishParameter();else if (R === 58) this.finishSubparameter();
        break;
      case "esc_dispatch":
        this.emitEvent({
          type: "escape",
          intermediates: this.context.intermediates.join(""),
          final: String.fromCharCode(R)
        });
        break;
      case "csi_dispatch":
        this.finishParameter(), this.emitEvent({
          type: "csi",
          private: this.context.private.join(""),
          intermediates: this.context.intermediates.join(""),
          final: String.fromCharCode(R),
          params: [...this.context.params]
        });
        break;
      case "hook":
        this.finishParameter(), this.context.dcsData.length = 0, this.context.final = String.fromCharCode(R);
        break;
      case "put":
        this.context.dcsData.push(String.fromCharCode(R));
        break;
      case "unhook":
        this.emitEvent({
          type: "dcs",
          private: this.context.private.join(""),
          intermediates: this.context.intermediates.join(""),
          final: this.context.final,
          params: [...this.context.params],
          data: this.context.dcsData.join("")
        }), this.context.dcsEscSeen = R === 27;
        break;
      case "osc_start":
        this.context.oscData.length = 0, this.context.oscEscSeen = !1;
        break;
      case "osc_put":
        this.context.oscData.push(String.fromCharCode(R));
        break;
      case "osc_end":
        this.emitEvent({
          type: "osc",
          data: this.context.oscData.join("")
        });
        break;
      case "apc_start":
        this.context.apcData.length = 0;
        break;
      case "apc_put":
        this.context.apcData.push(String.fromCharCode(R));
        break;
      case "apc_end":
        this.emitEvent({
          type: "apc",
          data: this.context.apcData.join("")
        });
        break;
    }
  }
  finishSubparameter() {
    if (this.context.currentSubparams.length === 0) {
      if (this.context.paramBuffer.length > 0) {
        let T = parseInt(this.context.paramBuffer.join(""), 10);
        this.context.currentSubparams.push(isNaN(T) ? 0 : T), this.context.paramBuffer.length = 0;
      } else this.context.currentSubparams.push(0);
    } else if (this.context.subparamBuffer.length > 0) {
      let T = parseInt(this.context.subparamBuffer.join(""), 10);
      this.context.currentSubparams.push(isNaN(T) ? 0 : T), this.context.subparamBuffer.length = 0;
    } else this.context.currentSubparams.push(0);
  }
  finishParameter() {
    if (this.context.currentSubparams.length > 0) {
      this.finishSubparameter();
      let [T, ...R] = this.context.currentSubparams,
        a = {
          value: T ?? 0
        };
      if (R.length > 0) a.subparams = R;
      this.context.params.push(a), this.context.currentSubparams = [];
    } else if (this.context.paramBuffer.length > 0) {
      let T = parseInt(this.context.paramBuffer.join(""), 10);
      this.context.params.push({
        value: isNaN(T) ? 0 : T
      }), this.context.paramBuffer.length = 0;
    } else this.context.params.push({
      value: 0
    });
  }
  addToPrintBuffer(T) {
    this.context.printBuffer.push(T), this.tryEmitGraphemes();
  }
  tryEmitAccumulatedGraphemes() {
    if (this.context.textBuffer.length > 1000) {
      this.flushTextBuffer();
      return;
    }
    if (this.context.flushTimeout) clearTimeout(this.context.flushTimeout);
    this.context.flushTimeout = setTimeout(() => {
      if (this.context.textBuffer.length > 0) this.flushTextBuffer();
    }, 1);
  }
  tryEmitGraphemes() {
    if (this.context.printBuffer.length === 0) return;
    let T = 0,
      R = this.context.printBuffer;
    for (let a = 0; a < R.length; a++) {
      let e = R[a];
      if (e === void 0) continue;
      if (e < 128) T = a + 1;else if ((e & 224) === 192) {
        let t = R[a + 1];
        if (a + 1 < R.length && t !== void 0 && (t & 192) === 128) T = a + 2, a++;else break;
      } else if ((e & 240) === 224) {
        let t = R[a + 1],
          r = R[a + 2];
        if (a + 2 < R.length && t !== void 0 && (t & 192) === 128 && r !== void 0 && (r & 192) === 128) T = a + 3, a += 2;else break;
      } else if ((e & 248) === 240) {
        let t = R[a + 1],
          r = R[a + 2],
          h = R[a + 3];
        if (a + 3 < R.length && t !== void 0 && (t & 192) === 128 && r !== void 0 && (r & 192) === 128 && h !== void 0 && (h & 192) === 128) T = a + 4, a += 3;else break;
      } else if ((e & 192) === 128) {
        this.emitEvent({
          type: "print",
          grapheme: "\uFFFD"
        }), this.context.printBuffer.splice(0, a + 1), this.tryEmitGraphemes();
        return;
      } else {
        this.emitEvent({
          type: "print",
          grapheme: "\uFFFD"
        }), this.context.printBuffer.splice(0, a + 1), this.tryEmitGraphemes();
        return;
      }
    }
    if (T > 0) {
      let a = new Uint8Array(R.slice(0, T)),
        e = new TextDecoder("utf-8", {
          fatal: !1
        }).decode(a);
      if (this.context.textBuffer += e, this.tryEmitAccumulatedGraphemes(), this.context.printBuffer.splice(0, T), this.context.printBuffer.length > 0) this.tryEmitGraphemes();
    }
  }
  flushPrintBuffer() {
    if (this.context.printBuffer.length > 0) {
      let T = new Uint8Array(this.context.printBuffer),
        R = new TextDecoder("utf-8", {
          fatal: !1
        }).decode(T);
      if (R.length > 0) this.context.textBuffer += R;
    }
    this.context.printBuffer = [];
  }
  flushTextBuffer() {
    if (this.context.flushTimeout) clearTimeout(this.context.flushTimeout), delete this.context.flushTimeout;
    if (this.context.textBuffer.length > 0) {
      let T = B9(this.context.textBuffer);
      for (let R of T) this.emitEvent({
        type: "print",
        grapheme: R
      });
      this.context.textBuffer = "";
    }
  }
  emitEvent(T) {
    for (let R of this.eventHandlers) R(T);
  }
  reset() {
    this.flushPrintBuffer(), this.flushTextBuffer(), this.context = {
      state: "ground",
      private: [],
      intermediates: [],
      final: "",
      params: [],
      paramBuffer: [],
      subparamBuffer: [],
      currentSubparams: [],
      oscData: [],
      dcsData: [],
      apcData: [],
      printBuffer: [],
      textBuffer: "",
      oscEscSeen: !1,
      apcEscSeen: !1,
      dcsEscSeen: !1
    };
  }
  getState() {
    return this.context.state;
  }
}
class Es {
  static instance = null;
  logs = [];
  maxLogs = 1000;
  listeners = new Set();
  constructor() {}
  static getInstance() {
    if (!Es.instance) Es.instance = new Es();
    return Es.instance;
  }
  addLog(T, R, ...a) {
    let e = {
      timestamp: new Date(),
      level: T,
      message: R,
      args: a
    };
    if (this.logs.push(e), this.logs.length > this.maxLogs) this.logs.shift();
    this.notifyListeners();
  }
  notifyListeners() {
    let T = this.getLogs();
    for (let R of this.listeners) try {
      R(T);
    } catch (a) {
      let e = this.originalConsole?.error;
      if (e) e("Error in log change listener:", a);
    }
  }
  getLogs() {
    return [...this.logs];
  }
  clear() {
    this.logs = [], this.notifyListeners();
  }
  addListener(T) {
    this.listeners.add(T);
  }
  removeListener(T) {
    this.listeners.delete(T);
  }
  interceptConsole() {
    let T = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      log: console.log.bind(console),
      debug: console.debug.bind(console)
    };
    console.error = (R, ...a) => {
      this.addLog("error", R, ...a);
    }, console.warn = (R, ...a) => {
      this.addLog("warn", R, ...a);
    }, console.info = (R, ...a) => {
      this.addLog("info", R, ...a);
    }, console.log = (R, ...a) => {
      this.addLog("info", R, ...a);
    }, console.debug = (R, ...a) => {
      this.addLog("debug", R, ...a);
    }, this.originalConsole = T;
  }
  restoreConsole() {
    let T = this.originalConsole;
    if (T) console.error = T.error, console.warn = T.warn, console.info = T.info, console.log = T.log, console.debug = T.debug;
  }
}
function Km0() {
  try {
    if (Es.getInstance().restoreConsole(), process.stdout.write("\x1B[?1002l"), process.stdout.write("\x1B[?1003l"), process.stdout.write("\x1B[?1004l"), process.stdout.write("\x1B[?1006l"), process.stdout.write("\x1B[?1016l"), process.stdout.write("\x1B[?2004l"), process.stdout.write("\x1B[?2031l"), process.stdout.write("\x1B[?2048l"), process.stdout.write("\x1B[<u"), process.stdout.write("\x1B[?1049l"), process.stdout.write("\x1B[0 q"), process.stdout.write("\x1B[?25h"), process.stdout.write("\x1B[999;1H"), process.stdout.write("\x1B[0m"), !process.env.TERM_PROGRAM?.startsWith("iTerm")) process.stdout.write("\x1B]9;4;0\x1B\\");
  } catch (T) {}
}
function e8(T, ...R) {
  if (!T) {
    let a = R.join(" "),
      e = Error(a);
    J.error("TUI Assert failed", {
      assertion: a,
      stackTrace: e.stack,
      meta: R
    });
    let t = process.env.AMP_DEBUG,
      r = process.env.VITEST;
    if (t || r) {
      if (r) throw e;
      Km0(), console.error("FATAL TUI ERROR:", a), console.error("Stack trace:", e.stack), console.error("Context:", {
        meta: R
      }), process.exit(1);
    }
  }
}
class ytT {
  parts = [];
  append(...T) {
    this.parts.push(...T);
  }
  toString() {
    return this.parts.join("");
  }
  reset() {
    this.parts.length = 0;
  }
  get length() {
    return this.parts.length;
  }
  get isEmpty() {
    return this.parts.length === 0;
  }
}
function PtT(T, R, a) {
  let e = `${T},${R},${a}`,
    t = jxT.get(e);
  if (t !== void 0) return t;
  let r = 16,
    h = 1 / 0;
  for (let i = 0; i < vxT.length; i++) {
    let [c, s, A] = vxT[i],
      l = (T - c) ** 2 + (R - s) ** 2 + (a - A) ** 2;
    if (l < h) h = l, r = i + 16;
  }
  return jxT.set(e, r), r;
}
function pu0(T = {}) {
  let R = 5;
  if (T.reportEventTypes) R |= 2;
  if (T.reportAllKeys) R |= 8;
  if (T.reportAssociatedText) R |= 16;
  return t9 + `>${R}u`;
}
function yu0(T) {
  if (T === "\t") return !1;
  let R = T.codePointAt(0);
  if (R === void 0) return !1;
  if (R >= 0 && R <= 8 || R >= 10 && R <= 31 || R === 127) return !0;
  if (R >= 128 && R <= 159) return !0;
  if (R === 8232 || R === 8233) return !0;
  if (R === 65279) return !0;
  return !1;
}
function Pu0(T) {
  let R = T.codePointAt(0);
  if (R === void 0) return "\uFFFD";
  if (R >= 0 && R <= 31) return String.fromCodePoint(9216 + R);
  if (R === 127) return "\u2421";
  return "\uFFFD";
}
function Iu0(T) {
  return ru0 + (T ? iu0 : "");
}
function gu0() {
  return hu0 + cu0;
}
function JVT(T) {
  return uu0(T);
}
function $u0() {
  return ZVT;
}
function SxT(T, R, a) {
  if (!T) return "";
  switch (T.type) {
    case "none":
      return "";
    case "default":
      return t9 + (R ? "39" : "49") + "m";
    case "index":
      return t9 + `${R ? "38" : "48"};5;${T.value}m`;
    case "rgb":
      {
        if (a && !a.canRgb) {
          let {
              r: i,
              g: c,
              b: s
            } = T.value,
            A = PtT(i, c, s);
          return t9 + `${R ? "38" : "48"};5;${A}m`;
        }
        let e = R ? "38" : "48",
          {
            r: t,
            g: r,
            b: h
          } = T.value;
        return t9 + `${e};2;${t};${r};${h}m`;
      }
    default:
      return "";
  }
}
function vu0(T, R, a) {
  let e = "";
  if (!Dw(T.fg, R.fg)) {
    if (T.fg === void 0 && R.fg !== void 0) e += t9 + "39m";else e += SxT(T.fg, !0, a);
    R.fg = T.fg;
  }
  if (!Dw(T.bg, R.bg)) {
    let t = T.bg?.type === "none",
      r = R.bg?.type === "none";
    if ((T.bg === void 0 || t) && R.bg !== void 0 && !r) e += t9 + "49m";else if (!t) e += SxT(T.bg, !1, a);
    R.bg = T.bg;
  }
  if (T.bold !== R.bold) {
    if (e += T.bold ? t9 + "1m" : t9 + "22m", R.bold = T.bold, !T.bold && T.dim) e += t9 + "2m";
  }
  if (T.italic !== R.italic) e += T.italic ? t9 + "3m" : t9 + "23m", R.italic = T.italic;
  if (T.underline !== R.underline) {
    if (a?.underlineSupport !== "none") e += T.underline ? t9 + "4m" : t9 + "24m";
    R.underline = T.underline;
  }
  if (T.strikethrough !== R.strikethrough) e += T.strikethrough ? t9 + "9m" : t9 + "29m", R.strikethrough = T.strikethrough;
  if (T.reverse !== R.reverse) e += T.reverse ? t9 + "7m" : t9 + "27m", R.reverse = T.reverse;
  if (T.dim !== R.dim) {
    if (e += T.dim ? t9 + "2m" : t9 + "22m", R.dim = T.dim, !T.dim && T.bold) e += t9 + "1m";
  }
  return e;
}
function ju0(T, R) {
  let a = "";
  if (!gH(T, R.hyperlink)) {
    if (R.hyperlink) a += _Y();
    if (T) a += Mm0(T);
    R.hyperlink = T;
  }
  return a;
}
function Dw(T, R) {
  if (T === R) return !0;
  if (T === void 0 || R === void 0) return !1;
  if (T.type !== R.type) return !1;
  switch (T.type) {
    case "none":
      return !0;
    case "default":
      return !0;
    case "index":
      return R.value === T.value;
    case "rgb":
      {
        let a = R.value;
        return a.r === T.value.r && a.g === T.value.g && a.b === T.value.b;
      }
    default:
      return !1;
  }
}
function Su0(T, R) {
  return Dw(T.fg, R.fg) && Dw(T.bg, R.bg) && T.bold === R.bold && T.italic === R.italic && T.underline === R.underline && T.strikethrough === R.strikethrough && T.reverse === R.reverse && T.dim === R.dim;
}
function du0(T, R) {
  if (T.char === "\t") {
    if (T.width === mtT) return Ou0;
    return " ".repeat(Math.max(1, T.width));
  }
  if (R?.kittyExplicitWidth && T.width > 1) return `\x1B]66;w=${T.width};${T.char}\x1B\\`;
  return T.char;
}
class ktT {
  capabilities;
  currentStyle = {};
  currentX = 0;
  currentY = 0;
  constructor(T) {
    this.capabilities = T;
  }
  updateCapabilities(T) {
    this.capabilities = T;
  }
  render(T) {
    if (T.length === 0) return "";
    let R = new ytT(),
      a = null,
      e,
      t = -1,
      r = -1;
    for (let h of T) {
      let i = h.cell.char,
        c = yu0(i),
        s = c ? Pu0(i) : i;
      if (e8(!c, `Cell contains disallowed control at (${h.x}, ${h.y}):`, `U+${i.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`), !(a !== null && h.y === r && h.x === t && Su0(a, h.cell.style) && gH(e, h.cell.hyperlink))) {
        if (this.currentX !== h.x || this.currentY !== h.y) R.append($xT(h.y, h.x)), this.currentX = h.x, this.currentY = h.y;
        R.append(vu0(h.cell.style, this.currentStyle, this.capabilities)), R.append(ju0(h.cell.hyperlink, this.currentStyle)), a = h.cell.style, e = h.cell.hyperlink;
      }
      let A = c ? {
        ...h.cell,
        char: s
      } : h.cell;
      R.append(du0(A, this.capabilities)), this.currentX += h.cell.width, t = h.x + h.cell.width, r = h.y;
    }
    return R.toString();
  }
  clearScreen() {
    return this.currentX = 0, this.currentY = 0, this.currentStyle = {}, gxT + _Y() + Zm0 + Xm0;
  }
  hideCursor() {
    return Ym0;
  }
  showCursor() {
    return Qm0;
  }
  setCursorShape(T) {
    if (this.capabilities?.supportsCursorShape === !1) return "";
    return fu0(T);
  }
  reset() {
    return this.currentStyle = {}, gxT + _Y();
  }
  moveTo(T, R) {
    return this.currentX = T, this.currentY = R, $xT(R, T);
  }
  getCursorPosition() {
    return {
      x: this.currentX,
      y: this.currentY
    };
  }
  resetState() {
    this.currentStyle = {}, this.currentX = 0, this.currentY = 0;
  }
  startSync() {
    return Jm0;
  }
  endSync() {
    return Tu0;
  }
  enterAltScreen() {
    return eu0 + this.clearScreen();
  }
  exitAltScreen() {
    return tu0;
  }
  resetCursor() {
    return Vm0;
  }
  enableMouse(T = !1) {
    return Iu0(T);
  }
  disableMouse() {
    return gu0();
  }
  enableEmojiWidth() {
    return su0;
  }
  disableEmojiWidth() {
    return ou0;
  }
  enableInBandResize() {
    return nu0;
  }
  disableInBandResize() {
    return lu0;
  }
  enableBracketedPaste() {
    return Ru0;
  }
  disableBracketedPaste() {
    return au0;
  }
  enableKittyKeyboard(T = {}) {
    return pu0(T);
  }
  disableKittyKeyboard() {
    return Au0;
  }
  enableModifyOtherKeys() {
    return _u0;
  }
  disableModifyOtherKeys() {
    return bu0;
  }
  setMouseShape(T) {
    return mu0(T);
  }
  setProgressBarIndeterminate() {
    return ku0;
  }
  setProgressBarOff() {
    return ZVT;
  }
  setProgressBarPaused() {
    return xu0;
  }
}
function Xb() {
  if (process.env.TMUX || process.env.TMUX_PANE) return !0;
  return process.env.TERM?.toLowerCase()?.includes("tmux") ?? !1;
}
function Lu0() {
  if (!Xb()) return !1;
  try {
    return Cu0('tmux display-message -p "#{pane_active}"', {
      timeout: 500,
      encoding: "utf8"
    }).trim() !== "1";
  } catch {
    return !1;
  }
}
function FP(T) {
  if (!Xb()) return T;
  return `\x1BPtmux;${T.replace(/\x1b/g, "\x1B\x1B")}\x1B\\`;
}
function RXT() {
  return Gu0("bun:ffi");
}
function Ku0() {
  let {
    dlopen: T,
    FFIType: R
  } = RXT();
  return T("kernel32.dll", {
    GetConsoleMode: {
      args: [R.u64, R.ptr],
      returns: R.i32
    },
    GetStdHandle: {
      args: [R.i32],
      returns: R.u64
    },
    SetConsoleMode: {
      args: [R.u64, R.u32],
      returns: R.i32
    }
  });
}
function xtT() {
  if (B4) return B4;
  return B4 = Ku0(), B4;
}
function dxT(T) {
  let R = xtT().symbols.GetStdHandle(T);
  if (R === 0n || R === Nu0) throw Error(`GetStdHandle(${T}) returned an invalid handle`);
  return R;
}
function ExT(T, R) {
  let a = new Uint32Array(1);
  if (xtT().symbols.GetConsoleMode(T, RXT().ptr(a)) === 0) throw Error(`GetConsoleMode(${R}) failed`);
  return a[0] ?? 0;
}
function ug(T, R, a) {
  if (xtT().symbols.SetConsoleMode(T, R) === 0) throw Error(`SetConsoleMode(${a}) failed`);
}
function Vu0(T) {
  let R = T | zu0 | Hu0;
  return R &= ~(qu0 | Wu0 | Uu0), R;
}
function Xu0(T) {
  return T | Fu0;
}
function Yu0() {
  return null;
}
function Qu0() {
  let T = "1.3.10";
  if (!T) return !1;
  let R = T.split(".").map(Number),
    a = R[0] ?? 0,
    e = R[1] ?? 0,
    t = R[2] ?? 0;
  if (!Number.isFinite(a) || !Number.isFinite(e) || !Number.isFinite(t)) return !1;
  if (a !== 1 || e !== 2) return !1;
  return t < 22;
}
function aXT(T) {
  let R = "",
    a = 0;
  while (a < T.length) {
    let e = T.charCodeAt(a);
    if (e === 27) {
      if (a++, a >= T.length) break;
      let t = T.charCodeAt(a);
      if (t === 91) {
        a++;
        while (a < T.length) {
          let r = T.charCodeAt(a);
          if (a++, r >= 64 && r <= 126) break;
        }
        continue;
      }
      if (t === 93) {
        a++;
        while (a < T.length) {
          let r = T.charCodeAt(a);
          if (r === 7) {
            a++;
            break;
          }
          if (r === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break;
          }
          a++;
        }
        continue;
      }
      if (t === 80) {
        a++;
        while (a < T.length) {
          if (T.charCodeAt(a) === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break;
          }
          a++;
        }
        continue;
      }
      if (t === 95 || t === 88 || t === 94) {
        a++;
        while (a < T.length) {
          if (T.charCodeAt(a) === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break;
          }
          a++;
        }
        continue;
      }
      if (t === 78 || t === 79) {
        a += 2;
        continue;
      }
      if (t >= 64 && t <= 126) {
        a++;
        continue;
      }
      continue;
    }
    if (e === 127 || e === 8) {
      R = R.slice(0, -1), a++;
      continue;
    }
    if (e < 32) {
      a++;
      continue;
    }
    R += T[a], a++;
  }
  return R;
}
function Zu0() {
  let T = !1,
    R = {
      stdin: null,
      dataCallback: null,
      earlyInputBuffer: [],
      init() {
        if (this.stdin !== null) return;
        if (P8.stream) {
          if (J.info("[tty] taking over early stdin stream"), this.stdin = P8.stream, this.stdin.removeAllListeners("data"), P8.takenOver = !0, P8.buffer.length > 0) this.earlyInputBuffer.push(...P8.buffer), P8.buffer = [];
          this.stdin.on("data", t => {
            if (!T) this.earlyInputBuffer.push(Buffer.from(t));
            if (this.dataCallback) this.dataCallback(t);
          }), P8.stream = null;
          return;
        }
        let a = Mu0("/dev/tty", "r");
        if (!OxT.isatty(a)) throw Error("/dev/tty is not a TTY device");
        let e = new OxT.ReadStream(a);
        this.stdin = e, e.setRawMode(!0), e.on("data", t => {
          if (!T) this.earlyInputBuffer.push(Buffer.from(t));
          if (this.dataCallback) this.dataCallback(t);
        });
      },
      on(a, e) {
        this.dataCallback = e;
      },
      pause() {
        if (this.stdin) this.stdin.setRawMode(!1), this.stdin.removeAllListeners("data"), this.stdin.destroy();
        this.stdin = null;
      },
      resume() {
        this.init();
      },
      dispose() {
        if (this.stdin) this.stdin.setRawMode(!1), this.stdin.removeAllListeners("data"), this.stdin.destroy();
        this.stdin = null, this.dataCallback = null, this.earlyInputBuffer = [];
      },
      getEarlyInputText() {
        if (T = !0, this.earlyInputBuffer.length === 0) return "";
        let a = Buffer.concat(this.earlyInputBuffer).toString("utf8");
        return this.earlyInputBuffer = [], aXT(a);
      }
    };
  return R.init(), R;
}
function Ju0() {
  let T = !1,
    R = null;
  function a() {
    if (R) return;
    try {
      R = Yu0();
    } catch (r) {
      J.warn("Failed to enable Windows VT input for TUI mouse reporting", {
        error: r
      });
    }
  }
  function e() {
    if (!R) return;
    try {
      R.restore();
    } catch (r) {
      J.warn("Failed to restore Windows console modes after TUI mouse reporting", {
        error: r
      });
    } finally {
      R = null;
    }
  }
  let t = {
    stdin: null,
    dataCallback: null,
    earlyInputBuffer: [],
    init() {
      if (this.stdin !== null) return;
      if (this.stdin = process.stdin, a(), this.stdin.isTTY) this.stdin.setRawMode(!0);
      if (P8.buffer.length > 0) this.earlyInputBuffer.push(...P8.buffer), P8.buffer = [];
      if (P8.stream) P8.stream.removeAllListeners("data"), P8.stream = null, P8.takenOver = !0;
      this.stdin.on("data", r => {
        if (!T) this.earlyInputBuffer.push(Buffer.from(r));
        if (this.dataCallback) this.dataCallback(r);
      });
    },
    on(r, h) {
      this.dataCallback = h;
    },
    pause() {
      if (e(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!1);
      this.stdin?.pause();
    },
    resume() {
      if (a(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!0);
      this.stdin?.resume();
    },
    dispose() {
      if (e(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!1);
      if (this.stdin) this.stdin.removeAllListeners("data");
      this.stdin = null, this.dataCallback = null, this.earlyInputBuffer = [];
    },
    getEarlyInputText() {
      if (T = !0, this.earlyInputBuffer.length === 0) return "";
      let r = Buffer.concat(this.earlyInputBuffer).toString("utf8");
      return this.earlyInputBuffer = [], aXT(r);
    }
  };
  return t.init(), t;
}
function eXT() {
  if (Qu0()) return J.warn("Detected Bun <1.2.22 which has known /dev/tty issues. Please upgrade to Bun 1.2.22 or later for proper TTY support. Using process.stdin instead."), Ju0();
  return Zu0();
}
function LxT() {
  let T = null;
  try {
    if (process.stdout.isTTY) {
      let R = process.stdout.getWindowSize();
      T = [R[0], R[1]];
    }
  } catch {}
  return {
    isTTY: process.stdout.isTTY,
    columns: process.stdout.columns ?? null,
    rows: process.stdout.rows ?? null,
    windowSize: T,
    hasRefreshSize: typeof process.stdout._refreshSize === "function"
  };
}
function hy0() {
  if (process.stdout.isTTY) return {
    stream: process.stdout,
    target: "stdout",
    dispose: () => {}
  };
  if (process.stderr.isTTY) return {
    stream: process.stderr,
    target: "stderr",
    dispose: () => {}
  };
  try {
    let T = um0("/dev/tty", "w");
    if (Pm0.isatty(T)) return {
      stream: {
        write(R) {
          return ym0(T, R), !0;
        }
      },
      target: "dev-tty",
      dispose: () => {
        _xT(T);
      }
    };
    _xT(T);
  } catch {}
  return {
    stream: process.stdout,
    target: "stdout",
    dispose: () => {}
  };
}
function L3(T, R) {
  if (!process.stdout.writable || process.stdout.destroyed) {
    R?.();
    return;
  }
  let a = `${JSON.stringify(T)}
`;
  try {
    if (R) {
      if (!process.stdout.write(a)) {
        process.stdout.once("drain", R);
        return;
      }
      R();
      return;
    }
    process.stdout.write(a);
  } catch {
    R?.();
  }
}
function bY(T) {
  return Array.from(T, R => {
    if (R >= 32 && R <= 126 && R !== 92) return String.fromCharCode(R);
    if (R === 92) return "\\\\";
    return `\\x${R.toString(16).padStart(2, "0")}`;
  }).join("");
}
function iy0(T) {
  return T.ctrlKey && T.key.toLowerCase() === "c" && T.eventType !== "repeat" && T.eventType !== "release";
}
function MxT(T) {
  try {
    let R = KVT(`tmux show-options -gv ${T}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000
    }).trim();
    return R === "" ? null : R;
  } catch {
    return null;
  }
}
function cy0() {
  try {
    let T = KVT("tmux display-message -p '#{client_termfeatures}'", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000
    }).trim();
    return T === "" ? [] : T.split(",").filter(Boolean);
  } catch {
    return null;
  }
}
function Rh(T, R, a, e, t) {
  if (e.raw) {
    let r = Buffer.from(R);
    L3({
      type: "control",
      name: a,
      stage: t ?? null,
      bytes: r.toString("hex"),
      escaped: bY(r)
    });
  }
  T.stream.write(R);
}
async function sy0(T = {}) {
  let R = eXT(),
    a = new $H(),
    e = new ktT(),
    t = hy0(),
    r = Xb(),
    h = r ? {
      clientTermFeatures: cy0(),
      extendedKeysFormat: MxT("extended-keys-format"),
      extendedKeysMode: MxT("extended-keys")
    } : null,
    i = h?.clientTermFeatures?.includes("extkeys") ?? !1;
  if (T.raw) L3({
    type: "debug",
    controlTarget: t.target,
    platform: "darwin",
    stdoutIsTTY: process.stdout.isTTY,
    stderrIsTTY: process.stderr.isTTY,
    term: process.env.TERM ?? null,
    termProgram: process.env.TERM_PROGRAM ?? null,
    termProgramVersion: process.env.TERM_PROGRAM_VERSION ?? null,
    tmux: r,
    tmuxClientTermFeatures: h?.clientTermFeatures ?? null,
    tmuxExtendedKeys: r ? i : null,
    tmuxExtendedKeysFormat: h?.extendedKeysFormat ?? null,
    tmuxExtendedKeysMode: h?.extendedKeysMode ?? null
  });
  let c = !1,
    s = null,
    A = null,
    l = !1,
    o = !1,
    n = () => {
      L3({
        type: "signal",
        signal: "SIGWINCH",
        stdout: LxT()
      });
    },
    p = () => {
      L3({
        type: "stdout_resize",
        stdout: LxT()
      });
    },
    _ = new Promise(I => {
      s = I;
    }),
    m = () => {
      if (!A) return null;
      let I = A;
      A = null, clearTimeout(I.timeout);
      let S = {
        stage: I.stage,
        kittyQueryResponse: I.kittyQueryResponse,
        deviceAttributes: I.deviceAttributes
      };
      return L3({
        type: "startup_probe",
        stage: S.stage,
        timeoutMs: CxT,
        kittyQueryResponse: S.kittyQueryResponse,
        deviceAttributes: S.deviceAttributes
      }), I.resolve(S), S;
    },
    b = I => {
      if (!A || I.request !== "u") return;
      if (A.kittyQueryResponse = I.response, A.deviceAttributes !== null) m();
    },
    y = I => {
      if (!A) return;
      if (A.deviceAttributes = {
        primary: I.primary,
        secondary: [...I.secondary]
      }, A.kittyQueryResponse !== null) m();
    },
    u = I => {
      if (A) m();
      return new Promise(S => {
        A = {
          stage: I,
          kittyQueryResponse: null,
          deviceAttributes: null,
          resolve: S,
          timeout: setTimeout(() => {
            m();
          }, CxT)
        }, Rh(t, ey0, "kitty-query", T, I), Rh(t, Ty0, "device-attributes-query", T, I);
      });
    },
    P = () => {
      if (c) return;
      if (c = !0, o) process.off("SIGWINCH", n);
      if (process.stdout.isTTY) process.stdout.off("resize", p);
      process.off("SIGINT", x), process.off("SIGTERM", f), process.off("exit", P), m();
      try {
        if (l) Rh(t, ry0, "win32-input-mode-disable", T);
        if (Rh(t, ay0, "focus-disable", T), Rh(t, e.disableInBandResize(), "inband-resize-disable", T), Rh(t, e.disableBracketedPaste(), "bracketed-paste-disable", T), r) Rh(t, e.disableModifyOtherKeys(), "tmux-extended-keys-disable", T);
        Rh(t, e.disableKittyKeyboard(), "kitty-keyboard-disable", T);
      } catch {}
      t.dispose(), R.dispose();
    },
    k = I => {
      if (c) return;
      process.exitCode = I, P(), s?.();
    },
    x = () => {
      k(130);
    },
    f = () => {
      k(143);
    };
  process.once("SIGINT", x), process.once("SIGTERM", f), process.once("exit", P);
  try {
    process.on("SIGWINCH", n), o = !0;
  } catch (I) {
    L3({
      type: "signal_subscription_error",
      signal: "SIGWINCH",
      error: I instanceof Error ? I.message : String(I)
    });
  }
  if (process.stdout.isTTY) process.stdout.on("resize", p);
  a.onKey(I => {
    let S = {
      type: "key",
      key: I.key,
      code: I.code ?? null,
      modifiers: {
        shift: I.shiftKey,
        ctrl: I.ctrlKey,
        alt: I.altKey,
        meta: I.metaKey
      },
      eventType: I.eventType ?? null
    };
    if (iy0(I)) {
      L3(S, () => k(0));
      return;
    }
    L3(S);
  }), a.onDcs(I => {
    L3(I);
  }), a.onOsc(I => {
    L3(I);
  }), a.onApc(I => {
    L3(I);
  }), a.onPaste(I => {
    L3(I);
  }), a.onSgrMouse(I => {
    L3(I);
  }), a.onFocus(I => {
    L3(I);
  }), a.onMouse(I => {
    L3(I);
  }), a.onResize(I => {
    L3(I);
  }), a.onColorPaletteChange(I => {
    L3(I);
  }), a.onCursorPositionReport(I => {
    L3(I);
  }), a.onDeviceAttributes(I => {
    y(I), L3(I);
  }), a.onDecrqss(I => {
    if (b(I), I.request === "u") {
      L3({
        type: "kitty_query_response",
        response: I.response
      });
      return;
    }
    L3(I);
  }), R.on("data", I => {
    if (T.raw) L3({
      type: "raw",
      bytes: Buffer.from(I).toString("hex"),
      escaped: bY(I)
    });
    a.parse(I);
  });
  let v = [...R.earlyInputBuffer];
  R.earlyInputBuffer.length = 0;
  for (let I of v) {
    if (T.raw) L3({
      type: "raw",
      bytes: I.toString("hex"),
      escaped: bY(I)
    });
    a.parse(I);
  }
  await u("before_enable"), Rh(t, Ry0, "focus-enable", T), Rh(t, e.enableInBandResize(), "inband-resize-enable", T), Rh(t, e.enableBracketedPaste(), "bracketed-paste-enable", T), Rh(t, e.enableKittyKeyboard({
    reportEventTypes: !0
  }), "kitty-keyboard-enable", T);
  let g = await u("after_enable");
  if (r) L3({
    type: "tmux_info",
    extendedKeysFormat: h?.extendedKeysFormat ?? null,
    extendedKeysMode: h?.extendedKeysMode ?? null,
    hasExtkeysFeature: i,
    note: "tmux does not proxy kitty query/event-type support; enabling modifyOtherKeys mode 2 for press-only extended keys"
  }), Rh(t, ty0, "tmux-extended-keys-enable", T);
  await _;
}
class xa {
  state = [!0, !1, !0, !1, !0, !1, !0, !1];
  previousState = [];
  generation = 0;
  maxGenerations = 15;
  neighborMap = [[1, 3, 4, 5, 7], [0, 2, 4, 5, 6], [1, 3, 5, 6, 7], [0, 2, 4, 6, 7], [0, 1, 3, 5, 7], [0, 1, 2, 4, 6], [1, 2, 3, 5, 7], [0, 2, 3, 4, 6]];
  step() {
    let T = this.state.map((r, h) => {
        let i = this.neighborMap[h].filter(c => this.state[c]).length;
        if (r) return i === 2 || i === 3;
        return i === 3 || i === 6;
      }),
      R = T.every((r, h) => r === this.state[h]),
      a = this.previousState.length > 0 && T.every((r, h) => r === this.previousState[h]);
    this.previousState = [...this.state], this.state = T, this.generation++;
    let e = T.every(r => !r),
      t = T.filter(r => r).length;
    if (R || a || this.generation >= this.maxGenerations || e || t < 2) {
      let r;
      do r = Array.from({
        length: 8
      }, () => Math.random() > 0.6); while (r.filter(h => h).length < 3);
      this.state = r, this.previousState = [], this.generation = 0;
    }
  }
  toBraille() {
    let T = [0, 1, 2, 6, 3, 4, 5, 7],
      R = 10240;
    for (let a = 0; a < 8; a++) if (this.state[a]) R |= 1 << T[a];
    return String.fromCharCode(R);
  }
}
function xy0(T) {
  try {
    return process.kill(T, 0), !0;
  } catch (R) {
    return R.code === "EPERM";
  }
}
function ItT(T, R) {
  return T.code === R;
}
function fy0(T) {
  return T instanceof Error ? T.message : String(T);
}
function rXT(T) {
  if (typeof T !== "string") return null;
  let R = T.trim();
  return R.length > 0 ? R : null;
}
function Iy0(T, R) {
  let a = Reflect.get(T, R);
  if (typeof a !== "number") return;
  return Number.isSafeInteger(a) && a > 0 ? a : void 0;
}
function gy0(T, R) {
  return rXT(Reflect.get(T, R));
}
function $y0(T) {
  let R;
  try {
    R = JSON.parse(T);
  } catch {
    return;
  }
  if (!R || typeof R !== "object") return;
  let a = Iy0(R, "pid"),
    e = Reflect.get(R, "threadId"),
    t = gy0(R, "threadTitle");
  if (a === void 0 || typeof e !== "string" || !Vt(e)) return;
  return {
    pid: a,
    threadId: e,
    threadTitle: t
  };
}
function vy0(T) {
  let R = {
    pid: T.pid,
    threadId: T.threadId
  };
  if (T.threadTitle) R.threadTitle = T.threadTitle;
  return `${JSON.stringify(R)}
`;
}
function jy0(T) {
  return {
    pid: T.currentPID ?? process.pid,
    threadId: T.currentThreadId,
    threadTitle: rXT(T.currentThreadTitle)
  };
}
async function hXT(T) {
  try {
    let R = await my0(T, "utf-8"),
      a = $y0(R);
    if (a === void 0) return {
      kind: "invalid",
      value: R.trim()
    };
    return {
      kind: "valid",
      contents: a
    };
  } catch (R) {
    if (ItT(R, "ENOENT")) return {
      kind: "missing"
    };
    throw R;
  }
}
async function iXT(T, R) {
  let a = await hXT(T);
  if (a.kind !== "valid" || a.contents.pid !== R) return;
  await mY(T, {
    force: !0
  });
}
async function Sy0(T) {
  try {
    process.kill(T, "SIGTERM");
  } catch (R) {
    if (ItT(R, "ESRCH")) return;
    throw R;
  }
}
async function Oy0(T, R) {
  let a = Date.now() + Py0;
  while (Date.now() < a) {
    if (!R(T)) return !0;
    await Ey0(ky0);
  }
  return !R(T);
}
function dy0(T) {
  return ["Another amp live-sync is already running for this checkout.", "", ...[T.running.threadTitle, T.running.threadId, `PID ${T.running.pid}`].filter(R => Boolean(R)), "", "Kill the running live-sync process and continue? [y/N]: "].join(`
`);
}
function DxT(T, R) {
  return {
    status: "claimed",
    pidFilePath: T,
    release: async () => iXT(T, R)
  };
}
function Ey0(T) {
  return new Promise(R => {
    setTimeout(R, T);
  });
}
async function Cy0(T) {
  let R = T.currentPID ?? process.pid,
    a = jy0(T),
    e = T.isProcessRunning ?? xy0,
    t = T.killProcess ?? Sy0,
    r = T.waitForProcessExit ?? (h => Oy0(h, e));
  await by0(yy0.dirname(T.pidFilePath), {
    recursive: !0
  });
  while (!0) {
    let h = await hXT(T.pidFilePath);
    if (h.kind === "valid") {
      if (h.contents.pid === R) return DxT(T.pidFilePath, R);
      if (e(h.contents.pid)) {
        if (!T.promptForYesNo) return {
          status: "already-running",
          pidFilePath: T.pidFilePath,
          runningPID: h.contents.pid,
          runningThreadId: h.contents.threadId,
          runningThreadTitle: h.contents.threadTitle
        };
        let i = T.formatRunningPrompt?.({
          runningPID: h.contents.pid,
          runningThreadId: h.contents.threadId,
          runningThreadTitle: h.contents.threadTitle
        }) ?? dy0({
          running: h.contents
        });
        if (!(await T.promptForYesNo(i))) return {
          status: "already-running",
          pidFilePath: T.pidFilePath,
          runningPID: h.contents.pid,
          runningThreadId: h.contents.threadId,
          runningThreadTitle: h.contents.threadTitle
        };
        try {
          await t(h.contents.pid);
        } catch (c) {
          throw new GR(`Couldn't stop live-sync PID ${h.contents.pid}: ${fy0(c)}`, 1);
        }
        if (!(await r(h.contents.pid))) throw new GR(`Timed out waiting for live-sync PID ${h.contents.pid} to stop.`, 1);
        await iXT(T.pidFilePath, h.contents.pid);
        continue;
      }
      await mY(T.pidFilePath, {
        force: !0
      });
      continue;
    }
    if (h.kind === "invalid") {
      await mY(T.pidFilePath, {
        force: !0
      });
      continue;
    }
    try {
      return await uy0(T.pidFilePath, vy0(a), {
        encoding: "utf-8",
        flag: "wx",
        mode: 384
      }), DxT(T.pidFilePath, R);
    } catch (i) {
      if (ItT(i, "EEXIST")) continue;
      throw i;
    }
  }
}
function Ly0(T, R) {
  uY = T, yY = R;
}
function cXT() {
  return typeof process < "u" && (process.env.BUN_TEST === "1" || globalThis.Bun?.jest !== void 0 || typeof globalThis.test === "function");
}
function My0() {
  if (!uY) {
    if (cXT()) return {
      scheduleBuildFor: () => {}
    };
    throw Error("Build scheduler not initialized. Make sure WidgetsBinding is created.");
  }
  return uY;
}
function uF() {
  if (!yY) {
    if (cXT()) return {
      requestLayout: () => {},
      requestPaint: () => {},
      removeFromQueues: () => {}
    };
    throw Error("Paint scheduler not initialized. Make sure WidgetsBinding is created.");
  }
  return yY;
}
class vH {
  _parent;
  _children = [];
  _needsLayout = !1;
  _needsPaint = !1;
  _cachedDepth;
  _attached = !1;
  _debugData = {};
  allowHitTestOutsideBounds = !1;
  parentData;
  setupParentData(T) {}
  sendDebugData(T) {
    this._debugData = {
      ...this._debugData,
      ...T
    };
  }
  get debugData() {
    return this._debugData;
  }
  get parent() {
    return this._parent;
  }
  get children() {
    return this._children;
  }
  get depth() {
    if (this._cachedDepth !== void 0) return this._cachedDepth;
    let T = 0,
      R = this._parent;
    while (R) T++, R = R._parent;
    return this._cachedDepth = T, T;
  }
  _invalidateDepth() {
    this._cachedDepth = void 0;
    for (let T of this._children) T._invalidateDepth();
  }
  get needsLayout() {
    return this._needsLayout;
  }
  get needsPaint() {
    return this._needsPaint;
  }
  get attached() {
    return this._attached;
  }
  adoptChild(T) {
    if (T._parent = this, T._invalidateDepth(), this._children.push(T), this.setupParentData(T), this._attached) T.attach();
    this.markNeedsLayout();
  }
  dropChild(T) {
    let R = this._children.indexOf(T);
    if (R !== -1) {
      if (T._attached) T.detach();
      this._children.splice(R, 1), T._parent = void 0, T._invalidateDepth(), this.markNeedsLayout();
    }
  }
  removeAllChildren() {
    for (let T of this._children) {
      if (T._attached) T.detach();
      T._parent = void 0, T._invalidateDepth();
    }
    this._children.length = 0, this.markNeedsLayout();
  }
  replaceChildren(T) {
    for (let R of T) R._parent = this, R._invalidateDepth(), this.setupParentData(R);
    this._children = T, this.markNeedsLayout();
  }
  attach() {
    if (this._attached) return;
    this._attached = !0;
    for (let T of this._children) T.attach();
  }
  detach() {
    if (!this._attached) return;
    this._attached = !1;
    for (let T of this._children) T.detach();
  }
  markNeedsLayout() {
    if (this._needsLayout) return;
    if (!this._attached) return;
    if (this._needsLayout = !0, this.parent) this.parent.markNeedsLayout();else uF().requestLayout(this);
  }
  markNeedsPaint() {
    if (this._needsPaint) return;
    if (!this._attached) return;
    this._needsPaint = !0, uF().requestPaint(this);
  }
  performLayout() {}
  paint(T, R = 0, a = 0) {
    this._needsPaint = !1;
    for (let e of this.children) if ("offset" in e) {
      let t = e,
        r = R + t.offset.x,
        h = a + t.offset.y;
      e.paint(T, r, h);
    } else e.paint(T, R, a);
  }
  visitChildren(T) {
    for (let R of this._children) T(R);
  }
  dispose() {
    uF().removeFromQueues(this), this._cachedDepth = void 0, this._parent = void 0, this._children.length = 0;
  }
}
function N4(T, R = 0) {
  return Number.isFinite(T) ? T : R;
}
class o0 {
  minWidth;
  maxWidth;
  minHeight;
  maxHeight;
  constructor(T, R, a, e) {
    if (typeof T === "object") this.minWidth = T.minWidth ?? 0, this.maxWidth = T.maxWidth ?? 1 / 0, this.minHeight = T.minHeight ?? 0, this.maxHeight = T.maxHeight ?? 1 / 0;else this.minWidth = T ?? 0, this.maxWidth = R ?? 1 / 0, this.minHeight = a ?? 0, this.maxHeight = e ?? 1 / 0;
  }
  static tight(T, R) {
    return new o0(T, T, R, R);
  }
  static loose(T, R) {
    return new o0(0, T, 0, R);
  }
  get hasBoundedWidth() {
    return this.maxWidth !== 1 / 0;
  }
  get hasBoundedHeight() {
    return this.maxHeight !== 1 / 0;
  }
  get hasTightWidth() {
    return this.minWidth >= this.maxWidth;
  }
  get hasTightHeight() {
    return this.minHeight >= this.maxHeight;
  }
  constrain(T, R) {
    return e8(isFinite(T), `BoxConstraints.constrain received infinite width: ${T}. This indicates a layout bug where a widget is not properly calculating its desired size.`), e8(isFinite(R), `BoxConstraints.constrain received infinite height: ${R}. This indicates a layout bug where a widget is not properly calculating its desired size.`), {
      width: Math.max(this.minWidth, Math.min(this.maxWidth, T)),
      height: Math.max(this.minHeight, Math.min(this.maxHeight, R))
    };
  }
  enforce(T) {
    let R = (a, e, t) => Math.max(e, Math.min(t, a));
    return new o0(R(T.minWidth, this.minWidth, this.maxWidth), R(T.maxWidth, this.minWidth, this.maxWidth), R(T.minHeight, this.minHeight, this.maxHeight), R(T.maxHeight, this.minHeight, this.maxHeight));
  }
  get biggest() {
    return {
      width: this.maxWidth,
      height: this.maxHeight
    };
  }
  get smallest() {
    return {
      width: this.minWidth,
      height: this.minHeight
    };
  }
  loosen() {
    return new o0(0, this.maxWidth, 0, this.maxHeight);
  }
  tighten({
    width: T,
    height: R
  } = {}) {
    return new o0(T === void 0 ? this.minWidth : Math.max(this.minWidth, Math.min(this.maxWidth, T)), T === void 0 ? this.maxWidth : Math.max(this.minWidth, Math.min(this.maxWidth, T)), R === void 0 ? this.minHeight : Math.max(this.minHeight, Math.min(this.maxHeight, R)), R === void 0 ? this.maxHeight : Math.max(this.minHeight, Math.min(this.maxHeight, R)));
  }
  static tightFor({
    width: T,
    height: R
  } = {}) {
    return new o0(T ?? 0, T ?? 1 / 0, R ?? 0, R ?? 1 / 0);
  }
  equals(T) {
    return this.minWidth === T.minWidth && this.maxWidth === T.maxWidth && this.minHeight === T.minHeight && this.maxHeight === T.maxHeight;
  }
}
class jH {
  constructor() {}
}
class Mn {
  key;
  _debugData = {};
  constructor({
    key: T
  } = {}) {
    if (this.constructor === Mn) throw Error("Widget is abstract and cannot be instantiated directly");
    this.key = T;
  }
  sendDebugData(T) {
    this._debugData = {
      ...this._debugData,
      ...T
    };
  }
  get debugData() {
    return this._debugData;
  }
  canUpdate(T) {
    if (this.constructor !== T.constructor) return !1;
    if (this.key === void 0 && T.key === void 0) return !0;
    if (this.key === void 0 || T.key === void 0) return !1;
    return this.key.equals(T.key);
  }
}
class qm {
  widget;
  parent;
  _children = [];
  _inheritedDependencies = new Set();
  _dirty = !1;
  _cachedDepth;
  _mounted = !1;
  constructor(T) {
    this.widget = T;
  }
  get children() {
    return this._children;
  }
  get depth() {
    if (this._cachedDepth !== void 0) return this._cachedDepth;
    let T = 0,
      R = this.parent;
    while (R) T++, R = R.parent;
    return this._cachedDepth = T, T;
  }
  _invalidateDepth() {
    this._cachedDepth = void 0;
    for (let T of this._children) T._invalidateDepth();
  }
  get dirty() {
    return this._dirty;
  }
  get mounted() {
    return this._mounted;
  }
  get renderObject() {
    return;
  }
  update(T) {
    this.widget = T;
  }
  addChild(T) {
    T.parent = this, T._invalidateDepth(), this._children.push(T);
  }
  removeChild(T) {
    let R = this._children.indexOf(T);
    if (R !== -1) this._children.splice(R, 1), T.parent = void 0, T._invalidateDepth();
  }
  removeAllChildren() {
    for (let T of this._children) T.parent = void 0, T._invalidateDepth();
    this._children.length = 0;
  }
  markMounted() {
    if (this._mounted = !0, this.widget.key instanceof ph) this.widget.key._setElement(this);
  }
  unmount() {
    if (this.widget.key instanceof ph) this.widget.key._clearElement();
    this._mounted = !1, this._dirty = !1, this._cachedDepth = void 0;
    for (let T of this._inheritedDependencies) if ("removeDependent" in T) T.removeDependent(this);
    this._inheritedDependencies.clear();
  }
  markNeedsRebuild() {
    if (!this._mounted) return;
    this._dirty = !0, My0().scheduleBuildFor(this);
  }
  dependOnInheritedWidgetOfExactType(T) {
    let R = this.parent;
    while (R) {
      if (R.widget.constructor === T) {
        if ("addDependent" in R && "removeDependent" in R) {
          let a = R;
          a.addDependent(this), this._inheritedDependencies.add(a);
        }
        return R;
      }
      R = R.parent;
    }
    return null;
  }
  findAncestorElementOfType(T) {
    let R = this.parent;
    while (R) {
      if (R instanceof T) return R;
      R = R.parent;
    }
    return null;
  }
  findAncestorWidgetOfType(T) {
    let R = this.parent;
    while (R) {
      if (R.widget instanceof T) return R.widget;
      R = R.parent;
    }
    return null;
  }
}
class wR {
  widget;
  context;
  _mounted = !1;
  get mounted() {
    return this._mounted;
  }
  initState() {}
  didUpdateWidget(T) {}
  dispose() {}
  setState(T) {
    if (!this._mounted) throw Error("setState() called after dispose()");
    if (T) T();
    this._markNeedsBuild();
  }
  _mount(T, R) {
    this.widget = T, this.context = R, this._mounted = !0, this.initState();
  }
  _update(T) {
    let R = this.widget;
    this.widget = T, this.didUpdateWidget(R);
  }
  _unmount() {
    this._mounted = !1, this.dispose();
  }
  _markNeedsBuild() {
    let T = this.context.element;
    if ("markNeedsBuild" in T && typeof T.markNeedsBuild === "function") T.markNeedsBuild();
  }
}
class Ib {
  element;
  widget;
  mediaQuery;
  parent;
  constructor(T, R, a = void 0, e = null) {
    this.element = T, this.widget = R, this.mediaQuery = a, this.parent = e;
  }
  findAncestorElementOfType(T) {
    let R = this.element.parent;
    while (R) {
      if (R instanceof T) return R;
      R = R.parent;
    }
    return null;
  }
  findAncestorWidgetOfType(T) {
    return this.element.findAncestorWidgetOfType(T);
  }
  dependOnInheritedWidgetOfExactType(T) {
    return this.element.dependOnInheritedWidgetOfExactType(T);
  }
  findAncestorStateOfType(T) {
    let R = this.element.parent;
    while (R) {
      if ("state" in R && R.state instanceof T) return R.state;
      R = R.parent;
    }
    return null;
  }
  findRenderObject() {
    if ("renderObject" in this.element) {
      let T = this.element.renderObject;
      return T instanceof vH ? T : void 0;
    }
    return;
  }
}
class oXT {
  static hitTest(T, R) {
    let a = new nXT();
    return T.hitTest(a, R), a;
  }
}
class nXT {
  _hits = [];
  get hits() {
    return this._hits;
  }
  add(T) {
    this._hits.push(T);
  }
  addWithPaintOffset(T, R, a) {
    let e = {
      x: a.x - R.x,
      y: a.y - R.y
    };
    this.add({
      target: T,
      localPosition: e
    });
  }
  addMouseTarget(T, R) {}
}
function Dy0() {
  let T = vH.prototype;
  if (!T.hitTest) T.hitTest = function (R, a, e = 0, t = 0) {
    if ("size" in this && "offset" in this) {
      let h = this,
        i = h.size,
        c = h.offset;
      if (i && c) {
        let s = e + c.x,
          A = t + c.y,
          l = a.x >= s && a.x < s + i.width,
          o = a.y >= A && a.y < A + i.height;
        if (l && o) {
          let n = {
            x: a.x - s,
            y: a.y - A
          };
          R.add({
            target: this,
            localPosition: n
          });
          let p = this.children,
            _ = !0;
          for (let m = p.length - 1; m >= 0; m--) if (p[m].hitTest(R, a, s, A)) _ = !0;
          return _;
        }
        if (this.allowHitTestOutsideBounds) {
          let n = !1,
            p = this.children;
          for (let _ = p.length - 1; _ >= 0; _--) if (p[_].hitTest(R, a, s, A)) n = !0;
          return n;
        }
        return !1;
      }
    }
    let r = !1;
    for (let h of this.children) if (h.hitTest(R, a, e, t)) r = !0;
    return r;
  };
}
function Ol(T, R, a) {
  return {
    position: R,
    localPosition: a,
    modifiers: {
      shift: T.modifiers.shift,
      ctrl: T.modifiers.ctrl,
      alt: T.modifiers.alt,
      meta: T.modifiers.meta
    },
    timestamp: Date.now()
  };
}
function wy0(T, R, a, e = 1) {
  return {
    type: "click",
    button: T.button === "left" ? "left" : T.button === "middle" ? "middle" : T.button === "right" ? "right" : "left",
    clickCount: e,
    ...Ol(T, R, a)
  };
}
function yF(T, R, a) {
  let e;
  switch (T.button) {
    case "wheel_up":
      e = "up";
      break;
    case "wheel_down":
      e = "down";
      break;
    case "wheel_left":
      e = "left";
      break;
    case "wheel_right":
      e = "right";
      break;
    default:
      e = "down";
  }
  return {
    type: "scroll",
    direction: e,
    ...Ol(T, R, a)
  };
}
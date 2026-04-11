// Module: file-scanner
// Original: segment1[1364140:1371665]
// Type: Scope-hoisted
// Exports: XKT
// Category: util

"--glob", "!.jj/"];
return new Promise((h, i) => {
  let c = lA0(t, r, {
      cwd: R,
      stdio: ["ignore", "pipe", "pipe"]
    }),
    s = [],
    A = "",
    l = "",
    o = !1,
    n = (p) => {
      if (!p || o) return;
      if (s.push(p), s.length >= LkT) {
        if (!o) J.warn("External directory scan limit reached. Returning partial results.", {
          tool: T,
          rootPath: R,
          limit: LkT
        }), o = !0, c.kill()
      }
    };
  if (c.stdout?.on("data", (p) => {
      if (o) return;
      A += p.toString("utf8");
      let _;
      while ((_ = A.indexOf(`
`)) !== -1) {
        let m = A.slice(0, _).replace(/\r$/, "");
        if (A = A.slice(_ + 1), n(m), o) break
      }
    }), c.stderr?.on("data", (p) => {
      if (l.length >= cF) return;
      let _ = p.toString("utf8");
      if (l.length + _.length > cF) l += _.slice(0, cF - l.length);
      else l += _
    }), a) {
    let p = () => {
      if (!o) c.kill("SIGTERM"), i(Error("Scan aborted"))
    };
    if (a.aborted) p();
    else a.addEventListener("abort", p, {
      once: !0
    })
  }
  c.on("close", (p) => {
    if (!o && A) {
      let _ = A.replace(/\r$/, "");
      n(_)
    }
    if (!o && p !== 0) {
      if (!l.trim().split(`
`).filter((_) => _.length > 0).every((_) => _.includes("No such file or directory"))) {
        J.debug("External tool failed", {
          command: t,
          code: p,
          stderr: l
        }), i(Error(`${t} exited with code ${p}: ${l}`));
        return
      }
    }
    try {
      let _ = new Set,
        m = {
          rootPath: R,
          alwaysIncludeMatcher: e.alwaysIncludeMatcher
        },
        b = s.map((P) => {
          let k = this.createEntryFromPath(lg(R, P), {
              size: 0,
              mtime: new Date,
              isDirectory: !1,
              isFile: !0,
              isSymlink: !1
            }, m),
            x = P;
          while (x !== "" && x !== ".")
            if (x = AA0(x), x && x !== "." && !_.has(x)) _.add(x);
          return k
        }),
        y = Array.from(_).map((P) => {
          return this.createEntryFromPath(lg(R, P), {
            size: 0,
            mtime: new Date,
            isDirectory: !0,
            isFile: !1,
            isSymlink: !1
          }, m)
        }),
        u = [...b, ...y];
      h(u)
    } catch (_) {
      i(_)
    }
  }), c.on("error", (p) => {
    i(p)
  })
})
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
  }
}
async scanDirectoryRecursive(T, R, a, e, t, r, h) {
  if (e.signal?.aborted) throw Error("Scan aborted");
  if (a > e.maxDepth) return;
  if (t.length >= e.maxFiles) return;
  let i = Ag(R, T);
  if (e.respectIgnorePatterns && i) {
    if (!(e.alwaysIncludeMatcher?.(i) ?? !1) && Ri.shouldIgnore(i, !0)) {
      r.skippedPaths++;
      return
    }
  }
  let c;
  try {
    c = await b_.readdir(T, {
      withFileTypes: !0
    })
  } catch (s) {
    if (s instanceof Error) {
      if ("code" in s && (s.code === "EACCES" || s.code === "EPERM")) {
        r.skippedPaths++;
        return
      }
      if ("code" in s && s.code === "ENOENT") return
    }
    throw s
  }
  for (let s of c) {
    if (e.signal?.aborted) throw Error("Scan aborted");
    if (t.length >= e.maxFiles) break;
    let A = lg(T, s.name),
      l = Ag(R, A);
    if (e.respectIgnorePatterns) {
      if (!(e.alwaysIncludeMatcher?.(l) ?? !1) && Ri.shouldIgnore(l, s.isDirectory())) {
        r.skippedPaths++;
        continue
      }
    }
    try {
      let o, n = !1,
        p = {
          rootPath: R,
          alwaysIncludeMatcher: e.alwaysIncludeMatcher
        };
      if (s.isDirectory()) o = this.createEntryFromPath(A, {
        size: 0,
        mtime: new Date,
        isDirectory: !0,
        isFile: !1,
        isSymlink: !1
      }, p), r.scannedDirectories++, n = !0;
      else if (s.isSymbolicLink() && h.followSymlinks) {
        let _ = await b_.stat(A).catch(() => null);
        if (_ && _.isDirectory()) o = this.createEntryFromPath(A, {
          size: 0,
          mtime: _.mtime,
          isDirectory: !0,
          isFile: !1,
          isSymlink: !0
        }, p), r.scannedDirectories++, n = !0;
        else if (_) o = this.createEntryFromPath(A, {
          size: _.size,
          mtime: _.mtime,
          isDirectory: !1,
          isFile: !0,
          isSymlink: !0
        }, p), r.scannedFiles++;
        else {
          r.skippedPaths++;
          continue
        }
      } else {
        let _ = await b_.stat(A);
        o = this.createEntryFromPath(A, {
          size: _.size,
          mtime: _.mtime,
          isDirectory: !1,
          isFile: !0,
          isSymlink: _.isSymbolicLink()
        }, p), r.scannedFiles++
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
          continue
        }
        if (h.visitedRealDirs.has(_)) continue;
        h.visitedRealDirs.add(_), await this.scanDirectoryRecursive(A, R, a + 1, e, t, r, h)
      }
    } catch (o) {
      if (o instanceof Error) {
        if ("code" in o && (o.code === "EACCES" || o.code === "EPERM" || o.code === "ENOENT")) {
          r.skippedPaths++;
          continue
        }
      }
      J.warn("Error processing file", {
        error: o
      }), r.skippedPaths++
    }
  }
}
async scanAlwaysIncludePaths(T, R, a, e, t) {
  let r = [],
    h = new Set(e.map((c) => c.path)),
    i = new Set;
  for (let c of R) {
    let s = c.split("/"),
      A = "";
    for (let l of s) {
      if (l.includes("*") || l.includes("?") || l.includes("[")) break;
      A = A ? `${A}/${l}` : l
    }
    if (A) i.add(A)
  }
  for (let c of i) {
    let s = lg(T, c);
    try {
      let A = await b_.stat(s);
      if (A.isDirectory()) await this.scanAlwaysIncludeDir(s, T, a, h, r, t);
      else if (!h.has(s)) {
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
        }))
      }
    } catch {}
  }
  return r
}
async scanAlwaysIncludeDir(T, R, a, e, t, r) {
  let h;
  try {
    h = await b_.readdir(T, {
      withFileTypes: !0
    })
  } catch {
    return
  }
  for (let i of h) {
    let c = lg(T, i.name),
      s = Ag(R, c);
    if (e.has(c)) continue;
    if (!(a?.(s) ?? !1)) continue;
    try {
      if (i.isDirectory()) t.push(this.createEntryFromPath(c, {
        size: 0,
        mtime: new Date,
        isDirectory: !0,
        isFile: !1,
        isSymlink: !1
      }, {
        rootPath: R,
        alwaysIncludeMatcher: a
      })), await this.scanAlwaysIncludeDir(c, R, a, e, t, r);
      else if (i.isSymbolicLink() && r.followSymlinks) {
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
            })), A.isDirectory()) await this.scanAlwaysIncludeDir(c, R, a, e, t, r)
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
        }))
      }
    } catch {}
  }
}
createEntryFromPath(T, R, a) {
  let e;
  if (R.isDirectory) e = "directory";
  else e = "file";
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
    i = a.alwaysIncludeMatcher(c)
  }
  return new Fk({
    id: r,
    kind: e,
    path: T,
    uri: h,
    metadata: t,
    isAlwaysIncluded: i
  })
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
    if (this.queryChars = Array.from(a), this.queryLower = Array.from(a.toLowerCase()), this.config.smartCase) this.config.caseSensitive = a !== a.toLowerCase()
  }
  match(T) {
    if (this.queryChars.length === 0) return T.filter((a) => a.shouldIncludeInResults()).map((a) => {
      let e = this.config.openFiles?.includes(a.path) ? 500 : 0,
        t = this.config.dirtyFiles?.includes(a.path) ? 300 : 0,
        r = a.getImportanceBoost() + e + t - this.getTestAndStoryPathPenalty(a.path);
      return {
        entry: a,
        score: r,
        matchPositions: [],
        highlightedPath: a.path
      }
    }).sort((a, e) => e.score - a.score).slice(0, this.config.maxResults);
    let R = this.matchWithSemanticScoring(T);
    if (R.length > 0) return R;
    return this.matchWithFuzzyScoring(T)
  }
  matchWithSemanticScoring(T) {
    let R = [],
      a = 0,
      e = 50000,
      t = this.queryChars.join(""),
      r = T.filter((i) => i.shouldIncludeInResults() && this.passesCharBagFilter(t, i)),
      h = (i) => {
        let c = this.matchEntrySemantic(i);
        if (c && c.score >= this.config.minScore) R.push(c);
        return a++, a >= e
      };
    for (let i of r)
      if (i.isDirectory()) {
        if (h(i)) break
      }
    if (a < e) {
      for (let i of r)
        if (!i.isDirectory()) {
          if (h(i)) break
        }
    }
    return R.sort((i, c) => {
      let s = c.score - i.score;
      if (Math.abs(s) > 0.001) return s;
      return i.entry.path.length - c.entry.path.length
    }), R.slice(0, this.config.maxResults)
  }
  matchWithFuzzyScoring(T) {
    let R = [],
      a = 0,
      e = 50000,
      t = this.queryChars.join(""),
      r = T.filter((i) => i.shouldIncludeInResults() && this.passesCharBagFilter(t, i)),
      h = (i) => {
        let c = this.matchEntryFuzzy(i);
        if (c) R.push(c);
        return a++, a >= e
      };
    for (let i of r)
      if (i.isDirectory()) {
        if (h(i)) break
      }
    if (a < e) {
      for (let i of r)
        if (!i.isDirectory()) {
          if (h(i)) break
        }
    }
    return R.sort((i, c) => {
      let s = c.score - i.score;
      if (Math.abs(s) > 0.001) return s;
      return i.entry.path.length - c.entry.path.length
    }), R.slice(0, this.config.maxResults)
  }
  matchEntrySemantic(T) {
      let R = T.path,
        a = this.queryLower.join(""),
        e = this.calculateSemanticScore(a, T);
      if (e === 0) return null;
      let t = this.applyTieBreakers(e, a, T),
        r = this.findMatchPositions(a, R),
        h = this.createHighlighte
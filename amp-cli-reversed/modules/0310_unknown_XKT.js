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
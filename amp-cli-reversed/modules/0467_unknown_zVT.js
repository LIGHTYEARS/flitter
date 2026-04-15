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
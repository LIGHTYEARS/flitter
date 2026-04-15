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
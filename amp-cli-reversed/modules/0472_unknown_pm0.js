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
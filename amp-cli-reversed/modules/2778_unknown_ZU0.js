async function QU0(T) {
  return new et(new I3({
    child: new Z3({
      markdown: ThT(RhT(T))
    })
  }), "Thread Diagnostics", "info", "help", {
    width: 100,
    height: 26
  });
}
async function ZU0(T, R) {
  let a = T.logFile;
  if (!a) return Error("CLI log file is unavailable for this session");
  let e = BRR(R.description);
  if (e.trim().length === 0) return Error("Description is required");
  let t = R.images,
    r = ed(a),
    h = process.pid,
    i = UU0(e) || "debug-package",
    c = OU0.tmpdir(),
    s = ys.join(c, `amp-${i}`),
    A = `${s}.zip`;
  T.showStatusMessage("Building debug package...");
  try {
    C_(`mkdir -p ${s}`);
    let l = `select(.pid == ${h})`,
      o = C_(`cat ${r} | jq -c '${l}'`, {
        encoding: "utf-8",
        maxBuffer: 52428800
      });
    if (await ZP(ys.join(s, "cli-logs.json"), o, "utf-8"), Tm(T.thread)) {
      let _ = ys.join(s, "thread.sqlite");
      try {
        let m = await T.configService.getLatest(),
          b = await m.secrets.getToken("apiKey", m.settings.url),
          y = Pi(T.ampURL),
          u = await fetch(`${y}/threads/${T.thread.id}/sql`, {
            headers: {
              Authorization: `Bearer ${b}`
            }
          });
        if (!u.ok) throw Error(`Dump request failed (${u.status})`);
        let P = await u.text();
        C_(`sqlite3 ${_}`, {
          input: P,
          stdio: ["pipe", "ignore", "pipe"],
          timeout: 30000
        });
      } catch (m) {
        J.warn("DTW dump failed, continuing without it", {
          error: m
        });
      }
    }
    if (await ZP(ys.join(s, "thread.yaml"), MRR.default.stringify(T.thread), "utf-8"), Tm(T.thread) && process.env.CLOUDFLARE_API_TOKEN) try {
      C_(`./scripts/fetch-cloudflare-logs.ts ${T.thread.id} --output ${ys.join(s, "cloudflare-logs.json")}`, {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 60000
      });
    } catch (_) {
      J.warn("Cloudflare log fetch failed, continuing without it", {
        error: _
      });
    }
    let n = await qU0(s, t),
      p = zU0(e, RhT(T), n);
    await ZP(ys.join(s, "agent-read-this.md"), p, "utf-8"), C_(`zip -j ${A} ${s}/*`), C_(`osascript -e 'set the clipboard to POSIX file "${A}"'`), T.showToast("Debug package copied to clipboard \u2014 paste into Slack", "success"), J.info("Packaged debug bundle to clipboard", {
      zipPath: A,
      packageDir: s,
      pid: h,
      threadId: T.thread.id
    });
    return;
  } catch (l) {
    return J.error("Failed to package debug bundle", {
      error: l
    }), Error("Failed to package debug bundle", {
      cause: l
    });
  }
}
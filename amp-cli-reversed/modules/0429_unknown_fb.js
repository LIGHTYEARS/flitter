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
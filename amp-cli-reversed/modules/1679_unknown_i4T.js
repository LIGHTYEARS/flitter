function i4T(...T) {
  return new AR(R => {
    let a = !1,
      e,
      t = !1;
    return (async () => {
      try {
        let {
          spawn: r
        } = await import("child_process");
        if (a) return;
        e = r(T[0], T[1], BpR(T[2])), js.add(e), e.on("spawn", () => {
          R.next({
            type: "spawn",
            pid: e?.pid,
            process: e
          });
        }), e.stdout?.on("data", h => {
          if (a || t) return;
          R.next({
            type: "data",
            stream: "stdout",
            chunk: Buffer.isBuffer(h) ? h : Buffer.from(String(h)),
            pid: e?.pid,
            process: e
          });
        }), e.stderr?.on("data", h => {
          if (a || t) return;
          R.next({
            type: "data",
            stream: "stderr",
            chunk: Buffer.isBuffer(h) ? h : Buffer.from(String(h)),
            pid: e?.pid,
            process: e
          });
        }), e.on("exit", h => {
          if (a || t) return;
          R.next({
            type: "exit",
            exitCode: h
          });
        }), e.on("close", h => {
          if (a) return;
          if (t) return;
          if (t = !0, R.next({
            type: "close",
            exitCode: h
          }), R.complete(), e) js.delete(e);
        }), e.on("error", h => {
          if (a || t) return;
          if (t = !0, R.error(h), e) js.delete(e);
        });
      } catch (r) {
        if (a) return;
        R.error(r);
      }
    })(), () => {
      if (a = !0, e && !t) t9T(e), js.delete(e);
    };
  });
}
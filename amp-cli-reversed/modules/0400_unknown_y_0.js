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
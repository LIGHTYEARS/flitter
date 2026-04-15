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
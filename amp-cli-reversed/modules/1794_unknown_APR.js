async function APR(T, R, a, e) {
  let t = a.loadProfile === "never" || !a.workingDirectory || !Pj(a.workingDirectory) ? process.env : await m0(hDT(a.workingDirectory.fsPath, a.loadProfile)),
    r = T.env ? Object.entries(T.env).reduce((o, [n, p]) => ({
      ...o,
      [n]: z$(p, t)
    }), {}) : void 0,
    h = _PR({
      ...t,
      ...r,
      AWS_VAULT_PROMPT: "stdout"
    }),
    i = z$(T.command, h),
    c = T.args ? T.args.map(o => z$(o, h)) : void 0,
    s = lPR(T),
    A = !1;
  if (s && e) {
    let o = await dj(e);
    if (!o.acquired) {
      J.info("Another Amp instance is connecting to OAuth proxy, waiting", {
        serverName: e,
        holderPid: o.holder.pid
      });
      let n = Date.now(),
        p = 300000;
      while (Date.now() - n < p) if (await new Promise(_ => setTimeout(_, a4T)), (await dj(e)).acquired) {
        A = !0, J.info("Acquired lock after waiting, proceeding with connection", {
          serverName: e,
          waitedMs: Date.now() - n
        });
        break;
      }
      if (!A) {
        let _ = gpR(e);
        throw Error(`Timed out waiting for another Amp instance to complete OAuth for ${e}. If this persists, you can manually remove the lock file: ${_}`);
      }
    } else A = !0;
  }
  let l = new TDT({
    command: i,
    args: c,
    stderr: "pipe",
    cwd: a.workingDirectory && Pj(a.workingDirectory) ? a.workingDirectory.fsPath : void 0,
    env: h
  });
  try {
    await R.connect(l, {
      timeout: jG
    });
    let o = iPR(i, e);
    if (A && e) await ED(e);
    return {
      client: R,
      transportInfo: {
        type: "StdioClientTransport",
        url: o
      }
    };
  } catch (o) {
    if (A && e) await ED(e);
    if (o instanceof Error && o.message.includes("Connection closed")) throw Error("MCP server connection was closed unexpectedly.");
    throw o;
  }
}
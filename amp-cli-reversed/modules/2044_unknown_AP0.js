async function AP0(T) {
  let {
      applyOnce: R,
      checkoutMode: a,
      checkoutPrompt: e,
      promptForEnter: t,
      promptForYesNo: r,
      repoRoot: h,
      stderr: i,
      stdout: c,
      workerURL: s
    } = T,
    A = await IXT(h),
    l = KP0(),
    o = await uA(T.threadId, T.configService, T.apiKey);
  if (!o.usesDtw) throw new GR("live-sync only supports v2/DTW threads", 1);
  let n = OP0({
      threadId: T.threadId,
      threadTitle: T.threadInfo.title,
      repoRoot: h,
      stdout: c,
      stderr: i
    }),
    p = iP0({
      stdout: c,
      stderr: i,
      onWriteLine: (j, d) => n.writeLine(j, d),
      onPromptStart: () => n.onPromptStart(),
      onPromptEnd: () => n.onPromptEnd()
    }),
    _ = RA(c) ? jP0({
      outputSurface: n,
      lineWriter: p
    }) : null,
    m = cP0({
      initialArchived: T.threadInfo.archived,
      loadArchived: () => ZP0({
        threadId: T.threadId,
        threadService: T.threadService
      }),
      onCheckError: j => {
        if (l) p.writeStderrLine(`live-sync: debug: failed to refresh archived state: ${CM(j)}`);
      }
    }),
    b = null,
    y = null,
    u = !1,
    P = !1,
    k = ak0(),
    x = k.promise.then(() => {
      P = !0;
    }),
    f = m.archivedTransition.then(() => {
      u = !0;
    }),
    v = !0,
    g = !1,
    I = () => new uH({
      baseURL: s,
      threadId: o.threadId,
      wsToken: o.wsToken,
      wsTokenProvider: async () => {
        let j = await uA(o.threadId, T.configService, T.apiKey);
        return {
          threadId: j.threadId,
          wsToken: j.wsToken
        };
      },
      WebSocketClass: WebSocket,
      maxReconnectAttempts: Number.POSITIVE_INFINITY,
      pingIntervalMs: 5000
    }),
    S = j => {
      n.clearTransientStatus(), p.writeStdoutLine(j);
    },
    O = async () => {
      let j = I(),
        d = null,
        C = null,
        L = !1,
        w = !1,
        D = null,
        B = null,
        M = null,
        V = 0,
        Q = !1,
        W = null,
        eT = null,
        iT = null,
        aT = new Promise(Z => {
          iT = Z;
        }),
        oT = null,
        TT = new Promise((Z, X) => {
          oT = X;
        });
      TT.catch(() => {});
      let tT = sP0(zy0),
        lT = [x.then(() => ny), f.then(() => oy), tT.promise.then(() => yg)],
        N = Z => {
          if (!oT) return;
          if (l) p.writeStderrLine(`live-sync: debug: fatal error: ${CM(Z)}`);
          let X = oT;
          oT = null, X(Z);
        },
        q = () => {
          n.clearTransientStatus();
        },
        F = () => {
          if (!L || C) return;
          C = E().catch(Z => {
            N(Z);
          }).finally(() => {
            if (C = null, L && d) F();
          });
        },
        E = async () => {
          while (L && d) {
            let Z = d;
            if (d = null, !Z.available) {
              if (Z.unavailableReason && Z.unavailableReason !== W) p.writeStderrLine(`live-sync: git status unavailable: ${Z.unavailableReason}`), W = Z.unavailableReason;
              continue;
            }
            if (W = null, y && Z.head && Z.head !== y) p.writeStderrLine([`live-sync: thread HEAD changed from ${Ji(y)}`, `to ${Ji(Z.head)}.`, "Consider restarting after checking out the new commit locally."].join(" "));
            y = Z.head ?? y;
            try {
              let X = await hP0({
                repoRoot: h,
                previousStatus: b,
                nextStatus: Z,
                readRemoteFile: hT => PP0(j, hT),
                progressReporter: _ ?? void 0
              });
              n.clearTransientStatus(), B = null, V = 0, Q = !1, b = Z;
              let rT = gP0(X);
              if (M = rT, rT && !_) p.writeStdoutLine(rT);
            } catch (X) {
              if (IP0(X)) {
                let rT = fF(X),
                  hT = jtT(X);
                if (d = Z, V = hT ? V + 1 : 0, !hT) n.clearTransientStatus();
                if (!hT && rT !== B) p.writeStderrLine(rT), B = rT;
                if (hT) n.setTransientStatus(SP0(V)), B = rT;
                if (hT && !Q && V >= Ky0) {
                  Q = !0;
                  try {
                    n.clearTransientStatus(), await YP0({
                      transport: j,
                      threadId: T.threadId,
                      threadService: T.threadService
                    });
                  } catch (pT) {
                    p.writeStderrLine(["live-sync: couldn't request an executor reconnect automatically:", CM(pT)].join(" "));
                  }
                }
                await XP0(Gy0);
                continue;
              }
              throw n.clearTransientStatus(), X;
            }
          }
        },
        U = {
          onConnectionChange: Z => {
            if (q(), D === null && Z.state === "disconnected") {
              D = Z.state;
              return;
            }
            if (Z.state === D) return;
            if (D = Z.state, Z.state === "connected") j.resumeFromVersion(Hy0), F();
          },
          onArtifacts: Z => {
            if (w) return;
            let X = nP0(Z);
            if (X.error) {
              if (X.error !== eT) p.writeStderrLine(`live-sync: failed to parse git status artifact: ${X.error}`), eT = X.error;
              return;
            }
            if (!X.status) return;
            if (eT = null, d = X.status, X.status.available) iT?.(X.status), iT = null;
            F();
          },
          onError: Z => {
            q(), p.writeStderrLine(`live-sync: transport error: ${Z.message}`);
          },
          onExecutorError: Z => {
            q(), p.writeStderrLine(`live-sync: executor error: ${Z.message}`);
          },
          onExecutorStatus: Z => {
            if (Z.status === "running") F();
          }
        };
      j.setObserverCallbacks(U);
      try {
        let Z = await U4(j.ensureConnected({
          maxAttempts: 1,
          waitForConnectedTimeoutMs: Vy0,
          onRetryableConnectError: pT => {
            let mT = fF(pT);
            if (mT !== B) p.writeStderrLine(mT), B = mT;
          }
        }), lT);
        if (Z === ny) return "stopped";
        if (Z === oy) return "archived";
        if (Z === yg) return "paused";
        if (!Z) {
          let pT = fF(new z8("Timed out waiting to reconnect to DTW"));
          if (pT !== B) p.writeStderrLine(pT), B = pT;
        }
        let X = await U4(_P0({
          initialAvailableStatus: aT,
          timeoutMs: T.initialGitStatusTimeoutMs ?? Wy0
        }), lT);
        if (X === ny) return "stopped";
        if (X === oy) return "archived";
        if (X === yg) return "paused";
        let rT = X;
        if (y = rT.head ?? y, v) {
          let pT = await Bw(h),
            mT = !1;
          if (!R && pT.length > 0 && r) mT = !0, await rP0({
            repoRoot: h,
            promptForYesNo: bT => p.runWithPromptBuffer(() => r(Uw(bT, c))),
            stdout: c
          }), pT = await Bw(h);
          if (mT && RA(c)) p.writeStdoutLine("");
          let yT = pT.length === 0,
            uT = pP0(a, yT, R);
          if (rT.head && A && rT.head !== A && (!R || uT === "always")) A = await bP0({
            checkoutMode: uT,
            localWorktreeIsClean: yT,
            promptForYesNo: bT => p.runWithPromptBuffer(() => e(Uw(bT, c))),
            repoRoot: h,
            remoteHead: rT.head,
            localHead: A,
            stdout: c,
            stderr: i,
            threadId: T.threadId
          });
        }
        if (R) {
          if (w = !0, d = rT, L = !0, F(), !C) throw new GR("Expected thread snapshot apply to start processing.", 1);
          let pT = await U4(C, lT);
          if (pT === ny) return "stopped";
          if (pT === oy) return "archived";
          if (pT === yg) return "paused";
          if (!M) p.writeStdoutLine("Thread snapshot already matches your local checkout.");
          return "applied";
        }
        if (L = !0, F(), C) {
          let pT = await U4(C, lT);
          if (pT === ny) return "stopped";
          if (pT === oy) return "archived";
          if (pT === yg) return "paused";
        }
        if (u) return "archived";
        if (P) return "stopped";
        if (!g) {
          if (RA(c)) p.writeStdoutLine("");
          p.writeStdoutLine(kXT), g = !0;
        }
        let hT = await Promise.race([...lT, TT]);
        if (hT === ny) return "stopped";
        if (hT === oy) return "archived";
        return "paused";
      } finally {
        if (q(), oT = null, l) p.writeStdoutLine("live-sync: debug: shutting down subscriptions and transport");
        if (L = !1, tT.dispose(), j.setObserverCallbacks(null), (await j.disconnectAndWait()).status === "timeout") J.info("Live sync timed out waiting for DTW close acknowledgement", {
          threadId: T.threadId
        });
        j.dispose();
      }
    };
  try {
    while (!0) {
      let j = await O();
      if (j === "applied") return;
      if (j === "archived") {
        S("Stopping live sync because this thread was archived.");
        return;
      }
      if (j === "stopped") {
        S("Stopping live sync.");
        return;
      }
      J.info("Live sync session paused", {
        threadId: T.threadId,
        repoRoot: h,
        reason: "max_duration"
      });
      let d = new AbortController();
      x.then(() => d.abort()), f.then(() => d.abort());
      let C = await p.runWithPromptBuffer(() => t(Qy0, d.signal));
      if (u) {
        S("Stopping live sync because this thread was archived.");
        return;
      }
      if (P || !C) {
        S("Stopping live sync.");
        return;
      }
      if (J.info("Live sync session resumed", {
        threadId: T.threadId,
        repoRoot: h
      }), RA(c)) p.writeStdoutLine("");
      v = !1;
    }
  } finally {
    k.dispose(), m.dispose(), n.dispose();
  }
}
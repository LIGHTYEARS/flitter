async function OBR(T, R, a, e, t, r, h) {
  let {
      binary: i,
      args: c = [],
      objective: s,
      replDescription: A,
      workingDirectory: l,
      initialOutputTimeoutMs: o
    } = T,
    n = l ?? R.dir?.fsPath ?? globalThis.process.cwd();
  if (!Nx.existsSync(n)) {
    a.next({
      status: "error",
      error: {
        message: `Working directory does not exist: ${n}`
      }
    }), a.complete();
    return;
  }
  let p = Eh(),
    _ = R,
    m = await ct.getOrCreateForThread(_, p),
    b = m.status.pipe(da(aT => aT.state === "active")).subscribe(aT => {
      if (aT.state === "active" && aT.ephemeralError) J.error("REPL subthread ephemeral error", {
        error: aT.ephemeralError
      });
    });
  h(b), await m.handle({
    type: "main-thread",
    value: R.thread.id
  }), await m.handle({
    type: "title",
    value: `repl(${i}): ${dBR(s, 50)}`
  });
  let y = R.agentMode || Jy(R.config.settings);
  if (await m.handle({
    type: "agent-mode",
    mode: y
  }), R.threadEnvironment) await m.handle({
    type: "environment",
    env: {
      initial: R.threadEnvironment
    }
  });
  let u = CBR(n),
    P = EBR(A, s, u),
    k;
  try {
    k = SBR(i, c, n), t(k);
  } catch (aT) {
    a.next({
      status: "error",
      progress: {
        threadID: p
      },
      error: {
        message: `Failed to start REPL process: ${aT}`
      }
    }), a.complete();
    return;
  }
  let x = {
    error: null
  };
  k.onError(aT => {
    x.error = aT;
  });
  let f = await Promise.race([new Promise(aT => k.onReady(() => aT("ready"))), new Promise(aT => k.onError(() => aT("error"))), new Promise(aT => setTimeout(() => aT("timeout"), EmT))]);
  if (f === "error" || x.error) {
    a.next({
      status: "error",
      progress: {
        threadID: p
      },
      error: {
        message: `Failed to spawn REPL process "${i}": ${x.error?.message ?? "Unknown error"}. Check that the binary exists and is executable.`
      }
    }), a.complete();
    return;
  }
  if (f === "timeout") {
    k.kill(), a.next({
      status: "error",
      progress: {
        threadID: p
      },
      error: {
        message: `REPL process "${i}" failed to start within ${EmT}ms.`
      }
    }), a.complete();
    return;
  }
  let v = [],
    g = 0,
    I = !1;
  k.onData(aT => {
    if (I) return;
    if (g += aT.length, g > OmT) {
      I = !0, J.warn("REPL output buffer overflow", {
        size: g
      });
      return;
    }
    v.push(aT);
  });
  let S = !1,
    O = null,
    j = {
      error: null
    };
  k.onExit(({
    exitCode: aT
  }) => {
    J.debug("REPL process exited", {
      exitCode: aT
    }), S = !0, O = aT;
  }), k.onError(aT => {
    j.error = aT;
  });
  let d = async aT => {
      let oT = Date.now();
      await new Promise(N => setTimeout(N, Math.min(aT, SmT)));
      let TT = "",
        tT = -1,
        lT = aT + 5000;
      while (v.length > 0 || TT.length !== tT) {
        if (e.aborted) break;
        if (Date.now() - oT > lT) {
          J.debug("REPL drainOutput timeout exceeded", {
            elapsed: Date.now() - oT
          });
          break;
        }
        tT = TT.length;
        while (v.length > 0) TT += v.shift();
        await new Promise(N => setTimeout(N, SmT));
      }
      return g = 0, TT;
    },
    C = [],
    L = [],
    w = [],
    D = "",
    B = "",
    M = !1,
    V = 0,
    Q = o ?? BBR,
    W = !1;
  try {
    let aT = await d(Q);
    if (S && !aT) {
      a.next({
        status: "error",
        progress: {
          threadID: p
        },
        error: {
          message: `The REPL process "${i}" exited immediately with code ${O} without producing any output. Check that the binary exists and the arguments are correct.`
        }
      }), a.complete();
      return;
    }
    if (aT) C.push({
      role: "user",
      content: `[REPL started. Initial output:]
${aT}`
    });else C.push({
      role: "user",
      content: "[REPL started. Awaiting your input.]"
    });
    let oT = await R.configService.getLatest(e),
      {
        model: TT
      } = pn(oT.settings, R.thread),
      tT = Xt(TT),
      lT = Ys(TT),
      N = Math.floor(lT * NBR);
    for (let q = 0; q < DBR && !M && !e.aborted; q++) {
      if (S) {
        B = `REPL process exited with code ${O}`;
        break;
      }
      if (j.error) {
        B = `REPL process error: ${j.error.message}`;
        break;
      }
      if (I) {
        B = `REPL output exceeded ${OmT} bytes limit`;
        break;
      }
      if (V > 0 && V >= N) {
        B = `Context window limit reached (${V.toLocaleString()} / ${lT.toLocaleString()} tokens used)`;
        break;
      }
      a.next({
        status: "in-progress",
        progress: {
          threadID: p,
          iteration: q + 1,
          transcript: [...L]
        }
      });
      let F = new AbortController(),
        E = setTimeout(() => {
          F.abort();
        }, dmT),
        U = e.aborted ? e : AbortSignal.any([e, F.signal]),
        Z;
      try {
        Z = await SwT(C, [rqT], [{
          type: "text",
          text: P
        }], {
          id: p,
          agentMode: R.agentMode
        }, {
          configService: R.configService
        }, tT, U);
      } catch (uT) {
        if (clearTimeout(E), F.signal.aborted && !e.aborted) {
          B = `Iteration ${q + 1} timed out after ${dmT}ms`;
          break;
        }
        throw uT;
      } finally {
        clearTimeout(E);
      }
      if (Z["~debugUsage"]) {
        let uT = Z["~debugUsage"];
        V = uT.inputTokens, w.push({
          inferenceTimeMs: 0,
          usage: {
            model: uT.model ?? tT,
            inputTokens: uT.inputTokens,
            outputTokens: uT.outputTokens,
            cacheWriteTokens: uT.cacheCreationInputTokens ?? 0,
            cacheReadTokens: uT.cacheReadInputTokens ?? 0
          }
        });
      }
      if (!Z.message) {
        B = "No response from model";
        break;
      }
      let X = Z.message.content.filter(uT => uT.type === "tool_use");
      if (X.length > 0) {
        let uT = X.find(jT => jT.name === "stop");
        if (uT) {
          B = uT.input.message ?? "Session ended", M = !0, C.push({
            role: "assistant",
            content: Z.message.content
          }), C.push({
            role: "user",
            content: [o7(uT.id, {
              status: "done",
              result: `Session terminated: ${B}`
            })]
          });
          break;
        }
        let bT = X.map(jT => ({
          type: "tool_result",
          tool_use_id: jT.id,
          content: `Unknown tool: ${jT.name}`
        }));
        C.push({
          role: "assistant",
          content: Z.message.content
        }), C.push({
          role: "user",
          content: bT
        });
        continue;
      }
      let rT = Z.message.content.filter(uT => uT.type === "text").map(uT => uT.text).join(""),
        hT,
        pT = !1;
      if (rT) {
        let uT = MBR(rT);
        hT = uT.join(`
`);
        for (let bT of uT) if (!k.write(bT + `
`)) {
          pT = !0;
          break;
        }
      }
      if (pT) {
        B = S ? `REPL process exited with code ${O} (write failed)` : "Failed to write to REPL stdin";
        break;
      }
      let mT = hT && !W;
      if (hT) W = !0, L.push({
        type: "input",
        content: hT
      }), a.next({
        status: "in-progress",
        progress: {
          threadID: p,
          iteration: q + 1,
          input: hT,
          transcript: [...L]
        }
      });
      C.push({
        role: "assistant",
        content: Z.message.content
      });
      let yT = await d(wBR);
      if (yT) D = yT, L.push({
        type: "output",
        content: yT
      }), C.push({
        role: "user",
        content: `[REPL output:]
${yT}`
      }), a.next({
        status: "in-progress",
        progress: {
          threadID: p,
          iteration: q + 1,
          input: hT,
          output: yT,
          transcript: [...L]
        }
      });else if (mT && !S) {
        k.kill(), a.next({
          status: "error",
          progress: {
            threadID: p
          },
          error: {
            message: `The REPL process "${i}" did not produce any output after receiving input. This typically means the program is waiting for input but is not running in interactive mode.

To fix this, try invoking the REPL with flags that enable interactive mode:
- python: use \`python3 -i\` for interactive mode
- bash, zsh: use \`bash -i\` for interactive mode
- irb: use --noautocomplete

If the program requires a TTY, it may not be compatible with this tool.`
          }
        }), a.complete();
        return;
      } else C.push({
        role: "user",
        content: "[No output received. The REPL may be waiting for more input or processing.]"
      });
    }
  } catch (aT) {
    k.kill();
    let oT = S ? ` (process exited with code ${O})` : "";
    a.next({
      status: "error",
      progress: {
        threadID: p,
        transcript: L
      },
      error: {
        message: `Agent loop error: ${aT}${oT}`
      }
    }), a.complete();
    return;
  } finally {
    k.kill();
  }
  let eT = [];
  if (B) eT.push(B);else eT.push("Session ended");
  if (S) eT.push(`
Process exit code: ${O}`);
  if (D) eT.push(`
Last output:
${D}`);
  if (I) eT.push(`
[Warning: Output was truncated due to buffer overflow]`);
  let iT = eT.join("");
  J.debug("REPL tool completed with subthread usage", {
    subThreadID: p,
    inferenceCount: w.length,
    exitCode: O
  }), a.next({
    status: "done",
    progress: {
      threadID: p,
      transcript: L
    },
    result: iT,
    "~debug": {
      threadID: p,
      inferences: w,
      exitCode: O
    }
  }), a.complete();
}
async function Yl0(T) {
  let {
      threadPool: R,
      userInput: a,
      stdinInput: e,
      dependencies: t,
      streamJson: r,
      streamJsonInput: h,
      streamJsonThinking: i,
      stats: c,
      ampURL: s,
      isDogfooding: A,
      agentMode: l,
      labels: o
    } = T,
    n = await m0(R.threadHandles$.pipe(da(y => y !== null), ti(1), Gl(5000))),
    p = await m0(n.thread$.pipe(ti(1), Gl(5000))),
    _ = p.id;
  if (p.agentMode && qt(p.agentMode) && !A) throw new GR(`Execute mode is not permitted for threads in '${p.agentMode}' mode.`, 1);
  if (await n.preExecuteMode?.(), r) return await Kl0({
    handle: n,
    threadID: _,
    initialThread: p,
    userInput: a,
    stdinInput: e,
    dependencies: t,
    streamJsonInput: h,
    streamJsonThinking: i,
    ampURL: s,
    isDogfooding: A,
    agentMode: l,
    labels: o
  }), _;
  let m = $kT(p.messages),
    b = [{
      type: "text",
      text: a
    }];
  if (e) b.unshift({
    type: "text",
    text: `Input received on stdin:
\`\`\`
${e}
\`\`\``
  });
  return await n.sendMessage({
    content: b,
    agentMode: l ?? "smart"
  }), new Promise((y, u) => {
    let P = !1,
      k = p,
      x = [],
      f = setInterval(() => {}, 1000),
      v = wKT(() => {
        if (!P) J.debug("User cancelled (SIGINT/SIGTERM)"), g();
      });
    v.install();
    let g = async () => {
        if (P) return;
        P = !0, v.remove(), clearInterval(f), I.unsubscribe(), S.unsubscribe(), j.unsubscribe(), O?.unsubscribe();
        try {
          if (await n.postExecuteMode?.(), o && o.length > 0) await NKT(_, o, t.configService);
          y(_);
        } catch (d) {
          u(d);
        }
      },
      I = n.threadViewState$.subscribe(async d => {
        if (d.state === "active" && d.ephemeralError) {
          J.error("error", {
            error: d.ephemeralError
          }), process.stderr.write("Error: " + vkT(d.ephemeralError) + `
`), await g();
          return;
        }
        if (d.state === "active" && d.inferenceState === "idle") {
          if (x.length > 0) {
            let L = x[0];
            if (L?.toolName === U8) {
              let w = IuT(L.args);
              process.stderr.write(`Error: The ${U8} tool tried to run a command that isn't allowlisted. Rerun with --dangerously-allow-all to bypass, or add to the command allowlist in permissions (https://ampcode.com/manual#permissions).

Command:

${jkT("\t", w ?? "(unknown)")}

`);
            } else if (L) process.stderr.write(`Error: The ${L.toolName} tool is not allowed to run in execute mode. Rerun with --dangerously-allow-all to bypass.
`);
            await g();
            return;
          }
          let C = k.messages.flatMap(L => L.content.map(w => {
            if (w.type === "tool_result" && w.run.status === "blocked-on-user") return Tn(k, w.toolUseID);
          }).filter(w => w !== void 0));
          if (C.length > 0) {
            J.warn("Tools require user consent - exiting execute mode", {
              blockedTools: C.map(w => ({
                name: w.name,
                id: w.id
              }))
            });
            let L = C[0];
            if (L.name === U8) {
              let w = IuT(L.input);
              process.stderr.write(`Error: The ${U8} tool tried to run a command that isn't allowlisted. Rerun with --dangerously-allow-all to bypass, or add to the command allowlist in permissions (https://ampcode.com/manual#permissions).

Command:

${jkT("\t", w ?? "(unknown)")}

`);
            } else process.stderr.write(`Error: The ${L.name} tool is not allowed to run in execute mode. Rerun with --dangerously-allow-all to bypass.`);
            await g();
          }
        }
      }),
      S = n.pendingApprovals$.subscribe(d => {
        x = d;
      }),
      O = n.inferenceErrors$?.subscribe(async d => {
        J.error("error", {
          error: d
        }), process.stderr.write("Error: " + vkT(d) + `
`), await g();
      }),
      j = n.thread$.subscribe(async d => {
        if (k = d, $kT(d.messages) > m) {
          let C = dt(d, "assistant");
          if (C && UET(C)) {
            if (C.content.some(w => w.type === "tool_use")) return;
            let L = kr(C.content).trim();
            if (c) {
              let w = C.usage,
                D = {
                  result: L,
                  usage: {
                    input_tokens: w?.inputTokens || 0,
                    output_tokens: w?.outputTokens || 0,
                    cache_creation_input_tokens: w?.cacheCreationInputTokens || 0,
                    cache_read_input_tokens: w?.cacheReadInputTokens || 0
                  }
                };
              process.stdout.write(JSON.stringify(D) + `
`);
            } else if (L) process.stdout.write(L + `
`);
            await g();
          }
        }
      });
  });
}
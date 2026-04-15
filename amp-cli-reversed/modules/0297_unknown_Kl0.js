async function Kl0({
  handle: T,
  threadID: R,
  initialThread: a,
  userInput: e,
  stdinInput: t,
  dependencies: r,
  streamJsonInput: h = !1,
  streamJsonThinking: i = !1,
  stdin: c = process.stdin,
  ampURL: s = "https://ampcode.com",
  isDogfooding: A = !1,
  agentMode: l,
  labels: o
}) {
  let n = a ?? (await m0(T.thread$.pipe(ti(1), Gl(5000)))),
    p = l ?? n.agentMode ?? "smart";
  if (qt(p) && !A) throw new GR(`Stream JSON mode is not permitted with '${p}' mode.`, 1);
  let _ = R,
    m = Date.now(),
    b = 0,
    y = !1,
    u = n,
    P = null;
  if (t && t.length > fkT) throw Error(`Stdin input too large: ${t.length} bytes (max ${fkT})`);
  let k,
    x = wKT(() => {
      if (!y) k("User cancelled (SIGINT/SIGTERM)");
    });
  try {
    x.install();
    let f = (await m0(r.toolService.getTools(p).pipe(ti(1), Gl(5000)))).map(D => D.spec.name),
      v = [];
    try {
      v = (await m0(r.mcpService.servers.pipe(ti(1), Gl(5000)))).map(D => ({
        name: D.name,
        status: D.status.type
      }));
    } catch (D) {
      J.warn("Unable to obtain MCP server list for system init message", {
        err: D
      });
    }
    let g = {
      type: "system",
      subtype: "init",
      cwd: process.cwd(),
      session_id: _,
      tools: f,
      mcp_servers: v
    };
    await ng(g);
    let I = IkT(n.messages),
      S = n.messages.length,
      O = new Set(),
      j = [],
      d = !h,
      C = !1,
      L = [],
      w = Fl0(async D => {
        while (S < D.messages.length) {
          let B = D.messages[S],
            M = Gl0(B);
          if (M === 1) {
            S++;
            continue;
          }
          if (M === 2) break;
          let V = zl0(B);
          if (!V || !O.has(V)) {
            if (B.role === "user") await ng(Ll0(B, _, null));else if (B.role === "assistant") {
              if (B.content.length > 0) {
                let Q = Cl0(B, _, null, {
                  includeThinking: i
                });
                await ng(Q);
              }
              b++;
            }
            if (V) O.add(V);
          }
          S++;
        }
      });
    return new Promise((D, B) => {
      k = async eT => {
        if (y) {
          J.debug("Complete called multiple times, ignoring", {
            error: eT
          });
          return;
        }
        y = !0, x.remove();
        try {
          try {
            let iT = await m0(T.thread$.pipe(ti(1), Gl(1000)));
            u = iT, await w(iT);
          } catch (iT) {
            J.debug("Unable to flush pending thread messages before completion", {
              error: iT
            });
          }
          if (eT) {
            let iT = {
              type: "result",
              subtype: "error_during_execution",
              duration_ms: Date.now() - m,
              is_error: !0,
              num_turns: b,
              error: eT,
              session_id: _
            };
            await ng(iT);
          } else {
            let iT = u ? gkT(u) : null,
              aT = iT ? kr(iT.content) : "",
              oT = {
                type: "result",
                subtype: "success",
                duration_ms: Date.now() - m,
                is_error: !1,
                num_turns: b,
                result: aT,
                session_id: _
              };
            await ng(oT);
          }
          if (M.unsubscribe(), V.unsubscribe(), j.forEach(iT => iT.unsubscribe()), await T.postExecuteMode?.(), o && o.length > 0) await NKT(R, o, r.configService);
          D();
        } catch (iT) {
          J.error("Error during completion", {
            error: iT
          }), B(iT);
        }
      };
      let M = T.threadViewState$.subscribe(async eT => {
          try {
            if (P = eT, eT.state === "active" && eT.ephemeralError) {
              await k(cy(eT.ephemeralError, s));
              return;
            }
            if (L.length > 0) {
              let iT = [...new Set(L.map(oT => oT.toolName))],
                aT = iT.length > 0 ? `The following tools require user approval, which is not supported in stream JSON mode: ${iT.join(", ")}` : "A tool requires user approval, which is not supported in stream JSON mode";
              await k(aT);
              return;
            }
            if (eT.state === "active" && eT.inferenceState === "idle" && u) {
              let iT = u.messages.flatMap(aT => aT.content.map(oT => {
                if (oT.type === "tool_result" && oT.run.status === "blocked-on-user") return Tn(u, oT.toolUseID);
              }).filter(Wl0));
              if (iT.length > 0) {
                J.warn("Tools require user consent - exiting stream JSON mode", {
                  blockedTools: iT.map(oT => ({
                    name: oT.name,
                    id: oT.id
                  }))
                });
                let aT = `The following tools require user approval, which is not supported in stream JSON mode: ${iT.map(oT => oT.name).join(", ")}`;
                await k(aT);
                return;
              }
            }
            if (d && C && eT.state === "active" && eT.inferenceState === "idle") await k();
          } catch (iT) {
            J.error("Error in status subscription", {
              error: iT
            }), await k(cy(iT, s));
          }
        }),
        V = T.thread$.subscribe(async eT => {
          try {
            u = eT, await w(eT);
            let iT = IkT(eT.messages),
              aT = gkT(eT);
            if (C = iT > I && aT !== void 0 && aT.state.type !== "streaming" && UET(aT) && !aT.content.some(oT => oT.type === "tool_use"), d && C && P?.state === "active" && P.inferenceState === "idle") await k();
          } catch (iT) {
            J.error("Error in thread subscription", {
              error: iT
            }), await k(cy(iT, s));
          }
        }),
        Q = T.pendingApprovals$.subscribe(eT => {
          if (L = eT, eT.length > 0) {
            let iT = [...new Set(eT.map(oT => oT.toolName))],
              aT = iT.length > 0 ? `The following tools require user approval, which is not supported in stream JSON mode: ${iT.join(", ")}` : "A tool requires user approval, which is not supported in stream JSON mode";
            k(aT);
          }
        });
      j.push(Q);
      let W = T.inferenceErrors$?.subscribe(eT => {
        k(cy(eT, s));
      });
      if (W) j.push(W);
      if (h) (async () => {
        try {
          for await (let eT of Vl0(c)) {
            if (y) break;
            await T.sendMessage({
              content: eT.contentBlocks,
              agentMode: p
            });
          }
          if (d = !0, C && P?.state === "active" && P.inferenceState === "idle") await k();
        } catch (eT) {
          J.error("Error processing streaming input", {
            error: eT
          }), await k(cy(eT, s));
        }
      })();else (async () => {
        try {
          let eT = [{
            type: "text",
            text: e
          }];
          if (t) eT.unshift({
            type: "text",
            text: `Input received on stdin:
\`\`\`
${t}
\`\`\``
          });
          if (await T.sendMessage({
            content: eT,
            agentMode: p
          }), d = !0, C && P?.state === "active" && P.inferenceState === "idle") await k();
        } catch (eT) {
          J.error("Error processing input", {
            error: eT
          }), await k(cy(eT, s));
        }
      })();
    });
  } catch (f) {
    throw x.remove(), f;
  }
}
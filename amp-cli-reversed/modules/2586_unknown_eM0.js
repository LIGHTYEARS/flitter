async function eM0(T) {
  let {
      toolName: R,
      rawArgs: a,
      stdinInput: e,
      only: t,
      stream: r,
      threadDeps: h,
      stdout: i,
      stderr: c,
      exit: s
    } = T,
    A = h.toolService;
  try {
    let l = (await m0(A.tools)).find(y => y.spec.name === R);
    if (!l) {
      c.write(`Error: Tool '${R}' not found
`), s(1);
      return;
    }
    let o = sM0(a),
      n = l.spec,
      p;
    if (e) try {
      p = JSON.parse(e);
    } catch (y) {
      c.write(`Error: Invalid JSON input from stdin: ${y instanceof Error ? y.message : "Unknown error"}
`), s(1);
      return;
    } else try {
      p = tM0(o, n.inputSchema, R);
    } catch (y) {
      c.write(`Error: ${y instanceof Error ? y.message : "Unknown error"}
`), s(1);
      return;
    }
    let _ = iM0(p, n.inputSchema, R);
    if (_) {
      c.write(`Error: ${_}
`), s(1);
      return;
    }
    let m = await Gk({
        toolName: R,
        configService: h.configService,
        toolService: A,
        mcpService: h.mcpService,
        skillService: h.skillService
      }),
      b = aM0(A.invokeTool(R, {
        args: p
      }, m));
    if (r) await LnR(b.pipe(cET(y => {
      let u = {
        status: y.status
      };
      if ("result" in y) u.result = y.result;
      if ("error" in y) u.error = y.error;
      if ("progress" in y) u.progress = y.progress;
      i.write(`${JSON.stringify(u)}
`);
    }))), s(0);else {
      let y = await eN(b);
      if (y.status !== "done") throw Error("Expected done status");
      let u = y.result,
        P = u;
      if (t && u && typeof u === "object" && !Array.isArray(u) && t in u) P = u[t];
      if (typeof P === "string") i.write(P);else i.write(JSON.stringify(P, null, 2));
      i.write(`
`), s(0);
    }
  } catch (l) {
    c.write(`Error invoking tool '${R}': ${l instanceof Error ? l.message : "Unknown error"}
`), s(1);
  }
}
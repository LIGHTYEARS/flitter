function Ki(T, R = !1) {
  if (R || T < 1000) return T.toLocaleString();
  return `${(T / 1000).toFixed(1)}k`;
}
function lc0(T, R, a, e, t, r, h) {
  return;
}
async function eX0(T, R, a, e, t, r, h, i, c) {
  r(t, T);
  let s = await h(R, T);
  try {
    let A = e.v2 === !0;
    nc0.write(oR.dim(A ? `Analyzing context tokens via v2 worker...
` : `Analyzing context tokens...
`));
    let l = A ? await RKT({
      ampURL: R.ampURL,
      configService: s.configService,
      threadID: a,
      workerURL: e.workerUrl
    }) : await (async () => {
      let y = await i(a, s),
        u = await m0(ln(s.configService).pipe(da(P => P !== "pending")));
      return oFT({
        configService: s.configService,
        buildSystemPromptDeps: {
          configService: s.configService,
          toolService: s.toolService,
          filesystem: He,
          skillService: s.skillService,
          getThreadEnvironment: Hs,
          threadService: s.threadService,
          serverStatus: X9(u) ? u : void 0
        },
        mcpInitialized: s.mcpService.initialized
      }, y);
    })();
    if (Ba.write(`
`), Ba.write(oR.bold(`Context Usage Analysis
`)), Ba.write(oR.dim("\u2500".repeat(50) + `
`)), A) Ba.write(oR.dim(`Source: v2 worker
`));
    Ba.write(`Model: ${l.modelDisplayName} (${Ki(l.maxContextTokens)} context)

`);
    let o = l.sections.flatMap(y => [y.name, ...(y.children?.map(u => `  ${u.name}`) ?? [])]),
      n = Math.max(...o.map(y => y.length));
    for (let y of l.sections) {
      let u = y.name.padEnd(n + 2),
        P = Ki(y.tokens).padStart(8),
        k = `(${y.percentage.toFixed(1)}%)`.padStart(8);
      if (Ba.write(`  ${u}${P} ${k}
`), y.children && y.children.length > 0) for (let x of y.children) {
        let f = `  ${x.name}`.padEnd(n + 2),
          v = Ki(x.tokens).padStart(8),
          g = `(${x.percentage.toFixed(1)}%)`.padStart(8);
        Ba.write(oR.dim(`  ${f}${v} ${g}
`));
      }
    }
    Ba.write(`
`);
    let p = (l.totalTokens / l.maxContextTokens * 100).toFixed(1);
    Ba.write(`Used:  ${Ki(l.totalTokens, !0)} tokens (${p}% used)
`), Ba.write(`Free:  ${Ki(l.freeSpace, !0)} tokens
`);
    let _ = [`${l.toolCounts.builtin} builtin`];
    if (l.toolCounts.toolbox > 0) _.push(`${l.toolCounts.toolbox} toolbox`);
    if (l.toolCounts.mcp > 0) _.push(`${l.toolCounts.mcp} MCP`);
    Ba.write(oR.dim(`Tools: ${l.toolCounts.total} (${_.join(", ")})
`));
    let m = await i(a, s).catch(() => null),
      b = m ? $h(m) : null;
    if (b?.totalInputTokens) {
      let y = b.totalInputTokens,
        u = l.totalTokens - y;
      if (Ba.write(`
`), Ba.write(oR.dim("\u2500".repeat(50) + `
`)), Ba.write(oR.dim(`Comparison with last inference:
`)), Ba.write(oR.dim(`  Last inference:   ${Ki(y, !0).padStart(8)} tokens
`)), b.cacheCreationInputTokens || b.cacheReadInputTokens) Ba.write(oR.dim(`    (input: ${Ki(b.inputTokens)}, cache-create: ${Ki(b.cacheCreationInputTokens ?? 0)}, cache-read: ${Ki(b.cacheReadInputTokens ?? 0)})
`));
      Ba.write(oR.dim(`  Current analysis: ${Ki(l.totalTokens, !0).padStart(8)} tokens
`));
      let P = u >= 0 ? "+" : "-";
      if (Ba.write(oR.dim(`  Difference:       ${P}${Ki(Math.abs(u), !0).padStart(7)} tokens
`)), Math.abs(u) > 100) Ba.write(oR.dim(`  (Analysis regenerates context; differences expected due to dynamic content)
`));
    }
    await s.asyncDispose(), process.exit(0);
  } catch (A) {
    await s.asyncDispose();
    let l = `Failed to analyze thread context: ${A instanceof Error ? A.message : String(A)}`;
    c(l);
  }
}
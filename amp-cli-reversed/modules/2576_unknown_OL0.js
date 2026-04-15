function SL0(T) {
  return xrT(T, {
    colors: {
      foreground: LT.default()
    },
    dim: !0
  }).map(R => R.toPlainText()).join("");
}
async function OL0(T, R, a, e, t) {
  t.initializeCLIOverrides(e, T);
  let r = await t.createThreadDependencies(R, T);
  try {
    let h = await N3.threadDisplayCostInfo({
      threadID: a
    }, {
      config: r.configService
    });
    if (!h.ok) {
      if (await r.asyncDispose(), h.error.code === "auth-required") t.printErrorExit("You must be logged in to view thread usage. Run `amp login` first.");
      if (h.error.code === "thread-not-found") t.printErrorExit(`Thread ${a} not found.`);
      t.printErrorExit(`Failed to load thread usage: ${h.error.message ?? h.error.code}`);
    }
    let i = SL0(h.result);
    if (i) Q4.write(`${i}
`);else if (h.result.totalCostUSD === null) Q4.write(`Usage information is currently unavailable for this thread.
`);else Q4.write(`No usage recorded for this thread yet.
`);
    if (h.result.costBreakdownURL) Q4.write(`${oR.dim("Details: ")}${h.result.costBreakdownURL}
`);
    await r.asyncDispose(), process.exit(0);
  } catch (h) {
    await r.asyncDispose(), t.printErrorExit(`Failed to show thread usage: ${h instanceof Error ? h.message : String(h)}`);
  }
}
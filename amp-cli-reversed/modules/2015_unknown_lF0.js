async function lF0(T, R, a, e, t, r, h) {
  ua(r, T);
  let i = await X3(R, T);
  try {
    await NA(a, i);
    let c = e;
    if (!c) {
      let p = (await fS()).trimEnd();
      if (p) c = p;
    }
    if (!c) d8(`Goal must be provided via stdin or --goal argument.
Example: echo "Continue the auth work" | amp threads handoff T-xxx
Or: amp threads handoff T-xxx --goal "Continue the auth work"`);
    let s = new AbortController(),
      A = await i.threadService.get(a);
    if (!A) d8(`Thread ${a} not found`);
    let l = await yhT(i),
      o = t3R(i),
      {
        threadID: n
      } = await ct.handoff(l, {
        threadID: a,
        goal: c,
        mode: "initial",
        navigate: !1,
        agentMode: A.agentMode,
        buildSystemPromptDeps: o,
        signal: s.signal,
        filesystem: He
      });
    if (await Promise.all([dS(i.threadService, a), dS(i.threadService, n)]), await OS(n, "interactive"), t) await i.asyncDispose(), await SB(R, {
      ...T,
      threadId: n
    }, r, h);else C9.write(`${n}
`), await i.asyncDispose(), process.exit(0);
  } catch (c) {
    Be.write(`Error creating handoff thread: ${c instanceof Error ? c.message : String(c)}
`), await i.asyncDispose(), process.exit(1);
  }
}
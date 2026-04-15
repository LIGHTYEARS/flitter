async function SJT(T, R) {
  let {
      thread: a,
      threadMeta: e
    } = R,
    t = a?.id ?? R.threadID ?? Eh(),
    r = ct.get(t),
    h = r?.thread ?? (await T.threadService.get(t));
  if (a && !h) {
    let c = await T.threadService.exclusiveSyncReadWriter(t);
    c.write(a), await c.asyncDispose(), h = a;
  }
  let i = r ?? (await ct.getOrCreateForThread(T, t));
  if (R.agentMode && !h?.agentMode && (!h || ve(h) === 0)) await i.handle({
    type: "agent-mode",
    mode: R.agentMode
  });
  if (e && a) await T.threadService.updateThreadMeta(t, e);
  if (e && !a) {
    let c = T.threadService.observe(t).subscribe(s => {
      if (s.messages.length === 0) return;
      c.unsubscribe(), T.threadService.updateThreadMeta(t, e).catch(() => {
        return;
      });
    });
  }
  if (R.onFirstAssistantMessage) {
    let c = T.threadService.observe(t).subscribe(async s => {
      if (dt(s, "assistant")) await R.onFirstAssistantMessage?.(t), c.unsubscribe();
    });
  }
  return await i.resume(), i;
}
async function jD0(T) {
  if (T.systemPromptOverride) {
    let h = await yD0(T.systemPromptOverride);
    Ms("systemPrompt", h);
  }
  if (T.listTools) {
    await EJT(T);
    return;
  }
  let R = T.mode === "dtw" ? await $D0(T) : await gD0(T),
    a = _D0(T.commands),
    {
      state$: e,
      subscription: t
    } = ID0(R.threadPool),
    r = e.subscribe({
      next: h => {
        dJT("update", h);
      }
    });
  try {
    if (a.length > 0) {
      await CJT(R.threadPool, e, a, T);
      return;
    }
    await vD0(R.threadPool, e, T);
  } finally {
    r.unsubscribe(), t.unsubscribe(), await R.threadPool.dispose();
  }
}
function AVT(T) {
  return {
    async createHandoffDraft(R) {
      let a = await qkT(T, R.signal);
      return WkT(a, R.parentThread.id, R.goal, R.images);
    },
    createHandoffThread: async R => {
      let a = await qkT(T, R.signal),
        e = await WkT(a, R.parentThread.id, R.goal, R.images),
        t = await jp0(a, R, e);
      if (await vp0(t.http, t.threadID, t.prompt, t.agentMode), R.follow && T.onFollow) try {
        await T.onFollow({
          sourceThreadID: R.parentThread.id,
          targetThreadID: t.threadID
        });
      } catch (r) {
        J.error("Failed to follow handoff thread", {
          error: r,
          sourceThreadID: R.parentThread.id,
          targetThreadID: t.threadID
        });
      }
      return t.threadID;
    }
  };
}
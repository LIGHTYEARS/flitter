function tD0(T) {
  let R = new f0(T.thread),
    a = new f0(AB(T.thread, "idle")),
    e = new f0(new Map()),
    t = new f0([]),
    r = new f0([]),
    h = i => {
      let c = {
        ...R.getValue()
      };
      if (!i || !i.text && i.images.length === 0) delete c.draft, delete c.autoSubmitDraft;else {
        let s = [];
        if (i.text) s.push({
          type: "text",
          text: i.text
        });
        if (i.images.length > 0) s.push(...i.images);
        c.draft = s, c.autoSubmitDraft = !1;
      }
      R.next(c), a.next(AB(c, "idle"));
    };
  return {
    handle: $rT({
      thread$: R,
      threadViewState$: a,
      toolProgressByToolUseID$: e,
      pendingApprovals$: t,
      pendingSkills$: r,
      getCurrentThread: () => R.getValue(),
      sendMessage: async i => (await T.materialize()).sendMessage(i),
      restoreTo: async i => (await T.materialize()).restoreTo(i),
      queueMessage: async i => (await T.materialize()).queueMessage(i),
      discardQueuedMessages: async () => {},
      interruptQueuedMessage: async () => {},
      setTitle: async i => (await T.materialize()).setTitle(i),
      setVisibility: async i => (await T.materialize()).setVisibility(i),
      cancelTurn: async () => {},
      cancelStreaming: async () => {},
      retryTurn: async () => {},
      dismissEphemeralError: () => {},
      resolveApproval: async () => {},
      addPendingSkill: i => {
        r.next([...r.getValue(), i]);
      },
      removePendingSkill: i => {
        r.next(r.getValue().filter(c => c.name !== i));
      },
      clearPendingSkills: () => {
        r.next([]);
      },
      getDraft: async () => rD0(R.getValue()),
      setDraft: async i => h(i),
      getFilesAffectedByTruncation: async () => [],
      clearPendingNavigation: async () => {},
      getGuidanceFiles: async () => []
    }),
    getThreadViewState: () => a.getValue(),
    dispose: async () => {
      R.complete(), a.complete(), e.complete(), t.complete(), r.complete();
    }
  };
}
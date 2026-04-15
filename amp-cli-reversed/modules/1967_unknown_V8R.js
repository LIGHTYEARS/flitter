class V8R {
  threadService;
  constructor(T) {
    this.threadService = T;
  }
  async fetchThreadSummaries(T = "", R) {
    try {
      let a = await new Promise((e, t) => {
        let r = this.threadService.observeThreadList(R).subscribe({
          next: h => {
            r.unsubscribe(), e(h);
          },
          error: t
        });
      });
      return {
        ok: !0,
        threads: this.formatThreadSummaries(a, T, R)
      };
    } catch (a) {
      return {
        ok: !1,
        errorMsg: a instanceof Error ? a.message : "An unexpected error occurred"
      };
    }
  }
  observeThreadSummaries(T = "", R = {}) {
    return this.threadService.observeThreadList({
      includeArchived: R.includeArchived ?? !1
    }).pipe(JR(a => this.formatThreadSummaries(a, T, R)));
  }
  formatThreadSummaries(T, R, a = {}) {
    return T.filter(e => {
      if (e.mainThreadID) return !1;
      if (!a.includeArchived && e.archived) return !1;
      if (!R.trim()) return !0;
      let t = e.title?.toLowerCase() || "untitled",
        r = e.id.toLowerCase(),
        h = R.toLowerCase();
      return t.includes(h) || r.includes(h);
    }).map(e => {
      let t = new Date(e.userLastInteractedAt),
        r = mz0(t),
        h = e.id.slice(-8),
        i = e.env?.initial.trees?.[0]?.uri;
      return {
        id: e.id,
        title: e.title || "Untitled",
        updatedAt: new Date(e.userLastInteractedAt).toISOString(),
        description: {
          timeAgo: r,
          title: e.title || "Untitled",
          shortThreadID: h
        },
        diffStats: e.summaryStats?.diffStats,
        workspaceURI: i,
        relationships: e.relationships,
        agentMode: e.agentMode,
        details: {
          messageCount: e.summaryStats?.messageCount
        },
        archived: e.archived
      };
    });
  }
}
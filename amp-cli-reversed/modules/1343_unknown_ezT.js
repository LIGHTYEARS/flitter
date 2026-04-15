function GqR(T) {
  return {
    v: 0,
    id: T,
    created: Date.now(),
    messages: []
  };
}
function ezT(T) {
  return {
    async getThread(R, a) {
      let e = await N3.getThread({
        thread: R
      }, {
        config: T,
        signal: a
      });
      if (!e.ok) {
        if (e.error.code === "thread-not-found") return null;
        throw Error(e.error.message ?? e.error.code);
      }
      return e.result.thread.data;
    },
    async listThreads(R) {
      let a = await N3.listThreads({
        ...(R?.limit != null ? {
          limit: R.limit
        } : {})
      }, {
        config: T,
        signal: R?.signal
      });
      if (!a.ok) throw Error(a.error.message ?? a.error.code);
      return a.result.threads;
    },
    async uploadThread(R, a) {
      let e = await N3.uploadThread({
        thread: R,
        createdOnServer: !1
      }, {
        config: T,
        signal: a
      });
      if (!e.ok) throw Error(e.error.message ?? e.error.code);
    },
    async deleteThread(R, a) {
      let e = await N3.deleteThread({
        thread: R
      }, {
        config: T,
        signal: a
      });
      if (!e.ok && e.error.code !== "thread-not-found") throw Error(e.error.message ?? e.error.code);
    },
    async setThreadMeta(R, a, e) {
      let t = await N3.setThreadMeta({
        thread: R,
        meta: a
      }, {
        config: T,
        signal: e
      });
      if (!t.ok) throw Error(t.error.message ?? t.error.code);
    }
  };
}
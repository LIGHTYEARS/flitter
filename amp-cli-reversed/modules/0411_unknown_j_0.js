async function j_0(T) {
  let {
      workspaceRootPath: R,
      workspaceSettingsPath: a
    } = await f_0(T.cwd),
    e = await xVT({
      ...T,
      settingsFile: a
    }),
    t = new W0(),
    r = e.changes.subscribe(c => t.next(c)),
    h = T.workspaceTrust?.current ?? !1,
    i = T.workspaceTrust?.changes?.subscribe(async c => {
      let s = h;
      if (h = c, !s && c) {
        let A = (await e.keys()).filter(l => bL.includes(l));
        if (A.length > 0) t.next(A);
      }
    });
  return {
    ...e,
    changes: t,
    getWorkspaceRootPath() {
      return R;
    },
    async get(c) {
      if (!h && bL.includes(c)) return;
      return e.get(c);
    },
    async set(c, s) {
      return Kk(c, "workspace"), e.set(c, s);
    },
    async delete(c) {
      return Kk(c, "workspace"), e.delete(c);
    },
    async keys() {
      let c = await e.keys();
      if (!h) return c.filter(s => !bL.includes(s));
      return c;
    },
    [Symbol.dispose]() {
      r.unsubscribe(), i?.unsubscribe(), e[Symbol.dispose]();
    }
  };
}
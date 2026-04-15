async function S_0(T) {
  let R = T.getHook,
    a = new W0(),
    e = await v_0(T),
    t = await j_0({
      ...T,
      cwd: T.cwd || process.cwd()
    });
  J.info("Using settings file", {
    settingsPath: e.getSettingsFilePath(),
    workspaceSettingsPath: t.getSettingsFilePath(),
    workspaceRootPath: t.getWorkspaceRootPath()
  });
  let r = e.changes.subscribe(i => a.next(i)),
    h = t.changes.subscribe(i => a.next(i));
  return {
    async get(i, c) {
      let s = async () => {
        switch (c) {
          case "global":
            return e.get(i);
          case "workspace":
            return t.get(i);
          case "admin":
            throw Error("Cannot get admin settings from file storage");
          case void 0:
            break;
        }
        let [A, l] = await Promise.all([e.get(i), t.get(i)]);
        return x_0(i, {
          global: A,
          workspace: l
        });
      };
      return R ? R(i, s) : s();
    },
    async set(i, c, s = "workspace") {
      switch (Kk(i, s), s) {
        case "workspace":
          await t.set(i, c);
          break;
        case "global":
          await e.set(i, c);
          break;
        default:
      }
      a.next([i]);
    },
    async delete(i, c = "workspace") {
      switch (Kk(i, c), c) {
        case "workspace":
          await t.delete(i);
          break;
        case "global":
          await e.delete(i);
          break;
        default:
      }
      a.next([i]);
    },
    async keys() {
      let i = await e.keys(),
        c = await t.keys(),
        s = new Set([...i, ...c]);
      return Array.from(s);
    },
    getSettingsFilePath() {
      return e.getSettingsFilePath();
    },
    getWorkspaceRootPath() {
      return t.getWorkspaceRootPath();
    },
    getWorkspaceSettingsPath() {
      return t.getSettingsFilePath();
    },
    changes: a,
    [Symbol.dispose]() {
      r.unsubscribe(), h.unsubscribe(), e[Symbol.dispose](), t[Symbol.dispose]();
    }
  };
}
function S5R({
  configService: T,
  filesystem: R,
  spawn: a = szT
}) {
  let e = T.config.pipe(JR(A => ({
      envPath: typeof process < "u" && process.env.AMP_TOOLBOX || void 0,
      configPath: A.settings["toolbox.path"]
    })), E9((A, l) => A.envPath === l.envPath && A.configPath === l.configPath), JR(({
      envPath: A,
      configPath: l
    }) => D5R(A, l)), f3({
      shouldCountRefs: !0
    })),
    t = e.pipe(KS(300)),
    r,
    h = new Promise(A => {
      r = A;
    }),
    i = new f0({
      type: "initializing"
    }),
    c = new f0([]);
  async function s(A, l, o) {
    let n = [],
      p = new Set(),
      _ = new Set(),
      m = await P7T(R, A.map(y => d0(zR.file(y)))),
      b = new Map(m.skills.map(y => [y.name, y.content]));
    for (let y of A) {
      let u = zR.file(y);
      if (!(await Aq(R, u))) continue;
      try {
        let P = (await R.readdir(u)).filter(x => !x.isDirectory && !x.uri.fsPath.endsWith(".md"));
        if (P.length === 0) continue;
        let k = P.map(x => ({
          name: x.uri.fsPath.split("/").pop() || "unknown",
          status: "pending"
        }));
        n.push({
          path: y,
          tools: k,
          discovering: !0
        });
      } catch (P) {
        J.debug("Failed to read toolbox directory", {
          path: y,
          error: P
        });
      }
    }
    c.next([...n]);
    for (let y of A) {
      let u = zR.file(y);
      if (!(await Aq(R, u))) continue;
      let P = n.findIndex(k => k.path === y);
      try {
        await k5R(u, l, R, _, !1, b);
        let k = [];
        if (await d5R(u, R, a, (x, f) => {
          if (!f) {
            let O = n[P]?.tools.findIndex(j => j.name === x && j.status === "pending");
            if (O !== void 0 && O >= 0 && n[P]) n[P].tools[O] = {
              name: x,
              status: "failed",
              error: "Failed to describe tool"
            }, c.next([...n]);
            return;
          }
          let {
              spec: v,
              format: g
            } = f,
            I = `tb__${O5R(v.name)}`,
            S;
          if (_.has(I)) S = {
            name: v.name,
            description: v.description,
            status: "duplicate"
          };else {
            _.add(I), p.add(I), o.get(I)?.dispose();
            try {
              let O = M5R(v),
                j = L5R(O, a, g),
                d = l.registerTool({
                  spec: {
                    ...v,
                    name: I
                  },
                  fn: j
                });
              o.set(I, d), S = {
                name: v.name,
                description: v.description,
                status: "registered"
              };
            } catch (O) {
              S = {
                name: v.name,
                description: v.description,
                status: "failed",
                error: String(O)
              };
            }
          }
          if (k.push(S), P >= 0 && n[P]) {
            let O = n[P].tools.findIndex(j => j.name === x && j.status === "pending");
            if (O >= 0) n[P].tools[O] = S;else n[P].tools.push(S);
            c.next([...n]);
          }
        }), P >= 0 && n[P]) n[P] = {
          ...n[P],
          discovering: !1
        }, c.next([...n]);
      } catch (k) {
        J.warn("Failed to scan/register toolbox", {
          path: y,
          error: k
        });
        let x = n[P];
        if (P >= 0 && x) n[P] = {
          path: x.path,
          tools: x.tools,
          discovering: !1
        }, c.next([...n]);
      }
    }
    for (let [y, u] of o) if (!p.has(y)) u.dispose(), o.delete(y);
    return n;
  }
  return {
    name: "Toolbox",
    initialized: h,
    status: i,
    registerToolsWithToolService(A) {
      let l = new Map(),
        o = t.subscribe(async n => {
          try {
            J.debug("Toolbox registration triggered", {
              pathCount: n.length
            });
            let p = await s(n, A, l),
              _ = p.reduce((m, b) => m + b.tools.length, 0);
            i.next({
              type: "ready",
              toolCount: _
            }), r(), J.debug("Toolbox registration complete", {
              toolboxCount: p.length,
              toolCount: _
            });
          } catch (p) {
            J.error("Toolbox registration failed", {
              error: p
            }), r();
          }
        });
      return {
        dispose: () => {
          o.unsubscribe();
          for (let n of l.values()) n.dispose();
          l.clear();
        }
      };
    },
    tools: e.pipe(JR(async A => {
      let l = [];
      for (let o of A) {
        let n = zR.file(o);
        if (await Aq(R, n)) try {
          let p = await R.readdir(n);
          l.push(...p.map(_ => _.uri));
        } catch (p) {
          J.debug("Failed to read toolbox directory", {
            path: o,
            error: p
          });
        }
      }
      return l;
    })),
    toolboxes: c,
    dispose() {}
  };
}
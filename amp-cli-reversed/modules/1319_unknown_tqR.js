function tqR(T) {
  let {
      pluginService: R,
      toolService: a
    } = T,
    e = [],
    t,
    r = new Promise(c => {
      t = c;
    }),
    h = !0,
    i = R.plugins.subscribe({
      next: () => {
        for (let c of e) c.dispose();
        e = [];
        try {
          let c = R.tools.list();
          for (let s of c) {
            let {
                pluginName: A,
                name: l
              } = s,
              o = a.registerTool({
                spec: {
                  name: s.name,
                  description: s.description,
                  inputSchema: s.inputSchema,
                  source: {
                    plugin: A
                  }
                },
                fn: n => Q9(async () => R.tools.execute(A, l, n.args)).pipe(JR(p => ({
                  status: "done",
                  result: p
                })))
              });
            e.push(o);
          }
          J.debug("Registered plugin tools", {
            count: c.length
          });
        } catch (c) {
          J.warn("Failed to register plugin tools", {
            error: c
          });
        }
        if (h) h = !1, t();
      }
    });
  return {
    initialized: r,
    dispose: () => {
      i.unsubscribe();
      for (let c of e) c.dispose();
      e = [];
    }
  };
}
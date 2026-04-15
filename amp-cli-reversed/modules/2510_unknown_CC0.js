function CC0(T, R) {
  return {
    ...T,
    async get(a, e) {
      if (a !== "mcpServers") return T.get(a);
      let t = Object.fromEntries(Object.entries(R).map(([i, c]) => [i, {
          ...c,
          _target: "flag"
        }])),
        r = await T.get(a, "global"),
        h = await T.get(a, "workspace");
      if (e === "global") return cY({
        global: r,
        override: t
      });else if (e === "workspace") return h;
      return cY({
        global: r,
        workspace: h,
        override: t
      });
    },
    async keys() {
      let a = await T.keys();
      if (!a.includes("mcpServers")) a.push("mcpServers");
      return a;
    }
  };
}
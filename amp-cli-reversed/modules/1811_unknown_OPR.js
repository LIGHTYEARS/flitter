function OPR(T, R, a, e, t, r, h) {
  let i = PDT(a, T.name),
    c = SPR({
      skillName: t,
      skillNames: r,
      hasNonSkillSource: Boolean(h)
    });
  return {
    spec: {
      name: i,
      description: T.description ?? "",
      inputSchema: T.inputSchema,
      source: {
        mcp: a,
        target: e
      },
      meta: c
    },
    fn: ({
      args: s
    }, A) => Q9(l => R.callTool({
      name: T.name,
      arguments: s ?? void 0
    }, A, l).then(o => {
      return J.debug("MCP tool call succeeded", {
        serverName: a,
        toolName: T.name,
        longName: i
      }), {
        status: "done",
        result: o.map(n => {
          if (n.type === "text" || n.type === "image") return n;
          throw Error(`unsupported content type: ${n.type}`);
        })
      };
    }, o => {
      throw J.error("MCP tool call failed", {
        serverName: a,
        toolName: T.name,
        longName: i,
        error: o instanceof Error ? o.message : String(o),
        errorName: o instanceof Error ? o.name : typeof o,
        stack: o instanceof Error ? o.stack : void 0
      }), o;
    }))
  };
}
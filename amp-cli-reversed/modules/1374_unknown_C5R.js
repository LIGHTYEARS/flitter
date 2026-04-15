function C5R(T) {
  return async R => {
    try {
      let a = {
          ...process.env,
          ...czT,
          TOOLBOX_ACTION: "describe",
          AGENT: "amp"
        },
        e = T(R.fsPath, [], {
          env: a,
          stdio: ["pipe", "pipe", "pipe"]
        }),
        t,
        r;
      try {
        r = await m0(e.pipe(da(c => {
          return t = c.process, c.exited;
        }), Gl(EuT)));
      } catch (c) {
        if (t && !t.killed) t.kill("SIGKILL");
        if (c instanceof x0T) throw Error(`Toolbox describe timed out after ${EuT}ms`);
        throw c;
      }
      let {
        stdout: h,
        stderr: i
      } = r;
      if (r.exitCode !== 0) return J.info("Failed to collect tool definition", {
        path: R.toString(),
        stderr: i,
        exitCode: r.exitCode
      }), null;
      try {
        let c = JSON.parse(h);
        if (c.args && typeof c.args === "object") {
          let s = Object.entries(c.args).map(([A, l]) => [A, E5R(l)]);
          c.inputSchema = {
            type: "object",
            properties: Object.fromEntries(s)
          }, delete c.args, J.debug("Toolbox tool schema converted to", c.inputSchema);
        }
        if (!c.inputSchema) c.inputSchema = {
          type: "object",
          properties: {},
          required: []
        }, J.debug("Toolbox tool defaulted to empty inputSchema");
        if (!CuT.validateSchema(c.inputSchema)) return J.debug("Tool has invalid inputSchema, skipping", {
          path: R.toString(),
          name: c.name,
          schemaErrors: CuT.errors
        }), null;
        return {
          spec: {
            name: c.name,
            inputSchema: c.inputSchema,
            description: c.description,
            source: {
              toolbox: R.fsPath
            },
            meta: c.meta
          },
          format: "json"
        };
      } catch (c) {
        let s = $5R(h);
        if (s) return {
          spec: v5R(s, R.fsPath),
          format: "text"
        };
        return J.debug("Failed to parse tool definition as JSON or text", {
          path: R.toString(),
          jsonError: String(c),
          stdout: h.substring(0, 200) + (h.length > 200 ? "..." : "")
        }), null;
      }
    } catch (a) {
      return J.info(`toolboxes.collectDefinition failed for ${R}`, {
        path: R,
        error: a
      }), null;
    }
  };
}
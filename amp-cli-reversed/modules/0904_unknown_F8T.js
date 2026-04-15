class F8T {
  constructor(T = [], R) {
    this.mcpTools = [], this.functionNameToMcpClient = {}, this.mcpClients = T, this.config = R;
  }
  static create(T, R) {
    return new F8T(T, R);
  }
  async initialize() {
    var T, R, a, e;
    if (this.mcpTools.length > 0) return;
    let t = {},
      r = [];
    for (let s of this.mcpClients) try {
      for (var h = !0, i = (R = void 0, ec(OOR(s))), c; c = await i.next(), T = c.done, !T; h = !0) {
        e = c.value, h = !1;
        let A = e;
        r.push(A);
        let l = A.name;
        if (t[l]) throw Error(`Duplicate function name ${l} found in MCP tools. Please ensure function names are unique.`);
        t[l] = s;
      }
    } catch (A) {
      R = {
        error: A
      };
    } finally {
      try {
        if (!h && !T && (a = i.return)) await a.call(i);
      } finally {
        if (R) throw R.error;
      }
    }
    this.mcpTools = r, this.functionNameToMcpClient = t;
  }
  async tool() {
    return await this.initialize(), P$R(this.mcpTools, this.config);
  }
  async callTool(T) {
    await this.initialize();
    let R = [];
    for (let a of T) if (a.name in this.functionNameToMcpClient) {
      let e = this.functionNameToMcpClient[a.name],
        t = void 0;
      if (this.config.timeout) t = {
        timeout: this.config.timeout
      };
      let r = await e.callTool({
        name: a.name,
        arguments: a.args
      }, void 0, t);
      R.push({
        functionResponse: {
          name: a.name,
          response: r.isError ? {
            error: r
          } : r
        }
      });
    }
    return R;
  }
}
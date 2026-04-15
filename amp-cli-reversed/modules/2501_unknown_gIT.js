function bC0(T, R) {
  return {
    settings: {
      url: T
    },
    secrets: {
      getToken: async a => {
        if (a !== "apiKey") return;
        return R;
      }
    }
  };
}
async function gIT(T, R) {
  let a = {
      dataDir: void 0
    },
    e = await IVT(a),
    t = BXT(await otT(a, e)),
    r = pC0(T.url),
    h = _C0(r),
    i = T["api-key"] || (await t.get("apiKey", r));
  if (!i) throw new GR("API key required. Please run `amp login` first.", 1);
  let c = bC0(r, i),
    s = {
      config: AR.of(c),
      async getLatest() {
        return c;
      },
      userConfigDir: null,
      workspaceRoot: AR.of(null)
    },
    A = await m0(ln(s).pipe(da(k => k !== "pending"))),
    l = X9(A) ? A.user.email : void 0;
  if (!l || !Ns(l)) throw new GR("--neo is only available for Amp employees", 1);
  let o = ezT(s),
    n = cFT({
      configService: s
    }),
    p = {
      async getSkills() {
        return [];
      }
    },
    _ = process.cwd(),
    m = {
      registerToolsWithToolService: () => ({
        dispose: () => {}
      }),
      getClient: () => {
        return;
      },
      servers: AR.of([]),
      getPrompt: async () => null,
      searchResources: async () => [],
      searchPrompts: () => AR.of([]),
      getToolsForServer: async () => {
        return;
      }
    },
    b = async ({
      uri: k
    }) => {
      return TtT({
        fileSystem: He,
        workspaceRoot: _
      }, k);
    },
    y = new vw(_, {}, !0),
    u = new mrT(y),
    P = new DXT(h, i, s, {
      clientID: WeT.parse(`neo-${crypto.randomUUID()}`),
      toolService: n.toolService,
      skillService: p,
      getEnvironment: async () => Gk({
        toolName: "unknown",
        configService: s,
        toolService: n.toolService,
        mcpService: m
      }),
      readFileSystemDirectory: b
    }, () => new wXT(), async k => {
      let x = await o.getThread(k);
      if (!x) return null;
      return mk0(x);
    });
  try {
    await T1T(new YZT({
      clientPool: P,
      completionBuilder: u,
      initialThreadID: R
    }));
    let k = P.lastActiveObservingClient;
    if (k) {
      let {
          client: x,
          observer: f
        } = k,
        v = x.getThreadId();
      if (v && f.reader().read().length > 0) {
        let g = {
            id: v,
            created: Date.now(),
            title: f.title().getValue(),
            messages: f.reader().read()
          },
          I = `${r.replace(/\/$/, "")}/threads/${v}`;
        NXT(g, I, process.stdout);
      }
    }
  } finally {
    P.dispose(), n.dispose();
  }
  process.exit(0);
}
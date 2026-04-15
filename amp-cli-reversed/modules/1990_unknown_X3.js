async function X3(T, R, a) {
  let e = a?.deferAuth ?? !1;
  YlR("0.0.1775894934-g5bb49b");
  let t = LX({
    storage: T.settings,
    secretStorage: T.secrets,
    workspaceRoot: AR.of(zR.file(process.cwd())),
    defaultAmpURL: T.ampURL,
    homeDir: jB,
    userConfigDir: tZ
  });
  d40(t);
  let r = await t.getLatest();
  J.debug("Global configuration initialized", {
    settingsKeys: Object.keys(r.settings)
  });
  let h = !1;
  {
    let w = await T.secrets.get("apiKey", T.ampURL);
    if (h = Boolean(w), J.info("API key lookup before login", {
      found: Boolean(w),
      ampURL: T.ampURL,
      deferAuth: e
    }), !w) if (e) J.info("No API key found, continuing startup with deferred auth");else {
      C9.write(`No API key found. Starting login flow...
`);
      let D = await zz0(T),
        B = await T.secrets.get("apiKey", T.ampURL);
      if (J.info("Login flow completed", {
        success: D,
        storedKeyPresent: Boolean(B),
        ampURL: T.ampURL
      }), !D) await xb(), process.exit(1);
      h = !0;
    }
  }
  {
    let w = await t.getLatest(),
      D = w.settings.url,
      B = w.secrets.isSet?.[D];
    J.info("Config secrets state after login", {
      configURL: D,
      apiKeySet: B?.apiKey ?? !1
    });
  }
  let i = m0(ln(t).pipe(da(Dz0))),
    c = e ? "pending" : await i;
  if (!e) J.info("Server status resolved", {
    status: "ready",
    isAuthenticated: X9(c),
    isError: oA(c),
    errorMessage: oA(c) ? c.error.message : void 0
  });
  let s = i.then(w => wz0(w)),
    {
      toolService: A,
      dispose: l
    } = cFT({
      configService: t
    }),
    o = new Map(),
    n = () => o.clear(),
    p = new D5T(t, T.settings.getWorkspaceRootPath()),
    _ = UqR({
      configService: t,
      filesystem: He
    }),
    m = jPR({
      configService: t,
      trustStore: p,
      skillMCPServers: _.skillMCPServers,
      createOAuthProvider: async (w, D, B) => {
        let M = `${w}:${D}`,
          V = o.get(M);
        if (V) return J.debug("Reusing existing OAuth provider for server", {
          serverName: w,
          serverUrl: D
        }), V;
        J.debug("Creating OAuth provider for server", {
          serverName: w,
          serverUrl: D
        });
        let Q = (async () => {
          let W = new lv(T.secrets),
            eT = await W.getClientInfo(w, D),
            iT = B?.scopes ?? eT?.scopes,
            aT = s_0();
          J.info("OAuth headless mode check", {
            useHeadless: aT,
            executeMode: T.executeMode,
            envVar: process.env.AMP_HEADLESS_OAUTH,
            isTTY: C9.isTTY
          });
          let oT;
          if (aT) oT = T.executeMode ? i_0() : h_0(w);
          let TT = new M5T({
            storage: W,
            serverName: w,
            serverUrl: D,
            clientId: B?.clientId ?? eT?.clientId,
            clientSecret: B?.clientSecret ?? eT?.clientSecret,
            authUrl: B?.authUrl ?? eT?.authUrl,
            tokenUrl: B?.tokenUrl ?? eT?.tokenUrl,
            scopes: iT,
            headlessAuthHandler: oT
          });
          return J.debug("OAuth provider created", {
            serverName: w,
            serverUrl: D,
            hasManualClientId: !!(B?.clientId ?? eT?.clientId),
            willUseDCR: !(B?.clientId ?? eT?.clientId),
            scopes: iT,
            headlessMode: aT,
            executeMode: T.executeMode
          }), TT;
        })();
        return o.set(M, Q), Q;
      }
    }),
    b = S5R({
      configService: t,
      filesystem: He,
      spawn: szT
    }),
    y;
  if (T.executeMode) {
    let w = await q5R({
      toolService: A,
      providers: [m, b],
      initialTimeout: 15000
    });
    y = w.registrations;
    for (let [D, B] of w.initErrors) J.warn(`${D} provider initialization slow or failed:`, B);
  } else y = ozT({
    toolService: A,
    providers: [m, b]
  });
  if (R.jetbrains) Mg("JetBrains");else if (R.ide && ob0()) Mg("VS Code");else if (R.ide && nb0()) Mg("Neovim");else if (R.ide) {
    let w = await Cz0();
    if (w) {
      let D = ECT(w.ideName);
      if (D) Mg(D);
    }
  }
  if (T.executeMode) QlR(!0);
  let u,
    P = Us.status.pipe(JR(w => Boolean(w.connected && w.authenticated && w.ideName && rpR(w.ideName))), E9()).subscribe(w => {
      if (w) {
        if (!u) u = A.registerTool(W5R);
      } else u?.dispose(), u = void 0;
    }),
    k;
  if (!T.executeMode) {
    let w = (await T.settings.get("fuzzy.alwaysIncludePaths")) ?? [];
    k = new vw(process.cwd(), {
      alwaysIncludePaths: w
    }, !0);
  } else k = new class extends vw {
    async start() {}
    async query() {
      return [];
    }
    getStats() {
      return {
        state: "unstarted",
        stats: []
      };
    }
    dispose() {}
  }();
  let x = new azT(ezT(t), {
    maxThreads: 200
  });
  J.info("Starting Amp background services");
  let f = R.takeMeBack ? !1 : void 0,
    v = eZ(f, c),
    g = new aJT(),
    I = process.env.PLUGINS ?? "off",
    S = R.headless ? JC0() : void 0,
    O = S ?? new nQ({
      configService: t
    }),
    j = O instanceof nQ ? O : void 0;
  if (j) j.pluginExecutorKind = v ? "local" : "unknown";
  let d = X5T({
      configService: t,
      fileSystem: He,
      platform: O,
      internalPlugins: e3R,
      pluginFilter: I
    }),
    C = tqR({
      pluginService: d,
      toolService: A
    }),
    L = {
      configService: t,
      toolService: A,
      mcpService: m,
      skillService: _,
      toolboxService: b,
      trustStore: p,
      threadService: x,
      secretStorage: T.secrets,
      settingsStorage: T.settings,
      fuzzyServer: k,
      fileSystem: He,
      terminal: g,
      pluginService: d,
      pluginPlatform: j,
      headlessPluginPlatform: S,
      serverStatus: c,
      serverStatusPromise: i,
      viewerUserIDPromise: s,
      hasAPIKeyAtStartup: h
    };
  return {
    ...L,
    async asyncDispose() {
      if (L.mcpService.hasAuthenticatingClients()) J.info("Waiting for OAuth authentication to complete before exit..."), await L.mcpService.waitForAuthentication();
      for (let w of y.values()) w.dispose();
      await L.mcpService.dispose(), n(), await L.threadService.asyncDispose(), L.configService.unsubscribe(), l(), L.fuzzyServer.dispose(), L.settingsStorage[Symbol.dispose](), P.unsubscribe(), u?.dispose(), C.dispose(), await L.pluginService.dispose();
    }
  };
}
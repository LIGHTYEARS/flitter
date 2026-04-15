async function SB(T, R, a, e) {
  let t = process.hrtime.bigint(),
    r = (aT, oT) => {
      let TT = Number(process.hrtime.bigint() - oT) / 1e6,
        tT = _c0();
      J.info("Startup phase", {
        phase: aT,
        phaseMs: Math.round(TT),
        sinceMainMs: tT === null ? void 0 : Math.round(tT)
      });
    },
    {
      userInput: h,
      stdinInput: i
    } = await Zz0(R),
    c = !!R.streamJson || !!R.streamJsonThinking;
  Jz0({
    ...R,
    streamJson: c
  }, T.executeMode, h), ua(a, R);
  let s = process.hrtime.bigint(),
    A = Boolean(await T.secrets.get("apiKey", T.ampURL)),
    l = !T.executeMode && !R.headless && !R.threadActors && A;
  J.info("Interactive auth startup mode", {
    deferInteractiveAuth: l,
    hasAPIKeyAtStartup: A,
    executeMode: T.executeMode,
    headless: Boolean(R.headless)
  });
  let o = await X3(T, R, {
    deferAuth: l
  });
  r("runMainThread:createThreadDependencies", s), s = process.hrtime.bigint();
  let n = await yhT(o);
  r("runMainThread:createWorkerDeps", s);
  let {
    serverStatus: p
  } = o;
  if (!l && oA(p)) {
    let aT = $v(Error(p.error.message));
    if (aT.message === V3.networkOffline || aT.message === V3.networkTimeout) throw eD(T.ampURL);
    throw new GR(V3.invalidAPIKey, 1);
  }
  let _ = X9(p) ? p : null,
    m = _?.user.email,
    b = a3R(m),
    y = aZ({
      userEmail: m,
      features: _?.features
    }),
    u = R.takeMeBack ? !1 : void 0,
    P = _ !== null && eZ(u, _);
  if (!l) await RZ(a, R, p);
  let k = hx(p),
    x = k?.features ?? [],
    f = k?.team ?? null,
    v = urT(R, k);
  if (v instanceof Error) d8(v.message);
  if ((T.executeMode || c) && qt(R.mode) && !b) throw new GR(`Execute mode is not permitted with --mode '${R.mode}'`, 1);
  if (_ && !nN(R.mode, m)) throw new GR(`Agent mode '${R.mode}' is only available for Amp employees`, 1);
  if (T.executeMode && R.remote) await r40(h, i, o.configService), await o.asyncDispose(), process.exit(0);
  if (R.headless) {
    if (process.env.AMP_EXECUTOR !== "1" && (!m || !Ns(m))) throw new GR("Headless DTW mode is only available for Amp employees", 1);
    let aT = await o.secretStorage.get("apiKey", T.ampURL);
    if (!aT) throw new GR("API key required for headless mode. Please run `amp login` first.", 1);
    let oT = typeof R.headless === "string" && R.headless !== "true" ? R.headless : void 0;
    if (oT && !Vt(oT)) throw new GR(`Invalid thread ID: ${oT}`, 1);
    let TT = oT ? void 0 : await AF0({
        dependencies: o,
        visibility: v ?? void 0,
        usesThreadActors: R.threadActors ? !0 : void 0
      }),
      tT = oT ?? TT?.threadId;
    if (!tT) throw new GR("Failed to resolve headless thread ID", 1);
    let lT = await y_0(tT);
    if (lT.status === "already-running") await o.asyncDispose(), await xb(), process.exit(0);
    try {
      await T_0({
        ampURL: T.ampURL,
        apiKey: aT,
        workerUrl: process.env.AMP_WORKER_URL,
        workspaceRoot: process.cwd(),
        threadId: tT,
        ownerUserId: TT?.ownerUserId,
        threadVersion: TT?.threadVersion,
        agentMode: TT?.agentMode,
        initialToolDiscovery: Promise.all([o.mcpService.initialized, o.toolboxService.initialized]).then(() => {
          return;
        }),
        configService: o.configService,
        mcpService: o.mcpService,
        toolService: o.toolService,
        skillService: o.skillService,
        fileSystem: o.fileSystem,
        pluginService: o.pluginService,
        pluginPlatform: o.headlessPluginPlatform,
        useThreadActors: R.threadActors ? !0 : void 0
      });
    } finally {
      await lT.release(), await o.asyncDispose();
    }
    await xb(), process.exit(0);
  }
  let g = T.executeMode ? void 0 : async aT => OS(aT, "interactive"),
    I = {
      threadService: o.threadService,
      workerDeps: n,
      createThread: async () => {
        let aT = l ? await o.serverStatusPromise : p,
          oT = await UeT(T.settings, process.cwd(), hx(aT), v);
        if (oT instanceof Error) d8(oT.message);
        return SJT(n, {
          threadMeta: oT ? MA(oT) : void 0,
          agentMode: R.mode,
          onFirstAssistantMessage: g
        });
      },
      validateThreadOwnership: async (aT, oT) => {
        if (oT?.nonBlockingOwnershipCheck) {
          o$T(aT, o.configService, o.viewerUserIDPromise).catch(TT => {
            if (TT instanceof GR) {
              if (oT.onOwnershipError) {
                oT.onOwnershipError(TT, aT);
                return;
              }
              Jl(TT, aT);
              return;
            }
            J.warn("Failed to validate thread ownership in CLI, allowing to open", {
              error: TT
            });
          });
          return;
        }
        try {
          await o$T(aT, o.configService, o.viewerUserIDPromise);
        } catch (TT) {
          if (TT instanceof GR) throw TT;
          J.warn("Failed to validate thread ownership in CLI, allowing to open", {
            error: TT
          });
        }
      },
      switchThreadVisibility: v,
      switchThreadAgentMode: R.mode,
      onFirstAssistantMessage: g,
      handleError: Jl
    },
    S = async aT => {
      try {
        if (aT === "dtw") return Qz0({
          ampURL: T.ampURL,
          configService: o.configService,
          threadService: o.threadService,
          mcpService: o.mcpService,
          clientID: t$T,
          toolboxService: o.toolboxService,
          toolService: o.toolService,
          skillService: o.skillService,
          fileSystem: o.fileSystem,
          threadId: R.threadId,
          useThreadActors: R.threadActors ? !0 : void 0
        });
        return pD0(I, R.threadId, {
          nonBlockingOwnershipCheck: R.nonBlockingThreadOwnershipCheck
        });
      } catch (oT) {
        if (oT instanceof GR) throw oT;
        throw await Jl(oT, R.threadId), Error("handleError should have called process.exit()");
      }
    };
  if (R.format === "jsonl") Be.write(`jsonl format is deprecated. Version "0.0.1752148945-gd8844f" or earlier is required to use jsonl format.
`), await xb(), process.exit(1);
  let O = (async () => {
      if (l) {
        J.info("Skipping initial free tier status fetch until auth is complete");
        return;
      }
      try {
        let aT = await o.configService.getLatest(),
          oT = k2(aT),
          TT = await N3.getUserFreeTierStatus({}, {
            config: o.configService,
            signal: AbortSignal.timeout(oT)
          });
        if (TT.ok) return J.info("User free tier status:", TT), TT.result;
        return;
      } catch (aT) {
        J.error("Failed to fetch free tier status:", aT);
        return;
      }
    })(),
    j = !T.executeMode ? new IJT() : null,
    d,
    C = null;
  if (j) d = j, C = (async () => {
    let aT = l ? await o.serverStatusPromise : o.serverStatus;
    await RZ(a, R, aT);
    let oT = process.hrtime.bigint(),
      TT = eZ(u, aT),
      tT = X9(aT) ? aZ({
        userEmail: aT.user.email,
        features: aT.features
      }) : !1;
    r$T({
      dtwEnabled: TT,
      hasV2TUIAccess: tT
    });
    let lT = await S(TT ? "dtw" : "worker");
    if (r("runMainThread:createThreadPool", oT), j.attach(lT), h) {
      let N = await m0(lT.threadHandles$);
      if (!N) throw new GR("No active thread is available yet.", 1);
      await N.sendMessage({
        content: [{
          type: "text",
          text: h
        }]
      });
    }
  })(), C.catch(async aT => {
    let oT = aT instanceof Error ? aT : Error(String(aT));
    j.setInitError(oT), await Jl(aT, R.threadId);
  });else s = process.hrtime.bigint(), r$T({
    dtwEnabled: P,
    hasV2TUIAccess: y
  }), d = await S(P ? "dtw" : "worker"), r("runMainThread:createThreadPool", s);
  let L = R.notifications !== void 0 ? R.notifications : !T.executeMode,
    w = _ !== null && SS(_.features, dr.TUI_VOICE_NOTIF);
  if (l) o.serverStatusPromise.then(aT => {
    w = X9(aT) && SS(aT.features, dr.TUI_VOICE_NOTIF);
  }).catch(aT => {
    J.debug("Failed to resolve TUI voice notification feature flag", {
      error: aT
    });
  });
  s = process.hrtime.bigint();
  let D = await o.configService.getLatest();
  if (r("runMainThread:configService.getLatest", s), s = process.hrtime.bigint(), qz0({
    configService: o.configService,
    threadService: o.threadService,
    config: D,
    useNotificationsForService: L,
    isTUIVoiceNotifEnabled: () => w,
    threadViewStates$: () => d.threadHandles$.pipe(L9(aT => {
      if (!aT) return AR.of({});
      return v3(aT.thread$, aT.threadViewState$).pipe(JR(([oT, TT]) => ({
        [oT.id]: TT
      })));
    }))
  }), r("runMainThread:createCliNotificationService", s), T.executeMode) {
    MC0(o.mcpService, T.settings);
    let aT = {
        userInput: h,
        stdinInput: i,
        dependencies: o,
        streamJson: c,
        streamJsonInput: !!R.streamJsonInput,
        streamJsonThinking: !!R.streamJsonThinking,
        stats: !!R.stats,
        ampURL: T.ampURL,
        isDogfooding: b,
        agentMode: R.mode,
        labels: R.label
      },
      oT = await Yl0({
        threadPool: d,
        ...aT
      });
    if (await OS(oT, "execute"), R.archive) await o.threadService.archive(oT, !0), await dS(o.threadService, oT);
    await o.asyncDispose(), process.exit(0);
  }
  let B = !1,
    M = !1;
  if (R.jetbrains || R.ide) {
    await opR();
    let aT = await OD({
      jetbrainsOnly: R.jetbrains
    });
    if (aT.length === 0) {
      if (R.jetbrains) B = !(await o.configService.get("jetbrains.skipInstall"));
    } else if (aT.length === 1) {
      let oT = aT[0];
      if (oT) Us.selectConfig(oT);
    } else M = !0;
  }
  s = process.hrtime.bigint();
  let V = pm0("0.0.1775894934-g5bb49b", o.settingsStorage, {
    startDelayMs: 3000
  });
  r("runMainThread:createUpdateService", s), s = process.hrtime.bigint();
  let Q = new ZZT(o.mcpService, T.settings.getWorkspaceRootPath());
  if (r("runMainThread:createMcpTrustHandler", s), h && T.executeMode) {
    let aT = await m0(d.threadHandles$);
    if (!aT) throw new GR("No active thread is available yet.", 1);
    await aT.sendMessage({
      content: [{
        type: "text",
        text: h
      }]
    });
  }
  s = process.hrtime.bigint();
  let W = await PrT();
  r("runMainThread:loadSessionState", s), J.info("Loaded session state:", W);
  let eT = {
    ...W,
    launchCount: W.launchCount + 1
  };
  iB(aT => ({
    ...aT,
    launchCount: aT.launchCount + 1
  }));
  let iT = R.threadId && Vt(R.threadId) ? R.threadId : void 0;
  try {
    if (s = process.hrtime.bigint(), await _70({
      history: new qKT(),
      fuzzyServer: o.fuzzyServer,
      settingsStorage: o.settingsStorage,
      threadService: o.threadService,
      skillService: o.skillService,
      configService: o.configService,
      secretStorage: o.secretStorage,
      internalAPIClient: N3,
      threadPool: d,
      createSystemPromptDeps: async () => t3R(o),
      ideClient: Us,
      mcpService: o.mcpService,
      toolboxService: o.toolboxService,
      mcpTrustHandler: Q,
      updateService: V,
      pluginPlatform: o.pluginPlatform,
      pluginService: o.pluginService
    }, {
      initialServerStatus: o.serverStatus,
      stdout: process.stdout,
      hasAPIKeyAtStartup: o.hasAPIKeyAtStartup,
      ampURL: T.ampURL,
      startupThreadID: iT,
      showJetBrainsInstaller: B,
      showIdePickerHint: M,
      openThreadSwitcher: R.openThreadSwitcher,
      inspector: R.inspector,
      inspectorPort: R.inspectorPort,
      jetbrainsMode: R.jetbrains,
      clientId: t$T,
      logFile: {
        path: e
      },
      sessionState: eT,
      freeTierStatusPromise: O,
      workspace: f ?? null,
      features: x,
      isDogfooding: b,
      initialAgentMode: a.getOptionValueSourceWithGlobals("mode") === "cli" ? R.mode : void 0,
      buildTimestamp: "2026-04-11T08:12:39.144Z"
    }, aT => new QJT({
      ...aT,
      threadPool: aT.threadPool
    }, oT => new Z8R({
      ...oT,
      threadState: oT.threadState
    }))), r("runMainThread:mountApp-returned", s), C) await C;
  } finally {
    await d.dispose().catch(aT => {
      J.error("Failed to dispose thread pool during shutdown", aT);
    });
  }
  await o.asyncDispose(), r("runMainThread:dependencies.asyncDispose", t), process.exit(0);
}
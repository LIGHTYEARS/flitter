function X5T(T) {
  let R = T.pluginFilter.trim();
  if (R = R === "all" ? void 0 : R, R === "off") return J.debug("Plugins disabled via pluginFilter=off"), V5T;
  let {
      configService: a,
      fileSystem: e,
      platform: t
    } = T,
    r = [],
    h = !1,
    i = Promise.resolve(),
    c = new W0(),
    s = new W0(),
    A = new W0(),
    l = new Map();
  function o(X, rT) {
    return X.id === rT.id && X.category === rT.category && X.title === rT.title && X.description === rT.description && X.pluginName === rT.pluginName;
  }
  function n(X, rT) {
    return X.name === rT.name && X.description === rT.description && X.pluginName === rT.pluginName && p(X.inputSchema, rT.inputSchema);
  }
  function p(X, rT) {
    if (X === rT) return !0;
    if (X == null || rT == null || typeof X !== "object" || typeof rT !== "object") return !1;
    let hT = Array.isArray(X),
      pT = Array.isArray(rT);
    if (hT !== pT) return !1;
    if (hT && pT) {
      if (X.length !== rT.length) return !1;
      return X.every((uT, bT) => p(uT, rT[bT]));
    }
    let mT = Object.entries(X),
      yT = Object.entries(rT);
    if (mT.length !== yT.length) return !1;
    return mT.every(([uT, bT]) => p(bT, rT[uT]));
  }
  function _(X, rT, hT) {
    if (X.size !== rT.size) return !1;
    for (let [pT, mT] of X) {
      let yT = rT.get(pT);
      if (yT === void 0 || !hT(mT, yT)) return !1;
    }
    return !0;
  }
  function m(X, rT) {
    if (X.size !== rT.size) return !1;
    for (let hT of X) if (!rT.has(hT)) return !1;
    return !0;
  }
  function b(X) {
    let rT = X.registeredCommands.size > 0,
      hT = X.registeredTools.size > 0;
    if (X.registeredEvents = new Set(), X.registeredCommands = new Map(), X.registeredTools = new Map(), X.startedSessionStartThreadIDs = new Set(), rT) s.next();
    if (hT) A.next();
  }
  function y(X, rT) {
    if (rT.type === "restarting") {
      X.status = "loading", b(X), g();
      return;
    }
    if (rT.type === "failed") {
      X.status = "error", b(X), g();
      return;
    }
    X.status = "active", u(X);
  }
  async function u(X) {
    if (X.status !== "active") return;
    try {
      let [rT, hT, pT] = await Promise.all([X.process.listCommands(), X.process.listTools(), X.process.listRegisteredEvents()]),
        mT = new Map(rT.map(MT => [MT.id, MT])),
        yT = new Map(hT.map(MT => [MT.name, MT])),
        uT = new Set(pT),
        bT = !_(X.registeredCommands, mT, o),
        jT = !_(X.registeredTools, yT, n),
        fT = !m(X.registeredEvents, uT);
      if (X.registeredCommands = mT, X.registeredTools = yT, X.registeredEvents = uT, bT) s.next();
      if (jT) A.next();
      if (bT || jT || fT) g();
    } catch (rT) {
      J.debug("Failed to refresh plugin registrations", {
        uri: X.uri,
        error: rT
      });
    }
  }
  function P(X, rT, hT) {
    if (rT === "commands.changed" || rT === "tools.changed") u(X);
  }
  let k = {
      "ui.notify": async ({
        message: X
      }) => {
        await t.notify(X);
        return;
      },
      "system.open": async ({
        url: X
      }) => {
        await t.open(X);
        return;
      },
      "ui.input": ({
        options: X
      }) => t.input(X),
      "ui.confirm": ({
        options: X
      }) => t.confirm(X),
      "ai.ask": ({
        question: X
      }) => t.ask(X),
      "client.info": async () => {
        let X = await m0(a.config),
          rT = await m0(a.workspaceRoot);
        return {
          ampURL: d0(zR.parse(X.settings.url)),
          executorKind: t.pluginExecutorKind,
          workspaceRoot: rT ? d0(rT) : void 0
        };
      },
      "thread.append": async ({
        messages: X
      }) => {
        if (t.appendToThread) {
          await t.appendToThread(X);
          return;
        }
        throw Error("thread.append is not supported in this environment");
      },
      "span.event": async ({
        span: X,
        message: rT
      }) => {
        l.get(X)?.addEvent(rT);
        return;
      },
      "span.attributes": async ({
        span: X,
        attributes: rT
      }) => {
        l.get(X)?.setAttributes(rT);
        return;
      },
      "configuration.get": async () => {
        return (await m0(a.config)).settings;
      },
      "configuration.update": async ({
        partial: X,
        target: rT
      }) => {
        let hT = Object.entries(X).map(([pT, mT]) => a.updateSettings(pT, mT, rT));
        await Promise.all(hT);
        return;
      },
      "configuration.delete": ({
        key: X,
        target: rT
      }) => a.deleteSettings(X, rT)
    },
    x = a.workspaceRoot.pipe(E9((X, rT) => X?.toString() === rT?.toString())),
    f = new f0([]);
  function v(X) {
    return {
      uri: X.uri,
      status: X.status,
      registeredEvents: [...X.registeredEvents],
      registeredCommands: [...X.registeredCommands.values()],
      registeredTools: [...X.registeredTools.values()]
    };
  }
  function g() {
    f.next(r.map(v));
  }
  function I(X) {
    let rT = X ? [MR.joinPath(X, RqR)] : [];
    if (a.userConfigDir) rT.push(MR.joinPath(a.userConfigDir, "amp", aqR));
    return rT;
  }
  async function S(X) {
    try {
      return (await e.readdir(X)).filter(rT => {
        if (rT.isDirectory) return !1;
        let hT = H5T(rT.uri.path);
        return hT === ".js" || hT === ".ts";
      }).map(rT => d0(rT.uri));
    } catch (rT) {
      if (Er(rT)) return [];
      throw rT;
    }
  }
  async function O(X) {
    return S(X);
  }
  function j(X) {
    let rT = X,
      hT = null,
      pT = puT({
        uri: rT,
        createProcess: mT => new vaT(X, {
          ...mT
        }),
        onRequest: k,
        onEvent: (mT, yT) => {
          if (hT) P(hT, mT, yT);
        },
        onStateChange: mT => {
          if (hT) y(hT, mT);
        }
      });
    return hT = pT, pT;
  }
  function d(X) {
    let rT = eqR(X.name),
      hT = null,
      pT = puT({
        uri: rT,
        createProcess: mT => new K5T({
          ...mT,
          entryPoint: X.entryPoint,
          pluginFile: rT
        }),
        onRequest: k,
        onEvent: (mT, yT) => {
          if (hT) P(hT, mT, yT);
        },
        onStateChange: mT => {
          if (hT) y(hT, mT);
        }
      });
    return hT = pT, pT;
  }
  async function C(X) {
    r = X, g(), await Promise.all(X.map(async rT => {
      let hT = Date.now();
      try {
        await rT.process.start(), await u(rT), J.debug("Plugin started", {
          pluginFile: rT.uri.toString(),
          durationMs: Date.now() - hT,
          registeredEvents: [...rT.registeredEvents],
          registeredCommands: [...rT.registeredCommands.keys()],
          registeredTools: [...rT.registeredTools.keys()]
        });
      } catch (pT) {
        rT.status = "error", J.warn("Failed to start plugin", {
          pluginFile: rT.uri.toString(),
          durationMs: Date.now() - hT,
          error: pT
        }), b(rT);
      }
      g();
    }));
  }
  let L = x.pipe(L9(X => {
    let rT = I(X);
    if (rT.length === 0 && (T.internalPlugins?.length ?? 0) === 0) return w([]), f;
    let hT = rT.length > 0 ? xj(...rT.map(pT => e.watch(pT, {
      ignoreChanges: !1
    }))).pipe(Y3(void 0)) : AR.of(void 0);
    return xj(hT, c).pipe(L9(() => {
      return w(rT), f;
    }));
  }), f3({
    shouldCountRefs: !0
  }));
  function w(X) {
    i = i.catch(rT => {
      J.debug("Plugin reload queue previous operation failed", {
        error: rT
      });
    }).then(async () => {
      if (h) return;
      if (await B({
        waitForExit: !1
      }), h) return;
      await D(X);
    });
  }
  async function D(X) {
    if (h) return;
    let rT = [];
    for (let jT of X) try {
      let fT = await O(jT);
      rT.push(...fT);
    } catch (fT) {
      J.debug("Failed to find plugin files", {
        dir: jT.toString(),
        error: fT
      });
    }
    let hT = rT;
    if (R) hT = rT.filter(jT => h_(jT).includes(R)), J.info("Filtered plugins", {
      filter: R,
      total: rT.length,
      matched: hT.length
    });
    let pT = T.internalPlugins ?? [];
    if (R) pT = pT.filter(jT => jT.name.toLowerCase().includes(R));
    let mT = pT.length > 0;
    if (hT.length === 0 && !mT) {
      f.next([]);
      return;
    }
    if (h) return;
    let yT = Date.now();
    J.info("Starting plugins", {
      count: hT.length + pT.length,
      plugins: hT,
      internalPlugins: pT.map(jT => jT.name)
    });
    let uT = hT.map(jT => j(Ht(jT))),
      bT = pT.map(d);
    if (await C([...uT, ...bT]), h) {
      await B({
        waitForExit: !0
      });
      return;
    }
    if (J.info("All plugins started", {
      count: uT.length + bT.length,
      totalDurationMs: Date.now() - yT
    }), T.emitSessionStart !== !1) Q("session.start", {});
  }
  async function B(X) {
    let rT = r;
    r = [], g();
    let hT = rT.map(async pT => {
      try {
        await pT.process.dispose();
      } catch (mT) {
        J.debug("Failed to dispose plugin process", {
          uri: pT.uri,
          error: mT
        });
      }
    });
    if (X.waitForExit) await Promise.all(hT);else for (let pT of hT);
  }
  function M() {
    if (h) return;
    J.info("Reloading all plugins"), c.next();
  }
  function V(X) {
    return r.filter(rT => rT.status === "active" && rT.registeredEvents.has(X));
  }
  async function Q(X, rT) {
    let hT = V(X);
    if (hT.length === 0) return;
    let pT = hT.map(mT => mT.process.emitEvent(X, rT).catch(yT => {
      J.debug("Failed to emit event to plugin", {
        uri: mT.uri,
        event: X,
        error: yT
      });
    }));
    await Promise.all(pT);
  }
  async function W(X, rT) {
    if (!X.registeredEvents.has("session.start")) return;
    if (X.startedSessionStartThreadIDs.has(rT)) return;
    X.startedSessionStartThreadIDs.add(rT), await X.process.emitEvent("session.start", {
      thread: {
        id: rT
      }
    }).catch(hT => {
      X.startedSessionStartThreadIDs.delete(rT), J.debug("Failed to emit thread-scoped session.start to plugin", {
        uri: X.uri,
        error: hT,
        threadID: rT
      });
    });
  }
  async function eT(X) {
    if (!X) return;
    await Promise.all(V("session.start").map(rT => W(rT, X)));
  }
  async function iT(X, rT = Yo) {
    await eT(X.thread?.id);
    let hT = V("tool.call");
    if (hT.length === 0) return {
      action: "allow"
    };
    let pT = await Promise.all(hT.map(mT => {
      let yT = h_(mT.uri),
        uT = {
          pluginName: yT,
          hook: "tool.call"
        };
      return rT.startActiveSpan("plugin", {
        label: `${yT}#tool.call#${X.tool}`,
        attributes: {
          plugin: uT
        }
      }, async bT => {
        l.set(bT.id, bT);
        try {
          return await mT.process.requestToolCall(X, bT.id);
        } catch (jT) {
          return J.warn("Failed to request tool.call from plugin", {
            uri: mT.uri,
            error: jT,
            tool: X.tool
          }), {
            action: "error",
            message: jT instanceof Error ? jT.message : `Plugin error: ${String(jT)}`
          };
        } finally {
          l.delete(bT.id);
        }
      });
    }));
    for (let mT of pT) {
      if (mT.action === "error") return mT;
      if (mT.action === "reject-and-continue") return mT;
      if (mT.action === "synthesize") return mT;
      if (mT.action === "modify") return mT;
    }
    return {
      action: "allow"
    };
  }
  async function aT(X, rT = Yo) {
    let hT = V("tool.result");
    if (hT.length === 0) return;
    let pT = await Promise.all(hT.map(mT => {
      let yT = h_(mT.uri),
        uT = {
          pluginName: yT,
          hook: "tool.result"
        };
      return rT.startActiveSpan("plugin", {
        label: `${yT}#tool.result#${X.tool}`,
        attributes: {
          plugin: uT
        }
      }, async bT => {
        l.set(bT.id, bT);
        try {
          return await mT.process.requestToolResult(X, bT.id);
        } catch (jT) {
          J.debug("Failed to request tool.result from plugin", {
            uri: mT.uri,
            error: jT
          });
          return;
        } finally {
          l.delete(bT.id);
        }
      });
    }));
    for (let mT of pT) if (mT) return mT;
    return;
  }
  async function oT(X, rT = Yo, hT) {
    await eT(hT?.threadID);
    let pT = V("agent.start");
    if (pT.length === 0) return {};
    let mT = await Promise.all(pT.map(uT => {
        let bT = h_(uT.uri),
          jT = {
            pluginName: bT,
            hook: "agent.start"
          };
        return rT.startActiveSpan("plugin", {
          label: `${bT}#agent.start`,
          attributes: {
            plugin: jT
          }
        }, async fT => {
          l.set(fT.id, fT);
          try {
            return await uT.process.requestAgentStart(X, fT.id);
          } catch (MT) {
            return J.debug("Failed to request agent.start from plugin", {
              uri: uT.uri,
              error: MT
            }), {};
          } finally {
            l.delete(fT.id);
          }
        });
      })),
      yT = [];
    for (let uT of mT) if (uT.message) yT.push(uT.message);
    return {
      message: yT.length > 0 ? {
        content: yT.map(uT => uT.content).join(`

`),
        display: !0
      } : void 0
    };
  }
  async function TT(X, rT = Yo) {
    let hT = V("agent.end");
    if (hT.length === 0) return {
      action: "done"
    };
    let pT = await Promise.all(hT.map(mT => {
      let yT = h_(mT.uri),
        uT = {
          pluginName: yT,
          hook: "agent.end"
        };
      return rT.startActiveSpan("plugin", {
        label: `${yT}#agent.end`,
        attributes: {
          plugin: uT
        }
      }, async bT => {
        l.set(bT.id, bT);
        try {
          return await mT.process.requestAgentEnd(X, bT.id);
        } catch (jT) {
          return J.debug("Failed to request agent.end from plugin", {
            uri: mT.uri,
            error: jT
          }), {
            action: "done"
          };
        } finally {
          l.delete(bT.id);
        }
      });
    }));
    for (let mT of pT) if (mT.action === "continue") return mT;
    return {
      action: "done"
    };
  }
  function tT() {
    let X = [];
    for (let rT of r) if (rT.status === "active") for (let hT of rT.registeredCommands.values()) X.push(hT);
    return X;
  }
  async function lT(X, rT, hT) {
    let pT = r.find(mT => mT.status === "active" && h_(mT.uri) === X);
    if (!pT) throw Error(`Plugin not found: ${X}`);
    await pT.process.executeCommand(rT, hT);
  }
  function N() {
    let X = [];
    for (let rT of r) if (rT.status === "active") for (let hT of rT.registeredTools.values()) X.push(hT);
    return X;
  }
  async function q(X, rT, hT) {
    let pT = r.find(mT => mT.status === "active" && h_(mT.uri) === X);
    if (!pT) throw Error(`Plugin not found: ${X}`);
    return pT.process.executeTool(rT, hT);
  }
  async function F() {
    if (h) return;
    h = !0, await i.catch(X => {
      J.debug("Plugin reload queue failed during dispose", {
        error: X
      });
    }), await B({
      waitForExit: !0
    });
  }
  async function E(X) {
    let rT = r.filter(pT => pT.status === "active");
    if (rT.length === 0) return;
    let hT = rT.map(pT => pT.process.sendConfigurationChange(X).catch(mT => {
      J.debug("Failed to send configuration change to plugin", {
        uri: pT.uri,
        error: mT
      });
    }));
    await Promise.all(hT);
  }
  let U = L.subscribe({}),
    Z = a.config.subscribe({
      next: X => {
        E(X.settings);
      }
    });
  return {
    plugins: L,
    event: {
      toolCall: iT,
      toolResult: aT,
      agentStart: oT,
      agentEnd: TT
    },
    commands: {
      list: tT,
      execute: lT,
      changed: s
    },
    tools: {
      list: N,
      execute: q,
      changed: A
    },
    reload: M,
    dispose: async () => {
      U.unsubscribe(), Z.unsubscribe(), await F();
    }
  };
}
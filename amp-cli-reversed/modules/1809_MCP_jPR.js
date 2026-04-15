function jPR({
  configService: T,
  externalMCPServers: R = AR.of({}),
  skillMCPServers: a = AR.of({}),
  createOAuthProvider: e,
  trustStore: t,
  oauthStorage: r
}) {
  let h = new kDT(),
    i = new W0(),
    c,
    s = v3(T.config, R, a, ln(T)).pipe(JR(([{
      settings: {
        mcpServers: g,
        mcpPermissions: I,
        mcpTrustedServers: S,
        "terminal.commands.nodeSpawn.loadProfile": O
      }
    }, j, d, C]) => ({
      mcpServers: g,
      mcpPermissions: I,
      mcpTrustedServers: S,
      mcpRegistryUrl: X9(C) ? C.workspace?.mcpRegistryUrl ?? null : null,
      loadProfile: O,
      externalMCPServers: j,
      skillMCPServers: d
    })), E9((g, I) => XE(g, I))),
    A = T.workspaceRoot.pipe(JR(g => g ?? void 0), E9((g, I) => g?.toString() === I?.toString())),
    l = new Map();
  function o(g) {
    let I = g.spec,
      S = Hq({
        hasNonSkillSource: g.isFromMainConfig,
        skillNames: g.skillNames,
        includeTools: I.includeTools,
        includeToolsBySkill: I._ampSkillIncludeTools
      });
    return {
      name: g.name,
      spec: g.spec,
      isExternal: g.isExternal,
      requiresApproval: !1,
      specHash: void 0,
      skillName: g.skillName,
      skillNames: g.skillNames,
      includeTools: S ? I.includeTools : void 0,
      status: {
        type: "blocked-by-registry",
        registryUrl: g.registryUrl
      },
      tools: [],
      prompts: []
    };
  }
  let n,
    p,
    _ = v3(s, A, i.pipe(Y3(void 0))).pipe(KS(300), L9(([{
      mcpServers: g,
      mcpPermissions: I,
      mcpTrustedServers: S,
      mcpRegistryUrl: O,
      loadProfile: j,
      externalMCPServers: d,
      skillMCPServers: C
    }, L, w]) => Q9(async D => {
      let B = [],
        M = {};
      for (let [W, eT] of Object.entries(C ?? {})) M[W] = eT;
      for (let [W, eT] of Object.entries(g ?? {})) {
        let iT = C?.[W];
        if (iT) M[W] = PlT(eT, iT);else M[W] = eT;
      }
      for (let [W, eT] of Object.entries(d ?? {})) {
        let iT = M[W];
        if (iT?._ampSkillNames) M[W] = PlT(eT, iT);else M[W] = eT;
      }
      let V = M;
      if (O) {
        let W = await fPR(V, O);
        if (D.aborted) return {
          connections: [],
          blocked: []
        };
        if (W.error) return J.error("MCP registry unreachable, blocking all MCP servers (fail-closed)", {
          registryUrl: O,
          error: W.error.message
        }), B = Object.entries(V).map(([eT, iT]) => ({
          name: eT,
          spec: iT,
          registryUrl: O,
          isExternal: eT in d,
          isFromMainConfig: Boolean(g?.[eT]) || Boolean(d?.[eT]),
          skillName: iT._ampSkillName,
          skillNames: iT._ampSkillNames
        })), await Promise.all(Array.from(l.entries()).map(async ([eT, {
          client: iT
        }]) => {
          J.info("Disposing MCP connection due to registry failure", {
            serverName: eT
          }), await iT[Symbol.asyncDispose](), l.delete(eT);
        })), {
          connections: [],
          blocked: B
        };
        B = Object.entries(W.blocked).map(([eT, iT]) => ({
          name: eT,
          spec: iT,
          registryUrl: O,
          isExternal: eT in d,
          isFromMainConfig: Boolean(g?.[eT]) || Boolean(d?.[eT]),
          skillName: iT._ampSkillName,
          skillNames: iT._ampSkillNames
        }));
        for (let [eT] of Object.entries(W.blocked)) {
          J.warn("MCP server blocked by registry", {
            serverName: eT,
            registryUrl: O
          });
          let iT = l.get(eT);
          if (iT) await iT.client[Symbol.asyncDispose](), l.delete(eT);
        }
        V = W.approved;
      } else B = [];
      let Q = h.consume() || !XE(n, I) || !XE(p, S);
      n = I, p = S;
      for (let [W, eT] of Object.entries(V)) {
        let iT = l.get(W);
        if (!Q && iT && XE(iT.spec, eT)) continue;
        let aT = "url" in eT && (!!eT.oauth || !eT.headers && eT.transport !== "http"),
          oT = "url" in eT ? eT.oauth : void 0,
          TT = "url" in eT ? eT.url : void 0,
          tT = aT && e && TT ? await e(W, TT, oT) : void 0,
          lT = eT._target === "workspace",
          N = await gPR(eT),
          q = !1,
          F;
        if (lT) {
          let Z = {
            serverName: W,
            specHash: N
          };
          if (!(await t.isTrusted(Z))) {
            let X = await t.hasEntry?.(Z),
              rT = X ? "denied" : "awaiting-approval";
            if (F = Uq(eT, {
              workingDirectory: L,
              loadProfile: j
            }, rT, I, tT, W), q = rT === "awaiting-approval", J.info(`MCP server ${W} ${rT === "denied" ? "was denied" : "requires approval before execution"}`, {
              specHash: N,
              trustState: rT
            }), !X) c?.(W, eT);
          } else F = Uq(eT, {
            workingDirectory: L,
            loadProfile: j
          }, "enabled", I, tT, W);
        } else F = Uq(eT, {
          workingDirectory: L,
          loadProfile: j
        }, "enabled", I, tT, W);
        let E = Boolean(g?.[W] || d?.[W]),
          U = eT;
        if (l.set(W, {
          spec: eT,
          client: F,
          isExternal: Boolean(d[W]),
          skillName: U._ampSkillName,
          skillNames: U._ampSkillNames,
          isFromMainConfig: E,
          requiresApproval: q,
          specHash: N
        }), iT) await iT.client[Symbol.asyncDispose]();
      }
      for (let [W, {
        client: eT
      }] of l.entries()) if (!V || !(W in V)) await eT[Symbol.asyncDispose](), l.delete(W);
      return {
        connections: Array.from(l.entries()),
        blocked: B
      };
    })), f3({
      shouldCountRefs: !1
    })),
    m = _.subscribe({}),
    b = new Map(),
    y = 30000,
    u = g => {
      if (g) b.delete(g);else b.clear();
    },
    P = _.pipe(L9(({
      connections: g
    }) => g.length === 0 ? AR.of({
      ready: [],
      disabled: []
    }) : v3(...g.map(([I, {
      client: S
    }]) => S.status.pipe(da(O => O.type !== "connecting" && O.type !== "authenticating" && O.type !== "reconnecting"), ti(1), L9(O => {
      if (O.type !== "connected") return AR.of({
        name: I,
        disabled: !0
      });
      return S.toolsLoaded.pipe(da(j => j), ti(1), JR(() => ({
        name: I,
        disabled: !1
      })));
    })))).pipe(JR(I => ({
      ready: I.filter(S => !S.disabled).map(S => S.name),
      disabled: I.filter(S => S.disabled).map(S => S.name)
    })))), ti(1)),
    k = v3(_.pipe(L9(({
      connections: g
    }) => g.length === 0 ? AR.of([]) : v3(...g.map(([I, {
      spec: S,
      client: O,
      skillName: j,
      skillNames: d,
      isFromMainConfig: C
    }]) => O.tools.pipe(JR(L => ({
      name: I,
      spec: S,
      tools: L,
      client: O,
      skillName: j,
      skillNames: d,
      isFromMainConfig: C
    }))))))), T.config.pipe(JR(g => g.settings.mcpPermissions), E9())).pipe(JR(([g, I]) => ({
      mcpServers: g,
      mcpPermissions: I
    }))),
    x = k.pipe(JR(({
      mcpServers: g
    }) => {
      if (g.length === 0) return {
        type: "ready",
        toolCount: 0
      };
      return {
        type: "ready",
        toolCount: g.reduce((I, {
          tools: S
        }) => I + S.length, 0)
      };
    }), f3({
      shouldCountRefs: !1
    })),
    f = m0(P).then(({
      ready: g,
      disabled: I
    }) => {
      J.info("mcpService.initialized", {
        ready: g,
        disabled: I
      });
    }).catch(g => {
      J.warn("MCP service initialization failed, but service will continue", {
        error: g
      });
    }),
    v = v3(T.config, _).pipe(L9(([g, {
      connections: I,
      blocked: S
    }]) => {
      let O = S.map(o);
      if (I.length === 0) return AR.of(O);
      return v3(...I.map(([j, {
        spec: d,
        client: C,
        isExternal: L,
        isFromMainConfig: w,
        requiresApproval: D,
        specHash: B,
        skillName: M,
        skillNames: V
      }]) => v3(C.status, C.tools, C.prompts).pipe(JR(([Q, W, eT]) => {
        let iT = d,
          aT = Hq({
            hasNonSkillSource: w,
            skillNames: V,
            includeTools: iT.includeTools,
            includeToolsBySkill: iT._ampSkillIncludeTools
          }),
          oT = W.filter(TT => {
            if (!aT) return !0;
            let tT = iT.includeTools;
            if (tT && tT.length > 0) return tT.some(lT => Cj(TT.name, lT));
            return !0;
          });
        return {
          name: j,
          spec: d,
          isExternal: L,
          requiresApproval: D,
          specHash: B,
          skillName: M,
          skillNames: V,
          includeTools: aT ? iT.includeTools : void 0,
          status: Q,
          tools: oT.map(TT => ({
            spec: {
              name: TT.name,
              description: TT.description,
              inputSchema: TT.inputSchema,
              source: {
                mcp: j
              }
            },
            ...yy({
              name: TT.name,
              source: {
                mcp: j
              }
            }, g)
          })),
          prompts: eT
        };
      })))).pipe(JR(j => [...j, ...O]));
    }), f3({
      shouldCountRefs: !1
    }));
  return {
    name: "MCP",
    initialized: f,
    status: x,
    registerToolsWithToolService(g) {
      let I = new Map(),
        S = k.subscribe(({
          mcpServers: O,
          mcpPermissions: j
        }) => {
          let d = new Set(),
            C = [];
          for (let {
            name: D,
            spec: B,
            tools: M,
            client: V,
            skillName: Q,
            skillNames: W,
            isFromMainConfig: eT
          } of O) {
            if (!ADT(j, B)) {
              if (M.length > 0) J.error(`Ignoring ${M.length} tools from MCP server ${D} due to MCP permissions`);
              continue;
            }
            let iT = B,
              aT = iT.includeTools,
              oT = iT._ampSkillIncludeTools,
              TT = Hq({
                hasNonSkillSource: eT,
                skillNames: W,
                includeTools: aT,
                includeToolsBySkill: oT
              });
            for (let tT of M) {
              if (TT && aT && aT.length > 0) {
                if (!aT.some(F => Cj(tT.name, F))) continue;
              }
              let lT = vPR({
                  toolName: tT.name,
                  skillNames: W,
                  includeToolsBySkill: oT
                }),
                N = OPR(tT, V, D, B._target, Q, lT, eT),
                q = N.spec.name;
              d.add(q), C.push({
                toolName: q,
                registration: N
              });
            }
          }
          let L = [];
          for (let [D, B] of I) if (!d.has(D)) B.dispose(), I.delete(D), L.push(D);
          let w = [];
          for (let {
            toolName: D,
            registration: B
          } of C) try {
            I.get(D)?.dispose();
            let M = g.registerTool(B);
            I.set(D, M), w.push(D);
          } catch (M) {
            J.warn(`Failed to register MCP tool ${D}:`, M);
          }
          if (L.length > 0) J.debug("MCP tools removed", {
            tools: L
          });
        }, O => {
          J.error("MCP tool registration error", {
            error: O
          });
        });
      return {
        dispose: () => {
          S.unsubscribe();
          for (let O of I.values()) O.dispose();
          I.clear();
        }
      };
    },
    servers: v,
    restartServers() {
      h.replenish(), i.next();
    },
    async allowWorkspace(g) {
      return t.allowWorkspace(g);
    },
    async approveWorkspaceServer(g) {
      let I = l.get(g);
      if (!I) throw Error(`MCP server not found: ${g}`);
      if (I.spec._target !== "workspace") throw Error(`Server ${g} is not a workspace server`);
      await t.setTrust({
        serverName: g,
        specHash: I.specHash
      }, !0), this.restartServers();
    },
    async denyWorkspaceServer(g) {
      let I = l.get(g);
      if (!I) throw Error(`MCP server not found: ${g}`);
      if (I.spec._target !== "workspace") throw Error(`Server ${g} is not a workspace server`);
      await t.setTrust({
        serverName: g,
        specHash: I.specHash
      }, !1);
    },
    isWorkspaceTrusted() {
      return t.isWorkspaceTrusted?.() ?? AR.of(!0);
    },
    getClient(g) {
      return l.get(g)?.client;
    },
    async getToolsForServer(g) {
      return (await m0(v.pipe(ti(1)))).find(I => I.name === g)?.tools;
    },
    async searchResources(g) {
      try {
        let {
            connections: I
          } = await m0(_),
          S = Date.now(),
          O = [];
        for (let [j, {
          client: d
        }] of I) {
          if ((await m0(d.status)).type !== "connected") continue;
          try {
            let C,
              L = b.get(j);
            if (L && S < L.expires) C = L.resources;else C = await d.listResources(), b.set(j, {
              resources: C,
              timestamp: S,
              expires: S + y
            });
            for (let w of C) {
              let D = w.title || w.name;
              if (!g || j.toLowerCase().includes(g.toLowerCase()) || D.toLowerCase().includes(g.toLowerCase()) || w.description?.toLowerCase().includes(g.toLowerCase()) || w.uri.toLowerCase().includes(g.toLowerCase())) O.push({
                resource: w,
                serverName: j
              });
            }
          } catch (C) {
            J.warn(`Failed to list resources from MCP server ${j}`, C), u(j);
          }
        }
        return O.slice(0, 50);
      } catch (I) {
        return J.warn("Failed to search MCP resources", {
          error: I
        }), [];
      }
    },
    async getPrompt(g, I, S, O) {
      let j = l.get(I);
      if (j) try {
        return await j.client.getPrompt(g, S, O);
      } catch (d) {
        return null;
      }
      return null;
    },
    async addServer(g, I) {
      let S = (await T.getLatest()).settings.mcpServers;
      if (S && g in S) throw Error(`MCP server already exists with name ${JSON.stringify(g)}`);
      if ("command" in I && typeof I.command !== "string") throw Error("Command must be a string");
      if ("url" in I) try {
        new URL(I.url);
      } catch (O) {
        throw Error(`Invalid URL: ${I.url}`);
      }
      await T.updateSettings("mcpServers", {
        ...S,
        [g]: I
      }, "global");
    },
    async removeServer(g, I) {
      let S = (await T.getLatest()).settings.mcpServers;
      if (!S || !(g in S)) throw Error(`MCP server does not exist with name ${JSON.stringify(g)}`);
      let O = {
        ...S
      };
      if (delete O[g], await T.updateSettings("mcpServers", O, "global"), I?.cleanupOAuth && r) await r.clearAll(g);
    },
    async updateServer(g, I) {
      let S = (await T.getLatest()).settings.mcpServers;
      if (!S || !(g in S)) throw Error(`MCP server does not exist with name ${JSON.stringify(g)}`);
      await T.updateSettings("mcpServers", {
        ...S,
        [g]: I
      }, "global");
    },
    searchPrompts(g) {
      return this.servers.pipe(JR(I => {
        let S = [];
        for (let O of I) if (O.status.type === "connected" && Array.isArray(O.prompts)) {
          let j = O.prompts.map(d => dPR(d, O.name)).filter(d => {
            if (!g) return !0;
            let C = g.toLowerCase();
            return d.label.toLowerCase().includes(C) || d.detail && d.detail.toLowerCase().includes(C);
          });
          S.push(...j);
        }
        return S.sort((O, j) => O.label.localeCompare(j.label)).slice(0, Math.min(10, dpR));
      }));
    },
    async dispose() {
      m.unsubscribe();
      let g = Array.from(l.values()).map(async ({
        client: I
      }) => {
        try {
          await I[Symbol.asyncDispose]();
        } catch (S) {
          J.error("Error disposing MCP client", {
            error: S
          });
        }
      });
      await Promise.all(g), l.clear();
    },
    hasAuthenticatingClients() {
      for (let [, {
        client: g
      }] of l) {
        let I = !1;
        if (g.status.subscribe(S => {
          I = S.type === "authenticating";
        }).unsubscribe(), I) return !0;
      }
      return !1;
    },
    async waitForAuthentication(g = 300000) {
      let I = [];
      for (let [O, {
        client: j
      }] of l) if ((await m0(j.status.pipe(ti(1)))).type === "authenticating") I.push({
        name: O,
        client: j
      });
      if (I.length === 0) return;
      J.info("Waiting for OAuth authentication to complete", {
        servers: I.map(O => O.name)
      });
      let S = I.map(async ({
        name: O,
        client: j
      }) => {
        try {
          await m0(j.status.pipe(da(d => d.type !== "authenticating"), ti(1))), J.debug("OAuth authentication completed", {
            serverName: O
          });
        } catch (d) {
          J.warn("Error waiting for OAuth authentication", {
            serverName: O,
            error: d
          });
        }
      });
      await Promise.race([Promise.all(S), new Promise(O => {
        setTimeout(() => {
          J.warn("OAuth authentication wait timed out", {
            timeoutMs: g,
            servers: I.map(j => j.name)
          }), O();
        }, g);
      })]);
    },
    get onUntrustedWorkspaceServer() {
      return c;
    },
    set onUntrustedWorkspaceServer(g) {
      c = g;
    },
    trustStore: t
  };
}
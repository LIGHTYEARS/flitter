// Module: mcp-tools-integration
// Original: segment1[264613:327495]
// Type: Scope-hoisted
// Exports: XE, PDT, klT, SPR, OPR, dPR, fDT, IDT, CPR, LPR, $DT, MPR, Wq, ckR, skR, Y9T, okR, XDT, lkR, AkR
// Category: cli

), b = new Map, y = 30000, u = (g) => {
  if (g) b.delete(g);
  else b.clear()
}, P = _.pipe(L9(({
  connections: g
}) => g.length === 0 ? AR.of({
  ready: [],
  disabled: []
}) : v3(...g.map(([I, {
  client: S
}]) => S.status.pipe(da((O) => O.type !== "connecting" && O.type !== "authenticating" && O.type !== "reconnecting"), ti(1), L9((O) => {
  if (O.type !== "connected") return AR.of({
    name: I,
    disabled: !0
  });
  return S.toolsLoaded.pipe(da((j) => j), ti(1), JR(() => ({
    name: I,
    disabled: !1
  })))
})))).pipe(JR((I) => ({
  ready: I.filter((S) => !S.disabled).map((S) => S.name),
  disabled: I.filter((S) => S.disabled).map((S) => S.name)
})))), ti(1)), k = v3(_.pipe(L9(({
  connections: g
}) => g.length === 0 ? AR.of([]) : v3(...g.map(([I, {
  spec: S,
  client: O,
  skillName: j,
  skillNames: d,
  isFromMainConfig: C
}]) => O.tools.pipe(JR((L) => ({
  name: I,
  spec: S,
  tools: L,
  client: O,
  skillName: j,
  skillNames: d,
  isFromMainConfig: C
}))))))), T.config.pipe(JR((g) => g.settings.mcpPermissions), E9())).pipe(JR(([g, I]) => ({
  mcpServers: g,
  mcpPermissions: I
}))), x = k.pipe(JR(({
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
  }
}), f3({
  shouldCountRefs: !1
})), f = m0(P).then(({
  ready: g,
  disabled: I
}) => {
  J.info("mcpService.initialized", {
    ready: g,
    disabled: I
  })
}).catch((g) => {
  J.warn("MCP service initialization failed, but service will continue", {
    error: g
  })
}), v = v3(T.config, _).pipe(L9(([g, {
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
      oT = W.filter((TT) => {
        if (!aT) return !0;
        let tT = iT.includeTools;
        if (tT && tT.length > 0) return tT.some((lT) => Cj(TT.name, lT));
        return !0
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
      tools: oT.map((TT) => ({
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
    }
  })))).pipe(JR((j) => [...j, ...O]))
}), f3({
  shouldCountRefs: !1
}));
return {
  name: "MCP",
  initialized: f,
  status: x,
  registerToolsWithToolService(g) {
    let I = new Map,
      S = k.subscribe(({
        mcpServers: O,
        mcpPermissions: j
      }) => {
        let d = new Set,
          C = [];
        for (let {
            name: D,
            spec: B,
            tools: M,
            client: V,
            skillName: Q,
            skillNames: W,
            isFromMainConfig: eT
          }
          of O) {
          if (!ADT(j, B)) {
            if (M.length > 0) J.error(`Ignoring ${M.length} tools from MCP server ${D} due to MCP permissions`);
            continue
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
              if (!aT.some((F) => Cj(tT.name, F))) continue
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
            })
          }
        }
        let L = [];
        for (let [D, B] of I)
          if (!d.has(D)) B.dispose(), I.delete(D), L.push(D);
        let w = [];
        for (let {
            toolName: D,
            registration: B
          }
          of C) try {
          I.get(D)?.dispose();
          let M = g.registerTool(B);
          I.set(D, M), w.push(D)
        }
        catch (M) {
          J.warn(`Failed to register MCP tool ${D}:`, M)
        }
        if (L.length > 0) J.debug("MCP tools removed", {
          tools: L
        })
      }, (O) => {
        J.error("MCP tool registration error", {
          error: O
        })
      });
    return {
      dispose: () => {
        S.unsubscribe();
        for (let O of I.values()) O.dispose();
        I.clear()
      }
    }
  },
  servers: v,
  restartServers() {
    h.replenish(), i.next()
  },
  async allowWorkspace(g) {
    return t.allowWorkspace(g)
  },
  async approveWorkspaceServer(g) {
    let I = l.get(g);
    if (!I) throw Error(`MCP server not found: ${g}`);
    if (I.spec._target !== "workspace") throw Error(`Server ${g} is not a workspace server`);
    await t.setTrust({
      serverName: g,
      specHash: I.specHash
    }, !0), this.restartServers()
  },
  async denyWorkspaceServer(g) {
    let I = l.get(g);
    if (!I) throw Error(`MCP server not found: ${g}`);
    if (I.spec._target !== "workspace") throw Error(`Server ${g} is not a workspace server`);
    await t.setTrust({
      serverName: g,
      specHash: I.specHash
    }, !1)
  },
  isWorkspaceTrusted() {
    return t.isWorkspaceTrusted?.() ?? AR.of(!0)
  },
  getClient(g) {
    return l.get(g)?.client
  },
  async getToolsForServer(g) {
    return (await m0(v.pipe(ti(1)))).find((I) => I.name === g)?.tools
  },
  async searchResources(g) {
    try {
      let {
        connections: I
      } = await m0(_), S = Date.now(), O = [];
      for (let [j, {
          client: d
        }] of I) {
        if ((await m0(d.status)).type !== "connected") continue;
        try {
          let C, L = b.get(j);
          if (L && S < L.expires) C = L.resources;
          else C = await d.listResources(), b.set(j, {
            resources: C,
            timestamp: S,
            expires: S + y
          });
          for (let w of C) {
            let D = w.title || w.name;
            if (!g || j.toLowerCase().includes(g.toLowerCase()) || D.toLowerCase().includes(g.toLowerCase()) || w.description?.toLowerCase().includes(g.toLowerCase()) || w.uri.toLowerCase().includes(g.toLowerCase())) O.push({
              resource: w,
              serverName: j
            })
          }
        } catch (C) {
          J.warn(`Failed to list resources from MCP server ${j}`, C), u(j)
        }
      }
      return O.slice(0, 50)
    } catch (I) {
      return J.warn("Failed to search MCP resources", {
        error: I
      }), []
    }
  },
  async getPrompt(g, I, S, O) {
    let j = l.get(I);
    if (j) try {
      return await j.client.getPrompt(g, S, O)
    }
    catch (d) {
      return null
    }
    return null
  },
  async addServer(g, I) {
    let S = (await T.getLatest()).settings.mcpServers;
    if (S && g in S) throw Error(`MCP server already exists with name ${JSON.stringify(g)}`);
    if ("command" in I && typeof I.command !== "string") throw Error("Command must be a string");
    if ("url" in I) try {
      new URL(I.url)
    }
    catch (O) {
      throw Error(`Invalid URL: ${I.url}`)
    }
    await T.updateSettings("mcpServers", {
      ...S,
      [g]: I
    }, "global")
  },
  async removeServer(g, I) {
    let S = (await T.getLatest()).settings.mcpServers;
    if (!S || !(g in S)) throw Error(`MCP server does not exist with name ${JSON.stringify(g)}`);
    let O = {
      ...S
    };
    if (delete O[g], await T.updateSettings("mcpServers", O, "global"), I?.cleanupOAuth && r) await r.clearAll(g)
  },
  async updateServer(g, I) {
    let S = (await T.getLatest()).settings.mcpServers;
    if (!S || !(g in S)) throw Error(`MCP server does not exist with name ${JSON.stringify(g)}`);
    await T.updateSettings("mcpServers", {
      ...S,
      [g]: I
    }, "global")
  },
  searchPrompts(g) {
    return this.servers.pipe(JR((I) => {
      let S = [];
      for (let O of I)
        if (O.status.type === "connected" && Array.isArray(O.prompts)) {
          let j = O.prompts.map((d) => dPR(d, O.name)).filter((d) => {
            if (!g) return !0;
            let C = g.toLowerCase();
            return d.label.toLowerCase().includes(C) || d.detail && d.detail.toLowerCase().includes(C)
          });
          S.push(...j)
        }
      return S.sort((O, j) => O.label.localeCompare(j.label)).slice(0, Math.min(10, dpR))
    }))
  },
  async dispose() {
    m.unsubscribe();
    let g = Array.from(l.values()).map(async ({
      client: I
    }) => {
      try {
        await I[Symbol.asyncDispose]()
      } catch (S) {
        J.error("Error disposing MCP client", {
          error: S
        })
      }
    });
    await Promise.all(g), l.clear()
  },
  hasAuthenticatingClients() {
    for (let [, {
        client: g
      }] of l) {
      let I = !1;
      if (g.status.subscribe((S) => {
          I = S.type === "authenticating"
        }).unsubscribe(), I) return !0
    }
    return !1
  },
  async waitForAuthentication(g = 300000) {
    let I = [];
    for (let [O, {
        client: j
      }] of l)
      if ((await m0(j.status.pipe(ti(1)))).type === "authenticating") I.push({
        name: O,
        client: j
      });
    if (I.length === 0) return;
    J.info("Waiting for OAuth authentication to complete", {
      servers: I.map((O) => O.name)
    });
    let S = I.map(async ({
      name: O,
      client: j
    }) => {
      try {
        await m0(j.status.pipe(da((d) => d.type !== "authenticating"), ti(1))), J.debug("OAuth authentication completed", {
          serverName: O
        })
      } catch (d) {
        J.warn("Error waiting for OAuth authentication", {
          serverName: O,
          error: d
        })
      }
    });
    await Promise.race([Promise.all(S), new Promise((O) => {
      setTimeout(() => {
        J.warn("OAuth authentication wait timed out", {
          timeoutMs: g,
          servers: I.map((j) => j.name)
        }), O()
      }, g)
    })])
  },
  get onUntrustedWorkspaceServer() {
    return c
  },
  set onUntrustedWorkspaceServer(g) {
    c = g
  },
  trustStore: t
}
}

function XE(T, R) {
  return JSON.stringify(T) === JSON.stringify(R)
}

function PDT(T, R) {
  let a = klT(T, "server"),
    e = klT(R, "tool"),
    t = `mcp__${a}__${e}`;
  if (t.length >= 64) return e.slice(0, 64);
  return t
}

function klT(T, R) {
  return T.replace(/[\s-]+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || R
}

function SPR({
  skillName: T,
  skillNames: R,
  hasNonSkillSource: a
}) {
  let e = Array.from(new Set([...R ?? [], ...T ? [T] : []]));
  if (e.length === 0) return;
  return {
    skillNames: e,
    isFromMainConfig: a,
    deferred: !a
  }
}

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
    }, A) => Q9((l) => R.callTool({
      name: T.name,
      arguments: s ?? void 0
    }, A, l).then((o) => {
      return J.debug("MCP tool call succeeded", {
        serverName: a,
        toolName: T.name,
        longName: i
      }), {
        status: "done",
        result: o.map((n) => {
          if (n.type === "text" || n.type === "image") return n;
          throw Error(`unsupported content type: ${n.type}`)
        })
      }
    }, (o) => {
      throw J.error("MCP tool call failed", {
        serverName: a,
        toolName: T.name,
        longName: i,
        error: o instanceof Error ? o.message : String(o),
        errorName: o instanceof Error ? o.name : typeof o,
        stack: o instanceof Error ? o.stack : void 0
      }), o
    }))
  }
}
class kDT {
  forceRestart = !1;
  consume() {
    let T = this.forceRestart;
    return this.forceRestart = !1, T
  }
  replenish() {
    this.forceRestart = !0
  }
}

function dPR(T, R) {
  let a = T.arguments?.map((t) => ({
      name: t.name,
      required: t.required ?? !1
    })) || [],
    e = {
      uri: d0(`mcp://${R}/${T.name}`),
      label: `${R}/${T.name}`,
      detail: T.description || `From ${R}`,
      insertText: "",
      filterText: `${T.name} ${T.description||""}`.toLowerCase()
    };
  return {
    ...e,
    kind: "prompt",
    promptData: {
      ...e,
      arguments: a
    }
  }
}

function fDT() {
  let T = "";
  for (let R = 0; R < 5; R++) T += "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" [Math.floor(Math.random() * 62)];
  return T
}

function IDT(T, R) {
  return {
    startActiveSpan: async (a, e, t) => {
      let r = fDT();
      T.startTrace({
        name: a,
        label: e.label,
        id: r,
        parent: R,
        startTime: new Date().toISOString(),
        context: e.context ?? {},
        attributes: e.attributes
      });
      let h = {
        id: r,
        addEvent: (i) => {
          T.recordTraceEvent(r, {
            message: i,
            timestamp: new Date().toISOString()
          })
        },
        setAttributes: (i) => {
          T.recordTraceAttributes(r, i)
        }
      };
      try {
        return await t(h, IDT(T, r))
      } finally {
        T.endTrace({
          name: a,
          id: r,
          endTime: new Date().toISOString()
        })
      }
    }
  }
}

function CPR(T) {
  switch (T) {
    case "done":
      return "done";
    case "error":
      return "error";
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return "cancelled";
    case "in-progress":
      return "running";
    case "queued":
    case "blocked-on-user":
      return "pending"
  }
}

function LPR(T) {
  if (T.status === "done") return typeof T.result === "string" ? T.result : JSON.stringify(T.result);
  return
}

function $DT(T, R, a) {
  let e = T[R];
  if (!e) return Promise.reject(Error(`No handler for plugin request method: ${R}`));
  return e(a)
}

function MPR(T) {
  if (T.role === "user") {
    let a = [];
    for (let e of T.content)
      if (e.type === "text") a.push({
        type: "text",
        text: e.text
      });
      else if (e.type === "tool_result") {
      let t = e,
        r = {
          type: "tool_result",
          toolUseID: t.toolUseID,
          output: LPR(t.run),
          status: CPR(t.run.status)
        };
      a.push(r)
    }
    return {
      role: "user",
      id: T.messageId,
      content: a
    }
  }
  if (T.role === "assistant") {
    let a = [];
    for (let e of T.content)
      if (e.type === "text") a.push({
        type: "text",
        text: e.text
      });
      else if (e.type === "thinking") a.push({
      type: "thinking",
      thinking: e.thinking
    });
    else if (e.type === "tool_use") {
      let t = e,
        r = {
          type: "tool_use",
          id: t.id,
          name: t.name,
          input: t.input
        };
      a.push(r)
    }
    return {
      role: "assistant",
      id: T.messageId,
      content: a
    }
  }
  let R = [];
  for (let a of T.content)
    if (a.type === "text") R.push({
      type: "text",
      text: a.text
    });
  return {
    role: "info",
    id: T.messageId,
    content: R
  }
}

function Wq(T) {
  return T.map(MPR)
}

function ckR(T) {
  return T.split(":").filter(Boolean)
}

function skR(T) {
  if (!dG) throw Error("expandPath requires Node.js environment");
  if (T.startsWith("~/") || T === "~") return glT.join(dG, T.slice(1));
  return glT.resolve(T)
}

function Y9T(T) {
  if (!T) return [];
  return ckR(T).map((R) => R.trim()).filter(Boolean).map(skR)
}

function okR(T, R) {
  if (R.length === 0) return AR.of([]);
  return new AR((a) => {
    let e = new Ls,
      t = () => {
        a.next(Array.from(e.keys()).toSorted((i, c) => i.toString().localeCompare(c.toString())))
      },
      r = new AbortController;
    Promise.all(R.map(async (i) => {
      if (umR(i)) return T.findFiles(i, {
        signal: r.signal
      });
      try {
        return await T.stat(i), [i]
      } catch (c) {
        if (c instanceof ur) return [];
        if (typeof c === "object" && c !== null && "code" in c && c.code === "ELOOP") return J.warn("Infinite symlink loop detected in guidance file", {
          file: i.toString()
        }), [];
        throw c
      }
    })).then((i) => {
      for (let c of i.flat()) e.add(c);
      t()
    }).catch((i) => {
      if (!r.signal.aborted) r.abort();
      if (!xr(i)) a.error(i)
    });
    let h = R.map((i) => T.watch(i, {
      ignoreChanges: !0
    }).subscribe({
      next: (c) => {
        if (c.type === "create" || c.type === "change") e.add(c.uri);
        else if (c.type === "delete") e.delete(c.uri);
        t()
      }
    }));
    return () => {
      r.abort();
      for (let i of h) i.unsubscribe()
    }
  })
}

function XDT(T) {
  let R = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/,
    a = T.match(R);
  if (!a) return {
    frontMatter: null,
    content: T.trim()
  };
  let [, e, t] = a, r = null;
  try {
    let h = QDT.default.parse(e?.trim() ?? "");
    if (h && typeof h === "object") r = {
      ...h,
      globs: Array.isArray(h.globs) ? h.globs : h.globs && typeof h.globs === "string" ? [h.globs] : void 0
    }
  } catch (h) {
    return J.error("Invalid YAML front matter in guidance file", {
      error: h
    }), {
      frontMatter: null,
      content: T.trim()
    }
  }
  return {
    frontMatter: r,
    content: (t ?? "").trim()
  }
}

function lkR(T, R, a) {
  if (!T || !T.globs || T.globs.length === 0) return !0;
  a = I8(a);
  let e = R.map((t) => I8(t));
  for (let t of T.globs) {
    let r = t;
    if (t.startsWith("./") || t.startsWith("../")) r = xD(MR.dirname(a).path, t);
    else if (!t.startsWith("/") && !t.startsWith("**/")) r = `**/${t}`;
    let h = YDT.default(r, {
      dot: !0
    });
    for (let i of e)
      if (h(Kt(i))) return !0
  }
  return !1
}
async function AkR(T, R, a, e, t) {
  let r = [];
  a = _kR(a);
  let h = /@([a-zA-Z0-9._~/*?[\]{}\\,-]+)/g,
    i;
  while ((i = h.exec(a)) !== null) {
    let c = i[1];
    if (!c) continue;
    c = c.replace(/[.,;!?)]+$/, ""), c = c.replace(/\\(\*)/g, "$1");
    let s = pkR(c, R);
    if (s) {
      J.warn("Ignoring glob pattern:", s);
      continue
    }
    try {
      let A = await bkR(T, R, c, e, t);
      r.push(...A)
    } catch (A) {}
  }
  return r
}

function pkR(T, R) {
  let a = R.fsPath;
  if (T.startsWith("**/") || ["*", "**", "/*", "/**", "", "/"].includes(T) || T.includes("__dangerous_glob_canary__")) return `Ignoring glob pattern "${T}" in ${a}, because it may cause performance issues.`;
  return null
}

function _kR(T) {
  let R = T.replace(/```[\s\S]*?```/g, "");
  return R = R.replace(/`[^`]*`/g, ""), R = R.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, ""), R
}
async function bkR(T, R, a, e, t) {
  let r, h;
  if (a.startsWith("~/")) {
    if (e.homeDir === null) return [];
    let i = a.slice(2),
      {
        basePart: c,
        patternPart: s
      } = qq(i);
    r = c ? MR.joinPath(e.homeDir, c) : I8(e.homeDir), h = s
  } else if (a.startsWith("/")) {
    let i = a.slice(1),
      {
        basePart: c,
        patternPart: s
      } = qq(i);
    r = c ? MR.joinPath(zR.file("/"), c) : zR.file("/"), h = s
  } else {
    let i = MR.dirname(R),
      {
        basePart: c,
        patternPart: s
      } = qq(a);
    r = c ? MR.joinPath(i, c) : i, h = s
  }
  if (JDT(h)) try {
    let i = await T.findFiles({
      base: r,
      pattern: h
    }, {
      signal: t,
      maxResults: 1000
    });
    if (i.length >= 1000) J.warn("Truncating very large glob expansion result", `Limit (1000) exceeded for '${a}' in ${R.fsPath}.`);
    return i
  }
  catch (i) {
    return []
  }
  if (!h) return [];
  return [MR.joinPath(r, h)]
}

function JDT(T) {
  return T.includes("*") || T.includes("?") || T.includes("[") || T.includes("{")
}

function qq(T) {
  let R = T.split("/"),
    a = [],
    e = [],
    t = !1;
  for (let r of R)
    if (t || JDT(r)) t = !0, e.push(r);
    else a.push(r);
  if (!t) {
    if (a.length === 0) return {
      basePart: null,
      patternPart: ""
    };
    let r = a.pop();
    return {
      basePart: a.length === 0 ? null : a.join("/"),
      patternPart: r
    }
  }
  return {
    basePart: a.length === 0 ? null : a.join("/"),
    patternPart: e.join("/")
  }
}
async function ukR({
  filesystem: T
}, R, a, e = [], t) {
  let r = [],
    h = new Ls,
    i = new Ls,
    c = new xh,
    s = [];
  async function A(_, m = !1) {
    let b = I8(_.uri);
    if (h.has(b)) return null;
    if (i.has(b)) return null;
    i.add(b);
    try {
      let y = await T.readFile(b, {
          signal: t
        }),
        {
          frontMatter: u,
          content: P
        } = XDT(y),
        k = lkR(u, e, b),
        x = {
          ..._,
          type: m ? _.type : "mentioned",
          content: P,
          frontMatter: u,
          exclude: !k,
          "~debug": {
            mentionedBy: c.has(b) ? [c.get(b)] : void 0
          }
        };
      h.add(b), r.push(x);
      let f = await AkR(T, b, y, a, t);
      for (let v of f) {
        if (!c.has(v)) c.set(v, _.uri);
        let g = {
            uri: d0(v),
            type: "mentioned"
          },
          I = await A(g, !1);
        if (I) s.push({
          file: I,
          afterFile: _.uri
        })
      }
      return x
    } catch (y) {
      if (y instanceof Error && y.message.includes("EISDIR")) return J.debug("Guidance file is a directory, skipping", {
        uri: _.uri
      }), null;
      if (Er(y)) J.debug("Guidance file not found (expected)", {
        uri: _.uri
      });
      else J.error("Error resolving guidance file", {
        uri: _.uri,
        error: y
      });
      return null
    } finally {
      i.delete(b)
    }
  }
  for (let _ of R7T(R)) await A(_, !0);
  let l = [],
    o = new Set;

  function n(_) {
    if (o.has(_.uri)) return;
    l.push(_), o.add(_.uri);
    let m = s.filter((b) => b.afterFile === _.uri);
    for (let b of m) n(b.file)
  }
  let p = r.filter((_) => _.type !== "mentioned");
  for (let _ of p) n(_);
  return l
}

function PkR(T) {
  return {
    homeDir: T.userConfigDir ? d0(T.userConfigDir) : null
  }
}

function Q9T(T) {
  if (T.path === "/" || T.path === "") return !0;
  let R = T.fsPath;
  if (R === "/" || R === "/Users" || R === "/home" || /^[A-Z]:[\\/?]?$/.test(R)) return !0;
  if (["/proc", "/sys", "/dev"].includes(R)) return !0;
  return !1
}

function kkR({
  filesystem: T,
  configService: R
}, a) {
  return v3(eET(T), a ? a : AR.of(null), R.workspaceRoot).pipe(L9(([e, t, r]) => {
    let h = r ? [r] : t?.env?.initial?.trees?.map((s) => s.uri).filter((s) => s !== void 0).map((s) => I8(s)) ?? [],
      i = [];
    i.push(...h);
    for (let s of h) {
      let A = MR.dirname(s);
      while (A) {
        if (Q9T(A)) break;
        i.push(A);
        let l = MR.dirname(A);
        if (MR.equalURIs(l, A)) break;
        A = l
      }
    }
    if (R.userConfigDir) i.push(MR.joinPath(R.userConfigDir, "amp")), i.push(R.userConfigDir);
    let c = i.flatMap((s) => SP.map((A) => MR.joinPath(s, A)));
    return okR(e, c).pipe(JR((s) => {
      let A = [],
        l = new Set;
      for (let o of s) {
        let n = MR.dirname(o).toString(),
          p = MR.basename(o);
        if (l.has(n)) continue;
        let _ = SP.findIndex((y) => y === p);
        if (_ === -1) continue;
        let m = !1,
          b = MR.dirname(o);
        for (let y = 0; y < _; y++) {
          let u = SP[y];
          if (s.some((P) => {
              let k = MR.equalURIs(MR.dirname(P), b),
                x = MR.basename(P) === u;
              return k && x
            })) {
            m = !0;
            break
          }
        }
        if (m) continue;
        if (l.add(n), h.some((y) => MR.hasPrefix(o, y))) {
          A.push({
            uri: d0(o),
            type: "project"
          });
          continue
        }
        if (R.userConfigDir && MR.hasPrefix(o, R.userConfigDir)) {
          A.push({
            uri: d0(o),
            type: "user"
          });
          continue
        }
        A.push({
          uri: d0(o),
          type: "parent"
        })
      }
      return A
    }))
  }))
}

function xkR({
  filesystem: T,
  configService: R
}, a) {
  function e(t) {
    let r = new Set,
      h = [];
    for (let i of t) {
      let c = MR.dirname(i).toString();
      if (!r.has(c)) r.add(c), h.push(c)
    }
    return h.join(",")
  }
  return v3(a.pipe(JR((t) => ({
    thread: t,
    readFiles: T7T(t)
  })), E9((t, r) => e(t.readFiles) === e(r.readFiles))), eET(T), R.workspaceRoot).pipe(I2(async ([{
    readFiles: t
  }, r, h], i) => {
    let c = h ? [h] : [],
      s = new Ls;
    for (let A of t) {
      let l = MR.dirname(A);
      while (!s.has(l) && c.some((o) => MR.hasPrefix(l, o) && !MR.equalURIs(o, l))) s.add(l), l = MR.dirname(l)
    }
    return (await Promise.all(Array.from(s.keys()).map(async (A) => {
      for (let l of SP) try {
        let o = MR.joinPath(A, l);
        return await r.stat(o, {
          signal: i
        }), {
          uri: d0(o),
          type: "subtree"
        }
      }
      catch (o) {
        if (typeof o === "object" && o !== null && "code" in o && o.code === "ELOOP") J.warn("Infinite symlink loop detected in guidance file", {
          file: MR.joinPath(A, l).toString()
        })
      }
      return null
    }))).filter((A) => A !== null)
  }))
}

function T7T(T, R = [y8, mET]) {
  let a = [];
  for (let e of T.messages)
    if (e.role === "assistant") {
      for (let t of e.content)
        if (t.type === "tool_use" && R.includes(t.name)) {
          if (t.name === "Read" || t.name === "read_file") {
            let r = cN(T, t.id);
            if (r && r.run.status === "done") {
              let h = r.run.result;
              if (typeof h === "object" && h.absolutePath) a.push(zR.file(h.absolutePath))
            }
          } else if (t.input && typeof t.input === "object" && "path" in t.input && typeof t.input.path === "string") a.push(zR.file(t.input.path))
        }
    }
  for (let e of T.messages)
    if (e.role === "user" && e.fileMentions)
      for (let t of e.fileMentions.files) a.push(t.uri);
  return a
}

function fkR(T) {
  let R = new Set;
  for (let a of T.messages)
    if (a.role === "assistant") {
      for (let e of a.content)
        if (e.type === "tool_use") {
          let t = e.name === y8 || e.name === mET,
            r = e.name === Wt;
          if (t || r) {
            let h = cN(T, e.id);
            if (h && h.run.status === "done") {
              let i = h.run.result;
              if (typeof i === "object" && i !== null && "discoveredGuidanceFiles" in i && Array.isArray(i.discoveredGuidanceFiles) && i.discoveredGuidanceFiles.length > 0)
                for (let c of i.discoveredGuidanceFiles) R.add(c.uri)
            }
          }
        }
    }
  else if (a.role === "user" && a.discoveredGuidanceFiles)
    for (let e of a.discoveredGuidanceFiles) R.add(e.uri);
  return R
}
async function _O(T, R, a) {
  let [e, t] = await Promise.all([m0(kkR(T, AR.of({
    env: R.env
  })), a), m0(xkR(T, AR.of(R)), a)]);
  return a?.throwIfAborted(), (await ukR({
    filesystem: aET(T.filesystem) ? await m0(T.filesystem) : T.filesystem
  }, R7T([...e, ...t]), PkR(T.configService), T7T(R), a)).filter((r) => !r.exclude)
}

function R7T(T) {
  return T.toSorted((R, a) => {
    let e = EG[R.type] - EG[a.type];
    if (e !== 0) return e;
    return R.uri.localeCompare(a.uri)
  })
}

function ZA(T, R = 1) {
  let a = zR.parse(T),
    e = MR.basename(a) || "AGENTS.md",
    t = [],
    r = MR.dirname(a);
  for (let h = 0; h < R; h++) {
    let i = MR.basename(r);
    if (!i || i === r.path) break;
    t.unshift(i);
    let c = MR.dirname(r);
    if (MR.equalURIs(c, r)) break;
    r = c
  }
  if (t.length === 0) return e;
  return [...t, e].join("/")
}

function a7T(T) {
  let R = T.toLowerCase();
  if (R.includes("/.config/") || R.includes("\\.config\\")) return "user's private global instructions for all projects";
  if (R.includes(".local.md") || R.includes("agents.local.md")) return "user's private project instructions, not checked in";
  return "project instructions"
}

function Z9T(T, R = "default") {
  let a = T.filter((e) => e.content);
  if (a.length === 0) return "";
  if (R === "deep") return IkR(a);
  return a.map((e) => {
    let t = ZA(e.uri),
      r = a7T(e.uri);
    return `${`Contents of ${t} (${r}):`}

<instructions>
${e.content}
</instructions>`
  }).join(`

`)
}

function IkR(T) {
  return T.map((R) => {
    let a = zR.parse(R.uri);
    return `# AGENTS.md instructions for ${MR.dirname(a).fsPath}

<INSTRUCTIONS>
${R.content}
</INSTRUCTIONS>`
  }).join(`

`)
}
async function fm(T, R, a, e, t, r) {
  let h = e ? fkR(e) : new Set;
  if (t)
    for (let s of t) h.add(s);
  let i = [],
    c = MR.dirname(R);
  while (a && MR.hasPrefix(c, a) && !MR.equalURIs(a, c)) {
    r?.throwIfAborted();
    for (let A of SP) {
      let l = MR.joinPath(c, A),
        o = d0(l);
      if (h.has(o) || t?.has(o)) break;
      try {
        await T.stat(l, {
          signal: r
        });
        let n = await T.readFile(l, {
            signal: r
          }),
          p = n.split(`
`).length;
        if (!t?.has(o)) {
          t?.add(o), h.add(o);
          let _ = {
            uri: o,
            lineCount: p,
            content: n
          };
          i.push(_)
        }
        break
      } catch {}
    }
    let s = MR.dirname(c);
    if (MR.equalURIs(s, c)) break;
    c = s
  }
  return i
}

function DkR(T) {
  return [t7T, i7T, c7T, h7T, r7T]
}

function wkR(T) {
  if (!T) throw new _b("Invalid skill name", "Skill name is required");
  if (T.length > Db) throw new _b("Invalid skill name", `Frontmatter name "${T}" must be ${Db} characters or less`);
  if (!Nj.test(T)) throw new _b("Invalid skill name", `Frontmatter name "${T}" is invalid. Skill name must be lowercase alphanumeric with hyphens, no trailing hyphen (e.g., "my-skill")`)
}

function n7T(T) {
  let R = T.replace(/^\uFEFF/, "").match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (!R || !R[1]) throw new _b("Missing YAML frontmatter", `Add frontmatter at the top of SKILL.md:
---
name: my-skill
description: Your skill description
---`);
  let a = l7T.default.parse(R[1]);
  if (!a.name || !a.description) throw new _b("Missing required fields in frontmatter", 'Add both "name" and "description" fields to the frontmatter');
  return wkR(a.name), {
    frontmatter: a,
    body: R[2] ?? ""
  }
}

function A7T(T, R) {
  let a = [];
  if (T.name) {
    if (T.name.length > Db) a.push({
      field: "name",
      message: `Name exceeds ${Db} characters`
    });
    if (!Nj.test(T.name)) a.push({
      field: "name",
      message: "Name must be lowercase a-z, 0-9, hyphens only, must not start/end with hyphen or contain consecutive hyphens"
    });
    if (R && T.name !== R) a.push({
      field: "name",
      message: `Name "${T.name}" does not match parent directory name "${R}"`
    })
  }
  if (T.description && T.description.length > flT) a.push({
    field: "description",
    message: `Description exceeds ${flT} characters`
  });
  if (T.compatibility && T.compatibility.length > IlT) a.push({
    field: "compatibility",
    message: `Compatibility exceeds ${IlT} characters`
  });
  let e = Object.keys(T);
  for (let t of e)
    if (!x7T.has(t)) a.push({
      field: t,
      message: `Unknown frontmatter field "${t}"`
    });
  return a
}

function UkR(T) {
  let R = T instanceof Error ? T.message : String(T),
    a = R.match(/at line (\d+)/),
    e = a ? ` on line ${a[1]}` : "";
  if (R.includes("Nested mappings are not allowed in compact mappings")) return {
    message: `Invalid YAML${e}: value contains unquoted colon`,
    hint: 'Wrap the value in quotes: description: "NOT for: code comments"'
  };
  if (R.includes("Implicit map keys need to be followed by map values")) return {
    message: `Invalid YAML${e}: unexpected line break in value`,
    hint: "Use quotes for multi-line values or use YAML block syntax (| or >)"
  };
  if (R.includes("Map keys must be unique")) return {
    message: `Invalid YAML${e}: duplicate field`,
    hint: "Each field (name, description, etc.) can only appear once in frontmatter"
  };
  if (R.includes('Missing closing "quote') || R.includes("Missing closing 'quote")) return {
    message: `Invalid YAML${e}: unclosed quote`,
    hint: "Make sure all quoted strings have matching opening and closing quotes"
  };
  return {
    message: `Invalid YAML in frontmatter${e}`,
    hint: "Check for proper indentation and quote values containing special characters (: @ # etc.)"
  }
}

function p7T(T, R) {
  let a = R instanceof Error ? R.message : String(R),
    e = d0(T);
  if (R instanceof _b) return {
    path: e,
    error: R.message,
    hint: R.hint
  };
  if (a.includes("YAMLParseError") || a.includes("YAML") || a.includes("Nested mappings are not allowed") || a.includes("Implicit map keys") || a.includes("at line") || R?.constructor?.name === "YAMLParseError") {
    let {
      message: t,
      hint: r
    } = UkR(R);
    return {
      path: e,
      error: t,
      hint: r
    }
  }
  return {
    path: e,
    error: a
  }
}

function HkR(T) {
  let R = JSON.parse(T);
  if (R["amp.mcpServers"] && typeof R["amp.mcpServers"] === "object") return R["amp.mcpServers"];
  let a = {};
  for (let [e, t] of Object.entries(R))
    if (t && typeof t === "object") {
      let r = t;
      if ("command" in r || "url" in r) a[e] = t
    }
  return a
}
async function _7T(T, R, a) {
  try {
    let e = MR.joinPath(R, FkR),
      t = await T.readFile(e, {
        signal: a
      }),
      r = HkR(t);
    if (Object.keys(r).length > 0) return J.debug("Loaded MCP servers from skill", {
      skillDir: d0(R),
      serverCount: Object.keys(r).length,
      serverNames: Object.keys(r)
    }), r
  } catch {}
  return
}
async function b7T(T, R) {
  if (R.scheme === "file") try {
    let a = await T.realpath(R);
    return d0(a)
  }
  catch {}
  return d0(R)
}
async function m7T(T, R, a) {
  if (R.isDirectory) return !0;
  try {
    return (await T.stat(R.uri, {
      signal: a
    })).isDirectory
  } catch {
    return !1
  }
}
async function u7T(T, R, a) {
  let e = [],
    t = 5,
    r = new Set(["skill.md", "mcp.json"]),
    h = new Set(["node_modules", ".git", "__pycache__"]);
  async function i(c, s) {
    if (s > 5) return;
    try {
      let A = await T.readdir(c, {
        signal: a
      });
      for (let l of A) {
        let o = MR.basename(l.uri);
        if (await m7T(T, l, a)) {
          if (!h.has(o)) await i(l.uri, s + 1)
        } else if (!r.has(o.toLowerCase())) e.push(l.uri.fsPath)
      }
    } catch {}
  }
  return await i(R, 0), e.sort()
}
async function y7T(T, R, a) {
  let e = [],
    t = 5;
  async function r(h, i) {
    if (i > 5) return;
    try {
      let c = await T.readdir(h, {
        signal: a
      });
      for (let s of c) {
        let A = MR.basename(s.uri),
          l = await m7T(T, s, a);
        if (l && (A === "node_modules" || A === ".git")) continue;
        if (l) await r(s.uri, i + 1);
        else if (f7T.test(A)) e.push(s.uri)
      }
    } catch (c) {
      J.debug("Failed to scan skill directory", {
        path: h.toString(),
        error: c
      })
    }
  }
  return await r(R, 0), e
}
async function $lT(T, R, a, e = "skill") {
  let t = {
    skills: [],
    errors: []
  };
  try {
    await T.stat(R, {
      signal: a
    });
    let r = await y7T(T, R, a);
    for (let h of r) {
      let i = MR.dirname(h),
        c = await b7T(T, i);
      try {
        let s = await T.readFile(h, {
            signal: a
          }),
          {
            frontmatter: A,
            body: l
          } = n7T(s),
          o = MR.basename(i),
          n = A7T(A, o);
        if (n.length > 0)
          for (let m of n) J.warn(`Skill "${A.name}" frontmatter warning`, {
            field: m.field,
            message: m.message,
            path: d0(h)
          });
        if (A.isolatedContext) continue;
        let p = await _7T(T, i, a),
          _ = await u7T(T, i, a);
        t.skills.push({
          path: c,
          skill: {
            name: A.name,
            description: A.description,
            frontmatter: A,
            content: l,
            baseDir: d0(i),
            mcpServers: p,
            builtinTools: A["builtin-tools"],
            files: _.length > 0 ? _ : void 0
          }
        })
      } catch (s) {
        J.warn(`Failed to load ${e}`, {
          path: d0(h),
          error: s
        }), t.errors.push(p7T(h, s))
      }
    }
  } catch (r) {
    if (!Er(r)) J.debug(`Failed to process ${e} directory`, {
      path: R.toString(),
      error: r
    })
  }
  return t
}

function vlT(T, R, a, e, t, r) {
  for (let {
      path: h,
      skill: i
    }
    of T.skills) {
    if (R.has(h)) continue;
    if (a.get(i.name)) {
      J.debug("Skipping duplicate skill", {
        name: i.name,
        path: h
      });
      continue
    }
    R.add(h), a.set(i.name, h), e.push(i)
  }
  t.push(...T.errors)
}
async function Eu(T, R, a, e, t, r, h, i, c = "skill") {
  try {
    await T.stat(R, {
      signal: i
    });
    let s = await y7T(T, R, i);
    for (let A of s) {
      let l = MR.dirname(A),
        o = await b7T(T, l);
      if (!a.has(o)) {
        a.add(o);
        try {
          let n = await T.readFile(A, {
              signal: i
            }),
            {
              frontmatter: p,
              body: _
            } = n7T(n),
            m = MR.basename(l),
            b = A7T(p, m);
          if (b.length > 0)
            for (let P of b) J.warn(`Skill "${p.name}" frontmatter warning`, {
              field: P.field,
              message: P.message,
              path: d0(A)
            });
          if (p.isolatedContext) continue;
          if (e.get(p.name)) {
            J.debug("Skipping duplicate skill", {
              name: p.name,
              path: d0(A)
            });
            continue
          }
          e.set(p.name, o);
          let y = await _7T(T, l, i),
            u = await u7T(T, l, i);
          t.push({
            name: p.name,
            description: p.description,
            frontmatter: p,
            content: _,
            baseDir: d0(l),
            mcpServers: y,
            builtinTools: p["builtin-tools"],
            files: u.length > 0 ? u : void 0
          })
        } catch (n) {
          J.warn(`Failed to load ${c}`, {
            path: d0(A),
            error: n
          }), r.push(p7T(A, n))
        }
      }
    }
  } catch (s) {
    if (!Er(s)) J.debug(`Failed to process ${c} directory`, {
      path: R.toString(),
      error: s
    })
  }
}

function WkR(T) {
  return Y9T(T)
}
async function P7T(T, R, a, e) {
  let t = [],
    r = [],
    h = [],
    i = new Set,
    c = new Map,
    s = typeof process < "u" ? NkR.homedir() : null,
    A = new Set;
  for (let b of R) {
    let y = Ht(b);
    A.add(d0(y));
    while (y) {
      if (Q9T(y)) break;
      A.add(d0(y));
      let u = MR.dirname(y);
      if (MR.equalURIs(u, y)) break;
      y = u
    }
  }
  if (J.info("Scanning for skills", {
      searchRoots: [...A],
      workspaceRoots: R
    }), s) {
    let b = MR.joinPath(zR.file(s), ".config", "agents", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global agent skill")
  }
  if (s) {
    let b = MR.joinPath(zR.file(s), ".config", "amp", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global amp skill")
  }
  for (let b of A) {
    let y = Ht(b),
      u = MR.joinPath(y, ".agents", "skills");
    await Eu(T, u, i, c, t, r, h, a, "local .agents skill")
  }
  if (!e?.["skills.disableClaudeCodeSkills"])
    for (let b of A) {
      let y = Ht(b),
        u = MR.joinPath(y, ".claude", "skills");
      await Eu(T, u, i, c, t, r, h, a, "local .claude skill")
    }
  if (!e?.["skills.disableClaudeCodeSkills"] && s) {
    let b = MR.joinPath(zR.file(s), ".claude", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global .claude skill")
  }
  if (!e?.["skills.disableClaudeCodeSkills"] && s) {
    let b = MR.joinPath(zR.file(s), ".claude", "plugins", "cache");
    await Eu(T, b, i, c, t, r, h, a, "plugin skill")
  }
  let l = typeof process < "u" && process.env.AMP_TOOLBOX ? process.env.AMP_TOOLBOX : void 0,
    o = s ? `${s}/.config/amp/tools` : null,
    n = l ? Y9T(l) : o ? [o] : [],
    p = await Promise.all(n.map((b) => $lT(T, zR.file(b), a, "toolbox skill")));
  for (let b of p) vlT(b, i, c, t, r, h);
  let _ = WkR(e?.["skills.path"]),
    m = await Promise.all(_.map((b) => $lT(T, zR.file(b), a, "custom skills.path skill")));
  for (let b of m) vlT(b, i, c, t, r, h);
  for (let b of DkR(e)) {
    let y = c.get(b.name);
    if (y) h.push({
      path: b.baseDir,
      error: `Skill "${b.name}" is masked by ${Mr(y)}`
    });
    else c.set(b.name, b.baseDir), t.push(b)
  }
  return J.info("Finished loading skills", {
    totalSkills: t.length,
    skillNames: t.map((b) => b.name),
    skillBaseDirs: t.map((b) => b.baseDir),
    errorCount: r.length,
    warningCount: h.length
  }), {
    skills: t,
    errors: r,
    warnings: h
  }
}

function k7T(T) {
  if (T.length === 0) return null;
  let R = T.filter((a) => !a.frontmatter["disable-model-invocation"]).map((a) => {
    let e = a.frontmatter["argument-hint"] ? ` ${a.frontmatter["argument-hint"]}` : "";
    return `- **${a.name}**${e}: ${a.description}`
  }).join(`
`);
  if (!R) return null;
  return R
}

function qkR(T) {
  let R = T.filter((e) => !e.frontmatter["disable-model-invocation"]);
  if (R.length === 0) return null;
  let a = R.map((e) => {
    return ["  <skill>", `    <name>${e.name}</name>`, `    <description>${e.description}</description>`, `    <location>${e.baseDir}/SKILL.md</location>`, "  </skill>"].join(`
`)
  }).join(`
`);
  return ["## Skills", "In your workspace you have skills the user created. A **skill** is a guide for proven techniques, patterns, or tools. If a skill exists for a task, you must do it. The following skills provide specialized instructions for specific tasks.", `Use the ${oc} tool to load a skill when the task matches its description.`, "", 'Loaded skills appear as `<loaded_skill name="...">` in the conversation.', "", "<available_skills>", a, "</available_skills>"].join(`
`)
}

function zkR(T) {
  let R = T.filter((a) => !a.frontmatter["disable-model-invocation"]);
  if (R.length === 0) return null;
  return ["## Skills", "In your workspace you have skills the user created. A **skill** is a guide for proven techniques, patterns, or tools. If a skill exists for a task, you must do it. The following skills provide specialized instructions for specific tasks..", "### Available skills", R.map((a) => `- ${a.name}: ${a.description} (file: ${a.baseDir}/SKILL.md)`).join(`
`), "### How to use skills", `- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths. Use the ${oc} tool to load them.`, "- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.", "- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.", "- How to use a skill (progressive disclosure):", `  1) After deciding to use a skill, call the ${oc} tool to load it. Read only enough to follow the workflow.`, "  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first.", "  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.", "  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.", "  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.", "- Context hygiene:", "  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.", "  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.", "- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue."].join(`
`)
}

function GkR(T, R, a = () => !0) {
  let e = R();
  for (let [t, r] of T) {
    if (!a(r, t)) continue;
    let h = e.get(t);
    if (!h || r.timestamp >= h.timestamp) e.set(t, r)
  }
  return e
}

function I7T(T, R = () => !0) {
  function* a() {
    for (let e of T.values()) yield* e
  }
  return GkR(a(), () => new xh, R)
}
async function g7T(T, R, a) {
  if (R <= 0) throw Error("chunkSize must be greater than 0");
  if (T.length === 0) return;
  for (let e = 0; e < T.length; e += R) await Promise.all(T.slice(e, e + R).map(a))
}
async function $7T(T, R = () => !0) {
  let a = await T.getAllRecords(),
    e = I7T(a, (r, h) => !r.reverted && R(h)),
    t = [];
  for (let [r, h] of e.entries()) {
    let {
      added: i,
      removed: c,
      modified: s,
      created: A,
      reverted: l
    } = KkR(h);
    if (!i && !c && !s) continue;
    t.push({
      created: A,
      uri: d0(r),
      reverted: l,
      diff: void 0,
      after: void 0,
      diffStat: {
        added: i,
        removed: c,
        modified: s
      }
    })
  }
  return t
}

function KkR(T) {
  let R = T.diff.split(`
`),
    a = 0,
    e = 0,
    t = 0;
  for (let i of R) {
    if (i.startsWith("+") && !i.startsWith("+++")) a++;
    if (i.startsWith("-") && !i.startsWith("---")) e++;
    if (i.startsWith("@")) t++
  }
  let r = T.reverted,
    h = T.isNewFile === !0;
  if (h) a = T.after.split(`
`).length, e = 0, t = 0;
  return {
    added: a,
    removed: e,
    modified: t,
    created: h,
    reverted: r
  }
}

function QkR(T) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(T)
}
class Im {
  fs;
  constructor(T) {
    this.fs = T
  }
  async store(T, R, a) {
    let e = this.backupDirForThread(T);
    if (!e) return;
    await this.fs.mkdirp(e);
    let t = MR.joinPath(e, this.filename(R));
    await this.fs.writeFile(t, JSON.stringify(a, null, 2)), await this.invalidateBackfillMarker(e)
  }
  async invalidateBackfillMarker(T) {
    let R = MR.joinPath(T, VkR);
    try {
      await this.fs.delete(R)
    } catch {}
  }
  async load(T, R) {
    let a = this.backupDirForThread(T);
    if (!a) return null;
    try {
      let e = await this.fs.readFile(MR.joinPath(a, this.filename(R)));
      return JSON.parse(e)
    } catch (e) {
      return J.error(`Error loading backup file ${this.filename(R)}:`, e), null
    }
  }
  async list(T) {
    let R = this.backupDirForThread(T);
    if (!R) return [];
    await this.fs.mkdirp(R);
    try {
      let a = await this.fs.readdir(R),
        e = [];
      for (let t of a) {
        let r = MR.relativePath(R, t.uri);
        if (!r) continue;
        let h = r.split(".");
        if (h.length === 2) {
          let i = h[0],
            c = h[1];
          if (i && QkR(c)) e.push({
            toolUseID: i,
            fileChangeID: c
          })
        }
      }
      return e
    } catch (a) {
      return J.error("Error listing backup files:", a), []
    }
  }
  async cleanup(T) {
    let R = this.backupDirForThread(T);
    if (!R) return;
    try {
      await this.fs.delete(R, {
        recursive: !0
      })
    } catch (a) {
      if (!Er(a)) J.error(`Error cleaning up backup files in ${R}:`, a)
    }
  }
  getRootURI() {
    let T = typeof process < "u" ? YkR.homedir() : null;
    if (!T) return null;
    return MR.joinPath(zR.file(T), ".amp", "file-changes")
  }
  filename(T) {
    return `${T.toolUseID}.${T.fileChangeID}`
  }
  backupDirForThread(T) {
    let R = this.getRootURI();
    if (!R) return null;
    return MR.joinPath(R, T)
  }
}

function rc(T, ...R) {
  throw Error(`[Immer] minified error nr: ${T}. Full error at: https://bit.ly/3cXEKWf`)
}

function uk(T) {
  return !!T && !!T[Cr]
}

function wb(T) {
  if (!T) return !1;
  return v7T(T) || Array.isArray(T) || !!T[UG] || !!T.constructor?.[UG] || zN(T) || FN(T)
}

function v7T(T) {
  if (!T || typeof T !== "object") return !1;
  let R = Nb(T);
  if (R === null) return !0;
  let a = Object.hasOwnProperty.call(R, "constructor") && R.constructor;
  if (a === Object) return !0;
  return typeof a == "function" && Function.toString.call(a) === E7T
}

function a7(T, R) {
  if (qN(T) === 0) Reflect.ownKeys(T).forEach((a) => {
    R(a, T[a], T)
  });
  else T.forEach((a, e) => R(e, a, T))
}

function qN(T) {
  let R = T[Cr];
  return R ? R.type_ : Array.isArray(T) ? 1 : zN(T) ? 2 : FN(T) ? 3 : 0
}

function LG(T, R) {
  return qN(T) === 2 ? T.has(R) : Object.prototype.hasOwnProperty.call(T, R)
}

function j7T(T, R, a) {
  let e = qN(T);
  if (e === 2) T.set(R, a);
  else if (e === 3) T.add(a);
  else T[R] = a
}

function ZkR(T, R) {
  if (T === R) return T !== 0 || 1 / T === 1 / R;
  else return T !== T && R !== R
}

function zN(T) {
  return T instanceof Map
}

function FN(T) {
  return T instanceof Set
}

function g_(T) {
  return T.copy_ || T.base_
}

function MG(T, R) {
  if (zN(T)) return new Map(T);
  if (FN(T)) return new Set(T);
  if (Array.isArray(T)) return Array.prototype.slice.call(T);
  let a = v7T(T);
  if (R === !0 || R === "class_only" && !a) {
    let e = Object.getOwnPropertyDescriptors(T);
    delete e[Cr];
    let t = Reflect.ownKeys(e);
    for (let r = 0; r < t.length; r++) {
      let h = t[r],
        i = e[h];
      if (i.writable === !1) i.writable = !0, i.configurable = !0;
      if (i.get || i.set) e[h] = {
        configurable: !0,
        writable: !0,
        enumerable: i.enumerable,
        value: T[h]
      }
    }
    return Object.create(Nb(T), e)
  } else {
    let e = Nb(T);
    if (e !== null && a) return {
      ...T
    };
    let t = Object.create(e);
    return Object.assign(t, T)
  }
}

function JA(T, R = !1) {
  if (GN(T) || uk(T) || !wb(T)) return T;
  if (qN(T) > 1) T.set = T.add = T.clear = T.delete = JkR;
  if (Object.freeze(T), R) Object.entries(T).forEach(([a, e]) => JA(e, !0));
  return T
}

function JkR() {
  rc(2)
}

function GN(T) {
  return Object.isFrozen(T)
}

function Bb(T) {
  let R = C7T[T];
  if (!R) rc(0, T);
  return R
}

function S7T() {
  return Uj
}

function TxR(T, R) {
  return {
    drafts_: [],
    parent_: T,
    immer_: R,
    canAutoFreeze_: !0,
    unfinalizedDrafts_: 0
  }
}

function jlT(T, R) {
  if (R) Bb("Patches"), T.patches_ = [], T.inversePatches_ = [], T.patchListener_ = R
}

function DG(T) {
  wG(T), T.drafts_.forEach(RxR), T.drafts_ = null
}

function wG(T) {
  if (T === Uj) Uj = T.parent_
}

function SlT(T) {
  return Uj = TxR(Uj, T)
}

function RxR(T) {
  let R = T[Cr];
  if (R.type_ === 0 || R.type_ === 1) R.revoke_();
  else R.revoked_ = !0
}

function OlT(T, R) {
  R.unfinalizedDrafts_ = R.drafts_.length;
  let a = R.drafts_[0];
  if (T !== void 0 && T !== a) {
    if (a[Cr].modified_) DG(R), rc(4);
    if (wb(T)) {
      if (T = e7(R, T), !R.parent_) t7(R, T)
    }
    if (R.patches_) Bb("Patches").generateReplacementPatches_(a[Cr].base_, T, R.patches_, R.inversePatches_)
  } else T = e7(R, a, []);
  if (DG(R), R.patches_) R.patchListener_(R.patches_, R.inversePatches_);
  return T !== R8T ? T : void 0
}

function e7(T, R, a) {
  if (GN(R)) return R;
  let e = R[Cr];
  if (!e) return a7(R, (t, r) => dlT(T, e, R, t, r, a)), R;
  if (e.scope_ !== T) return R;
  if (!e.modified_) return t7(T, e.base_, !0), e.base_;
  if (!e.finalized_) {
    e.finalized_ = !0, e.scope_.unfinalizedDrafts_--;
    let t = e.copy_,
      r = t,
      h = !1;
    if (e.type_ === 3) r = new Set(t), t.clear(), h = !0;
    if (a7(r, (i, c) => dlT(T, e, t, i, c, a, h)), t7(T, t, !1), a && T.patches_) Bb("Patches").generatePatches_(e, a, T.patches_, T.inversePatches_)
  }
  return e.copy_
}

function dlT(T, R, a, e, t, r, h) {
  if (uk(t)) {
    let i = r && R && R.type_ !== 3 && !LG(R.assigned_, e) ? r.concat(e) : void 0,
      c = e7(T, t, i);
    if (j7T(a, e, c), uk(c)) T.canAutoFreeze_ = !1;
    else return
  } else if (h) a.add(t);
  if (wb(t) && !GN(t)) {
    if (!T.immer_.autoFreeze_ && T.unfinalizedDrafts_ < 1) return;
    if (e7(T, t), (!R || !R.scope_.parent_) && typeof e !== "symbol" && Object.prototype.propertyIsEnumerable.call(a, e)) t7(T, t)
  }
}

function t7(T, R, a = !1) {
  if (!T.parent_ && T.immer_.autoFreeze_ && T.canAutoFreeze_) JA(R, a)
}

function axR(T, R) {
  let a = Array.isArray(T),
    e = {
      type_: a ? 1 : 0,
      scope_: R ? R.scope_ : S7T(),
      modified_: !1,
      finalized_: !1,
      assigned_: {},
      parent_: R,
      base_: T,
      draft_: null,
      copy_: null,
      revoke_: null,
      isManual_: !1
    },
    t = e,
    r = DL;
  if (a) t = [e], r = xy;
  let {
    revoke: h,
    proxy: i
  } = Proxy.revocable(t, r);
  return e.draft_ = i, e.revoke_ = h, i
}

function zq(T, R) {
  let a = T[Cr];
  return (a ? g_(a) : T)[R]
}

function exR(T, R, a) {
  let e = O7T(R, a);
  return e ? "value" in e ? e.value : e.get?.call(T.draft_) : void 0
}

function O7T(T, R) {
  if (!(R in T)) return;
  let a = Nb(T);
  while (a) {
    let e = Object.getOwnPropertyDescriptor(a, R);
    if (e) return e;
    a = Nb(a)
  }
  return
}

function BG(T) {
  if (!T.modified_) {
    if (T.modified_ = !0, T.parent_) BG(T.parent_)
  }
}

function Fq(T) {
  if (!T.copy_) T.copy_ = MG(T.base_, T.scope_.immer_.useStrictShallowCopy_)
}

function NG(T, R) {
  let a = zN(T) ? Bb("MapSet").proxyMap_(T, R) : FN(T) ? Bb("MapSet").proxySet_(T, R) : axR(T, R);
  return (R ? R.scope_ : S7T()).drafts_.push(a), a
}

function txR(T) {
  if (!uk(T)) rc(10, T);
  return d7T(T)
}

function d7T(T) {
  if (!wb(T) || GN(T)) return T;
  let R = T[Cr],
    a;
  if (R) {
    if (!R.modified_) return R.base_;
    R.finalized_ = !0, a = MG(T, R.scope_.immer_.useStrictShallowCopy_)
  } else a = MG(T, !0);
  if (a7(a, (e, t) => {
      j7T(a, e, d7T(t))
    }), R) R.finalized_ = !1;
  return a
}

function O8(T) {
  return T
}

function ElT(T) {
  return JSON.stringify(T) ?? ""
}

function nA(T) {
  if (T.length > Hj) return T.slice(0, Hj) + r7;
  return T
}

function a8T(T) {
  if (typeof T === "string") return nA(T);
  if (Array.isArray(T)) {
    let R = 0,
      a = [];
    for (let e of T) {
      let t = e;
      if (typeof e === "string") t = nA(e);
      else if (typeof e === "object" && e !== null) t = HG(e);
      let r = typeof t === "string" ? t : ElT(t),
        h = typeof e === "string" ? e : ElT(e);
      if (R + r.length > Hj) {
        if (R === 0 && h.length > r.length) a.push(t);
        else a.push(r7);
        break
      }
      R += r.length, a.push(t)
    }
    return a
  }
  if (typeof T === "object" && T !== null && !Array.isArray(T)) {
    let R = {
      ...T
    };
    for (let a of e8T)
      if (a in R && typeof R[a] === "string") R[a] = nA(R[a]);
    return R
  }
  return T
}

function lxR(T) {
  if (T === void 0) return;
  if (typeof T === "string") return nA(T);
  if (Array.isArray(T)) {
    if (T.length > 0 && typeof T[0] === "string") {
      let R = 0,
        a = [];
      for (let e of T)
        if (typeof e === "string") {
          let t = nA(e);
          if (R + t.length > Hj) {
            a.push(r7);
            break
          }
          R += t.length, a.push(t)
        }
      return a
    }
    if (T.length > 0 && typeof T[0] === "object") {
      let R = 0,
        a = [];
      for (let e of T)
        if (typeof e === "object" && e !== null) {
          let t = HG(e),
            r = JSON.stringify(t);
          if (R + r.length > Hj) {
            a.push({
              truncated: r7
            });
            break
          }
          R += r.length, a.push(t)
        }
      return a
    }
  }
  if (typeof T === "object" && T !== null) return HG(T);
  return T
}

function HG(T) {
  let R = JSON.parse(JSON.stringify(T));
  for (let a of e8T)
    if (a in R && typeof R[a] === "string") R[a] = nA(R[a]);
  return R
}

function L7T(T) {
  let R = Lt(T, (a) => {
    let e = 0,
      t = 0;
    for (let r of a.messages)
      if (r.role === "user") {
        if (r.fileMentions) {
          if (r.fileMentions = void 0, e++, !r.content.some((h) => h.type === "tool_result" || h.type === "image" || h.type === "text" && h.text.trim().length > 0)) r.content.push({
            type: "text",
            text: "(file mentions removed)"
          })
        }
        for (let h of r.content)
          if (h.type === "tool_result") {
            if (h.run.status === "done") {
              let i = h.run.result,
                c = a8T(h.run.result);
              if (i !== c) h.run.result = c, t++
            } else if (h.run.status === "cancelled" && h.run.progress) h.run.progress = O8(lxR(h.run.progress));
            else if (h.run.status === "error" && h.run.error) {
              let i = h.run.error.message,
                c = nA(h.run.error.message);
              if (i !== c) h.run.error.message = c, t++
            }
          }
      }
  });
  return J.debug("Truncated thread", {
    messages: R.messages
  }), R
}

function KN(T, R, a = {}) {
  let e = [];
  if (e.push(AxR(T, R)), T.title) e.push(`# ${T.title}`);
  let t = pm(T),
    r = t ? t.index : 0;
  for (let i = r; i < T.messages.length; i++) {
    let c = T.messages[i];
    if (c) e.push(pxR(c, a))
  }
  let h = O0T(T);
  if (h) e.push($xR(h));
  return e.join(`

`)
}

function AxR(T, R) {
  let a = ["---"];
  if (T.title) a.push(`title: ${T.title}`);
  if (R) a.push(`author: ${R}`);
  if (a.push(`threadId: ${T.id}`), a.push(`created: ${new Date(T.created).toISOString()}`), T.agentMode) a.push(`agentMode: ${T.agentMode}`);
  return a.push("---"), a.join(`
`)
}

function pxR(T, R) {
  switch (T.role) {
    case "user":
      return _xR(T, R);
    case "assistant":
      return bxR(T);
    case "info":
      return mxR(T, R)
  }
}

function _xR(T, R) {
  let a = ["## User"];
  if (T.interrupted) a.push("*(interrupted)*");
  let e = [];
  for (let t of T.content) switch (t.type) {
    case "text":
      e.push(r8T(t, !0));
      break;
    case "image":
      a.push(uxR(t));
      break;
    case "tool_result":
      a.push(fxR(t, R));
      break
  }
  if (T.fileMentions) a.push(yxR(T.fileMentions));
  return a.push(...e), a.join(`

`)
}

function bxR(T) {
  let R = ["## Assistant"];
  if (T.state.type === "streaming") R.push("*(streaming)*");
  else if (T.state.type === "cancelled") R.push("*(cancelled)*");
  else if (T.state.type === "error") R.push(`*(error: ${T.state.error.message})*`);
  for (let a of T.content) switch (a.type) {
    case "text":
      R.push(r8T(a, !0));
      break;
    case "thinking":
      break;
    case "redacted_thinking":
      break;
    case "tool_use":
      R.push(kxR(a));
      break
  }
  return R.join(`

`)
}

function mxR(T, R) {
  let a = ["## Info"];
  for (let e of T.content) switch (e.type) {
    case "text":
      a.push(r8T(e, !0));
      break;
    case "summary":
      a.push(gxR(e));
      break;
    case "manual_bash_invocation":
      if (!e.hidden) a.push(vxR(e, R));
      break
  }
  return a.join(`

`)
}

function r8T(T, R = !1) {
  if (!R) return T.text;
  return T.text.replace(/^(#{1,5}) /gm, "#$1 ")
}

function uxR(T) {
  if (T.source.type === "url") return `![Image](${T.source.url})`;
  return `![Image](data:${T.source.mediaType};base64,${T.source.data.slice(0,50)}...)`
}

function yxR(T) {
  let R = [];
  for (let a of T.files) R.push(PxR(a));
  return `<attached_files>
${R.join(`
`)}
</attached_files>`
}

function PxR(T) {
  if (T.isImage && T.imageInfo) return `\`\`\`${T.uri}
This is an image file (${T.imageInfo.mimeType}, ${Math.round(T.imageInfo.size/1024)} KB)
\`\`\``;
  let R = T.content.split(`
`),
    a = R[R.length - 1] === "" ? R.slice(0, -1) : R;
  if (a.length <= Gq) {
    let r = a.map((h, i) => `${i+1}: ${h}`).join(`
`);
    return `\`\`\`${T.uri}
${r}
\`\`\``
  }
  let e = a.slice(0, Gq).map((r, h) => `${h+1}: ${r}`).join(`
`),
    t = a.length - Gq;
  return `\`\`\`${T.uri}
${e}
... (${t} more lines)
\`\`\``
}

function kxR(T) {
  let R = [`**Tool Use:** \`${T.name}\``],
    a = xxR(T.name, T.input),
    e = JSON.stringify(a, null, 2);
  return R.push("```json\n" + e + "\n```"), R.join(`

`)
}

function xxR(T, R) {
  if (T !== "edit_file" || typeof R !== "object" || R === null) return R;
  let a = R,
    e = {};
  for (let [t, r] of Object.entries(a))
    if (t === "old_str") e[t] = "[... old_str omitted in markdown version ...]";
    else if (t === "new_str") e[t] = "[... new_str omitted in markdown version ...]";
  else e[t] = r;
  return e
}

function fxR(T, R) {
  let a = [];
  if (T.run.status === "done") {
    a.push(`**Tool Result:** \`${T.toolUseID}\``);
    let e = IxR(T.run.result, R),
      t = typeof e === "string" ? e : JSON.stringify(e, null, 2);
    a.push("```\n" + t + "\n```")
  } else if (T.run.status === "error") {
    a.push(`**Tool Error:** \`${T.toolUseID}\``);
    let e = JSON.stringify(T.run.error),
      t = typeof T.run.error === "string" ? T.run.error : e ?? "Unknown error",
      r = R.truncateToolResults ? nA(t) : t;
    a.push(`**Error:** ${r}`)
  } else if (T.run.status === "cancelled") a.push(`**Tool Cancelled:** \`${T.toolUseID}\``);
  else if (T.run.status === "in-progress") a.push(`**Tool In Progress:** \`${T.toolUseID}\``);
  else a.push(`**Tool:** \`${T.toolUseID}\` (${T.run.status})`);
  return a.join(`

`)
}

function IxR(T, R) {
  let a = T;
  if (Array.isArray(T)) a = T.filter((r) => {
    if (r && typeof r === "object" && "type" in r && r.type === "image") return !1;
    return !0
  });
  if (R.truncateToolResults) a = a8T(a);
  let e = JSON.stringify(a) ?? "undefined",
    t = Buffer.byteLength(e, "utf8");
  if (t > 102400) {
    let r = Math.round(100),
      h = Math.round(t / 1024);
    if (Array.isArray(a)) return [`[Tool result truncated: ${h}KB exceeds limit of ${r}KB. Please refine the query.]`];
    return `[Tool result truncated: ${h}KB exceeds limit of ${r}KB. Please refine the query.]`
  }
  return a
}

function gxR(T) {
  if (T.summary.type === "message") return `**Summary:**

${T.summary.summary}`;
  return `**Summary Thread:** ${T.summary.thread}`
}

function $xR(T) {
  let R = ["## Todos"];
  if (typeof T === "string") R.push(T);
  else
    for (let a of T) {
      let e = a.status === "completed" ? "[x]" : a.status === "in-progress" ? "[~]" : "[ ]",
        t = a.status === "in-progress" ? " (in progress)" : "";
      R.push(`- ${e} ${a.content}${t}`)
    }
  return R.join(`
`)
}

function vxR(T, R) {
  let a = ["**Manual Bash Invocation**"];
  if (a.push("```bash\n" + T.args.cmd + "\n```"), T.toolRun.status === "done") {
    let e = R.truncateToolResults ? a8T(T.toolRun.result) : T.toolRun.result,
      t = typeof e === "string" ? e : JSON.stringify(e, null, 2);
    a.push("```\n" + t + "\n```")
  }
  return a.join(`

`)
}

function $0(T, R, a, e, t) {
  if (e === "m") throw TypeError("Private method is not writable");
  if (e === "a" && !t) throw TypeError("Private accessor was defined without a setter");
  if (typeof R === "function" ? T !== R || !t : !R.has(T)) throw TypeError("Cannot write private member to an object whose class did not declare it");
  return e === "a" ? t.call(T, a) : t ? t.value = a : R.set(T, a), a
}

function mR(T, R, a, e) {
  if (a === "a" && !e) throw TypeError("Private accessor was defined without a getter");
  if (typeof R === "function" ? T !== R || !e : !R.has(T)) throw TypeError("Cannot read private member from an object whose class did not declare it");
  return a === "m" ? e : a === "a" ? e.call(T) : e ? e.value : R.get(T)
}

function Wj(T) {
  return typeof T === "object" && T !== null && (("name" in T) && T.name === "AbortError" || ("message" in T) && String(T.message).includes("FetchRequestCanceledException"))
}

function Kq(T) {
  if (typeof T !== "object") return {};
  return T ?? {}
}

function jxR(T) {
  if (!T) return !0;
  for (let R in T) return !1;
  return !0
}

function SxR(T, R) {
  return Object.prototype.hasOwnProperty.call(T, R)
}

function CxR() {
  if (typeof Deno < "u" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime < "u") return "edge";
  if (Object.prototype.toString.call(typeof globalThis.process < "u" ? globalThis.process : 0) === "[object process]") return "node";
  return "unknown"
}

function LxR() {
  if (typeof navigator > "u" || !navigator) return null;
  let T = [{
    key: "edge",
    pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "ie",
    pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "ie",
    pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "chrome",
    pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "firefox",
    pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "safari",
    pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/
  }];
  for (let {
      key: R,
      pattern: a
    }
    of T) {
    let e = a.exec(navigator.userAgent);
    if (e) {
      let t = e[1] || 0,
        r = e[2] || 0,
        h = e[3] || 0;
      return {
        browser: R,
        version: `${t}.${r}.${h}`
      }
    }
  }
  return null
}

function BxR() {
  if (typeof fetch < "u") return fetch;
  throw Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`")
}

function B7T(...T) {
  let R = globalThis.ReadableStream;
  if (typeof R > "u") throw Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  return new R(...T)
}

function N7T(T) {
  let R = Symbol.asyncIterator in T ? T[Symbol.asyncIterator]() : T[Symbol.iterator]();
  return B7T({
    start() {},
    async pull(a) {
      let {
        done: e,
        value: t
      } = await R.next();
      if (e) a.close();
      else a.enqueue(t)
    },
    async cancel() {
      await R.return?.()
    }
  })
}

function i8T(T) {
  if (T[Symbol.asyncIterator]) return T;
  let R = T.getReader();
  return {
    async next() {
      try {
        let a = await R.read();
        if (a?.done) R.releaseLock();
        return a
      } catch (a) {
        throw R.releaseLock(), a
      }
    },
    async return () {
      let a = R.cancel();
      return R.releaseLock(), await a, {
        done: !0,
        value: void 0
      }
    },
    [Symbol.asyncIterator]() {
      return this
    }
  }
}
async function NxR(T) {
  if (T === null || typeof T !== "object") return;
  if (T[Symbol.asyncIterator]) {
    await T[Symbol.asyncIterator]().return?.();
    return
  }
  let R = T.getReader(),
    a = R.cancel();
  R.releaseLock(), await a
}

function HxR(T) {
  let R = 0;
  for (let t of T) R += t.length;
  let a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a
}

function c8T(T) {
  let R;
  return (BlT ?? (R = new globalThis.TextEncoder, BlT = R.encode.bind(R)))(T)
}

function wlT(T) {
  let R;
  return (NlT ?? (R = new globalThis.TextDecoder, NlT = R.decode.bind(R)))(T)
}
class Pk {
  constructor() {
    ah.set(this, void 0), eh.set(this, void 0), $0(this, ah, new Uint8Array, "f"), $0(this, eh, null, "f")
  }
  decode(T) {
    if (T == null) return [];
    let R = T instanceof ArrayBuffer ? new Uint8Array(T) : typeof T === "string" ? c8T(T) : T;
    $0(this, ah, HxR([mR(this, ah, "f"), R]), "f");
    let a = [],
      e;
    while ((e = WxR(mR(this, ah, "f"), mR(this, eh, "f"))) != null) {
      if (e.carriage && mR(this, eh, "f") == null) {
        $0(this, eh, e.index, "f");
        continue
      }
      if (mR(this, eh, "f") != null && (e.index !== mR(this, eh, "f") + 1 || e.carriage)) {
        a.push(wlT(mR(this, ah, "f").subarray(0, mR(this, eh, "f") - 1))), $0(this, ah, mR(this, ah, "f").subarray(mR(this, eh, "f")), "f"), $0(this, eh, null, "f");
        continue
      }
      let t = mR(this, eh, "f") !== null ? e.preceding - 1 : e.preceding,
        r = wlT(mR(this, ah, "f").subarray(0, t));
      a.push(r), $0(this, ah, mR(this, ah, "f").subarray(e.index), "f"), $0(this, eh, null, "f")
    }
    return a
  }
  flush() {
    if (!mR(this, ah, "f").length) return [];
    return this.decode(`
`)
  }
}

function WxR(T, R) {
  for (let a = R ?? 0; a < T.length; a++) {
    if (T[a] === 10) return {
      preceding: a,
      index: a + 1,
      carriage: !1
    };
    if (T[a] === 13) return {
      preceding: a,
      index: a + 1,
      carriage: !0
    }
  }
  return null
}

function qxR(T) {
  for (let R = 0; R < T.length - 1; R++) {
    if (T[R] === 10 && T[R + 1] === 10) return R + 2;
    if (T[R] === 13 && T[R + 1] === 13) return R + 2;
    if (T[R] === 13 && T[R + 1] === 10 && R + 3 < T.length && T[R + 2] === 13 && T[R + 3] === 10) return R + 4
  }
  return -1
}

function Qg() {}

function YE(T, R, a) {
  if (!R || qj[T] > qj[a]) return Qg;
  else return R[T].bind(R)
}

function It(T) {
  let R = T.logger,
    a = T.logLevel ?? "off";
  if (!R) return H7T;
  let e = JG.get(R);
  if (e && e[0] === a) return e[1];
  let t = {
    error: YE("error", R, a),
    warn: YE("warn", R, a),
    info: YE("info", R, a),
    debug: YE("debug", R, a)
  };
  return JG.set(R, [a, t]), t
}
async function* zxR(T, R) {
  if (!T.body) {
    if (R.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative") throw new f9("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
    throw new f9("Attempted to iterate over a response with no body")
  }
  let a = new W7T,
    e = new Pk,
    t = i8T(T.body);
  for await (let r of FxR(t)) for (let h of e.decode(r)) {
    let i = a.decode(h);
    if (i) yield i
  }
  for (let r of e.flush()) {
    let h = a.decode(r);
    if (h) yield h
  }
}
async function* FxR(T) {
  let R = new Uint8Array;
  for await (let a of T) {
    if (a == null) continue;
    let e = a instanceof ArrayBuffer ? new Uint8Array(a) : typeof a === "string" ? c8T(a) : a,
      t = new Uint8Array(R.length + e.length);
    t.set(R), t.set(e, R.length), R = t;
    let r;
    while ((r = qxR(R)) !== -1) yield R.slice(0, r), R = R.slice(r)
  }
  if (R.length > 0) yield R
}
class W7T {
  constructor() {
    this.event = null, this.data = [], this.chunks = []
  }
  decode(T) {
    if (T.endsWith("\r")) T = T.substring(0, T.length - 1);
    if (!T) {
      if (!this.event && !this.data.length) return null;
      let t = {
        event: this.event,
        data: this.data.join(`
`),
        raw: this.chunks
      };
      return this.event = null, this.data = [], this.chunks = [], t
    }
    if (this.chunks.push(T), T.startsWith(":")) return null;
    let [R, a, e] = GxR(T, ":");
    if (e.startsWith(" ")) e = e.substring(1);
    if (R === "event") this.event = e;
    else if (R === "data") this.data.push(e);
    return null
  }
}

function GxR(T, R) {
  let a = T.indexOf(R);
  if (a !== -1) return [T.substring(0, a), R, T.substring(a + R.length)];
  return [T, "", ""]
}
async function z7T(T, R) {
  let {
    response: a,
    requestLogID: e,
    retryOfRequestLogID: t,
    startTime: r
  } = R, h = await (async () => {
    if (R.options.stream) {
      if (It(T).debug("response", a.status, a.url, a.headers, a.body), R.options.__streamClass) return R.options.__streamClass.fromSSEResponse(a, R.controller);
      return kk.fromSSEResponse(a, R.controller)
    }
    if (a.status === 204) return null;
    if (R.options.__binaryResponse) return a;
    let i = a.headers.get("content-type")?.split(";")[0]?.trim();
    if (i?.includes("application/json") || i?.endsWith("+json")) {
      if (a.headers.get("content-length") === "0") return;
      let c = await a.json();
      return F7T(c, a)
    }
    return await a.text()
  })();
  return It(T).debug(`[${e}] response parsed`, $_({
    retryOfRequestLogID: t,
    url: a.url,
    status: a.status,
    body: h,
    durationMs: Date.now() - r
  })), h
}

function F7T(T, R) {
  if (!T || typeof T !== "object" || Array.isArray(T)) return T;
  return Object.defineProperty(T, "_request_id", {
    value: R.headers.get("request-id"),
    enumerable: !1
  })
}

function OP(T, R, a) {
  return V7T(), new File(T, R ?? "unknown_file", a)
}

function wL(T, R) {
  let a = typeof T === "object" && T !== null && (("name" in T) && T.name && String(T.name) || ("url" in T) && T.url && String(T.url) || ("filename" in T) && T.filename && String(T.filename) || ("path" in T) && T.path && String(T.path)) || "";
  return R ? a.split(/[\\/]/).pop() || void 0 : a
}

function KxR(T) {
  let R = typeof T === "function" ? T : T.fetch,
    a = TK.get(R);
  if (a) return a;
  let e = (async () => {
    try {
      let t = "Response" in R ? R.Response : (await R("data:,")).constructor,
        r = new FormData;
      if (r.toString() === await new t(r).text()) return !1;
      return !0
    } catch {
      return !0
    }
  })();
  return TK.set(R, e), e
}
async function YxR(T, R, a) {
  if (V7T(), T = await T, R || (R = wL(T, !0)), ZxR(T)) {
    if (T instanceof File && R == null && a == null) return T;
    return OP([await T.arrayBuffer()], R ?? T.name, {
      type: T.type,
      lastModified: T.lastModified,
      ...a
    })
  }
  if (JxR(T)) {
    let t = await T.blob();
    return R || (R = new URL(T.url).pathname.split(/[\\/]/).pop()), OP(await aK(t), R, a)
  }
  let e = await aK(T);
  if (!a?.type) {
    let t = e.find((r) => typeof r === "object" && ("type" in r) && r.type);
    if (typeof t === "string") a = {
      ...a,
      type: t
    }
  }
  return OP(e, R, a)
}
async function aK(T) {
  let R = [];
  if (typeof T === "string" || ArrayBuffer.isView(T) || T instanceof ArrayBuffer) R.push(T);
  else if (Y7T(T)) R.push(T instanceof Blob ? T : await T.arrayBuffer());
  else if (X7T(T))
    for await (let a of T) R.push(...await aK(a));
  else {
    let a = T?.constructor?.name;
    throw Error(`Unexpected data type: ${typeof T}${a?`; constructor: ${a}`:""}${QxR(T)}`)
  }
  return R
}

function QxR(T) {
  if (typeof T !== "object" || T === null) return "";
  return `; props: [${Object.getOwnPropertyNames(T).map((R)=>`"${R}"`).join(", ")}]`
}
class Li {
  constructor(T) {
    this._client = T
  }
}

function* afR(T) {
  if (!T) return;
  if (p8T in T) {
    let {
      values: e,
      nulls: t
    } = T;
    yield* e.entries();
    for (let r of t) yield [r, null];
    return
  }
  let R = !1,
    a;
  if (T instanceof Headers) a = T.entries();
  else if (ZG(T)) a = T;
  else R = !0, a = Object.entries(T ?? {});
  for (let e of a) {
    let t = e[0];
    if (typeof t !== "string") throw TypeError("expected header name to be a string");
    let r = ZG(e[1]) ? e[1] : [e[1]],
      h = !1;
    for (let i of r) {
      if (i === void 0) continue;
      if (R && !h) h = !0, yield [t, null];
      yield [t, i]
    }
  }
}

function BL(T) {
  return typeof T === "object" && T !== null && dP in T
}

function Z7T(T, R) {
  let a = new Set;
  if (T) {
    for (let e of T)
      if (BL(e)) a.add(e[dP])
  }
  if (R)
    for (let e of R) {
      if (BL(e)) a.add(e[dP]);
      if (Array.isArray(e.content)) {
        for (let t of e.content)
          if (BL(t)) a.add(t[dP])
      }
    }
  return Array.from(a)
}

function J7T(T, R) {
  let a = Z7T(T, R);
  if (a.length === 0) return {};
  return {
    "x-stainless-helper": a.join(", ")
  }
}

function efR(T) {
  if (BL(T)) return {
    "x-stainless-helper": T[dP]
  };
  return {}
}

function TwT(T) {
  return T.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent)
}

function awT(T) {
  return T?.output_format ?? T?.output_config?.format
}

function qlT(T, R, a) {
  let e = awT(R);
  if (!R || !("parse" in (e ?? {}))) return {
    ...T,
    content: T.content.map((t) => {
      if (t.type === "text") {
        let r = Object.defineProperty({
          ...t
        }, "parsed_output", {
          value: null,
          enumerable: !1
        });
        return Object.defineProperty(r, "parsed", {
          get() {
            return a.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."), null
          },
          enumerable: !1
        })
      }
      return t
    }),
    parsed_output: null
  };
  return ewT(T, R, a)
}

function ewT(T, R, a) {
  let e = null,
    t = T.content.map((r) => {
      if (r.type === "text") {
        let h = rfR(R, r.text);
        if (e === null) e = h;
        let i = Object.defineProperty({
          ...r
        }, "parsed_output", {
          value: h,
          enumerable: !1
        });
        return Object.defineProperty(i, "parsed", {
          get() {
            return a.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."), h
          },
          enumerable: !1
        })
      }
      return r
    });
  return {
    ...T,
    content: t,
    parsed_output: e
  }
}

function rfR(T, R) {
  let a = awT(T);
  if (a?.type !== "json_schema") return null;
  try {
    if ("parse" in a) return a.parse(R);
    return JSON.parse(R)
  } catch (e) {
    throw new f9(`Failed to parse structured output: ${e}`)
  }
}

function zlT(T) {
  return T.type === "tool_use" || T.type === "server_tool_use" || T.type === "mcp_tool_use"
}

function FlT(T) {}

function XlT() {
  let T, R;
  return {
    promise: new Promise((a, e) => {
      T = a, R = e
    }),
    resolve: T,
    reject: R
  }
}
async function lfR(T, R = T.messages.at(-1)) {
  if (!R || R.role !== "assistant" || !R.content || typeof R.content === "string") return null;
  let a = R.content.filter((e) => e.type === "tool_use");
  if (a.length === 0) return null;
  return {
    role: "user",
    content: await Promise.all(a.map(async (e) => {
      let t = T.tools.find((r) => ("name" in r ? r.name : r.mcp_server_name) === e.name);
      if (!t || !("run" in t)) return {
        type: "tool_result",
        tool_use_id: e.id,
        content: `Error: Tool '${e.name}' not found`,
        is_error: !0
      };
      try {
        let r = e.input;
        if ("parse" in t && t.parse) r = t.parse(r);
        let h = await t.run(r);
        return {
          type: "tool_result",
          tool_use_id: e.id,
          content: h
        }
      } catch (r) {
        return {
          type: "tool_result",
          tool_use_id: e.id,
          content: r instanceof b8T ? r.content : `Error: ${r instanceof Error?r.message:String(r)}`,
          is_error: !0
        }
      }
    }))
  }
}

function JlT(T) {
  if (!T.output_format) return T;
  if (T.output_config?.format) throw new f9("Both output_format and output_config.format were provided. Please use only output_config.format (output_format is deprecated).");
  let {
    output_format: R,
    ...a
  } = T;
  return {
    ...a,
    output_config: {
      ...T.output_config,
      format: R
    }
  }
}

function owT(T) {
  return T?.output_config?.format
}

function tAT(T, R, a) {
  let e = owT(R);
  if (!R || !("parse" in (e ?? {}))) return {
    ...T,
    content: T.content.map((t) => {
      if (t.type === "text") return Object.defineProperty({
        ...t
      }, "parsed_output", {
        value: null,
        enumerable: !1
      });
      return t
    }),
    parsed_output: null
  };
  return nwT(T, R, a)
}

function nwT(T, R, a) {
  let e = null,
    t = T.content.map((r) => {
      if (r.type === "text") {
        let h = AfR(R, r.text);
        if (e === null) e = h;
        return Object.defineProperty({
          ...r
        }, "parsed_output", {
          value: h,
          enumerable: !1
        })
      }
      return r
    });
  return {
    ...T,
    content: t,
    parsed_output: e
  }
}

function AfR(T, R) {
  let a = owT(T);
  if (a?.type !== "json_schema") return null;
  try {
    if ("parse" in a) return a.parse(R);
    return JSON.parse(R)
  } catch (e) {
    throw new f9(`Failed to parse structured output: ${e}`)
  }
}

function rAT(T) {
  return T.type === "tool_use" || T.type === "server_tool_use"
}

function hAT(T) {}
class _a {
  constructor({
    baseURL: T = nC("ANTHROPIC_BASE_URL"),
    apiKey: R = nC("ANTHROPIC_API_KEY") ?? null,
    authToken: a = nC("ANTHROPIC_AUTH_TOKEN") ?? null,
    ...e
  } = {}) {
    AK.add(this), NL.set(this, void 0);
    let t = {
      apiKey: R,
      authToken: a,
      ...e,
      baseURL: T || "https://api.anthropic.com"
    };
    if (!t.dangerouslyAllowBrowser && MxR()) throw new f9(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
    this.baseURL = t.baseURL, this.timeout = t.timeout ?? pK.DEFAULT_TIMEOUT, this.logger = t.logger ?? console;
    let r = "warn";
    this.logLevel = r, this.logLevel = UlT(t.logLevel, "ClientOptions.logLevel", this) ?? UlT(nC("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ?? r, this.fetchOptions = t.fetchOptions, this.maxRetries = t.maxRetries ?? 2, this.fetch = t.fetch ?? BxR(), $0(this, NL, UxR, "f"), this._options = t, this.apiKey = typeof R === "string" ? R : null, this.authToken = a
  }
  withOptions(T) {
    return new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      authToken: this.authToken,
      ...T
    })
  }
  defaultQuery() {
    return this._options.defaultQuery
  }
  validateHeaders({
    values: T,
    nulls: R
  }) {
    if (T.get("x-api-key") || T.get("authorization")) return;
    if (this.apiKey && T.get("x-api-key")) return;
    if (R.has("x-api-key")) return;
    if (this.authToken && T.get("authorization")) return;
    if (R.has("authorization")) return;
    throw Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted')
  }
  async authHeaders(T) {
    return i8([await this.apiKeyAuth(T), await this.bearerAuth(T)])
  }
  async apiKeyAuth(T) {
    if (this.apiKey == null) return;
    return i8([{
      "X-Api-Key": this.apiKey
    }])
  }
  async bearerAuth(T) {
    if (this.authToken == null) return;
    return i8([{
      Authorization: `Bearer ${this.authToken}`
    }])
  }
  stringifyQuery(T) {
    return Object.entries(T).filter(([R, a]) => typeof a < "u").map(([R, a]) => {
      if (typeof a === "string" || typeof a === "number" || typeof a === "boolean") return `${encodeURIComponent(R)}=${encodeURIComponent(a)}`;
      if (a === null) return `${encodeURIComponent(R)}=`;
      throw new f9(`Cannot stringify type ${typeof a}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`)
    }).join("&")
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${fy}`
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${M7T()}`
  }
  makeStatusError(T, R, a, e) {
    return pr.generate(T, R, a, e)
  }
  buildURL(T, R, a) {
      let e = !mR(this, AK, "m", bwT).call(this) && a || this.baseURL,
        t = OxR(T) ? new URL(T) : new URL(e + (e.endsWith("/") && T.startsWith("/") ? T.slice(1) : T)),
        r = this.defaultQu
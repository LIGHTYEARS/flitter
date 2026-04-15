function ADT(T, R) {
  for (let a of T ?? []) if (r9T(oPR(R), a.matches)) return a.action === "allow";
  return !0;
}
function oPR(T) {
  if ("command" in T) return {
    command: T.command,
    args: T.args?.join(" "),
    env: T.env
  };
  return T;
}
function Uq(T, R, a, e, t, r, h) {
  let i = new wj(Bj.clientInfo, {
      capabilities: Bj.capabilities
    }),
    c = null,
    s = !!t,
    A = !1,
    l = null,
    o = new f0("idle");
  if (h) o.subscribe(w => h(w));
  if (t) t.onAuthStateChange = w => {
    o.next(w);
  };
  let n = new f0(0),
    p = new f0(null),
    _ = new f0(!1);
  function m(w, D) {
    if (A) return;
    if (w >= ky.maxRetries) {
      J.warn("MCP max reconnection attempts reached", {
        serverName: r,
        attempts: w
      }), p.next(null);
      return;
    }
    if (D && _DT.includes(D.code)) {
      J.info("MCP not reconnecting due to permanent error", {
        serverName: r,
        errorCode: D.code
      }), p.next(null);
      return;
    }
    let B = Math.min(ky.initialDelayMs * ky.backoffFactor ** w, ky.maxDelayMs);
    J.info("MCP scheduling reconnection", {
      serverName: r,
      attempt: w + 1,
      maxAttempts: ky.maxRetries,
      delayMs: B
    }), p.next({
      attempt: w + 1,
      nextRetryMs: B
    }), l = setTimeout(() => {
      if (l = null, !A) p.next(null), _.next(!1), n.next(w + 1);
    }, B);
  }
  let b = n.pipe(f0T(w => sET(Q9(async () => {
      if (await i.close(), a !== "enabled" || A) return null;
      let D = await pPR(T, i, R, e, t, r);
      if (SG.set(D.client, D.transportInfo), rPR({
        transport: D.transportInfo.type,
        url: D.transportInfo.url,
        serverName: r
      }), D.client.onclose = () => {
        if (!A) J.warn("MCP client connection closed unexpectedly", {
          serverName: r
        }), m(0);
      }, c = D.client, w > 0) J.info("MCP reconnection successful", {
        serverName: r,
        afterAttempts: w
      });
      return D.client;
    }), k0T).pipe(mE({
      onUnsubscribe: async () => {
        try {
          await (c ?? i).close();
        } catch (D) {
          J.error("Error closing client in lifecycle", {
            error: D
          });
        }
      }
    })), {
      shouldCountRefs: !0
    })),
    y = 0,
    u = b.subscribe(w => {
      if (w instanceof Error) {
        J.error("MCP client connection error in observable", {
          serverName: r,
          error: w.message,
          errorName: w.name,
          stack: w.stack
        });
        let D = mlT(w, r, s);
        m(y, D), y++;
      } else if (w && !(w instanceof Error) && w !== Jo) c = w, y = 0, J.debug("Active client captured for lifecycle management");
    }),
    P = w => mlT(w, r, s),
    k = b.pipe(vs(w => {
      if (w?.name === "AbortError") return J.debug("Caught AbortError in connection observable, treating as connection failed"), AR.of(Error("Connection aborted"));
      return AR.of(w);
    }), JR(w => {
      if (w === null) {
        if (a === "denied") return {
          type: "denied"
        };
        return {
          type: "awaiting-approval"
        };
      }
      if (w === Jo) return {
        type: "connecting"
      };
      if (w instanceof Error) return {
        type: "failed",
        error: P(w)
      };
      return {
        type: "connected",
        capabilities: w.getServerCapabilities(),
        serverInfo: w.getServerVersion()
      };
    })),
    x = v3(o, p, k).pipe(JR(([w, D, B]) => {
      if (w === "authenticating") return {
        type: "authenticating"
      };
      if (D && B.type === "failed") return {
        type: "reconnecting",
        attempt: D.attempt,
        nextRetryMs: D.nextRetryMs
      };
      return B;
    })),
    f = b.pipe(JR(w => {
      if (w && !(w instanceof Error) && w !== Jo) return w;
      return null;
    })),
    v = f.pipe(L9(w => {
      if (!w) return AR.of(null);
      let D = new W0();
      return w.setNotificationHandler(VD, () => {
        D.next();
      }), D.pipe(mE({
        onUnsubscribe: () => w.removeNotificationHandler("notifications/tools/list_changed")
      }), Y3(void 0), JR(() => w));
    })),
    g = f.pipe(L9(w => {
      if (!w) return AR.of(null);
      let D = new W0();
      return w.setNotificationHandler(GD, () => {
        D.next();
      }), D.pipe(mE({
        onUnsubscribe: () => w.removeNotificationHandler("notifications/resources/list_changed")
      }), Y3(void 0), JR(() => w));
    })),
    I = f.pipe(L9(w => {
      if (!w) return AR.of(null);
      let D = new W0();
      return w.setNotificationHandler(KD, () => {
        D.next();
      }), D.pipe(mE({
        onUnsubscribe: () => w.removeNotificationHandler("notifications/prompts/list_changed")
      }), Y3(void 0), JR(() => w));
    })),
    S = [],
    O = v.pipe(L9(w => {
      if (!w) return AR.of(S);
      return Q9(async () => {
        let D = await w.listTools();
        return _.next(!0), S = D.tools, D.tools;
      }).pipe(Y3(S), vs(D => {
        return J.error("Failed to list tools", {
          serverName: r,
          error: D
        }), _.next(!0), AR.of(S);
      }));
    })),
    j = _.pipe(JR(w => w)),
    d = I.pipe(L9(w => {
      if (!w) return AR.of([]);
      return Q9(async () => {
        if (!w.getServerCapabilities()?.prompts) return [];
        return (await w.listPrompts()).prompts;
      }).pipe(Y3([]), vs(D => {
        return J.error("Failed to list prompts", {
          serverName: r,
          error: D
        }), AR.of([]);
      }));
    })),
    C = g.pipe(L9(w => {
      if (!w) return AR.of([]);
      return Q9(async () => {
        if (!w.getServerCapabilities()?.resources) return [];
        return (await w.listResources()).resources;
      }).pipe(Y3([]), vs(D => {
        return J.error("Failed to list resources", {
          serverName: r,
          error: D
        }), AR.of([]);
      }));
    })),
    L = async () => {
      let w = await UnR(b);
      if (!w || w instanceof Error) throw Error("MCP client is not connected");
      return w;
    };
  return {
    status: x,
    tools: O,
    toolsLoaded: j,
    resources: C,
    prompts: d,
    async callTool(w, D, B) {
      let M = await L(),
        V = await M.callTool(w, void 0, {
          signal: B,
          timeout: 999999000
        });
      if (!("content" in V)) throw Error("unexpected response");
      let Q = SG.get(M);
      if (Q) hPR({
        transport: Q.type,
        url: Q.url,
        toolName: w.name,
        serverName: r,
        threadId: D.thread?.id
      });
      let W = bPR(V.content);
      if (V.isError) throw Error(mPR(w.name, W));
      return W;
    },
    async listResources(w, D) {
      let B = await L();
      if (!B.getServerCapabilities()?.resources) return [];
      return (await B.listResources(w, {
        signal: D,
        timeout: 999999000
      })).resources;
    },
    async readResource(w, D) {
      return (await (await L()).readResource(w, {
        signal: D,
        timeout: 999999000
      })).contents;
    },
    async getPrompt(w, D, B) {
      try {
        return await (await L()).getPrompt({
          name: w,
          arguments: D
        }, {
          signal: B,
          timeout: 999999000
        });
      } catch (M) {
        return null;
      }
    },
    async [Symbol.asyncDispose]() {
      if (A = !0, l !== null) clearTimeout(l), l = null;
      p.next(null), u.unsubscribe();
      try {
        await (c ?? i).close();
      } catch (w) {
        J.error("Error closing MCP client", {
          error: w
        });
      }
    }
  };
}
class wi {
  #T = [];
  #R = [];
  run(T, {
    systemPrompt: R,
    model: a,
    spec: e,
    retryOnRateLimit: t
  }, {
    toolService: r,
    env: h,
    conversation: i,
    followUps: c
  }) {
    let s = 0,
      A,
      l = c ? [null, ...c] : [null];
    return new AR(o => {
      let n = !1,
        p = () => {
          if (n || s >= l.length) {
            o.complete();
            return;
          }
          let _ = l[s];
          if (_) _(i);
          A = this.runOne(T, {
            systemPrompt: R,
            model: a,
            spec: e,
            retryOnRateLimit: t
          }, {
            conversation: i,
            toolService: r,
            env: h
          }).subscribe({
            next: m => {
              if (m.status !== "done" || s === l.length - 1) o.next(m);
              if (m.status === "error") n = !0;
            },
            error: m => {
              J.error(`Unexpected error (this should never occur) ${m}`), o.error(m);
            },
            complete: () => {
              s++, p();
            }
          });
        };
      return p(), () => {
        A?.unsubscribe();
      };
    });
  }
  runOne(T, {
    systemPrompt: R,
    model: a,
    spec: e,
    retryOnRateLimit: t
  }, {
    conversation: r,
    toolService: h,
    env: i
  }) {
    return new AR(c => {
      let s = new AbortController(),
        A = s.signal,
        l = () => {
          c.next({
            status: "in-progress",
            turns: this.#T,
            "~debug": {
              conversation: r,
              inferences: this.#R
            }
          });
        };
      return l(), (async () => {
        try {
          let o = e && h.getTools ? h.getTools(e) : h.tools,
            n = (await m0(o, A)).filter(m => m.enabled).map(m => m.spec),
            p = null,
            _ = 0;
          while (!0) {
            A.throwIfAborted();
            let m = {
              message: void 0,
              activeTools: new Map(),
              reasoning: void 0,
              isThinking: !0
            };
            this.#T.push(m), l();
            let b = performance.now(),
              y = 0,
              {
                result: u,
                toolUses: P,
                debugUsage: k,
                reasoning: x
              } = await this.runInferenceWithRateLimitRetries((...S) => T.runInference(...S), [a, R, r, n, i.thread, {
                configService: i.configService
              }, A, S => {
                if (m.message = S.message, m.reasoning = S.reasoning, m.isThinking = S.isThinking, S.toolCalls) for (let j of S.toolCalls) {
                  let d = {};
                  try {
                    d = JSON.parse(j.arguments || "{}");
                  } catch {}
                  m.activeTools.set(j.id, {
                    id: j.id,
                    tool_name: j.name,
                    status: "queued",
                    input: d
                  });
                }
                let O = performance.now();
                if (O - y >= 100) y = O, l();
              }], t, e?.key),
              f = performance.now() - b,
              v = {
                maxInputTokens: 0,
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationInputTokens: null,
                cacheReadInputTokens: null,
                totalInputTokens: 0,
                timestamp: new Date().toISOString()
              };
            this.#R.push({
              inferenceTimeMs: f,
              usage: k ?? v
            }), m.message = T.extractMessage(u), m.reasoning = x, m.isThinking = !1, m.activeTools = new Map(P.map(S => [S.id, {
              id: S.id,
              tool_name: S.name,
              status: "queued",
              input: S.input
            }])), A.throwIfAborted();
            let g;
            try {
              g = await Promise.all(P.map(S => this.runTool(h, i, e, S, A, l)));
            } catch (S) {
              if (S instanceof Error && S.name === "UserRejectedError") {
                c.next({
                  status: "done",
                  message: "User rejected a tool invocation. Subagent execution aborted.",
                  turns: this.#T,
                  "~debug": {
                    inferences: this.#R,
                    abortReason: "user-rejected-tool"
                  }
                });
                return;
              }
              throw S;
            }
            A.throwIfAborted();
            let I = s5R(g);
            if (I) {
              if (I === p) {
                if (_++, _ >= r5R) throw Error(`Subagent aborted: same tool error repeated ${_} times. Error: ${I}`);
              } else p = I, _ = 1;
            } else p = null, _ = 0;
            if (T.updateConversation(r, u, g), l(), P.length === 0) {
              let S = T.extractMessage(u);
              c.next({
                status: "done",
                message: S ?? t5R,
                turns: this.#T,
                "~debug": {
                  inferences: this.#R
                }
              });
              break;
            }
          }
        } catch (o) {
          if (o instanceof DOMException && o.name === "AbortError") c.next({
            status: "cancelled",
            turns: this.#T,
            "~debug": {
              inferences: this.#R,
              abortReason: "cancelled"
            }
          });else {
            let n = SuT(o),
              p = OaT(n, {}),
              _ = `Subagent error: ${p.title} - ${p.description}`,
              m;
            if (this.#T.length >= 5 && dO(n)) try {
              m = await R5R(this.#T, _, i.thread, i.config, A);
            } catch (y) {
              J.warn("Failed to summarize subagent work", {
                error: y
              });
            }
            let b = m ? `${_}

${m}` : _;
            c.next({
              status: "error",
              turns: this.#T,
              "~debug": {
                inferences: this.#R
              },
              message: b
            });
          }
        } finally {
          c.complete();
        }
      })(), () => {
        s.abort();
      };
    });
  }
  async runInferenceWithRateLimitRetries(T, R, a, e) {
    if (!a) return T(...R);
    let [,,,,,, t] = R,
      r = 0;
    while (!0) try {
      return await T(...R);
    } catch (h) {
      t.throwIfAborted();
      let i = SuT(h);
      if (!(c5R(i) && r < juT)) throw h;
      let c = Math.min(h5R * 2 ** r, i5R);
      J.warn("Subagent inference rate-limited, retrying", {
        subagentKey: e,
        attempt: r + 1,
        maxRetries: juT,
        delayMs: c,
        status: i.status,
        errorType: i.error?.type
      }), await wP(c, t), r++;
    }
  }
  async runTool(T, R, a, e, t, r) {
    let h = e.id;
    this.setToolUseStatus(h, "in-progress", void 0, r);
    let i = T.invokeTool(e.name, {
      args: e.input
    }, {
      ...R,
      tool: e.name,
      subagentSpec: a,
      toolUseID: e.id,
      parentToolUseId: R.toolUseID
    });
    return await eN(i, t).then(c => {
      if (c.status === "rejected-by-user") {
        this.setToolUseStatus(h, "rejected-by-user", void 0, r);
        let s = Error("User rejected tool invocation");
        throw s.name = "UserRejectedError", s;
      }
      if (c.status === "done") this.setToolUseStatus(h, "done", c.result, r);else if (c.status === "error") this.setToolUseStatus(h, "error", c.error, r);else this.setToolUseStatus(h, c.status, void 0, r);
      return {
        id: h,
        result: c
      };
    }).catch(c => {
      if (c instanceof Error && c.name === "UserRejectedError") throw c;
      if (c instanceof Error && c.name === "AbortError") throw this.setToolUseStatus(h, "cancelled", void 0, r), c;
      let s = c instanceof Error ? c.message : String(c);
      return this.setToolUseStatus(h, "error", s, r), {
        id: h,
        result: {
          status: "error",
          error: s
        }
      };
    });
  }
  setToolUseStatus(T, R, a, e) {
    let t = this.#T.at(-1)?.activeTools.get(T);
    if (!t) throw Error("Cannot update the status of a tool that does not exist");
    this.#T.at(-1)?.activeTools.set(T, {
      ...t,
      status: R,
      result: a
    }), e?.();
  }
}
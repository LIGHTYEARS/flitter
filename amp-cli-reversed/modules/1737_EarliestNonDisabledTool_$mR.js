function zLT(T) {
  let [, R, a] = T.split(/mcp__([^ ]+)__([^ ]+)/);
  if (!R || !a) return;
  return {
    server: R,
    tool: a
  };
}
function SoT(T) {
  return ["done", "error", "cancelled"].includes(T.status);
}
function _q(T) {
  return typeof T === "object" && "key" in T;
}
function $mR(T) {
  let R = [],
    a = new W0(),
    e,
    t = new f0([]),
    r = new Map();
  async function h(o) {
    return new Promise((n, p) => {
      let _ = {
        ...o,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      };
      r.set(o.toolUseId, {
        resolve: n,
        reject: p
      });
      let m = t.getValue();
      t.next([...m, _]);
    });
  }
  function i(o, n, p) {
    let _ = t.getValue();
    t.next(_.filter(b => b.toolUseId !== o));
    let m = r.get(o);
    if (m) m.resolve({
      accepted: n,
      feedback: p
    }), r.delete(o);
  }
  function c(o) {
    let n = t.getValue(),
      p = n.filter(_ => _.threadId === o || _.mainThreadId === o);
    for (let _ of p) {
      let m = r.get(_.toolUseId);
      if (m) m.resolve({
        accepted: !1
      }), r.delete(_.toolUseId);
    }
    t.next(n.filter(_ => _.threadId !== o && _.mainThreadId !== o));
  }
  function s(o) {
    let n = t.getValue();
    if (n.some(_ => _.toolUseId === o.toolUseId)) return;
    let p = {
      ...o,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    t.next([...n, p]);
  }
  function A(o, n) {
    if (!o) {
      J.warn("findEarliestNonDisabledTool called with empty tool name");
      return;
    }
    let p = R.filter(_ => _.spec.name === o);
    if (p.length === 0) {
      let _ = o.toLowerCase();
      p = R.filter(m => m.spec.name.toLowerCase() === _);
    }
    for (let _ of p) if (yy(_.spec, n).enabled) return _;
    return;
  }
  function l(o, n, p) {
    if (!o) throw Error("spec is required");
    let _ = R.findIndex(y => y.spec.name === o.name),
      m = _ !== -1 ? R[_] : void 0;
    if (o.source !== "builtin" && m?.spec.source === "builtin") return J.warn("Ignoring external tool registration - builtin takes precedence", {
      toolName: o.name,
      externalSource: o.source
    }), {
      dispose: () => {}
    };
    let b = {
      spec: o,
      fn: Promise.resolve(n),
      preprocessArgs: p
    };
    if (m && JSON.stringify(m.spec.source) === JSON.stringify(o.source)) R[_] = b;else R.push(b);
    return a.next(), {
      dispose: () => {
        let y = R.indexOf(b);
        if (y !== -1) R.splice(y, 1), a.next();
      }
    };
  }
  return T.configService.config.subscribe(o => {
    e = o;
  }), {
    registerTool({
      spec: o,
      fn: n,
      preprocessArgs: p
    }) {
      if (!n) return FLT;
      return l(o, n, p);
    },
    tools: v3(T.configService.config, a.pipe(Y3(void 0))).pipe(JR(([o]) => {
      return R.map(n => ({
        spec: n.spec,
        ...yy(n.spec, o)
      })).sort((n, p) => n.spec.name.localeCompare(p.spec.name));
    })),
    invokeTool(o, n, p) {
      if (o === hG && n.args && "invalid_tool_name" in n.args && typeof n.args.invalid_tool_name === "string") {
        cs.add(1, {
          toolName: o,
          error: "invalid"
        });
        let b = rG(n.args.invalid_tool_name);
        return new AR(y => {
          y.error(Error(b));
        });
      }
      if (!A(o, p.config)) {
        let b = o.toLowerCase(),
          y = R.filter(f => f.spec.name.toLowerCase() === b);
        if (y.length === 0) return cs.add(1, {
          toolName: o,
          error: "not_found"
        }), new AR(f => {
          f.error(Error(`tool ${JSON.stringify(o)} not found`));
        });
        let u = y[0],
          P = u.spec.name,
          k = yy(u.spec, p.config);
        cs.add(1, {
          toolName: o,
          error: "disabled"
        });
        let x = k.enabled ? "unknown" : k.disabledReason;
        return new AR(f => {
          f.error(Error(`tool ${JSON.stringify(P)} is disabled: ${x}`));
        });
      }
      let _ = p.subagentSpec ?? p.agentMode;
      if (_ && !this.isToolAllowed(o, _)) {
        cs.add(1, {
          toolName: o,
          error: "disabled"
        });
        let b = _q(_) ? _.displayName ?? _.key : `${_} mode`;
        return new AR(y => {
          y.error(Error(`tool ${JSON.stringify(o)} is not allowed for ${b}`));
        });
      }
      if (p.thread.mainThreadID && !p.subagentSpec && !tq(o, qe["task-subagent"])) return cs.add(1, {
        toolName: o,
        error: "disabled"
      }), new AR(b => {
        b.error(Error(`tool ${JSON.stringify(o)} is not allowed for subagents`));
      });
      let m = () => this.invokeLeasedTool(o, n, p);
      if (n.userInput?.accepted === !0) return J.debug(`Tool ${String(o)} already approved by user - bypassing permission check`), m();
      if (n.userInput?.accepted === !1) return J.debug(`Tool ${String(o)} rejected by user`), new AR(b => {
        b.next({
          status: "rejected-by-user",
          reason: "Tool execution rejected by user"
        }), b.complete();
      });
      return new AR(b => {
        let y = null,
          u = !1;
        J.debug(`Tool ${String(o)} - checking permissions`);
        let P = p.thread.mainThreadID ? "subagent" : "thread",
          k = this.preprocessArgs?.(o, n.args, p) ?? n.args;
        return PLT(o, k, {
          configService: p.configService
        }, P, p.thread.id, p.toolUseID).then(async x => {
          if (u) return;
          if (!x) {
            y = m().subscribe(b);
            return;
          }
          let {
            permitted: f,
            reason: v,
            action: g,
            error: I,
            matchedEntry: S,
            source: O
          } = x;
          if (!f) {
            if (J.debug(`Tool ${String(o)} not permitted - action: ${g}, reason: ${v}`), g === "ask") {
              J.debug(`Tool ${String(o)} - requesting user approval`);
              let C = (o === U8 || o === Eb) && typeof k === "object" && k !== null ? [k.cmd, k.command].filter(Boolean) : void 0,
                L = S ? {
                  tool: S.tool,
                  action: S.action,
                  matches: S.matches
                } : void 0;
              try {
                let w = await h({
                  threadId: p.thread.id,
                  mainThreadId: p.thread.mainThreadID,
                  toolUseId: p.toolUseID,
                  toolName: String(o),
                  args: k,
                  reason: v || "Tool requires user approval",
                  toAllow: C,
                  context: P,
                  subagentToolName: p.subagentSpec?.displayName,
                  parentToolUseId: p.parentToolUseId,
                  matchedRule: L,
                  ruleSource: O
                });
                if (u) return;
                if (w.accepted) J.debug(`Tool ${String(o)} - user approved, executing`), b.next({
                  status: "in-progress"
                }), y = m().subscribe(b);else if (w.feedback) J.debug(`Tool ${String(o)} - user rejected with feedback: ${w.feedback}`), b.next({
                  status: "error",
                  error: {
                    message: `This tool call was rejected by the user with feedback: ${w.feedback}`
                  }
                }), b.complete();else J.debug(`Tool ${String(o)} - user rejected`), b.next({
                  status: "rejected-by-user",
                  reason: v || "Tool execution rejected by user",
                  toAllow: C
                }), b.complete();
              } catch (w) {
                if (u) return;
                J.error(`Approval request failed for tool ${String(o)}:`, w), b.next({
                  status: "error",
                  error: {
                    message: w instanceof Error ? w.message : "Approval request failed"
                  }
                }), b.complete();
              }
              return;
            }
            if (g === "reject" && I) b.next({
              status: "error",
              error: {
                message: I
              }
            });else b.next({
              status: "rejected-by-user",
              reason: v || "Tool execution denied by permissions"
            });
            b.complete();
            return;
          }
          J.debug(`Tool ${String(o)} permitted - action: ${g}`);
          let j = g === "delegate",
            d = p.dir?.fsPath;
          if (!j && d) try {
            let C = jmR(o, k, d),
              L,
              w = new Set();
            for (let D of C) {
              let B = mi(D),
                M = await p.filesystem.realpath(B).catch(() => B),
                V = B.fsPath,
                Q = M.fsPath,
                W = Q !== V,
                eT = await rcT(B, p.filesystem, p.config.settings),
                iT = W ? await rcT(M, p.filesystem, p.config.settings) : eT,
                aT = eT.requiresConsent ? eT : iT;
              if (aT.requiresConsent) {
                if (L ||= aT.reason, w.add(V), W) w.add(Q);
              }
            }
            if (w.size > 0) {
              let D = [...w];
              J.debug(`Tool ${String(o)} requires guarded file consent: ${L}`, {
                guardedPaths: D
              });
              try {
                let B = await h({
                  threadId: p.thread.id,
                  mainThreadId: p.thread.mainThreadID,
                  toolUseId: p.toolUseID,
                  toolName: String(o),
                  args: k,
                  reason: L || "File requires user consent",
                  toAllow: D,
                  context: P
                });
                if (u) return;
                if (B.accepted) J.debug(`Tool ${String(o)} - guarded file approved, executing`), b.next({
                  status: "in-progress"
                }), y = m().subscribe(b);else if (B.feedback) J.debug(`Tool ${String(o)} - guarded file rejected with feedback: ${B.feedback}`), b.next({
                  status: "error",
                  error: {
                    message: `This tool call was rejected by the user with feedback: ${B.feedback}`
                  }
                }), b.complete();else J.debug(`Tool ${String(o)} - guarded file rejected`), b.next({
                  status: "rejected-by-user",
                  reason: L || "Tool execution rejected by user",
                  toAllow: D
                }), b.complete();
              } catch (B) {
                if (u) return;
                J.error(`Guarded file approval request failed for tool ${String(o)}:`, B), b.next({
                  status: "error",
                  error: {
                    message: B instanceof Error ? B.message : "Approval request failed"
                  }
                }), b.complete();
              }
              return;
            }
          } catch (C) {
            J.warn(`Guarded file check failed for tool ${String(o)}:`, C);
          }
          y = m().subscribe(b);
        }).catch(x => {
          if (u) return;
          J.error(`Permission check failed for tool ${String(o)}:`, x), b.next({
            status: "error",
            error: {
              message: x.message || "Permission check failed"
            }
          }), b.complete();
        }), () => {
          u = !0, y?.unsubscribe();
          let x = r.get(p.toolUseID);
          if (x) {
            x.resolve({
              accepted: !1
            }), r.delete(p.toolUseID);
            let f = t.getValue();
            t.next(f.filter(v => v.toolUseId !== p.toolUseID));
          }
        };
      });
    },
    invokeLeasedTool(o, n, p) {
      let _ = performance.now(),
        m = () => GLT.record(performance.now() - _, {
          toolName: o
        });
      if (o === hG && n.args && "invalid_tool_name" in n.args && typeof n.args.invalid_tool_name === "string") {
        cs.add(1, {
          toolName: o,
          error: "invalid"
        });
        let y = rG(n.args.invalid_tool_name);
        return new AR(u => {
          u.error(Error(y));
        });
      }
      let b = A(o, p.config);
      if (!b) {
        let y = o.toLowerCase(),
          u = R.filter(P => P.spec.name.toLowerCase() === y);
        if (u.length > 0) {
          let P = u[0],
            k = P.spec.name,
            x = yy(P.spec, p.config);
          cs.add(1, {
            toolName: o,
            error: "disabled"
          });
          let f = x.enabled ? "unknown" : x.disabledReason;
          return new AR(v => {
            v.error(Error(`tool ${JSON.stringify(k)} is disabled: ${f}`));
          });
        }
        return cs.add(1, {
          toolName: o,
          error: "not_found"
        }), new AR(P => {
          P.error(Error(`tool ${JSON.stringify(o)} not found`));
        });
      }
      if (cs.add(1, {
        toolName: o
      }), o === oc) {
        let y = n?.name;
        if (y) KLT.add(1, {
          skillName: y
        });
      }
      return Q9(() => b.fn).pipe(L9(y => {
        let u = OmR(n, b.spec.inputSchema, o),
          P = y(u, p);
        if (b.spec.meta?.disableTimeout) return P;
        return pbR(P, OnR(p.config));
      }), tN(() => m()));
    },
    preprocessArgs(o, n, p) {
      let _ = A(o, p.config);
      if (!_ || !_.preprocessArgs) return;
      let m = _.preprocessArgs;
      try {
        return m(n, p);
      } catch (b) {
        J.error("preprocessArgs", {
          id: o,
          args: n,
          error: String(b)
        });
        return;
      }
    },
    isToolAllowed(o, n) {
      let p = this.normalizeToolName(o),
        _ = R.find(b => b.spec.name === p),
        m = _?.spec.source;
      if (typeof m === "object" && ("mcp" in m || "toolbox" in m || "plugin" in m)) return !0;
      if (_q(n)) return tq(p, n, _?.spec.meta);
      return IiT(p, n);
    },
    getTools(o) {
      return v3(T.configService.config, a.pipe(Y3(void 0))).pipe(JR(([n]) => {
        return R.filter(p => {
          if (_q(o)) return tq(p.spec.name, o, p.spec.meta);
          if (p.spec.meta?.deferred === !0) return !1;
          if (RAR(p.spec.name, o)) return !1;
          let _ = p.spec.source;
          if (typeof _ === "object" && ("mcp" in _ || "toolbox" in _ || "plugin" in _)) return !0;
          return IiT(p.spec.name, o);
        }).map(p => {
          return {
            spec: p.spec,
            ...yy(p.spec, n)
          };
        }).sort((p, _) => p.spec.name.localeCompare(_.spec.name));
      }));
    },
    getToolsForMode(o, n) {
      if (n) return this.getTools(qe["task-subagent"]);
      return this.getTools(o);
    },
    getExecutionProfile(o) {
      if (!e) return;
      return A(o, e)?.spec.executionProfile;
    },
    getToolSpec(o) {
      return R.find(n => n.spec.name === o)?.spec;
    },
    normalizeToolName(o) {
      if (o === S2) return U8;
      return o;
    },
    normalizeToolArgs(o, n, p) {
      if (o === S2) return {
        ...n,
        cmd: typeof n.cmd === "string" ? n.cmd : typeof n.command === "string" ? n.command : "",
        cwd: typeof n.cwd === "string" ? n.cwd : typeof n.workdir === "string" ? n.workdir : void 0
      };
      return n;
    },
    pendingApprovals$: t,
    resolveApproval: i,
    clearApprovalsForThread: c,
    requestApproval: h,
    restoreApproval: s,
    dispose() {
      for (let [o, n] of r) n.resolve({
        accepted: !1
      }), r.delete(o);
      t.next([]);
    }
  };
}
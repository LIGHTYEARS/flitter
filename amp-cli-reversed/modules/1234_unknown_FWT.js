class FWT {
  threadID;
  toolService;
  callbacks;
  processingMutex = new Cm();
  runningTools = new Map();
  cancelledToolUses = new Set();
  toolMessages = new Map();
  toolCompletionResolvers = new Map();
  pendingApprovalsSubscription;
  writtenBlockedToolUseIds = new Set();
  disposed = !1;
  constructor(T, R, a) {
    this.threadID = T, this.toolService = R, this.callbacks = a, this.pendingApprovalsSubscription = this.toolService.pendingApprovals$.subscribe(e => {
      this.syncPendingApprovalsToThreadState(e);
    });
  }
  syncPendingApprovalsToThreadState(T) {
    let R = T.filter(e => e.threadId === this.threadID);
    for (let e of R) if (!this.writtenBlockedToolUseIds.has(e.toolUseId)) this.writtenBlockedToolUseIds.add(e.toolUseId), J.debug("Writing blocked-on-user to thread state", {
      name: "syncPendingApprovalsToThreadState",
      threadID: this.threadID,
      toolUseId: e.toolUseId,
      toolName: e.toolName
    }), this.callbacks.updateThread({
      type: "tool:data",
      toolUse: e.toolUseId,
      data: {
        status: "blocked-on-user",
        reason: e.reason,
        toAllow: e.toAllow
      }
    });
    let a = new Set(R.map(e => e.toolUseId));
    for (let e of this.writtenBlockedToolUseIds) if (!a.has(e)) this.writtenBlockedToolUseIds.delete(e);
  }
  async onResume() {
    await this.processingMutex.acquire();
    try {
      let T = this.callbacks.getThread(),
        R = dt(T, "user");
      if (!R) return;
      for (let a of R.content) {
        if (a.type !== "tool_result") continue;
        if (a.run.status === "blocked-on-user") {
          let t = this.findToolUseById(a.toolUseID);
          if (!t) continue;
          J.debug(`restoring blocked-on-user tool ${t.name} to approval queue`, {
            name: "onResume",
            threadID: this.threadID,
            toolUseID: a.toolUseID
          }), this.toolService.restoreApproval({
            threadId: this.threadID,
            toolUseId: a.toolUseID,
            toolName: t.name,
            args: t.input ?? {},
            reason: a.run.reason,
            toAllow: a.run.toAllow,
            context: T.mainThreadID ? "subagent" : "thread"
          });
          continue;
        }
        if (!(!wt(a.run.status) && !this.runningTools.has(a.toolUseID))) continue;
        let e = this.findToolUseById(a.toolUseID);
        if (!e) continue;
        if (this.isDangerousToResume(e.name)) {
          J.debug(`cancelling dangerous tool ${e.name} on resume`, {
            name: "onResume",
            threadID: this.threadID,
            toolUseID: a.toolUseID
          });
          let t = FD(a.run);
          this.callbacks.updateThread({
            type: "tool:data",
            toolUse: a.toolUseID,
            data: {
              status: "cancelled",
              reason: "system:safety",
              progress: t
            }
          });
          continue;
        }
        J.debug(`re-invoking tool ${e.name} with ID ${a.toolUseID}`, {
          name: "onResume",
          threadID: this.threadID
        }), await this.invokeTool(e, a.userInput);
      }
    } finally {
      this.processingMutex.release();
    }
    await this.callbacks.updateFileChanges();
  }
  async onAssistantMessageComplete(T) {
    let R;
    await this.processingMutex.acquire();
    try {
      this.cancelledToolUses.clear(), R = this.findToolUsesNeedingInvocation(T), J.debug(`saw ${R.length} tool uses (${R.map(a => a.name).join(", ")})`, {
        name: "onAssistantMessageComplete",
        threadID: this.threadID
      });
    } finally {
      this.processingMutex.release();
    }
    if (R.length > 0) await this.executeToolsWithPlan(R);
  }
  async userProvideInput(T, R) {
    await this.processingMutex.acquire();
    try {
      let a = this.findToolUseById(T);
      if (a && Va(a)) await this.invokeTool(a, R);
    } finally {
      this.processingMutex.release();
    }
  }
  async userCancel(T) {
    await this.cancelTool(T, "user:cancelled");
  }
  async onNewUserMessage() {
    this.markAllActiveToolsCancelled(), this.toolService.clearApprovalsForThread(this.threadID), await this.cancelAll("user:interrupted");
  }
  async cancelAll(T) {
    await this.processingMutex.acquire();
    try {
      this.markAllActiveToolsCancelled(), this.toolService.clearApprovalsForThread(this.threadID), this.cancelUnstartedTools(T), await this.cancelInProgressTools(T);
    } finally {
      this.processingMutex.release();
    }
  }
  async findAndCancelToolRun(T, R) {
    let a = this.callbacks.getThread();
    if (!Tn(a, T)) return;
    await this.cancelTool(T, "user:cancelled", R);
  }
  async cancelToolOnly(T, R) {
    let a = this.callbacks.getThread();
    if (!Tn(a, T)) return;
    let e = this.getCancelDataForToolRun(T, "user:cancelled"),
      t = this.toolMessages.get(T);
    if (t) {
      try {
        t.next({
          type: "stop-command"
        });
      } catch (r) {
        J.warn("Failed to send stop-command", {
          toolUseID: T,
          error: r
        });
      }
      t.complete(), this.toolMessages.delete(T);
    }
    J.debug(`cancelToolOnly(${T})`), await this.callbacks.handle({
      type: "tool:data",
      toolUse: T,
      data: e
    }, R);
  }
  getRunningToolIds() {
    return Array.from(this.runningTools.keys());
  }
  hasRunningTools() {
    return this.runningTools.size > 0;
  }
  isCancelled(T) {
    return this.cancelledToolUses.has(T);
  }
  markCancelled(T) {
    this.cancelledToolUses.add(T);
  }
  clearCancelled(T) {
    this.cancelledToolUses.delete(T);
  }
  sendToolMessage(T, R) {
    let a = this.toolMessages.get(T);
    if (a) return a.next(R), !0;
    return !1;
  }
  resolveToolCompletion(T, R, a) {
    let e = this.toolCompletionResolvers.get(T);
    if (e) {
      if (R) e.resolve();else e.reject(a ?? Error(`Tool failed: ${T}`));
      this.toolCompletionResolvers.delete(T);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = !0, this.pendingApprovalsSubscription.unsubscribe(), this.toolService.clearApprovalsForThread(this.threadID), this.writtenBlockedToolUseIds.clear();
    for (let [T, R] of this.toolCompletionResolvers) try {
      R.reject(Error("Orchestrator disposed"));
    } finally {
      this.toolCompletionResolvers.delete(T);
    }
    for (let [T, R] of this.toolMessages) try {
      R.next({
        type: "stop-command"
      }), R.complete();
    } catch (a) {
      J.warn("Failed to cleanup tool messages during disposal", {
        id: T,
        error: a
      });
    }
    this.toolMessages.clear();
    for (let T of this.runningTools.values()) T.abort.abort();
    this.runningTools.clear(), this.cancelledToolUses.clear();
  }
  findToolUsesNeedingInvocation(T) {
    if (T.content.some(r => r.type === "tool_use" && !Va(r))) return [];
    if (!(T.state?.type === "complete" || T.state?.type === "cancelled")) return [];
    let R = this.callbacks.getThread(),
      a = dt(R, "user"),
      e = dt(R, "assistant"),
      t = new Set();
    if (a?.messageId !== void 0 && e?.messageId !== void 0 && a.messageId > e.messageId) {
      for (let r of a.content) if (r.type === "tool_result") t.add(r.toolUseID);
    }
    return T.content.filter(r => r.type === "tool_use").filter(r => !t.has(r.id) && !this.cancelledToolUses.has(r.id));
  }
  async executeToolsWithPlan(T) {
    if (T.length === 0) return;
    let R = wwR(T, this.toolService);
    J.debug(`executing ${T.length} tools in ${R.length} batch(es)`, {
      name: "executeToolsWithPlan",
      threadID: this.threadID,
      batches: R.map(a => a.map(e => e.name))
    }), await this.executeToolBatchesSequentially(R);
  }
  async executeToolBatchesSequentially(T) {
    for (let R of T) {
      let a = (await Promise.allSettled(R.map(e => this.invokeToolAndWait(e, void 0)))).filter(e => e.status === "rejected");
      if (a.length > 0) J.warn(`${a.length} tool(s) failed in batch`, {
        name: "executeToolBatchesSequentially",
        threadID: this.threadID,
        errors: a.map(e => e.reason)
      });
    }
  }
  async invokeToolAndWait(T, R) {
    let a = new Promise((e, t) => {
      this.toolCompletionResolvers.set(T.id, {
        resolve: e,
        reject: t
      });
    });
    this.invokeTool(T, R).catch(e => {
      let t = this.toolCompletionResolvers.get(T.id);
      if (t) J.debug(`Tool invocation setup failed for ${T.id}`, {
        name: "invokeToolAndWait",
        threadID: this.threadID,
        error: String(e)
      }), t.reject(e), this.toolCompletionResolvers.delete(T.id);
    }), await a;
  }
  async invokeTool(T, R) {
    if (this.runningTools.has(T.id)) throw Error(`(bug) tool invocation already in progress: ${T.id}`);
    if (!Va(T)) throw Error(`(bug) tool use is incomplete: ${T.id}`);
    let a = await this.callbacks.getConfig(),
      e = u7R(a.settings?.hooks, {
        threadID: this.threadID,
        toolUse: T
      }),
      {
        abortOp: t
      } = await this.callbacks.applyHookResult(e);
    if (t) {
      let c = this.toolCompletionResolvers.get(T.id);
      if (c) c.resolve(), this.toolCompletionResolvers.delete(T.id);
      return;
    }
    let r = T.input;
    if (this.callbacks.requestPluginToolCall) {
      let c = {
          thread: {
            id: this.threadID
          },
          toolUseID: T.id,
          tool: T.name,
          input: T.input ?? {}
        },
        s = await this.callbacks.requestPluginToolCall(c);
      if (s.action === "error") {
        J.warn("Plugin returned error action", {
          tool: T.name,
          message: s.message,
          toolUseID: T.id
        });
        let A = this.toolCompletionResolvers.get(T.id);
        if (await this.callbacks.handle({
          type: "tool:data",
          toolUse: T.id,
          data: {
            status: "error",
            error: {
              message: `Plugin error: ${s.message}`,
              displayMessage: s.message
            }
          }
        }), A) A.resolve(), this.toolCompletionResolvers.delete(T.id);
        return;
      }
      if (s.action === "reject-and-continue") {
        let A = this.toolCompletionResolvers.get(T.id);
        if (await this.callbacks.handle({
          type: "tool:data",
          toolUse: T.id,
          data: {
            status: "done",
            result: `Tool rejected by plugin: ${s.message}`,
            isFinal: !1
          }
        }), A) A.resolve(), this.toolCompletionResolvers.delete(T.id);
        return;
      }
      if (s.action === "synthesize") {
        let A = this.toolCompletionResolvers.get(T.id);
        if (await this.callbacks.handle({
          type: "tool:data",
          toolUse: T.id,
          data: {
            status: "done",
            result: s.result.output,
            isFinal: !1
          }
        }), A) A.resolve(), this.toolCompletionResolvers.delete(T.id);
        return;
      }
      if (s.action === "modify") r = s.input, await this.callbacks.handle({
        type: "tool:processed",
        toolUse: T.id,
        newArgs: s.input
      });
    }
    let h = new AbortController(),
      i = {
        abort: h
      };
    this.runningTools.set(T.id, i), this.callbacks.updateThread({
      type: "tool:data",
      toolUse: T.id,
      data: {
        status: "in-progress"
      }
    });
    try {
      let c = await this.callbacks.getToolRunEnvironment(T.id, h.signal),
        s = new AR(u => {
          this.toolMessages.set(T.id, u);
        }),
        A = {
          ...c,
          toolMessages: s
        },
        l = this.toolService.preprocessArgs?.(T.name, r, A);
      if (l) await this.callbacks.handle({
        type: "tool:processed",
        toolUse: T.id,
        newArgs: l
      });
      let o = l ?? r,
        n = this.toolService.normalizeToolName(T.name),
        p = typeof o === "object" && o !== null ? this.toolService.normalizeToolArgs(T.name, o) : o,
        _ = typeof p === "object" && p !== null && "__isFinal" in p && typeof p.__isFinal === "boolean" ? p.__isFinal : void 0,
        m = _ !== void 0 ? Object.fromEntries(Object.entries(p).filter(([u]) => u !== "__isFinal")) : p,
        b = this.toolService.invokeTool(n, {
          args: m,
          userInput: R
        }, A).pipe(M$(this.callbacks.getDisposed$()), tN(() => {
          this.runningTools.delete(T.id), this.toolMessages.get(T.id)?.complete(), this.toolMessages.delete(T.id);
        })).subscribe({
          next: async u => {
            if (this.cancelledToolUses.has(T.id)) return;
            if (J.debug(`${T.id}, ${u.status}`, {
              name: "invokeTool",
              threadID: this.threadID
            }), wt(u.status)) {
              this.runningTools.delete(T.id), b.unsubscribe();
              let k = this.toolCompletionResolvers.get(T.id);
              if (k) {
                if (u.status === "done") k.resolve();else k.reject(Error(`Tool ${u.status}: ${T.id}`));
                this.toolCompletionResolvers.delete(T.id);
              }
              if (u.status === "done" && u.trackFiles?.length) this.callbacks.trackFiles(u.trackFiles);
              if (u.status === "done" && T.name.toLowerCase() === oc.toLowerCase()) this.callbacks.onSkillToolComplete(T);
              if (a.settings?.hooks) {
                let x = y7R(a.settings.hooks, {
                  threadID: this.threadID,
                  toolUse: T
                });
                await this.callbacks.applyPostHookResult(x, {
                  toolUseID: T.id
                });
              }
              if (this.callbacks.requestPluginToolResult) {
                let x = {
                  toolUseID: T.id,
                  tool: T.name,
                  input: T.input ?? {},
                  status: u.status,
                  error: u.status === "error" ? u.error?.message : void 0,
                  output: u.status === "done" && typeof u.result === "string" ? u.result : void 0
                };
                try {
                  let f = await this.callbacks.requestPluginToolResult(x);
                  if (f) u = {
                    ...u,
                    status: f.status,
                    error: f.status === "error" ? {
                      message: f.error ?? "Plugin error"
                    } : void 0,
                    result: f.output
                  };
                } catch (f) {
                  J.debug("Failed to request plugin tool result", {
                    error: f
                  });
                }
              }
            }
            await this.callbacks.updateFileChanges();
            let P = _ !== void 0 && u.status === "done" && u.isFinal === void 0 ? {
              ...u,
              isFinal: _
            } : u;
            await this.callbacks.handle({
              type: "tool:data",
              toolUse: T.id,
              data: P
            }, h.signal);
          },
          error: async u => {
            let P = this.toolCompletionResolvers.get(T.id);
            if (P) P.reject(u), this.toolCompletionResolvers.delete(T.id);
            await this.callbacks.handle({
              type: "tool:data",
              toolUse: T.id,
              data: {
                status: "error",
                error: {
                  message: "message" in u ? u.message : String(u),
                  displayMessage: "displayMessage" in u ? u.displayMessage : void 0
                }
              }
            }, h.signal);
          },
          complete: () => {
            let u = this.toolCompletionResolvers.get(T.id);
            if (!u) return;
            let P = this.callbacks.getThread(),
              k = sA(P).get(T.id)?.run;
            if (k && wt(k.status)) return;
            let x;
            if (this.callbacks.isDisposed()) x = "Worker disposed";else if (h.signal.aborted) x = "Tool aborted";else if (this.cancelledToolUses.has(T.id)) x = "Tool cancelled";else x = "Tool observable completed without terminal state";
            u.reject(Error(x)), this.toolCompletionResolvers.delete(T.id);
          }
        }),
        y = this.runningTools.get(T.id);
      if (y) y.subscription = b;
      xN(h.signal, () => b.unsubscribe());
    } catch (c) {
      this.runningTools.delete(T.id);
      let s = this.toolCompletionResolvers.get(T.id);
      if (s) s.reject(c), this.toolCompletionResolvers.delete(T.id);
      throw c;
    }
  }
  async cancelTool(T, R, a) {
    let e = this.getCancelDataForToolRun(T, R),
      t = this.toolMessages.get(T);
    if (t) {
      try {
        t.next({
          type: "stop-command"
        });
      } catch (r) {
        J.warn("Failed to send stop-command", {
          toolUseID: T,
          error: r
        });
      }
      t.complete(), this.toolMessages.delete(T);
    }
    J.debug(`cancelTool(${T}, ${R})`), await this.callbacks.handle({
      type: "tool:data",
      toolUse: T,
      data: e
    }, a);
  }
  getCancelDataForToolRun(T, R) {
    let a = this.callbacks.getThread(),
      e = sA(a).get(T)?.run;
    return {
      status: "cancelled",
      progress: e ? FD(e) : void 0,
      reason: R
    };
  }
  markAllActiveToolsCancelled() {
    let T = this.callbacks.getThread(),
      R = dt(T, "assistant");
    if (R) {
      let a = dt(T, "user"),
        e = new Map();
      if (a) {
        for (let t of a.content) if (t.type === "tool_result") e.set(t.toolUseID, t.run);
      }
      for (let t of R.content) if (t.type === "tool_use" && Va(t)) {
        let r = e.get(t.id);
        if (!(r ? wt(r.status) : !1)) this.cancelledToolUses.add(t.id);
      }
    }
  }
  cancelUnstartedTools(T) {
    let R = this.callbacks.getThread(),
      a = sA(R),
      e = R.messages.findLastIndex(r => NET(r)),
      t = e === -1 ? R.messages : R.messages.slice(e + 1);
    for (let r of t) {
      if (r.role !== "assistant") continue;
      for (let h of r.content) if (h.type === "tool_use" && Va(h)) {
        let i = a.get(h.id);
        if (i?.run.status === "blocked-on-user" && T === "system:disposed") continue;
        if (!i || i.run.status === "blocked-on-user") this.callbacks.updateThread({
          type: "tool:data",
          toolUse: h.id,
          data: {
            status: "cancelled",
            reason: T
          }
        });
      }
    }
  }
  async cancelInProgressTools(T) {
    for (let [R, a] of this.runningTools) a.abort.abort(), a.subscription?.unsubscribe(), await this.cancelTool(R, T);
    this.runningTools.clear();
  }
  findToolUseById(T) {
    let R = this.callbacks.getThread(),
      a = dt(R, "assistant");
    if (!a) return;
    for (let e of a.content) if (e.type === "tool_use" && e.id === T) return e;
    return;
  }
  isDangerousToResume(T) {
    return T === U8 || T === S2 || T === Eb || T === Dt || T === j0T;
  }
  abortToolOp(T) {
    let R = this.runningTools.get(T);
    if (R) R.abort.abort(), this.runningTools.delete(T);
  }
  abortAllTools() {
    for (let [T, R] of this.runningTools) {
      let a = this.toolMessages.get(T);
      if (a) {
        try {
          a.next({
            type: "stop-command"
          }), a.complete();
        } catch (e) {
          J.warn("Failed to send stop-command during disposal", {
            toolId: T,
            error: e
          });
        }
        this.toolMessages.delete(T);
      }
      R.abort.abort();
    }
    this.runningTools.clear();
  }
}
class lVT {
  options;
  clientID;
  transport;
  sentApprovalRequests = new Set();
  discoveredGuidanceFileURIs = new Set();
  activeTools = new Map();
  pendingTerminalResults = new Map();
  gitStatusQueue = {
    inFlight: !1,
    queued: !1,
    queuedToolCallId: void 0
  };
  disposing = !1;
  constructor(T) {
    this.options = T, this.clientID = T.clientID, this.transport = T.transport;
  }
  async handleToolLease(T) {
    if (this.disposing) return;
    let {
      toolCallId: R,
      toolName: a
    } = T;
    if (this.activeTools.has(R)) {
      this.options.log.info(`${this.clientID} ignoring duplicate active lease`, {
        toolCallId: R,
        toolName: a
      });
      return;
    }
    let e = this.pendingTerminalResults.get(R);
    if (e) {
      this.options.log.info(`${this.clientID} replaying pending terminal result for duplicate lease`, {
        toolCallId: R,
        toolName: a
      }), this.sendTerminalResult(R, e, "flush");
      return;
    }
    let t = Date.now();
    this.options.log.info(`${this.clientID} executing tool: ${a}`, {
      toolCallId: R
    }), this.options.log.wsMessage("SEND", this.clientID, {
      type: "executor_tool_lease_ack",
      toolCallId: R
    }), this.transport.ackToolLease(R);
    let r = new AbortController(),
      h = {
        subscription: {
          unsubscribe: () => {}
        },
        abortController: r
      };
    this.activeTools.set(R, h);
    let i = () => {
      this.activeTools.delete(R);
    };
    try {
      let c = await this.options.invokeTool(T);
      this.options.log.info(`${this.clientID} tool service returned observable`, {
        toolCallId: R,
        toolName: a,
        elapsedMs: Date.now() - t
      });
      let s = c.subscribe({
        next: A => {
          if (r.signal.aborted) return;
          let l = A.status === "in-progress" ? A.progress ?? A.result : void 0;
          if (l !== void 0 && !mp0(l)) this.options.log.wsMessage("SEND", this.clientID, {
            type: "tool_progress",
            toolCallId: R,
            progress: l
          }), this.sendTransportMessage("tool_progress", () => this.transport.sendToolProgress(R, l), {
            toolCallId: R
          });
          if (wt(A.status)) this.sendToolResult(R, A), i(), s.unsubscribe();
          if (A.status === "blocked-on-user") this.options.log.info(`${this.clientID} awaiting tool approval`, {
            toolCallId: R,
            toolName: a
          });
        },
        error: A => {
          if (r.signal.aborted) {
            i();
            return;
          }
          this.options.log.error(`${this.clientID} tool execution failed: ${a}`, A);
          let l = {
            status: "error",
            error: {
              message: A instanceof Error ? A.message : "Unknown error"
            }
          };
          this.sendToolResult(R, l), i();
        }
      });
      h.subscription = s;
    } catch (c) {
      this.options.log.error(`${this.clientID} tool execution setup failed: ${a}`, c);
      let s = {
        status: "error",
        error: {
          message: c instanceof Error ? c.message : String(c)
        }
      };
      this.sendToolResult(R, s), i();
    }
  }
  flushBufferedTerminalResults() {
    if (this.disposing || this.pendingTerminalResults.size === 0) return;
    for (let [T, R] of this.pendingTerminalResults) this.sendTerminalResult(T, R, "flush");
  }
  handleToolRevocation(T) {
    if (this.disposing) return;
    let {
      toolCallId: R,
      reason: a
    } = T;
    this.options.log.info(`${this.clientID} lease revoked: ${R}`, {
      reason: a
    });
    let e = this.activeTools.get(R);
    if (e) e.abortController.abort(), e.subscription.unsubscribe(), this.activeTools.delete(R);
    this.sentApprovalRequests.delete(R);
  }
  async handleRollbackRequest(T, R, a) {
    if (this.disposing) return;
    try {
      if (R.length > 0) await a(new Set(R));
      this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_rollback_ack",
        editId: T,
        ok: !0
      }), this.sendTransportMessage("executor_rollback_ack", () => this.transport.sendExecutorRollbackAck(T, !0), {
        editId: T
      }), this.queueGitStatusSnapshot();
    } catch (e) {
      let t = e instanceof Error ? e.message : String(e);
      this.options.log.error(`${this.clientID} rollback failed`, e), this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_rollback_ack",
        editId: T,
        ok: !1,
        error: t
      }), this.sendTransportMessage("executor_rollback_ack", () => this.transport.sendExecutorRollbackAck(T, !1, t), {
        editId: T
      });
    }
  }
  triggerGitStatus(T) {
    this.queueGitStatusSnapshot(T);
  }
  dispose() {
    this.disposing = !0;
    for (let [, T] of this.activeTools) T.abortController.abort(), T.subscription.unsubscribe();
    this.activeTools.clear(), this.pendingTerminalResults.clear();
  }
  sendToolResult(T, R) {
    let a = Date.now(),
      e = this.toToolRun(R),
      {
        run: t,
        files: r
      } = this.extractGuidanceFromRun(e);
    if (r.length > 0) this.sendGuidanceDiscovery(T, r);
    this.sendTerminalResult(T, t, "live", {
      guidanceFileCount: r.length,
      elapsedMs: Date.now() - a
    }), this.sentApprovalRequests.delete(T), this.queueGitStatusSnapshot(T);
  }
  sendTerminalResult(T, R, a, e) {
    this.options.log.wsMessage("SEND", this.clientID, {
      type: "executor_tool_result",
      toolCallId: T,
      run: R
    });
    let t = this.sendTransportMessage("executor_tool_result", () => this.transport.sendExecutorToolResult(T, R), {
      toolCallId: T,
      source: a
    });
    if (t) this.pendingTerminalResults.delete(T);else this.pendingTerminalResults.set(T, R);
    return this.options.log.info(`${this.clientID} executor_tool_result send attempted`, {
      toolCallId: T,
      status: R.status,
      sent: t,
      source: a,
      ...e
    }), t;
  }
  sendGuidanceDiscovery(T, R) {
    let a = this.options.batchGuidanceFiles(R, T);
    for (let e = 0; e < a.length; e++) {
      let t = a[e];
      if (!t) continue;
      let r = e === a.length - 1;
      if (this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_guidance_discovery",
        toolCallId: T,
        fileCount: t.length,
        isLast: r
      }), !this.sendTransportMessage("executor_guidance_discovery", () => this.transport.sendExecutorGuidanceDiscovery({
        toolCallId: T,
        files: t,
        isLast: r
      }), {
        toolCallId: T,
        isLast: r,
        fileCount: t.length
      })) return;
    }
  }
  queueGitStatusSnapshot(T) {
    if (this.disposing || !this.options.captureGitStatus) return;
    if (this.gitStatusQueue.inFlight) {
      if (this.gitStatusQueue.queued = !0, T) this.gitStatusQueue.queuedToolCallId = T;
      return;
    }
    this.gitStatusQueue.inFlight = !0, this.sendGitStatusSnapshot(T).finally(() => {
      if (this.gitStatusQueue.inFlight = !1, !this.gitStatusQueue.queued) return;
      let R = this.gitStatusQueue.queuedToolCallId;
      this.gitStatusQueue.queued = !1, this.gitStatusQueue.queuedToolCallId = void 0, this.queueGitStatusSnapshot(R);
    });
  }
  async sendGitStatusSnapshot(T) {
    try {
      if (!this.options.captureGitStatus) return;
      let R = await this.options.captureGitStatus();
      this.options.log.wsMessage("SEND", this.clientID, {
        type: "executor_artifact_upsert",
        available: R.available,
        fileCount: R.files.length,
        toolCallId: T,
        branch: R.branch,
        head: R.head
      }), this.transport.sendExecutorArtifactUpsert(hVT(R), T);
    } catch (R) {
      this.options.log.error("Failed to send git status snapshot", R);
    }
  }
  toToolRun(T) {
    switch (T.status) {
      case "done":
        return {
          status: "done",
          result: T.result,
          progress: T.progress,
          trackFiles: T.trackFiles ? [...T.trackFiles] : void 0
        };
      case "error":
        return {
          status: "error",
          error: {
            message: T.error ? this.options.renderToolRunError(T.error) : "Tool execution failed"
          }
        };
      case "rejected-by-user":
        return {
          status: "rejected-by-user",
          reason: T.reason
        };
      case "cancelled":
        return {
          status: "cancelled",
          reason: T.reason
        };
      default:
        return {
          status: "error",
          error: {
            message: `Unexpected status: ${T.status}`
          }
        };
    }
  }
  extractGuidanceFromRun(T) {
    if (T.status !== "done") return {
      run: T,
      files: []
    };
    if (!T.result || typeof T.result !== "object" || Array.isArray(T.result)) return {
      run: T,
      files: []
    };
    let R = T.result;
    if (!("discoveredGuidanceFiles" in R)) return {
      run: T,
      files: []
    };
    let a = xn0(R.discoveredGuidanceFiles),
      {
        discoveredGuidanceFiles: e,
        ...t
      } = R;
    return {
      run: {
        ...T,
        result: t
      },
      files: a
    };
  }
  sendTransportMessage(T, R, a) {
    try {
      return R(), !0;
    } catch (e) {
      if (e instanceof z8) return this.options.log.info(`${this.clientID} dropped ${T} while reconnecting`, {
        messageType: T,
        ...a
      }), this.options.onTransportSendFailure?.(this.clientID, T, e, a), !1;
      return this.options.log.error(`${this.clientID} failed to send ${T}`, e), !1;
    }
  }
}
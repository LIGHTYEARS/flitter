function tlT(T, R) {
  let a = fl(T, R);
  if (!a.success) throw a.error;
  return a.data;
}
class PMT {
  constructor(T) {
    if (this._options = T, this._requestMessageId = 0, this._requestHandlers = new Map(), this._requestHandlerAbortControllers = new Map(), this._notificationHandlers = new Map(), this._responseHandlers = new Map(), this._progressHandlers = new Map(), this._timeoutInfo = new Map(), this._pendingDebouncedNotifications = new Set(), this._taskProgressTokens = new Map(), this._requestResolvers = new Map(), this.setNotificationHandler(gL, R => {
      this._oncancel(R);
    }), this.setNotificationHandler(vL, R => {
      this._onprogress(R);
    }), this.setRequestHandler($L, R => ({})), this._taskStore = T?.taskStore, this._taskMessageQueue = T?.taskMessageQueue, this._taskStore) this.setRequestHandler(jL, async (R, a) => {
      let e = await this._taskStore.getTask(R.params.taskId, a.sessionId);
      if (!e) throw new l9(c9.InvalidParams, "Failed to retrieve task: Task not found");
      return {
        ...e
      };
    }), this.setRequestHandler(OL, async (R, a) => {
      let e = async () => {
        let t = R.params.taskId;
        if (this._taskMessageQueue) {
          let h;
          while (h = await this._taskMessageQueue.dequeue(t, a.sessionId)) {
            if (h.type === "response" || h.type === "error") {
              let i = h.message,
                c = i.id,
                s = this._requestResolvers.get(c);
              if (s) {
                if (this._requestResolvers.delete(c), h.type === "response") s(i);else {
                  let A = i,
                    l = new l9(A.error.code, A.error.message, A.error.data);
                  s(l);
                }
              } else {
                let A = h.type === "response" ? "Response" : "Error";
                this._onerror(Error(`${A} handler missing for request ${c}`));
              }
              continue;
            }
            await this._transport?.send(h.message, {
              relatedRequestId: a.requestId
            });
          }
        }
        let r = await this._taskStore.getTask(t, a.sessionId);
        if (!r) throw new l9(c9.InvalidParams, `Task not found: ${t}`);
        if (!qp(r.status)) return await this._waitForTaskUpdate(t, a.signal), await e();
        if (qp(r.status)) {
          let h = await this._taskStore.getTaskResult(t, a.sessionId);
          return this._clearTaskQueue(t), {
            ...h,
            _meta: {
              ...h._meta,
              [f_]: {
                taskId: t
              }
            }
          };
        }
        return await e();
      };
      return await e();
    }), this.setRequestHandler(dL, async (R, a) => {
      try {
        let {
          tasks: e,
          nextCursor: t
        } = await this._taskStore.listTasks(R.params?.cursor, a.sessionId);
        return {
          tasks: e,
          nextCursor: t,
          _meta: {}
        };
      } catch (e) {
        throw new l9(c9.InvalidParams, `Failed to list tasks: ${e instanceof Error ? e.message : String(e)}`);
      }
    }), this.setRequestHandler(CL, async (R, a) => {
      try {
        let e = await this._taskStore.getTask(R.params.taskId, a.sessionId);
        if (!e) throw new l9(c9.InvalidParams, `Task not found: ${R.params.taskId}`);
        if (qp(e.status)) throw new l9(c9.InvalidParams, `Cannot cancel task in terminal status: ${e.status}`);
        await this._taskStore.updateTaskStatus(R.params.taskId, "cancelled", "Client cancelled task execution.", a.sessionId), this._clearTaskQueue(R.params.taskId);
        let t = await this._taskStore.getTask(R.params.taskId, a.sessionId);
        if (!t) throw new l9(c9.InvalidParams, `Task not found after cancellation: ${R.params.taskId}`);
        return {
          _meta: {},
          ...t
        };
      } catch (e) {
        if (e instanceof l9) throw e;
        throw new l9(c9.InvalidRequest, `Failed to cancel task: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
  async _oncancel(T) {
    if (!T.params.requestId) return;
    this._requestHandlerAbortControllers.get(T.params.requestId)?.abort(T.params.reason);
  }
  _setupTimeout(T, R, a, e, t = !1) {
    this._timeoutInfo.set(T, {
      timeoutId: setTimeout(e, R),
      startTime: Date.now(),
      timeout: R,
      maxTotalTimeout: a,
      resetTimeoutOnProgress: t,
      onTimeout: e
    });
  }
  _resetTimeout(T) {
    let R = this._timeoutInfo.get(T);
    if (!R) return !1;
    let a = Date.now() - R.startTime;
    if (R.maxTotalTimeout && a >= R.maxTotalTimeout) throw this._timeoutInfo.delete(T), l9.fromError(c9.RequestTimeout, "Maximum total timeout exceeded", {
      maxTotalTimeout: R.maxTotalTimeout,
      totalElapsed: a
    });
    return clearTimeout(R.timeoutId), R.timeoutId = setTimeout(R.onTimeout, R.timeout), !0;
  }
  _cleanupTimeout(T) {
    let R = this._timeoutInfo.get(T);
    if (R) clearTimeout(R.timeoutId), this._timeoutInfo.delete(T);
  }
  async connect(T) {
    if (this._transport) throw Error("Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.");
    this._transport = T;
    let R = this.transport?.onclose;
    this._transport.onclose = () => {
      R?.(), this._onclose();
    };
    let a = this.transport?.onerror;
    this._transport.onerror = t => {
      a?.(t), this._onerror(t);
    };
    let e = this._transport?.onmessage;
    this._transport.onmessage = (t, r) => {
      if (e?.(t, r), zg(t) || WmR(t)) this._onresponse(t);else if (cG(t)) this._onrequest(t, r);else if (HmR(t)) this._onnotification(t);else this._onerror(Error(`Unknown message type: ${JSON.stringify(t)}`));
    }, await this._transport.start();
  }
  _onclose() {
    let T = this._responseHandlers;
    this._responseHandlers = new Map(), this._progressHandlers.clear(), this._taskProgressTokens.clear(), this._pendingDebouncedNotifications.clear();
    for (let a of this._requestHandlerAbortControllers.values()) a.abort();
    this._requestHandlerAbortControllers.clear();
    let R = l9.fromError(c9.ConnectionClosed, "Connection closed");
    this._transport = void 0, this.onclose?.();
    for (let a of T.values()) a(R);
  }
  _onerror(T) {
    this.onerror?.(T);
  }
  _onnotification(T) {
    let R = this._notificationHandlers.get(T.method) ?? this.fallbackNotificationHandler;
    if (R === void 0) return;
    Promise.resolve().then(() => R(T)).catch(a => this._onerror(Error(`Uncaught error in notification handler: ${a}`)));
  }
  _onrequest(T, R) {
    let a = this._requestHandlers.get(T.method) ?? this.fallbackRequestHandler,
      e = this._transport,
      t = T.params?._meta?.[f_]?.taskId;
    if (a === void 0) {
      let s = {
        jsonrpc: "2.0",
        id: T.id,
        error: {
          code: c9.MethodNotFound,
          message: "Method not found"
        }
      };
      if (t && this._taskMessageQueue) this._enqueueTaskMessage(t, {
        type: "error",
        message: s,
        timestamp: Date.now()
      }, e?.sessionId).catch(A => this._onerror(Error(`Failed to enqueue error response: ${A}`)));else e?.send(s).catch(A => this._onerror(Error(`Failed to send an error response: ${A}`)));
      return;
    }
    let r = new AbortController();
    this._requestHandlerAbortControllers.set(T.id, r);
    let h = UmR(T.params) ? T.params.task : void 0,
      i = this._taskStore ? this.requestTaskStore(T, e?.sessionId) : void 0,
      c = {
        signal: r.signal,
        sessionId: e?.sessionId,
        _meta: T.params?._meta,
        sendNotification: async s => {
          if (r.signal.aborted) return;
          let A = {
            relatedRequestId: T.id
          };
          if (t) A.relatedTask = {
            taskId: t
          };
          await this.notification(s, A);
        },
        sendRequest: async (s, A, l) => {
          if (r.signal.aborted) throw new l9(c9.ConnectionClosed, "Request was cancelled");
          let o = {
            ...l,
            relatedRequestId: T.id
          };
          if (t && !o.relatedTask) o.relatedTask = {
            taskId: t
          };
          let n = o.relatedTask?.taskId ?? t;
          if (n && i) await i.updateTaskStatus(n, "input_required");
          return await this.request(s, A, o);
        },
        authInfo: R?.authInfo,
        requestId: T.id,
        requestInfo: R?.requestInfo,
        taskId: t,
        taskStore: i,
        taskRequestedTtl: h?.ttl,
        closeSSEStream: R?.closeSSEStream,
        closeStandaloneSSEStream: R?.closeStandaloneSSEStream
      };
    Promise.resolve().then(() => {
      if (h) this.assertTaskHandlerCapability(T.method);
    }).then(() => a(T, c)).then(async s => {
      if (r.signal.aborted) return;
      let A = {
        result: s,
        jsonrpc: "2.0",
        id: T.id
      };
      if (t && this._taskMessageQueue) await this._enqueueTaskMessage(t, {
        type: "response",
        message: A,
        timestamp: Date.now()
      }, e?.sessionId);else await e?.send(A);
    }, async s => {
      if (r.signal.aborted) return;
      let A = {
        jsonrpc: "2.0",
        id: T.id,
        error: {
          code: Number.isSafeInteger(s.code) ? s.code : c9.InternalError,
          message: s.message ?? "Internal error",
          ...(s.data !== void 0 && {
            data: s.data
          })
        }
      };
      if (t && this._taskMessageQueue) await this._enqueueTaskMessage(t, {
        type: "error",
        message: A,
        timestamp: Date.now()
      }, e?.sessionId);else await e?.send(A);
    }).catch(s => this._onerror(Error(`Failed to send response: ${s}`))).finally(() => {
      this._requestHandlerAbortControllers.delete(T.id);
    });
  }
  _onprogress(T) {
    let {
        progressToken: R,
        ...a
      } = T.params,
      e = Number(R),
      t = this._progressHandlers.get(e);
    if (!t) {
      this._onerror(Error(`Received a progress notification for an unknown token: ${JSON.stringify(T)}`));
      return;
    }
    let r = this._responseHandlers.get(e),
      h = this._timeoutInfo.get(e);
    if (h && r && h.resetTimeoutOnProgress) try {
      this._resetTimeout(e);
    } catch (i) {
      this._responseHandlers.delete(e), this._progressHandlers.delete(e), this._cleanupTimeout(e), r(i);
      return;
    }
    t(a);
  }
  _onresponse(T) {
    let R = Number(T.id),
      a = this._requestResolvers.get(R);
    if (a) {
      if (this._requestResolvers.delete(R), zg(T)) a(T);else {
        let r = new l9(T.error.code, T.error.message, T.error.data);
        a(r);
      }
      return;
    }
    let e = this._responseHandlers.get(R);
    if (e === void 0) {
      this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(T)}`));
      return;
    }
    this._responseHandlers.delete(R), this._cleanupTimeout(R);
    let t = !1;
    if (zg(T) && T.result && typeof T.result === "object") {
      let r = T.result;
      if (r.task && typeof r.task === "object") {
        let h = r.task;
        if (typeof h.taskId === "string") t = !0, this._taskProgressTokens.set(h.taskId, R);
      }
    }
    if (!t) this._progressHandlers.delete(R);
    if (zg(T)) e(T);else {
      let r = l9.fromError(T.error.code, T.error.message, T.error.data);
      e(r);
    }
  }
  get transport() {
    return this._transport;
  }
  async close() {
    await this._transport?.close();
  }
  async *requestStream(T, R, a) {
    let {
      task: e
    } = a ?? {};
    if (!e) {
      try {
        yield {
          type: "result",
          result: await this.request(T, R, a)
        };
      } catch (r) {
        yield {
          type: "error",
          error: r instanceof l9 ? r : new l9(c9.InternalError, String(r))
        };
      }
      return;
    }
    let t;
    try {
      let r = await this.request(T, jP, a);
      if (r.task) t = r.task.taskId, yield {
        type: "taskCreated",
        task: r.task
      };else throw new l9(c9.InternalError, "Task creation did not return a task");
      while (!0) {
        let h = await this.getTask({
          taskId: t
        }, a);
        if (yield {
          type: "taskStatus",
          task: h
        }, qp(h.status)) {
          if (h.status === "completed") yield {
            type: "result",
            result: await this.getTaskResult({
              taskId: t
            }, R, a)
          };else if (h.status === "failed") yield {
            type: "error",
            error: new l9(c9.InternalError, `Task ${t} failed`)
          };else if (h.status === "cancelled") yield {
            type: "error",
            error: new l9(c9.InternalError, `Task ${t} was cancelled`)
          };
          return;
        }
        if (h.status === "input_required") {
          yield {
            type: "result",
            result: await this.getTaskResult({
              taskId: t
            }, R, a)
          };
          return;
        }
        let i = h.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1000;
        await new Promise(c => setTimeout(c, i)), a?.signal?.throwIfAborted();
      }
    } catch (r) {
      yield {
        type: "error",
        error: r instanceof l9 ? r : new l9(c9.InternalError, String(r))
      };
    }
  }
  request(T, R, a) {
    let {
      relatedRequestId: e,
      resumptionToken: t,
      onresumptiontoken: r,
      task: h,
      relatedTask: i
    } = a ?? {};
    return new Promise((c, s) => {
      let A = b => {
        s(b);
      };
      if (!this._transport) {
        A(Error("Not connected"));
        return;
      }
      if (this._options?.enforceStrictCapabilities === !0) try {
        if (this.assertCapabilityForMethod(T.method), h) this.assertTaskCapability(T.method);
      } catch (b) {
        A(b);
        return;
      }
      a?.signal?.throwIfAborted();
      let l = this._requestMessageId++,
        o = {
          ...T,
          jsonrpc: "2.0",
          id: l
        };
      if (a?.onprogress) this._progressHandlers.set(l, a.onprogress), o.params = {
        ...T.params,
        _meta: {
          ...(T.params?._meta || {}),
          progressToken: l
        }
      };
      if (h) o.params = {
        ...o.params,
        task: h
      };
      if (i) o.params = {
        ...o.params,
        _meta: {
          ...(o.params?._meta || {}),
          [f_]: i
        }
      };
      let n = b => {
        this._responseHandlers.delete(l), this._progressHandlers.delete(l), this._cleanupTimeout(l), this._transport?.send({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: {
            requestId: l,
            reason: String(b)
          }
        }, {
          relatedRequestId: e,
          resumptionToken: t,
          onresumptiontoken: r
        }).catch(u => this._onerror(Error(`Failed to send cancellation: ${u}`)));
        let y = b instanceof l9 ? b : new l9(c9.RequestTimeout, String(b));
        s(y);
      };
      this._responseHandlers.set(l, b => {
        if (a?.signal?.aborted) return;
        if (b instanceof Error) return s(b);
        try {
          let y = fl(R, b.result);
          if (!y.success) s(y.error);else c(y.data);
        } catch (y) {
          s(y);
        }
      }), a?.signal?.addEventListener("abort", () => {
        n(a?.signal?.reason);
      });
      let p = a?.timeout ?? ruR,
        _ = () => n(l9.fromError(c9.RequestTimeout, "Request timed out", {
          timeout: p
        }));
      this._setupTimeout(l, p, a?.maxTotalTimeout, _, a?.resetTimeoutOnProgress ?? !1);
      let m = i?.taskId;
      if (m) {
        let b = y => {
          let u = this._responseHandlers.get(l);
          if (u) u(y);else this._onerror(Error(`Response handler missing for side-channeled request ${l}`));
        };
        this._requestResolvers.set(l, b), this._enqueueTaskMessage(m, {
          type: "request",
          message: o,
          timestamp: Date.now()
        }).catch(y => {
          this._cleanupTimeout(l), s(y);
        });
      } else this._transport.send(o, {
        relatedRequestId: e,
        resumptionToken: t,
        onresumptiontoken: r
      }).catch(b => {
        this._cleanupTimeout(l), s(b);
      });
    });
  }
  async getTask(T, R) {
    return this.request({
      method: "tasks/get",
      params: T
    }, SL, R);
  }
  async getTaskResult(T, R, a) {
    return this.request({
      method: "tasks/result",
      params: T
    }, R, a);
  }
  async listTasks(T, R) {
    return this.request({
      method: "tasks/list",
      params: T
    }, EL, R);
  }
  async cancelTask(T, R) {
    return this.request({
      method: "tasks/cancel",
      params: T
    }, YLT, R);
  }
  async notification(T, R) {
    if (!this._transport) throw Error("Not connected");
    this.assertNotificationCapability(T.method);
    let a = R?.relatedTask?.taskId;
    if (a) {
      let t = {
        ...T,
        jsonrpc: "2.0",
        params: {
          ...T.params,
          _meta: {
            ...(T.params?._meta || {}),
            [f_]: R.relatedTask
          }
        }
      };
      await this._enqueueTaskMessage(a, {
        type: "notification",
        message: t,
        timestamp: Date.now()
      });
      return;
    }
    if ((this._options?.debouncedNotificationMethods ?? []).includes(T.method) && !T.params && !R?.relatedRequestId && !R?.relatedTask) {
      if (this._pendingDebouncedNotifications.has(T.method)) return;
      this._pendingDebouncedNotifications.add(T.method), Promise.resolve().then(() => {
        if (this._pendingDebouncedNotifications.delete(T.method), !this._transport) return;
        let t = {
          ...T,
          jsonrpc: "2.0"
        };
        if (R?.relatedTask) t = {
          ...t,
          params: {
            ...t.params,
            _meta: {
              ...(t.params?._meta || {}),
              [f_]: R.relatedTask
            }
          }
        };
        this._transport?.send(t, R).catch(r => this._onerror(r));
      });
      return;
    }
    let e = {
      ...T,
      jsonrpc: "2.0"
    };
    if (R?.relatedTask) e = {
      ...e,
      params: {
        ...e.params,
        _meta: {
          ...(e.params?._meta || {}),
          [f_]: R.relatedTask
        }
      }
    };
    await this._transport.send(e, R);
  }
  setRequestHandler(T, R) {
    let a = elT(T);
    this.assertRequestHandlerCapability(a), this._requestHandlers.set(a, (e, t) => {
      let r = tlT(T, e);
      return Promise.resolve(R(r, t));
    });
  }
  removeRequestHandler(T) {
    this._requestHandlers.delete(T);
  }
  assertCanSetRequestHandler(T) {
    if (this._requestHandlers.has(T)) throw Error(`A request handler for ${T} already exists, which would be overridden`);
  }
  setNotificationHandler(T, R) {
    let a = elT(T);
    this._notificationHandlers.set(a, e => {
      let t = tlT(T, e);
      return Promise.resolve(R(t));
    });
  }
  removeNotificationHandler(T) {
    this._notificationHandlers.delete(T);
  }
  _cleanupTaskProgressHandler(T) {
    let R = this._taskProgressTokens.get(T);
    if (R !== void 0) this._progressHandlers.delete(R), this._taskProgressTokens.delete(T);
  }
  async _enqueueTaskMessage(T, R, a) {
    if (!this._taskStore || !this._taskMessageQueue) throw Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
    let e = this._options?.maxTaskQueueSize;
    await this._taskMessageQueue.enqueue(T, R, a, e);
  }
  async _clearTaskQueue(T, R) {
    if (this._taskMessageQueue) {
      let a = await this._taskMessageQueue.dequeueAll(T, R);
      for (let e of a) if (e.type === "request" && cG(e.message)) {
        let t = e.message.id,
          r = this._requestResolvers.get(t);
        if (r) r(new l9(c9.InternalError, "Task cancelled or completed")), this._requestResolvers.delete(t);else this._onerror(Error(`Resolver missing for request ${t} during task ${T} cleanup`));
      }
    }
  }
  async _waitForTaskUpdate(T, R) {
    let a = this._options?.defaultTaskPollInterval ?? 1000;
    try {
      let e = await this._taskStore?.getTask(T);
      if (e?.pollInterval) a = e.pollInterval;
    } catch {}
    return new Promise((e, t) => {
      if (R.aborted) {
        t(new l9(c9.InvalidRequest, "Request cancelled"));
        return;
      }
      let r = setTimeout(e, a);
      R.addEventListener("abort", () => {
        clearTimeout(r), t(new l9(c9.InvalidRequest, "Request cancelled"));
      }, {
        once: !0
      });
    });
  }
  requestTaskStore(T, R) {
    let a = this._taskStore;
    if (!a) throw Error("No task store configured");
    return {
      createTask: async e => {
        if (!T) throw Error("No request provided");
        return await a.createTask(e, T.id, {
          method: T.method,
          params: T.params
        }, R);
      },
      getTask: async e => {
        let t = await a.getTask(e, R);
        if (!t) throw new l9(c9.InvalidParams, "Failed to retrieve task: Task not found");
        return t;
      },
      storeTaskResult: async (e, t, r) => {
        await a.storeTaskResult(e, t, r, R);
        let h = await a.getTask(e, R);
        if (h) {
          let i = W$.parse({
            method: "notifications/tasks/status",
            params: h
          });
          if (await this.notification(i), qp(h.status)) this._cleanupTaskProgressHandler(e);
        }
      },
      getTaskResult: e => {
        return a.getTaskResult(e, R);
      },
      updateTaskStatus: async (e, t, r) => {
        let h = await a.getTask(e, R);
        if (!h) throw new l9(c9.InvalidParams, `Task "${e}" not found - it may have been cleaned up`);
        if (qp(h.status)) throw new l9(c9.InvalidParams, `Cannot update task "${e}" from terminal status "${h.status}" to "${t}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
        await a.updateTaskStatus(e, t, r, R);
        let i = await a.getTask(e, R);
        if (i) {
          let c = W$.parse({
            method: "notifications/tasks/status",
            params: i
          });
          if (await this.notification(c), qp(i.status)) this._cleanupTaskProgressHandler(e);
        }
      },
      listTasks: e => {
        return a.listTasks(e, R);
      }
    };
  }
}
// Module: oauth-auth-provider
// Original: segment1[202906:238279]
// Type: Scope-hoisted
// Exports: rlT, tuR, XuR, ZuR, JuR, LL, TyR, $q, NMT, instead, A, l, o, n, p, RyR, ayR, gG, ilT, eyR
// Category: cli

et(T.method) ?? this.fallbackNotificationHandler;
if (R === void 0) return;
Promise.resolve().then(() => R(T)).catch((a) => this._onerror(Error(`Uncaught error in notification handler: ${a}`)))
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
    }, e?.sessionId).catch((A) => this._onerror(Error(`Failed to enqueue error response: ${A}`)));
    else e?.send(s).catch((A) => this._onerror(Error(`Failed to send an error response: ${A}`)));
    return
  }
  let r = new AbortController;
  this._requestHandlerAbortControllers.set(T.id, r);
  let h = UmR(T.params) ? T.params.task : void 0,
    i = this._taskStore ? this.requestTaskStore(T, e?.sessionId) : void 0,
    c = {
      signal: r.signal,
      sessionId: e?.sessionId,
      _meta: T.params?._meta,
      sendNotification: async (s) => {
        if (r.signal.aborted) return;
        let A = {
          relatedRequestId: T.id
        };
        if (t) A.relatedTask = {
          taskId: t
        };
        await this.notification(s, A)
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
        return await this.request(s, A, o)
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
    if (h) this.assertTaskHandlerCapability(T.method)
  }).then(() => a(T, c)).then(async (s) => {
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
    }, e?.sessionId);
    else await e?.send(A)
  }, async (s) => {
    if (r.signal.aborted) return;
    let A = {
      jsonrpc: "2.0",
      id: T.id,
      error: {
        code: Number.isSafeInteger(s.code) ? s.code : c9.InternalError,
        message: s.message ?? "Internal error",
        ...s.data !== void 0 && {
          data: s.data
        }
      }
    };
    if (t && this._taskMessageQueue) await this._enqueueTaskMessage(t, {
      type: "error",
      message: A,
      timestamp: Date.now()
    }, e?.sessionId);
    else await e?.send(A)
  }).catch((s) => this._onerror(Error(`Failed to send response: ${s}`))).finally(() => {
    this._requestHandlerAbortControllers.delete(T.id)
  })
}
_onprogress(T) {
  let {
    progressToken: R,
    ...a
  } = T.params, e = Number(R), t = this._progressHandlers.get(e);
  if (!t) {
    this._onerror(Error(`Received a progress notification for an unknown token: ${JSON.stringify(T)}`));
    return
  }
  let r = this._responseHandlers.get(e),
    h = this._timeoutInfo.get(e);
  if (h && r && h.resetTimeoutOnProgress) try {
    this._resetTimeout(e)
  }
  catch (i) {
    this._responseHandlers.delete(e), this._progressHandlers.delete(e), this._cleanupTimeout(e), r(i);
    return
  }
  t(a)
}
_onresponse(T) {
  let R = Number(T.id),
    a = this._requestResolvers.get(R);
  if (a) {
    if (this._requestResolvers.delete(R), zg(T)) a(T);
    else {
      let r = new l9(T.error.code, T.error.message, T.error.data);
      a(r)
    }
    return
  }
  let e = this._responseHandlers.get(R);
  if (e === void 0) {
    this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(T)}`));
    return
  }
  this._responseHandlers.delete(R), this._cleanupTimeout(R);
  let t = !1;
  if (zg(T) && T.result && typeof T.result === "object") {
    let r = T.result;
    if (r.task && typeof r.task === "object") {
      let h = r.task;
      if (typeof h.taskId === "string") t = !0, this._taskProgressTokens.set(h.taskId, R)
    }
  }
  if (!t) this._progressHandlers.delete(R);
  if (zg(T)) e(T);
  else {
    let r = l9.fromError(T.error.code, T.error.message, T.error.data);
    e(r)
  }
}
get transport() {
  return this._transport
}
async close() {
  await this._transport?.close()
}
async * requestStream(T, R, a) {
  let {
    task: e
  } = a ?? {};
  if (!e) {
    try {
      yield {
        type: "result",
        result: await this.request(T, R, a)
      }
    } catch (r) {
      yield {
        type: "error",
        error: r instanceof l9 ? r : new l9(c9.InternalError, String(r))
      }
    }
    return
  }
  let t;
  try {
    let r = await this.request(T, jP, a);
    if (r.task) t = r.task.taskId, yield {
      type: "taskCreated",
      task: r.task
    };
    else throw new l9(c9.InternalError, "Task creation did not return a task");
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
        };
        else if (h.status === "failed") yield {
          type: "error",
          error: new l9(c9.InternalError, `Task ${t} failed`)
        };
        else if (h.status === "cancelled") yield {
          type: "error",
          error: new l9(c9.InternalError, `Task ${t} was cancelled`)
        };
        return
      }
      if (h.status === "input_required") {
        yield {
          type: "result",
          result: await this.getTaskResult({
            taskId: t
          }, R, a)
        };
        return
      }
      let i = h.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1000;
      await new Promise((c) => setTimeout(c, i)), a?.signal?.throwIfAborted()
    }
  } catch (r) {
    yield {
      type: "error",
      error: r instanceof l9 ? r : new l9(c9.InternalError, String(r))
    }
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
    let A = (b) => {
      s(b)
    };
    if (!this._transport) {
      A(Error("Not connected"));
      return
    }
    if (this._options?.enforceStrictCapabilities === !0) try {
      if (this.assertCapabilityForMethod(T.method), h) this.assertTaskCapability(T.method)
    }
    catch (b) {
      A(b);
      return
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
        ...T.params?._meta || {},
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
        ...o.params?._meta || {},
        [f_]: i
      }
    };
    let n = (b) => {
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
      }).catch((u) => this._onerror(Error(`Failed to send cancellation: ${u}`)));
      let y = b instanceof l9 ? b : new l9(c9.RequestTimeout, String(b));
      s(y)
    };
    this._responseHandlers.set(l, (b) => {
      if (a?.signal?.aborted) return;
      if (b instanceof Error) return s(b);
      try {
        let y = fl(R, b.result);
        if (!y.success) s(y.error);
        else c(y.data)
      } catch (y) {
        s(y)
      }
    }), a?.signal?.addEventListener("abort", () => {
      n(a?.signal?.reason)
    });
    let p = a?.timeout ?? ruR,
      _ = () => n(l9.fromError(c9.RequestTimeout, "Request timed out", {
        timeout: p
      }));
    this._setupTimeout(l, p, a?.maxTotalTimeout, _, a?.resetTimeoutOnProgress ?? !1);
    let m = i?.taskId;
    if (m) {
      let b = (y) => {
        let u = this._responseHandlers.get(l);
        if (u) u(y);
        else this._onerror(Error(`Response handler missing for side-channeled request ${l}`))
      };
      this._requestResolvers.set(l, b), this._enqueueTaskMessage(m, {
        type: "request",
        message: o,
        timestamp: Date.now()
      }).catch((y) => {
        this._cleanupTimeout(l), s(y)
      })
    } else this._transport.send(o, {
      relatedRequestId: e,
      resumptionToken: t,
      onresumptiontoken: r
    }).catch((b) => {
      this._cleanupTimeout(l), s(b)
    })
  })
}
async getTask(T, R) {
  return this.request({
    method: "tasks/get",
    params: T
  }, SL, R)
}
async getTaskResult(T, R, a) {
  return this.request({
    method: "tasks/result",
    params: T
  }, R, a)
}
async listTasks(T, R) {
  return this.request({
    method: "tasks/list",
    params: T
  }, EL, R)
}
async cancelTask(T, R) {
  return this.request({
    method: "tasks/cancel",
    params: T
  }, YLT, R)
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
          ...T.params?._meta || {},
          [f_]: R.relatedTask
        }
      }
    };
    await this._enqueueTaskMessage(a, {
      type: "notification",
      message: t,
      timestamp: Date.now()
    });
    return
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
            ...t.params?._meta || {},
            [f_]: R.relatedTask
          }
        }
      };
      this._transport?.send(t, R).catch((r) => this._onerror(r))
    });
    return
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
        ...e.params?._meta || {},
        [f_]: R.relatedTask
      }
    }
  };
  await this._transport.send(e, R)
}
setRequestHandler(T, R) {
  let a = elT(T);
  this.assertRequestHandlerCapability(a), this._requestHandlers.set(a, (e, t) => {
    let r = tlT(T, e);
    return Promise.resolve(R(r, t))
  })
}
removeRequestHandler(T) {
  this._requestHandlers.delete(T)
}
assertCanSetRequestHandler(T) {
  if (this._requestHandlers.has(T)) throw Error(`A request handler for ${T} already exists, which would be overridden`)
}
setNotificationHandler(T, R) {
  let a = elT(T);
  this._notificationHandlers.set(a, (e) => {
    let t = tlT(T, e);
    return Promise.resolve(R(t))
  })
}
removeNotificationHandler(T) {
  this._notificationHandlers.delete(T)
}
_cleanupTaskProgressHandler(T) {
  let R = this._taskProgressTokens.get(T);
  if (R !== void 0) this._progressHandlers.delete(R), this._taskProgressTokens.delete(T)
}
async _enqueueTaskMessage(T, R, a) {
  if (!this._taskStore || !this._taskMessageQueue) throw Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
  let e = this._options?.maxTaskQueueSize;
  await this._taskMessageQueue.enqueue(T, R, a, e)
}
async _clearTaskQueue(T, R) {
  if (this._taskMessageQueue) {
    let a = await this._taskMessageQueue.dequeueAll(T, R);
    for (let e of a)
      if (e.type === "request" && cG(e.message)) {
        let t = e.message.id,
          r = this._requestResolvers.get(t);
        if (r) r(new l9(c9.InternalError, "Task cancelled or completed")), this._requestResolvers.delete(t);
        else this._onerror(Error(`Resolver missing for request ${t} during task ${T} cleanup`))
      }
  }
}
async _waitForTaskUpdate(T, R) {
  let a = this._options?.defaultTaskPollInterval ?? 1000;
  try {
    let e = await this._taskStore?.getTask(T);
    if (e?.pollInterval) a = e.pollInterval
  } catch {}
  return new Promise((e, t) => {
    if (R.aborted) {
      t(new l9(c9.InvalidRequest, "Request cancelled"));
      return
    }
    let r = setTimeout(e, a);
    R.addEventListener("abort", () => {
      clearTimeout(r), t(new l9(c9.InvalidRequest, "Request cancelled"))
    }, {
      once: !0
    })
  })
}
requestTaskStore(T, R) {
  let a = this._taskStore;
  if (!a) throw Error("No task store configured");
  return {
    createTask: async (e) => {
      if (!T) throw Error("No request provided");
      return await a.createTask(e, T.id, {
        method: T.method,
        params: T.params
      }, R)
    },
    getTask: async (e) => {
      let t = await a.getTask(e, R);
      if (!t) throw new l9(c9.InvalidParams, "Failed to retrieve task: Task not found");
      return t
    },
    storeTaskResult: async (e, t, r) => {
      await a.storeTaskResult(e, t, r, R);
      let h = await a.getTask(e, R);
      if (h) {
        let i = W$.parse({
          method: "notifications/tasks/status",
          params: h
        });
        if (await this.notification(i), qp(h.status)) this._cleanupTaskProgressHandler(e)
      }
    },
    getTaskResult: (e) => {
      return a.getTaskResult(e, R)
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
        if (await this.notification(c), qp(i.status)) this._cleanupTaskProgressHandler(e)
      }
    },
    listTasks: (e) => {
      return a.listTasks(e, R)
    }
  }
}
}

function rlT(T) {
  return T !== null && typeof T === "object" && !Array.isArray(T)
}

function tuR(T, R) {
  let a = {
    ...T
  };
  for (let e in R) {
    let t = e,
      r = R[t];
    if (r === void 0) continue;
    let h = a[t];
    if (rlT(h) && rlT(r)) a[t] = {
      ...h,
      ...r
    };
    else a[t] = r
  }
  return a
}

function XuR() {
  let T = new MMT.default({
    strict: !1,
    validateFormats: !0,
    validateSchema: !1,
    allErrors: !0
  });
  return DMT.default(T), T
}
class LMT {
  constructor(T) {
    this._ajv = T ?? XuR()
  }
  getValidator(T) {
    let R = "$id" in T && typeof T.$id === "string" ? this._ajv.getSchema(T.$id) ?? this._ajv.compile(T) : this._ajv.compile(T);
    return (a) => {
      if (R(a)) return {
        valid: !0,
        data: a,
        errorMessage: void 0
      };
      else return {
        valid: !1,
        data: void 0,
        errorMessage: this._ajv.errorsText(R.errors)
      }
    }
  }
}
class wMT {
  constructor(T) {
    this._client = T
  }
  async * callToolStream(T, R = q$, a) {
    let e = this._client,
      t = {
        ...a,
        task: a?.task ?? (e.isToolTask(T.name) ? {} :
          void 0)
      },
      r = e.requestStream({
        method: "tools/call",
        params: T
      }, R, t),
      h = e.getToolOutputValidator(T.name);
    for await (let i of r) {
      if (i.type === "result" && h) {
        let c = i.result;
        if (!c.structuredContent && !c.isError) {
          yield {
            type: "error",
            error: new l9(c9.InvalidRequest, `Tool ${T.name} has an output schema but did not return structured content`)
          };
          return
        }
        if (c.structuredContent) try {
          let s = h(c.structuredContent);
          if (!s.valid) {
            yield {
              type: "error",
              error: new l9(c9.InvalidParams, `Structured content does not match the tool's output schema: ${s.errorMessage}`)
            };
            return
          }
        }
        catch (s) {
          if (s instanceof l9) {
            yield {
              type: "error",
              error: s
            };
            return
          }
          yield {
            type: "error",
            error: new l9(c9.InvalidParams, `Failed to validate structured content: ${s instanceof Error?s.message:String(s)}`)
          };
          return
        }
      }
      yield i
    }
  }
  async getTask(T, R) {
    return this._client.getTask({
      taskId: T
    }, R)
  }
  async getTaskResult(T, R, a) {
    return this._client.getTaskResult({
      taskId: T
    }, R, a)
  }
  async listTasks(T, R) {
    return this._client.listTasks(T ? {
        cursor: T
      } :
      void 0, R)
  }
  async cancelTask(T, R) {
    return this._client.cancelTask({
      taskId: T
    }, R)
  }
  requestStream(T, R, a) {
    return this._client.requestStream(T, R, a)
  }
}

function ZuR(T, R, a) {
  if (!T) throw Error(`${a} does not support task creation (required for ${R})`);
  switch (R) {
    case "tools/call":
      if (!T.tools?.call) throw Error(`${a} does not support task creation for tools/call (required for ${R})`);
      break;
    default:
      break
  }
}

function JuR(T, R, a) {
  if (!T) throw Error(`${a} does not support task creation (required for ${R})`);
  switch (R) {
    case "sampling/createMessage":
      if (!T.sampling?.createMessage) throw Error(`${a} does not support task creation for sampling/createMessage (required for ${R})`);
      break;
    case "elicitation/create":
      if (!T.elicitation?.create) throw Error(`${a} does not support task creation for elicitation/create (required for ${R})`);
      break;
    default:
      break
  }
}

function LL(T, R) {
  if (!T || R === null || typeof R !== "object") return;
  if (T.type === "object" && T.properties && typeof T.properties === "object") {
    let a = R,
      e = T.properties;
    for (let t of Object.keys(e)) {
      let r = e[t];
      if (a[t] === void 0 && Object.prototype.hasOwnProperty.call(r, "default")) a[t] = r.default;
      if (a[t] !== void 0) LL(r, a[t])
    }
  }
  if (Array.isArray(T.anyOf)) {
    for (let a of T.anyOf)
      if (typeof a !== "boolean") LL(a, R)
  }
  if (Array.isArray(T.oneOf)) {
    for (let a of T.oneOf)
      if (typeof a !== "boolean") LL(a, R)
  }
}

function TyR(T) {
  if (!T) return {
    supportsFormMode: !1,
    supportsUrlMode: !1
  };
  let R = T.form !== void 0,
    a = T.url !== void 0;
  return {
    supportsFormMode: R || !R && !a,
    supportsUrlMode: a
  }
}

function $q(T) {}

function NMT(T) {
  if (typeof T == "function") throw TypeError("`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?");
  let {
    onEvent: R = $q,
    onError: a = $q,
    onRetry: e = $q,
    onComment: t
  } = T, r = "", h = !0, i, c = "", s = "";

  function A(_) {
    let m = h ? _.replace(/^\xEF\xBB\xBF/, "") : _,
      [b, y] = RyR(`${r}${m}`);
    for (let u of b) l(u);
    r = y, h = !1
  }

  function l(_) {
    if (_ === "") {
      n();
      return
    }
    if (_.startsWith(":")) {
      t && t(_.slice(_.startsWith(": ") ? 2 : 1));
      return
    }
    let m = _.indexOf(":");
    if (m !== -1) {
      let b = _.slice(0, m),
        y = _[m + 1] === " " ? 2 : 1,
        u = _.slice(m + y);
      o(b, u, _);
      return
    }
    o(_, "", _)
  }

  function o(_, m, b) {
    switch (_) {
      case "event":
        s = m;
        break;
      case "data":
        c = `${c}${m}
`;
        break;
      case "id":
        i = m.includes("\x00") ? void 0 : m;
        break;
      case "retry":
        /^\d+$/.test(m) ? e(parseInt(m, 10)) : a(new IG(`Invalid \`retry\` value: "${m}"`, {
          type: "invalid-retry",
          value: m,
          line: b
        }));
        break;
      default:
        a(new IG(`Unknown field "${_.length>20?`${_.slice(0,20)}\u2026`:_}"`, {
          type: "unknown-field",
          field: _,
          value: m,
          line: b
        }));
        break
    }
  }

  function n() {
    c.length > 0 && R({
      id: i,
      event: s || void 0,
      data: c.endsWith(`
`) ? c.slice(0, -1) : c
    }), i = void 0, c = "", s = ""
  }

  function p(_ = {}) {
    r && _.consume && l(r), h = !0, i = void 0, c = "", s = "", r = ""
  }
  return {
    feed: A,
    reset: p
  }
}

function RyR(T) {
  let R = [],
    a = "",
    e = 0;
  for (; e < T.length;) {
    let t = T.indexOf("\r", e),
      r = T.indexOf(`
`, e),
      h = -1;
    if (t !== -1 && r !== -1 ? h = Math.min(t, r) : t !== -1 ? t === T.length - 1 ? h = -1 : h = t : r !== -1 && (h = r), h === -1) {
      a = T.slice(e);
      break
    } else {
      let i = T.slice(e, h);
      R.push(i), e = h + 1, T[e - 1] === "\r" && T[e] === `
` && e++
    }
  }
  return [R, a]
}

function ayR(T) {
  let R = globalThis.DOMException;
  return typeof R == "function" ? new R(T, "SyntaxError") : SyntaxError(T)
}

function gG(T) {
  return T instanceof Error ? "errors" in T && Array.isArray(T.errors) ? T.errors.map(gG).join(", ") : ("cause" in T) && T.cause instanceof Error ? `${T}: ${gG(T.cause)}` : T.message : `${T}`
}

function ilT(T) {
  return {
    type: T.type,
    message: T.message,
    code: T.code,
    defaultPrevented: T.defaultPrevented,
    cancelable: T.cancelable,
    timeStamp: T.timeStamp
  }
}

function eyR() {
  let T = "document" in globalThis ? globalThis.document : void 0;
  return T && typeof T == "object" && "baseURI" in T && typeof T.baseURI == "string" ? T.baseURI : void 0
}

function QD(T) {
  if (!T) return {};
  if (T instanceof Headers) return Object.fromEntries(T.entries());
  if (Array.isArray(T)) return Object.fromEntries(T);
  return {
    ...T
  }
}

function WMT(T = fetch, R) {
  if (!R) return T;
  return async (a, e) => {
    let t = {
      ...R,
      ...e,
      headers: e?.headers ? {
          ...QD(R.headers),
          ...QD(e.headers)
        } :
        R.headers
    };
    return T(a, t)
  }
}
async function ryR(T) {
  return (await w9T).getRandomValues(new Uint8Array(T))
}
async function hyR(T) {
  let R = Math.pow(2, 8) - Math.pow(2, 8) % 66,
    a = "";
  while (a.length < T) {
    let e = await ryR(T - a.length);
    for (let t of e)
      if (t < R) a += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~" [t % 66]
  }
  return a
}
async function iyR(T) {
  return await hyR(T)
}
async function cyR(T) {
  let R = await (await w9T).subtle.digest("SHA-256", new TextEncoder().encode(T));
  return btoa(String.fromCharCode(...new Uint8Array(R))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "")
}
async function syR(T) {
  if (!T) T = 43;
  if (T < 43 || T > 128) throw `Expected a length between 43 and 128. Received ${T}.`;
  let R = await iyR(T),
    a = await cyR(R);
  return {
    code_verifier: R,
    code_challenge: a
  }
}

function AyR(T) {
  let R = typeof T === "string" ? new URL(T) : new URL(T.href);
  return R.hash = "", R
}

function pyR({
  requestedResource: T,
  configuredResource: R
}) {
  let a = typeof T === "string" ? new URL(T) : new URL(T.href),
    e = typeof R === "string" ? new URL(R) : new URL(R.href);
  if (a.origin !== e.origin) return !1;
  if (a.pathname.length < e.pathname.length) return !1;
  let t = a.pathname.endsWith("/") ? a.pathname : a.pathname + "/",
    r = e.pathname.endsWith("/") ? e.pathname : e.pathname + "/";
  return t.startsWith(r)
}

function byR(T) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(T)
}

function myR(T, R) {
  let a = T.client_secret !== void 0;
  if (R.length === 0) return a ? "client_secret_post" : "none";
  if ("token_endpoint_auth_method" in T && T.token_endpoint_auth_method && byR(T.token_endpoint_auth_method) && R.includes(T.token_endpoint_auth_method)) return T.token_endpoint_auth_method;
  if (a && R.includes("client_secret_basic")) return "client_secret_basic";
  if (a && R.includes("client_secret_post")) return "client_secret_post";
  if (R.includes("none")) return "none";
  return a ? "client_secret_post" : "none"
}

function uyR(T, R, a, e) {
  let {
    client_id: t,
    client_secret: r
  } = R;
  switch (T) {
    case "client_secret_basic":
      yyR(t, r, a);
      return;
    case "client_secret_post":
      PyR(t, r, e);
      return;
    case "none":
      kyR(t, e);
      return;
    default:
      throw Error(`Unsupported client authentication method: ${T}`)
  }
}

function yyR(T, R, a) {
  if (!R) throw Error("client_secret_basic authentication requires a client_secret");
  let e = btoa(`${T}:${R}`);
  a.set("Authorization", `Basic ${e}`)
}

function PyR(T, R, a) {
  if (a.set("client_id", T), R) a.set("client_secret", R)
}

function kyR(T, R) {
  R.set("client_id", T)
}
async function XMT(T) {
  let R = T instanceof Response ? T.status : void 0,
    a = T instanceof Response ? await T.text() : T;
  try {
    let e = GMT.parse(JSON.parse(a)),
      {
        error: t,
        error_description: r,
        error_uri: h
      } = e;
    return new(VMT[t] || Y_)(r || "", h)
  } catch (e) {
    let t = `${R?`HTTP ${R}: `:""}Invalid OAuth error response: ${e}. Raw body: ${a}`;
    return new Y_(t)
  }
}
async function Q_(T, R) {
  try {
    return await Dq(T, R)
  } catch (a) {
    if (a instanceof Gg || a instanceof Vg) return await T.invalidateCredentials?.("all"), await Dq(T, R);
    else if (a instanceof Kg) return await T.invalidateCredentials?.("tokens"), await Dq(T, R);
    throw a
  }
}
async function Dq(T, {
  serverUrl: R,
  authorizationCode: a,
  scope: e,
  resourceMetadataUrl: t,
  fetchFn: r
}) {
  let h, i;
  try {
    if (h = await IyR(R, {
        resourceMetadataUrl: t
      }, r), h.authorization_servers && h.authorization_servers.length > 0) i = h.authorization_servers[0]
  } catch {}
  if (!i) i = new URL("/", R);
  let c = await fyR(R, T, h),
    s = await SyR(i, {
      fetchFn: r
    }),
    A = await Promise.resolve(T.clientInformation());
  if (!A) {
    if (a !== void 0) throw Error("Existing OAuth client information is required when exchanging an authorization code");
    let m = s?.client_id_metadata_document_supported === !0,
      b = T.clientMetadataUrl;
    if (b && !xyR(b)) throw new Xg(`clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${b}`);
    if (m && b) A = {
      client_id: b
    }, await T.saveClientInformation?.(A);
    else {
      if (!T.saveClientInformation) throw Error("OAuth client information must be saveable for dynamic registration");
      let y = await LyR(i, {
        metadata: s,
        clientMetadata: T.clientMetadata,
        fetchFn: r
      });
      await T.saveClientInformation(y), A = y
    }
  }
  let l = !T.redirectUrl;
  if (a !== void 0 || l) {
    let m = await CyR(T, i, {
      metadata: s,
      resource: c,
      authorizationCode: a,
      fetchFn: r
    });
    return await T.saveTokens(m), "AUTHORIZED"
  }
  let o = await T.tokens();
  if (o?.refresh_token) try {
    let m = await EyR(i, {
      metadata: s,
      clientInformation: A,
      refreshToken: o.refresh_token,
      resource: c,
      addClientAuthentication: T.addClientAuthentication,
      fetchFn: r
    });
    return await T.saveTokens(m), "AUTHORIZED"
  }
  catch (m) {
    if (!(m instanceof Na) || m instanceof Y_);
    else throw m
  }
  let n = T.state ? await T.state() : void 0,
    {
      authorizationUrl: p,
      codeVerifier: _
    } = await OyR(i, {
      metadata: s,
      clientInformation: A,
      state: n,
      redirectUrl: T.redirectUrl,
      scope: e || h?.scopes_supported?.join(" ") || T.clientMetadata.scope,
      resource: c
    });
  return await T.saveCodeVerifier(_), await T.redirectToAuthorization(p), "REDIRECT"
}

function xyR(T) {
  if (!T) return !1;
  try {
    let R = new URL(T);
    return R.protocol === "https:" && R.pathname !== "/"
  } catch {
    return !1
  }
}
async function fyR(T, R, a) {
  let e = AyR(T);
  if (R.validateResourceURL) return await R.validateResourceURL(e, a?.resource);
  if (!a) return;
  if (!pyR({
      requestedResource: e,
      configuredResource: a.resource
    })) throw Error(`Protected resource ${a.resource} does not match expected ${e} (or origin)`);
  return new URL(a.resource)
}

function ZD(T) {
  let R = T.headers.get("WWW-Authenticate");
  if (!R) return {};
  let [a, e] = R.split(" ");
  if (a.toLowerCase() !== "bearer" || !e) return {};
  let t = wq(T, "resource_metadata") || void 0,
    r;
  if (t) try {
    r = new URL(t)
  }
  catch {}
  let h = wq(T, "scope") || void 0,
    i = wq(T, "error") || void 0;
  return {
    resourceMetadataUrl: r,
    scope: h,
    error: i
  }
}

function wq(T, R) {
  let a = T.headers.get("WWW-Authenticate");
  if (!a) return null;
  let e = new RegExp(`${R}=(?:"([^"]+)"|([^\\s,]+))`),
    t = a.match(e);
  if (t) return t[1] || t[2];
  return null
}
async function IyR(T, R, a = fetch) {
  let e = await vyR(T, "oauth-protected-resource", a, {
    protocolVersion: R?.protocolVersion,
    metadataUrl: R?.resourceMetadataUrl
  });
  if (!e || e.status === 404) throw await e?.body?.cancel(), Error("Resource server does not implement OAuth 2.0 Protected Resource Metadata.");
  if (!e.ok) throw await e.body?.cancel(), Error(`HTTP ${e.status} trying to load well-known OAuth protected resource metadata.`);
  return qMT.parse(await e.json())
}
async function B9T(T, R, a = fetch) {
  try {
    return await a(T, {
      headers: R
    })
  } catch (e) {
    if (e instanceof TypeError)
      if (R) return B9T(T, void 0, a);
      else return;
    throw e
  }
}

function gyR(T, R = "", a = {}) {
  if (R.endsWith("/")) R = R.slice(0, -1);
  return a.prependPathname ? `${R}/.well-known/${T}` : `/.well-known/${T}${R}`
}
async function AlT(T, R, a = fetch) {
  return await B9T(T, {
    "MCP-Protocol-Version": R
  }, a)
}

function $yR(T, R) {
  return !T || T.status >= 400 && T.status < 500 && R !== "/"
}
async function vyR(T, R, a, e) {
  let t = new URL(T),
    r = e?.protocolVersion ?? $N,
    h;
  if (e?.metadataUrl) h = new URL(e.metadataUrl);
  else {
    let c = gyR(R, t.pathname);
    h = new URL(c, e?.metadataServerUrl ?? t), h.search = t.search
  }
  let i = await AlT(h, r, a);
  if (!e?.metadataUrl && $yR(i, t.pathname)) {
    let c = new URL(`/.well-known/${R}`, t);
    i = await AlT(c, r, a)
  }
  return i
}

function jyR(T) {
  let R = typeof T === "string" ? new URL(T) : T,
    a = R.pathname !== "/",
    e = [];
  if (!a) return e.push({
    url: new URL("/.well-known/oauth-authorization-server", R.origin),
    type: "oauth"
  }), e.push({
    url: new URL("/.well-known/openid-configuration", R.origin),
    type: "oidc"
  }), e;
  let t = R.pathname;
  if (t.endsWith("/")) t = t.slice(0, -1);
  return e.push({
    url: new URL(`/.well-known/oauth-authorization-server${t}`, R.origin),
    type: "oauth"
  }), e.push({
    url: new URL(`/.well-known/openid-configuration${t}`, R.origin),
    type: "oidc"
  }), e.push({
    url: new URL(`${t}/.well-known/openid-configuration`, R.origin),
    type: "oidc"
  }), e
}
async function SyR(T, {
  fetchFn: R = fetch,
  protocolVersion: a = $N
} = {}) {
  let e = {
      "MCP-Protocol-Version": a,
      Accept: "application/json"
    },
    t = jyR(T);
  for (let {
      url: r,
      type: h
    }
    of t) {
    let i = await B9T(r, e, R);
    if (!i) continue;
    if (!i.ok) {
      if (await i.body?.cancel(), i.status >= 400 && i.status < 500) continue;
      throw Error(`HTTP ${i.status} trying to load ${h==="oauth"?"OAuth":"OpenID provider"} metadata from ${r}`)
    }
    if (h === "oauth") return $G.parse(await i.json());
    else return zMT.parse(await i.json())
  }
  return
}
async function OyR(T, {
  metadata: R,
  clientInformation: a,
  redirectUrl: e,
  scope: t,
  state: r,
  resource: h
}) {
  let i;
  if (R) {
    if (i = new URL(R.authorization_endpoint), !R.response_types_supported.includes(Bq)) throw Error(`Incompatible auth server: does not support response type ${Bq}`);
    if (R.code_challenge_methods_supported && !R.code_challenge_methods_supported.includes(Nq)) throw Error(`Incompatible auth server: does not support code challenge method ${Nq}`)
  } else i = new URL("/authorize", T);
  let c = await syR(),
    s = c.code_verifier,
    A = c.code_challenge;
  if (i.searchParams.set("response_type", Bq), i.searchParams.set("client_id", a.client_id), i.searchParams.set("code_challenge", A), i.searchParams.set("code_challenge_method", Nq), i.searchParams.set("redirect_uri", String(e)), r) i.searchParams.set("state", r);
  if (t) i.searchParams.set("scope", t);
  if (t?.includes("offline_access")) i.searchParams.append("prompt", "consent");
  if (h) i.searchParams.set("resource", h.href);
  return {
    authorizationUrl: i,
    codeVerifier: s
  }
}

function dyR(T, R, a) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: T,
    code_verifier: R,
    redirect_uri: String(a)
  })
}
async function YMT(T, {
  metadata: R,
  tokenRequestParams: a,
  clientInformation: e,
  addClientAuthentication: t,
  resource: r,
  fetchFn: h
}) {
  let i = R?.token_endpoint ? new URL(R.token_endpoint) : new URL("/token", T),
    c = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    });
  if (r) a.set("resource", r.href);
  if (t) await t(c, a, i, R);
  else if (e) {
    let A = R?.token_endpoint_auth_methods_supported ?? [],
      l = myR(e, A);
    uyR(l, e, c, a)
  }
  let s = await (h ?? fetch)(i, {
    method: "POST",
    headers: c,
    body: a
  });
  if (!s.ok) throw await XMT(s);
  return FMT.parse(await s.json())
}
async function EyR(T, {
  metadata: R,
  clientInformation: a,
  refreshToken: e,
  resource: t,
  addClientAuthentication: r,
  fetchFn: h
}) {
  let i = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: e
    }),
    c = await YMT(T, {
      metadata: R,
      tokenRequestParams: i,
      clientInformation: a,
      addClientAuthentication: r,
      resource: t,
      fetchFn: h
    });
  return {
    refresh_token: e,
    ...c
  }
}
async function CyR(T, R, {
  metadata: a,
  resource: e,
  authorizationCode: t,
  fetchFn: r
} = {}) {
  let h = T.clientMetadata.scope,
    i;
  if (T.prepareTokenRequest) i = await T.prepareTokenRequest(h);
  if (!i) {
    if (!t) throw Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!T.redirectUrl) throw Error("redirectUrl is required for authorization_code flow");
    let s = await T.codeVerifier();
    i = dyR(t, s, T.redirectUrl)
  }
  let c = await T.clientInformation();
  return YMT(R, {
    metadata: a,
    tokenRequestParams: i,
    clientInformation: c ?? void 0,
    addClientAuthentication: T.addClientAuthentication,
    resource: e,
    fetchFn: r
  })
}
async function LyR(T, {
  metadata: R,
  clientMetadata: a,
  fetchFn: e
}) {
  let t;
  if (R) {
    if (!R.registration_endpoint) throw Error("Incompatible auth server: does not support dynamic client registration");
    t = new URL(R.registration_endpoint)
  } else t = new URL("/register", T);
  let r = await (e ?? fetch)(t, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(a)
  });
  if (!r.ok) throw await XMT(r);
  return KMT.parse(await r.json())
}
class JD {
  constructor(T, R) {
    this._url = T, this._resourceMetadataUrl = void 0, this._scope = void 0, this._eventSourceInit = R?.eventSourceInit, this._requestInit = R?.requestInit, this._authProvider = R?.authProvider, this._fetch = R?.fetch, this._fetchWithInit = WMT(R?.fetch, R?.requestInit)
  }
  async _authThenStart() {
    if (!this._authProvider) throw new _h("No auth provider");
    let T;
    try {
      T = await Q_(this._authProvider, {
        serverUrl: this._url,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      })
    } catch (R) {
      throw this.onerror?.(R), R
    }
    if (T !== "AUTHORIZED") throw new _h;
    return await this._startOrAuth()
  }
  async _commonHeaders() {
    let T = {};
    if (this._authProvider) {
      let a = await this._authProvider.tokens();
      if (a) T.Authorization = `Bearer ${a.access_token}`
    }
    if (this._protocolVersion) T["mcp-protocol-version"] = this._protocolVersion;
    let R = QD(this._requestInit?.headers);
    return new Headers({
      ...T,
      ...R
    })
  }
  _startOrAuth() {
    let T = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
    return new Promise((R, a) => {
      this._eventSource = new Fg(this._url.href, {
        ...this._eventSourceInit,
        fetch: async (e, t) => {
          let r = await this._commonHeaders();
          r.set("Accept", "text/event-stream");
          let h = await T(e, {
            ...t,
            headers: r
          });
          if (h.status === 401 && h.headers.has("www-authenticate")) {
            let {
              resourceMetadataUrl: i,
              scope: c
            } = ZD(h);
            this._resourceMetadataUrl = i, this._scope = c
          }
          return h
        }
      }), this._abortController = new AbortController, this._eventSource.onerror = (e) => {
        if (e.code === 401 && this._authProvider) {
          this._authThenStart().then(R, a);
          return
        }
        let t = new QMT(e.code, e.message, e);
        a(t), this.onerror?.(t)
      }, this._eventSource.onopen = () => {}, this._eventSource.addEventListener("endpoint", (e) => {
        let t = e;
        try {
          if (this._endpoint = new URL(t.data, this._url), this._endpoint.origin !== this._url.origin) throw Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`)
        } catch (r) {
          a(r), this.onerror?.(r), this.close();
          return
        }
        R()
      }), this._eventSource.onmessage = (e) => {
        let t = e,
          r;
        try {
          r = vP.parse(JSON.parse(t.data))
        } catch (h) {
          this.onerror?.(h);
          return
        }
        this.onmessage?.(r)
      }
    })
  }
  async start() {
    if (this._eventSource) throw Error("SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    return await this._startOrAuth()
  }
  async finishAuth(T) {
    if (!this._authProvider) throw new _h("No auth provider");
    if (await Q_(this._authProvider, {
        serverUrl: this._url,
        authorizationCode: T,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      }) !== "AUTHORIZED") throw new _h("Failed to authorize")
  }
  async close() {
    this._abortController?.abort(), this._eventSource?.close(), this.onclose?.()
  }
  async send(T) {
    if (!this._endpoint) throw Error("Not connected");
    try {
      let R = await this._commonHeaders();
      R.set("content-type", "application/json");
      let a = {
          ...this._requestInit,
          method: "POST",
          headers: R,
          body: JSON.stringify(T),
          signal: this._abortController?.signal
        },
        e = await (this._fetch ?? fetch)(this._endpoint, a);
      if (!e.ok) {
        let t = await e.text().catch(() => null);
        if (e.status === 401 && this._authProvider) {
          let {
            resourceMetadataUrl: r,
            scope: h
          } = ZD(e);
          if (this._resourceMetadataUrl = r, this._scope = h, await Q_(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetchWithInit
            }) !== "AUTHORIZED") throw new _h;
          return this.send(T)
        }
        throw Error(`Error POSTing to endpoint (HTTP ${e.status}): ${t}`)
      }
      await e.body?.cancel()
    } catch (R) {
      throw this.onerror?.(R), R
    }
  }
  setProtocolVersion(T) {
    this._protocolVersion = T
  }
}
class JMT {
  append(T) {
    this._buffer = this._buffer ? Buffer.concat([this._buffer, T]) : T
  }
  readMessage() {
    if (!this._buffer) return null;
    let T = this._buffer.indexOf(`
`);
    if (T === -1) return null;
    let R = this._buffer.toString("utf8", 0, T).replace(/\r$/, "");
    return this._buffer = this._buffer.subarray(T + 1), VyR(R)
  }
  clear() {
    this._buffer = void 0
  }
}

function VyR(T) {
  return vP.parse(JSON.parse(T))
}

function XyR(T) {
  return JSON.stringify(T) + `
`
}

function ZyR() {
  let T = {};
  for (let R of aDT) {
    let a = dN.env[R];
    if (a === void 0) continue;
    if (a.startsWith("()")) continue;
    T[R] = a
  }
  return T
}
class TDT {
  constructor(T) {
    if (this._readBuffer = new JMT, this._stderrStream = null, this._serverParams = T, T.stderr === "pipe" || T.stderr === "overlapped") this._stderrStream = new QyR
  }
  async start() {
    if (this._process) throw Error("StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    return new Promise((T, R) => {
      if (this._process = RDT.default(this._serverParams.command, this._serverParams.args ?? [], {
          env: {
            ...ZyR(),
            ...this._serverParams.env
          },
          stdio: ["pipe", "pipe", this._serverParams.stderr ?? "inherit"],
          shell: !1,
          windowsHide: dN.platform === "win32" && JyR(),
          cwd: this._serverParams.cwd
        }), this._process.on("error", (a) => {
          R(a), this.onerror?.(a)
        }), this._process.on("spawn", () => {
          T()
        }), this._process.on("close", (a) => {
          this._process = void 0, this.onclose?.()
        }), this._process.stdin?.on("error", (a) => {
          this.onerror?.(a)
        }), this._process.stdout?.on("data", (a) => {
          this._readBuffer.append(a), this.processReadBuffer()
        }), this._process.stdout?.on("error", (a) => {
          this.onerror?.(a)
        }), this._stderrStream && this._process.stderr) this._process.stderr.pipe(this._stderrStream)
    })
  }
  get stderr() {
    if (this._stderrStream) return this._stderrStream;
    return this._process?.stderr ?? null
  }
  get pid() {
    return this._process?.pid ?? null
  }
  processReadBuffer() {
    while (!0) try {
      let T = this._readBuffer.readMessage();
      if (T === null) break;
      this.onmessage?.(T)
    }
    catch (T) {
      this.onerror?.(T)
    }
  }
  async close() {
    if (this._process) {
      let T = this._process;
      this._process = void 0;
      let R = new Promise((a) => {
        T.once("close", () => {
          a()
        })
      });
      try {
        T.stdin?.end()
      } catch {}
      if (await Promise.race([R, new Promise((a) => setTimeout(a, 2000).unref())]), T.exitCode === null) {
        try {
          T.kill("SIGTERM")
        } catch {}
        await Promise.race([R, new Promise((a) => setTimeout(a, 2000).unref())])
      }
      if (T.exitCode === null) try {
        T.kill("SIGKILL")
      }
      catch {}
    }
    this._readBuffer.clear()
  }
  send(T) {
    return new Promise((R) => {
      if (!this._process?.stdin) throw Error("Not connected");
      let a = XyR(T);
      if (this._process.stdin.write(a)) R();
      else this._process.stdin.once("drain", R)
    })
  }
}

function JyR() {
  return "type" in dN
}
class T7 {
  constructor(T, R) {
    this._hasCompletedAuthFlow = !1, this._url = T, this._resourceMetadataUrl = void 0, this._scope = void 0, this._requestInit = R?.requestInit, this._authProvider = R?.authProvider, this._fetch = R?.fetch, this._fetchWithInit = WMT(R?.fetch, R?.requestInit), this._sessionId = R?.sessionId, this._reconnectionOptions = R?.reconnectionOptions ?? tDT
  }
  async _authThenStart() {
    if (!this._authProvider) throw new _h("No auth provider");
    let T;
    try {
      T = await Q_(this._authProvider, {
        serverUrl: this._url,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      })
    } catch (R) {
      throw this.onerror?.(R), R
    }
    if (T !== "AUTHORIZED") throw new _h;
    return await this._startOrAuthSse({
      resumptionToken: void 0
    })
  }
  async _commonHeaders() {
    let T = {};
    if (this._authProvider) {
      let a = await this._authProvider.tokens();
      if (a) T.Authorization = `Bearer ${a.access_token}`
    }
    if (this._sessionId) T["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) T["mcp-protocol-version"] = this._protocolVersion;
    let R = QD(this._requestInit?.headers);
    return new Headers({
      ...T,
      ...R
    })
  }
  async _startOrAuthSse(T) {
    let {
      resumptionToken: R
    } = T;
    try {
      let a = await this._commonHeaders();
      if (a.set("Accept", "text/event-stream"), R) a.set("last-event-id", R);
      let e = await (this._fetch ?? fetch)(this._url, {
        method: "GET",
        headers: a,
        signal: this._abortController?.signal
      });
      if (!e.ok) {
        if (await e.body?.cancel(), e.status === 401 && this._authProvider) return await this._authThenStart();
        if (e.status === 405) return;
        throw new I_(e.status, `Failed to open SSE stream: ${e.statusText}`)
      }
      this._handleSseStream(e.body, T, !0)
    } catch (a) {
      throw this.onerror?.(a), a
    }
  }
  _getNextReconnectionDelay(T) {
    if (this._serverRetryMs !== void 0) return this._serverRetryMs;
    let R = this._reconnectionOptions.initialReconnectionDelay,
      a = this._reconnectionOptions.reconnectionDelayGrowFactor,
      e = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(R * Math.pow(a, T), e)
  }
  _scheduleReconnection(T, R = 0) {
      let a = this._reconnectionOptions.maxRetries;
      if (R >= a) {
        this.onerror?.(Error(`Maximum reconnection attempts (${a}) exceeded.`));
        return
      }
      let e = this._getNextReconnectionDelay(R);
      this._reconne
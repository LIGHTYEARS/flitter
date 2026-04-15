class wMT {
  constructor(T) {
    this._client = T;
  }
  async *callToolStream(T, R = q$, a) {
    let e = this._client,
      t = {
        ...a,
        task: a?.task ?? (e.isToolTask(T.name) ? {} : void 0)
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
          return;
        }
        if (c.structuredContent) try {
          let s = h(c.structuredContent);
          if (!s.valid) {
            yield {
              type: "error",
              error: new l9(c9.InvalidParams, `Structured content does not match the tool's output schema: ${s.errorMessage}`)
            };
            return;
          }
        } catch (s) {
          if (s instanceof l9) {
            yield {
              type: "error",
              error: s
            };
            return;
          }
          yield {
            type: "error",
            error: new l9(c9.InvalidParams, `Failed to validate structured content: ${s instanceof Error ? s.message : String(s)}`)
          };
          return;
        }
      }
      yield i;
    }
  }
  async getTask(T, R) {
    return this._client.getTask({
      taskId: T
    }, R);
  }
  async getTaskResult(T, R, a) {
    return this._client.getTaskResult({
      taskId: T
    }, R, a);
  }
  async listTasks(T, R) {
    return this._client.listTasks(T ? {
      cursor: T
    } : void 0, R);
  }
  async cancelTask(T, R) {
    return this._client.cancelTask({
      taskId: T
    }, R);
  }
  requestStream(T, R, a) {
    return this._client.requestStream(T, R, a);
  }
}
class G5T {
  pluginName;
  scopedLogger;
  baseCtx;
  bridge;
  handlers = new Map();
  requestHandlers = new Map();
  commands = new Map();
  tools = new Map();
  logger;
  configuration;
  system;
  $;
  ai;
  helpers;
  constructor(T, R, a, e, t) {
    this.pluginName = T, this.scopedLogger = R, this.baseCtx = a, this.bridge = e, this.logger = ZC(e, R, T), this.configuration = new F5T(e), this.system = a.system, this.$ = a.$, this.ai = a.ai, this.helpers = {
      filesModifiedByToolCall: (r, h) => $WR(r, h ?? t),
      shellCommandFromToolCall: z5T,
      toolCallsInMessages: gWR
    };
  }
  on(T, R) {
    if (vWR.has(T)) return this.requestHandlers.set(T, R), {
      unsubscribe: () => {
        if (this.requestHandlers.get(T) === R) this.requestHandlers.delete(T);
      }
    };
    let a = this.handlers.get(T) ?? [];
    return a.push(R), this.handlers.set(T, a), {
      unsubscribe: () => {
        let e = this.handlers.get(T);
        if (e) {
          let t = e.indexOf(R);
          if (t !== -1) e.splice(t, 1);
        }
      }
    };
  }
  registerCommand(T, R, a) {
    return this.commands.set(T, {
      id: T,
      options: R,
      handler: a
    }), this.bridge.emitEvent("commands.changed", {
      pluginName: this.pluginName
    }), {
      unsubscribe: () => {
        if (this.commands.has(T)) this.commands.delete(T), this.bridge.emitEvent("commands.changed", {
          pluginName: this.pluginName
        });
      }
    };
  }
  registerTool(T) {
    return this.tools.set(T.name, {
      name: T.name,
      description: T.description,
      inputSchema: T.inputSchema,
      execute: T.execute
    }), this.bridge.emitEvent("tools.changed", {
      pluginName: this.pluginName
    }), {
      unsubscribe: () => {
        if (this.tools.has(T.name)) this.tools.delete(T.name), this.bridge.emitEvent("tools.changed", {
          pluginName: this.pluginName
        });
      }
    };
  }
  getRegisteredTools() {
    return Array.from(this.tools.values()).map(T => ({
      name: T.name,
      description: T.description,
      inputSchema: T.inputSchema,
      pluginName: this.pluginName
    }));
  }
  async executeTool(T, R) {
    let a = this.tools.get(T);
    if (!a) throw Error(`Tool not found: ${T}`);
    let e = {
      logger: ZC(this.bridge, this.scopedLogger, this.pluginName, `tool:${T}`)
    };
    return a.execute(R, e);
  }
  async executeCommand(T, R) {
    let a = this.commands.get(T);
    if (!a) throw Error(`Command not found: ${T}`);
    let e = {
      ui: this.baseCtx.ui,
      system: this.baseCtx.system,
      ai: this.baseCtx.ai,
      $: this.baseCtx.$,
      thread: R?.threadID ? {
        id: R.threadID
      } : void 0
    };
    await a.handler(e);
  }
  getRegisteredCommands() {
    return Array.from(this.commands.values()).map(T => {
      let R = {
        id: T.id,
        category: T.options.category ?? this.pluginName,
        title: T.options.title,
        pluginName: this.pluginName
      };
      if (T.options.description !== void 0) R.description = T.options.description;
      return R;
    });
  }
  async emit(T, R, a) {
    let e = this.handlers.get(T);
    if (!e) return;
    let t = iuT(T, R),
      r = ZC(this.bridge, this.scopedLogger, this.pluginName, t, a),
      h = {
        ...this.baseCtx,
        thread: {
          ...this.baseCtx.thread,
          id: cuT(R)
        },
        logger: r,
        span: a
      };
    for (let i of e) await i(R, h);
  }
  async handleRequest(T, R, a) {
    let e = this.requestHandlers.get(T);
    if (!e) return jWR(T);
    let t = iuT(T, R),
      r = ZC(this.bridge, this.scopedLogger, this.pluginName, t, a),
      h = {
        ...this.baseCtx,
        thread: {
          ...this.baseCtx.thread,
          id: cuT(R)
        },
        logger: r,
        span: a
      };
    return e(R, h);
  }
  hasRequestHandler(T) {
    return this.requestHandlers.has(T);
  }
  get registeredEvents() {
    return [...this.handlers.keys(), ...this.requestHandlers.keys()];
  }
}
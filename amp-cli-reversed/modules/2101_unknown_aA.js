class aA {
  enabled;
  interval;
  static _instance = null;
  server = null;
  latestSnapshot = null;
  timer = null;
  rootElement = null;
  port;
  objectToId = new WeakMap();
  nextId = 0;
  renderObjectToElementMap = new Map();
  keystrokeHistory = [];
  MAX_KEYSTROKE_HISTORY = 50;
  constructor(T = !1, R = 1000, a) {
    this.enabled = T, this.interval = R, this.port = a ?? 9876, aA._instance = this;
  }
  static get instance() {
    return aA._instance;
  }
  start(T) {
    if (!this.enabled) return;
    this.rootElement = T, this.startServer(), this.startPeriodicScan();
  }
  stop() {
    if (this.timer) clearInterval(this.timer), this.timer = null;
    if (this.server) this.server.close(), this.server = null;
    aA._instance = null;
  }
  static recordKeystroke(T, R, a) {
    let e = aA._instance;
    if (!e || !e.enabled) return;
    let t = {
      timestamp: Date.now(),
      key: T,
      focusPath: R,
      handled: a
    };
    if (e.keystrokeHistory.push(t), e.keystrokeHistory.length > e.MAX_KEYSTROKE_HISTORY) e.keystrokeHistory.shift();
  }
  startServer() {
    this.server = gk0.createServer((T, R) => {
      if (R.setHeader("Access-Control-Allow-Origin", "*"), R.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"), R.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"), T.method === "OPTIONS") {
        R.writeHead(200), R.end();
        return;
      }
      if (T.url === "/widget-tree" && T.method === "GET") {
        R.setHeader("Content-Type", "application/json"), R.writeHead(200), R.end(JSON.stringify(this.latestSnapshot || {
          timestamp: Date.now(),
          rootWidget: null
        }));
        return;
      }
      if (T.url === "/focus-tree" && T.method === "GET") {
        R.setHeader("Content-Type", "application/json"), R.writeHead(200);
        let a = ic.instance.debugDumpFocusTree();
        R.end(JSON.stringify(a || {
          timestamp: Date.now(),
          rootScope: null
        }));
        return;
      }
      if (T.url === "/health" && T.method === "GET") {
        R.setHeader("Content-Type", "application/json"), R.writeHead(200), R.end(JSON.stringify({
          status: "ok",
          enabled: this.enabled
        }));
        return;
      }
      R.writeHead(404), R.end("Not Found");
    }), this.server.listen(this.port, "localhost", () => {
      J.info(`Widget Tree Debugger running on http://localhost:${this.port}`), J.info(`Widget Tree Data: http://localhost:${this.port}/widget-tree`);
    }), this.server.on("error", T => {
      J.error("Widget Tree Debugger server error:", T);
    });
  }
  startPeriodicScan() {
    this.scanTree(), this.timer = setInterval(() => {
      this.scanTree();
    }, this.interval);
  }
  scanTree() {
    if (!this.rootElement) return;
    try {
      this.renderObjectToElementMap.clear(), this.buildRenderObjectElementMap(this.rootElement);
      let T = this.elementToDebugInfo(this.rootElement),
        R = this.elementToElementDebugInfo(this.rootElement),
        a = this.rootElement.renderObject ? this.renderObjectToRenderTreeDebugInfo(this.rootElement.renderObject, this.rootElement) : null;
      this.latestSnapshot = {
        timestamp: Date.now(),
        rootWidget: T,
        rootElement: R,
        rootRenderObject: a,
        recentKeystrokes: [...this.keystrokeHistory]
      };
    } catch (T) {
      J.error("Error scanning trees:", T);
    }
  }
  elementToDebugInfo(T) {
    let R = this.toId(T),
      a = T.widget.constructor.name,
      e = T.widget.key ? String(T.widget.key) : void 0,
      t = T.depth,
      r;
    if (T.renderObject) r = this.renderObjectToDebugInfo(T.renderObject);
    let h = T.children.map(i => this.elementToDebugInfo(i));
    return {
      id: R,
      type: a,
      key: e,
      depth: t,
      renderObject: r,
      children: h
    };
  }
  elementToElementDebugInfo(T) {
    let R = this.toId(T),
      a = T.constructor.name,
      e = T.depth,
      t = T.dirty,
      r = T.mounted,
      h = this.elementToDebugInfo(T),
      i;
    if (T.renderObject) i = this.renderObjectToDebugInfo(T.renderObject);
    let c = T.children.map(s => this.elementToElementDebugInfo(s));
    return {
      id: R,
      type: a,
      depth: e,
      dirty: t,
      mounted: r,
      widget: h,
      renderObject: i,
      children: c
    };
  }
  renderObjectToRenderTreeDebugInfo(T, R) {
    let a = this.toId(T),
      e = this.renderObjectToElementMap.get(T),
      t = e ? this.toId(e) : void 0,
      r = T.constructor.name,
      h = {},
      i = !1,
      c = !1,
      s,
      A,
      l,
      o;
    if (R) o = this.getDebugData(R, T);else {
      let p = this.renderObjectToElementMap.get(T);
      if (p) o = this.getDebugData(p, T);else if ("debugData" in T) {
        let _ = T.debugData;
        if (_ && Object.keys(_).length > 0) o = _;
      }
    }
    try {
      if ("needsLayout" in T) i = T.needsLayout;
      if ("needsPaint" in T) c = T.needsPaint;
      if ("size" in T) A = T.size;
      if ("_lastConstraints" in T) s = T._lastConstraints;
      if ("offset" in T) {
        let _ = T.offset;
        if (_ && typeof _ === "object" && "x" in _ && "y" in _) l = {
          x: _.x,
          y: _.y
        };
      }
      let p = Object.getOwnPropertyNames(T);
      for (let _ of p) if (!_.startsWith("_") && _ !== "constructor" && !["needsLayout", "needsPaint", "size", "constraints", "offset"].includes(_)) try {
        let m = T[_];
        if (typeof m !== "function" && typeof m !== "object") h[_] = m;
      } catch {}
    } catch (p) {
      h.error = `Failed to extract properties: ${p}`;
    }
    let n = [];
    try {
      let p = T;
      if ("children" in T && Array.isArray(p.children)) for (let _ of p.children) n.push(this.renderObjectToRenderTreeDebugInfo(_));
    } catch {}
    return {
      id: a,
      type: r,
      constraints: s,
      size: A,
      offset: l,
      needsLayout: i,
      needsPaint: c,
      properties: h,
      debugData: o,
      elementId: t,
      children: n
    };
  }
  renderObjectToDebugInfo(T) {
    let R = T.constructor.name,
      a = {};
    try {
      if ("size" in T) a.size = T.size;
      if ("constraints" in T) a.constraints = T.constraints;
      if ("offset" in T) a.offset = T.offset;
      let e = Object.getOwnPropertyNames(T);
      for (let t of e) if (!t.startsWith("_") && t !== "constructor") try {
        let r = T[t];
        if (typeof r !== "function") a[t] = r;
      } catch {}
    } catch (e) {
      a.error = `Failed to extract properties: ${e}`;
    }
    return {
      type: R,
      properties: a
    };
  }
  getLatestSnapshot() {
    return this.latestSnapshot;
  }
  forceScan() {
    this.scanTree();
  }
  buildRenderObjectElementMap(T) {
    if (T.renderObject) this.renderObjectToElementMap.set(T.renderObject, T);
    for (let R of T.children) this.buildRenderObjectElementMap(R);
  }
  toId(T) {
    let R = this.objectToId.get(T);
    if (R === void 0) R = `inspector-${this.nextId++}`, this.objectToId.set(T, R);
    return R;
  }
  getDebugData(T, R) {
    let a = {};
    if ("debugData" in T.widget) {
      let t = T.widget.debugData;
      if (t && Object.keys(t).length > 0) a = {
        ...a,
        ...t
      };
    }
    let e = R || T.renderObject;
    if (e && "debugData" in e) {
      let t = e.debugData;
      if (t && Object.keys(t).length > 0) a = {
        ...a,
        ...t
      };
    }
    return Object.keys(a).length > 0 ? a : void 0;
  }
}
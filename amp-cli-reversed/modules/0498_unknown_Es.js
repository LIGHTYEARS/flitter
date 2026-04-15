class Es {
  static instance = null;
  logs = [];
  maxLogs = 1000;
  listeners = new Set();
  constructor() {}
  static getInstance() {
    if (!Es.instance) Es.instance = new Es();
    return Es.instance;
  }
  addLog(T, R, ...a) {
    let e = {
      timestamp: new Date(),
      level: T,
      message: R,
      args: a
    };
    if (this.logs.push(e), this.logs.length > this.maxLogs) this.logs.shift();
    this.notifyListeners();
  }
  notifyListeners() {
    let T = this.getLogs();
    for (let R of this.listeners) try {
      R(T);
    } catch (a) {
      let e = this.originalConsole?.error;
      if (e) e("Error in log change listener:", a);
    }
  }
  getLogs() {
    return [...this.logs];
  }
  clear() {
    this.logs = [], this.notifyListeners();
  }
  addListener(T) {
    this.listeners.add(T);
  }
  removeListener(T) {
    this.listeners.delete(T);
  }
  interceptConsole() {
    let T = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      log: console.log.bind(console),
      debug: console.debug.bind(console)
    };
    console.error = (R, ...a) => {
      this.addLog("error", R, ...a);
    }, console.warn = (R, ...a) => {
      this.addLog("warn", R, ...a);
    }, console.info = (R, ...a) => {
      this.addLog("info", R, ...a);
    }, console.log = (R, ...a) => {
      this.addLog("info", R, ...a);
    }, console.debug = (R, ...a) => {
      this.addLog("debug", R, ...a);
    }, this.originalConsole = T;
  }
  restoreConsole() {
    let T = this.originalConsole;
    if (T) console.error = T.error, console.warn = T.warn, console.info = T.info, console.log = T.log, console.debug = T.debug;
  }
}
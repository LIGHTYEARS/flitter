class DXT {
  baseURL;
  apiKey;
  configService;
  runtimeDependencies;
  createObserver;
  loadThreadHistory;
  observingClients = [];
  _lastActiveObservingClient = null;
  connectionErrorHandlers = new Set();
  constructor(T, R, a, e, t, r = null) {
    this.baseURL = T, this.apiKey = R, this.configService = a, this.runtimeDependencies = e, this.createObserver = t, this.loadThreadHistory = r;
  }
  get lastActiveObservingClient() {
    return this._lastActiveObservingClient;
  }
  onConnectionError(T) {
    return this.connectionErrorHandlers.add(T), () => {
      this.connectionErrorHandlers.delete(T);
    };
  }
  connectToThread(T) {
    let R = this.observingClients.find(c => c.threadID === T || c.client.getThreadId() === T);
    if (R) {
      let c = {
        client: R.client,
        observer: R.observer
      };
      return this._lastActiveObservingClient = c, c;
    }
    let a = this.createObserver(),
      {
        transport: e,
        transportCallbacks: t
      } = this.createTransport(T);
    t.bindObserverEventHandler(c => {
      GxT(a, c);
    });
    let r = this.connectExistingThread(e, T, t),
      h = {
        client: e,
        observer: a,
        ready: r,
        threadID: T
      };
    this.trackObservingClientReady(h), this.observingClients.push(h);
    let i = {
      client: h.client,
      observer: a
    };
    return this._lastActiveObservingClient = i, i;
  }
  createNewThread() {
    let T = this.createObserver(),
      {
        transport: R,
        transportCallbacks: a
      } = this.createTransport();
    a.bindObserverEventHandler(h => {
      GxT(T, h);
    });
    let e = this.connectNewThread(R, a),
      t = {
        client: R,
        observer: T,
        ready: e,
        threadID: void 0
      };
    this.trackObservingClientReady(t), this.observingClients.push(t);
    let r = {
      client: t.client,
      observer: T
    };
    return this._lastActiveObservingClient = r, r;
  }
  dispose() {
    for (let {
      client: T,
      ready: R
    } of this.observingClients.values()) T.dispose(), R.then(({
      executor: a
    }) => {
      a.dispose();
    }).catch(() => {
      return;
    });
    this.observingClients.length = 0, this._lastActiveObservingClient = null, this.connectionErrorHandlers.clear();
  }
  createTransport(T) {
    let R = ck0();
    return {
      transport: new ZeT({
        transport: {
          baseURL: this.baseURL,
          wsTokenProvider: () => sk0(this.configService, this.apiKey, T)
        },
        observerCallbacks: R.observerCallbacks,
        executorCallbacks: R.executorCallbacks,
        threadHistoryLoader: this.loadThreadHistory ?? void 0
      }),
      transportCallbacks: R
    };
  }
  async connectNewThread(T, R) {
    await T.connect();
    let a = T.getThreadId();
    if (!a) throw T.disconnect(), Error("DTW transport connected without a thread ID");
    let e = this.createExecutor(T, a);
    this.attachExecutorCallbacks(e, T, R);
    try {
      return await e.connect("local-client"), T.resumeFromVersion(0), {
        transport: T,
        executor: e
      };
    } catch (t) {
      throw e.dispose(), T.disconnect(), t;
    }
  }
  async connectExistingThread(T, R, a) {
    let e = await T.loadThreadHistory(R);
    if (!e) throw T.dispose(), Error("Thread not found");
    let t = this.createExecutor(T, R);
    this.attachExecutorCallbacks(t, T, a);
    try {
      return await T.connect(), await t.connect("local-client"), T.resumeFromVersion(e.version), {
        transport: T,
        executor: t
      };
    } catch (r) {
      throw t.dispose(), T.disconnect(), r;
    }
  }
  createExecutor(T, R) {
    return new PH({
      transport: T,
      toolService: this.runtimeDependencies.toolService,
      configService: this.configService,
      clientID: this.runtimeDependencies.clientID,
      threadID: R,
      getEnvironment: this.runtimeDependencies.getEnvironment,
      readFileSystemDirectory: this.runtimeDependencies.readFileSystemDirectory,
      skillService: this.runtimeDependencies.skillService,
      sendGitSnapshot: !1
    });
  }
  attachExecutorCallbacks(T, R, a) {
    a.bindExecutorRuntime(T), T.handleConnectionChange(R.getConnectionInfo());
  }
  trackObservingClientReady(T) {
    T.ready.then(({
      transport: R
    }) => {
      T.threadID = R.getThreadId() ?? T.threadID;
    }).catch(R => {
      this.removeObservingClient(T), this.emitConnectionError({
        threadID: T.threadID ?? T.client.getThreadId() ?? void 0,
        error: R
      });
    });
  }
  emitConnectionError(T) {
    for (let R of this.connectionErrorHandlers) R(T);
  }
  removeObservingClient(T) {
    let R = this.observingClients.indexOf(T);
    if (R !== -1) this.observingClients.splice(R, 1);
    if (this._lastActiveObservingClient?.client === T.client) this._lastActiveObservingClient = null;
  }
}
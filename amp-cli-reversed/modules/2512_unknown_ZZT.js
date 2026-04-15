class ZZT {
  mcpService;
  workspaceFolder;
  pendingServers = new Set();
  notificationTimeout;
  _pendingServersSubject = new f0([]);
  serversSubscription;
  pendingServers$ = this._pendingServersSubject;
  constructor(T, R) {
    this.mcpService = T, this.workspaceFolder = R, this.setupListener();
  }
  setupListener() {
    this.mcpService.onUntrustedWorkspaceServer = (R, a) => {
      if (this.pendingServers.add(R), this.notificationTimeout) clearTimeout(this.notificationTimeout);
      this.notificationTimeout = setTimeout(() => {
        this._pendingServersSubject.next(Array.from(this.pendingServers)), this.notificationTimeout = void 0;
      }, 700);
    };
    let T = this.mcpService.trustStore.changes ? this.mcpService.trustStore.changes.pipe(Y3(void 0)) : AR.of(void 0);
    this.serversSubscription = v3(this.mcpService.servers, T).pipe(L9(([R, a]) => Q9(async () => {
      let e = new Set();
      for (let t of R) if (t.requiresApproval && t.specHash) {
        if (!(await this.mcpService.trustStore.hasEntry?.({
          serverName: t.name,
          specHash: t.specHash
        }))) e.add(t.name);
      }
      return e;
    }))).subscribe(R => {
      if (this.pendingServers.size === 0) return;
      let a = !1,
        e = Array.from(this.pendingServers);
      for (let t of e) if (!R.has(t)) this.pendingServers.delete(t), a = !0;
      if (a) this._pendingServersSubject.next(Array.from(this.pendingServers));
    });
  }
  async trustAlways() {
    try {
      await this.mcpService.allowWorkspace(this.workspaceFolder);
      let T = Array.from(this.pendingServers);
      for (let R of T) try {
        await this.mcpService.approveWorkspaceServer(R);
      } catch (a) {
        J.error("Failed to approve MCP server", {
          serverName: R,
          error: a
        });
      }
    } catch (T) {
      J.error("Failed to allow workspace", {
        error: T
      });
    }
    this.clear();
  }
  async trustOnce(T) {
    try {
      await this.mcpService.approveWorkspaceServer(T), this.pendingServers.delete(T), this._pendingServersSubject.next(Array.from(this.pendingServers));
    } catch (R) {
      J.error("Failed to approve MCP server", {
        serverName: T,
        error: R
      });
    }
  }
  async deny() {
    let T = Array.from(this.pendingServers);
    for (let R of T) try {
      await this.mcpService.denyWorkspaceServer(R);
    } catch (a) {
      J.error("Failed to deny MCP server", {
        serverName: R,
        error: a
      });
    }
    this.clear();
  }
  clear() {
    this.pendingServers.clear(), this._pendingServersSubject.next([]);
  }
  dispose() {
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    if (this.serversSubscription) this.serversSubscription.unsubscribe();
  }
}
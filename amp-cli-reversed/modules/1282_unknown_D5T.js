class D5T {
  configService;
  workspaceRootPath;
  constructor(T, R) {
    this.configService = T, this.workspaceRootPath = R;
  }
  get changes() {
    return this.configService.config.pipe(JR(T => ({
      mcpTrustedServers: T.settings.mcpTrustedServers,
      workspaces: T.settings.workspaces
    })), E9((T, R) => JSON.stringify(T) === JSON.stringify(R)), JR(() => {
      return;
    }));
  }
  async isTrusted(T) {
    if (this.workspaceRootPath && (await this.isWorkspaceAllowlisted(this.workspaceRootPath))) return !0;
    return (await this.loadEntries()).find(R => R.serverName === T.serverName && R.specHash === T.specHash)?.allow ?? !1;
  }
  async isWorkspaceAllowlisted(T) {
    return (await this.loadWorkspaces()).some(R => R.path === T && R.allowAllMcpServers === !0);
  }
  async allowWorkspace(T) {
    let R = await this.loadWorkspaces(),
      a = R.find(e => e.path === T);
    if (a) a.allowAllMcpServers = !0;else R.push({
      path: T,
      allowAllMcpServers: !0
    });
    await this.saveWorkspaces(R);
  }
  isWorkspaceTrusted() {
    if (!this.workspaceRootPath) return AR.of(!1);
    let T = this.workspaceRootPath;
    return this.configService.config.pipe(JR(R => R.settings.workspaces), E9((R, a) => JSON.stringify(R) === JSON.stringify(a)), L9(R => {
      let a = (R ?? []).some(e => e.path === T && e.allowAllMcpServers === !0);
      return AR.of(a);
    }));
  }
  async loadWorkspaces() {
    return (await this.configService.get(euT, "global")) ?? [];
  }
  async saveWorkspaces(T) {
    await this.configService.updateSettings(euT, T, "global");
  }
  async setTrust(T, R) {
    let a = (await this.loadEntries()).filter(e => !(e.serverName === T.serverName && e.specHash === T.specHash));
    a.push({
      ...T,
      allow: R
    }), await this.saveEntries(a);
  }
  async loadEntries() {
    return (await this.configService.get(auT, "global")) ?? [];
  }
  async hasEntry(T) {
    return (await this.loadEntries()).find(R => R.serverName === T.serverName && R.specHash === T.specHash) !== void 0;
  }
  async saveEntries(T) {
    await this.configService.updateSettings(auT, T, "global");
  }
}
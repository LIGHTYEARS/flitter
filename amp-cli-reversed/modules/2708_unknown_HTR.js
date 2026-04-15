class HTR {
  configMode;
  visibleModes = [];
  allowedModes = new Set();
  settings;
  freeTierStatus;
  workspace;
  userEmail;
  listeners = new Set();
  getThread;
  configSubscription = null;
  constructor(T) {
    let {
      sessionState: R,
      freeTierStatus: a,
      config$: e,
      getThread: t,
      workspace: r,
      userEmail: h
    } = T;
    this.getThread = t, this.freeTierStatus = a, this.workspace = r, this.userEmail = h, this.settings = {}, this.configMode = Jy(this.settings), this.recomputeVisibleModes(), this.configMode = this.clampToVisibleMode(this.resolveInitialMode(R?.agentMode, this.settings)) ?? "smart", this.configSubscription = e.subscribe(i => {
      this.settings = i.settings, this.recomputeVisibleModes(), this.configMode = this.clampToVisibleMode(this.resolveInitialMode(R?.agentMode, this.settings)) ?? "smart", this.notifyListeners();
    });
  }
  recomputeVisibleModes() {
    let {
      visibleAgentModes: T,
      allowedAgentModes: R
    } = aAR({
      ...this.settings,
      disabledAgentModes: this.workspace?.disabledAgentModes
    }, this.freeTierStatus.canUseAmpFree && !this.freeTierStatus.isDailyGrantEnabled, {
      userEmail: this.userEmail
    });
    this.visibleModes = T, this.allowedModes = new Set(R), this.configMode = this.clampToVisibleMode(Jy(this.settings)) ?? "smart";
  }
  resolveInitialMode(T, R) {
    let a = this.freeTierStatus.canUseAmpFree && !this.freeTierStatus.isDailyGrantEnabled,
      e = T;
    if (T && qt(T) && !a) e = void 0;
    let t = this.getThread();
    if (!t) return e ?? Jy(R);
    if (ve(t) === 0 && e) return e;
    if (t.agentMode) return t.agentMode;
    return e ?? Jy(R);
  }
  addListener(T) {
    this.listeners.add(T);
  }
  removeListener(T) {
    this.listeners.delete(T);
  }
  notifyListeners() {
    let T = this.getState();
    for (let R of this.listeners) R(T);
  }
  getState() {
    return {
      effectiveMode: this.getEffectiveMode(),
      configMode: this.configMode,
      visibleModes: this.visibleModes
    };
  }
  getEffectiveMode() {
    let T = this.getThread();
    if (!T) return this.configMode;
    if (T.agentMode) return T.agentMode;
    return this.configMode;
  }
  clampToVisibleMode(T) {
    if (!T) return null;
    if (this.visibleModes.some(R => R.mode === T)) return T;
    if (this.allowedModes.has(T)) return T;
    return this.visibleModes.at(0)?.mode ?? "smart";
  }
  nextToggleMode(T, R = !1) {
    let a = this.getThread();
    if (!a) return null;
    if (ve(a) > 0 && !R) return null;
    let e = RCT(T, this.visibleModes);
    if (e === T) return null;
    return e;
  }
  isInRestrictedFreeMode() {
    let T = this.getEffectiveMode();
    if (!qt(T)) return !1;
    return !this.freeTierStatus.canUseAmpFree || this.freeTierStatus.isDailyGrantEnabled;
  }
  getVisibleModes() {
    return this.visibleModes;
  }
  updateVisibilityContext(T) {
    let R = !1;
    if (T.freeTierStatus !== void 0) {
      let a = T.freeTierStatus;
      if (this.freeTierStatus.canUseAmpFree !== a.canUseAmpFree || this.freeTierStatus.isDailyGrantEnabled !== a.isDailyGrantEnabled) this.freeTierStatus = a, R = !0;
    }
    if ("workspace" in T && this.workspace !== T.workspace) this.workspace = T.workspace, R = !0;
    if ("userEmail" in T && this.userEmail !== T.userEmail) this.userEmail = T.userEmail, R = !0;
    if (!R) return;
    this.recomputeVisibleModes(), this.notifyListeners();
  }
  dispose() {
    this.configSubscription?.unsubscribe(), this.configSubscription = null, this.listeners.clear();
  }
}
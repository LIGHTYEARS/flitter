// Module: claude-config-system
// Original: segment1[2443895:2479567]
// Type: Scope-hoisted
// Exports: i2, Tz0, az0, C8R, ez0, tz0, $B, vB, Vo, bhT, oz0, nz0, JgT, lz0, Az0, pz0, _z0, bz0, mz0, uz0
// Category: cli

t ?? void 0, onRestoreConfirm: () => {
this.options.onRestoreConfirm()
}, onRestoreCancel: () => {
this.options.onRestoreCancel()
}, onEditConfirm: () => {
this.options.onEditConfirm()
}, onEditCancel: () => {
this.options.onEditCancel()
}, onShowImagePreview: o
});
else l = new S$({
  message: r,
  isFirstMessage: a > 0,
  onShowImagePreview: o
})
}
return l
}
if (r.role === "assistant") {
  let l = this._buildAssistantMessageWidget(T, r, a, R.id);
  return new SR({
    key: e,
    child: l
  })
}
let h = r,
  i = [],
  c = this.options.onGetOrdinalFromUserMessageIndex(a),
  s = this.options.isInSelectionMode && c !== null && this.options.stateController.selectedUserMessageOrdinal === c,
  A = (l, o) => {
    this.options.onShowImagePreview(l, o, () => {})
  };
for (let l of h.content) {
  if (l.type !== "manual_bash_invocation") continue;
  if (this.options.stateController.editingMessageOrdinal === c && this.options.stateController.editingController) i.push(new GQ({
    controller: this.options.stateController.editingController,
    message: h,
    onSubmitted: (o, n) => {
      this.options.onEditConfirmationRequest(o, n)
    },
    completionBuilder: this.options.completionBuilder,
    autocompleteHandle: this.options.autocompleteHandle,
    onShowImagePreview: this.options.onShowImagePreview,
    onDoubleAtTrigger: this.options.onDoubleAtTrigger,
    submitOnEnter: this.options.submitOnEnter
  }));
  else if (!this.options.isInSelectionMode || !s) i.push(new S$({
    message: h,
    isFirstMessage: a > 0,
    onShowImagePreview: A
  }));
  else i.push(new zQ({
    message: h,
    isFirstMessage: a > 0,
    showRestoreHint: this.options.showRestoreHint,
    isShowingRestoreConfirmation: this.options.stateController.isShowingRestoreConfirmation,
    isShowingEditConfirmation: this.options.stateController.isShowingEditConfirmation,
    affectedFiles: [...this.options.stateController.affectedFiles],
    pendingEditText: this.options.stateController.pendingEditText ?? void 0,
    onRestoreConfirm: () => {
      this.options.onRestoreConfirm()
    },
    onRestoreCancel: () => {
      this.options.onRestoreCancel()
    },
    onEditConfirm: () => {
      this.options.onEditConfirm()
    },
    onEditCancel: () => {
      this.options.onEditCancel()
    },
    onShowImagePreview: A,
    showEditHint: !this.options.isDTWMode
  }))
}
if (i.length === 0) return new SR;
if (i.length === 1) return i[0];
return new xR({
  crossAxisAlignment: "stretch",
  children: i
})
}
let t = new Bs({
  toolUse: R.toolUse,
  toolRun: R.toolResult.run,
  toolProgress: this.options.toolProgressByToolUseID.get(R.toolUse.id),
  userInput: R.toolResult.userInput,
  subagentContent: this.options.subagentContentByParentID[R.toolUse.id]
});
return new SR({
  key: e,
  child: t
})
}
_getTaskSignatureSuffix(T) {
  if (T.item.type !== "toolResult" || !YgT(T.item.toolUse)) return;
  let R = this._isTaskCompleted(T.item.toolResult.run.status);
  return `task:${this.options.stateController.denseViewItemStates.get(T.item.id)??!R?"1":"0"}`
}
_isTaskCompleted(T) {
  return T !== "in-progress" && T !== "queued" && T !== "blocked-on-user"
}
_buildCollapsibleTaskItem(T, R, a) {
  if (R.item.type !== "toolResult") return this.buildThreadItemWidget(T, R.item, R.sourceIndex);
  let e = R.item.toolUse,
    t = R.item.toolResult.run,
    r = WQ(T, e, t),
    h = this._isTaskCompleted(t.status),
    i = this.options.stateController.denseViewItemStates.get(R.item.id) ?? !h,
    c = new ohT({
      toolUse: e,
      toolRun: t,
      subagentContent: this.options.subagentContentByParentID[e.id],
      hideHeader: !0
    });
  return new Ds({
    key: new k3(`task-${R.item.id}`),
    title: r,
    child: c,
    expanded: i,
    onChanged: (s) => {
      this.options.onStateUpdate(() => {
        this.options.stateController.setDenseViewItemState(R.item.id, s), this.options.onInvalidateSourceIndex(R.sourceIndex)
      })
    }
  })
}
_getThinkingBlockExpanded(T, R) {
  let a = `${T}-${R}`;
  return this.options.stateController.thinkingBlockStates.get(a) ?? Ut.instance.allExpanded
}
_toggleThinkingBlock(T, R) {
  return (a) => {
    let e = `${T}-${R}`;
    this.options.onStateUpdate(() => {
      this.options.stateController.setThinkingBlockState(e, a), this.options.onInvalidateSourceIndex(T)
    })
  }
}
_buildThinkingBlock(T, R, a, e, t) {
  let r = a === t,
    h = e.state?.type === "streaming" && r,
    i = e.state?.type === "cancelled" && r;
  return new Rd({
    key: new k3(`thinking-${R}-${a}`),
    thinkingBlock: T,
    expanded: this._getThinkingBlockExpanded(R, a),
    onToggle: this._toggleThinkingBlock(R, a),
    isStreaming: h,
    isCancelled: i
  })
}
_buildAssistantMessageWidget(T, R, a, e) {
  let t = this.options.showThinkingBlocks ? R.content.map((o, n) => ({
      block: o,
      index: n
    })).filter((o) => o.block.type === "thinking" && Xm(o.block)) : [],
    r = t.length > 0,
    h = t.length > 0 ? t.at(-1).index : -1,
    i = R.content.filter((o) => o.type === "text" && !o.hidden),
    c = [];
  t.forEach(({
    block: o,
    index: n
  }, p) => {
    if (p > 0) c.push(new XT({
      height: 1
    }));
    c.push(this._buildThinkingBlock(o, a, n, R, h))
  });
  let s = kr(i);
  if (r && s.trim().length > 0) c.push(new XT({
    height: 1
  }));
  if (s.trim()) c.push(J50(T, s, e));
  let A = NJT(T),
    l = R.usage != null && (R.usage.inputTokens > 0 || R.usage.outputTokens > 0);
  if (A && l) {
    let o = $R.maybeOf(T)?.colors ?? Z0.of(T).colorScheme,
      n = jL0(R.usage);
    c.push(new uR({
      padding: TR.only({
        top: 1
      }),
      child: new xT({
        text: new G(n, new cT({
          color: o.foreground,
          dim: !0
        }))
      })
    }))
  }
  if (c.length === 0) return new SR;
  if (c.length === 1) return c[0];
  return new xR({
    crossAxisAlignment: "stretch",
    mainAxisSize: "min",
    children: c
  })
}
}

function i2(T) {
  return T.type === "item" && "item" in T && "sourceIndex" in T
}

function Tz0(T) {
  let R = ZS(T);
  if (R) return `${R.hidden?"$$":"$"}${R.args.cmd}`;
  return kr(T.content)
}
class TZ {
  _selectedUserMessageOrdinal = null;
  _editingMessageOrdinal = null;
  _isShowingRestoreConfirmation = !1;
  _isShowingEditConfirmation = !1;
  _pendingEditText = null;
  _pendingEditImageAttachments = [];
  _affectedFiles = [];
  _thinkingBlockStates = new Map;
  _denseViewItemStates = new Map;
  _denseViewItemTouched = new Set;
  _editingController = null;
  listeners = new Set;
  get selectedUserMessageOrdinal() {
    return this._selectedUserMessageOrdinal
  }
  setSelectedUserMessageOrdinal(T) {
    if (this._selectedUserMessageOrdinal === T) return;
    this._selectedUserMessageOrdinal = T, this.notify()
  }
  get editingMessageOrdinal() {
    return this._editingMessageOrdinal
  }
  get isShowingRestoreConfirmation() {
    return this._isShowingRestoreConfirmation
  }
  setIsShowingRestoreConfirmation(T) {
    if (this._isShowingRestoreConfirmation === T) return;
    this._isShowingRestoreConfirmation = T, this.notify()
  }
  get isShowingEditConfirmation() {
    return this._isShowingEditConfirmation
  }
  setIsShowingEditConfirmation(T) {
    if (this._isShowingEditConfirmation === T) return;
    this._isShowingEditConfirmation = T, this.notify()
  }
  get pendingEditText() {
    return this._pendingEditText
  }
  setPendingEditText(T) {
    if (this._pendingEditText === T) return;
    this._pendingEditText = T, this.notify()
  }
  get pendingEditImageAttachments() {
    return this._pendingEditImageAttachments
  }
  setPendingEditImageAttachments(T) {
    this._pendingEditImageAttachments = [...T], this.notify()
  }
  get affectedFiles() {
    return this._affectedFiles
  }
  setAffectedFiles(T) {
    this._affectedFiles = [...T], this.notify()
  }
  get thinkingBlockStates() {
    return this._thinkingBlockStates
  }
  get denseViewItemStates() {
    return this._denseViewItemStates
  }
  get denseViewItemTouched() {
    return this._denseViewItemTouched
  }
  setThinkingBlockState(T, R) {
    if (this._thinkingBlockStates.get(T) === R) return;
    this._thinkingBlockStates.set(T, R), this.notify()
  }
  clearThinkingBlockStates() {
    if (this._thinkingBlockStates.size === 0) return;
    this._thinkingBlockStates.clear(), this.notify()
  }
  setDenseViewItemState(T, R) {
    if (this._denseViewItemStates.get(T) === R) return;
    this._denseViewItemStates.set(T, R), this._denseViewItemTouched.add(T), this.notify()
  }
  setDenseViewItemTouched(T) {
    if (this._denseViewItemTouched.has(T)) return;
    this._denseViewItemTouched.add(T), this.notify()
  }
  clearDenseViewItemStates() {
    if (this._denseViewItemStates.size === 0) return;
    this._denseViewItemStates.clear(), this._denseViewItemTouched.clear(), this.notify()
  }
  get editingController() {
    return this._editingController
  }
  startEditing(T, R) {
    if (this._editingMessageOrdinal === T && this._editingController) return;
    this._editingController?.dispose(), this._editingController = new wc, this._editingController.text = R, this._editingMessageOrdinal = T, this.notify()
  }
  stopEditing() {
    if (this._editingMessageOrdinal === null && !this._editingController) return;
    this._editingMessageOrdinal = null, this._editingController?.dispose(), this._editingController = null, this.notify()
  }
  subscribe(T) {
    return this.listeners.add(T), () => this.listeners.delete(T)
  }
  notify() {
    for (let T of [...this.listeners]) T()
  }
  reset() {
    this._selectedUserMessageOrdinal = null, this._editingMessageOrdinal = null, this._isShowingRestoreConfirmation = !1, this._isShowingEditConfirmation = !1, this._pendingEditText = null, this._pendingEditImageAttachments = [], this._affectedFiles = [], this._thinkingBlockStates.clear(), this._denseViewItemStates.clear(), this._denseViewItemTouched.clear(), this._editingController?.dispose(), this._editingController = null, this.notify()
  }
}

function az0(T) {
  switch (T) {
    case "handoff":
      return "Handed off from";
    case "fork":
      return "Forked from"
  }
}

function C8R(T) {
  return T.replace(/\r?\n/g, " ")
}

function ez0(T) {
  let R = C8R(T),
    a = B9(R);
  if (a.length <= QgT) return R;
  return a.slice(0, QgT).join("")
}

function tz0(T, R, a = "darwin") {
  if (a === "win32") {
    let e = T.replace(/\\/g, "/").toLowerCase(),
      t = R.replace(/\\/g, "/").toLowerCase();
    return e === t
  }
  return T === R
}

function $B(T) {
  let R = cz0(T);
  return O$() === "win32" ? R.toLowerCase() : R
}

function vB(T, R) {
  return $B(T) === $B(R)
}

function Vo(T, ...R) {
  return $B(T).endsWith($B(jS(...R)))
}

function bhT(T, R) {
  let a = phT();
  if (R) {
    let e = _hT(R, T);
    if (e && !e.startsWith("..")) return `./${e}`
  }
  if (T.startsWith(a)) return T.replace(a, "~");
  return T
}

function oz0(T) {
  let R = T.replace(/^\.[/\\]/, "");
  return R.endsWith("/") || R.endsWith("\\") ? R : `${R}${sz0}`
}

function nz0(T, R) {
  let a = phT();
  if (Vo(T, ".config", "agents", "skills")) return O$() === "win32" ? "%USERPROFILE%\\.config\\agents\\skills\\" : "~/.config/agents/skills/";
  if (Vo(T, ".config", "amp", "skills")) return O$() === "win32" ? "%USERPROFILE%\\.config\\agents\\skills\\" : "~/.config/agents/skills/";
  if (Vo(T, ".agents", "skills")) return vB(T, jS(a, ".agents", "skills")) ? O$() === "win32" ? "%USERPROFILE%\\.agents\\skills\\" : "~/.agents/skills/" : ".agents/skills/";
  if (Vo(T, ".claude", "skills")) return vB(T, jS(a, ".claude", "skills")) ? O$() === "win32" ? "%USERPROFILE%\\.claude\\skills\\" : "~/.claude/skills/" : ".claude/skills/";
  return oz0(bhT(T, R))
}

function JgT(T, R) {
  if (T.startsWith("builtin://")) return T.replace("builtin://", "(builtin) ");
  if (!T.startsWith("file://")) return T;
  try {
    return bhT(gW(T), R)
  } catch {
    return T
  }
}

function lz0(T, R) {
  if (T.startsWith("builtin://")) return {
    scope: "builtin"
  };
  if (!T.startsWith("file://")) return {
    scope: "global"
  };
  try {
    let a = iz0(gW(T)),
      e = phT(),
      t = nz0(a, R);
    if (Vo(a, ".config", "agents", "skills") || Vo(a, ".config", "amp", "skills") || Vo(a, ".claude", "plugins", "cache")) return {
      scope: "global",
      pathHint: t
    };
    if (Vo(a, ".agents", "skills")) return {
      scope: vB(a, jS(e, ".agents", "skills")) ? "global" : "local",
      pathHint: t
    };
    if (Vo(a, ".claude", "skills")) return {
      scope: vB(a, jS(e, ".claude", "skills")) ? "global" : "local",
      pathHint: t
    };
    if (R) {
      let r = _hT(R, a);
      if (r && !r.startsWith("..")) return {
        scope: "local",
        pathHint: t
      }
    }
  } catch {
    return {
      scope: "global"
    }
  }
  return {
    scope: "global"
  }
}

function Az0(T, R) {
  let a = new Map;
  for (let e of T) {
    let t = lz0(e.baseDir, R),
      r = t.scope === "local" ? "Local" : t.scope === "global" ? "Global" : "Built-in",
      h = `${t.scope}:${t.pathHint??""}`,
      i = a.get(h);
    if (i) {
      i.skills.push(e);
      continue
    }
    a.set(h, {
      scope: t.scope,
      label: r,
      pathHint: t.pathHint,
      skills: [e]
    })
  }
  return [...a.values()].sort((e, t) => {
    let r = {
        local: 0,
        global: 1,
        builtin: 2
      },
      h = r[e.scope] - r[t.scope];
    if (h !== 0) return h;
    return (e.pathHint ?? "").localeCompare(t.pathHint ?? "")
  })
}

function pz0(T) {
  return T.replace(/\s+/g, " ").trim()
}

function _z0(T) {
  if (T.startsWith("builtin://")) return "(built-in skill)";
  if (!T.startsWith("file://")) return T;
  try {
    return bhT(gW(T))
  } catch {
    return T
  }
}

function bz0(T, R) {
  if (T === R) return !0;
  let a = Object.keys(T),
    e = Object.keys(R);
  if (a.length !== e.length) return !1;
  for (let t of a) {
    if (!(t in R)) return !1;
    if (!Object.is(T[t], R[t])) return !1
  }
  return !0
}

function mz0(T) {
  let R = new Date().getTime() - T.getTime(),
    a = Math.floor(R / 3600000),
    e = Math.floor(a / 24),
    t = Math.floor(e / 7),
    r = Math.floor(e / 30);
  if (a < 1) return "Just now";
  if (a < 24) return `${a}h ago`;
  if (e < 7) return `${e}d ago`;
  if (t <= 4) return `${t}w ago`;
  return `${r}mo ago`
}
class V8R {
  threadService;
  constructor(T) {
    this.threadService = T
  }
  async fetchThreadSummaries(T = "", R) {
    try {
      let a = await new Promise((e, t) => {
        let r = this.threadService.observeThreadList(R).subscribe({
          next: (h) => {
            r.unsubscribe(), e(h)
          },
          error: t
        })
      });
      return {
        ok: !0,
        threads: this.formatThreadSummaries(a, T, R)
      }
    } catch (a) {
      return {
        ok: !1,
        errorMsg: a instanceof Error ? a.message : "An unexpected error occurred"
      }
    }
  }
  observeThreadSummaries(T = "", R = {}) {
    return this.threadService.observeThreadList({
      includeArchived: R.includeArchived ?? !1
    }).pipe(JR((a) => this.formatThreadSummaries(a, T, R)))
  }
  formatThreadSummaries(T, R, a = {}) {
    return T.filter((e) => {
      if (e.mainThreadID) return !1;
      if (!a.includeArchived && e.archived) return !1;
      if (!R.trim()) return !0;
      let t = e.title?.toLowerCase() || "untitled",
        r = e.id.toLowerCase(),
        h = R.toLowerCase();
      return t.includes(h) || r.includes(h)
    }).map((e) => {
      let t = new Date(e.userLastInteractedAt),
        r = mz0(t),
        h = e.id.slice(-8),
        i = e.env?.initial.trees?.[0]?.uri;
      return {
        id: e.id,
        title: e.title || "Untitled",
        updatedAt: new Date(e.userLastInteractedAt).toISOString(),
        description: {
          timeAgo: r,
          title: e.title || "Untitled",
          shortThreadID: h
        },
        diffStats: e.summaryStats?.diffStats,
        workspaceURI: i,
        relationships: e.relationships,
        agentMode: e.agentMode,
        details: {
          messageCount: e.summaryStats?.messageCount
        },
        archived: e.archived
      }
    })
  }
}

function uz0(T) {
  let R = zlR(T),
    a = Array.from(R.entries()).map(([t, r]) => ({
      path: t,
      diffStats: r
    })),
    e = $h(T)?.totalInputTokens ?? 0;
  return {
    filesAffected: a,
    totalTokens: e
  }
}
class X8R {
  currentId = null;
  current = null;
  statsCache = new Map;
  subscribeTimer = null;
  subscription = null;
  listeners = [];
  threadService = null;
  scrollController = new Q3;
  constructor() {}
  setThreadService(T) {
    this.threadService = T
  }
  async select(T) {
    if (!this.threadService) {
      J.error("TUI assert failed: ThreadService used before being set");
      return
    }
    if (this.currentId === T) return;
    this.cancelTimerAndSubscription(), this.currentId = T;
    let R = await this.threadService.get(T);
    if (R) {
      if (this.currentId === T) this.current = R, this.notifyListeners()
    }
    this.subscribeTimer = setTimeout(() => {
      this.subscribeLive(T)
    }, 1000)
  }
  clear() {
    this.cancelTimerAndSubscription(), this.currentId = null, this.current = null, this.notifyListeners()
  }
  addListener(T) {
    this.listeners.push(T)
  }
  removeListener(T) {
    let R = this.listeners.indexOf(T);
    if (R !== -1) this.listeners.splice(R, 1)
  }
  getCurrentThread() {
    return this.current
  }
  getCurrentStats() {
    if (!this.current) return null;
    let T = this.statsCache.get(this.current.id);
    if (T && T.version === this.current.v) return T.stats;
    let R = uz0(this.current);
    return this.statsCache.set(this.current.id, {
      stats: R,
      version: this.current.v
    }), R
  }
  clearStatsCache() {
    this.statsCache.clear()
  }
  dispose() {
    this.cancelTimerAndSubscription(), this.clearStatsCache(), this.scrollController.dispose(), this.listeners = []
  }
  subscribeLive(T) {
    if (!this.threadService) {
      J.error("TUI assert failed: ThreadService used before being set");
      return
    }
    if (this.currentId !== T) return;
    this.subscription = this.threadService.observe(T).subscribe((R) => {
      if (this.currentId === T) this.current = R, this.notifyListeners()
    })
  }
  cancelTimerAndSubscription() {
    if (this.subscribeTimer) clearTimeout(this.subscribeTimer), this.subscribeTimer = null;
    if (this.subscription) this.subscription.unsubscribe(), this.subscription = null
  }
  notifyListeners() {
    for (let T of this.listeners) T(this.current)
  }
}

function yz0(T, R) {
  switch (T) {
    case "update-available":
      return [new G("A newer Amp is available. Run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("amp update", new cT({
        color: R.warning
      }))];
    case "update-available-unrecognized-path":
      return [new G("A newer Amp is available.", new cT({
        color: R.foreground,
        dim: !0
      }))];
    case "update-available-brew":
      return [new G("A newer Amp is available. Run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("brew upgrade ampcode", new cT({
        color: R.warning
      }))];
    case "updated":
      return null;
    case "updated-with-warning":
      return [new G("Update complete, run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("amp update", new cT({
        color: R.warning
      })), new G(" to see warnings", new cT({
        color: R.foreground,
        dim: !0
      }))];
    case "update-error":
      return [new G("Update failed, run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("amp update", new cT({
        color: R.warning
      })), new G(" to see warnings", new cT({
        color: R.foreground,
        dim: !0
      }))];
    case "hidden":
      return null
  }
}

function Pz0(T) {
  if (typeof T !== "object" || T === null) return !1;
  return typeof Reflect.get(T, "url") === "string"
}

function kz0(T) {
  if (typeof T !== "object" || T === null) return !1;
  return typeof Reflect.get(T, "error") === "string"
}

function xz0(T) {
  try {
    let R = new URL(T);
    if (R.protocol !== "http:" && R.protocol !== "https:") return !1;
    let a = R.hostname.toLowerCase();
    return a === "localhost" || a === "127.0.0.1" || a === "::1" || a.endsWith(".localhost")
  } catch {
    return !1
  }
}
async function fz0(T) {
  return new Promise((R) => {
    m70("git", ["branch", "--show-current"], {
      cwd: T
    }, (a, e) => {
      if (a) {
        R(null);
        return
      }
      let t = e.trim();
      R(t || null)
    })
  })
}

function T$T(T) {
  return "interrupt" in T && T.interrupt === !0
}

function R$T(T) {
  return T.resolvedTokenUsage
}

function Iz0(T, R) {
  let a;
  for (let [e, t] of Object.entries(T)) {
    let r;
    for (let [h, i] of t.tools.entries()) {
      let c = R.get(i.toolUse.id);
      if (c === i.toolProgress) continue;
      r ??= [...t.tools];
      let {
        toolProgress: s,
        ...A
      } = i;
      r[h] = c === void 0 ? A : {
        ...A,
        toolProgress: c
      }
    }
    if (!r) continue;
    a ??= {
      ...T
    }, a[e] = {
      ...t,
      tools: r
    }
  }
  return a ?? T
}

function gz0(T) {
  let R = T?.messages.at(-1);
  return R?.role === "assistant" && R.state.type === "streaming"
}

function $z0(T) {
  let R = T.split(`
`);
  try {
    return R.map((a) => {
      let e = a.indexOf(":");
      if (e === -1) return {
        label: "",
        content: a$T(a)
      };
      let t = a.slice(0, e + 1),
        r = a.slice(e + 1);
      return {
        label: t,
        content: a$T(r)
      }
    })
  } catch (a) {
    return R.map((e) => ({
      label: "",
      content: [{
        type: "text",
        text: e
      }]
    }))
  }
}

function a$T(T) {
  let R = [],
    a = /(\+?\$[\d,.]+(?:\/\$[\d,.]+)?(?:\/hour)?)|(\busage paid\b|\bpaid\b)|(\s-\s(?=https?:\/\/))|((https?:\/\/)[^\s]+)|([^$\s][^\s]*)/gi,
    e, t = 0;
  while ((e = a.exec(T)) !== null) {
    if (e.index > t) {
      let A = T.slice(t, e.index);
      if (A) R.push({
        type: "text",
        text: A
      })
    }
    let [r, h, i, c, s] = e;
    if (h) R.push({
      type: "amount",
      text: h
    });
    else if (i) R.push({
      type: "paid",
      text: i
    });
    else if (c);
    else if (s) R.push({
      type: "url",
      text: s
    });
    else {
      let A = r.replace(/\s+\)/g, ")");
      R.push({
        type: "text",
        text: A
      })
    }
    t = a.lastIndex
  }
  if (t < T.length) {
    let r = T.slice(t);
    if (r) R.push({
      type: "text",
      text: r
    })
  }
  return R
}
async function vz0(T) {
  return $z0(T).map((R) => {
    let a = R.content.map((e) => {
      switch (e.type) {
        case "amount":
        case "paid":
          return oR.bold.green(e.text);
        case "url":
          return oR.dim(" - ") + oR.blue.underline(e.text);
        default:
          return oR.dim(e.text)
      }
    }).join("");
    if (R.label) return oR.bold(R.label) + a;
    return a
  }).join(`
`)
}

function jz0(T, R) {
  T.command("usage").description("Show your current Amp usage and credit balance").action(async (a, e) => {
    let t = e.optsWithGlobals(),
      r = await R(t),
      h = await r.settings.get("proxy"),
      i = nHR({
        settings: {
          url: r.ampURL,
          proxy: h
        },
        secrets: {
          getToken: (s, A) => r.secrets.get(s, A)
        }
      }),
      c = await N3.userDisplayBalanceInfo({}, {
        config: i
      });
    if (!c.ok) {
      if (c.error.code === "auth-required") process.stderr.write(oR.red("Error: ") + "You must be logged in to view usage. Run `amp login` first.\n"), process.exit(1);
      process.stderr.write(oR.red("Error: ") + c.error.message + `
`), process.exit(1)
    }
    process.stdout.write(await vz0(c.result.displayText) + `
`), process.exit(0)
  })
}

function Oz0({
  version: T,
  buildTimestamp: R,
  buildType: a
}) {
  let e = a === "dev" ? "dev" : "released",
    t = R ? new Date(R) : null,
    r = t && !Number.isNaN(t.getTime()) ? `, ${OO(t)} ago` : "";
  return `${T} (${e}${R?` ${R}`:""}${r})`
}

function e$T(T) {
  Sz0.write(`${Oz0(T)}
`)
}

function dz0(T, R) {
  T.option("-V, --version", "Print the version number and exit", () => {
    e$T(R), process.exit(0)
  }), T.command("version").description("Print the version number and exit").action(() => {
    e$T(R), process.exit(0)
  })
}
async function Cz0() {
  for (let T of jj) try {
    if ((await T.listConfigs()).length > 0) return T
  }
  catch (R) {
    J.debug("Failed to detect query-based IDE integration", {
      ideName: T.ideName,
      error: R
    })
  }
  return
}

function Lz0(T) {
  process.emitWarning = (R, a, e, t) => {
    let r = typeof R === "string" ? R : R.message || String(R),
      h = a || "Warning",
      i = !1;
    T.warn(r, {
      name: h,
      code: e
    })
  }
}

function ua(T, R) {
  if (T.getOptionValueSourceWithGlobals("dangerouslyAllowAll") === "cli") Ms("dangerouslyAllowAll", R.dangerouslyAllowAll);
  if (T.getOptionValueSourceWithGlobals("mode") === "cli") Ms("experimental.agentMode", R.mode)
}

function R3R(T, R) {
  if (T.getOptionValueSourceWithGlobals("sp") === "cli" && R.sp) return R.sp;
  if (T.getOptionValueSourceWithGlobals("systemPrompt") === "cli" && R.systemPrompt) return R.systemPrompt;
  return
}
async function Mz0(T) {
  try {
    return await $5T(T, "utf-8")
  } catch {
    return T
  }
}
async function RZ(T, R, a) {
  let e = R3R(T, R);
  if (!e) return;
  let t = X9(a) ? a.features : [],
    r = X9(a) ? a.user.email : void 0;
  if (!SS(t, dr.HARNESS_SYSTEM_PROMPT) && !a3R(r)) throw new GR("You are not allowed to do this.", 1);
  Ms("systemPrompt", await Mz0(e))
}

function a3R(T) {
  return !!(T && XdT(T))
}

function SS(T, R) {
  return T?.some((a) => a.name === R && a.enabled) ?? !1
}

function aZ(T) {
  return (T.userEmail ? Ns(T.userEmail) : !1) || SS(T.features, dr.DTW_TUI)
}

function r$T(T) {
  if (T.dtwEnabled && !T.hasV2TUIAccess) throw new GR("This TUI mode is not enabled for your user;", 1)
}

function eZ(T, R) {
  if (typeof T === "boolean") return T;
  if (!X9(R)) return !1;
  return aZ({
    userEmail: R.user.email,
    features: R.features
  })
}

function Dz0(T) {
  return T !== "pending"
}

function hx(T) {
  if (!X9(T)) return null;
  return {
    ...T.user,
    features: T.features ?? [],
    team: T.workspace ?? void 0
  }
}

function wz0(T) {
  let R = hx(T);
  if (R) return R.id;
  if (oA(T)) throw Error(T.error.message);
  throw Error("unreachable")
}

function Bz0(T) {
  try {
    let R = new URL(T);
    return R.hostname === "localhost" || R.hostname === "127.0.0.1"
  } catch {
    return T.includes("localhost") || T.includes("127.0.0.1")
  }
}

function eD(T) {
  let R = Bz0(T) ? "Run `pnpm dev` to start the local server, then try again." : "Check your network connection or the server URL and try again.";
  return new GR(`Couldn't connect to the Amp server at ${T}.`, 1, R)
}
async function h$T(T) {
  if (!C9.write(T)) await qUR(C9, "drain")
}

function Wz0(T, R) {
  let a = R.args[0],
    e = R.commands.map((t) => t.name());
  if (a && !a.includes(" ") && a.length < 30 && !/[./\\]/.test(a)) {
    let t = e.filter((h) => a.includes(h) || h.includes(a)),
      r = "Run amp --help for a list of available commands.";
    if (t.length > 0) r = `Did you mean: ${t.join(", ")}? Or run amp --help for all commands.`;
    throw new GR(V3.unknownCommand(a), 1, r)
  }
}
async function yhT(T) {
  return {
    ...T,
    getThreadEnvironment: Hs,
    osFileSystem: T.fileSystem,
    skillService: T.skillService,
    fileChangeTrackerStorage: new Im(T.fileSystem),
    generateThreadTitle: tzT,
    deleteThread: (R) => T.threadService.delete(R),
    getServerStatus: () => ln(T.configService),
    pluginService: T.pluginService
  }
}

function t3R(T) {
  return {
    toolService: T.toolService,
    configService: T.configService,
    skillService: T.skillService,
    getThreadEnvironment: Hs,
    filesystem: T.fileSystem,
    threadService: T.threadService
  }
}

function qz0(T) {
  return qXR({
    playNotificationSound: async (R) => {
      if (T.useNotificationsForService) {
        if (R === "idle" && T.isTUIVoiceNotifEnabled()) HXR();
        else UXR(R);
        let a = dX(),
          e = T5T();
        if ((!a || e || Lu0()) && T.config.settings["notifications.system.enabled"] !== !1) {
          if (R === "idle") process.stdout.write(FP("\x1B]777;notify;Amp;Agent is ready\x1B\\"));
          else if (R === "requires-user-input") process.stdout.write(FP("\x1B]777;notify;Amp;Waiting for approval\x1B\\"))
        }
      }
    },
    windowFocused: () => Promise.resolve(dX()),
    threadService: T.threadService,
    configService: T.configService,
    threadViewStates$: T.threadViewStates$
  })
}
async function X3(T, R, a) {
  let e = a?.deferAuth ?? !1;
  YlR("0.0.1775894934-g5bb49b");
  let t = LX({
    storage: T.settings,
    secretStorage: T.secrets,
    workspaceRoot: AR.of(zR.file(process.cwd())),
    defaultAmpURL: T.ampURL,
    homeDir: jB,
    userConfigDir: tZ
  });
  d40(t);
  let r = await t.getLatest();
  J.debug("Global configuration initialized", {
    settingsKeys: Object.keys(r.settings)
  });
  let h = !1;
  {
    let w = await T.secrets.get("apiKey", T.ampURL);
    if (h = Boolean(w), J.info("API key lookup before login", {
        found: Boolean(w),
        ampURL: T.ampURL,
        deferAuth: e
      }), !w)
      if (e) J.info("No API key found, continuing startup with deferred auth");
      else {
        C9.write(`No API key found. Starting login flow...
`);
        let D = await zz0(T),
          B = await T.secrets.get("apiKey", T.ampURL);
        if (J.info("Login flow completed", {
            success: D,
            storedKeyPresent: Boolean(B),
            ampURL: T.ampURL
          }), !D) await xb(), process.exit(1);
        h = !0
      }
  } {
    let w = await t.getLatest(),
      D = w.settings.url,
      B = w.secrets.isSet?.[D];
    J.info("Config secrets state after login", {
      configURL: D,
      apiKeySet: B?.apiKey ?? !1
    })
  }
  let i = m0(ln(t).pipe(da(Dz0))),
    c = e ? "pending" : await i;
  if (!e) J.info("Server status resolved", {
    status: "ready",
    isAuthenticated: X9(c),
    isError: oA(c),
    errorMessage: oA(c) ? c.error.message : void 0
  });
  let s = i.then((w) => wz0(w)),
    {
      toolService: A,
      dispose: l
    } = cFT({
      configService: t
    }),
    o = new Map,
    n = () => o.clear(),
    p = new D5T(t, T.settings.getWorkspaceRootPath()),
    _ = UqR({
      configService: t,
      filesystem: He
    }),
    m = jPR({
      configService: t,
      trustStore: p,
      skillMCPServers: _.skillMCPServers,
      createOAuthProvider: async (w, D, B) => {
        let M = `${w}:${D}`,
          V = o.get(M);
        if (V) return J.debug("Reusing existing OAuth provider for server", {
          serverName: w,
          serverUrl: D
        }), V;
        J.debug("Creating OAuth provider for server", {
          serverName: w,
          serverUrl: D
        });
        let Q = (async () => {
          let W = new lv(T.secrets),
            eT = await W.getClientInfo(w, D),
            iT = B?.scopes ?? eT?.scopes,
            aT = s_0();
          J.info("OAuth headless mode check", {
            useHeadless: aT,
            executeMode: T.executeMode,
            envVar: process.env.AMP_HEADLESS_OAUTH,
            isTTY: C9.isTTY
          });
          let oT;
          if (aT) oT = T.executeMode ? i_0() : h_0(w);
          let TT = new M5T({
            storage: W,
            serverName: w,
            serverUrl: D,
            clientId: B?.clientId ?? eT?.clientId,
            clientSecret: B?.clientSecret ?? eT?.clientSecret,
            authUrl: B?.authUrl ?? eT?.authUrl,
            tokenUrl: B?.tokenUrl ?? eT?.tokenUrl,
            scopes: iT,
            headlessAuthHandler: oT
          });
          return J.debug("OAuth provider created", {
            serverName: w,
            serverUrl: D,
            hasManualClientId: !!(B?.clientId ?? eT?.clientId),
            willUseDCR: !(B?.clientId ?? eT?.clientId),
            scopes: iT,
            headlessMode: aT,
            executeMode: T.executeMode
          }), TT
        })();
        return o.set(M, Q), Q
      }
    }),
    b = S5R({
      configService: t,
      filesystem: He,
      spawn: szT
    }),
    y;
  if (T.executeMode) {
    let w = await q5R({
      toolService: A,
      providers: [m, b],
      initialTimeout: 15000
    });
    y = w.registrations;
    for (let [D, B] of w.initErrors) J.warn(`${D} provider initialization slow or failed:`, B)
  } else y = ozT({
    toolService: A,
    providers: [m, b]
  });
  if (R.jetbrains) Mg("JetBrains");
  else if (R.ide && ob0()) Mg("VS Code");
  else if (R.ide && nb0()) Mg("Neovim");
  else if (R.ide) {
    let w = await Cz0();
    if (w) {
      let D = ECT(w.ideName);
      if (D) Mg(D)
    }
  }
  if (T.executeMode) QlR(!0);
  let u, P = Us.status.pipe(JR((w) => Boolean(w.connected && w.authenticated && w.ideName && rpR(w.ideName))), E9()).subscribe((w) => {
      if (w) {
        if (!u) u = A.registerTool(W5R)
      } else u?.dispose(), u = void 0
    }),
    k;
  if (!T.executeMode) {
    let w = await T.settings.get("fuzzy.alwaysIncludePaths") ?? [];
    k = new vw(process.cwd(), {
      alwaysIncludePaths: w
    }, !0)
  } else k = new class extends vw {
    async start() {}
    async query() {
      return []
    }
    getStats() {
      return {
        state: "unstarted",
        stats: []
      }
    }
    dispose() {}
  };
  let x = new azT(ezT(t), {
    maxThreads: 200
  });
  J.info("Starting Amp background services");
  let f = R.takeMeBack ? !1 : void 0,
    v = eZ(f, c),
    g = new aJT,
    I = process.env.PLUGINS ?? "off",
    S = R.headless ? JC0() : void 0,
    O = S ?? new nQ({
      configService: t
    }),
    j = O instanceof nQ ? O : void 0;
  if (j) j.pluginExecutorKind = v ? "local" : "unknown";
  let d = X5T({
      configService: t,
      fileSystem: He,
      platform: O,
      internalPlugins: e3R,
      pluginFilter: I
    }),
    C = tqR({
      pluginService: d,
      toolService: A
    }),
    L = {
      configService: t,
      toolService: A,
      mcpService: m,
      skillService: _,
      toolboxService: b,
      trustStore: p,
      threadService: x,
      secretStorage: T.secrets,
      settingsStorage: T.settings,
      fuzzyServer: k,
      fileSystem: He,
      terminal: g,
      pluginService: d,
      pluginPlatform: j,
      headlessPluginPlatform: S,
      serverStatus: c,
      serverStatusPromise: i,
      viewerUserIDPromise: s,
      hasAPIKeyAtStartup: h
    };
  return {
    ...L,
    async asyncDispose() {
      if (L.mcpService.hasAuthenticatingClients()) J.info("Waiting for OAuth authentication to complete before exit..."), await L.mcpService.waitForAuthentication();
      for (let w of y.values()) w.dispose();
      await L.mcpService.dispose(), n(), await L.threadService.asyncDispose(), L.configService.unsubscribe(), l(), L.fuzzyServer.dispose(), L.settingsStorage[Symbol.dispose](), P.unsubscribe(), u?.dispose(), C.dispose(), await L.pluginService.dispose()
    }
  }
}
async function zz0(T) {
  if (!T.executeMode) {
    if (!await OtT("Would you like to log in to Amp? [(y)es, (n)o]: ")) return C9.write(`Login cancelled. Run the command again to retry.
`), !1
  }
  return await r3R(T)
}
async function r3R(T) {
  let R = I5T(32).toString("hex"),
    a = await Hw(T.ampURL, R),
    e = new AbortController;
  try {
    await Wb(a, e.signal)
  } catch (r) {
    J.error("Error opening browser", {
      error: r
    })
  }
  let t = await Hw(T.ampURL, R, !1);
  C9.write(`If your browser does not open automatically, visit:

${oR.blue.bold(t)}

`);
  try {
    return await rk0(T.ampURL, R, T.secrets, e), C9.write("\nLogin successful! Run `amp` to get started.\n"), !0
  } catch (r) {
    return J.error("Login failed", {
      error: r
    }), Be.write(`
Login failed: ${r instanceof Error?r.message:String(r)}
`), !1
  }
}

function s$T(T) {
  if (!T || T.length === 0) return;
  let R = T.join(" ").trim();
  return R.length > 0 ? R : void 0
}
async function Fz0(T) {
  let R = {
      ...T.agentMode ? {
        agentMode: T.agentMode
      } :
      {},
      ...T.repositoryURL ? {
        repositoryURL: T.repositoryURL
      } :
      {}
    },
    a = await fetch(`${T.ampURL}/api/durable-thread-workers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${T.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(R)
    });
  if (!a.ok) {
    let t = await a.text();
    throw new GR(`Create request failed (${a.status}): ${t}`, 1)
  }
  let e = await a.json();
  if (!e.threadId || !Vt(e.threadId)) throw new GR("Create response did not include a valid thread ID", 1);
  return e.threadId
}

function Gz0(T) {
  return typeof T === "object" && T !== null && "durableObjectId" in T && typeof T.durableObjectId === "string" && T.durableObjectId.length > 0
}
async function Kz0(T) {
  let R = await fetch(new URL(`/threads/${T.threadID}/durable-object-id`, T.workerURL), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${T.apiKey}`
    }
  });
  if (!R.ok) {
    let e = await R.text();
    throw new GR(`Durable object ID request failed (${R.status}): ${e}`, 1)
  }
  let a = await R.json();
  if (!Gz0(a)) throw new GR("Durable object ID response did not include a durableObjectId", 1);
  return a.durableObjectId
}

function Vz0(T) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(T)
}
async function Xz0(T) {
  let R = await fetch(`${T.workerURL}/threads/${T.threadID}/spawn`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${T.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      repositoryURL: T.repositoryURL,
      ...T.projectID ? {
        projectID: T.projectID
      } :
      {}
    })
  });
  if (!R.ok) {
    let a = await R.text();
    throw new GR(`Spawn request failed (${R.status}): ${a}`, 1)
  }
}

function Yz0(T) {
  let R = new eS().name("amp").description("AI-powered coding assistant").option("--visibility <visibility>", "Set thread visibility (private, public, workspace, group)").configureOutput({
    writeErr: () => {}
  });
  R.exitOverride((p) => {
      if (p.code === "commander.help" || p.code === "commander.version" || p.exitCode === 0) WP(), process.exit(0);
      let _ = p.originalError ?? p;
      gl0(_)
    }), dz0(R, {
      version: "0.0.1775894934-g5bb49b",
      buildTimestamp: "2026-04-11T08:12:39.144Z",
      buildType: "'release'"
    }), R.addHelpText("after", ib0()), R.configureHelp({
      formatHelp: cb0
    }), R.command("logout").description("Log out by removing stored API key").action(async (p, _) => {
      let m = _.optsWithGlobals(),
        b = await S8(m);
      await tF0(b)
    }), R.command("login").description("Log in to Amp").addHelpText("after", "If AMP_URL is set during login, it will be persisted to global settings for future CLI invocations, though AMP_URL will continue to take precedence.").action(async (p, _) => {
      let m = _.optsWithGlobals(),
        b = await S8(m);
      await eF0(b, await otT(m, b.settings))
    }), R.command("git-credential-helper [action]", {
      hidden: !0
    }).summary("Git credential helper for GitHub").description("Internal: implements the git credential helper protocol. Used inside sandboxes to authenticate git operations with GitHub.").action(async (p, _, m) => {
      let b = m.optsWithGlobals(),
        y = await S8(b);
      await jA0(p ?? "get", y.ampURL, y.secrets), process.exit(process.exitCode ?? 0)
    }), R.command("sign-commit", {
      hidden: !0
    }).summary("Git commit signing helper").description("Internal: implements the gpg signing interface for git commit signing. Used inside sandboxes as gpg.program.").allowUnknownOption().action(async (p, _) => {
      let m = _.optsWithGlobals(),
        b = await S8(m);
      await OA0(b.ampURL, b.secrets), process.exit(process.exitCode ?? 0)
    }), R.command("dtw-curl [threadId] [action] [message...]", {
      hidden: !0
    }).summary("DTW helper").description("Internal: helper for DTW one-shot commands.").addHelpText("after", `
Actions:
  create                  Create a new DTW thread and print its ID
  add-message <message>   Send a user message and wait for message_added
  get-transcript          Output a JSONL transcript of the thread
  dump                    Stream a full SQL dump into a local sqlite database
  durable-object-id       Print the durable object ID for the thread

Examples:
  amp dtw-curl create
  amp dtw-curl create --repository-url https://github.com/sourcegraph/amp
  amp dtw-curl create "hello"
  amp dtw-curl T-xxx add-message "hello"
  echo "hello" | amp dtw-curl T-xxx add-message
  amp dtw-curl T-xxx get-transcript
  amp dtw-curl T-xxx dump
  amp dtw-curl T-xxx dump --output-file /tmp/thread.sqlite
  amp dtw-curl T-xxx durable-object-id
`).option("--agent-mode <mode>", "Agent mode for create/add-message").option("--project-id <uuid>", "Project ID for sandbox spawn (create)").option("--repository-url <url>", "Repository URL for create/sandbox spawn (create)").option("--worker-url <url>", "Override DTW worker URL (create/add-message/dump/durable-object-id)").option("--output-file <path>", "Output sqlite DB path for dump action").option("--timeout <ms>", "Timeout waiting for message_added (add-message)", "15000").action(async (p, _, m, b, y) => {
          if (!p || p.trim().length === 0) C9.write(`dtw-curl runs one-shot DTW commands and exits.

`), y.outputHelp(), process.exit(0);
          let u = p === "create",
            P = _,
            k = null,
            x;
          if (u) {
            P = "create";
            let S = s$T(_ ? [_, ...m ?? []] : m);
            x = S ? [S] : void 0
          } else {
            if (!_ || _.trim().length === 0) Be.write(`Missing action. Expected add-message, get-transcript, dump, durable-object-id, or create.

`), y.outputHelp(), process.exit(1);
            if (!Vt(p)) throw new GR(`Invalid thread ID: ${p}`, 1);
            k = p
          }
          let f = y.optsWithGlobals(),
            v = await S8(f);
          ua(y, f);
          let g = await X3(v, f),
            I = !1;
          try {
            if (oA(g.serverStatus)) {
              let L = $v(Error(g.serverStatus.error.message));
              if (L.message === V3.networkOffline || L.message === V3.networkTimeout) throw eD(v.ampURL);
              throw new GR(V3.invalidAPIKey, 1)
            }
            let S = X9(g.serverStatus) ? g.serverStatus.user.email : void 0;
            if (!S || !Ns(S)) throw new GR("dtw-curl is only available for Amp employees", 1);
            let O = await g.secretStorage.get("apiKey", v.ampURL);
            if (!O) throw new GR("API key required. Please run `amp login` first.", 1);
            let j = b.timeout ? Number.parseInt(b.timeout, 10) : void 0;
            if (j !== void 0 && (!Number.isFinite(j) || j <= 0)) throw new GR("Timeout must be a positive integer in milliseconds", 1);
            let d = b.repositoryUrl?.trim();
            if (d) {
              let L;
              try {
                L = new URL(d)
              } catch {
                throw new GR("Repository URL must be a valid URL", 1)
              }
              if (L.protocol !== "https:") throw new GR("Repository URL must use https://", 1)
            }
            let C = b.projectId?.trim();
            if (C && !Vz0(C)) throw new GR("Project ID must be a UUID", 1);
            if (C && !d) throw new GR("Repository URL is required when project ID is provided", 1);
            if (P === "create") {
              let L = await Fz0({
                ampURL: v.ampURL,
                apiKey: O,
                agentMode: b.agentMode,
                repositoryURL: d
              });
              if (C9.write(`Created thread: ${L}
`), d) {
                let D = b.workerUrl ?? process.env.AMP_WORKER_URL ?? Pi(v.ampURL);
                await Xz0({
                  workerURL: D,
                  apiKey: O,
                  threadID: L,
                  repositoryURL: d,
                  projectID: C
                }), C9.write(`Spawn requested: ${L}
`)
              }
              let w = s$T(x);
              if (!w) {
                let D = (await fS()).trimEnd();
                if (D) w = D
              }
              if (w) {
                let D = await xkT({
                  ampURL: v.ampURL,
                  apiKey: O,
                  threadId: L,
                  message: w,
                  agentMode: b.agentMode,
                  workerUrl: b.workerUrl ?? process.env.AMP_WORKER_URL,
                  timeoutMs: j
                });
                C9.write(`Message added: ${L}#${D.messageId}
`)
              }
              I = !0
            } else if (P === "add-message") {
              let L = m && m.length > 0 ? m.join(" ") : void 0;
              if (!L || L.trim().length === 0) {
                let D = (await fS()).trimEnd();
                if (D) L = D
              }
              if (!L || L.trim().length === 0) throw new GR("Message must be provided via argument or stdin", 1, 'Either pass a message as an argument: amp dtw-curl T-xxx add-message "your message"\\nOr pipe via stdin: echo "your message" | amp dtw-curl T-xxx add-message');
              if (!k) throw new GR("Thread ID is required for add-message", 1);
              let w = await xkT({
                ampURL: v.ampURL,
                apiKey: O,
                threadId: k,
                message: L,
                agentMode: b.agentMode,
                workerUrl: b.workerUrl ?? process.env.AMP_WORKER_URL,
                timeoutMs: j
              });
              C9.write(`Message added: ${k}#${w.messageId}
`), I = !0
            } else if (P === "get-transcript") {
              if (!k) throw new GR("Thread ID is required for get-transcript", 1);
              let L = await NA(k, g);
              for (let w of L.messages) await h$T(`${JSON.stringify({threadId:L.id,message:w})}
`);
              I = !0
            } else if (P === "dump") {
              if (!k) throw new GR("Thread ID is required for dump", 1);
              let L = b.workerUrl ?? process.env.AMP_WORKER_URL ?? Pi(v.ampURL),
                w = b.outputFile && b.outputFile.trim().length > 0 ? AA.resolve(b.outputFile
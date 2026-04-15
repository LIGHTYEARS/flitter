function Z50(T) {
  let R = T.normalizedName ?? T.name;
  return R === tt || R === ja || R === uc;
}
class n8R {
  options;
  _renderItems = [];
  constructor(T) {
    this.options = T;
  }
  getRenderItems() {
    let T = UW0(this.options.items, this.options.toolProgressByToolUseID);
    return this._renderItems = T.map(R => ({
      type: "dense",
      item: R
    })), this._renderItems;
  }
  onRenderItemsUpdated(T) {
    this._renderItems = T, this._closeDenseActivityGroupsOnBoundary();
  }
  getSourceIndex(T) {
    if (T.type === "toolGroup") return T.sourceIndices[0] ?? 0;
    if (T.type === "dense") return T.item.sourceIndex ?? 0;
    return T.sourceIndex;
  }
  includesSourceIndex(T, R) {
    if (T.type === "toolGroup") return T.sourceIndices.includes(R);
    if (T.type === "dense") return T.item.sourceIndex === R || T.item.type === "activity-group" && T.item.assistantSourceIndex === R;
    return T.sourceIndex === R;
  }
  getCacheIdentity(T) {
    if (T.type === "toolGroup") return `tool-group:${T.id}`;
    if (T.type === "dense") return `dense:${T.item.id}`;
    if (T.item.type === "message") {
      let R = T.item.message;
      return `message:${R.dtwMessageID ?? `${R.role}:${R.messageId}`}`;
    }
    return `tool:${T.item.toolUse.id}`;
  }
  getRenderSignature(T) {
    if (T.type === "toolGroup") return this._signatureForDenseToolGroup(T);
    if (T.type === "dense") {
      let R = this._getDenseItemExpanded(T) ? "1" : "0",
        a = T.item.sourceIndex !== void 0 ? this.options.items[T.item.sourceIndex] : void 0,
        e = a?.type === "toolResult" ? this._toolAuxiliarySignature(a.toolUse.id) : "none",
        t = a?.type === "toolResult" ? this._toolRunSignature(a.toolResult.run) : "none";
      return `${T.item.id}|dense|${R}|${this._signatureForDenseEntry(T.item)}|${e}|${t}`;
    }
    if (T.item.type === "message") return `${T.item.id}|message`;
    return `${T.item.id}|tool|${this._toolAuxiliarySignature(T.item.toolUse.id)}`;
  }
  buildWidget(T, R, a) {
    if (R.type === "toolGroup") return this._buildDenseToolGroup(T, R, a);
    if (R.type === "dense") return this._buildDenseEntry(T, R, a);
    return this.options.buildThreadItemWidget(T, R.item, R.sourceIndex);
  }
  _signatureForDenseToolGroup(T) {
    let R = T.items.map(r => r.id).join("|"),
      a = T.items.map(r => r.toolResult.run.status).join("|"),
      e = T.items.map(r => r.toolResult.userInput ? "1" : "0").join("|"),
      t = this._getDenseItemExpanded(T) ? "1" : "0";
    return `${T.id}|group|1|${t}|${R}|${a}|${e}`;
  }
  _signatureForDenseEntry(T) {
    switch (T.type) {
      case "activity-group":
        {
          let R = this._getDenseActivityGroupLifecycle(T),
            a = this._getDenseActivityGroupAssistantState(T) ?? "none";
          return `activity|${R.active ? "1" : "0"}|${R.cancelled ? "1" : "0"}|${R.done ? "1" : "0"}|${a}|${T.reads}|${T.searches}|${T.explores}|${T.actions.map(e => `${e.title}|${e.detail ?? ""}|${e.kind}|${e.status ?? ""}|${this._guidanceFileSignature(e.guidanceFiles)}`).join("|")}`;
        }
      case "apply-patch":
        {
          let R = T.result?.files.map(e => `${e.path}|${e.additions}|${e.deletions}|${e.diff.length}`).join("|"),
            a = this._guidanceFileSignature(T.guidanceFiles);
          return `apply-patch|${T.status}|${T.error ?? ""}|${R ?? ""}|${a}`;
        }
      case "code-review":
        return `code-review|${T.status}|${T.subTools?.length ?? 0}`;
      case "bash":
        return `bash|${T.status}|${T.command}|${T.exitCode ?? ""}|${T.output?.length ?? 0}|${T.progressOutput?.length ?? 0}|${T.error ?? ""}|${this._guidanceFileSignature(T.guidanceFiles)}`;
      case "shell-command":
        return `shell-command|${T.status}|${T.command}|${T.workdir ?? ""}|${T.exitCode ?? ""}|${T.output?.length ?? 0}|${T.progressOutput?.length ?? 0}|${T.error ?? ""}|${this._guidanceFileSignature(T.guidanceFiles)}`;
      case "edit-file":
        return `edit-file|${T.status}|${T.path ?? ""}|${T.diff?.length ?? 0}|${T.error ?? ""}|${this._guidanceFileSignature(T.guidanceFiles)}`;
      case "create-file":
        return `create-file|${T.status}|${T.path ?? ""}|${T.content?.length ?? 0}|${T.error ?? ""}|${this._guidanceFileSignature(T.guidanceFiles)}`;
      case "undo-edit":
        return `undo-edit|${T.status}|${T.path ?? ""}|${T.diff?.length ?? 0}|${T.error ?? ""}`;
      case "skill":
        return `skill|${T.status}|${T.skillName ?? ""}|${T.error ?? ""}`;
      case "generic-tool":
        return `generic-tool|${T.status}|${T.toolName}`;
      case "message":
        return `message|${T.role}|${T.text}`;
    }
    return "dense";
  }
  _guidanceFileSignature(T) {
    return T?.map(R => `${R.uri}|${R.lineCount}`).join("|") ?? "";
  }
  _toolAuxiliarySignature(T) {
    let R = this.options.toolProgressByToolUseID.get(T),
      a = R ? `${R.status}|${R.content}` : "none",
      e = o8R(this.options.subagentContentByParentID[T]);
    return `progress:${a}|subagents:${e}`;
  }
  _toolRunSignature(T) {
    if (this._isToolRunCompleted(T.status)) return `run:${T.status}`;
    let R = "progress" in T ? this._unknownValueSignature(T.progress) : "no-progress",
      a = "result" in T ? this._unknownValueSignature(T.result) : "no-result";
    return `run:${T.status}|progress:${R}|result:${a}`;
  }
  _unknownValueSignature(T, R = 0) {
    if (T === void 0) return "undefined";
    if (T === null) return "null";
    if (typeof T === "string") return `string:${T.length}:${T.slice(0, 120)}`;
    if (typeof T === "number" || typeof T === "boolean" || typeof T === "bigint") return `${typeof T}:${String(T)}`;
    if (Array.isArray(T)) {
      if (R >= 2) return `array:${T.length}`;
      return `array:[${T.map(a => this._unknownValueSignature(a, R + 1)).join(",")}]`;
    }
    if (typeof T === "object") {
      let a = Object.entries(T);
      if (R >= 2) return `object:{${a.map(([e]) => e).sort().join(",")}}`;
      return `object:{${a.sort(([e], [t]) => e.localeCompare(t)).map(([e, t]) => `${e}:${this._unknownValueSignature(t, R + 1)}`).join(",")}}`;
    }
    return typeof T;
  }
  _isToolRunCompleted(T) {
    return T !== "in-progress" && T !== "queued" && T !== "blocked-on-user";
  }
  _getDenseItemExpanded(T, R) {
    let a = this._getDenseItemLocalExpanded(T);
    if (a === void 0) {
      if (_i.instance.allExpanded) return !0;
      return R ?? !1;
    }
    return _i.instance.allExpanded ? !0 : a;
  }
  _getDenseItemLocalExpanded(T) {
    let R = T.type === "toolGroup" ? T.id : T.item.id;
    return this.options.stateController.denseViewItemStates.get(R);
  }
  _setDenseItemExpanded(T, R) {
    let a = T.type === "toolGroup" ? T.id : T.item.id;
    this.options.stateController.setDenseViewItemState(a, R);
  }
  _touchDenseItem(T) {
    let R = T.type === "toolGroup" ? T.id : T.item.id;
    this.options.stateController.setDenseViewItemTouched(R);
  }
  _getDenseActivityGroupLifecycle(T) {
    let R = T.actions.filter(p => p.kind !== "thinking" && p.status).map(p => p.status),
      a = R.length > 0,
      e = R.some(p => p === "queued" || p === "in-progress"),
      t = R.some(p => p === "cancelled"),
      r = a && R.every(p => p === "done"),
      h = this._getDenseActivityGroupAssistantState(T),
      i = h === "streaming",
      c = h === "cancelled",
      s = h === void 0 && !e && this._isLatestOpenDenseActivityGroup(T) && this._isThreadStillGenerating(),
      A = this.options.threadViewState,
      l = A?.state === "active" && A.inferenceState === "cancelled",
      o = this._getRenderIndexForDenseEntry(T),
      n = !(o !== null && this._hasRenderBoundaryAfter(o)) && (i || e || s);
    return {
      active: n,
      cancelled: !n && !r && (t || c || l),
      done: !n && (r || !a && h === "complete")
    };
  }
  _getDenseActivityGroupAssistantState(T) {
    let R = T.assistantSourceIndex ?? T.sourceIndex;
    if (R == null) return;
    let a = this.options.items[R];
    if (!a || a.type !== "message" || a.message.role !== "assistant") return;
    return a.message.state.type;
  }
  _isActiveDenseActivityGroup(T) {
    if (T.type !== "activity-group") return !1;
    return this._getDenseActivityGroupLifecycle(T).active;
  }
  _isThreadStillGenerating() {
    let T = this.options.threadViewState;
    if (T?.state === "active" && (T.inferenceState === "running" || T.inferenceState === "retrying" || T.interactionState === "tool-running")) return !0;
    if (this.options.hasStartedStreamingResponse) return !0;
    return this.options.items.some(R => R.type === "toolResult" && (R.toolResult.run.status === "queued" || R.toolResult.run.status === "in-progress"));
  }
  _isLatestOpenDenseActivityGroup(T) {
    let R = this._getRenderIndexForDenseEntry(T);
    if (R === null) return !1;
    if (this._hasRenderBoundaryAfter(R)) return !1;
    for (let a = R + 1; a < this._renderItems.length; a += 1) {
      let e = this._renderItems[a];
      if (e?.type === "dense" && e.item.type === "activity-group") return !1;
    }
    return !0;
  }
  _getRenderIndexForDenseEntry(T) {
    for (let [R, a] of this._renderItems.entries()) {
      if (a.type !== "dense") continue;
      if (a.item === T) return R;
      if (a.item.id === T.id && a.item.type === T.type) return R;
    }
    return null;
  }
  _hasRenderBoundaryAfter(T) {
    let R = this._renderItems[T + 1];
    if (!R) return !1;
    if (R.type === "dense") return R.item.type !== "activity-group";
    if (R.type === "item") {
      if (R.item.type === "message") return R.item.message.role === "assistant" || R.item.message.role === "user";
      return !0;
    }
    return !0;
  }
  _closeDenseActivityGroupsOnBoundary() {
    for (let [T, R] of this._renderItems.entries()) {
      if (R.type !== "dense" || R.item.type !== "activity-group") continue;
      if (this.options.stateController.denseViewItemTouched.has(R.item.id)) continue;
      if (!this._getDenseItemExpanded(R, this._isActiveDenseActivityGroup(R.item))) continue;
      if (!this._shouldCollapseDenseActivityGroup(R, T)) continue;
      this._setDenseItemExpanded(R, !1);
    }
  }
  _shouldCollapseDenseActivityGroup(T, R) {
    let a = T.item;
    if (a.type !== "activity-group") return !1;
    let e = this._getDenseActivityGroupLifecycle(a);
    if (e.cancelled) return !0;
    if (e.active) return !1;
    let t = this._renderItems[R + 1];
    if (!t) return !1;
    if (t.type === "dense") {
      if (t.item.type === "activity-group") return !1;
      if (t.item.type === "message") return t.item.role === "user" || t.item.role === "assistant";
      return !0;
    }
    if (t.type === "item") {
      if (t.item.type === "message") return t.item.message.role === "user" || t.item.message.role === "assistant";
      return !0;
    }
    return !0;
  }
  _buildDenseToolGroup(T, R, a) {
    let e = $R.of(T),
      t = this._getDenseItemExpanded(R),
      r = [],
      h = new cT({
        color: e.app.toolName,
        bold: !0
      }),
      i = new cT({
        color: e.colors.foreground,
        dim: !0
      });
    if (R.kind === "bashExplore") r.push(new G("Explored by running", h)), r.push(new G(` ${R.items.length} ${o9(R.items.length, "command")}`, i));else r.push(new G("Explored", h)), r.push(new G(` (${R.items.length} ${o9(R.items.length, "tool")})`, i));
    let c = new xT({
        text: new G("", void 0, r),
        selectable: !0
      }),
      s = R.items.map(l => {
        let o = WQ(T, l.toolUse, l.toolResult.run);
        return new uR({
          padding: TR.only({
            left: 2
          }),
          child: o
        });
      }),
      A = s.length === 0 ? new SR() : new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: s
      });
    return new Ds({
      key: new k3(`dense-group-${R.id}`),
      title: c,
      child: A,
      expanded: t,
      onChanged: l => {
        this.options.onStateUpdate(() => {
          this._touchDenseItem(R), this._setDenseItemExpanded(R, l), this.options.onInvalidateRenderItemIndex(a);
        });
      }
    });
  }
  _buildDenseEntry(T, R, a) {
    let e = R.item;
    if (e.type === "activity-group") {
      let t = this._getDenseActivityGroupLifecycle(e);
      return new r9R({
        reads: e.reads,
        searches: e.searches,
        explores: e.explores,
        actions: e.actions,
        active: t.active,
        cancelled: t.cancelled,
        completed: t.done,
        expanded: this._getDenseItemExpanded(R, !1),
        onToggle: r => {
          this.options.onStateUpdate(() => {
            this._touchDenseItem(R), this._setDenseItemExpanded(R, r), this.options.onInvalidateRenderItemIndex(a);
          });
        }
      });
    }
    if (e.type === "apply-patch") return new s9R({
      guidanceFiles: e.guidanceFiles,
      expanded: this._getDenseItemExpanded(R),
      onToggle: t => {
        this.options.onStateUpdate(() => {
          this._setDenseItemExpanded(R, t);
        });
      },
      toolRun: e.status ? {
        status: e.status,
        result: e.result,
        error: e.error ? {
          message: e.error
        } : void 0
      } : void 0
    });
    if (e.type === "code-review") return new l9R({
      status: e.status,
      subTools: e.subTools,
      expanded: this._getDenseItemExpanded(R),
      onToggle: t => {
        this.options.onStateUpdate(() => {
          this._setDenseItemExpanded(R, t);
        });
      }
    });
    if (e.type === "bash") return new o9R({
      command: e.command,
      guidanceFiles: e.guidanceFiles,
      output: e.output,
      error: e.error,
      exitCode: e.exitCode,
      progressOutput: e.progressOutput,
      status: e.status,
      expanded: this._getDenseItemExpanded(R),
      onToggle: t => {
        this.options.onStateUpdate(() => {
          this._setDenseItemExpanded(R, t);
        });
      }
    });
    if (e.type === "shell-command") return new b9R({
      command: e.command,
      workdir: e.workdir,
      guidanceFiles: e.guidanceFiles,
      output: e.output,
      error: e.error,
      exitCode: e.exitCode,
      progressOutput: e.progressOutput,
      status: e.status,
      expanded: this._getDenseItemExpanded(R),
      onToggle: t => {
        this.options.onStateUpdate(() => {
          this._setDenseItemExpanded(R, t);
        });
      }
    });
    if (e.type === "edit-file") return new _9R({
      guidanceFiles: e.guidanceFiles,
      path: e.path,
      oldText: e.oldText,
      newText: e.newText,
      toolRun: e.status ? {
        status: e.status,
        result: e.diff ? {
          diff: e.diff
        } : void 0,
        error: e.error ? {
          message: e.error
        } : void 0
      } : void 0,
      expanded: this._getDenseItemExpanded(R),
      onToggle: t => {
        this.options.onStateUpdate(() => {
          this._setDenseItemExpanded(R, t);
        });
      }
    });
    if (e.type === "create-file") return new A9R({
      guidanceFiles: e.guidanceFiles,
      path: e.path,
      content: e.content,
      toolRun: e.status ? {
        status: e.status,
        result: {},
        error: e.error ? {
          message: e.error
        } : void 0
      } : void 0,
      expanded: this._getDenseItemExpanded(R),
      onToggle: t => {
        this.options.onStateUpdate(() => {
          this._setDenseItemExpanded(R, t);
        });
      }
    });
    if (e.type === "undo-edit") return new u9R({
      path: e.path,
      toolRun: e.status ? {
        status: e.status,
        result: e.diff ?? "",
        error: e.error ? {
          message: e.error
        } : void 0
      } : void 0,
      expanded: this._getDenseItemExpanded(R),
      onToggle: t => {
        this.options.onStateUpdate(() => {
          this._setDenseItemExpanded(R, t);
        });
      }
    });
    if (e.type === "skill") {
      let t = e.sourceIndex !== void 0 ? this.options.items[e.sourceIndex] : void 0;
      if (t?.type === "toolResult") return new chT({
        toolUse: t.toolUse,
        toolRun: t.toolResult.run
      });
    }
    if (e.type === "generic-tool") {
      let t = this.options.items[e.sourceIndex];
      if (t?.type === "toolResult") {
        if (Z50(t.toolUse)) {
          let r = this._isToolRunCompleted(t.toolResult.run.status),
            h = this._getDenseItemExpanded(R, !r),
            i = WQ(T, t.toolUse, t.toolResult.run),
            c = new Bs({
              toolUse: t.toolUse,
              toolRun: t.toolResult.run,
              toolProgress: this.options.toolProgressByToolUseID.get(t.toolUse.id),
              userInput: t.toolResult.userInput,
              subagentContent: this.options.subagentContentByParentID[t.toolUse.id],
              hideHeader: !0
            });
          return new Ds({
            key: new k3(`dense-generic-tool-${e.id}`),
            title: i,
            child: c,
            expanded: h,
            onChanged: s => {
              this.options.onStateUpdate(() => {
                this._setDenseItemExpanded(R, s);
              });
            }
          });
        }
        return this.options.buildThreadItemWidget(T, t, e.sourceIndex);
      }
    }
    if (e.type === "message") return this.options.buildThreadItemWidget(T, {
      type: "message",
      id: e.id,
      message: e.message
    }, e.sourceIndex);
    return new SR();
  }
}
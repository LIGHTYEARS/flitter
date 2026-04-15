class x8R {
  options;
  constructor(T) {
    this.options = T;
  }
  getRenderItems() {
    let T = [];
    for (let [R, a] of this.options.items.entries()) T.push({
      type: "item",
      item: a,
      sourceIndex: R
    });
    return T;
  }
  getSourceIndex(T) {
    return T.sourceIndex;
  }
  includesSourceIndex(T, R) {
    return T.sourceIndex === R;
  }
  getCacheIdentity(T) {
    if (T.item.type === "message") {
      let R = T.item.message;
      return `message:${R.dtwMessageID ?? `${R.role}:${R.messageId}`}`;
    }
    return `tool:${T.item.toolUse.id}`;
  }
  getRenderSignature(T) {
    let R = KQ(T.item),
      a = this._getTaskSignatureSuffix(T);
    if (a) return `${R}|${a}`;
    return R;
  }
  buildWidget(T, R, a) {
    if (R.item.type === "toolResult" && YgT(R.item.toolUse)) return this._buildCollapsibleTaskItem(T, R, a);
    return this.buildThreadItemWidget(T, R.item, R.sourceIndex);
  }
  buildThreadItemWidget(T, R, a) {
    let e = new k3(`thread-item-${R.id}`);
    if (R.type === "message") {
      let r = R.message;
      if (r.role === "user") {
        let l,
          o = (n, p) => {
            this.options.onShowImagePreview(n, p, () => {});
          };
        if (!this.options.isInSelectionMode) l = new S$({
          message: r,
          isFirstMessage: a > 0,
          onShowImagePreview: o
        });else {
          let n = this.options.onGetOrdinalFromUserMessageIndex(a);
          if (n === null) l = new S$({
            message: r,
            isFirstMessage: a > 0,
            onShowImagePreview: o
          });else if (this.options.stateController.editingMessageOrdinal === n && this.options.stateController.editingController) l = new GQ({
            controller: this.options.stateController.editingController,
            message: r,
            onSubmitted: (p, _) => {
              this.options.onEditConfirmationRequest(p, _);
            },
            completionBuilder: this.options.completionBuilder,
            autocompleteHandle: this.options.autocompleteHandle,
            onShowImagePreview: this.options.onShowImagePreview,
            onDoubleAtTrigger: this.options.onDoubleAtTrigger,
            submitOnEnter: this.options.submitOnEnter
          });else if (this.options.stateController.selectedUserMessageOrdinal === n) l = new zQ({
            message: r,
            isFirstMessage: a > 0,
            showRestoreHint: this.options.showRestoreHint,
            isShowingRestoreConfirmation: this.options.stateController.isShowingRestoreConfirmation,
            isShowingEditConfirmation: this.options.stateController.isShowingEditConfirmation,
            affectedFiles: [...this.options.stateController.affectedFiles],
            pendingEditText: this.options.stateController.pendingEditText ?? void 0,
            onRestoreConfirm: () => {
              this.options.onRestoreConfirm();
            },
            onRestoreCancel: () => {
              this.options.onRestoreCancel();
            },
            onEditConfirm: () => {
              this.options.onEditConfirm();
            },
            onEditCancel: () => {
              this.options.onEditCancel();
            },
            onShowImagePreview: o
          });else l = new S$({
            message: r,
            isFirstMessage: a > 0,
            onShowImagePreview: o
          });
        }
        return l;
      }
      if (r.role === "assistant") {
        let l = this._buildAssistantMessageWidget(T, r, a, R.id);
        return new SR({
          key: e,
          child: l
        });
      }
      let h = r,
        i = [],
        c = this.options.onGetOrdinalFromUserMessageIndex(a),
        s = this.options.isInSelectionMode && c !== null && this.options.stateController.selectedUserMessageOrdinal === c,
        A = (l, o) => {
          this.options.onShowImagePreview(l, o, () => {});
        };
      for (let l of h.content) {
        if (l.type !== "manual_bash_invocation") continue;
        if (this.options.stateController.editingMessageOrdinal === c && this.options.stateController.editingController) i.push(new GQ({
          controller: this.options.stateController.editingController,
          message: h,
          onSubmitted: (o, n) => {
            this.options.onEditConfirmationRequest(o, n);
          },
          completionBuilder: this.options.completionBuilder,
          autocompleteHandle: this.options.autocompleteHandle,
          onShowImagePreview: this.options.onShowImagePreview,
          onDoubleAtTrigger: this.options.onDoubleAtTrigger,
          submitOnEnter: this.options.submitOnEnter
        }));else if (!this.options.isInSelectionMode || !s) i.push(new S$({
          message: h,
          isFirstMessage: a > 0,
          onShowImagePreview: A
        }));else i.push(new zQ({
          message: h,
          isFirstMessage: a > 0,
          showRestoreHint: this.options.showRestoreHint,
          isShowingRestoreConfirmation: this.options.stateController.isShowingRestoreConfirmation,
          isShowingEditConfirmation: this.options.stateController.isShowingEditConfirmation,
          affectedFiles: [...this.options.stateController.affectedFiles],
          pendingEditText: this.options.stateController.pendingEditText ?? void 0,
          onRestoreConfirm: () => {
            this.options.onRestoreConfirm();
          },
          onRestoreCancel: () => {
            this.options.onRestoreCancel();
          },
          onEditConfirm: () => {
            this.options.onEditConfirm();
          },
          onEditCancel: () => {
            this.options.onEditCancel();
          },
          onShowImagePreview: A,
          showEditHint: !this.options.isDTWMode
        }));
      }
      if (i.length === 0) return new SR();
      if (i.length === 1) return i[0];
      return new xR({
        crossAxisAlignment: "stretch",
        children: i
      });
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
    });
  }
  _getTaskSignatureSuffix(T) {
    if (T.item.type !== "toolResult" || !YgT(T.item.toolUse)) return;
    let R = this._isTaskCompleted(T.item.toolResult.run.status);
    return `task:${this.options.stateController.denseViewItemStates.get(T.item.id) ?? !R ? "1" : "0"}`;
  }
  _isTaskCompleted(T) {
    return T !== "in-progress" && T !== "queued" && T !== "blocked-on-user";
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
      onChanged: s => {
        this.options.onStateUpdate(() => {
          this.options.stateController.setDenseViewItemState(R.item.id, s), this.options.onInvalidateSourceIndex(R.sourceIndex);
        });
      }
    });
  }
  _getThinkingBlockExpanded(T, R) {
    let a = `${T}-${R}`;
    return this.options.stateController.thinkingBlockStates.get(a) ?? Ut.instance.allExpanded;
  }
  _toggleThinkingBlock(T, R) {
    return a => {
      let e = `${T}-${R}`;
      this.options.onStateUpdate(() => {
        this.options.stateController.setThinkingBlockState(e, a), this.options.onInvalidateSourceIndex(T);
      });
    };
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
    });
  }
  _buildAssistantMessageWidget(T, R, a, e) {
    let t = this.options.showThinkingBlocks ? R.content.map((o, n) => ({
        block: o,
        index: n
      })).filter(o => o.block.type === "thinking" && Xm(o.block)) : [],
      r = t.length > 0,
      h = t.length > 0 ? t.at(-1).index : -1,
      i = R.content.filter(o => o.type === "text" && !o.hidden),
      c = [];
    t.forEach(({
      block: o,
      index: n
    }, p) => {
      if (p > 0) c.push(new XT({
        height: 1
      }));
      c.push(this._buildThinkingBlock(o, a, n, R, h));
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
      }));
    }
    if (c.length === 0) return new SR();
    if (c.length === 1) return c[0];
    return new xR({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: c
    });
  }
}
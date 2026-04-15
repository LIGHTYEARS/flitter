function ugT(T) {
  return T.startsWith("agent-mode-");
}
function PgT(T) {
  if (!T || T.length <= ygT) return T;
  return T.slice(0, ygT - 1) + "\u2026";
}
class e0R {
  configService;
  onExecute;
  onExecutionComplete;
  commands = new Map();
  telemetrySubmitter;
  initialConfig;
  flickeringCommandIds = new Set();
  hiddenCommandIds = new Set();
  changeListeners = new Set();
  constructor(T, R, a, e) {
    this.configService = T, this.onExecute = R, this.onExecutionComplete = a, this.initialConfig = e, this.registerCommands(e), this.telemetrySubmitter = new gRR(async () => {
      try {
        return (await this.configService.getLatest()).settings["experimental.cli.commandTelemetry.enabled"] === !0;
      } catch {
        return !1;
      }
    }, this.configService);
  }
  isDogfoodingEnabled(T) {
    if (T.userEmail) return XdT(T.userEmail);
    return kn.maybeOf(T.contextFallback)?.isDogfooding ?? !1;
  }
  isInternalUser(T) {
    return T.userEmail ? Ns(T.userEmail) : !1;
  }
  isInternalDTWThread(T) {
    return this.isInternalUser(T) && Tm(T.thread);
  }
  resetRemovedCommands() {
    this.flickeringCommandIds.clear(), this.hiddenCommandIds.clear();
  }
  hideCommand(T) {
    this.hiddenCommandIds.add(T), this.flickeringCommandIds.delete(T);
    for (let R of this.changeListeners) R();
  }
  addChangeListener(T) {
    this.changeListeners.add(T);
  }
  removeChangeListener(T) {
    this.changeListeners.delete(T);
  }
  async execute(T, R, a = [], e) {
    this.telemetrySubmitter.submit(T).catch(i => {
      J.debug("Failed to submit command telemetry", i);
    });
    let t = Date.now(),
      r = `command-${t}-${Math.random().toString(36).substring(7)}`,
      h = this.commands.get(T);
    if (h) {
      this.onExecute({
        id: r,
        name: h.id,
        noun: h.noun,
        verb: h.verb,
        startTime: t,
        abortController: e
      });
      try {
        return await h.execute(R, e, a);
      } finally {
        this.onExecutionComplete();
      }
    }
    if (T.startsWith("plugin-command-")) {
      let i = this.getAllCommands(R).find(c => c.id === T);
      if (i?.pluginExecution && R.executePluginCommand) {
        let {
          pluginName: c,
          commandId: s
        } = i.pluginExecution;
        try {
          await R.executePluginCommand(c, s, R.currentThreadID);
        } catch (A) {
          return A instanceof Error ? A : Error(String(A));
        }
        return;
      }
    }
  }
  getPriority(T, R) {
    if (R.editorState.hasSelection) switch (T) {
      case "copy-selection":
        return 60;
    }
    if (this.canChangeAgentMode(R)) {
      if (T === "help") return 60;
      if (ugT(T)) return 59;
      switch (T) {
        case "set-agent-mode":
          return 58;
        case "toggle-agent-mode":
          return 57;
      }
    }
    if (this.hasPromptText(R) && R.isProcessing) switch (T) {
      case "queue":
        return 39;
      case "send-queued-message":
        return 38;
      case "dequeue":
        return 37;
    }
    if (R.isProcessing) switch (T) {
      case "queue":
        return 29;
      case "send-queued-message":
        return 28;
      case "dequeue":
        return 27;
    }
    if (this.hasPromptText(R)) switch (T) {
      case "handoff":
        return 19;
      case "editor":
        return 18;
      case "clear":
        return 17;
    }
    if (ugT(T)) return 0;
    switch (T) {
      case "help":
        return 10;
      case "continue":
        return 9;
      case "new":
        return 8;
      case "handoff":
        return 7;
      case "editor":
        return 6;
      case "browser":
      case "url":
      case "visibility":
      case "toggle-thinking-blocks":
      case "queue":
      case "clear":
      case "copy-selection":
      case "paste-image":
      case "dequeue":
      case "send-queued-message":
      case "generate-agent-file":
      case "agent-files":
      case "connect":
      case "disconnect":
      case "settings":
      case "permissions":
      case "permissions-workspace":
      case "permissions-enable":
      case "permissions-disable":
      case "ide":
      case "test-error":
      case "toggle-agent-mode":
      case "toggle-openai-speed":
      case "set-agent-mode":
      case "set-theme":
      case "show-costs":
      case "refresh":
      case "debug-thread-json":
        return 1;
      case "quit":
        return 0;
    }
    return 1;
  }
  getCommandFollows(T) {
    switch (T) {
      case "handoff":
        return ["new"];
      case "browse-news":
        return ["new"];
      case "quit":
        return ["queue", "send-queued-message", "dequeue"];
      case "set-agent-mode":
      case "toggle-agent-mode":
        return Kl().map(({
          mode: R
        }) => `agent-mode-${R}`);
      case "set-theme":
        return ["continue"];
      default:
        return [];
    }
  }
  registerCommands(T) {
    this.register({
      id: "new",
      noun: "thread",
      verb: "new",
      description: "Start new thread",
      aliases: ["start"],
      execute: async R => {
        if (!this.isThreadEmpty(R)) await R.createThread();
      }
    }), this.register({
      id: "continue",
      noun: "thread",
      verb: "switch",
      description: "Switch to existing thread",
      aliases: ["continue"],
      customFlow: (R, a, e) => {
        let t = () => {
            e(), R.previewController.clear();
          },
          r = R.commandPaletteMode === "standalone",
          h = async (c, s) => {
            try {
              if (await a(c), r && !s?.hasUserInteracted) R.showToast("Tip: use `amp threads continue --last` to continue the latest thread", "warning");
              t();
            } catch (A) {
              J.error("Failed to switch thread from command palette", {
                threadID: c,
                error: A
              });
              let l = A instanceof Error ? A.message : "Unknown error";
              R.showToast(`Failed to switch thread: ${l}`, "error");
            }
          },
          i = R.threads.filter(c => !c.archived);
        return new wQ({
          threads: i,
          title: "Select a thread",
          onSelect: h,
          onDismiss: t,
          previewController: R.previewController,
          isLoading: R.isLoadingThreads,
          hasError: R.threadLoadError,
          currentWorkspaceURI: R.currentWorkspace,
          filterByWorkspace: R.filterByWorkspace,
          threadViewStates: R.threadViewStates,
          recentThreadIDs: R.recentThreadIDs,
          currentThreadID: R.currentThreadID
        });
      },
      execute: async (R, a, e) => {
        await R.switchToThread(e);
      }
    }), this.register({
      id: "thread-map",
      noun: "thread",
      verb: "map",
      description: "View thread clusters",
      customFlow: (R, a, e) => {
        return new ob({
          message: mgT("thread: map"),
          onDismiss: () => {
            this.flickeringCommandIds.add("thread-map"), e();
          }
        });
      },
      execute: async () => {}
    }), this.register({
      id: "switch-cluster",
      noun: "thread",
      verb: "switch to cluster",
      description: "Switch to a thread cluster",
      customFlow: (R, a, e) => {
        return new ob({
          message: mgT("thread: switch to cluster"),
          onDismiss: () => {
            this.flickeringCommandIds.add("switch-cluster"), e();
          }
        });
      },
      execute: async () => {}
    }), this.register({
      id: "context-analyze",
      noun: "context",
      verb: "analyze",
      description: "Analyze context token usage",
      execute: async R => {
        R.openContextAnalyze();
      },
      isShown: R => {
        let a = R.getEffectiveAgentMode(),
          e = nk(a);
        if (![ya("CLAUDE_OPUS_4_6"), ya("CLAUDE_OPUS_4_5"), ya("GPT_5_4")].includes(e)) return "Context analysis requires Claude Opus 4.6 (smart) or GPT-5.4 (deep)";
        return !0;
      }
    }), this.register({
      id: "handoff",
      noun: "thread",
      verb: "handoff",
      description: "Draft a new thread based on current thread",
      execute: async R => {
        R.enterHandoffMode();
        let a = R.editorState.text.trim();
        if (a.length > 0) R.submitMessage(a);
      },
      isShown: R => this.isThreadEmpty(R) ? "Cannot use thread: handoff from an empty thread" : !0
    }), this.register({
      id: "browser",
      noun: "thread",
      verb: "open in browser",
      description: "Open thread in browser",
      execute: async ({
        thread: R,
        ampURL: a,
        context: e
      }) => {
        let t = $P(new URL(a), R.id).toString();
        if (e) await je(e, t);
      },
      isShown: R => this.isThreadEmpty(R) ? "Cannot use thread: open in browser from an empty thread" : !0
    }), this.register({
      id: "browse-news",
      noun: "news",
      verb: "open in browser",
      description: "Open Amp announcements",
      customFlow: (R, a, e) => {
        let t = async r => {
          await a(r), e();
        };
        return new ORR({
          entries: R.newsFeedEntries,
          title: "Amp News",
          onSelect: t,
          onDismiss: e
        });
      },
      execute: async ({
        context: R
      }, a, e) => {
        try {
          if (R) await je(R, e.link);
        } catch (t) {
          J.error("Failed to open browser", {
            error: t
          });
        }
      },
      isShown: R => R.newsFeedEntries.length > 0 || "No news entries available"
    }), this.register({
      id: "url",
      noun: "thread",
      verb: "copy URL",
      description: "Copy thread URL",
      execute: async R => {
        let a = $P(new URL(R.ampURL), R.thread.id).toString();
        try {
          await d9.instance.tuiInstance.clipboard.writeText(a);
          let e = R.context ? $R.of(R.context).app.link : Xa.default().app.link;
          return new et(new xR({
            children: [new H3({
              uri: a,
              text: a,
              style: new cT({
                color: e,
                underline: !0
              })
            }), new xT({
              text: new G("(Copied to clipboard)", new cT({
                color: e,
                dim: !0
              }))
            })]
          }), "Thread URL");
        } catch (e) {
          return J.error("Failed to copy URL to clipboard", {
            error: e
          }), Error(`Thread URL: ${a}

(Could not copy to clipboard)`);
        }
      },
      isShown: R => this.isThreadEmpty(R) ? "Cannot use thread: copy URL from an empty thread" : !0
    }), this.register({
      id: "copy-id",
      noun: "thread",
      verb: "copy ID",
      description: "Copy thread ID",
      execute: async R => {
        let a = R.thread.id;
        try {
          await d9.instance.tuiInstance.clipboard.writeText(a);
          let e = R.context ? $R.of(R.context).colors.foreground : Xa.default().colors.foreground;
          return new et(new xR({
            children: [new xT({
              text: new G(a, new cT({
                color: e
              })),
              selectable: !0
            }), new xT({
              text: new G("(Copied to clipboard)", new cT({
                color: e,
                dim: !0
              }))
            })]
          }), "Thread ID");
        } catch (e) {
          return J.error("Failed to copy thread ID to clipboard", {
            error: e
          }), Error(`Thread ID: ${a}

(Could not copy to clipboard)`);
        }
      },
      isShown: R => this.isThreadEmpty(R) ? "Cannot use thread: copy ID from an empty thread" : !0
    }), this.register({
      id: "rename",
      noun: "thread",
      verb: "rename",
      description: "Rename thread title",
      customFlow: (R, a, e) => {
        return new QM({
          commandName: "thread rename",
          placeholder: "Enter new thread title",
          isRequiredArg: !0,
          onSubmit: async t => {
            if (!(await a(t))) e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => {
        let t = e.trim();
        if (!t) return Error("Thread title cannot be empty");
        if (t.length > 256) return Error("Thread title cannot exceed 256 characters");
        if (this.isThreadEmpty(R)) return Error("Cannot rename an empty thread");
        try {
          return await R.activeThreadHandle.setTitle(t), new Tc(`Renamed thread to "${t}"`);
        } catch (r) {
          return J.error("Failed to rename thread", r), Error(`Failed to rename thread: ${r instanceof Error ? r.message : String(r)}`);
        }
      },
      isShown: R => {
        if (this.isThreadEmpty(R)) return "Cannot rename an empty thread";
        return !0;
      }
    }), this.register({
      id: "archive",
      noun: "thread",
      verb: "archive and exit",
      description: "Archive thread and exit",
      execute: async R => {
        await R.threadService.archive(R.thread.id, !0), await R.exitApp();
      },
      isShown: R => this.isThreadEmpty(R) ? "Cannot archive an empty thread" : !0
    }), this.register({
      id: "markdown",
      noun: "thread",
      verb: "copy markdown",
      description: "Copy thread as markdown",
      execute: async R => {
        try {
          let a = KN(R.thread);
          await d9.instance.tuiInstance.clipboard.writeText(a);
          let e = R.context ? $R.of(R.context).colors.foreground : Xa.default().colors.foreground;
          return new et(new xT({
            text: new G("Thread markdown copied to clipboard", new cT({
              color: e
            }))
          }), "Thread Markdown");
        } catch (a) {
          return J.error("Failed to copy markdown to clipboard", {
            error: a
          }), Error(`Failed to copy markdown to clipboard: ${a}`);
        }
      },
      isShown: R => this.isThreadEmpty(R) ? "Cannot use thread: copy markdown from an empty thread" : !0
    }), this.register({
      id: "fork",
      noun: "thread",
      verb: "fork",
      description: "Fork thread (deprecated)",
      execute: async () => {
        return Error("Fork has been deprecated. See https://ampcode.com/news/stick-a-fork-in-it");
      },
      isShown: () => "thread: fork has been deprecated. See https://ampcode.com/news/stick-a-fork-in-it"
    }), this.register({
      id: "thread-previous",
      noun: "thread",
      verb: "switch to previous",
      description: "Switch to previous thread",
      aliases: ["back"],
      execute: async R => {
        if (R.canNavigateBack) await R.navigateBack();
      },
      isShown: R => R.canNavigateBack ? !0 : "Cannot use thread: switch to previous with no previous thread"
    }), this.register({
      id: "thread-next",
      noun: "thread",
      verb: "switch to next",
      description: "Switch to next thread",
      aliases: ["forward"],
      execute: async R => {
        if (R.canNavigateForward) await R.navigateForward();
      },
      isShown: R => R.canNavigateForward ? !0 : "Cannot use thread: switch to next with no next thread"
    }), this.register({
      id: "thread-parent",
      noun: "thread",
      verb: "switch to parent",
      description: "Switch to parent thread",
      customFlow: (R, a, e) => {
        let t = vD(R.thread);
        if (t.length === 1) return e(), a(t[0].threadID).catch(r => {
          J.error("Failed to switch to parent thread", {
            error: r
          });
        }), new XT({});
        return new we({
          items: t,
          getLabel: r => {
            return `${r.type === "fork" ? "[fork]" : "[handoff]"} ${r.threadID}`;
          },
          title: "Select Parent Thread",
          onAccept: async r => {
            await a(r.threadID), e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => {
        if (!e) return Error("This thread has no parent thread");
        await R.switchToThread(e);
      },
      isShown: R => {
        return vD(R.thread).length > 0 ? !0 : "Cannot use thread: switch to parent with no parent thread";
      }
    }), this.register({
      id: "visibility",
      noun: "thread",
      verb: "set visibility",
      description: "Set thread visibility",
      aliases: ["share", "private", "workspace", "public", "team"],
      customFlow: (R, a, e) => {
        return new JRR({
          workspace: R.workspace,
          threadID: R.thread.id,
          threadService: R.threadService,
          execute: a,
          onDismiss: e
        });
      },
      execute: async (R, a, e) => {
        if (!e) return;
        let {
            thread: t
          } = R,
          r;
        switch (e) {
          case "private":
            r = "This thread's visibility has been updated to private";
            break;
          case "workspace":
            r = "This thread's visibility has been updated to workspace";
            break;
          case "group":
            r = "This thread's visibility has been updated to group";
            break;
          case "unlisted":
            r = "This thread's visibility has been updated to unlisted. Anyone on the Internet with the link can view it.";
            break;
          case "public":
            r = "This thread's visibility has been updated to public. Anyone on the Internet can see it on your public profile, and it is publicly searchable.";
            break;
        }
        try {
          await R.activeThreadHandle.setVisibility(e);
          let h = !1;
          if (e !== "private") {
            let c = $P(new URL(R.ampURL), t.id).toString();
            try {
              await d9.instance.tuiInstance.clipboard.writeText(c), h = !0;
            } catch (s) {
              J.error("Failed to copy thread URL after visibility update", {
                error: s
              });
            }
          }
          let i = h ? `${r} Link copied to clipboard.` : r;
          return new Tc(i);
        } catch (h) {
          let i = h instanceof Error ? h.message : String(h);
          if (i.includes("no-workspace")) return Error("You are not a member of any workspace.");
          if (i.includes("groups-disabled")) return Error("The groups feature is not enabled for this workspace.");
          if (i.includes("no-groups")) return Error("You are not a member of any groups.");
          return J.error("Unexpected failure to update thread visibility", h), Error(`Failed to update thread visibility for ${t.id}`);
        }
      }
    }), this.register({
      id: "share-support",
      noun: "thread",
      verb: "share with support",
      description: "Share with Amp support for debugging",
      aliases: ["feedback", "bug report"],
      customFlow: (R, a, e) => {
        return new QM({
          commandName: "Share with Support",
          placeholder: "What went wrong? (Need a reply? Email amp-devs@ampcode.com.)",
          isRequiredArg: !1,
          onSubmit: async t => {
            if (!(await a(t))) e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => {
        let {
          thread: t,
          configService: r,
          threadViewStates: h
        } = R;
        try {
          let i = h[t.id],
            c = i?.state === "active" && i.ephemeralError ? {
              message: i.ephemeralError.message,
              type: i.ephemeralError.error?.type,
              retryAfterSeconds: i.ephemeralError.retryCountdownSeconds
            } : void 0,
            s = await N3.shareThreadWithOperator({
              threadData: t,
              message: e || void 0,
              ephemeralError: c
            }, {
              config: r
            });
          if (!s.ok) throw Error(`Failed to share thread: ${s.error.message}`);
          return new et(new ZRR(), "Shared with Support");
        } catch (i) {
          return J.error("Failed to share thread with support", i), Error(`Failed to share thread with support: ${i}`);
        }
      },
      isShown: R => this.threadHasMessages(R) ? !0 : "Cannot use thread: share with support from an empty thread"
    }), this.register({
      id: "add-label",
      noun: "label",
      verb: "add",
      description: "Add label to thread",
      isEnabled: R => this.threadHasMessages(R),
      customFlow: (R, a, e) => {
        return new q_({
          initialState: {
            currentLabels: null,
            error: null,
            isLoading: !0
          },
          builder: (t, r, h) => {
            if (h.isLoading && !h.currentLabels && !h.error) (async () => {
              try {
                let i = await R.internalAPIClient.getThreadLabels({
                  thread: R.thread.id
                }, {
                  config: R.configService
                });
                if (!i.ok) r(c => ({
                  ...c,
                  currentLabels: [],
                  isLoading: !1
                }));else r(c => ({
                  ...c,
                  currentLabels: i.result.map(s => s.name),
                  isLoading: !1
                }));
              } catch (i) {
                J.error("Failed to load current thread labels", i), r(c => ({
                  ...c,
                  currentLabels: [],
                  isLoading: !1
                }));
              }
            })();
            if (h.isLoading) return new Ko({
              message: "Loading..."
            });
            return new URR({
              onSelect: async i => {
                await a(i), e();
              },
              onDismiss: e,
              internalAPIClient: R.internalAPIClient,
              configService: R.configService,
              currentLabels: h.currentLabels || []
            });
          }
        });
      },
      execute: async (R, a, e) => {
        let t = e?.trim().toLowerCase();
        if (!t || t.length === 0) return Error("Label name cannot be empty");
        if (!/^[a-z0-9][a-z0-9-]*$/.test(t)) return Error("Label must be alphanumeric with hyphens, starting with a letter or number");
        if (t.length > 32) return Error("Label name cannot exceed 32 characters");
        try {
          let {
              thread: r,
              configService: h,
              internalAPIClient: i
            } = R,
            c = await i.getThreadLabels({
              thread: r.id
            }, {
              config: h
            });
          if (!c.ok) return Error("Failed to get current thread labels");
          let s = c.result.map(o => o.name),
            A = s.includes(t) ? s : [...s, t],
            l = await i.setThreadLabels({
              thread: r.id,
              labels: A
            }, {
              config: h
            });
          if (!l.ok) {
            let o = l.error?.code;
            if (o === "auth-required") return Error("Authentication required to add labels");
            if (o === "thread-not-found") return Error("Thread not found");
            if (o === "permission-denied") return Error("Permission denied to add labels to this thread");
            if (o === "rate-limit-exceeded") return Error("Rate limit exceeded. Please try again in a moment.");
            return Error(l.error?.message || `Failed to add label: ${o}`);
          }
          R.showToast(`Added label "${t}"`);
          return;
        } catch (r) {
          return J.error("Failed to add label to thread", r), Error("Failed to add label to thread");
        }
      }
    }), this.register({
      id: "remove-label",
      noun: "label",
      verb: "remove",
      description: "Remove label from thread",
      isEnabled: R => this.threadHasMessages(R),
      customFlow: (R, a, e) => {
        return new q_({
          initialState: {
            labels: null,
            error: null,
            isLoading: !0
          },
          builder: (t, r, h) => {
            if (h.isLoading && !h.labels && !h.error) (async () => {
              try {
                let i = await R.internalAPIClient.getThreadLabels({
                  thread: R.thread.id
                }, {
                  config: R.configService
                });
                if (!i.ok) r(c => ({
                  ...c,
                  error: Error("Failed to load thread labels"),
                  isLoading: !1
                }));else r(c => ({
                  ...c,
                  labels: i.result,
                  isLoading: !1
                }));
              } catch (i) {
                J.error("Failed to load thread labels", i), r(c => ({
                  ...c,
                  error: Error("Failed to load thread labels"),
                  isLoading: !1
                }));
              }
            })();
            if (h.isLoading) return new Ko({
              message: "Loading labels..."
            });
            if (h.error) return new ob({
              message: h.error,
              onDismiss: e
            });
            if (!h.labels || h.labels.length === 0) return new ob({
              message: new et(new xT({
                text: new G("This thread has no labels to remove.")
              })),
              onDismiss: e
            });
            return new we({
              title: "Remove Label",
              items: h.labels,
              getLabel: i => i.name,
              onAccept: async i => {
                await a(i.name), e();
              },
              onDismiss: e
            });
          }
        });
      },
      execute: async (R, a, e) => {
        if (!e || e.length === 0) return Error("Label name cannot be empty");
        try {
          let {
              thread: t,
              configService: r,
              internalAPIClient: h
            } = R,
            i = await h.getThreadLabels({
              thread: t.id
            }, {
              config: r
            });
          if (!i.ok) return Error("Failed to get current thread labels");
          let c = i.result.map(A => A.name).filter(A => A !== e),
            s = await h.setThreadLabels({
              thread: t.id,
              labels: c
            }, {
              config: r
            });
          if (!s.ok) {
            let A = s.error?.code;
            if (A === "auth-required") return Error("Authentication required to remove labels");
            if (A === "thread-not-found") return Error("Thread not found");
            if (A === "permission-denied") return Error("Permission denied to remove labels from this thread");
            if (A === "rate-limit-exceeded") return Error("Rate limit exceeded. Please try again in a moment.");
            return Error(s.error?.message || `Failed to remove label: ${A}`);
          }
          R.showToast(`Removed label "${e}"`);
          return;
        } catch (t) {
          return J.error("Failed to remove label from thread", t), Error("Failed to remove label from thread");
        }
      }
    }), this.register({
      id: "toggle-thinking-blocks",
      noun: "thread",
      verb: "toggle thinking blocks",
      description: "Toggle thinking blocks",
      shortcut: x0.alt("t"),
      execute: async R => {
        if (Ut.instance.toggleAll(), R.thread.agentMode === "deep") _i.instance.toggleAll();
        k8.instance.requestFrame();
      },
      isShown: R => this.isThreadEmpty(R) ? "Cannot use thread: toggle thinking blocks from an empty thread" : !0,
      getPromptText: R => Ut.instance.allExpanded ? "collapse" : "expand"
    }), this.register({
      id: "editor",
      noun: "prompt",
      verb: "open in editor",
      description: "Edit prompt in $EDITOR",
      shortcut: new x0("g", {
        ctrl: !0
      }),
      execute: async R => {
        await R.openInEditor(R.editorState.text.trim());
      },
      getPromptText: R => {
        let a = R.editorState.text.trim().replace(/\n/g, " ");
        if (a.length === 0) return;
        return a.length > 20 ? `${a.slice(0, 20)}...` : a;
      }
    }), this.register({
      id: "queue",
      noun: "prompt",
      verb: "queue",
      description: "Queue prompt",
      execute: async R => {
        let a = R.editorState.text.trim();
        if (a.length > 0) R.submitQueue(a);else R.enterQueueMode();
      },
      isShown: R => {
        if (R.isMessageViewInteractionActive) return "Cannot use prompt: queue while editing or selecting a message";
        if (R.isInQueueMode) return "Cannot use prompt: queue when already in queue mode";
        if (R.isInHandoffMode) return "Cannot use prompt: queue while in handoff mode";
        if (!R.isProcessing) return "Cannot use prompt: queue when agent is not running";
        return !0;
      }
    }), this.register({
      id: "dequeue",
      noun: "prompt",
      verb: "dequeue",
      description: "Dequeue prompts",
      execute: async (R, a) => {
        let e = this.getQueuedMessages(R);
        if (e.length === 0) return;
        let t = [],
          r = [];
        for (let c of e) {
          let s = c.queuedMessage.content.filter(l => l.type === "text").map(l => l.text).join("").trim();
          if (s) t.push(s);
          let A = c.queuedMessage.content.filter(l => l.type === "image");
          r.push(...A);
        }
        let h = r.slice(-pb),
          i = t.join(`
`).trim();
        await R.activeThreadHandle.discardQueuedMessages(), R.editorDispatch({
          type: "set-input",
          input: i
        }), R.setImageAttachments(h);
      },
      isShown: R => R.isMessageViewInteractionActive ? "Cannot use prompt: dequeue while editing or selecting a message" : this.getQueuedMessages(R).length > 0 ? !0 : "Can only use prompt: dequeue when there are queued messages",
      getPromptText: R => `${this.getQueuedMessages(R).length} queued`
    }), this.register({
      id: "send-queued-message",
      noun: "prompt",
      verb: "send queued message",
      description: "Send queued messages now",
      isEnabled: R => this.isDTWThread(R),
      execute: async R => {
        let a = this.getQueuedMessages(R);
        if (a.length === 0) return;
        if (!R.activeThreadHandle.interruptQueuedMessage) return Error("Can only send queued messages in DTW threads");
        for (let e of a) {
          let t = z9.safeParse(e.queuedMessage.dtwMessageID).data ?? z9.safeParse(e.id).data;
          if (!t) continue;
          await R.activeThreadHandle.interruptQueuedMessage(t);
        }
        R.showStatusMessage(`Sent ${a.length} ${o9(a.length, "message")} from queue`);
      },
      isShown: R => {
        if (R.isMessageViewInteractionActive) return "Cannot use prompt: send queued message while editing or selecting a message";
        if (!R.activeThreadHandle.interruptQueuedMessage) return "Can only use prompt: send queued message in DTW threads";
        if (this.getQueuedMessages(R).length === 0) return "Can only use prompt: send queued message when there are queued messages";
        return !0;
      },
      getPromptText: R => `${this.getQueuedMessages(R).length} queued`
    }), this.register({
      id: "clear",
      noun: "prompt",
      verb: "clear",
      description: "Clear input",
      execute: async R => {
        R.editorDispatch({
          type: "clear"
        });
      },
      isShown: R => R.editorState.text.trim().length > 0 ? !0 : "Can only use prompt: clear when there is text to clear"
    }), this.register({
      id: "copy-selection",
      noun: "prompt",
      verb: "copy selection",
      description: "Copy selection",
      execute: async R => {
        try {
          await d9.instance.tuiInstance.clipboard.writeText(R.editorState.selectedText);
        } catch (a) {
          return J.error("Failed to copy selection to clipboard", {
            error: a
          }), Error("Failed to copy selection to clipboard");
        }
      },
      isShown: R => R.editorState.hasSelection ? !0 : "Can only use prompt: copy selection when text is selected",
      getPromptText: R => {
        let a = R.editorState.selectedText.trim().replace(/\n/g, " ");
        return a.length > 20 ? `${a.slice(0, 20)}...` : a;
      }
    }), this.register({
      id: "paste-image",
      noun: "prompt",
      verb: "paste image from clipboard",
      description: "Paste image from clipboard",
      shortcut: x0.ctrl("v"),
      execute: async R => {
        try {
          let a = await VTR();
          if (a) {
            let e = R.takeImageAttachments();
            if (e.length >= pb) return R.setImageAttachments(e), Error(`Maximum of ${pb} images per message`);
            let t = await GH(a);
            if (typeof t === "object") R.setImageAttachments([...e, t]);else return Error(`Failed to process image: ${t}`);
          } else return Error("No image found in clipboard");
        } catch (a) {
          return J.error("Failed to paste image from clipboard", {
            error: a
          }), Error("Failed to paste image from clipboard");
        }
      }
    }), this.register({
      id: "history",
      noun: "prompt",
      verb: "history",
      description: "Show prompt history",
      shortcut: x0.ctrl("r"),
      execute: async R => {
        R.openPromptHistoryPicker();
      }
    }), this.register({
      id: "mention-thread",
      noun: "thread",
      verb: "mention",
      description: "Mention another thread",
      customFlow: (R, a, e) => {
        let t = () => {
            e(), R.previewController.clear();
          },
          r = h => {
            if (R.onThreadMentionSelected) {
              R.onThreadMentionSelected(h), t();
              return;
            }
            let i = R.editorState.text,
              c = R.editorState.cursorPosition,
              s = i.slice(0, c).lastIndexOf("@@");
            if (s !== -1) {
              let A = i.slice(c),
                l = A.length === 0,
                o = `@${h}${l ? " " : ""}`,
                n = i.slice(0, s) + o + A,
                p = s + o.length;
              R.editorDispatch({
                type: "set-input-with-cursor",
                input: n,
                cursorPosition: p
              });
            } else R.editorDispatch({
              type: "insert-text",
              text: `@${h} `
            });
            t();
          };
        return new wQ({
          threads: R.threads,
          title: "Select a thread to mention",
          onSelect: r,
          onDismiss: t,
          previewController: R.previewController,
          isLoading: R.isLoadingThreads,
          hasError: R.threadLoadError,
          currentWorkspaceURI: R.currentWorkspace,
          filterByWorkspace: R.filterByWorkspace,
          threadViewStates: R.threadViewStates,
          recentThreadIDs: R.recentThreadIDs,
          currentThreadID: R.currentThreadID,
          excludeCurrentThread: !0
        });
      },
      execute: async (R, a, e) => {
        R.editorDispatch({
          type: "insert-text",
          text: `@${e} `
        });
      }
    }), this.register({
      id: "test-error",
      noun: "dev",
      verb: "test error",
      description: "Test error handling",
      execute: async () => {
        throw Error("This is a test error from command execution");
      },
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "test-context-limit-error",
      noun: "dev",
      verb: "test context limit error",
      description: "Test context limit error dialog",
      execute: async R => {
        let a = Error("prompt is too long: exceed context limit");
        R.activeThreadHandle.setTestEphemeralError?.(a);
      },
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "toggle-agent-mode",
      noun: "mode",
      verb: "toggle",
      description: "Toggle agent mode",
      shortcut: new x0("s", {
        ctrl: !0
      }),
      execute: async R => {
        R.toggleAgentMode();
      },
      isShown: R => this.canChangeAgentMode(R) ? !0 : "Can only use mode: toggle for new threads"
    }), this.register({
      id: "toggle-smart-speed",
      noun: "mode",
      verb: "toggle smart speed",
      description: "Toggle smart speed (fast/standard)",
      isEnabled: R => R.features.some(a => a.name === dr.ANTHROPIC_FAST && a.enabled),
      execute: async R => {
        if (!this.canToggleSmartSpeed(R)) return Error("Can only use mode: toggle smart speed before first message, or in smart mode");
        if (R.getEffectiveAgentMode() !== "smart") R.setAgentMode("smart");
        if ((await R.configService.getLatest()).settings["anthropic.speed"] === "fast") {
          await R.settingsStorage.delete("anthropic.speed", "global");
          return;
        }
        await R.configService.updateSettings("anthropic.speed", "fast", "global");
      },
      isShown: R => this.canToggleSmartSpeed(R) ? !0 : "Can only use mode: toggle smart speed before first message, or in smart mode"
    }), this.register({
      id: "toggle-openai-speed",
      noun: "mode",
      verb: "toggle openai speed",
      description: "Toggle OpenAI speed (fast/standard)",
      isEnabled: R => R.features.some(a => a.name === dr.OPENAI_FAST && a.enabled),
      execute: async R => {
        if (!this.canToggleOpenAISpeed(R)) return Error("Can only use mode: toggle openai speed before first message, or in deep/internal mode");
        let a = await R.configService.getLatest();
        if (u3T(a.settings["openai.speed"], R.features) === "fast") {
          await R.configService.updateSettings("openai.speed", "standard", "global");
          return;
        }
        await R.configService.updateSettings("openai.speed", "fast", "global");
      },
      isShown: R => this.canToggleOpenAISpeed(R) ? !0 : "Can only use mode: toggle openai speed before first message, or in deep/internal mode"
    }), this.register({
      id: "toggle-deep-reasoning-effort",
      noun: "mode",
      verb: "toggle deep reasoning effort",
      description: "Toggle deep reasoning effort (medium/high/xhigh)",
      execute: async R => {
        await R.toggleDeepReasoningEffort();
      },
      isShown: R => qo(R.getEffectiveAgentMode()) ? !0 : "Can only use mode: toggle deep reasoning effort in deep/internal mode"
    }), this.register({
      id: "generate-agent-file",
      noun: "agents-md",
      verb: "generate",
      description: "Generate an AGENTS.md file",
      execute: async R => {
        let a = R.getEffectiveAgentMode();
        await R.activeThreadHandle.sendMessage({
          content: [{
            type: "text",
            text: qWT
          }],
          agentMode: a
        });
      }
    }), this.register({
      id: "agent-files",
      noun: "agents-md",
      verb: "list",
      description: "List AGENTS.md guidance files in use",
      execute: async (R, a) => {
        try {
          let e = await R.getGuidanceFiles(a.signal);
          if (e.length === 0) return new Tc("No guidance files are currently in use for this thread.");
          let t = e.length,
            r = `Agent ${o9(t, "File")} (${t}):`,
            h = e.map(i => `  \u2022 ${Mr(Ht(i.uri))} (${i.type})`).join(`
`);
          return new Tc(`${r}

${h}`);
        } catch (e) {
          return J.error("Failed to get guidance files", e), Error("Failed to retrieve guidance files");
        }
      }
    }), this.register({
      id: "settings",
      noun: "settings",
      verb: "open in editor",
      description: "Open CLI settings in $EDITOR",
      execute: async R => {
        await Zb(R.settingsStorage.getSettingsFilePath());
      }
    }), this.register({
      id: "permissions",
      noun: "permissions",
      verb: "open in editor (user)",
      description: "Edit user permissions in $EDITOR",
      execute: async R => oIT(R.settingsStorage, "global")
    }), this.register({
      id: "permissions-workspace",
      noun: "permissions",
      verb: "open in editor (workspace)",
      description: "Edit workspace permissions in $EDITOR",
      execute: async R => oIT(R.settingsStorage, "workspace")
    }), this.register({
      id: "permissions-enable",
      noun: "permissions",
      verb: "enable",
      description: "Enable permissions",
      execute: async () => {
        try {
          return Ms("dangerouslyAllowAll", !1), new Tc("Amp is now following permissions rules for this session");
        } catch (R) {
          return J.error("Failed to set dangerously allow all setting", R), Error("Failed to enable permissions for this session");
        }
      }
    }), this.register({
      id: "permissions-disable",
      noun: "permissions",
      verb: "dangerously allow all",
      description: "Disable permissions (dangerously allow all)",
      execute: async () => {
        try {
          return Ms("dangerouslyAllowAll", !0), new Tc("Permissions disabled for this session - you will NOT be asked for confirmation before Amp runs a command.");
        } catch (R) {
          return J.error("Failed to set dangerously allow all setting", R), Error("Failed to disable permissions for this session");
        }
      }
    }), this.register({
      id: "ide",
      noun: "ide",
      verb: "connect",
      description: "Connect to an IDE",
      execute: async R => {
        R.openIdePicker();
      }
    }), this.register({
      id: "mcp-list-tools",
      noun: "mcp",
      verb: "list tools",
      description: "List all MCP servers and their tools",
      execute: async R => {
        try {
          let a = await m0(R.mcpService.servers);
          if (a.length === 0) return new Tc("No MCP servers connected.");
          let e = a.length,
            t = a.reduce((A, l) => {
              return A + (Array.isArray(l.tools) ? l.tools.length : 0);
            }, 0),
            r = new Map();
          for (let A of a) {
            let l = mW(A),
              o = r.get(l) ?? [];
            o.push(A), r.set(l, o);
          }
          let h = $R.of(R.context ?? R.contextFallback),
            i = [];
          i.push(new G(`Connected to ${e} ${o9(e, "MCP Server")} with ${t} ${o9(t, "Tool")}

`, new cT({
            bold: !0
          }))), i.push(new G(`\u2713 available tool, \u25CC skill-backed tool (loads on demand), \u2717 excluded tool.

`, new cT({
            dim: !0
          })));
          let c = (A, l) => {
            let o = ahT[A];
            if (i.push(new G(`${o.label}`, new cT({
              bold: !0,
              dim: !0
            }))), o.pathHint) i.push(new G(` ${o.pathHint}`, new cT({
              dim: !0
            })));
            i.push(new G(`
`));
            for (let n of l) {
              let p = TH0(n),
                _ = p !== void 0,
                m = _gT(n) ? "deferred until skill load" : void 0,
                b = n.status,
                y = b.type === "connected" ? "\u25CF" : "\u25CB",
                u = b.type === "connected" ? h.app.toolSuccess : b.type === "failed" || b.type === "denied" ? h.app.toolError : h.colors.warning,
                P = Array.isArray(n.tools) ? n.tools.length : 0;
              if (i.push(new G(`${y} `, new cT({
                color: u
              }))), i.push(new G(n.name, new cT({
                bold: !0
              }))), P > 0) i.push(new G(` ${P} ${o9(P, "tool")}`, new cT({
                dim: !0
              })));
              if (i.push(new G(`
`)), p || m || n.includeTools && n.includeTools.length > 0) {
                let k = [];
                if (p) k.push(p);
                if (m) k.push(m);
                if (n.includeTools && n.includeTools.length > 0) k.push(`includeTools: ${n.includeTools.join(", ")}`);
                i.push(new G(`  \u2514\u2500 ${k.join(" | ")}
`, new cT({
                  dim: !0
                })));
              }
              if (b.type === "failed") i.push(new G(`  \u2514\u2500 ${b.error.message}
`, new cT({
                color: h.app.toolError
              })));else if (b.type === "denied") i.push(new G(`  \u2514\u2500 Denied by user
`, new cT({
                color: h.app.toolError
              })));else if (b.type === "awaiting-approval") i.push(new G(`  \u2514\u2500 Awaiting approval
`, new cT({
                color: h.colors.warning
              })));else if (n.tools instanceof Error) i.push(new G(`  \u2514\u2500 ${n.tools.message}
`, new cT({
                color: h.app.toolError
              })));else if (_ && Array.isArray(n.tools) && n.tools.length === 0) i.push(new G(`  \u2514\u2500 ${p ?? "skill-backed server"}
`, new cT({
                dim: !0
              })));else if (Array.isArray(n.tools) && n.tools.length > 0) for (let k of n.tools) {
                let x = RH0(k),
                  f = k.spec.meta?.deferred === !0,
                  v = f ? "  \u25CC " : "  \u2713 ",
                  g = h.app.link,
                  I = f ? h.colors.warning : g,
                  S = [];
                if (x.length > 0) {
                  let O = x.join(", ");
                  S.push(_gT(n) ? `skills: ${O}` : `also in skills: ${O}`);
                }
                if (f) S.push("deferred");
                if (i.push(new G(v, new cT({
                  color: I
                }))), i.push(new G(k.spec.name, new cT({
                  color: g
                }))), k.spec.description) {
                  let O = k.spec.description.replace(/\s+/g, " ").trim();
                  if (O.length > 50) O = O.slice(0, 47) + "...";
                  i.push(new G(` ${O}`, new cT({
                    dim: !0
                  })));
                }
                if (S.length > 0) i.push(new G(` (${S.join("; ")})`, new cT({
                  dim: !0
                })));
                i.push(new G(`
`));
              }
              i.push(new G(`
`));
            }
          };
          for (let A of WRR) {
            let l = r.get(A);
            if (l && l.length > 0) c(A, l);
          }
          let s = new I3({
            child: new xT({
              text: new G("", void 0, i)
            })
          });
          return new et(s, "MCP Tools");
        } catch (a) {
          return J.error("Failed to list MCP tools", a), Error("Failed to list MCP tools");
        }
      }
    }), this.register({
      id: "mcp-reload",
      noun: "mcp",
      verb: "reload",
      description: "Reload all MCP servers",
      execute: async R => {
        R.mcpService.restartServers(), R.showStatusMessage("Reloading MCP servers...");
      }
    }), this.register({
      id: "plugins-reload",
      noun: "plugins",
      verb: "reload",
      description: "Reload all plugins",
      execute: async R => {
        if (R.reloadPlugins) R.reloadPlugins(), R.showStatusMessage("Reloading plugins...");
      },
      isShown: R => R.reloadPlugins ? !0 : "Plugins not available"
    }), this.register({
      id: "plugins-list",
      noun: "plugins",
      verb: "list",
      description: "List all plugins and their registrations",
      execute: R => aH0(R),
      isShown: R => R.pluginService ? !0 : "Plugins not available"
    }), this.register({
      id: "mcp-status",
      noun: "mcp",
      verb: "status",
      description: "Show MCP server connection status",
      execute: async R => {
        R.showMCPStatusModal();
      }
    }), this.register({
      id: "toolbox-list",
      noun: "toolbox",
      verb: "list",
      description: "List all toolboxes and their tools",
      execute: R => {
        let a = new R0R({
          toolboxService: R.toolboxService
        });
        return new et(a, "Toolboxes");
      }
    }), this.register({
      id: "set-agent-mode",
      noun: "mode",
      verb: "set",
      description: "Set agent mode",
      customFlow: (R, a, e) => {
        let t = this.getAgentModeSync(R),
          r = R.canUseAmpFree && !R.isDailyGrantEnabled,
          h = Kl({
            ...T.settings,
            disabledAgentModes: R.workspace?.disabledAgentModes
          }, r, {
            userEmail: R.userEmail
          });
        return new we({
          items: h.map(i => i.mode).filter(i => i !== t),
          getLabel: i => {
            let c = h.find(A => A.mode === i)?.description || "",
              s = i === t ? " (current)" : "";
            return `${i}${c ? ` - ${c}` : ""}${s}`;
          },
          title: "Select Agent Mode",
          onAccept: async i => {
            await a(i), e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => {
        try {
          if (!e) return;
          if (!this.canChangeAgentMode(R)) return Error("Can only change agent mode for new threads");
          let t = await this.getCurrentAgentMode(R);
          if (qt(e) && !qt(t)) {
            R.toggleAgentMode();
            return;
          }
          R.setAgentMode(e);
          let r = await R.configService.getLatest(),
            h = R.canUseAmpFree && !R.isDailyGrantEnabled,
            i = Kl({
              ...r.settings,
              disabledAgentModes: R.workspace?.disabledAgentModes
            }, h, {
              userEmail: R.userEmail
            }),
            c = eAR(e, i);
          return new Tc(`Mode set to: ${e}${c ? ` - ${c}` : ""} (session override)`);
        } catch (t) {
          return J.error("Failed to access agent mode setting", t), Error("Failed to access agent mode setting");
        }
      },
      isShown: R => {
        if (!this.canChangeAgentMode(R)) return "Can only use mode: set for new threads";
        return !0;
      }
    }), this.register({
      id: "set-theme",
      noun: "theme",
      verb: "switch",
      description: "Switch theme",
      customFlow: (R, a, e) => {
        let t = R.getThemeName(),
          r = KIT();
        return new we({
          items: r.map(h => h.name),
          getLabel: h => {
            let i = r.find(l => l.name === h),
              c = i?.label ?? h,
              s = h === t ? " (current)" : "",
              A = i?.source.type === "builtin" ? " (builtin)" : i?.source.type === "custom" ? ` (${yA(i.source.path)})` : "";
            return `${c}${s}${A}`;
          },
          renderItem: (h, i, c, s) => {
            let A = $R.of(s),
              l = r.find(y => y.name === h),
              o = l?.label ?? h,
              n = h === t,
              p = i ? A.app.selectionBackground : void 0,
              _ = i ? A.app.selectionForeground : A.colors.foreground,
              m = i ? A.app.selectionForeground : A.colors.mutedForeground,
              b = [new G(o, new cT({
                color: _,
                bold: n
              }))];
            if (n) b.push(new G(" (current)", new cT({
              color: m,
              bold: !0
            })));
            if (l?.source.type === "builtin") b.push(new G(" (builtin)", new cT({
              color: m
            })));else if (l?.source.type === "custom") b.push(new G(` (${yA(l.source.path)})`, new cT({
              color: m
            })));
            return new SR({
              decoration: p ? {
                color: p
              } : void 0,
              padding: TR.symmetric(2, 0),
              child: new xT({
                text: new G("", void 0, b)
              })
            });
          },
          title: "Select Theme",
          onAccept: async h => {
            await a(h), e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => {
        if (!e) return;
        await R.configService.updateSettings("terminal.theme", e, "global");
        let t = KIT().find(r => r.name === e);
        return new Tc(`Theme set to: ${t?.label ?? e}`);
      }
    }), M0T.forEach(R => {
      this.register(this.createAgentModeCommand(R));
    }), this.register({
      id: "model-selector",
      noun: "model",
      verb: "select",
      description: "Why Amp does not have a model selector",
      execute: async () => {
        let R = new I3({
          child: new Z3({
            markdown: `Our goal with Amp is to let software builders harness the full power of artificial intelligence.

We believe the best way to reach that goal is to build the best possible agent we can. And we believe agents work better when they're treated as a product end-to-end, not as a kit for users to assemble.

An agent is more than a single model. It's a "harness" around it: a system prompt, tools, information about the environment, specialized subagents using other models -- all tailored to get the most out of a specific model.

Building that harness, tuning and tweaking it, adapting it to the very best frontier models -- that's our job, not something you should have to think about. And we can do that job better if Amp isn't used in a thousand different, mismatched ways.

What Amp has instead: modes. "smart", "rush", and others. Each mode is a unique combination of models, prompts, and tools.

Use "mode: set" to switch modes.

Look at our models page to see how many models come together in a single agent: https://ampcode.com/models`
          })
        });
        return new et(R, "Amp does not have a model selector", "info", "help");
      }
    }), this.register({
      id: "show-costs",
      noun: "dev",
      verb: "toggle costs",
      description: "Toggle detailed cost display (experimental)",
      shortcut: x0.alt("d"),
      execute: async R => {
        let a = await R.configService.getLatest();
        Ms("agent.showUsageDebugInfo", !(a.settings["agent.showUsageDebugInfo"] ?? !1));
      },
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "refresh",
      noun: "screen",
      verb: "refresh",
      description: "Refresh screen",
      shortcut: x0.ctrl("l"),
      execute: async R => {
        d9.instance.tuiInstance.getScreen().markForRefresh(), k8.instance.requestFrame();
      }
    }), this.register({
      id: "help",
      noun: "amp",
      verb: "help",
      description: "Show this help",
      execute: async R => {
        R.openHelp();
      }
    }), this.register({
      id: "quit",
      noun: "amp",
      verb: "quit",
      description: "Exit application",
      aliases: ["exit"],
      shortcut: new x0("c", {
        ctrl: !0
      }),
      execute: R => {
        R.exitApp();
      }
    }), this.register({
      id: "show-system-prompt",
      noun: "dev",
      verb: "show system prompt",
      description: "Show current system prompt in markdown",
      execute: async (R, a) => {
        try {
          let e = await R.createSystemPromptDeps(),
            t = R.getEffectiveAgentMode(),
            r = nk(t),
            [h, i, c] = r.match(/(.*?)\/(.*)/) ?? [],
            {
              systemPrompt: s,
              tools: A
            } = await LO(e, R.thread, {
              enableTaskList: !0,
              enableTask: !0,
              enableOracle: !0,
              enableDiagnostics: !0
            }, {
              model: c ?? "unknown",
              provider: i ?? "unknown",
              agentMode: t
            }, a.signal),
            l = s.map(m => m.text).join(`

`),
            o = A,
            n = o.map(m => {
              let b = m.inputSchema.properties || {},
                y = m.inputSchema.required || [],
                u = Object.entries(b).map(([f, v]) => {
                  let g = y.includes(f),
                    I = v.type || "unknown";
                  return `${f}${g ? "*" : ""} (${I})`;
                }).join(", "),
                P = "source" in m && typeof m.source === "object" ? Object.entries(m.source).map(([f, v]) => `${f}: ${v}`).join(", ") : "source" in m ? String(m.source) : "builtin",
                k = m.description || "N/A",
                x = k.length > 50 ? k.slice(0, 50) + "..." : k;
              return `### ${m.name}
**Description:** ${x}
**Source:** ${P}
**Parameters:** ${u || "(none)"}`;
            }).join(`

`),
            p = `# System Prompt

${l}

# Tools (${o.length} total)

${n}

# Agent Mode

${t}`,
            _ = new I3({
              child: new Z3({
                markdown: p
              })
            });
          return new et(_, "System Prompt");
        } catch (e) {
          return J.error("Failed to build system prompt", e), Error("Failed to build system prompt");
        }
      },
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "debug-thread-json",
      noun: "dev",
      verb: "open thread JSON",
      description: "Open thread JSON in editor",
      execute: async R => FU0(R),
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "debug-thread-yaml",
      noun: "dev",
      verb: "open thread YAML",
      description: "Open thread YAML in editor",
      execute: async R => GU0(R),
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "debug-logs",
      noun: "debug",
      verb: "logs",
      description: "View or copy log commands for CLI and Cloudflare",
      customFlow: (R, a, e) => {
        return new we({
          title: "Debug: Logs",
          items: CU0,
          getLabel: t => t.label,
          onAccept: async t => {
            await a(t.id), e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => KU0(R, e),
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "debug-copy-prompt",
      noun: "debug",
      verb: "copy prompt",
      description: "Copy a Markdown debug bundle for the current thread",
      execute: async R => VU0(R),
      isEnabled: R => this.isInternalDTWThread(R)
    }), this.register({
      id: "debug-copy-command",
      noun: "debug",
      verb: "copy command",
      description: "Copy a DTW debugging command for the current thread",
      customFlow: (R, a, e) => {
        let t = [...(R.logFile ? [{
          label: "cli: copy tail logs",
          command: PB("tail", process.pid, R.logFile)
        }, {
          label: "cli: copy logs snapshot",
          command: PB("snapshot", process.pid, R.logFile)
        }] : []), ...wRR(R.thread.id, R.ampURL)];
        return new we({
          title: "Debug: Copy Command",
          items: t,
          getLabel: r => r.label,
          onAccept: async r => {
            await a(r), e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => YU0(R, e),
      isEnabled: R => this.isInternalDTWThread(R)
    }), this.register({
      id: "debug-thread-diagnostics",
      noun: "debug",
      verb: "thread diagnostics",
      description: "Show live diagnostics for the current thread",
      aliases: ["diagnostics"],
      execute: async R => QU0(R),
      isEnabled: R => this.isInternalUser(R)
    }), this.register({
      id: "debug-package",
      noun: "debug",
      verb: "package",
      description: "Package filtered CLI logs and DTW dump as a zip, copy to clipboard for Slack",
      customFlow: (R, a, e) => {
        let t = R.takeImageAttachments(),
          r = !1,
          h = () => {
            if (!r && t.length > 0) R.setImageAttachments(t);
            e();
          };
        return new SRR({
          commandName: "debug package",
          placeholder: "Describe the issue. You can paste screenshots directly here.",
          completionBuilder: R.completionBuilder,
          initialImages: t,
          onSubmit: async (i, c) => {
            let s = BRR(i);
            if (s.length === 0) return;
            if (!(await a({
              description: s,
              images: c
            }))) r = !0, h();
          },
          onDismiss: h
        });
      },
      execute: async (R, a, e) => ZU0(R, e),
      isEnabled: R => this.isDogfoodingEnabled(R)
    }), this.register({
      id: "skill-add",
      noun: "skill",
      verb: "add",
      description: "Install skills from GitHub or local source",
      aliases: ["install skill"],
      customFlow: (R, a, e) => {
        return new QM({
          commandName: "skill add",
          placeholder: "owner/repo or owner/repo/skill-name (e.g., ampcode/skills/tmux)",
          isRequiredArg: !0,
          onSubmit: async t => {
            await a(t), e();
          },
          onDismiss: e
        });
      },
      execute: async (R, a, e) => {
        let t = await R.skillService.getTargetDir();
        try {
          let r = await J5T(e, t);
          if (r.length === 0) return Error(`No skills found in ${e}`);
          let h = r.filter(c => c.success),
            i = r.filter(c => !c.success);
          if (i.length > 0) return Error(`Installed ${h.length} skills, ${i.length} failed`);
          R.skillService.reload("skill-add"), R.showToast(`Installed ${o9(h.length, "skill")}: ${h.map(c => c.skillName).join(", ")}`, "success");
        } catch (r) {
          return J.error("Failed to install skill", r), Error(`Failed to install skill: ${r instanceof Error ? r.message : String(r)}`);
        }
      }
    }), this.register({
      id: "skill-remove",
      noun: "skill",
      verb: "remove",
      description: "Remove an installed skill from workspace",
      aliases: ["uninstall skill"],
      customFlow: (R, a, e) => {
        return new q_({
          initialState: {
            skills: null,
            loading: !0
          },
          builder: (t, r, h) => {
            if (h.loading) return R.skillService.getTargetDir().then(i => {
              let c = R.skillService.listInstalled(i);
              r(s => ({
                ...s,
                skills: c,
                loading: !1
              }));
            }), new Ko({
              message: "Loading skills..."
            });
            if (!h.skills || h.skills.length === 0) return e(), new XT();
            return new we({
              title: "Select skill to remove",
              items: h.skills,
              getLabel: i => i,
              onAccept: async i => {
                await a(i), e();
              },
              onDismiss: e
            });
          }
        });
      },
      execute: async (R, a, e) => {
        let t = await R.skillService.getTargetDir();
        if (!TzT(e, t)) return Error(`Skill "${e}" not found in workspace`);
        R.skillService.reload("skill-remove"), R.showToast(`Removed skill: ${e}`, "success");
      }
    }), this.register({
      id: "skill-list",
      noun: "skill",
      verb: "list",
      description: "List installed skills",
      execute: async R => {
        R.openSkillList();
      }
    }), this.register({
      id: "skill-invoke",
      noun: "skill",
      verb: "invoke",
      description: "Load a skill for the current thread",
      aliases: ["use skill", "load skill"],
      customFlow: (R, a, e) => {
        return new q_({
          initialState: {
            skills: null,
            loading: !0
          },
          builder: (t, r, h) => {
            if (h.loading) return R.skillService.getSkills().then(c => {
              r(s => ({
                ...s,
                skills: c,
                loading: !1
              }));
            }), new Ko({
              message: "Loading skills..."
            });
            if (!h.skills || h.skills.length === 0) return e(), R.showToast('No skills available. Add skills with "skill: add".', "error"), new XT();
            let i = $R.of(t);
            return new we({
              title: "Select skill to invoke",
              items: h.skills,
              getLabel: c => {
                let s = PgT(c.description);
                return s ? `${c.name} - ${s}` : c.name;
              },
              renderItem: (c, s) => {
                let A = s ? i.app.selectionBackground : void 0,
                  l = s ? i.app.selectionForeground : i.colors.foreground,
                  o = PgT(c.description),
                  n = [new G(c.name, new cT({
                    color: l
                  }))];
                if (o) n.push(new G(` - ${o}`, new cT({
                  color: l,
                  dim: !0
                })));
                return new SR({
                  decoration: A ? {
                    color: A
                  } : void 0,
                  padding: TR.symmetric(2, 0),
                  child: new xT({
                    text: new G("", void 0, n)
                  })
                });
              },
              onAccept: async c => {
                await a({
                  name: c.name
                }), e();
              },
              onDismiss: e
            });
          }
        });
      },
      execute: async (R, a, e) => {
        R.addPendingSkill({
          name: e.name
        }), R.showToast(`Skill "${e.name}" will be used on next message`, "success");
      }
    }), this.register({
      id: "task-pick",
      noun: "task",
      verb: "pick",
      description: "Pick a ready task to work on",
      aliases: ["pick task", "work on task"],
      isEnabled: R => this.hasTaskListFeature(R),
      customFlow: (R, a, e) => {
        let t = i => {
            if (!i) return "no repo";
            try {
              return new URL(i).pathname.replace(/^\//, "").replace(/\.git$/, "");
            } catch {
              return i;
            }
          },
          r = !1,
          h = null;
        return new q_({
          initialState: {
            tasks: null,
            loading: !0,
            filterMode: "current-repo",
            currentRepoURL: void 0,
            currentRepoName: void 0
          },
          builder: (i, c, s) => {
            if (s.loading && (!r || h !== s.filterMode)) return r = !0, h = s.filterMode, (async () => {
              let b = s.currentRepoURL;
              if (b === void 0) b = R.thread.env?.initial.trees?.[0]?.repository?.url;
              let y = b ? t(b) : void 0,
                u = s.filterMode === "current-repo" ? b : void 0;
              try {
                let P = await R.internalAPIClient.listTasks({
                    ready: !0,
                    repoURL: u
                  }, {
                    config: R.configService
                  }),
                  k = P.ok && P.result ? P.result.tasks : [];
                if (s.filterMode === "current-repo" && k.length === 0 && b) {
                  let x = await R.internalAPIClient.listTasks({
                      ready: !0
                    }, {
                      config: R.configService
                    }),
                    f = x.ok && x.result ? x.result.tasks : [];
                  if (f.length > 0) {
                    c(v => ({
                      ...v,
                      tasks: f,
                      loading: !1,
                      filterMode: "all-repos",
                      currentRepoURL: b,
                      currentRepoName: y
                    })), R.showToast("No tasks in this repo; showing all repositories");
                    return;
                  }
                }
                c(x => ({
                  ...x,
                  tasks: k,
                  loading: !1,
                  currentRepoURL: b,
                  currentRepoName: y
                }));
              } catch (P) {
                J.error("Failed to load tasks", P), e(), R.showToast("Failed to load tasks", "error");
              }
            })(), new Ko({
              message: "Loading ready tasks..."
            });
            if (!s.tasks || s.tasks.length === 0) return e(), R.showToast("No ready tasks available"), new XT();
            let A = Math.max(...s.tasks.map(b => `#${b.id}: `.length)),
              l = s.filterMode === "current-repo" && s.currentRepoName ? ` for ${s.currentRepoName}` : " from all repositories",
              o = s.filterMode === "current-repo" ? " for all repos" : s.currentRepoName ? ` for ${s.currentRepoName} only` : "",
              n = $R.of(i),
              p = s.currentRepoURL ? new uR({
                padding: TR.symmetric(0, 1),
                child: new N0({
                  child: new xT({
                    text: new G("", new cT({
                      color: n.colors.foreground,
                      dim: !0
                    }), [new G(`Tasks${l} \u2014 `, new cT({
                      color: n.colors.foreground,
                      dim: !0
                    })), new G("Ctrl+R", new cT({
                      color: n.app.keybind,
                      dim: !0
                    })), new G(o, new cT({
                      color: n.colors.foreground,
                      dim: !0
                    }))])
                  })
                })
              }) : new uR({
                padding: TR.symmetric(0, 1),
                child: new N0({
                  child: new xT({
                    text: new G("Tasks from all repositories", new cT({
                      color: n.colors.foreground,
                      dim: !0
                    }))
                  })
                })
              });
            class _ extends H8 {}
            let m = new we({
              title: "Select a task to work on",
              items: s.tasks,
              footer: p,
              getLabel: b => {
                let y = s.filterMode === "all-repos" ? `[${t(b.repoURL)}] ` : "",
                  u = b.description ? ` - ${b.description.slice(0, 80)}${b.description.length > 80 ? "\u2026" : ""}` : "";
                return `#${b.id}: ${y}${b.title}${u}`;
              },
              renderItem: (b, y) => {
                let u = y ? n.app.selectionBackground : void 0,
                  P = y ? n.app.selectionForeground : n.colors.foreground,
                  k = [];
                if (s.filterMode === "all-repos") k.push(new G(`[${t(b.repoURL)}] `, new cT({
                  color: P,
                  dim: !0
                })));
                if (k.push(new G(b.title, new cT({
                  color: P
                }))), b.description) k.push(new G(` - ${b.description}`, new cT({
                  color: P,
                  dim: !0
                })));
                return new SR({
                  decoration: u ? {
                    color: u
                  } : void 0,
                  padding: TR.symmetric(2, 0),
                  child: new T0({
                    crossAxisAlignment: "start",
                    children: [new XT({
                      width: A,
                      child: new xT({
                        text: new G(`#${b.id}: `, new cT({
                          color: P,
                          dim: !0
                        }))
                      })
                    }), new j0({
                      child: new xT({
                        text: new G("", void 0, k)
                      })
                    })]
                  })
                });
              },
              onAccept: async b => {
                await a({
                  id: b.id,
                  title: b.title,
                  description: b.description
                }), e();
              },
              onDismiss: e
            });
            if (s.currentRepoURL) return new Nt({
              actions: new Map([[_, new x9(() => {
                let b = s.filterMode === "current-repo" ? "all-repos" : "current-repo";
                c(y => ({
                  ...y,
                  loading: !0,
                  tasks: null,
                  filterMode: b
                }));
              })]]),
              child: new kc({
                shortcuts: new Map([[x0.ctrl("r"), new _()]]),
                child: m
              })
            });
            return m;
          }
        });
      },
      execute: async (R, a, e) => {
        let t = `#${e.id}`,
          r = e.description ? `

${e.description}` : "",
          h = `Work on task ${t}: ${e.title}${r}`;
        R.editorDispatch({
          type: "set-input",
          input: h
        });
      }
    });
  }
  async getCurrentAgentMode(T) {
    return T.getEffectiveAgentMode();
  }
  getAgentModeSync(T) {
    return T.getEffectiveAgentMode();
  }
  isThreadEmpty(T) {
    return T.thread.messages.length === 0;
  }
  canChangeAgentMode(T) {
    return this.isThreadEmpty(T) || (T.canChangeAgentModeInPromptEditor?.() ?? !1);
  }
  canToggleSmartSpeed(T) {
    return this.isThreadEmpty(T) || T.getEffectiveAgentMode() === "smart";
  }
  canToggleOpenAISpeed(T) {
    let R = T.getEffectiveAgentMode();
    return this.isThreadEmpty(T) || qo(R);
  }
  threadHasMessages(T) {
    return !this.isThreadEmpty(T);
  }
  getQueuedMessages(T) {
    return T.thread.queuedMessages ?? [];
  }
  isDTWThread(T) {
    return T.threadPool.isDTWMode?.() === !0;
  }
  hasPromptText(T) {
    return T.editorState.text.trim().length > 0;
  }
  hasTaskListFeature(T) {
    return T.features.some(R => R.name === dr.TASK_LIST && R.enabled);
  }
  register(T) {
    if (this.commands.has(T.id)) throw Error(`Command with id ${T.id} already registered`);
    this.commands.set(T.id, T);
  }
  createAgentModeCommand(T) {
    return {
      id: `agent-mode-${T}`,
      noun: "mode",
      verb: `use ${T}`,
      description: `Use ${T} mode`,
      aliases: [T, `/${T}`],
      isEnabled: R => {
        let a = R.canUseAmpFree && !R.isDailyGrantEnabled;
        return Kl({
          ...this.initialConfig.settings,
          disabledAgentModes: R.workspace?.disabledAgentModes
        }, a, {
          userEmail: R.userEmail
        }).some(e => e.mode === T);
      },
      execute: async R => {
        try {
          if (!this.canChangeAgentMode(R)) return Error("Can only change agent mode for new threads");
          R.setAgentMode(T);
        } catch (a) {
          return J.error("Failed to access agent mode setting", a), Error("Failed to access agent mode setting");
        }
      },
      isShown: R => {
        if (R.getEffectiveAgentMode() === T) return `Cannot use mode: use ${T} when already in ${T} mode`;
        if (qt(T) && R.isDailyGrantEnabled) return "Cannot use mode: use free while daily grant is enabled. Use smart (or other non-free modes) to consume your daily grant";
        if (!this.canChangeAgentMode(R)) return `Can only use mode: use ${T} for new threads`;
        return !0;
      }
    };
  }
  getAllCommands(T) {
    let R = (T?.pluginCommands ?? []).map(h => ({
        id: `plugin-command-${h.pluginName}-${h.id}`,
        noun: h.category,
        verb: h.title,
        description: h.description ?? `Run plugin command ${h.category}: ${h.title}`,
        pluginExecution: {
          pluginName: h.pluginName,
          commandId: h.id
        },
        execute: async () => {}
      })),
      a = Array.from(this.commands.values()).filter(h => {
        return h.noun !== "dev";
      }),
      e = Array.from(this.commands.values()).filter(h => {
        return h.noun === "dev";
      }),
      t = (T ? a.filter(h => !h.isEnabled || h.isEnabled(T) === !0) : a).filter(h => !this.hiddenCommandIds.has(h.id)),
      r = T && this.isDogfoodingEnabled(T) ? e : [];
    return [...t, ...R, ...r];
  }
}
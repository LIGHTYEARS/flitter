function BfR(T, R = new Date()) {
  return a => {
    switch (a.v++, T.type) {
      case "cancelled":
        {
          lC(a);
          let e = a.messages.at(-1);
          if (e?.role === "user") {
            let t = e.content.findLast(r => r.type === "tool_result");
            if (t) t.run.status = "cancelled";
          }
          break;
        }
      case "user:message:interrupt":
        {
          let e = a.messages[T.messageIndex];
          if (e?.role === "user") e.interrupted = !0;
          break;
        }
      case "user:message:append-content":
        {
          let e = a.messages.find(t => t.messageId === T.messageId);
          if (e?.role === "user") e.content.push(...O8(T.content));
          break;
        }
      case "thread:truncate":
        {
          if (a.messages.splice(T.fromIndex), a.relationships) {
            if (a.relationships = a.relationships.filter(e => e.messageIndex === void 0 || e.messageIndex < T.fromIndex), a.relationships.length === 0) a.relationships = void 0;
          }
          break;
        }
      case "user:message":
        {
          if (lC(a), a.archived) a.archived = !1;
          let e = {
              role: "user",
              ...T.message,
              messageId: $y(a),
              content: T.message.content ?? []
            },
            t = i5(e);
          if (T.index !== void 0) {
            if (!a.messages[T.index]) throw Error(`user message at index ${T.index} not found`);
            let r = a.messages[T.index];
            if (a.messages.filter(h => h.role === "user")[0] === r && e.agentMode && !a.mainThreadID) a.agentMode = e.agentMode;
            a.messages.splice(T.index, a.messages.length - T.index, t);
          } else {
            let r = ve(a) === 0;
            if ((!a.agentMode || r) && e.agentMode && !a.mainThreadID) a.agentMode = e.agentMode;
            if (a.messages.push(t), a.draft) a.draft = void 0;
          }
          break;
        }
      case "user:message-queue:dequeue":
        {
          if (lC(a), !a.queuedMessages) return;
          let [e, ...t] = a.queuedMessages;
          if (!e) return;
          a.messages.push(e.queuedMessage), a.queuedMessages = t;
          break;
        }
      case "user:tool-input":
        {
          if (!Tn(a, T.toolUse)) {
            J.debug(`Ignoring user:tool-input delta for missing tool use ${T.toolUse} (likely deleted due to thread edit/truncation)`);
            break;
          }
          let e = O8(cN(a, T.toolUse));
          if (!e) {
            J.debug(`Ignoring user:tool-input delta for missing tool result block ${T.toolUse} (likely deleted due to thread edit/truncation)`);
            break;
          }
          e.userInput = T.value;
          break;
        }
      case "tool:data":
        {
          if (!gj(a, T.toolUse)) {
            J.debug(`Ignoring tool:data delta for missing tool use ${T.toolUse} (likely deleted due to thread edit/truncation)`);
            break;
          }
          let e = O8(i5(T.data));
          xwT(a, T.toolUse, e);
          break;
        }
      case "tool:processed":
        {
          let e = gj(a, T.toolUse);
          if (!e) {
            J.debug(`Ignoring tool:processed delta for missing tool use ${T.toolUse} (likely deleted due to thread edit/truncation)`);
            break;
          }
          let t = e.block.input;
          e.block.input = T.newArgs, e.message.originalToolUseInput = {
            ...e.message.originalToolUseInput,
            [T.toolUse]: t
          };
          break;
        }
      case "assistant:message":
        {
          let e = dt(a, "assistant"),
            t = e?.content.filter(h => h.type === "tool_use").map(h => h.id) || [];
          if (lC(a), e?.state.type === "cancelled") {
            for (let h of a.messages) if (h.role === "user") h.content = h.content.filter(i => {
              if (i.type === "tool_result" && t.includes(i.toolUseID)) return !1;
              return !0;
            });
          }
          let r = {
            ...T.message,
            messageId: $y(a)
          };
          a.messages.push(O8(r));
          break;
        }
      case "assistant:message-update":
        {
          let e = O8(T.message),
            t = a.messages.at(-1);
          if (t?.role === "assistant") {
            let r = _K(t.usage, e.usage);
            a.messages[a.messages.length - 1] = {
              ...e,
              messageId: t.messageId,
              usage: r
            };
          } else a.messages.push({
            ...e,
            messageId: $y(a)
          });
          break;
        }
      case "inference:completed":
        {
          if (wfR(a, T.usage), !a.env) a.env = {
            initial: {}
          };
          if (!a.env.initial.tags) a.env.initial.tags = [];
          if (a.env.initial.tags = a.env.initial.tags.filter(e => e !== "model:undefined"), T.model) {
            let e = `model:${T.model}`;
            if (!a.env.initial.tags.includes(e)) a.env.initial.tags = [...a.env.initial.tags, e];
          }
          if (T.usage) {
            let e = O8(dt(a, "assistant"));
            if (e) {
              let t = _K(e.usage, T.usage);
              if (t) e.usage = t;
            }
          }
          break;
        }
      case "title":
        {
          a.title = T.value || void 0;
          break;
        }
      case "max-tokens":
        {
          a.maxTokens = T.value || void 0;
          break;
        }
      case "main-thread":
        {
          a.mainThreadID = T.value || void 0;
          break;
        }
      case "agent-mode":
        {
          if (ve(a) > 0) throw Error("(bug) cannot change agentMode after first message");
          a.agentMode = T.mode;
          break;
        }
      case "environment":
        {
          a.env = O8(T.env);
          break;
        }
      case "user:message-queue:enqueue":
        {
          if (!a.queuedMessages) a.queuedMessages = [];
          if (DfR(a.queuedMessages)) break;
          let e = {
              role: "user",
              ...T.message,
              messageId: $y(a),
              content: T.message.content ?? []
            },
            t = i5(e);
          a.queuedMessages.push({
            id: vfR("queued-"),
            queuedMessage: O8(t)
          });
          break;
        }
      case "user:message-queue:discard":
        {
          if (T.id === void 0) {
            a.queuedMessages = [];
            break;
          }
          let e = a.queuedMessages?.findIndex(t => t.id === T.id);
          if (e === void 0) throw Error(`queued message with id ${T.id} not found`);
          a?.queuedMessages?.splice(e, 1);
          break;
        }
      case "info:manual-bash-invocation":
        {
          a.messages.push({
            role: "info",
            messageId: $y(a),
            content: [{
              type: "manual_bash_invocation",
              args: O8(T.args),
              toolRun: O8(T.toolRun),
              hidden: T.hidden
            }]
          });
          break;
        }
      case "clearPendingNavigation":
        {
          a.pendingNavigation = void 0;
          break;
        }
      case "setPendingNavigation":
        {
          a.pendingNavigation = T.threadID;
          break;
        }
      case "relationship":
        {
          if (!a.relationships) a.relationships = [];
          if (!a.relationships.some(e => e.threadID === T.relationship.threadID && e.type === T.relationship.type && e.role === T.relationship.role)) a.relationships.push(O8(T.relationship));
          break;
        }
      case "draft":
        {
          if (a.draft = O8(T.content), T.autoSubmit) a.autoSubmitDraft = !0;
          break;
        }
      case "trace:start":
        {
          NfR(a, T.span);
          break;
        }
      case "trace:end":
        {
          UfR(a, T.span, R);
          break;
        }
      case "trace:event":
        {
          HfR(a, T.span, T.event);
          break;
        }
      case "trace:attributes":
        {
          WfR(a, T.span, T.attributes);
          break;
        }
    }
  };
}
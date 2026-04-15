async function CJT(T, R, a, e) {
  let t = async () => {
      let i = await m0(T.threadHandles$);
      if (!i) throw new GR("No active thread handle. Run create-thread or switch first.", 1);
      return i;
    },
    r = () => {
      let i = R.getValue();
      dJT("command", i);
    },
    h = async (i, c) => {
      if (!i) {
        v0(c ? "Usage: shell-hidden <cmd>" : "Usage: shell <cmd>");
        return;
      }
      let s = await t();
      if (!s.invokeBashTool) {
        v0("Manual shell invocation is not supported by this thread pool");
        return;
      }
      let A = s.invokeBashTool.bind(s),
        l = new AbortController(),
        o = Date.now(),
        n = null;
      await new Promise((p, _) => {
        let m = A({
          cmd: i
        }, {
          hidden: c,
          abortController: l
        }).subscribe({
          next: b => {
            n = b;
          },
          error: b => {
            m.unsubscribe(), _(b);
          },
          complete: () => {
            m.unsubscribe(), p();
          }
        });
      }), J4("shell-invocation", {
        cmd: i,
        hidden: c,
        durationMs: Date.now() - o,
        finalRun: n
      });
    };
  for (let i of a) {
    if (i === "quit" || i === "exit") {
      r();
      return;
    }
    if (i.startsWith("shell-hidden ") || i.startsWith("$$ ")) {
      let c = i.startsWith("shell-hidden ") ? i.slice(13).trim() : i.slice(3).trim();
      await h(c, !0), r();
      continue;
    }
    if (i.startsWith("shell ") || i.startsWith("$ ")) {
      let c = i.startsWith("shell ") ? i.slice(6).trim() : i.slice(2).trim();
      await h(c, !1), r();
      continue;
    }
    if (i.startsWith("send ")) {
      let c = await t(),
        s = i.slice(5).trim();
      if (!s) {
        v0("Missing message text for send");
        continue;
      }
      await c.sendMessage({
        content: gg(s)
      }), r();
      continue;
    }
    if (i.startsWith("send-agent ")) {
      let c = await t(),
        s = i.slice(11).trim(),
        A = s.indexOf(" "),
        l = A === -1 ? s : s.slice(0, A),
        o = A === -1 ? "" : s.slice(A + 1).trim();
      if (!l || !o) {
        v0("Usage: send-agent <mode> <text>");
        continue;
      }
      await c.sendMessage({
        content: gg(o),
        agentMode: l
      }), r();
      continue;
    }
    if (i.startsWith("edit-agent ")) {
      let c = await t(),
        s = i.slice(11).trim().match(/^(\S+)\s+(\d+)\s+(.*)$/);
      if (!s) {
        v0("Usage: edit-agent <mode> <index> <text>");
        continue;
      }
      let A = s[1] ?? "",
        l = Number(s[2]),
        o = s[3] ?? "";
      if (!Number.isFinite(l) || l < 0) {
        v0(`Invalid edit index: ${s[2]}`);
        continue;
      }
      await c.sendMessage({
        content: gg(o),
        editIndex: l,
        agentMode: A
      }), r();
      continue;
    }
    if (i.startsWith("edit ")) {
      let c = await t(),
        s = i.slice(5).trim().match(/^(\d+)\s+(.*)$/);
      if (!s) {
        v0("Usage: edit <index> <text>");
        continue;
      }
      let A = Number(s[1]),
        l = s[2] ?? "";
      if (!Number.isFinite(A) || A < 0) {
        v0(`Invalid edit index: ${s[1]}`);
        continue;
      }
      await c.sendMessage({
        content: gg(l),
        editIndex: A
      }), r();
      continue;
    }
    if (i.startsWith("truncate ")) {
      let c = await t(),
        s = i.slice(9).trim(),
        A = Number(s);
      if (!Number.isFinite(A) || A < 0) {
        v0(`Invalid truncate index: ${s}`);
        continue;
      }
      await c.restoreTo(A), r();
      continue;
    }
    if (i.startsWith("queue ")) {
      let c = await t(),
        s = i.slice(6).trim();
      if (!s) {
        v0("Missing message text for queue");
        continue;
      }
      await c.queueMessage(gg(s)), r();
      continue;
    }
    if (i === "discard-queue") {
      await (await t()).discardQueuedMessages(), r();
      continue;
    }
    if (i.startsWith("title ")) {
      let c = await t(),
        s = i.slice(6).trim();
      if (!s) {
        v0("Missing title text");
        continue;
      }
      await c.setTitle(s), r();
      continue;
    }
    if (i === "cancel") {
      await (await t()).cancelTurn(), r();
      continue;
    }
    if (i === "retry") {
      await (await t()).retryTurn(), r();
      continue;
    }
    if (i === "cancel-streaming") {
      await (await t()).cancelStreaming(), r();
      continue;
    }
    if (i === "clear-ephemeral") {
      (await t()).dismissEphemeralError(), r();
      continue;
    }
    if (i.startsWith("test-ephemeral ")) {
      let c = await t(),
        s = i.slice(15).trim();
      if (!s) {
        v0("Usage: test-ephemeral <message>");
        continue;
      }
      c.setTestEphemeralError?.(Error(s)), r();
      continue;
    }
    if (i.startsWith("test-retry ")) {
      let c = await t(),
        s = i.slice(11).trim().match(/^(\d+)\s+(.*)$/);
      if (!s) {
        v0("Usage: test-retry <seconds> <message>");
        continue;
      }
      let A = Number(s[1]),
        l = s[2] ?? "";
      if (!Number.isFinite(A) || A < 0 || !l) {
        v0("Usage: test-retry <seconds> <message>");
        continue;
      }
      let o = Date.now() + A * 1000,
        n = Math.max(0, Math.ceil((o - Date.now()) / 1000));
      c.setTestEphemeralError?.(Object.assign(Error(l), {
        retryCountdownSeconds: n
      })), r();
      continue;
    }
    if (i.startsWith("handoff ")) {
      let c = i.slice(8).trim();
      if (!c) {
        v0("Missing goal text for handoff");
        continue;
      }
      let s = R.getValue().currentThread;
      if (!s) {
        v0("No current thread for handoff");
        continue;
      }
      try {
        let A = await T.createHandoff(s.id, {
          goal: c,
          images: [],
          agentMode: s.agentMode,
          queuedMessages: void 0,
          signal: new AbortController().signal
        });
        v0("Handoff created, switching", {
          newThreadID: A
        }), await T.switchThread(A);
        let l = await xD0(R, A, 5000),
          o = R.getValue();
        v0("Switched to handoff thread", {
          expectedThreadID: A,
          didSwitch: l,
          currentThreadID: o.currentThreadID,
          draft: o.currentThread?.draft ? "present" : "none",
          messages: o.currentThread?.messages.length ?? 0
        });
      } catch (A) {
        v0(`Handoff failed: ${A}`);
      }
      r();
      continue;
    }
    if (i.startsWith("switch ")) {
      let c = i.slice(7).trim();
      if (!c) {
        v0("Missing thread ID for switch");
        continue;
      }
      if (!Vt(c)) {
        v0(`Invalid thread ID: ${c}`);
        continue;
      }
      await T.switchThread(c), r();
      continue;
    }
    if (i.startsWith("switch-recent ")) {
      let c = i.slice(14).trim(),
        s = Number(c);
      if (!Number.isFinite(s) || s < 0) {
        v0(`Invalid switch-recent index: ${c}`);
        continue;
      }
      let A = R.getValue().recentThreadIDs[s];
      if (!A) {
        v0(`No recent thread at index ${s}`);
        continue;
      }
      await T.switchThread(A), r();
      continue;
    }
    if (i === "back") {
      if (!T.canNavigateBack()) {
        v0("Cannot navigate back: no previous thread"), r();
        continue;
      }
      await T.navigateBack(), r();
      continue;
    }
    if (i === "forward") {
      if (!T.canNavigateForward()) {
        v0("Cannot navigate forward: no next thread"), r();
        continue;
      }
      await T.navigateForward(), r();
      continue;
    }
    if (i.startsWith("restore ")) {
      let c = await t(),
        s = i.slice(8).trim(),
        A = Number(s);
      if (!Number.isFinite(A) || A < 0) {
        v0(`Invalid restore index: ${s}`);
        continue;
      }
      await c.restoreTo(A), r();
      continue;
    }
    if (i.startsWith("visibility ")) {
      let c = await t(),
        s = i.slice(11).trim(),
        A = mD0(s);
      if (!A) {
        v0(`Invalid visibility: ${s}`);
        continue;
      }
      await c.setVisibility(A), r();
      continue;
    }
    if (i.startsWith("files-affected ")) {
      let c = await t(),
        s = i.slice(15).trim(),
        A = Number(s);
      if (!Number.isFinite(A) || A < 0) {
        v0(`Invalid files-affected index: ${s}`);
        continue;
      }
      let l = await c.getFilesAffectedByTruncation(A);
      J4("files-affected", {
        index: A,
        count: l.length,
        files: l
      }), r();
      continue;
    }
    if (i === "guidance-files") {
      let c = await t(),
        s = new AbortController(),
        A = await c.getGuidanceFiles(s.signal);
      J4("guidance-files", {
        count: A.length,
        files: A
      }), r();
      continue;
    }
    if (i === "clear-pending-navigation") {
      await (await t()).clearPendingNavigation(), r();
      continue;
    }
    if (i === "system-prompt-deps") {
      let c = {
        toolService: e.toolService,
        configService: e.configService,
        skillService: e.skillService,
        getThreadEnvironment: e.getThreadEnvironment,
        filesystem: e.fileSystem,
        threadService: e.threadService
      };
      J4("system-prompt-deps", {
        hasFilesystem: Boolean(c.filesystem),
        hasConfigService: Boolean(c.configService),
        hasThreadService: Boolean(c.threadService)
      }), r();
      continue;
    }
    if (i === "list-tools") {
      await EJT(e);
      continue;
    }
    if (i === "create-thread") {
      await T.createThread(), r();
      continue;
    }
    if (i === "wait" || i.startsWith("wait ")) {
      let c = i.slice(4).trim(),
        s = c ? Number(c) : 1000;
      if (!Number.isFinite(s) || s < 0) {
        v0(`Invalid wait duration: ${c || "1000"}`);
        continue;
      }
      await oD0(s), r();
      continue;
    }
    if (i === "drain" || i.startsWith("drain ")) {
      let c = i.slice(5).trim(),
        s = c ? Number(c) : 5000;
      if (!Number.isFinite(s) || s < 0) {
        v0(`Invalid drain timeout: ${c || "5000"}`);
        continue;
      }
      await PD0(R, s), r();
      continue;
    }
    if (i === "drain-until-complete" || i.startsWith("drain-until-complete ")) {
      let c = i.slice(20).trim(),
        s = c ? Number(c) : 120000;
      if (!Number.isFinite(s) || s < 0) {
        v0(`Invalid drain-until-complete timeout: ${c || "120000"}`);
        continue;
      }
      await kD0(R, s), r();
      continue;
    }
    v0(`Unknown command: ${i}`);
  }
}
class QWT {
  threadWorkers = new tET();
  async getOrCreateForThread(T, R) {
    let a = this.threadWorkers.get(R);
    if (!a) {
      if (a = new ov(T, R), this.threadWorkers.set(R, a), this.threadWorkers.size > 25) J.info("Many active thread workers detected", {
        name: "ThreadWorkerService.memoryCheck",
        threadID: R,
        totalWorkerCount: this.threadWorkers.size
      });
    }
    return sM.record(this.threadWorkers.size), a;
  }
  async createThreadWorker(T, R) {
    let a = await this.getOrCreateForThread(T, R);
    return await a.resume(), a;
  }
  async seedThreadMessages(T, R, a, e) {
    let t = await T.threadService.exclusiveSyncReadWriter(R),
      r = e ? a.map(c => c.role === "user" ? {
        ...c,
        agentMode: e
      } : c) : [...a],
      h = r.length > 0 ? Math.max(...r.map(c => c.messageId)) + 1 : 0,
      i = t.read();
    t.write({
      ...i,
      agentMode: e ?? i.agentMode,
      messages: r,
      nextMessageId: h,
      v: i.v + 1
    }), await t.asyncDispose();
  }
  async applyParentRelationship(T, R, a, e) {
    let t = Date.now(),
      {
        threadID: r,
        type: h,
        messageIndex: i,
        blockIndex: c,
        comment: s
      } = e;
    await R.handle({
      type: "relationship",
      relationship: {
        threadID: r,
        type: h,
        role: "child",
        messageIndex: i,
        blockIndex: c,
        createdAt: t,
        comment: s
      }
    });
    let A = {
        threadID: a,
        type: h,
        role: "parent",
        messageIndex: i,
        blockIndex: c,
        createdAt: t,
        comment: s
      },
      l = this.threadWorkers.get(r);
    if (l) await l.handle({
      type: "relationship",
      relationship: A
    });else {
      let o = await T.threadService.exclusiveSyncReadWriter(r);
      o.update(n => {
        if (!n.relationships) n.relationships = [];
        if (!n.relationships.some(p => p.threadID === A.threadID && p.type === A.type && p.role === A.role)) n.relationships.push(A);
      }), await o.asyncDispose();
    }
  }
  async inheritVisibilityIfNeeded(T, R, a) {
    if (R.type === "handoff") await O4R(T.threadService, R.threadID, a);
  }
  async sendInitialUserMessage(T, R) {
    let a = typeof R === "string" ? [{
      type: "text",
      text: R
    }] : [...R];
    await T.handle({
      type: "user:message",
      message: {
        content: a
      }
    });
  }
  async setDraftContent(T, R) {
    let a = typeof R === "string" ? R : [...R];
    await T.handle({
      type: "draft",
      content: a
    });
  }
  async setPendingNavigation(T, R) {
    let a = this.threadWorkers.get(T);
    if (a) await a.handle({
      type: "setPendingNavigation",
      threadID: R
    });
  }
  async transferQueuedMessages(T, R) {
    for (let a of R) await T.handle({
      type: "user:message-queue:enqueue",
      message: a.queuedMessage
    });
  }
  async createThread(T, R) {
    let a = R?.newThreadID ?? Eh(),
      e = R?.agentMode,
      t = !1;
    if (R?.seededMessages) await this.seedThreadMessages(T, a, R.seededMessages, e), t = !0;
    let r = await this.createThreadWorker(T, a);
    if (r.thread.messages.length > 0 && !t) return J.info("createThread called for existing thread, returning existing worker", {
      threadID: a,
      messageCount: r.thread.messages.length
    }), {
      threadID: a,
      worker: r
    };
    if (e && !t) await r.handle({
      type: "agent-mode",
      mode: e
    });
    if (R?.parent) await this.applyParentRelationship(T, r, a, R.parent), await this.inheritVisibilityIfNeeded(T, R.parent, a);
    if (R?.initialUserMessage) {
      if (t) throw Error("initialUserMessage cannot be set when seededMessages is provided");
      await this.sendInitialUserMessage(r, R.initialUserMessage);
    }
    if (R?.draftContent) {
      if (t) throw Error("draftContent cannot be set when seededMessages is provided");
      await this.setDraftContent(r, R.draftContent);
    }
    if (R?.navigate && R?.parent) await this.setPendingNavigation(R.parent.threadID, a);
    if (R?.queuedMessages) await this.transferQueuedMessages(r, R.queuedMessages);
    return {
      threadID: a,
      worker: r
    };
  }
  async handoff(T, R) {
    let a = await this.createThreadWorker(T, R.threadID),
      e = a.thread,
      t = R.images ?? [],
      r = R.signal ?? new AbortController().signal,
      {
        content: h
      } = await $4R({
        thread: e,
        goal: R.goal,
        images: t,
        deps: {
          configService: T.configService,
          buildSystemPromptDeps: R.buildSystemPromptDeps,
          signal: r,
          filesystem: R.filesystem,
          deadline: R.deadline
        }
      }),
      i = typeof h === "string" ? h : h.filter(A => A.type === "text" || A.type === "image"),
      c = {
        threadID: R.threadID,
        type: "handoff",
        messageIndex: R.messageIndex ?? (e.messages.length ? e.messages.length - 1 : void 0),
        blockIndex: R.blockIndex,
        comment: R.comment ?? R.goal
      },
      s = await this.createThread(T, {
        newThreadID: R.newThreadID,
        agentMode: R.agentMode ?? e.agentMode,
        parent: c,
        navigate: R.navigate,
        queuedMessages: R.queuedMessages ?? e.queuedMessages,
        initialUserMessage: R.mode === "initial" ? i : void 0,
        draftContent: R.mode === "draft" ? i : void 0
      });
    if (R.clearQueuedMessages && e.queuedMessages?.length) await a.handle({
      type: "user:message-queue:discard"
    });
    return s;
  }
  get workers() {
    return this.threadWorkers.observable;
  }
  get statuses() {
    return this.threadWorkers.observable.pipe(L9(T => T.size === 0 ? AR.of({}) : v3(...Array.from(T.values()).map(R => R.status.pipe(JR(a => [R.threadID, R.threadReadWriter ? f3T(R.thread, a) : void 0])))).pipe(JR(R => Object.fromEntries(R)))), KS(25), f3());
  }
  get(T) {
    return this.threadWorkers.get(T);
  }
  prettyPrintToolRun(T, R) {
    let a = this.threadWorkers.get(T);
    if (!a) throw Error(`No worker found for thread ${T}`);
    for (let e of a.thread.messages) for (let t of e.content) if (t.type === "tool_result" && t.toolUseID === R) return AIR(t.run);
    throw Error(`Tool run not found for thread ${T} and tool use ${R}`);
  }
  async cancelToolOnly(T, R) {
    await this.threadWorkers.get(T)?.cancelToolOnly(R);
  }
  async cancel(T) {
    await this.threadWorkers.get(T)?.cancel();
  }
  async dispose(T) {
    let R = this.threadWorkers.get(T);
    if (R) await R.cancel(), await R.asyncDispose(), this.threadWorkers.delete(T), sM.record(this.threadWorkers.size);
  }
  async retry(T) {
    let R = this.threadWorkers.get(T);
    if (!R) throw Error(`No active worker for thread ${T}`);
    await R.retry();
  }
  async revertFileChanges(T, R) {
    let a = this.threadWorkers.get(T);
    if (!a) throw Error(`No active worker for thread ${T}`);
    await a.revertFileChanges(R);
  }
  async getFilesAffectedByTruncation(T, R) {
    let a = this.threadWorkers.get(T);
    if (!a) throw Error(`No active worker for thread ${T}`);
    return a.getFilesAffectedByTruncation(R);
  }
  async cleanupThreadBackups(T, R) {
    let a = this.threadWorkers.get(R);
    if (a) await a.fs.tracker.cleanupBackups();else try {
      await new Im(T.osFileSystem).cleanup(R), J.debug(`Cleaned up backup files for thread ${R}`, {
        threadID: R
      });
    } catch (e) {
      J.error("Error cleaning up thread backups", e, {
        threadID: R
      });
    }
  }
  async disposeAll() {
    await Promise.all(Array.from(this.threadWorkers.values()).map(async T => await T.asyncDispose())), this.threadWorkers.clear(), sM.record(0);
  }
}
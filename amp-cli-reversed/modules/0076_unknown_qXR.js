function qXR(T) {
  let R = 0,
    a = async i => {
      let c = Date.now();
      if (c - R < 2000) return;
      if (R = c, e === !1) return;
      let s = !1;
      try {
        s = T.windowFocused ? await T.windowFocused() : !1;
      } catch (A) {
        J.debug("Could not determine window focus state:", A);
      }
      if (s && !WXR) return;
      await T.playNotificationSound(i);
    },
    e = !0,
    t = T.configService.config.subscribe(i => {
      e = i.settings["notifications.enabled"] ?? !0;
    }),
    r = new Map(),
    h = (T.threadViewStates$?.() ?? ct.statuses).subscribe(async i => {
      let c = !1,
        s = !1;
      for (let [A, l] of Object.entries(i)) {
        if (!l || l.state !== "active") {
          r.delete(A);
          continue;
        }
        try {
          if ((await T.threadService.getPrimitiveProperty(A, "mainThreadID")) && l.interactionState !== "user-tool-approval") continue;
        } catch (y) {
          J.debug("Failed to check thread for subagent status", {
            threadId: A,
            error: y
          });
        }
        let o = l.toolState?.running ?? (l.interactionState === "tool-running" ? 1 : 0),
          n = l.toolState?.blocked ?? (l.interactionState === "user-tool-approval" ? 1 : 0),
          p = l.interactionState === "user-message-reply" || l.interactionState === "user-message-initial",
          _ = !!l.ephemeralError,
          m = l.inferenceState === "idle" && o === 0 && n === 0 && (p || _),
          b = r.get(A) ?? {
            running: 0,
            blocked: 0,
            idle: !0
          };
        if (n > 0) {
          if (b.blocked === 0 || b.running > 0 && o === 0) c = !0;
        }
        if (!b.idle && m) s = !0;
        r.set(A, {
          running: o,
          blocked: n,
          idle: m
        });
      }
      if (c) await a("requires-user-input");else if (s) await a("idle");
    });
  return {
    unsubscribe() {
      h.unsubscribe(), t.unsubscribe(), r.clear();
    }
  };
}
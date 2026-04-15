function LBR(T, R) {
  try {
    return Nx.readFileSync(T, "utf-8").split(`
`).slice(0, R).join(`
`);
  } catch {
    return "";
  }
}
function MBR(T) {
  let R = /```(?:\w+)?\n([\s\S]*?)```/g,
    a = [],
    e;
  while ((e = R.exec(T)) !== null) if (e[1]) a.push(e[1].trim());
  if (a.length === 0) return [T.trim()];
  return a;
}
function CmT(T, R, a, e) {
  return new AR(t => {
    let r = !1,
      h = new AbortController();
    return (async () => {
      let i = h.signal,
        c = setTimeout(() => {
          J.warn("Handoff timeout reached", {
            mode: a,
            name: "handoff",
            threadID: R.thread.id,
            timeoutMs: oM
          }), h.abort(Error(`Handoff timed out after ${oM}ms`));
        }, oM);
      try {
        if (t.next({
          status: "in-progress"
        }), J.debug("Starting handoff", {
          mode: a,
          name: "handoff",
          threadID: R.thread.id,
          goal: T.goal
        }), r || i.aborted) {
          clearTimeout(c);
          return;
        }
        let s = await e(i);
        if (clearTimeout(c), r || i.aborted) return;
        J.info("Handoff thread created and running in background", {
          mode: a,
          name: "handoff",
          fromThreadID: R.thread.id,
          newThreadID: s,
          goal: T.goal
        }), t.next({
          status: "done",
          result: {
            newThreadID: s,
            message: `Created handoff thread ${s}. Work is now running in the background.`
          }
        }), t.complete();
      } catch (s) {
        if (clearTimeout(c), r) return;
        let A = i.aborted && i.reason instanceof Error,
          l = A ? i.reason.message : s instanceof Error ? s.message : "Failed to create handoff thread";
        J.error("Handoff failed", s, {
          mode: a,
          name: "handoff",
          threadID: R.thread.id,
          isTimeout: A
        }), t.next({
          status: "error",
          error: {
            message: l
          }
        }), t.complete();
      }
    })(), () => {
      r = !0, h.abort(Error("Handoff cancelled"));
    };
  });
}
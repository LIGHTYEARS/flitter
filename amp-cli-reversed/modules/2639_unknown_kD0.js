async function kD0(T, R) {
  return new Promise(a => {
    let e = !1,
      t = !1,
      r = null,
      h = null,
      i = c => {
        if (e) return;
        if (e = !0, r) clearTimeout(r);
        h?.unsubscribe(), a(c);
      };
    h = T.subscribe({
      next: c => {
        let s = c.threadState.viewState;
        if (s.state === "active" && s.inferenceState === "running") t = !0;
        if (t && s.interactionState === "user-message-reply") i(!0);
      }
    }), r = setTimeout(() => {
      v0(`drain-until-complete timed out after ${R}ms (sawInferenceRunning=${t})`), i(!1);
    }, R);
  });
}
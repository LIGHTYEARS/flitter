function EFR(T, R, a, e, t = "methodical") {
  return new AR(r => {
    let h = new wi(),
      i = qe["code-review"],
      c = i.model ? Xt(i.model) : void 0;
    if (!c) {
      r.error(Error("Code review subagent has no model defined"));
      return;
    }
    let s = {
        systemPrompt: $FR(a.dir?.fsPath ?? null),
        model: c,
        spec: i,
        retryOnRateLimit: !0
      },
      A = `Review the following diff: ${T}`;
    if (e?.trim()) A += `

Additional instructions from the user:
${e.trim()}`;
    let l = t === "quick" ? "LOW" : "HIGH",
      o = vzT(A),
      n = h.run($zT({
        thinkingConfig: {
          thinkingLevel: l
        }
      }), s, {
        conversation: o,
        toolService: R,
        env: a,
        followUps: [p => p.contents.push({
          role: "user",
          parts: [{
            text: vFR
          }]
        })]
      }).subscribe({
        next: p => r.next(p),
        error: p => r.error(p),
        complete: () => r.complete()
      });
    return () => {
      n.unsubscribe();
    };
  });
}
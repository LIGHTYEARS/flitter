function IFR(T, R, a, e, t) {
  let r = new wi(),
    h = yFR(T, R, a, t.dir?.fsPath ?? null),
    i = [{
      role: "user",
      content: `Run the "${T.name}" code review check.`
    }];
  return r.run(Fx, {
    systemPrompt: h,
    model: n8.CLAUDE_HAIKU_4_5.name,
    spec: qe["codereview-check"],
    retryOnRateLimit: !0
  }, {
    conversation: i,
    toolService: e,
    env: t
  });
}
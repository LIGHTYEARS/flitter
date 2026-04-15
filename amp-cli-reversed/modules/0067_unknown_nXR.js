async function nXR(T) {
  let {
      model: R,
      agentMode: a
    } = pn(T.config.settings, T.thread),
    e = Xt(R),
    t = R.indexOf("/"),
    r = t !== -1 ? R.slice(0, t) : "anthropic",
    {
      systemPrompt: h
    } = await LO({
      configService: T.configService,
      getThreadEnvironment: T.getThreadEnvironment,
      skillService: T.skillService,
      toolService: T.toolService,
      filesystem: T.filesystem,
      threadService: T.threadService
    }, T.thread, {
      enableTaskList: !1,
      enableTask: !1,
      enableOracle: !1,
      enableDiagnostics: !0,
      enableChart: !1
    }, {
      model: e,
      provider: r,
      agentMode: a
    });
  return h.map(i => i.text).join(`

`);
}
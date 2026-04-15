function eXR(T, R, a, e) {
  let t = [{
    role: "user",
    content: T
  }];
  return new wi().run(Fx, {
    systemPrompt: a,
    model: R,
    spec: qe["task-subagent"]
  }, {
    toolService: e.toolService,
    env: e,
    conversation: t
  });
}
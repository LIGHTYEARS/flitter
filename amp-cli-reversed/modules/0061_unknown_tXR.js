function tXR(T, R, a, e) {
  let t = [{
    role: "user",
    content: T
  }];
  return new wi().run(RXR(), {
    systemPrompt: a,
    model: R,
    spec: qe["task-subagent"]
  }, {
    toolService: e.toolService,
    env: e,
    conversation: t
  });
}
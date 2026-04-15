function b1R(T, R, a) {
  let e = p1R(T.systemPrompt),
    t;
  if (T.thread.messages.length > 0) t = _1R(T.thread, e);else t = [{
    role: "system",
    content: e
  }, {
    type: "message",
    role: "user",
    content: "x"
  }];
  let r = [{
      role: "system",
      content: e
    }, {
      type: "message",
      role: "user",
      content: "x"
    }],
    h = sFT(T.tools);
  return {
    client: R,
    model: a,
    systemPromptContent: e,
    fullInput: t,
    systemOnlyInput: r,
    tools: h
  };
}
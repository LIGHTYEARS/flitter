function zO(T) {
  return e1R(T);
}
function n1R(T) {
  return Math.ceil(T.length / o1R);
}
function l1R(T, R, a, e) {
  let t = T.thread.messages.length > 0 ? k8T(T.thread) : [{
    role: "user",
    content: "x"
  }];
  while (t.length > 0 && t.at(-1)?.role === "assistant") t = t.slice(0, -1);
  t = f8T(t);
  let r = kO(T.tools);
  return {
    client: R,
    model: a,
    headers: e,
    systemPrompt: T.systemPrompt,
    messages: t,
    tools: r,
    toolSpecs: T.tools
  };
}
function E4R(T) {
  let R = T.messages.at(-1);
  if (!R || R.role === "assistant") return {
    running: 0,
    blocked: 0
  };
  let a = 0,
    e = 0;
  for (let t of R.content) {
    if (t.type !== "tool_result") continue;
    let r = t.run.status;
    if (r === "in-progress") a++;else if (r === "blocked-on-user") e++;
  }
  return {
    running: a,
    blocked: e
  };
}
async function g5R(T, R, a, e) {
  let t = _5R(e.toolService, R.toolPatterns || ["*"], a),
    r = R.model || "inherit";
  if (r === "inherit") {
    let c = e.agentMode || e.thread?.agentMode || "smart";
    r = nk(c);
  }
  let h = r.toLowerCase().includes("claude") || r === "inherit" ? Fx : n5R,
    i = R.systemPrompt;
  if (R.skills && R.skillDefs) {
    let c = R.skills.map(s => R.skillDefs[s]).filter(s => !!s);
    if (c.length > 0) i += `

# Available Skills

${c.join(`

`)}`;
  }
  return new wi().run(h, {
    systemPrompt: i,
    model: r
  }, {
    conversation: [{
      role: "user",
      content: T
    }],
    toolService: t,
    env: e
  });
}
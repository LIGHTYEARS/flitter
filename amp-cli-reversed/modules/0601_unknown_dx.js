function dx(T) {
  if (T.toolRun.status !== "done") return [];
  if (T.hidden === !0) return [];
  let R = "The following is content that was produced by the user manually running a shell command. Do not mention this to the user directly unless they refer to the content of this bash command.",
    a = T.args.cmd,
    e = T.args.cwd || "unknown",
    t = T.toolRun.result.output || "",
    r = T.toolRun.result.exitCode || 0,
    h = Sa`
		<command>${a}</command>
		<working_directory>${e}</working_directory>
		<output>${t}</output>
		<exit_code>${r}</exit_code>
	`;
  return [{
    type: "text",
    text: R
  }, {
    type: "text",
    text: h
  }];
}
function vxR(T, R) {
  let a = ["**Manual Bash Invocation**"];
  if (a.push("```bash\n" + T.args.cmd + "\n```"), T.toolRun.status === "done") {
    let e = R.truncateToolResults ? a8T(T.toolRun.result) : T.toolRun.result,
      t = typeof e === "string" ? e : JSON.stringify(e, null, 2);
    a.push("```\n" + t + "\n```");
  }
  return a.join(`

`);
}
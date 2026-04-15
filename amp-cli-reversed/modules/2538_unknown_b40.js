function b40(T) {
  let R = Object.entries(T);
  if (R.length === 0) return "No checks were run.";
  let a = [];
  for (let [e, t] of R) {
    if (t.status === "done") {
      let i = t.result.issues.length,
        c = i === 1 ? "issue" : "issues",
        s = i === 0 ? oR.green("ok") : oR.yellow("issues found");
      a.push(`- ${t.result.check.name}: ${s} (${i} ${c})`);
      continue;
    }
    let r = new URL(e).pathname,
      h = rA.basename(r, rA.extname(r));
    if (t.status === "error") {
      a.push(`- ${h}: ${oR.red("error")} (${t.error})`);
      continue;
    }
    a.push(`- ${h}: ${oR.dim("running")} (${t.message})`);
  }
  return a.join(`
`);
}
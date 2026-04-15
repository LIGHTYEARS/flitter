function fxR(T, R) {
  let a = [];
  if (T.run.status === "done") {
    a.push(`**Tool Result:** \`${T.toolUseID}\``);
    let e = IxR(T.run.result, R),
      t = typeof e === "string" ? e : JSON.stringify(e, null, 2);
    a.push("```\n" + t + "\n```");
  } else if (T.run.status === "error") {
    a.push(`**Tool Error:** \`${T.toolUseID}\``);
    let e = JSON.stringify(T.run.error),
      t = typeof T.run.error === "string" ? T.run.error : e ?? "Unknown error",
      r = R.truncateToolResults ? nA(t) : t;
    a.push(`**Error:** ${r}`);
  } else if (T.run.status === "cancelled") a.push(`**Tool Cancelled:** \`${T.toolUseID}\``);else if (T.run.status === "in-progress") a.push(`**Tool In Progress:** \`${T.toolUseID}\``);else a.push(`**Tool:** \`${T.toolUseID}\` (${T.run.status})`);
  return a.join(`

`);
}
function gxR(T) {
  if (T.summary.type === "message") return `**Summary:**

${T.summary.summary}`;
  return `**Summary Thread:** ${T.summary.thread}`;
}
function $xR(T) {
  let R = ["## Todos"];
  if (typeof T === "string") R.push(T);else for (let a of T) {
    let e = a.status === "completed" ? "[x]" : a.status === "in-progress" ? "[~]" : "[ ]",
      t = a.status === "in-progress" ? " (in progress)" : "";
    R.push(`- ${e} ${a.content}${t}`);
  }
  return R.join(`
`);
}
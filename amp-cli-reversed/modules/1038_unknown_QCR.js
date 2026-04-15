function QCR(T) {
  return T.map(R => {
    let a = [];
    if (R.message) a.push(R.message);
    if (R.tool_uses?.length) for (let e of R.tool_uses) {
      let t = e.status === "done" ? ZCR(e.result) : `(${e.status})`;
      a.push(`- ${e.tool_name}: ${t}`);
    }
    return a.join(`
`);
  }).join(`

`);
}
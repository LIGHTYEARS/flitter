function nD0(T) {
  let R = new Map();
  for (let a of T.messages) {
    if (a.role !== "user") continue;
    for (let e of a.content) {
      if (e.type !== "tool_result") continue;
      if (!("progress" in e.run)) continue;
      let t = e.run.progress;
      if (typeof t === "string") {
        R.set(e.toolUseID, {
          status: e.run.status,
          content: t
        });
        continue;
      }
      if (t && typeof t === "object" && "output" in t && typeof t.output === "string") R.set(e.toolUseID, {
        status: e.run.status,
        content: t.output
      });
    }
  }
  return R;
}
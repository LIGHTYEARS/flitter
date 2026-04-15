function zW0(T, R) {
  let a = T.toolResult.run,
    e = [];
  if ("progress" in a && Array.isArray(a.progress)) {
    let r = a.progress.flatMap(h => h.tool_uses ?? []);
    for (let h of r) e.push({
      name: h.tool_name,
      detail: FW0(h.tool_name, h.input),
      status: h.status
    });
  }
  let t = "result" in a && typeof a.result === "object" && a.result !== null ? a.result : void 0;
  if (t?.checks) for (let [r, h] of Object.entries(t.checks)) {
    let i = r.replace(/.*\//, "").replace(/\.md$/i, ""),
      c = h.status === "done" || h.status === "error" ? h.status : "in-progress";
    e.push({
      name: `Check: ${i}`,
      status: c
    });
  }
  return {
    type: "code-review",
    id: T.id,
    sourceIndex: R,
    status: a.status,
    subTools: e.length > 0 ? e : void 0
  };
}
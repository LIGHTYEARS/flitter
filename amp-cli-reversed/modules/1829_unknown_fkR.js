function fkR(T) {
  let R = new Set();
  for (let a of T.messages) if (a.role === "assistant") {
    for (let e of a.content) if (e.type === "tool_use") {
      let t = e.name === y8 || e.name === mET,
        r = e.name === Wt;
      if (t || r) {
        let h = cN(T, e.id);
        if (h && h.run.status === "done") {
          let i = h.run.result;
          if (typeof i === "object" && i !== null && "discoveredGuidanceFiles" in i && Array.isArray(i.discoveredGuidanceFiles) && i.discoveredGuidanceFiles.length > 0) for (let c of i.discoveredGuidanceFiles) R.add(c.uri);
        }
      }
    }
  } else if (a.role === "user" && a.discoveredGuidanceFiles) for (let e of a.discoveredGuidanceFiles) R.add(e.uri);
  return R;
}
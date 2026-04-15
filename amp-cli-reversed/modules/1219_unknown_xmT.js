function xmT(T, R, a, e) {
  let t = cM.get(T);
  if (!t) {
    J.debug("System prompt build complete (first build)", {
      threadId: T,
      ...e
    }), cM.set(T, R);
    return;
  }
  let r = {},
    h = {},
    i = new Set([...Object.keys(t), ...Object.keys(R)]);
  for (let c of i) {
    let s = t[c],
      A = R[c];
    if (s !== A) {
      if (r[c] = {
        old: s ?? "missing",
        new: A ?? "missing"
      }, c === "basePrompt") h[c] = a.basePrompt;else if (c === "tools") h[c] = a.tools.map(l => l.name);else if (c.startsWith("contextBlock_")) {
        let l = c.split("_")[1];
        if (l) {
          let o = Number.parseInt(l, 10);
          h[c] = a.contextComponents[o]?.text;
        }
      } else if (c.startsWith("additionalBlock_")) {
        let l = c.split("_")[1];
        if (l) {
          let o = Number.parseInt(l, 10);
          h[c] = a.additionalComponents[o]?.text;
        }
      } else if (c.startsWith("finalBlock_")) {
        let l = c.split("_")[1];
        if (l) {
          let o = Number.parseInt(l, 10);
          h[c] = a.finalBlocks[o]?.text;
        }
      }
    }
  }
  if (Object.keys(r).length > 0) {
    let c = Object.keys(r);
    J.debug("System prompt build complete (CHANGES DETECTED)", {
      threadId: T,
      ...e,
      changedKeys: c,
      changedValues: h
    }), cM.set(T, R);
  } else J.debug("System prompt build complete (no changes)", {
    threadId: T
  });
}
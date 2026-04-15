async function VVR(T, R, a) {
  let e = Date.now();
  try {
    let t = await a.exclusiveSyncReadWriter(T);
    t.update(h => {
      if (h.v++, h.relationships ??= [], !h.relationships.some(i => i.threadID === R && i.type === "mention" && i.role === "child")) h.relationships.push({
        threadID: R,
        type: "mention",
        role: "child",
        createdAt: e
      });
    }), await t.asyncDispose();
    let r = await a.exclusiveSyncReadWriter(R);
    r.update(h => {
      if (h.v++, h.relationships ??= [], !h.relationships.some(i => i.threadID === T && i.type === "mention" && i.role === "parent")) h.relationships.push({
        threadID: T,
        type: "mention",
        role: "parent",
        createdAt: e
      });
    }), await r.asyncDispose();
  } catch (t) {
    J.warn("Failed to create mention relationship", {
      currentThreadID: T,
      mentionedThreadID: R,
      error: t
    });
  }
}
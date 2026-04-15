async function O4R(T, R, a) {
  try {
    let e = (await T.get(R))?.meta;
    if (!e || typeof e !== "object") {
      J.debug("Origin thread has no metadata to inherit", {
        name: "inheritThreadVisibility",
        originThreadID: R,
        forkedThreadID: a
      });
      return;
    }
    let t = "visibility" in e ? e.visibility : void 0;
    if (t !== "private" && t !== "thread_workspace_shared" && t !== "public_unlisted" && t !== "public_discoverable") {
      J.debug("Origin thread has no shareable visibility metadata", {
        name: "inheritThreadVisibility",
        originThreadID: R,
        forkedThreadID: a,
        metadata: e
      });
      return;
    }
    let r = "sharedGroupIDs" in e && Array.isArray(e.sharedGroupIDs) ? e.sharedGroupIDs.filter(i => typeof i === "string") : [],
      h = t === "private" ? {
        visibility: t,
        sharedGroupIDs: r
      } : {
        visibility: t
      };
    await T.updateThreadMeta(a, h), J.debug("Successfully inherited thread visibility", {
      name: "inheritThreadVisibility",
      originThreadID: R,
      forkedThreadID: a,
      metadata: e
    });
  } catch (e) {
    J.debug("Failed to inherit thread visibility settings", {
      name: "inheritThreadVisibility",
      error: e,
      originThreadID: R,
      forkedThreadID: a
    });
  }
}
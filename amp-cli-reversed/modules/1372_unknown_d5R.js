function O5R(T) {
  return T.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "tool";
}
async function d5R(T, R, a, e) {
  try {
    let t = await R.readdir(T),
      r = t.filter(i => !i.isDirectory && !i.uri.fsPath.endsWith(".md"));
    if (r.length > duT) throw Error(`Toolbox size exceeded (found ${t.length}, limit: ${duT})`);
    let h = C5R(a);
    await Promise.all(r.map(async i => {
      let c = i.uri.fsPath.split("/").pop() || "unknown",
        s = await h(i.uri);
      e(c, s);
    }));
  } catch (t) {
    J.debug("Failed to collect tools with progress", {
      in: T.toString(),
      error: t.message
    });
  }
}
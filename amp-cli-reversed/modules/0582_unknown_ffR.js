function ffR(T, R, a) {
  let e = T ?? new xh(),
    t = R ?? [],
    r = a ?? new xh();
  if (e.size === 0 && t.length === 0) return;
  let h = [];
  for (let [i, c] of r.entries()) if (e.has(i)) {
    let s = {
      type: "image",
      source: {
        type: "base64",
        mediaType: c.mimeType,
        data: e.get(i) || ""
      },
      sourcePath: i.scheme === "file" ? i.fsPath : i.toString()
    };
    h.push(s);
  }
  return {
    files: Array.from(e.entries()).map(([i, c]) => ({
      uri: d0(i),
      content: c,
      isImage: r.has(i),
      imageInfo: r.get(i)
    })),
    mentions: t,
    imageBlocks: h.length > 0 ? h : void 0
  };
}
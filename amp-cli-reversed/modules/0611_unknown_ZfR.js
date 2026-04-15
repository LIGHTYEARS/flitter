function ZfR(T, R) {
  let a = Ur(R?.logger),
    e = T.fileMentions && T.fileMentions.files.length > 0 ? {
      type: "text",
      text: $m(T.fileMentions)
    } : null,
    t = T.userState ? {
      type: "text",
      text: Ox(T.userState)
    } : null,
    r = [],
    h = [],
    i = [];
  for (let s of T.content) if (s.type === "tool_result") {
    if (s.run?.status === "done") {
      let l = s.run.result;
      if (typeof l === "object" && l !== null && "discoveredGuidanceFiles" in l && Array.isArray(l.discoveredGuidanceFiles)) i.push(...l.discoveredGuidanceFiles);
    }
    let A = o7(s.toolUseID, s.run, {
      stripGuidanceFiles: !0,
      logger: R?.logger
    });
    if (A) r.push(A);
  } else if (s.type === "image") {
    if (h.push({
      type: "text",
      text: PO(s)
    }), s.source.type === "base64" && "mediaType" in s.source && "data" in s.source) {
      if (!s.source.data || s.source.data.length === 0) {
        a.warn("Skipping empty image block in message");
        continue;
      }
      h.push({
        type: "image",
        source: {
          type: "base64",
          media_type: s.source.mediaType,
          data: s.source.data
        }
      });
    } else if (s.source.type === "url" && "url" in s.source && typeof s.source.url === "string") h.push({
      type: "image",
      source: {
        type: "url",
        url: s.source.url
      }
    });else throw Error(`(bug) unexpected image block: ${JSON.stringify(s).slice(0, 25)}...`);
  } else if (s.type === "text") {
    if (s.text.trim().length > 0) h.push(s);
  }
  if (T.discoveredGuidanceFiles) i.push(...T.discoveredGuidanceFiles);
  let c = i.length > 0 ? {
    type: "text",
    text: Z9T(i, R?.agentMode ?? "default")
  } : null;
  return [...r, e, t, c, ...h].filter(s => s !== null);
}
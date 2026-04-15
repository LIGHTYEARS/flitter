async function UwR(T, {
  configService: R,
  filesystem: a
}) {
  let e = {
      sentAt: Date.now()
    },
    t = kr(T.content),
    {
      paths: r
    } = GWT(t),
    h = await m0(R.workspaceRoot);
  if (!h) return {
    message: {
      role: "user",
      messageId: 0,
      content: T.content,
      source: T.source,
      fileMentions: void 0,
      userState: void 0,
      agentMode: T.agentMode,
      meta: e
    }
  };
  let i = await uwT({
      fileSystem: a
    }, r, {
      searchPaths: [h],
      shouldIncludeImages: !T.agentMode || TCT(T.agentMode)
    }),
    c;
  if (i?.files && i.files.length > 0) {
    let A = new Set(),
      l = [];
    for (let o of i.files) {
      let n = I8(o.uri),
        p = await fm(a, n, h, null, A, void 0);
      for (let _ of p) {
        if (!l.some(m => m.uri === _.uri)) l.push(_);
        A.add(_.uri);
      }
    }
    if (l.length > 0) c = l;
  }
  let s = await KWT();
  return {
    message: {
      role: "user",
      messageId: 0,
      content: i?.imageBlocks?.length ? [...T.content, ...i.imageBlocks] : T.content,
      source: T.source,
      fileMentions: i,
      userState: {
        ...(s ?? c7)
      },
      agentMode: T.agentMode,
      discoveredGuidanceFiles: c,
      meta: e
    }
  };
}
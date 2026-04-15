async function fp0(T, R, a, e, t) {
  let r = (await _O({
      filesystem: R,
      configService: a,
      threadService: {
        observe: () => AR.of({
          id: Eh(),
          created: Date.now(),
          v: 0,
          messages: [],
          env: {
            initial: e
          }
        })
      }
    }, {
      messages: [],
      env: {
        initial: e
      }
    })).map(s => ({
      uri: s.uri,
      content: s.content,
      lineCount: s.content.split(`
`).length
    })),
    h = crypto.randomUUID(),
    i = a.userConfigDir ? d0(a.userConfigDir) : void 0;
  if (r.length === 0) {
    t?.("SEND", {
      type: "executor_guidance_snapshot",
      snapshotId: h,
      fileCount: 0,
      isLast: !0
    }), T.sendExecutorGuidanceSnapshot({
      snapshotId: h,
      files: [],
      isLast: !0,
      userConfigDir: i
    });
    return;
  }
  let c = bp0(r, h, i);
  for (let s = 0; s < c.length; s++) {
    let A = c[s];
    if (!A) continue;
    let l = s === c.length - 1;
    t?.("SEND", {
      type: "executor_guidance_snapshot",
      snapshotId: h,
      fileCount: A.length,
      isLast: l
    }), T.sendExecutorGuidanceSnapshot({
      snapshotId: h,
      files: A,
      isLast: l,
      userConfigDir: i
    });
  }
}
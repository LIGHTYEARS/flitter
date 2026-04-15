function mAT(T, R, a) {
  return (e, t) => {
    let r = xmR({
      readFileFn: async (h, i) => t.filesystem.readFile(h, {
        signal: i
      }),
      readBinaryFileFn: (h, i) => t.filesystem.readBinaryFile(h, {
        signal: i
      }),
      maxFileSizeBytes: T,
      maxLines: R,
      maxLineBytes: a
    });
    return Q9(async h => {
      let i = await r(e, t, h);
      if (i.status === "done" && typeof i.result === "object") {
        let c = zR.file(i.result.absolutePath),
          s = await fm(t.filesystem, c, t.dir, t.thread, t.discoveredGuidanceFileURIs, h);
        if (s.length > 0) return {
          ...i,
          result: {
            ...i.result,
            discoveredGuidanceFiles: s
          }
        };
      }
      return i;
    });
  };
}
function GH0(T, R) {
  return new Promise((a, e) => {
    MH0(T, {
      lazyEntries: !0
    }, (t, r) => {
      if (t) return e(t);
      if (!r) return e(Error("Failed to open ZIP file"));
      r.readEntry(), r.on("entry", h => {
        if (h.fileName.startsWith("amp-jetbrains-plugin/lib/")) r.openReadStream(h, async (i, c) => {
          if (i) return e(i);
          if (!c) return e(Error("Failed to open read stream"));
          let s = Hv.basename(h.fileName),
            A = Hv.join(R, s);
          await OH0(c, IH0(A)), r.readEntry();
        });else r.readEntry();
      }), r.on("end", a), r.on("error", e);
    });
  });
}
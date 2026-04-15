function o40(T) {
  let R = i3(T, "summary") ?? T.replace(/<[^>]*>/g, "").trim(),
    a = i3(T, "fileOrder") || "",
    e = Lk(a, "file").map(t => ({
      filename: i3(t, "filename") || "",
      fileSummary: i3(t, "fileSummary") || ""
    })).filter(t => t.filename.length > 0);
  return s40.parse({
    summary: R,
    fileOrder: e
  });
}
function XDT(T) {
  let R = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/,
    a = T.match(R);
  if (!a) return {
    frontMatter: null,
    content: T.trim()
  };
  let [, e, t] = a,
    r = null;
  try {
    let h = QDT.default.parse(e?.trim() ?? "");
    if (h && typeof h === "object") r = {
      ...h,
      globs: Array.isArray(h.globs) ? h.globs : h.globs && typeof h.globs === "string" ? [h.globs] : void 0
    };
  } catch (h) {
    return J.error("Invalid YAML front matter in guidance file", {
      error: h
    }), {
      frontMatter: null,
      content: T.trim()
    };
  }
  return {
    frontMatter: r,
    content: (t ?? "").trim()
  };
}
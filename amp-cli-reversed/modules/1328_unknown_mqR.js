function mqR(T) {
  let R = T.replace(/^\uFEFF/, "").match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!R?.[1]) return null;
  try {
    return {
      frontmatter: wX.default.parse(R[1])
    };
  } catch {
    return null;
  }
}
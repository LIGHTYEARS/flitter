function vzT(T) {
  return {
    contents: [{
      role: "user",
      parts: [{
        text: T
      }]
    }]
  };
}
function AFR(T) {
  let R = T.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!R) return {
    frontmatter: null,
    body: T
  };
  let a = R[1],
    e = R[2];
  if (a === void 0 || e === void 0) return {
    frontmatter: null,
    body: T
  };
  try {
    let t = sFR.default.parse(a);
    return {
      frontmatter: {
        name: typeof t.name === "string" ? t.name : "unknown",
        description: typeof t.description === "string" ? t.description : void 0,
        "severity-default": t["severity-default"],
        tools: Array.isArray(t.tools) ? t.tools.filter(r => typeof r === "string") : void 0
      },
      body: e
    };
  } catch (t) {
    return J.error("Failed to parse codereview file frontmatter", {
      error: t
    }), {
      frontmatter: null,
      body: T
    };
  }
}
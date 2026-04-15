function k7T(T) {
  if (T.length === 0) return null;
  let R = T.filter(a => !a.frontmatter["disable-model-invocation"]).map(a => {
    let e = a.frontmatter["argument-hint"] ? ` ${a.frontmatter["argument-hint"]}` : "";
    return `- **${a.name}**${e}: ${a.description}`;
  }).join(`
`);
  if (!R) return null;
  return R;
}
function n7T(T) {
  let R = T.replace(/^\uFEFF/, "").match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (!R || !R[1]) throw new _b("Missing YAML frontmatter", `Add frontmatter at the top of SKILL.md:
---
name: my-skill
description: Your skill description
---`);
  let a = l7T.default.parse(R[1]);
  if (!a.name || !a.description) throw new _b("Missing required fields in frontmatter", 'Add both "name" and "description" fields to the frontmatter');
  return wkR(a.name), {
    frontmatter: a,
    body: R[2] ?? ""
  };
}
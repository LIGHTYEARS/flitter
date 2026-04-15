function DkR(T) {
  return [t7T, i7T, c7T, h7T, r7T];
}
function wkR(T) {
  if (!T) throw new _b("Invalid skill name", "Skill name is required");
  if (T.length > Db) throw new _b("Invalid skill name", `Frontmatter name "${T}" must be ${Db} characters or less`);
  if (!Nj.test(T)) throw new _b("Invalid skill name", `Frontmatter name "${T}" is invalid. Skill name must be lowercase alphanumeric with hyphens, no trailing hyphen (e.g., "my-skill")`);
}
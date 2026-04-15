function vqR(T) {
  if (!T) throw new Ac("Invalid skill name", "Skill name is required");
  if (T.length > Db) throw new Ac("Invalid skill name", `Frontmatter name "${T}" must be ${Db} characters or less`);
  if (!Nj.test(T)) throw new Ac("Invalid skill name", `Frontmatter name "${T}" is invalid. Skill name must be lowercase alphanumeric with hyphens, no trailing hyphen (e.g., "my-skill")`);
}
function I40(T) {
  if (T.length <= EIT) return T;
  return T.slice(0, EIT - 1) + "\u2026";
}
function g40(T, R) {
  let a = T.command("skill").alias("skills").description("Manage skills from GitHub or local sources").action(() => {
    a.help();
  });
  if (a.command("add").argument("<source>", "Skill source (@user/skill, owner/repo, git URL, or local path)").option("--target <dir>", "Target directory for skills").option("--global", "Install to global skills directory (~/.config/agents/skills/)").option("--overwrite", "Overwrite existing skill with the same name").option("--name <name>", "Install with a custom local name").description("Install skills from a source").action(async (e, t, r) => {
    if (!R) _y.write(oR.red("This command requires authentication. Run `amp auth login` first.\n")), process.exit(1);
    let h = await R(r);
    try {
      let i = t.global ? LqR() : t.target;
      W8.write(oR.dim(`Installing skills from ${e}...
`));
      let c = await h.skillService.install(e, i, {
        overwrite: t.overwrite,
        name: t.name
      });
      if (c.length === 0) _y.write(oR.red(`No skills found in the source.
`)), process.exit(1);
      let s = !1;
      for (let A of c) if (A.success) W8.write(oR.green("\u2713 ") + `Installed ${oR.bold(A.skillName)}
`), W8.write(oR.dim(`  \u2192 ${A.installedPath}
`));else s = !0, _y.write(oR.red("\u2717 ") + `Failed to install ${A.skillName}: ${A.error}
`);
      if (s) process.exit(1);
    } catch (i) {
      _y.write(oR.red(`Error: ${i instanceof Error ? i.message : String(i)}
`)), process.exit(1);
    } finally {
      await h.asyncDispose(), process.exit(0);
    }
  }), R) a.command("list").alias("ls").option("--json", "Output as JSON").description("List all available skills").action(async (e, t) => {
    let r = await R(t);
    try {
      let h = await r.skillService.getSkills(),
        i = await r.skillService.getSkillErrors();
      if (e.json) {
        let c = {
          skills: h.map(s => ({
            name: s.name,
            description: s.description,
            baseDir: s.baseDir
          })),
          errors: i.map(s => ({
            path: s.path,
            error: s.error,
            hint: s.hint
          }))
        };
        W8.write(JSON.stringify(c, null, 2) + `
`);
        return;
      }
      if (h.length === 0 && i.length === 0) {
        W8.write(oR.dim(`No skills available.
`)), W8.write(oR.dim(`
Skills can be added to:
`)), W8.write(oR.dim(`  \u2022 .agents/skills/ (workspace)
`)), W8.write(oR.dim(`  \u2022 ~/.config/agents/skills/ (global)
`)), W8.write(oR.dim(`
Or install from GitHub: amp skill add <owner/repo>
`));
        return;
      }
      if (h.length > 0) {
        W8.write(oR.bold(`Available skills (${h.length}):

`));
        for (let c of h) W8.write(`  ${oR.green("\u2022")} ${oR.bold(c.name)}
`), W8.write(`    ${oR.dim(I40(c.description))}
`), W8.write(`    ${oR.dim(c.baseDir)}

`);
      }
      if (i.length > 0) {
        if (h.length > 0) W8.write(`
`);
        W8.write(oR.yellow(`Skipped skills with errors (${i.length}):

`));
        for (let c of i) {
          let s = c.path.split("/"),
            A = s[s.length - 2] || "unknown";
          if (W8.write(`  ${oR.yellow("\u26A0")} ${oR.yellow(A)}
`), W8.write(`    ${oR.red(c.error)}
`), c.hint) W8.write(`    ${oR.dim(c.hint.split(`
`).join(`
    `))}
`);
          W8.write(`    ${oR.dim(c.path)}

`);
        }
      }
    } finally {
      await r.asyncDispose(), process.exit(0);
    }
  }), a.command("remove").alias("rm").argument("<name>", "Name of the skill to remove (skill-name or @user/skill-name)").option("--target <dir>", "Target directory for skills").description("Remove an installed skill").action(async (e, t, r) => {
    let h = await R(r);
    try {
      if (await h.skillService.remove(e, t.target)) W8.write(oR.green("\u2713 ") + `Removed ${oR.bold(e)}
`);else _y.write(oR.red(`Skill "${e}" not found.
`)), process.exit(1);
    } finally {
      await h.asyncDispose(), process.exit(0);
    }
  }), a.command("info").argument("<name>", "Name of the skill").option("--json", "Output as JSON").description("Show information about a skill").action(async (e, t, r) => {
    let h = await R(r);
    try {
      let i = await h.skillService.getSkill(e);
      if (!i) _y.write(oR.red(`Skill "${e}" not found.
`)), process.exit(1);
      let c = i.frontmatter.metadata?.version;
      if (t.json) W8.write(JSON.stringify({
        name: i.name,
        description: i.description,
        version: c,
        license: i.frontmatter.license,
        compatibility: i.frontmatter.compatibility,
        metadata: i.frontmatter.metadata,
        path: i.baseDir
      }, null, 2) + `
`);else {
        if (W8.write(oR.bold(`Skill: ${i.name}
`)), i.description) W8.write(`Description: ${i.description}
`);
        if (c) W8.write(`Version: ${c}
`);
        if (i.frontmatter.license) W8.write(`License: ${i.frontmatter.license}
`);
        if (i.frontmatter.compatibility) W8.write(`Compatibility: ${i.frontmatter.compatibility}
`);
        if (i.frontmatter.metadata && Object.keys(i.frontmatter.metadata).length > 0) {
          W8.write(`Metadata:
`);
          for (let [s, A] of Object.entries(i.frontmatter.metadata)) W8.write(`  ${s}: ${A}
`);
        }
        W8.write(`Path: ${i.baseDir}
`);
      }
    } finally {
      await h.asyncDispose(), process.exit(0);
    }
  });
  return a;
}
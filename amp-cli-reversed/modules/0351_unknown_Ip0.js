async function Ip0(T, R, a) {
  let e = await R.getSkills(),
    t = crypto.randomUUID(),
    r = 20,
    h = e.map(i => ({
      name: i.name,
      description: i.description,
      baseDir: i.baseDir,
      frontmatter: i.frontmatter,
      files: i.files
    }));
  if (h.length === 0) {
    a?.("SEND", {
      type: "executor_skill_snapshot",
      snapshotId: t,
      skillCount: 0,
      isLast: !0
    }), T.sendExecutorSkillSnapshot({
      snapshotId: t,
      skills: [],
      isLast: !0
    });
    return;
  }
  for (let i = 0; i < h.length; i += 20) {
    let c = h.slice(i, i + 20),
      s = i + 20 >= h.length;
    a?.("SEND", {
      type: "executor_skill_snapshot",
      snapshotId: t,
      skillCount: c.length,
      isLast: s
    }), T.sendExecutorSkillSnapshot({
      snapshotId: t,
      skills: c,
      isLast: s
    });
  }
}
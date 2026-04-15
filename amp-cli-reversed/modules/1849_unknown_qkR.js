function qkR(T) {
  let R = T.filter(e => !e.frontmatter["disable-model-invocation"]);
  if (R.length === 0) return null;
  let a = R.map(e => {
    return ["  <skill>", `    <name>${e.name}</name>`, `    <description>${e.description}</description>`, `    <location>${e.baseDir}/SKILL.md</location>`, "  </skill>"].join(`
`);
  }).join(`
`);
  return ["## Skills", "In your workspace you have skills the user created. A **skill** is a guide for proven techniques, patterns, or tools. If a skill exists for a task, you must do it. The following skills provide specialized instructions for specific tasks.", `Use the ${oc} tool to load a skill when the task matches its description.`, "", 'Loaded skills appear as `<loaded_skill name="...">` in the conversation.', "", "<available_skills>", a, "</available_skills>"].join(`
`);
}
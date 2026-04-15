function f7R(T) {
  return "error" in T;
}
async function I7R(T, R, a, e, t) {
  let r = await T.getSkills(),
    h = r.find(A => A.name === R);
  if (!h) {
    let A = r.map(l => l.name).join(", ");
    return {
      error: `Skill "${R}" not found. Available skills: ${A || "none"}`
    };
  }
  let i = h.content;
  if (a !== void 0) {
    if (i.includes("{{arguments}}")) i = i.replace(/\{\{arguments\}\}/g, a);else if (a) i += `

ARGUMENTS: ${a}`;
  }
  let c = t?.agentMode === "deep",
    s = c ? ["<skill>", `<name>${h.name}</name>`, `<path>${h.baseDir}/SKILL.md</path>`, i] : [`<loaded_skill name="${h.name}">`, `# ${h.frontmatter.name} Skill`, "", i, "", `Base directory for this skill: ${h.baseDir}`, "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory."];
  if (h.files && h.files.length > 0) {
    s.push(""), s.push("<skill_files>");
    for (let A of h.files) s.push(`<file>${A}</file>`);
    s.push("</skill_files>");
  }
  if (h.mcpServers && Object.keys(h.mcpServers).length > 0 && e?.mcpService) {
    let A = [];
    for (let [l, o] of Object.entries(h.mcpServers)) try {
      let n = await e.mcpService.getToolsForServer(l);
      if (n && n.length > 0) {
        let p = o.includeTools;
        for (let _ of n) {
          if (p && p.length > 0) {
            if (!p.some(b => Cj(_.spec.name, b))) continue;
          }
          let m = PDT(l, _.spec.name);
          A.push({
            name: m,
            description: _.spec.description,
            inputSchema: _.spec.inputSchema
          });
        }
      }
    } catch (n) {
      J.warn("Failed to get MCP tools for skill server", {
        skillName: h.name,
        serverName: l,
        error: n
      });
    }
    if (A.length > 0) if (t?.agentMode === "deep") s.push(...v7R(A));else s.push(...g7R(A));
  }
  if (h.builtinTools && h.builtinTools.length > 0 && e?.toolService) {
    let A = [];
    for (let l of h.builtinTools) {
      let o = e.toolService.getToolSpec(l);
      if (o) A.push(o);
    }
    if (A.length > 0) {
      let l = ["", "---", "", "## Builtin Tools", "", "**IMPORTANT: The following builtin tools are now available and can be called directly by name.**", "", "<skill_tools>"];
      for (let o of A) l.push(`<tool name="${o.name}">`), l.push(`<description>${o.description || "No description provided."}</description>`), l.push(`<parameters>${JSON.stringify(o.inputSchema, null, 2)}</parameters>`), l.push("</tool>"), l.push("");
      l.push("</skill_tools>"), s.push(...l);
    }
  }
  return s.push(c ? "</skill>" : "</loaded_skill>"), {
    content: s.join(`
`).replace(/\{baseDir\}/g, h.baseDir),
    skill: h
  };
}
function m5R(T) {
  return b5R[T] ?? T;
}
function u5R(T) {
  if (T.includes("*") || T.includes("?")) return T;
  return OuT[T] ?? OuT[T.toLowerCase()] ?? T;
}
function y5R(T) {
  if (!T) return ["*"];
  return (Array.isArray(T) ? T : T.split(",").map(R => R.trim())).map(u5R);
}
async function P5R(T, R, a = !1) {
  let e = [],
    t = 5;
  try {
    try {
      await T.access(R);
    } catch {
      return [];
    }
    async function r(i, c) {
      if (c > 5) return;
      try {
        let s = await T.readdir(i);
        for (let A of s) {
          let l = MR.basename(A.uri);
          if (A.isDirectory) {
            if (l === "node_modules" || l === ".git") continue;
            await r(A.uri, c + 1);
          } else if (l.endsWith(".md")) await h(A.uri, l);
        }
      } catch (s) {
        J.debug("Failed to scan directory for custom agents", {
          dir: i.toString(),
          error: s
        });
      }
    }
    async function h(i, c) {
      try {
        let s = await T.readFile(i),
          {
            frontMatter: A,
            content: l
          } = XDT(s);
        if (!A) {
          if (!a) return;
        }
        let o = A || {},
          n = o.name;
        if (!n) {
          if (n = c.replace(/\.md$/i, ""), n.toLowerCase() === "skill") n = MR.basename(MR.dirname(i));
        }
        if (!(o.type === "subagent" || o.isolatedContext === !0) && !a) return;
        if (!l.trim()) return;
        let p = o.tools || o["allowed-tools"],
          _ = y5R(p),
          m = m5R(o.model || "inherit"),
          b = MR.dirname(i).fsPath,
          y = l.replace(/\{baseDir\}/g, b);
        if (_.some(u => u === "Bash" || u === "*")) y += `

# Execution Environment
The scripts for this tool are located in: ${b}
When running scripts from this directory using the \`Bash\` tool:
1. ALWAYS set the \`cwd\` parameter to "${b}".
`;
        e.push({
          name: n,
          description: o.description || "A custom agent",
          systemPrompt: y,
          model: m,
          toolPatterns: _,
          skills: Array.isArray(o.skills) ? o.skills : o.skills ? o.skills.split(",").map(u => u.trim()) : void 0,
          sourcePath: i.fsPath
        });
      } catch (s) {
        J.warn("Failed to process custom agent file", {
          filePath: i.toString(),
          error: s
        });
      }
    }
    await r(R, 0);
  } catch (r) {
    J.warn("Error loading custom agents", {
      dir: R.toString(),
      error: r
    });
  }
  return e;
}
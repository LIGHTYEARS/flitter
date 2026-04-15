function xwR(T, R) {
  return [...uwR(R), ...kwR(T.messages)];
}
async function fwR({
  configService: T,
  getThreadEnvironment: R,
  ...a
}, e, t, r) {
  let h = t === "deep",
    i = e.env?.initial ?? (await R(r));
  r?.throwIfAborted();
  let c = await T.getLatest(r);
  r?.throwIfAborted();
  let s = await WWT({
    filesystem: a.filesystem
  }, i, e.id);
  r?.throwIfAborted();
  let A = [],
    l = await _O({
      ...a,
      configService: T
    }, e, r);
  r?.throwIfAborted();
  let o = l.filter(u => u.type !== "subtree");
  A.push({
    type: "text",
    text: h ? EwR : dwR
  });
  let n = JS().os === "windows" ? "\\" : "/",
    p = (await Promise.all(o.map(async u => {
      try {
        let P = await a.filesystem.readFile(Ht(u.uri), {
            signal: r
          }),
          k = Mr(u.uri),
          x = Mr(MR.dirname(u.uri)),
          f;
        if (h) f = `# AGENTS.md instructions for ${x}

<INSTRUCTIONS>
${P}
</INSTRUCTIONS>`;else {
          let v = a7T(u.uri),
            g;
          if (u.type === "subtree") g = `Contents of ${k} (directory-specific instructions for ${x}${n}):`;else g = `Contents of ${k} (${v}):`;
          f = `${g}

<instructions>
${P}
</instructions>`;
        }
        return {
          type: "text",
          text: f
        };
      } catch (P) {
        return J.error("Error reading guidance file content", {
          uri: u.uri,
          error: P
        }), null;
      }
    }))).filter(u => u !== null);
  if (h) {
    let u = 0,
      P = [];
    for (let k of p) {
      let x = new TextEncoder().encode(k.text).length;
      if (u + x > 32768) {
        J.warn("AGENTS.md guidance budget exceeded, truncating remaining files", {
          totalBytes: u,
          budgetBytes: 32768,
          includedBlocks: P.length,
          droppedBlocks: p.length - P.length
        });
        break;
      }
      P.push(k), u += x;
    }
    A.push(...P);
  } else A.push(...p);
  function _(u) {
    if (!u.trees || u.trees.length === 0) return null;
    let P = u.trees.map(k => k.repository?.url).filter(k => k !== void 0);
    if (P.length === 0) return null;
    return `${o9(P.length, "Repository", "Repositories")}: ${P.join(", ")}`;
  }
  let m;
  try {
    m = new URL(c.settings.url?.replace(/\/$/, "") ?? "https://ampcode.com");
  } catch (u) {
    J.error("Error parsing Amp URL", {
      error: u
    });
  }
  A.push({
    type: "text",
    text: ["# Environment", "Here is useful information about the environment you are running in:", `Today's date: ${new Date().toDateString()}`, `Working directory: ${s.workingDirectory ? Kt(s.workingDirectory) : "(none)"}`, `Workspace root: ${s.workspaceRoot ? Kt(s.workspaceRoot) : "(none)"}`, e.meta?.executorType === "sandbox" ? zWT : null, i && i.platform ? `Operating system: ${i.platform.os} (${i.platform.osVersion})${i.platform.cpuArchitecture ? ` on ${i.platform.cpuArchitecture}` : ""}${i.platform.os === "windows" ? " (use Windows file paths with backslashes)" : ""}${i.platform.webBrowser ? " (running in web browser)" : ""}` : null, i ? _(i) : null, m ? `Amp Thread URL: ${$P(m, e.id)}` : null, e.meta?.executorType === "sandbox" ? CwR : null, e.meta?.executorType === "sandbox" ? await mwR(a.filesystem, s.workspaceRoot) : null, !h && s.rootDirectoryListing ? `## Directory listing
List of files (top-level only) in the user's workspace:
${s.rootDirectoryListing}
` : null].filter(u => u !== null).join(`

`)
  });
  let b = await a.skillService.getSkills();
  r?.throwIfAborted();
  let y = h ? zkR(b) : qkR(b);
  if (y) A.push({
    type: "text",
    text: y
  });
  return {
    blocks: A
  };
}
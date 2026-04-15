function CBR(T) {
  let R = [`Working directory: ${T}`, ""];
  try {
    let a = Nx.readdirSync(T, {
      withFileTypes: !0
    });
    if (a.length === 0) return R.push("Directory is empty."), R.join(`
`);
    let e = a.filter(t => !t.name.startsWith(".")).sort((t, r) => {
      if (t.isDirectory() !== r.isDirectory()) return t.isDirectory() ? -1 : 1;
      return t.name.localeCompare(r.name);
    });
    R.push("Files in working directory:");
    for (let t of e.slice(0, 20)) if (t.isDirectory()) R.push(`  ${t.name}/`);else {
      R.push(`  ${t.name}`);
      let r = tqT.join(T, t.name),
        h = LBR(r, 3);
      if (h) {
        R.push("    ---");
        for (let i of h.split(`
`)) R.push(`    ${i}`);
        R.push("    ---");
      }
    }
    if (e.length > 20) R.push(`  ... and ${e.length - 20} more files`);
  } catch {
    R.push("Could not read directory contents.");
  }
  return R.join(`
`);
}
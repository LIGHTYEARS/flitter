async function GL0(T) {
  if (!IN.test(T.toolName)) {
    T.stdout.write(rG(T.toolName) + `
`), T.exit(1);
    return;
  }
  let R = zR.file(T.toolboxDir);
  await T.fs.mkdirp(R);
  let a = zL0(T.toolboxDir, T.toolName),
    e = zR.file(a);
  if (!T.force) try {
    await T.fs.stat(e);
    let r = await T.fs.realpath(e);
    T.stdout.write([`Error: a tool named ${T.toolName} already exists at ${r.fsPath}.`, "Use --force to overwrite."].join(`
`) + `
`), T.exit(1);
    return;
  } catch (r) {}
  let t = KL0(T.toolName, T.language || "bun");
  await T.fs.writeFile(e, t), await T.fs.chmod(e, 493), T.stdout.write([`Tool created at: ${a}`, "", `Inspect with: amp tools show tb__${T.toolName}`, "", `Execute with: amp tools use tb__${T.toolName}`].join(`
`) + `
`), T.exit(0);
}
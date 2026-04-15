function pM0(T, R) {
  T.command("make").argument("<tool-name>", "A descriptive name like run-tests or build-project").description("Sets up a skeleton tool in your toolbox").option("--force", "Overwrite an existing tool if it already exists").option("--bun", "Create a Bun/TypeScript tool (default)").option("--zsh", "Create a Zsh shell script tool").option("--bash", "Create a Bash shell script tool").action(async (a, e, t) => {
    let r = "bun";
    if (e.zsh) r = "zsh";else if (e.bash) r = "bash";else if (e.bun) r = "bun";
    try {
      let h = oM0();
      await GL0({
        fs: FL0,
        toolName: a,
        toolboxDir: h,
        force: e.force,
        language: r,
        stdout: process.stdout,
        exit: process.exit
      });
    } catch (h) {
      process.stdout.write(`${h instanceof Error ? h.message : String(h)}
`), process.exit(1);
    }
  });
}
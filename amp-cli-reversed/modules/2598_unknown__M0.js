function _M0(T, R) {
  let a = [oR.bold("Examples:"), "", "  # invoke the Read tool for README.md and the first ten lines", "  amp tools use Read --path $PWD/README.md --read_range 0 --read_range 10", "", "  # invoke web_search with JSON input", `  amp tools use web_search <<<'{"query":"Svelte 5"}'`, "", "  # invoke a toolbox tool", "  amp tools use tb__run_test --workspace server", "", `Use ${oR.green("amp tools list")} to get a list of all tools available in this environment.`, "", `Use ${oR.green("amp tools show <tool-name>")} to see the schema of a tool.`].join(`
`);
  T.command("use").argument("<tool-name>", "The tool to invoke").summary("Invoke a tool with arguments or JSON input from stdin").description(a).option("--only <field>", "Extract only the specified field from the result").option("--stream", "Stream updates as they arrive instead of waiting for completion").allowUnknownOption(!0).allowExcessArguments(!0).action(async (e, t, r) => {
    let h = r.optsWithGlobals(),
      i = await R(r, h),
      c = 0,
      s = r.args.slice(1),
      A;
    if (cM0()) {
      let l = [];
      for await (let o of process.stdin) l.push(o);
      A = Buffer.concat(l).toString("utf-8").trim();
    }
    await eM0({
      toolName: e,
      rawArgs: s,
      stdinInput: A,
      only: t.only,
      stream: t.stream,
      threadDeps: i,
      stdout: process.stdout,
      stderr: process.stderr,
      exit: l => {
        c = l;
      }
    }), await i.asyncDispose(), i.cleanupTerminal(), process.exit(c);
  });
}
function p40(T, R) {
  return T.command("review").description("Run a code review on uncommitted changes or a commit range").argument("[diff_description]", "Description of the diff or changes to review (default: uncommitted changes)").option("-f, --files <files...>", "Specific files to focus the review on").option("-i, --instructions <text>", "Additional instructions to guide the review").option("-s, --check-scope <dir>", "Directory to search for checks").option("-c, --check-filter <checks...>", "Specific check names to run").option("--checks-only", "Only run checks, skip the main review agent").option("--summary-only", "Only generate and print the diff summary, skip full review").addHelpText("after", `
The diff_description tells the tool what changes to review. It can be:
  - A git command: "git diff HEAD~3"
  - A commit range: "main..HEAD" or "HEAD~1"
  - A natural language description: "uncommitted changes in server/src"
  - Empty (defaults to reviewing uncommitted changes)

Examples:
  amp review                                    # review uncommitted changes
  amp review "HEAD~1"                           # review the last commit
  amp review "main...HEAD"                      # review all commits since HEAD diverged from main
  amp review "git diff HEAD" --files server/    # focus on specific directory
  amp review --instructions "focus on security" # add review focus
  amp review "HEAD~3" -i "check error handling" -f src/api.ts
`).action(async (a, e, t) => {
    let r = t.optsWithGlobals(),
      h = await R(t),
      i = await h.configService.getLatest();
    if (!(r.dangerouslyAllowAll || i.settings?.dangerouslyAllowAll === !0)) process.stdout.write("Error: The review command is currently experimental and does not yet support permissions. Rerun with `amp --dangerously-allow-all review` to bypass permissions and execute all tool calls requested by the model.\n"), process.exit(1);
    let c = 0;
    try {
      await m40(h, process.stdout, {
        diffDescription: a || "git diff HEAD and newly added untracked files",
        files: r.files,
        instructions: r.instructions,
        checkScope: r.checkScope,
        checkFilter: r.checkFilter,
        checksOnly: r.checksOnly,
        summaryOnly: r.summaryOnly
      });
    } catch (s) {
      c = 1, process.stdout.write(`Error running review: ${s instanceof Error ? s.message : String(s)}
`);
    } finally {
      await h.asyncDispose(), h.cleanupTerminal(), process.exit(c);
    }
  });
}
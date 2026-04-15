function T40(T) {
  T.registerCommand("toggle-skills-count", {
    title: "toggle skills count",
    category: "CLI",
    description: 'Toggle whether "N skills" is shown in the prompt bar'
  }, async R => {
    let a = (await T.configuration.get())["internal.cli.showSkillsCountInPromptBar"] === !1;
    await T.configuration.update({
      ["internal.cli.showSkillsCountInPromptBar"]: a
    }, "global"), await R.ui.notify(a ? "Showing skills count in prompt bar" : "Hiding skills count in prompt bar");
  });
}
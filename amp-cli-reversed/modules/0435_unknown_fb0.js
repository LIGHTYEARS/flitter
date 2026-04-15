async function fb0() {
  let T = "zsh",
    R = mh.basename(process.env.SHELL || T),
    a = {
      fish: {
        configPaths: [mh.join(H_.homedir(), ".config", "fish", "config.fish")],
        command: 'fish_add_path "~/.local/bin"',
        refreshCommand: "source ~/.config/fish/config.fish"
      },
      nu: {
        configPaths: [mh.join(H_.homedir(), ".config", "nushell", "env.nu")],
        command: "$env.PATH ++= ['~/.local/bin']",
        refreshCommand: "source ~/.config/nushell/env.nu"
      },
      zsh: {
        configPaths: [mh.join(H_.homedir(), ".zshrc")],
        command: 'export PATH="$HOME/.local/bin:$PATH"',
        refreshCommand: "exec $SHELL"
      },
      bash: {
        configPaths: [mh.join(H_.homedir(), ".bashrc"), mh.join(H_.homedir(), ".bash_profile")],
        command: 'export PATH="$HOME/.local/bin:$PATH"',
        refreshCommand: "source ~/.bashrc"
      }
    }[R];
  if (!a) {
    rt.yellow("Manually add the directory to your shell configuration:"), rt.bold('  export PATH="$HOME/.local/bin:$PATH"');
    return;
  }
  if (await Ib0(a)) rt.blue(`
To awaken the orb, run:
`), rt.bold(`  ${a.refreshCommand}`), rt.bold("  amp --help");else rt.yellow(`
Manually weave this spell into your shell configuration:`), rt.bold(`  ${a.command}`);
}
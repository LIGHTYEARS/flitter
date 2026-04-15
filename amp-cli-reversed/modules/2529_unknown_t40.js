function t40(T, R) {
  let a = T.command("plugins", {
    hidden: !0
  }).alias("plugin").description("Plugin management commands").action(() => {
    a.help();
  });
  return a.command("list").alias("ls").description("List plugins found in .amp/plugins/").action(async (e, t) => {
    let r = await R(t);
    try {
      if (r.pluginService === V5T) Ig.write(oR.dim(`Plugins are disabled (PLUGINS=off). Set PLUGINS=all to enable.
`));else {
        let h = s => s.length > 0 && s.every(A => A.status !== "loading"),
          i = await m0(r.pluginService.plugins.pipe(da(h), KS(100))),
          c = process.cwd();
        for (let s of i) {
          let A = I8(s.uri),
            l = A.scheme === "file" ? A.fsPath.startsWith(c + "/") ? vIT.relative(c, A.fsPath) : A.fsPath : A.toString(),
            o = s.status === "active" ? oR.green("\u2713") : oR.red("\u2717");
          if (Ig.write(`${o} ${l} ${oR.dim(s.status)}
`), s.registeredEvents.length > 0) Ig.write(oR.dim("  Events: ") + oR.cyan(s.registeredEvents.join(", ")) + `
`);
          if (s.registeredCommands.length > 0) for (let n of s.registeredCommands) Ig.write(oR.dim("  Command: ") + oR.cyan(`${n.category}: ${n.title}`) + `
`);
          if (s.registeredTools.length > 0) for (let n of s.registeredTools) Ig.write(oR.dim("  Tool: ") + oR.cyan(n.name) + `
`);
        }
      }
    } finally {
      await r.pluginService.dispose(), await r.asyncDispose();
    }
    process.exit(0);
  }), a.command("exec").argument("<plugin>", "Plugin file path (e.g., .amp/plugins/foo.ts)").argument("<event>", "Event name to send (e.g., tool.result)").option("--data <json>", "JSON event data", "{}").description("Execute a plugin with a given event").action(async (e, t, r, h) => {
    let i;
    try {
      i = JSON.parse(r.data);
    } catch {
      py.write(oR.red(`Error: --data must be valid JSON
`)), process.exit(1);
    }
    if (!a40(e)) py.write(oR.red(`Error: plugin file not found: ${e}
`)), process.exit(1);
    let c = vIT.resolve(e),
      s = d0(zR.parse(process.env.AMP_URL ?? Lr)),
      A = new vaT(zR.file(c), {
        onStderr: l => py.write(l),
        onRequest: {
          "ui.notify": async ({
            message: l
          }) => {
            py.write(`
Notification: ${l}

`);
            return;
          },
          "system.open": async ({
            url: l
          }) => {
            let o = e40();
            R40(`${o === "darwin" ? "open" : o === "win32" ? "start" : "xdg-open"} ${JSON.stringify(l)}`), py.write(`
Opened URL: ${l}

`);
            return;
          },
          "client.info": async l => ({
            ampURL: s,
            executorKind: "unknown"
          })
        }
      });
    try {
      await A.start(), await A.emitEvent(t, i), await new Promise(l => setTimeout(l, 2000));
    } catch (l) {
      py.write(oR.red(`Error: ${l instanceof Error ? l.message : String(l)}
`)), process.exit(1);
    } finally {
      await A.dispose();
    }
    process.exit(0);
  }), a;
}
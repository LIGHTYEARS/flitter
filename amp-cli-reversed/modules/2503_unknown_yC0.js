function yC0(T, R) {
  let a = T.command("mcp").summary("Manage MCP servers").description("Add and manage MCP server configuration under amp.mcpServers").action(() => {
    a.outputHelp(), process.exit(0);
  });
  a.command("add <name> [args...]").summary("Add an MCP server configuration").description(`Add an MCP server to amp.mcpServers in the Amp CLI settings file.

By default, this modifies global settings (~/.config/amp/settings.json). Use --workspace to target workspace settings instead.

Usage:
  amp mcp add <name> -- <command> [args...]                   (local MCP server, started with command)
  amp mcp add <name> --env KEY=VAL -- <command> [args...]     (local MCP server, with env vars)
  amp mcp add <name> <url>                                    (remote MCP server with auto-detected transport)
  amp mcp add <name> --header KEY=VAL <url>                   (remote MCP server with HTTP headers)
  amp mcp add <name> --workspace -- <command> [args...]       (add to workspace settings)

Examples:
  amp mcp add context7 -- npx -y @upstash/context7-mcp
  amp mcp add postgres --env PGUSER=orb -- npx -y @modelcontextprotocol/server-postgres postgresql://localhost/orbing
  amp mcp add sourcegraph --header "Authorization=token <sg-instance-token>" https://sourcegraph.example.com/.api/mcp/v1
  amp mcp add hugging-face https://huggingface.co/mcp
  amp mcp add monday --header "Authorization=Bearer <token>" https://mcp.monday.com/sse
  amp mcp add project-specific --workspace -- npx -y @some/server`).option("--env <kv>", "Environment variables as KEY=VALUE pairs (repeatable)", $IT, []).option("--header <kv>", "HTTP headers as KEY=VALUE pairs for URL-based MCP servers (repeatable)", $IT, []).option("--workspace", "Target workspace settings instead of global settings").allowUnknownOption(!1).action(async (e, t, r, h) => {
    let i;
    try {
      i = (await R(h.optsWithGlobals())).settings;
      let c = r.workspace ? "workspace" : "global";
      if (!e || e.trim() === "") throw Error("Invalid server name: name cannot be empty");
      if (!/^[A-Za-z0-9@/_-]+$/.test(e)) throw Error("Invalid server name. Allowed characters: letters, digits, @, /, -, _");
      if (t.length === 0) {
        if (r.env && r.env.length > 0) throw Error("No command provided after -- separator");
        throw Error("Missing command or URL. Usage: amp mcp add <name> <command|url> [args...]");
      }
      if (t.length === 1 && t[0] === "--") throw Error("No command provided after -- separator");
      let s = t[0];
      if (s.startsWith("--") && s !== "--") throw Error(`Unknown option '${s}'. Commands cannot start with dashes`);
      let A;
      if (/^https?:\/\//.test(s)) {
        if (t.length > 1) throw Error("Cannot mix URL with additional command arguments");
        if (r.env && r.env.length > 0) throw Error("Environment variables cannot be used with URL-based MCP servers. Use --header instead");
        let n = xC0(r.header || []);
        A = {
          url: s,
          headers: Object.keys(n).length > 0 ? n : void 0
        };
      } else A = PC0(t, r);
      let l = (await i.get("mcpServers", c)) ?? {};
      if (l[e]) throw Error(`MCP server "${e}" already exists`);
      l[e] = A, await i.set("mcpServers", l, c);
      let o = c === "workspace" ? i.getWorkspaceSettingsPath() : i.getSettingsFilePath();
      process.stdout.write(`Added amp.mcpServers.${e} to ${o}
`), process.exit(0);
    } catch (c) {
      process.stderr.write((c instanceof Error ? c.message : String(c)) + `
`), process.exit(1);
    }
  }), a.command("list").summary("List all MCP server configurations").description(`List all configured MCP servers from both global and workspace settings.

Shows the server name, type (command or URL), and source (global or workspace).`).option("--json", "Output as JSON").action(async (e, t) => {
    try {
      let r = (await R(t.optsWithGlobals())).settings,
        h = (await r.get("mcpServers", "global")) ?? {},
        i = (await r.get("mcpServers", "workspace")) ?? {},
        c = [];
      for (let [s, A] of Object.entries(h)) c.push({
        name: s,
        type: "url" in A ? "url" : "command",
        source: "global",
        spec: A
      });
      for (let [s, A] of Object.entries(i)) c.push({
        name: s,
        type: "url" in A ? "url" : "command",
        source: "workspace",
        spec: A
      });
      if (e.json) process.stdout.write(JSON.stringify(c, null, 2) + `
`);else if (c.length === 0) process.stdout.write(`No MCP servers configured.
`);else {
        let s = c.filter(n => n.source === "workspace"),
          A = c.filter(n => n.source === "global"),
          l = n => {
            if ("url" in n.spec) return n.spec.url;
            let p = n.spec.command;
            if (n.spec.args && n.spec.args.length > 0) p += " " + n.spec.args.join(" ");
            return p;
          },
          o = Math.max(...c.map(n => n.name.length));
        if (s.length > 0) {
          process.stdout.write(`Workspace .amp/settings.json
`);
          for (let n of s) {
            let p = l(n);
            process.stdout.write(`  ${n.name.padEnd(o)}  ${n.type.padEnd(7)}  ${p}
`);
          }
          process.stdout.write(`
`);
        }
        if (A.length > 0) {
          process.stdout.write(`Global ~/.config/amp/settings.json
`);
          for (let n of A) {
            let p = l(n);
            process.stdout.write(`  ${n.name.padEnd(o)}  ${n.type.padEnd(7)}  ${p}
`);
          }
          process.stdout.write(`
`);
        }
      }
      process.exit(0);
    } catch (r) {
      process.stderr.write((r instanceof Error ? r.message : String(r)) + `
`), process.exit(1);
    }
  }), a.command("remove <name>").summary("Remove an MCP server configuration").description(`Remove an MCP server from amp.mcpServers in the settings file.

This command checks workspace settings first, then falls back to global settings (~/.config/amp/settings.json).
This command does not modify VS Code or other editor settings.

Usage:
  amp mcp remove <name>

Examples:
  amp mcp remove context7
  amp mcp remove postgres`).action(async (e, t, r) => {
    let h;
    try {
      if (h = (await R(r.optsWithGlobals())).settings, !e || e.trim() === "") throw Error("Invalid server name: name cannot be empty");
      let i = "workspace",
        c = (await h.get("mcpServers", i)) ?? {};
      if (!c[e]) {
        if (i = "global", c = (await h.get("mcpServers", i)) ?? {}, !c[e]) throw Error(`MCP server "${e}" does not exist`);
      }
      if (delete c[e], Object.keys(c).length === 0) await h.delete("mcpServers", i);else await h.set("mcpServers", c, i);
      let s = i === "workspace" ? h.getWorkspaceSettingsPath() : h.getSettingsFilePath();
      process.stdout.write(`Removed amp.mcpServers.${e} from ${s}
`), process.exit(0);
    } catch (i) {
      process.stderr.write((i instanceof Error ? i.message : String(i)) + `
`), process.exit(1);
    }
  }), a.addCommand(uC0(async e => {
    let t = await R(e);
    return {
      secretStorage: t.secretStorage,
      settings: t.settings
    };
  })), a.command("doctor [name]").summary("Check MCP server status").description(`Wait for MCP service initialization and display the status of configured servers.

If [name] is provided, only show status for that specific server.`).action(async (e, t, r) => {
    let {
        mcpDoctor: h
      } = await Promise.resolve().then(() => (sUR(), c5T)),
      i = await R(r.optsWithGlobals());
    if (!i.getThreadDeps) throw Error("Internal error: getThreadDeps not available for doctor command");
    await h(r, i.getThreadDeps, e);
  }), a.command("approve <name>").summary("Approve a workspace MCP server").description(`Approve a workspace MCP server for execution.

MCP servers added to workspace settings (.amp/settings.json) require explicit approval before they can run. This is a security measure to prevent untrusted code execution.

Usage:
  amp mcp approve <name>

Examples:
  amp mcp approve my-server
  amp mcp approve project-mcp`).action(async (e, t, r) => {
    try {
      let h = await R(r.optsWithGlobals());
      if (!h.getThreadDeps) throw Error("Internal error: getThreadDeps not available for approve command");
      let i = await h.getThreadDeps(r);
      try {
        await i.mcpService.approveWorkspaceServer(e), process.stdout.write(`Approved MCP server "${e}"
`), process.exit(0);
      } finally {
        await i.asyncDispose();
      }
    } catch (h) {
      process.stderr.write((h instanceof Error ? h.message : String(h)) + `
`), process.exit(1);
    }
  });
}
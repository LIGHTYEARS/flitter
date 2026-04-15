function Yz0(T) {
  let R = new eS().name("amp").description("AI-powered coding assistant").option("--visibility <visibility>", "Set thread visibility (private, public, workspace, group)").configureOutput({
    writeErr: () => {}
  });
  R.exitOverride(p => {
    if (p.code === "commander.help" || p.code === "commander.version" || p.exitCode === 0) WP(), process.exit(0);
    let _ = p.originalError ?? p;
    gl0(_);
  }), dz0(R, {
    version: "0.0.1775894934-g5bb49b",
    buildTimestamp: "2026-04-11T08:12:39.144Z",
    buildType: "'release'"
  }), R.addHelpText("after", ib0()), R.configureHelp({
    formatHelp: cb0
  }), R.command("logout").description("Log out by removing stored API key").action(async (p, _) => {
    let m = _.optsWithGlobals(),
      b = await S8(m);
    await tF0(b);
  }), R.command("login").description("Log in to Amp").addHelpText("after", "If AMP_URL is set during login, it will be persisted to global settings for future CLI invocations, though AMP_URL will continue to take precedence.").action(async (p, _) => {
    let m = _.optsWithGlobals(),
      b = await S8(m);
    await eF0(b, await otT(m, b.settings));
  }), R.command("git-credential-helper [action]", {
    hidden: !0
  }).summary("Git credential helper for GitHub").description("Internal: implements the git credential helper protocol. Used inside sandboxes to authenticate git operations with GitHub.").action(async (p, _, m) => {
    let b = m.optsWithGlobals(),
      y = await S8(b);
    await jA0(p ?? "get", y.ampURL, y.secrets), process.exit(process.exitCode ?? 0);
  }), R.command("sign-commit", {
    hidden: !0
  }).summary("Git commit signing helper").description("Internal: implements the gpg signing interface for git commit signing. Used inside sandboxes as gpg.program.").allowUnknownOption().action(async (p, _) => {
    let m = _.optsWithGlobals(),
      b = await S8(m);
    await OA0(b.ampURL, b.secrets), process.exit(process.exitCode ?? 0);
  }), R.command("dtw-curl [threadId] [action] [message...]", {
    hidden: !0
  }).summary("DTW helper").description("Internal: helper for DTW one-shot commands.").addHelpText("after", `
Actions:
  create                  Create a new DTW thread and print its ID
  add-message <message>   Send a user message and wait for message_added
  get-transcript          Output a JSONL transcript of the thread
  dump                    Stream a full SQL dump into a local sqlite database
  durable-object-id       Print the durable object ID for the thread

Examples:
  amp dtw-curl create
  amp dtw-curl create --repository-url https://github.com/sourcegraph/amp
  amp dtw-curl create "hello"
  amp dtw-curl T-xxx add-message "hello"
  echo "hello" | amp dtw-curl T-xxx add-message
  amp dtw-curl T-xxx get-transcript
  amp dtw-curl T-xxx dump
  amp dtw-curl T-xxx dump --output-file /tmp/thread.sqlite
  amp dtw-curl T-xxx durable-object-id
`).option("--agent-mode <mode>", "Agent mode for create/add-message").option("--project-id <uuid>", "Project ID for sandbox spawn (create)").option("--repository-url <url>", "Repository URL for create/sandbox spawn (create)").option("--worker-url <url>", "Override DTW worker URL (create/add-message/dump/durable-object-id)").option("--output-file <path>", "Output sqlite DB path for dump action").option("--timeout <ms>", "Timeout waiting for message_added (add-message)", "15000").action(async (p, _, m, b, y) => {
    if (!p || p.trim().length === 0) C9.write(`dtw-curl runs one-shot DTW commands and exits.

`), y.outputHelp(), process.exit(0);
    let u = p === "create",
      P = _,
      k = null,
      x;
    if (u) {
      P = "create";
      let S = s$T(_ ? [_, ...(m ?? [])] : m);
      x = S ? [S] : void 0;
    } else {
      if (!_ || _.trim().length === 0) Be.write(`Missing action. Expected add-message, get-transcript, dump, durable-object-id, or create.

`), y.outputHelp(), process.exit(1);
      if (!Vt(p)) throw new GR(`Invalid thread ID: ${p}`, 1);
      k = p;
    }
    let f = y.optsWithGlobals(),
      v = await S8(f);
    ua(y, f);
    let g = await X3(v, f),
      I = !1;
    try {
      if (oA(g.serverStatus)) {
        let L = $v(Error(g.serverStatus.error.message));
        if (L.message === V3.networkOffline || L.message === V3.networkTimeout) throw eD(v.ampURL);
        throw new GR(V3.invalidAPIKey, 1);
      }
      let S = X9(g.serverStatus) ? g.serverStatus.user.email : void 0;
      if (!S || !Ns(S)) throw new GR("dtw-curl is only available for Amp employees", 1);
      let O = await g.secretStorage.get("apiKey", v.ampURL);
      if (!O) throw new GR("API key required. Please run `amp login` first.", 1);
      let j = b.timeout ? Number.parseInt(b.timeout, 10) : void 0;
      if (j !== void 0 && (!Number.isFinite(j) || j <= 0)) throw new GR("Timeout must be a positive integer in milliseconds", 1);
      let d = b.repositoryUrl?.trim();
      if (d) {
        let L;
        try {
          L = new URL(d);
        } catch {
          throw new GR("Repository URL must be a valid URL", 1);
        }
        if (L.protocol !== "https:") throw new GR("Repository URL must use https://", 1);
      }
      let C = b.projectId?.trim();
      if (C && !Vz0(C)) throw new GR("Project ID must be a UUID", 1);
      if (C && !d) throw new GR("Repository URL is required when project ID is provided", 1);
      if (P === "create") {
        let L = await Fz0({
          ampURL: v.ampURL,
          apiKey: O,
          agentMode: b.agentMode,
          repositoryURL: d
        });
        if (C9.write(`Created thread: ${L}
`), d) {
          let D = b.workerUrl ?? process.env.AMP_WORKER_URL ?? Pi(v.ampURL);
          await Xz0({
            workerURL: D,
            apiKey: O,
            threadID: L,
            repositoryURL: d,
            projectID: C
          }), C9.write(`Spawn requested: ${L}
`);
        }
        let w = s$T(x);
        if (!w) {
          let D = (await fS()).trimEnd();
          if (D) w = D;
        }
        if (w) {
          let D = await xkT({
            ampURL: v.ampURL,
            apiKey: O,
            threadId: L,
            message: w,
            agentMode: b.agentMode,
            workerUrl: b.workerUrl ?? process.env.AMP_WORKER_URL,
            timeoutMs: j
          });
          C9.write(`Message added: ${L}#${D.messageId}
`);
        }
        I = !0;
      } else if (P === "add-message") {
        let L = m && m.length > 0 ? m.join(" ") : void 0;
        if (!L || L.trim().length === 0) {
          let D = (await fS()).trimEnd();
          if (D) L = D;
        }
        if (!L || L.trim().length === 0) throw new GR("Message must be provided via argument or stdin", 1, 'Either pass a message as an argument: amp dtw-curl T-xxx add-message "your message"\\nOr pipe via stdin: echo "your message" | amp dtw-curl T-xxx add-message');
        if (!k) throw new GR("Thread ID is required for add-message", 1);
        let w = await xkT({
          ampURL: v.ampURL,
          apiKey: O,
          threadId: k,
          message: L,
          agentMode: b.agentMode,
          workerUrl: b.workerUrl ?? process.env.AMP_WORKER_URL,
          timeoutMs: j
        });
        C9.write(`Message added: ${k}#${w.messageId}
`), I = !0;
      } else if (P === "get-transcript") {
        if (!k) throw new GR("Thread ID is required for get-transcript", 1);
        let L = await NA(k, g);
        for (let w of L.messages) await h$T(`${JSON.stringify({
          threadId: L.id,
          message: w
        })}
`);
        I = !0;
      } else if (P === "dump") {
        if (!k) throw new GR("Thread ID is required for dump", 1);
        let L = b.workerUrl ?? process.env.AMP_WORKER_URL ?? Pi(v.ampURL),
          w = b.outputFile && b.outputFile.trim().length > 0 ? AA.resolve(b.outputFile) : AA.join(v5T.tmpdir(), `amp-${k}-${Date.now()}.sqlite`);
        await g5T(AA.dirname(w), {
          recursive: !0
        });
        let D = await fetch(`${L}/threads/${k}/sql`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${O}`
          }
        });
        if (!D.ok) {
          let aT = await D.text();
          throw new GR(`Dump request failed (${D.status}): ${aT}`, 1);
        }
        if (!D.body) throw new GR("Dump response did not include a body", 1);
        let B = qmT("sqlite3", [w], {
            stdio: ["pipe", "ignore", "pipe"]
          }),
          M = [];
        B.stderr.on("data", aT => {
          M.push(Buffer.from(aT));
        });
        let V = new Promise((aT, oT) => {
          B.once("error", oT), B.once("close", TT => {
            if (TT === 0) {
              aT();
              return;
            }
            let tT = Buffer.concat(M).toString("utf8");
            oT(Error(tT.trim().length > 0 ? tT.trim() : `sqlite3 exited with code ${TT}`));
          });
        });
        await GUR(FUR.fromWeb(D.body), B.stdin), await V;
        let Q = qmT("sqlite3", [w, "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"], {
            stdio: ["ignore", "pipe", "pipe"]
          }),
          W = [],
          eT = [];
        if (Q.stdout.on("data", aT => {
          W.push(Buffer.from(aT));
        }), Q.stderr.on("data", aT => {
          eT.push(Buffer.from(aT));
        }), (await new Promise((aT, oT) => {
          Q.once("error", oT), Q.once("close", TT => aT(TT ?? 1));
        })) !== 0) throw new GR(`Failed to verify dump: ${Buffer.concat(eT).toString("utf8").trim()}`, 1);
        let iT = Number.parseInt(Buffer.concat(W).toString("utf8").trim(), 10);
        if (!Number.isFinite(iT) || iT <= 0) throw new GR(`Dump completed but produced 0 tables in ${w}. Try restarting your workers dev server and rerunning.`, 1);
        C9.write(`Dumped sqlite database to ${w}
`), I = !0;
      } else if (P === "durable-object-id") {
        if (!k) throw new GR("Thread ID is required for durable-object-id", 1);
        let L = b.workerUrl ?? process.env.AMP_WORKER_URL ?? Pi(v.ampURL),
          w = await Kz0({
            apiKey: O,
            threadID: k,
            workerURL: L
          });
        await h$T(`${w}
`), I = !0;
      } else Be.write(`Unknown action: ${P}

`), y.outputHelp(), process.exit(1);
    } finally {
      if (await g.asyncDispose(), I) process.exit(0);
    }
  }), R.command("keyboard-tester", {
    hidden: !0
  }).summary("Keyboard input tester").description("Internal: stream parsed terminal input events as JSONL.").option("--raw", "Log raw incoming terminal bytes before parsing").action(async p => {
    await sy0({
      raw: p.raw === !0
    }), process.exit(process.exitCode ?? 0);
  }), R.command("thread-pool-harness [threadId]", {
    hidden: !0
  }).summary("Thread pool harness").description("Internal: interactive thread pool harness (no TUI).").option("--list-tools", "List tools with descriptions and arguments, then exit").option("--pool-mode <mode>", "Thread pool mode (worker or dtw). Defaults to worker.", "worker").option("--commands <commands>", "Sequence of commands (semicolon or newline separated) to run and exit").option("--worker-url <url>", "Override DTW worker URL").action(async (p, _, m) => {
    let b = m.optsWithGlobals(),
      y = await S8(b);
    ua(m, b);
    let u = await X3(y, b),
      P = !1;
    try {
      if (oA(u.serverStatus)) {
        let v = $v(Error(u.serverStatus.error.message));
        if (v.message === V3.networkOffline || v.message === V3.networkTimeout) throw eD(y.ampURL);
        throw new GR(V3.invalidAPIKey, 1);
      }
      let k = X9(u.serverStatus) ? u.serverStatus.user.email : void 0,
        x = Boolean(k && Ns(k));
      await RZ(m, b, u.serverStatus);
      let f = _.poolMode ?? "worker";
      if (f !== "worker" && f !== "dtw") throw new GR(`Invalid pool mode: ${f}`, 1);
      if (f === "dtw" && !x) throw new GR("thread-pool-harness (dtw) is only available for Amp employees", 1);
      if (p && !Vt(p)) throw new GR(`Invalid thread ID: ${p}`, 1);
      await jD0({
        ampURL: y.ampURL,
        apiKey: b.apiKey ?? process.env.AMP_API_KEY,
        configService: u.configService,
        toolService: u.toolService,
        skillService: u.skillService,
        mcpService: u.mcpService,
        toolboxService: u.toolboxService,
        pluginService: u.pluginService,
        threadService: u.threadService,
        fileSystem: u.fileSystem,
        isInternalUser: x,
        getThreadEnvironment: Hs,
        threadId: p,
        commands: _.commands,
        systemPromptOverride: R3R(m, b),
        listTools: _.listTools === !0,
        workerUrl: _.workerUrl ?? process.env.AMP_WORKER_URL,
        mode: f
      }), P = !0;
    } finally {
      if (await u.asyncDispose(), P) process.exit(0);
    }
  }), R.command("live-sync [threadIDOrURL]", {
    hidden: !0
  }).summary("Mirror live DTW thread changes into the current checkout").description("Experimental: watch a v2 thread URL or ID and mirror its live working-tree changes into your local checkout, or apply the current snapshot once and exit.").addHelpText("after", ["", "Examples:", "  amp live-sync T-5928a90d-d53b-488f-a829-4e36442142ee", "  amp live-sync --apply T-5928a90d-d53b-488f-a829-4e36442142ee", "  amp live-sync https://ampcode.com/threads/T-5928a90d-d53b-488f-a829-4e36442142ee"].join(`
`)).option("--apply <threadIDOrURL>", "Apply the current DTW thread snapshot once and exit").option("--checkout", "Automatically check out the thread commit when it differs").option("--skip-checkout", "Skip the startup checkout prompt when commits differ").option("--worker-url <url>", "Override DTW worker URL").action(async (p, _, m) => {
    if (p && _.apply) throw new GR("Choose either a positional thread ID/URL or --apply <thread-id>, not both.", 1);
    let b = _.apply ?? p;
    if (!b || b.trim().length === 0) C9.write(`live-sync watches a v2 thread and mirrors its live changes locally. Use --apply <thread-id> to materialize the current snapshot once and exit.

`), m.outputHelp(), process.exit(0);
    let y = mr(b) ?? Zi(b),
      u = m.optsWithGlobals(),
      P = await S8(u);
    ua(m, u);
    let k = await X3(P, u),
      x = !1;
    try {
      if (_.checkout && _.skipCheckout) throw new GR("Choose either --checkout or --skip-checkout, not both.", 1);
      if (oA(k.serverStatus)) {
        let v = $v(Error(k.serverStatus.error.message));
        if (v.message === V3.networkOffline || v.message === V3.networkTimeout) throw eD(P.ampURL);
        throw new GR(V3.invalidAPIKey, 1);
      }
      let f = X9(k.serverStatus) ? k.serverStatus.features : void 0;
      if (!SS(f, dr.V2)) throw new GR("live-sync is not enabled for your user", 1);
      await lP0({
        ampURL: P.ampURL,
        threadId: y,
        configService: k.configService,
        threadService: k.threadService,
        apiKey: u.apiKey ?? process.env.AMP_API_KEY,
        applyOnce: typeof _.apply === "string",
        workerURL: _.workerUrl ?? process.env.AMP_WORKER_URL,
        checkoutMode: _.checkout ? "always" : _.skipCheckout ? "never" : "prompt",
        promptForYesNo: OtT
      }), x = !0;
    } finally {
      if (await k.asyncDispose(), x) process.exit(0);
    }
  });
  let a = async (p, _, m) => {
      LX({
        storage: _.settings,
        secretStorage: _.secrets,
        workspaceRoot: AR.of(zR.file(process.cwd())),
        defaultAmpURL: _.ampURL,
        homeDir: jB,
        userConfigDir: tZ
      });
      let b = {
        ..._,
        executeMode: !1
      };
      await SB(b, {
        ...p,
        openThreadSwitcher: !0
      }, m, T);
    },
    e = R.command("threads").alias("t").alias("thread").summary("Manage threads").description("Thread management commands. When no subcommand is provided, defaults to listing threads.").option("--include-archived", "Include archived threads in the list").action(async (p, _) => {
      let m = _.optsWithGlobals(),
        b = await S8(m);
      await l$T(m, b, _);
    });
  e.command("new").alias("n").summary("Create a new thread").description("Create a new thread and print its ID. The thread will be empty. You can set the visibility using the --visibility option.").option("--visibility <visibility>", "Set thread visibility (private, public, workspace, group)").action(async (p, _) => {
    let m = _.optsWithGlobals(),
      b = await S8(m);
    await _F0(m, b, _);
  }), e.command("continue [threadIDOrURL]").alias("c").summary("Continue an existing thread").description("Continue an existing thread by resuming the conversation. By default, interactive mode shows a picker. Use --last to continue the last thread for the current mode directly.").option("--last", "Continue the last thread for the current mode directly").option("--pick", "Pick a thread interactively from a list (DEPRECATED: picker is now the default)").action(async (p, _, m) => {
    let b = m.optsWithGlobals(),
      y = await S8(b);
    if (_.pick) Be.write(`${oR.yellow("Warning:")} The --pick flag is deprecated. The picker is now shown by default.
`);
    if (_.last || p || y.executeMode) {
      let u;
      try {
        u = await n$T(p ?? null, y.executeMode ? "execute" : "interactive");
      } catch (P) {
        await Jl(P, p || void 0);
        return;
      }
      await pF0(b, y, u, m, T);
    } else await a(b, y, m);
  });
  let t = new eS("fork").argument("[threadId]").alias("f").action(async () => {
    Be.write(`\x1B[31mThe fork command has been deprecated.\x1B[0m

Fork has been replaced by handoff and thread mentions.
See: https://ampcode.com/news/stick-a-fork-in-it
`), process.exit(1);
  });
  e.addCommand(t, {
    hidden: !0
  }), e.command("list").alias("l").alias("ls").summary("List all threads").description("List all your threads with their IDs, names, and last modified times.").option("--include-archived", "Include archived threads in the list").action(async (p, _) => {
    let m = _.optsWithGlobals(),
      b = await S8(m);
    await l$T(m, b, _);
  }), dL0(e, S8, {
    initializeCLIOverrides: ua,
    createThreadDependencies: X3,
    printErrorExit: d8
  }), e.command("visibility [visibility]").alias("v").summary("Show or set default visibility for this repository").description("Print the effective default visibility for this repository, or set a new default (private, public, workspace, group).").action(async (p, _, m) => {
    let b = m.optsWithGlobals(),
      y = await S8(b);
    await bF0(b, y, m, p);
  }), e.command("search <query>").alias("find").summary("Search threads").description(`Search for threads using a query DSL.

			Query syntax:
			- Keywords: Bare words or quoted phrases for text search: auth or "race condition"
			- File filter: file:path to find threads that touched a file: file:src/auth/login.ts
			- Repo filter: repo:url to scope to a repository: repo:github.com/owner/repo
			- Combine filters: Use implicit AND: auth file:src/foo.ts repo:amp

			All matching is case-insensitive. File paths use partial matching.`).option("-n, --limit <number>", "Maximum number of threads to return", "20").option("--offset <number>", "Number of results to skip (for pagination)", "0").option("--json", "Output as JSON").action(async (p, _, m) => {
    let b = m.optsWithGlobals(),
      y = await S8(b);
    await uF0(b, y, p, _.limit ? parseInt(_.limit, 10) : 20, _.offset ? parseInt(_.offset, 10) : 0, _.json ?? !1);
  }), e.command("label <threadIDOrURL> <labels...>").summary("Add labels to a thread").description("Add one or more labels to an existing thread without removing the labels it already has.").action(async (p, _, m, b) => {
    let y = mr(p) ?? Zi(p),
      u = b.optsWithGlobals(),
      P = await S8(u);
    await nF0(u, P, y, _, b);
  }), e.command("share <threadIDOrURL>").summary("Share a thread").description("Change thread visibility (private, public, unlisted, workspace, group) or share with Amp support for debugging. Use --visibility to change who can access the thread, or --support to share with the Amp team for troubleshooting.").alias("s").option("--visibility <visibility>", "Set thread visibility (private, public, unlisted, workspace, group)").option("--support [message]", "Share thread with Amp support for debugging").action(async (p, _, m) => {
    let b = mr(p) ?? Zi(p),
      y = m.optsWithGlobals(),
      u = await S8(y);
    await oF0(y, u, b, m, _.support);
  }), e.command("rename <threadIDOrURL> <newName>").alias("r").summary("Rename a thread").description('Change the title of a thread. Quote names with spaces: amp threads rename T-123 "New thread name"').action(async (p, _, m, b) => {
    let y = mr(p) ?? Zi(p),
      u = b.optsWithGlobals(),
      P = await S8(u);
    await rF0(u, P, y, _, b);
  }), e.command("archive <threadIDOrURL>").summary("Archive a thread").description("Archive a thread to hide it from the thread switcher and navigation. Use --unarchive to restore.").option("--unarchive", "Unarchive the thread instead of archiving").action(async (p, _, m) => {
    let b = mr(p) ?? Zi(p),
      y = m.optsWithGlobals(),
      u = await S8(y);
    await hF0(y, u, b, !_.unarchive);
  }), e.command("delete <threadIDOrURL>").summary("Delete a thread").description("Permanently delete a thread from both the local client and the server.").action(async (p, _, m) => {
    let b = mr(p) ?? Zi(p),
      y = m.optsWithGlobals(),
      u = await S8(y);
    await iF0(y, u, b);
  }), e.command("handoff [threadIDOrURL]").alias("h").summary("Create a handoff thread from an existing thread").description(`Create a new thread by handing off from an existing thread with a goal/prompt.

			The goal can be provided via stdin (piped) or as an argument with --goal.

			Examples:
			echo "Continue working on the auth feature" | amp threads handoff T-xxx
			amp threads handoff T-xxx --goal "Continue working on the auth feature"
			amp threads handoff --goal "Fix the remaining tests"  # Uses last thread

			By default, opens the new thread in the TUI. Use --print to just print the thread ID.`).option("-g, --goal <goal>", "Goal/prompt for the handoff (alternative to stdin)").option("-p, --print", "Print the thread ID instead of opening the TUI").action(async (p, _, m) => {
    let b;
    try {
      b = await n$T(p ?? null);
    } catch (P) {
      await Jl(P, p || void 0);
      return;
    }
    let y = m.optsWithGlobals(),
      u = await S8(y);
    await lF0(y, u, b, _.goal, !_.print, m, T);
  }), e.command("markdown <threadIDOrURL>").alias("md").summary("Render thread as markdown").description("Render a thread as markdown. This outputs the entire conversation history in a readable markdown format.").action(async (p, _, m) => {
    let b = mr(p) ?? Zi(p),
      y = m.optsWithGlobals(),
      u = await S8(y);
    await cF0(y, u, b, m);
  }), e.command("export <threadIDOrURL>").summary("Export a thread as JSON").description("Export a thread as JSON. This outputs the full thread payload.").action(async (p, _, m) => {
    let b = mr(p) ?? Zi(p),
      y = m.optsWithGlobals(),
      u = await S8(y);
    await sF0(y, u, b, m);
  }), lc0(e, S8, ua, X3, Zi, NA, d8), nM0(R, async (p, _) => {
    let m = await S8(_);
    ua(p, _);
    let b = await X3(m, _);
    return {
      context: m,
      mcpService: b.mcpService,
      toolService: b.toolService,
      toolServices: b.toolService,
      skillService: b.skillService,
      threadService: b.threadService,
      fileSystem: b.fileSystem,
      getThreadEnvironment: Hs,
      serverStatus: b.serverStatus,
      toolboxService: b.toolboxService,
      configService: b.configService,
      cleanupTerminal: WP,
      asyncDispose: b.asyncDispose.bind(b)
    };
  }), t40(R, async p => {
    let _ = p.optsWithGlobals(),
      m = await S8(_);
    ua(p, _);
    let b = LX({
      storage: m.settings,
      secretStorage: m.secrets,
      workspaceRoot: AR.of(zR.file(process.cwd())),
      defaultAmpURL: m.ampURL,
      homeDir: jB,
      userConfigDir: tZ
    });
    return {
      pluginService: X5T({
        configService: b,
        fileSystem: He,
        platform: {
          pluginExecutorKind: "unknown",
          async notify(y) {
            J.debug("plugin notification (TUI not loaded): %s", y);
          },
          async open(y) {
            Be.write(`
${y}

`);
          },
          async input() {
            return;
          },
          async confirm() {
            return !1;
          },
          async ask() {
            return {
              result: "uncertain",
              probability: 0.5,
              reason: "AI not available"
            };
          }
        },
        internalPlugins: e3R,
        emitSessionStart: !1,
        pluginFilter: process.env.PLUGINS ?? "off"
      }),
      asyncDispose: async () => {}
    };
  }), p40(R, async p => {
    let _ = p.optsWithGlobals(),
      m = await S8(_);
    ua(p, _);
    let b = await X3(m, _);
    return {
      toolService: b.toolService,
      mcpService: b.mcpService,
      configService: b.configService,
      skillService: b.skillService,
      cleanupTerminal: WP,
      asyncDispose: b.asyncDispose.bind(b)
    };
  }), g40(R, async p => {
    let _ = p.optsWithGlobals(),
      m = await S8(_);
    ua(p, _);
    let b = await X3(m, _);
    return {
      settings: m.settings,
      configService: b.configService,
      skillService: b.skillService,
      asyncDispose: b.asyncDispose.bind(b)
    };
  }), FC0(R, async p => {
    let _ = p.optsWithGlobals();
    return await S8(_);
  }), yC0(R, async p => {
    let _ = await S8(p);
    return {
      settings: _.settings,
      secretStorage: _.secrets,
      getThreadDeps: async m => {
        ua(m, p);
        let b = await X3(_, p);
        return {
          mcpService: b.mcpService,
          settings: _.settings,
          asyncDispose: b.asyncDispose.bind(b)
        };
      }
    };
  }), jz0(R, S8);
  function r(p, _, m) {
    let b = typeof p.description === "string" ? p.description : m === void 0 ? p.description(!0) : p.description(m),
      y = new Jc(_, b),
      u = Hz0(p);
    if (u) y.default(u);
    if (y.hidden = Nz0(p) || c$T(p), "choices" in p) y.choices([...p.choices]);
    return y;
  }
  for (let p of i$T) {
    switch (p.type) {
      case "flag":
        {
          R.addOption(r(p, `--${p.long}`)), R.addOption(r(p, `--no-${p.long}`, !1));
          break;
        }
      case "switch":
        {
          R.addOption(r(p, `--${p.long}`, !0));
          break;
        }
      case "optional-option":
        {
          R.addOption(r(p, `${"short" in p ? `-${p.short}, ` : ""}--${p.long} [value]`));
          break;
        }
      default:
        {
          R.addOption(r(p, `${"short" in p ? `-${p.short}, ` : ""}--${p.long} <value>`));
          break;
        }
    }
    if ("aliases" in p && Array.isArray(p.aliases)) for (let _ of p.aliases) {
      let m = new Jc(`--${_}`, p.description);
      m.hidden = !0, m.implies({
        [p.name]: !0
      }), R.addOption(m);
    }
  }
  let h = new Jc("-x, --execute [message]", "Use execute mode, optionally with user message. In execute mode, agent will execute provided prompt (either as argument, or via stdin). Only last assistant message is printed. Enabled automatically when redirecting stdout.").default(!1);
  R.addOption(h);
  let i = new Jc("-r, --remote", "When used with -x/--execute, execute in an async agent on the Amp server.").default(!1).hideHelp(!0);
  R.addOption(i);
  let c = new Jc("--stream-json", "When used with --execute, output in Claude Code-compatible stream JSON format instead of plain text.").default(!1);
  R.addOption(c);
  let s = new Jc("--stream-json-thinking", "Include thinking blocks in stream JSON output (non-Claude Code extension). Implies --stream-json.").default(!1);
  R.addOption(s);
  let A = new Jc("--stream-json-input", "Read JSON Lines user messages from stdin. Requires both --execute and --stream-json.").default(!1);
  R.addOption(A);
  let l = new Jc("--stats", "When used with --execute, output JSON with both result and token usage data (for /evals).").default(!1).hideHelp(!0);
  R.addOption(l);
  let o = new Jc("--archive", "When used with --execute, archive the thread after the command finishes.").default(!1);
  R.addOption(o);
  let n = new Jc("-l, --label <label>", "When used with --execute, add a label to the thread. Repeat the flag for multiple labels.").argParser((p, _) => {
    if (_ === void 0) return [p];
    return [..._, p];
  });
  return R.addOption(n), R.action(async (p, _) => {
    let m = p,
      b = await S8(m);
    if (Object.keys(m).forEach(y => {
      let u = i$T.find(P => P.name === y);
      if (u && c$T(u) && !Uz0(u)) Be.write(oR.yellow(`Warning: '--${y}' flag is deprecated
`));
    }), _.args.length > 0) Wz0(b, _);
    await SB(b, m, _, T);
  }), _m0(R), R;
}
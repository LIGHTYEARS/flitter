async function Ts(T, R) {
  if (T.provider === "anthropic") return A1R.count(T.ctx, R);
  return m1R.count(T.ctx, R);
}
async function oFT(T, R, a) {
  let {
      onProgress: e
    } = T,
    t = 8,
    r = 0,
    h = F => {
      r++, e?.(F, r, 8);
    };
  if (h("Initializing..."), T.mcpInitialized) await T.mcpInitialized, await new Promise(F => setTimeout(F, 100));
  let i = await T.configService.getLatest(a),
    c = ve(R),
    s,
    A;
  if (T.agentModeOverride && c === 0) A = T.agentModeOverride, s = nk(A);else {
    let F = pn(i.settings, R);
    s = F.model, A = F.agentMode;
  }
  J.debug("Context analyzer model selection", {
    agentModeOverride: T.agentModeOverride,
    humanMsgCount: c,
    threadAgentMode: R.agentMode,
    resolvedAgentMode: A,
    selectedModel: s
  });
  let {
      provider: l,
      model: o
    } = RO(s),
    n = l === "anthropic" && x8T(A, o),
    p = $h(R),
    _ = dn(s),
    m = _.displayName,
    b = l === "anthropic" ? TU(o, {
      enableLargeContext: n
    }) : _.contextWindow - _.maxOutputTokens;
  J.debug("Context analysis model spec", {
    modelName: o,
    provider: l,
    modelDisplayName: m,
    maxContextTokens: b,
    lastUsageModel: p?.model
  }), h("Building system prompt...");
  let {
      systemPrompt: y,
      tools: u
    } = await LO(T.buildSystemPromptDeps, R, {
      enableTaskList: !1,
      enableTask: !0,
      enableOracle: !0
    }, {
      model: o,
      provider: l,
      agentMode: A
    }, a),
    P = u.filter(F => F.source === "builtin"),
    k = u.filter(F => typeof F.source === "object" && "mcp" in F.source),
    x = u.filter(F => typeof F.source === "object" && "toolbox" in F.source),
    f = [...P, ...k, ...x];
  J.debug("Context analysis tools breakdown", {
    totalTools: f.length,
    builtinCount: P.length,
    mcpCount: k.length,
    toolboxCount: x.length
  });
  let v = (await _O({
      ...T.buildSystemPromptDeps,
      configService: T.configService
    }, R, a)).filter(F => F.type === "project" || F.type === "parent" || F.type === "user" || F.type === "mentioned"),
    g = [];
  for (let F of R.messages) if (F.role === "user") {
    for (let E of F.content) if (E.type === "tool_result" && E.run?.status === "done") {
      let U = E.run.result;
      if (typeof U === "object" && U !== null && "discoveredGuidanceFiles" in U && Array.isArray(U.discoveredGuidanceFiles)) {
        for (let Z of U.discoveredGuidanceFiles) if (Z.content) g.push({
          uri: Z.uri,
          content: Z.content
        });
      }
    }
    if (F.discoveredGuidanceFiles) {
      for (let E of F.discoveredGuidanceFiles) if (E.content) g.push({
        uri: E.uri,
        content: E.content
      });
    }
  }
  let I = {
      thread: R,
      systemPrompt: y,
      tools: f
    },
    S = Js(T.workersServiceAuthToken),
    O;
  if (l === "openai") {
    let F = {
        ...(S ?? {}),
        ...Xs(),
        ...Vs(R),
        [yc]: "amp.context-analyze",
        "x-amp-override-provider": "openai"
      },
      E = await uU({
        configService: T.configService
      }, a, {
        defaultHeaders: F
      });
    O = {
      provider: "openai",
      ctx: b1R(I, E, o)
    };
  } else {
    let F = await ep({
        configService: T.configService
      }, a, S ? {
        defaultHeaders: S
      } : void 0),
      E = {
        ...JN(i.settings, {
          id: R.id,
          agentMode: A
        }, o, void 0, {
          enableLargeContext: n
        }),
        ...(S ?? {}),
        [yc]: "amp.context-analyze",
        "x-amp-override-provider": "anthropic"
      };
    O = {
      provider: "anthropic",
      ctx: l1R(I, F, tp(o), E)
    };
  }
  h("Counting total tokens...");
  let j = await Ts(O, {
    kind: "full"
  });
  h("Counting messages...");
  let d = await Ts(O, {
    kind: "no_messages"
  });
  h("Counting tools...");
  let C = await Ts(O, {
    kind: "no_tools"
  });
  h("Counting system prompt...");
  let L = await Ts(O, {
    kind: "system_only"
  });
  h("Counting AGENTS.md files...");
  let w = [];
  if (v.length > 0) {
    let F = await Promise.all(v.map(async E => {
      let U = await Ts(O, {
        kind: "text",
        text: E.content
      });
      return {
        uri: E.uri,
        tokens: U
      };
    }));
    w.push(...F);
  }
  let D = w.reduce((F, E) => F + E.tokens, 0),
    B = [],
    M = 0;
  if (g.length > 0) {
    let F = await Promise.all(g.map(async E => {
      let U = Z9T([{
          uri: E.uri,
          lineCount: E.content.split(`
`).length,
          content: E.content
        }]),
        Z = await Ts(O, {
          kind: "text",
          text: U
        });
      return {
        uri: E.uri,
        tokens: Z
      };
    }));
    B.push(...F), M = B.reduce((E, U) => E + U.tokens, 0);
  }
  let V = j - d,
    Q = Math.max(0, V - M),
    W = j - C,
    eT = Math.max(0, L - D),
    iT = W,
    aT = 0,
    oT = [];
  if (k.length > 0 && (P.length > 0 || x.length > 0)) {
    let F = await Ts(O, {
        kind: "tools_only",
        tools: [...P, ...x]
      }),
      E = await Ts(O, {
        kind: "system_only"
      }),
      U = F - E;
    aT = W - U, iT = U;
  } else if (k.length > 0) aT = W, iT = 0;
  if (h("Finalizing..."), k.length > 0) {
    let F = new Map();
    for (let U of k) {
      let Z = U.source.mcp,
        X = F.get(Z) ?? [];
      X.push(U), F.set(Z, X);
    }
    let E = await Promise.all(Array.from(F.entries()).map(async ([U, Z]) => {
      let X = await Ts(O, {
          kind: "tools_only",
          tools: Z
        }),
        rT = await Ts(O, {
          kind: "system_only"
        });
      return {
        server: U,
        tokens: X - rT
      };
    }));
    oT.push(...E);
  }
  let TT = [];
  TT.push({
    name: "System prompt",
    tokens: eT,
    percentage: eT / b * 100
  });
  let tT = x.length > 0 ? "Builtin + toolbox tools" : "Builtin tools";
  TT.push({
    name: tT,
    tokens: iT,
    percentage: iT / b * 100
  });
  let lT = [...w, ...B],
    N = D + M;
  if (lT.length > 0) {
    let F = null,
      E = R.env?.initial?.trees?.find(X => X.uri !== void 0)?.uri ?? null;
    if (E) F = E;else {
      let X = await m0(T.configService.workspaceRoot, a);
      if (X) F = d0(X);
    }
    let U = {
        workspaceFolders: F ? [F] : null,
        isWindows: JS().os === "windows",
        homeDir: T.configService.homeDir ? d0(T.configService.homeDir) : void 0
      },
      Z = lT.map(X => ({
        name: Mr(X.uri, U),
        tokens: X.tokens,
        percentage: X.tokens / b * 100
      }));
    TT.push({
      name: "AGENTS.md files",
      tokens: N,
      percentage: N / b * 100,
      children: Z
    });
  }
  if (k.length > 0) {
    let F = oT.map(E => ({
      name: E.server,
      tokens: E.tokens,
      percentage: E.tokens / b * 100
    }));
    TT.push({
      name: "MCP tools",
      tokens: aT,
      percentage: aT / b * 100,
      children: F.length > 1 ? F : void 0
    });
  }
  if (R.messages.length > 0) TT.push({
    name: "Messages",
    tokens: Q,
    percentage: Q / b * 100
  });
  let q = Math.max(0, b - j);
  return {
    model: o,
    modelDisplayName: m,
    maxContextTokens: b,
    sections: TT,
    totalTokens: j,
    freeSpace: q,
    toolCounts: {
      builtin: P.length,
      mcp: k.length,
      toolbox: x.length,
      total: f.length
    }
  };
}
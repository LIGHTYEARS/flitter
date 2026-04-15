async function LO(T, R, {
  enableTaskList: a,
  enableTask: e,
  enableOracle: t,
  enableDiagnostics: r,
  enableChart: h = !0
}, {
  model: i,
  provider: c,
  agentMode: s
}, A) {
  if (IwR(T.serverStatus)) a = !0;
  let l = Boolean(R.mainThreadID),
    o = await m0(l ? T.toolService.getToolsForMode(s, l) : T.toolService.getTools(s), A),
    n = await Promise.all(o.filter(({
      enabled: I
    }) => I).filter(({
      spec: I
    }) => a || I.name !== db).filter(({
      spec: I
    }) => e || I.name !== Dt).filter(({
      spec: I
    }) => t || I.name !== tt).filter(({
      spec: I
    }) => h || I.name !== $D).map(async ({
      spec: I
    }) => {
      if (I.name === oc) return w7R(I, T.skillService);
      return I;
    }));
  if (c === "openai") {
    let I = new Set(R.activatedSkills?.map(S => S.name) ?? []);
    if (I.size > 0) {
      let S = new Set(n.map(j => j.name));
      for (let [j, d] of Object.entries(s7T)) if (I.has(d) && !S.has(j)) {
        let C = T.toolService.getToolSpec(j);
        if (C) n.push(C), S.add(j);
      }
      let O = await m0(T.toolService.tools, A);
      for (let {
        spec: j,
        enabled: d
      } of O) {
        if (!d) continue;
        if (j.meta?.deferred !== !0) continue;
        if (typeof j.source !== "object" || !("mcp" in j.source)) continue;
        let C = j.meta?.skillNames ?? [];
        if (C.length === 0) continue;
        if (!C.some(L => I.has(L))) continue;
        if (S.has(j.name)) continue;
        n.push(j), S.add(j.name);
      }
    }
  }
  a = n.some(I => I.name === db), e = n.some(I => I.name === Dt), t = n.some(I => I.name === tt), r = n.some(I => I.name === YS), h = n.some(I => I.name === $D);
  let p = await T.configService.getLatest(),
    _ = p.settings["experimental.autoSnapshot"] ?? !1,
    m = gwR(T.serverStatus) ? p.settings.systemPrompt : void 0,
    b = qt(s),
    y = jwR({
      agentMode: s,
      model: i,
      provider: c
    }),
    u;
  switch (y) {
    case "aggman":
      u = V7R();
      break;
    case "free":
      u = TwR();
      break;
    case "rush":
      u = nwR({
        enableDiagnostics: r
      });
      break;
    case "gpt":
      u = twR();
      break;
    case "gpt-5-codex":
      u = hwR();
      break;
    case "deep":
      u = Y7R();
      break;
    case "internal":
      u = cwR();
      break;
    case "xai":
      u = AwR();
      break;
    case "kimi":
      u = swR({
        enableTaskList: a
      });
      break;
    case "gemini":
      u = awR({
        enableOracle: t,
        enableDiagnostics: r
      });
      break;
    default:
      u = Z7R({
        enableTaskList: a,
        enableTask: e,
        enableOracle: t,
        enableDiagnostics: r,
        enableAutoSnapshot: _,
        enableChart: h
      });
      break;
  }
  if (m) u = m;
  let P = [];
  if (y !== "aggman") P = (await fwR(T, R, s, A)).blocks;else P = xwR(R, T.serverStatus);
  let k = [];
  if (y === "default") k.push({
    type: "text",
    text: OwR
  });
  let x = [{
      type: "text",
      text: u,
      cache_control: {
        type: "ephemeral",
        ttl: "1h"
      }
    }, ...P, ...s7(k, "1h")],
    f = null,
    v = p.settings["internal.scaffoldCustomizationFile"];
  if (v) try {
    let I = await T.filesystem.readFile(zR.file(v), {
        signal: A
      }),
      S = SX.default.parse(I);
    f = W7R(S);
  } catch {
    let I = {
        systemPrompt: {
          type: "replaceAll",
          value: x.map(({
            text: O
          }) => O)
        },
        enableToolSpecs: n.map(({
          name: O
        }) => ({
          name: O
        })),
        disableTools: []
      },
      S = SX.default.stringify(I, {
        lineWidth: 0,
        blockQuote: "literal"
      });
    await (T.writeFile ?? SwR)(v, S);
  }
  if (f) {
    let I = f ? q7R(n, f) : n,
      S = x;
    if (f.systemPrompt) {
      let j = (typeof f.systemPrompt.value === "string" ? [f.systemPrompt.value] : f.systemPrompt.value).map(d => ({
        type: "text",
        text: d
      }));
      switch (f.systemPrompt.type) {
        case "replaceAll":
          S = j;
          break;
        case "replaceBase":
          S = [...j, ...P, ...k];
          break;
      }
    }
    let O = await kmT(u, P, k, S, I);
    return xmT(R.id, O, {
      basePrompt: u,
      contextComponents: P,
      additionalComponents: k,
      finalBlocks: S,
      tools: I
    }, {
      model: i,
      provider: c,
      agentMode: s,
      isFreeMode: b,
      basePromptType: y,
      enableTask: e,
      enableOracle: t,
      enableDiagnostics: r,
      hasScaffoldCustomization: !0,
      scaffoldCustomizationType: f.systemPrompt?.type
    }), {
      systemPrompt: s7(S),
      tools: I
    };
  }
  let g = await kmT(u, P, k, x, n);
  return xmT(R.id, g, {
    basePrompt: u,
    contextComponents: P,
    additionalComponents: k,
    finalBlocks: x,
    tools: n
  }, {
    model: i,
    provider: c,
    agentMode: s,
    isFreeMode: b,
    basePromptType: y,
    enableTask: e,
    enableOracle: t,
    enableDiagnostics: r,
    hasScaffoldCustomization: !1,
    scaffoldCustomizationType: void 0
  }), {
    systemPrompt: x,
    tools: n
  };
}
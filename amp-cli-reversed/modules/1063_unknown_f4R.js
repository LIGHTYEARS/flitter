function x4R(T) {
  return {
    id: T.id,
    created: T.created,
    v: T.v,
    messages: [],
    agentMode: T.agentMode,
    activatedSkills: T.activatedSkills,
    env: T.env
  };
}
async function f4R(T, R, a, e, t, r, h, i) {
  let c = performance.now(),
    s = _IR(T),
    A = L7T(s),
    l = T.env?.initial;
  if (!l) throw Error("Thread environment not available for handoff");
  let o = {
      workspaceFolders: l.trees?.map(B => B.uri).filter(B => B !== void 0) ?? null,
      isWindows: l.platform?.os === "windows"
    },
    n = await e.getLatest(t),
    {
      model: p
    } = pn(n.settings, T),
    _ = dn(p),
    m = $h(T),
    b = _.contextWindow - _.maxOutputTokens,
    {
      provider: y
    } = RO(p),
    u;
  if (m && m.totalInputTokens >= b) J.info("Thread input tokens exceed model context limit, falling back to Gemini", {
    threadId: T.id,
    model: p,
    totalInputTokens: m.totalInputTokens,
    maxInputTokens: b,
    fallbackModel: eP
  }), u = eP;
  if (!u && y === "fireworks") J.info("Handoff tool not supported by provider, falling back to Gemini", {
    threadId: T.id,
    model: p,
    provider: y,
    fallbackModel: eP
  }), u = eP;
  let P = u ? x4R(T) : A,
    k = uIR(R),
    x = o.workspaceFolders?.map(B => zR.parse(B)) ?? [],
    f = await b4R({
      userGoal: R,
      images: a,
      thread: A,
      threadForModel: P,
      configService: e,
      signal: t,
      modelOverride: u,
      deadline: h,
      serviceAuthToken: i
    }),
    v;
  if (typeof f.relevantFiles === "string") v = f.relevantFiles.split(`
`).map(B => B.trim()).filter(Boolean);else v = f.relevantFiles ?? [];
  let g = kAT(v, x),
    I = kAT(k, x),
    S = [...new Set([...I, ...g])].slice(0, kIR),
    O,
    j,
    d;
  if (r) {
    let B = await PIR(S, r, o);
    O = B.filesToMention, j = B.filesAsPlainPaths, d = B.totalEstimatedTokens;
  } else O = S, j = [], d = 0;
  let C = performance.now() - c;
  J.debug("Thread handoff prepared", {
    threadId: T.id,
    goalLength: R.length,
    relevantInformationLength: f.relevantInformation?.length ?? 0,
    mentionedFileCount: I.length,
    returnedFileCount: v.length,
    resolvedFileCount: g.length,
    filesToMentionCount: O.length,
    filesAsPlainPathsCount: j.length,
    estimatedTokens: d,
    tokenBudget: DwT,
    durationMs: Math.round(C)
  });
  let L = yIR(O, o).join(" "),
    w = [];
  if (w.push(`Continuing work from thread ${T.id}. When you lack specific information you can use read_thread to get it.`), L) w.push(L);
  if (j.length > 0) w.push(`Other relevant files: ${j.join(", ")}`);
  if (f.relevantInformation) w.push(f.relevantInformation);
  w.push(R);
  let D = w.join(`

`);
  if (a.length > 0) return [{
    type: "text",
    text: D
  }, ...a];
  return D;
}
function _4R(T) {
  let R = m4R * y4R ** T,
    a = Math.min(R, u4R),
    e = a * P4R * (Math.random() * 2 - 1);
  return Math.round(a + e);
}
async function b4R({
  userGoal: T,
  images: R,
  thread: a,
  threadForModel: e,
  configService: t,
  signal: r,
  modelOverride: h,
  deadline: i,
  serviceAuthToken: c
}) {
  let s = h === eP ? KN(a) : void 0,
    A = s ? `
Below is the thread rendered as markdown for context:

BEGIN THREAD MARKDOWN
${s}
END THREAD MARKDOWN
` : "",
    l = `${xUT}

${T}${A}

Use the create_handoff_context tool to extract relevant information and files.`;
  J.debug("Calling model for handoff", {
    threadId: a.id,
    modelOverride: h,
    goalLength: T.length
  });
  let o = performance.now(),
    n;
  for (let p = 0; p < U5; p++) {
    if (i && p > 0) {
      let _ = i - Date.now();
      if (_ < 1e4) {
        J.warn("Handoff retry skipped, insufficient time remaining", {
          threadId: a.id,
          attempt: p,
          remainingMs: _
        });
        break;
      }
    }
    try {
      let _ = await c4R({
        thread: e,
        userPromptText: l,
        systemPrompt: "",
        images: R,
        toolSpec: fUT,
        configService: t,
        signal: r,
        modelOverride: h,
        serviceAuthToken: c
      });
      return J.debug("Model call for handoff completed", {
        threadId: a.id,
        durationMs: Math.round(performance.now() - o),
        attempt: p
      }), _.toolCall;
    } catch (_) {
      if (n = _, xr(_)) throw _;
      let m = p === U5 - 1;
      if (!p4R(_) || m) throw _;
      let b = _4R(p),
        y = i ? Math.min(b, i - Date.now() - 5000) : b;
      if (y <= 0) throw J.warn("Handoff retry skipped, deadline exceeded", {
        threadId: a.id,
        attempt: p + 1
      }), _;
      J.warn("Handoff model call failed, retrying with backoff", {
        threadId: a.id,
        attempt: p + 1,
        maxRetries: U5,
        delayMs: y,
        error: _ instanceof Error ? _.message : String(_)
      }), await wP(y, r);
    }
  }
  throw n;
}
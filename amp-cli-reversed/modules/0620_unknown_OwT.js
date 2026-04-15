function hIR(T) {
  return typeof T === "object" && T !== null && "type" in T && "message" in T && typeof T.type === "string" && typeof T.message === "string";
}
function iIR(T) {
  if (hIR(T)) {
    if (T.type === "invalid_request_error" && T.message.toLowerCase().includes("prompt is too long")) return new rp();
  }
  return T;
}
class OwT {
  async *stream({
    model: T,
    thread: R,
    systemPrompt: a,
    tools: e,
    configService: t,
    signal: r,
    serviceAuthToken: h,
    requestHeaders: i,
    reasoningEffort: c,
    logger: s
  }) {
    let A = Ur(s),
      l = k8T(R, {
        agentMode: "default",
        logger: A
      }),
      o = P8T(h),
      n = await ep({
        configService: t
      }, r, o ? {
        defaultHeaders: o
      } : void 0),
      p = await t.getLatest(r),
      _ = c === "none" ? {
        ...p.settings,
        "anthropic.thinking.enabled": !1
      } : p.settings,
      m = _["anthropic.thinking.enabled"] ?? !0,
      b = T,
      y = tp(b),
      {
        agentMode: u
      } = pn(p.settings, R),
      P = {
        id: R.id,
        agentMode: u
      },
      k = x8T(u, b),
      x = TU(b, {
        enableLargeContext: k
      }),
      f = R.maxTokens ?? LwT,
      v = {
        model: y,
        max_tokens: f,
        messages: O8(f8T(l)),
        system: a,
        tools: kO(e),
        stream: !0
      },
      g = m ? jwT(l) : 0;
    if (m) v.thinking = {
      type: "enabled",
      budget_tokens: g
    };
    if (b.includes("eap")) v.thinking = {
      type: "adaptive"
    }, v.output_config = {
      effort: ["low", "medium", "high", "max"].includes(c) ? c : "high"
    };
    if (p.settings["anthropic.speed"] === "fast" && uK(b, {
      enableLargeContext: k
    })) v.speed = "fast";
    let I = p.settings["anthropic.temperature"];
    if (I !== void 0 && !m) v.temperature = I;
    let S = n.messages.stream(v, {
        signal: r,
        maxRetries: 0,
        headers: {
          ...JN(_, P, b, _m(R)?.messageId, {
            enableLargeContext: k
          }),
          ...(i ?? {}),
          ...(o ?? {})
        }
      }),
      O = new Map();
    for await (let j of S) {
      if (j.type === "content_block_start") {
        let d = Date.now();
        O.set(j.index, {
          ...O.get(j.index),
          startTime: O.get(j.index)?.startTime ?? d
        });
      }
      if (j.type === "content_block_stop") {
        let d = Date.now();
        O.set(j.index, {
          startTime: O.get(j.index)?.startTime ?? d,
          finalTime: d
        });
      }
      if (S.currentMessage) yield PAT(S.currentMessage, x, A, O);
    }
    yield PAT(await S.finalMessage(), x, A, O);
  }
}
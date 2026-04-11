// Module: web-streams-polyfill
// Original: segment1[632797:724797]
// Type: Scope-hoisted
// Exports: t4R, bUT, mUT, h4R, x3T, i4R, uUT, yUT, PUT, c4R, s4R, o4R, n4R, l4R, wP, p4R, _4R, b4R, x4R, f4R
// Category: util

t_index] = R.part
}
else throw Error(`unexpected content_part.added for output ${r.type}: ${R.part.type}`);
break
}
case "response.content_part.done": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "message") {
    if (!r.content[R.content_index]) throw Error(`missing content at index ${R.content_index}`);
    if (R.part.type === "output_text" || R.part.type === "refusal") r.content[R.content_index] = R.part;
    else throw Error(`unexpected content_part.done for message: ${R.part.type}`)
  } else if (r.type === "reasoning" && R.part.type === "reasoning_text") {
    if (!r.content) r.content = [];
    r.content[R.content_index] = R.part
  } else throw Error(`unexpected content_part.done for output ${r.type}: ${R.part.type}`);
  break
}
case "response.output_text.delta": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "message") {
    let h = r.content[R.content_index];
    if (!h) throw Error(`missing content at index ${R.content_index}`);
    if (h.type !== "output_text") throw Error(`expected content to be 'output_text', got ${h.type}`);
    h.text += R.delta
  } else throw Error(`unexpected output for output_text.delta: ${r.type}`);
  break
}
case "response.output_text.done": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "message") {
    let h = r.content[R.content_index];
    if (!h) throw Error(`missing content at index ${R.content_index}`);
    if (h.type !== "output_text") throw Error(`expected content to be 'output_text', got ${h.type}`);
    h.text = R.text
  } else throw Error(`unexpected output for output_text.done: ${r.type}`);
  break
}
case "response.reasoning_text.delta": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "reasoning") {
    let h = r.content?.[R.content_index];
    if (!h) throw Error(`missing content at index ${R.content_index}`);
    if (h.type !== "reasoning_text") throw Error(`expected content to be 'reasoning_text', got ${h.type}`);
    h.text += R.delta
  } else throw Error(`unexpected output for reasoning_text.delta: ${r.type}`);
  break
}
case "response.reasoning_text.done": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "reasoning") {
    if (!r.content) r.content = [];
    let h = r.content[R.content_index];
    if (!h) throw Error(`missing content at index ${R.content_index}`);
    if (h.type !== "reasoning_text") throw Error(`expected content to be 'reasoning_text', got ${h.type}`);
    h.text = R.text
  } else throw Error(`unexpected output for reasoning_text.done: ${r.type}`);
  break
}
case "response.reasoning_summary_text.delta": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "reasoning") {
    let h = r.summary[R.summary_index];
    if (!h) throw Error(`missing summary at index ${R.summary_index}`);
    if (h.type !== "summary_text") throw Error(`expected summary to be 'summary_text', got ${h.type}`);
    h.text += R.delta
  } else throw Error(`unexpected output for reasoning_summary_text.delta: ${r.type}`);
  break
}
case "response.reasoning_summary_part.added": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "reasoning") r.summary[R.summary_index] = R.part;
  else throw Error(`unexpected output for reasoning_summary_part.added: ${r.type}`);
  break
}
case "response.reasoning_summary_part.done": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "reasoning") r.summary[R.summary_index] = R.part;
  else throw Error(`unexpected output for reasoning_summary_part.done: ${r.type}`);
  break
}
case "response.reasoning_summary_text.done": {
  let r = t.output[R.output_index];
  if (!r) throw Error(`missing output at index ${R.output_index}`);
  if (r.type === "reasoning") {
    let h = r.summary[R.summary_index];
    if (!h) throw Error(`missing summary at index ${R.summary_index}`);
    h.text = R.text
  } else throw Error(`unexpected output for reasoning_summary_text.done: ${r.type}`);
  break
}
case "response.completed": {
  e.info("[openai-responses] response.completed", {
    responseId: R.response.id,
    model: R.response.model,
    status: R.response.status,
    outputCount: R.response.output.length
  });
  let r = t[Mo];
  return r ? Object.assign({}, R.response, {
    [Mo]: r.map((h) => h ? {
        ...h
      } :
      h)
  }) : R.response
}
case "response.failed": {
  e.error("[openai-responses] response.failed", {
    responseId: R.response.id,
    model: R.response.model,
    status: R.response.status
  });
  let r = t[Mo];
  return r ? Object.assign({}, R.response, {
    [Mo]: r.map((h) => h ? {
        ...h
      } :
      h)
  }) : R.response
}
case "response.incomplete": {
  e.warn("[openai-responses] response.incomplete", {
    responseId: R.response.id,
    model: R.response.model,
    status: R.response.status,
    reason: R.response.incomplete_details?.reason
  });
  let r = t[Mo];
  return r ? Object.assign({}, R.response, {
    [Mo]: r.map((h) => h ? {
        ...h
      } :
      h)
  }) : R.response
}
case "error": {
  let r = R;
  throw Error(`OpenAI stream error (${r.code}): ${r.message}`)
}
case "response.in_progress": case "response.refusal.delta": case "response.refusal.done": break;
default: e.info("[openai-responses] Unhandled stream event type", {
eventType: R.type
})
}
})
}

function t4R(T) {
  return T.filter((R) => R.type !== "thinking" && R.type !== "redacted_thinking")
}

function bUT(T) {
  let R = new Set;
  return T.filter((a) => {
    if (R.has(a.name)) return !1;
    return R.add(a.name), !0
  }).map((a) => ({
    type: "function",
    function: {
      name: a.name,
      description: a.description ?? "",
      parameters: a.inputSchema
    }
  }))
}
async function mUT(T, R, a, e, t, r, h, i, c, s, A) {
  let l = await uUT(r, h, s),
    o = [{
      role: "system",
      content: a
    }, ...T],
    n = {
      model: t,
      messages: o,
      tools: bUT(R),
      temperature: 0.7,
      top_p: 0.95,
      stream: !1,
      ...c && {
        tool_choice: c
      }
    };
  try {
    return {
      message: await l.chat.completions.create(n, {
        signal: h,
        headers: {
          ...yUT(e, i),
          ...A ?? {}
        }
      })
    }
  } catch (p) {
    if (xr(p)) throw new DOMException("Aborted", "AbortError");
    throw J.error("xAI API call failed", {
      model: t,
      error: p instanceof Error ? p.message : String(p),
      status: p?.status,
      code: p?.code,
      type: p?.type
    }), J.error("xAI API call failed", {
      model: t,
      error: p instanceof Error ? p.message : String(p),
      params: {
        ...n,
        messages: n.messages.map((_) => ({
          ..._,
          content: typeof _.content === "string" ? _.content.substring(0, 100) + "..." : _.content
        }))
      }
    }), PUT(p)
  }
}
async function* r4R(T, R, a, e, t, r, h, i, c, s) {
  let A = await uUT(r, h, c),
    l = [{
      role: "system",
      content: a
    }, ...T],
    o = {
      model: t,
      messages: l,
      tools: bUT(R),
      stream: !0,
      stream_options: {
        include_usage: !0
      }
    };
  try {
    yield* await A.chat.completions.create(o, {
      signal: h,
      headers: {
        ...yUT(e, i),
        ...s ?? {}
      }
    })
  } catch (n) {
    if (xr(n)) throw new DOMException("Aborted", "AbortError");
    throw PUT(n)
  }
}

function h4R(T) {
  if (T.status === "done") return typeof T.result === "string" ? T.result : JSON.stringify(T.result);
  else if (T.status === "error") return `<tool_execution_error>${T.error?.message||"Unknown error"}</tool_execution_error>`;
  else if (T.status === "cancelled") return "<tool_call_cancelled>Tool call was cancelled by the user</tool_call_cancelled>";
  else if (T.status === "rejected-by-user") return "<tool_rejection>User rejected the tool call, disallowing it from running</tool_rejection>";
  else return `<tool_status>${T.status}</tool_status>`
}

function x3T(T) {
  let R = [],
    {
      summaryBlock: a,
      index: e
    } = pm(T) ?? {
      summaryBlock: void 0,
      index: 0
    };
  if (a && a.summary.type === "message") R.push({
    role: "assistant",
    content: [{
      type: "text",
      text: a.summary.summary.trimEnd()
    }]
  });
  for (let t = e + (a ? 1 : 0); t < T.messages.length; t++) {
    let r = T.messages[t];
    if (!r) continue;
    switch (r.role) {
      case "user": {
        let h = [],
          i = [];
        if (r.fileMentions && r.fileMentions.files.length > 0) h.push({
          type: "text",
          text: $m(r.fileMentions)
        });
        if (r.userState) h.push({
          type: "text",
          text: Ox(r.userState)
        });
        for (let c of r.content) switch (c.type) {
          case "tool_result":
            i.push({
              role: "tool",
              content: h4R(c.run),
              tool_call_id: c.toolUseID.replace(/^toolu_/, "")
            });
            break;
          case "image":
            break;
          case "text":
            if (c.text.trim()) h.push({
              type: "text",
              text: c.text
            });
            break
        }
        if (h.length > 0) R.push({
          role: "user",
          content: h
        });
        R.push(...i);
        break
      }
      case "assistant": {
        let h = t4R(r.content).filter((c) => c.type === "text").map((c) => ({
            type: "text",
            text: c.text
          })),
          i = r.content.filter((c) => c.type === "tool_use").map((c) => ({
            id: c.id.replace(/^toolu_/, ""),
            type: "function",
            function: {
              name: c.name,
              arguments: JSON.stringify(c.input)
            }
          }));
        if (h.length > 0 || i.length > 0) R.push({
          role: "assistant",
          content: h.length > 0 ? h : null,
          tool_calls: i.length > 0 ? i : void 0
        });
        break
      }
      case "info": {
        let h = [];
        for (let i of r.content)
          if (i.type === "manual_bash_invocation") {
            let c = dx(i);
            h.push(...c)
          }
        else if (i.type === "text" && i.text.trim().length > 0) h.push({
          type: "text",
          text: i.text
        });
        if (h.length > 0) R.push({
          role: "user",
          content: h
        });
        break
      }
    }
  }
  return JA(R)
}

function i4R(T, R) {
  let a = T.pipe(L9((e) => gh((async () => {
    let t = await e.secrets.getToken("apiKey", e.settings.url);
    return {
      url: e.settings.url,
      apiKey: t
    }
  })())), E9((e, t) => e.url === t.url && e.apiKey === t.apiKey), JR(({
    url: e,
    apiKey: t
  }) => {
    if (!t) throw Error("API key not found. You must provide an API key in settings.");
    return new _9({
      apiKey: t,
      baseURL: new URL("/api/provider/xai/v1", e).toString(),
      defaultHeaders: R
    })
  }));
  return R ? a : a.pipe(f3({
    shouldCountRefs: !0
  }))
}

function uUT(T, R, a) {
  return m0(i4R(T.configService.config, a?.defaultHeaders), R)
}

function yUT(T, R) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...R != null ? {
      [zA]: String(R)
    } :
    {},
    "x-grok-conv-id": T.id,
    ...Vs(T)
  }
}

function PUT(T) {
  let R = T?.message;
  if (typeof R === "string") {
    if (R.includes("This model's maximum prompt length is") && R.includes("but the request contains") && R.includes("tokens.")) return new rp("Token limit exceeded.")
  }
  return T
}
class kUT {
  async * stream({
    model: T,
    thread: R,
    systemPrompt: a,
    tools: e,
    configService: t,
    signal: r,
    serviceAuthToken: h
  }) {
    let i = e,
      c = x3T(R),
      s = Js(h),
      A = r4R(c, i, a.map((n) => n.text).join(`

`), R, T, {
          configService: t
        }, r, _m(R)?.messageId, s ? {
          defaultHeaders: s
        } :
        void 0, s),
      l = Ys(`xai/${T}`),
      o;
    for await (let n of A) if (o = SO(o, n), o) yield $k(o, l)
  }
}
async function c4R(T) {
  let {
    thread: R,
    userPromptText: a,
    systemPrompt: e,
    images: t,
    toolSpec: r,
    configService: h,
    signal: i,
    modelOverride: c,
    serviceAuthToken: s
  } = T, A = await h.getLatest(i), {
    model: l,
    agentMode: o
  } = pn(A.settings, R), n = c ?? l, [p] = n.split("/"), _ = Xt(n);
  J.debug("Running tool with model", {
    threadId: R.id,
    model: n,
    provider: p,
    modelName: _,
    toolName: r.name
  });
  let m = L7T(R);
  switch (p) {
    case "anthropic":
      return o4R(m, a, t, e, r, _, o, h, i, s);
    case "xai":
      return l4R(m, a, e, r, _, o, h, i, s);
    case "openai":
      return n4R(m, a, t, e, r, _, o, h, i, s);
    case "vertexai":
      return s4R(m, a, t, e, r, _, o, h, i, s);
    case "openrouter":
    case "groq":
    case "moonshotai":
    case "cerebras":
    default:
      throw Error(`Unsupported provider for handoff: ${p}`)
  }
}
async function s4R(T, R, a, e, t, r, h, i, c, s) {
  let A = [...rNT(T)],
    l = [{
      text: R
    }];
  for (let m of a)
    if (m.source.type === "base64" && "mediaType" in m.source && "data" in m.source) l.push({
      inlineData: {
        mimeType: m.source.mediaType,
        data: m.source.data
      }
    });
  let o = A.at(-1);
  if (o?.role === "user") {
    if (!o.parts) o.parts = [];
    o.parts.push(...l)
  } else A.push({
    role: "user",
    parts: l
  });
  let n = await i.getLatest(c),
    p = await gO(r, A, [t], {
      id: T.id,
      agentMode: h
    }, n, c, {
      temperature: 0.1,
      systemInstruction: e,
      toolConfig: {
        functionCallingConfig: {
          mode: NK.ANY
        }
      }
    }, void 0, s),
    _ = p.message.functionCalls?.at(0);
  if (_?.name !== t.name) throw Error(`expected tool args for tool ${t.name}`);
  return {
    toolCall: _.args,
    "~debugUsage": p["~debugUsage"]
  }
}
async function o4R(T, R, a, e, t, r, h, i, c, s) {
  let A = P8T(s),
    l = await ep({
        configService: i
      }, c, A ? {
        defaultHeaders: A
      } :
      void 0),
    o = k8T(T),
    n = [{
      type: "text",
      text: R
    }];
  for (let y of a)
    if (y.source.type === "base64" && "mediaType" in y.source && "data" in y.source) n.push({
      type: "image",
      source: {
        type: "base64",
        media_type: y.source.mediaType,
        data: y.source.data
      }
    });
  let p = [...o, {
      role: "user",
      content: n
    }],
    _ = await i.getLatest(c),
    m = await l.messages.create({
      model: r,
      max_tokens: 4096,
      system: e,
      messages: p,
      tools: kO([t]),
      tool_choice: {
        type: "tool",
        name: t.name
      }
    }, {
      signal: c,
      headers: {
        ...JN(_.settings, {
          id: T.id,
          agentMode: h
        }, r),
        ...A ?? {}
      }
    }),
    b = m.content.find((y) => y.type === "tool_use" && y.name === t.name);
  if (!b) throw Error(`Expected tool call for ${t.name} but none found`);
  return {
    toolCall: b.input,
    "~debugUsage": {
      model: r,
      maxInputTokens: TU(r, {
        enableLargeContext: x8T(h, r)
      }),
      inputTokens: m.usage.input_tokens,
      outputTokens: m.usage.output_tokens,
      cacheCreationInputTokens: m.usage.cache_creation_input_tokens ?? null,
      cacheReadInputTokens: m.usage.cache_read_input_tokens ?? null,
      totalInputTokens: m.usage.input_tokens,
      timestamp: new Date().toISOString()
    }
  }
}
async function n4R(T, R, a, e, t, r, h, i, c, s) {
  let A = Js(s),
    l = await uU({
        configService: i
      }, c, A ? {
        defaultHeaders: A
      } :
      void 0),
    o = P3T(T),
    n = [{
      type: "input_text",
      text: R
    }];
  for (let x of a)
    if (x.source.type === "base64" && "mediaType" in x.source && "data" in x.source) n.push({
      type: "input_image",
      detail: "auto",
      image_url: `data:${x.source.mediaType};
base64,${x.source.data}`
    });
  let p = [{
      role: "system",
      content: e
    }, ...o, {
      role: "user",
      content: n
    }],
    _ = {
      ...t.inputSchema,
      additionalProperties: !1
    },
    m = await l.responses.create({
      model: r,
      input: p,
      text: {
        format: {
          type: "json_schema",
          name: t.name,
          strict: !0,
          schema: _
        }
      },
      store: !1
    }, {
      signal: c,
      headers: {
        ...m3T({
          id: T.id,
          agentMode: h
        }, void 0),
        ...A ?? {}
      }
    }),
    b = m.output?.find((x) => x.type === "message");
  if (!b || b.type !== "message") throw Error("Expected message output but none found");
  let y = b.content?.find((x) => x.type === "output_text");
  if (!y || y.type !== "output_text") throw Error("Expected output_text content in response");
  let u;
  try {
    u = JSON.parse(y.text)
  } catch (x) {
    let f = y.text?.slice?.(0, 200) ?? "";
    throw Error(`Response was not valid JSON for ${t.name} (preview: ${f}...)`)
  }
  let P = m.usage?.input_tokens_details?.cached_tokens ?? 0,
    k = (m.usage?.input_tokens ?? 0) - P;
  return {
    toolCall: u,
    "~debugUsage": {
      model: r,
      maxInputTokens: Ys(`openai/${r}`),
      inputTokens: m.usage?.input_tokens ?? 0,
      outputTokens: m.usage?.output_tokens ?? 0,
      cacheCreationInputTokens: k,
      cacheReadInputTokens: P,
      totalInputTokens: m.usage?.input_tokens ?? 0,
      timestamp: new Date().toISOString()
    }
  }
}
async function l4R(T, R, a, e, t, r, h, i, c) {
  let s = x3T(T),
    A = [{
      type: "text",
      text: R
    }],
    l = [...s, {
      role: "user",
      content: A
    }],
    o = Js(c),
    n = await mUT(l, [e], a, {
        id: T.id,
        agentMode: r
      }, t, {
        configService: h
      }, i, void 0, {
        type: "function",
        function: {
          name: e.name
        }
      }, o ? {
        defaultHeaders: o
      } :
      void 0, o),
    p = n.message?.choices?.[0]?.message?.tool_calls?.[0];
  if (!p || p.function.name !== e.name) throw Error(`Expected tool call for ${e.name} but none found`);
  let _;
  try {
    _ = JSON.parse(p.function.arguments)
  } catch (m) {
    let b = p.function.arguments?.slice?.(0, 200) ?? "";
    throw Error(`Tool call arguments for ${e.name} were not valid JSON (preview: ${b}...)`)
  }
  return {
    toolCall: _,
    "~debugUsage": {
      model: t,
      maxInputTokens: Ys(`xai/${t}`),
      inputTokens: n.message?.usage?.prompt_tokens ?? 0,
      outputTokens: n.message?.usage?.completion_tokens ?? 0,
      cacheCreationInputTokens: null,
      cacheReadInputTokens: null,
      totalInputTokens: n.message?.usage?.prompt_tokens ?? 0,
      timestamp: new Date().toISOString()
    }
  }
}

function wP(T, R) {
  return new Promise((a, e) => {
    if (R?.aborted) return e(R.reason);
    let t = setTimeout(a, T);
    R?.addEventListener("abort", () => {
      clearTimeout(t), e(R.reason)
    }, {
      once: !0
    })
  })
}

function p4R(T) {
  if (!(T instanceof Error)) return !1;
  let R = T.message.toLowerCase();
  return R.includes("429") || R.includes("resource_exhausted") || R.includes("rate limit") || R.includes("too many requests") || R.includes("overloaded")
}

function _4R(T) {
  let R = m4R * y4R ** T,
    a = Math.min(R, u4R),
    e = a * P4R * (Math.random() * 2 - 1);
  return Math.round(a + e)
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
        break
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
      }), _.toolCall
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
      }), await wP(y, r)
    }
  }
  throw n
}

function x4R(T) {
  return {
    id: T.id,
    created: T.created,
    v: T.v,
    messages: [],
    agentMode: T.agentMode,
    activatedSkills: T.activatedSkills,
    env: T.env
  }
}
async function f4R(T, R, a, e, t, r, h, i) {
  let c = performance.now(),
    s = _IR(T),
    A = L7T(s),
    l = T.env?.initial;
  if (!l) throw Error("Thread environment not available for handoff");
  let o = {
      workspaceFolders: l.trees?.map((B) => B.uri).filter((B) => B !== void 0) ?? null,
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
    x = o.workspaceFolders?.map((B) => zR.parse(B)) ?? [],
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
`).map((B) => B.trim()).filter(Boolean);
  else v = f.relevantFiles ?? [];
  let g = kAT(v, x),
    I = kAT(k, x),
    S = [...new Set([...I, ...g])].slice(0, kIR),
    O, j, d;
  if (r) {
    let B = await PIR(S, r, o);
    O = B.filesToMention, j = B.filesAsPlainPaths, d = B.totalEstimatedTokens
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
  return D
}

function g4R(T) {
  if (!T.goal || T.goal.trim().length === 0) throw Error("Handoff goal must be provided");
  if (!T.thread) throw Error("Handoff thread must be provided")
}
async function $4R(T) {
  g4R(T);
  let {
    thread: R,
    goal: a,
    images: e,
    deps: t
  } = T, r = await f4R(R, a, e, t.configService, t.signal, t.filesystem, t.deadline, t.serviceAuthToken);
  return {
    role: "user",
    messageId: 0,
    content: Array.isArray(r) ? r : [{
      type: "text",
      text: r
    }]
  }
}
async function O4R(T, R, a) {
  try {
    let e = (await T.get(R))?.meta;
    if (!e || typeof e !== "object") {
      J.debug("Origin thread has no metadata to inherit", {
        name: "inheritThreadVisibility",
        originThreadID: R,
        forkedThreadID: a
      });
      return
    }
    let t = "visibility" in e ? e.visibility : void 0;
    if (t !== "private" && t !== "thread_workspace_shared" && t !== "public_unlisted" && t !== "public_discoverable") {
      J.debug("Origin thread has no shareable visibility metadata", {
        name: "inheritThreadVisibility",
        originThreadID: R,
        forkedThreadID: a,
        metadata: e
      });
      return
    }
    let r = "sharedGroupIDs" in e && Array.isArray(e.sharedGroupIDs) ? e.sharedGroupIDs.filter((i) => typeof i === "string") : [],
      h = t === "private" ? {
        visibility: t,
        sharedGroupIDs: r
      } :
      {
        visibility: t
      };
    await T.updateThreadMeta(a, h), J.debug("Successfully inherited thread visibility", {
      name: "inheritThreadVisibility",
      originThreadID: R,
      forkedThreadID: a,
      metadata: e
    })
  } catch (e) {
    J.debug("Failed to inherit thread visibility settings", {
      name: "inheritThreadVisibility",
      error: e,
      originThreadID: R,
      forkedThreadID: a
    })
  }
}

function f3T(T, R) {
  let a = T && R?.state === "active" && R.inferenceState !== "running" ? E4R(T) : {
      running: 0,
      blocked: 0
    },
    e = R?.state === "active" ? R.handoff : void 0;
  return {
    ...R,
    interactionState: T && R?.state === "active" ? IUT(T, R.inferenceState, e) : !1,
    toolState: a
  }
}

function E4R(T) {
  let R = T.messages.at(-1);
  if (!R || R.role === "assistant") return {
    running: 0,
    blocked: 0
  };
  let a = 0,
    e = 0;
  for (let t of R.content) {
    if (t.type !== "tool_result") continue;
    let r = t.run.status;
    if (r === "in-progress") a++;
    else if (r === "blocked-on-user") e++
  }
  return {
    running: a,
    blocked: e
  }
}

function N7(T) {
  if (!T || T.state !== "active") return !1;
  return T.interactionState === "tool-running" || T.inferenceState === "running"
}

function IUT(T, R, a) {
  if (a && !a.result) return "handoff";
  if (R === "running" || R === "cancelled") return !1;
  let e = T.messages.at(-1);
  if (!e) return "user-message-initial";
  if (e.role === "assistant") return e.state.type === "complete" && e.state.stopReason === "end_turn" ? "user-message-reply" : !1;
  if (e.content.some((t) => t.type === "tool_result" && t.run.status === "blocked-on-user")) return "user-tool-approval";
  if (e.content.some((t) => t.type === "tool_result" && t.run.status === "in-progress")) return "tool-running";
  return !1
}
async function* C4R(T, R = 120000) {
  let a = T[Symbol.asyncIterator]();
  while (!0) {
    let e = null;
    try {
      let t = new Promise((h, i) => {
          e = setTimeout(() => {
            i(new I3T(R))
          }, R)
        }),
        r = await Promise.race([a.next(), t]);
      if (r.done) return;
      yield r.value
    } finally {
      if (e !== null) clearTimeout(e), e = null
    }
  }
}

function OO(T, R) {
  let a = T instanceof Date ? T.getTime() : T;
  return g3T(Date.now() - a, R)
}

function g3T(T, {
  approximate: R,
  verbose: a,
  future: e
} = {}) {
  if (e) T *= -1;
  if (R && T < 60000) return a ? "less than 1 minute" : "<1m";
  let t = Math.floor(T / 1000),
    r = Math.floor(t / 60),
    h = Math.floor(r / 60),
    i = Math.floor(h / 24),
    c = Math.floor(i / 30),
    s = [{
      value: Math.floor(c / 12),
      short: "y",
      long: "year"
    }, {
      value: c,
      short: "mo",
      long: "month"
    }, {
      value: i,
      short: "d",
      long: "day"
    }, {
      value: h,
      short: "h",
      long: "hour"
    }, {
      value: r,
      short: "m",
      long: "minute"
    }, {
      value: t,
      short: "s",
      long: "second"
    }];
  for (let A of s)
    if (A.value > 0) {
      if (a) return `${A.value} ${o9(A.value,A.long)}`;
      return `${A.value}${A.short}`
    }
  return a ? "0 seconds" : "0s"
}

function M4R(T, R = {}) {
  let {
    approximate: a = !0
  } = R;
  if (!a && T < 1000) return `${Math.max(0,Math.round(T))} ms`;
  let e = Math.max(0, Math.round(T / 1000)),
    t = Math.round(T / 1000 / 60);
  if (!a && T < 180000 || t === 0) return `${e} ${o9(e,"second")}`;
  let r = Math.floor(t / 1440),
    h = t % 1440,
    i = Math.floor(h / 60),
    c = h % 60,
    s = [];
  if (r > 0) s.push(`${r} ${r===1?"day":"days"}`);
  if (i > 0) s.push(`${i} ${i===1?"hour":"hours"}`);
  if (c > 0) s.push(`${c} ${c===1?"minute":"minutes"}`);
  if (s.length === 0) return "less than a minute";
  if (s.length === 1) return s[0];
  let A = s.pop();
  if (s.length > 1) return `${s.join(", ")}, and ${A}`;
  return `${s.join(", ")} and ${A}`
}

function D4R(T) {
  let R = Math.floor(T / 1000),
    a = Math.floor(R / 3600),
    e = Math.floor(R % 3600 / 60),
    t = R % 60;
  if (a > 0) return `${a}h ${e}m`;
  else if (e > 0) return `${e}m ${t}s`;
  return `${t}s`
}

function N4R(T) {
  return hET(U4R).pipe(Y3(void 0), f0T(() => Q9(T).pipe(Gl(H4R))), nET(), JR((R) => R instanceof Error ? null : R), vs(() => AR.of(null)))
}

function $3T(T) {
  return T.message.includes(W4R)
}

function dO(T) {
  let R = ["prompt is too long", "exceed context limit", "context limit reached", "token limit exceeded", "context window", "maximum context length"],
    a = (r) => {
      let h = r?.toLowerCase() ?? "";
      return R.some((i) => h.includes(i))
    },
    e = T.error?.type === "invalid_request_error" && a(T.error.message),
    t = a(T.message);
  return e || t
}

function q4R(T) {
  return T.message?.includes("You've reached the usage limit for 'free' mode") ?? !1
}

function z4R(T) {
  let R = (T.message?.includes("You've exceeded your usage quota of") ?? !1) || (T.message?.includes("You've exceeded your usage limit of") ?? !1),
    a = (T.error?.message?.includes("You've exceeded your usage quota of") ?? !1) || (T.error?.message?.includes("You've exceeded your usage limit of") ?? !1);
  return R || a
}

function v3T(T) {
  let R = ["unauthorized", "401"],
    a = R.some((t) => T.message?.toLowerCase().includes(t.toLowerCase())),
    e = Boolean(T.error?.message && R.some((t) => T.error?.message?.toLowerCase().includes(t.toLowerCase())));
  return a || e
}

function fU(T) {
  let R = ["overloaded", "overload"],
    a = R.some((r) => T.message?.toLowerCase().includes(r.toLowerCase())),
    e = Boolean(T.error?.message && R.some((r) => T.error?.message?.toLowerCase().includes(r.toLowerCase()))),
    t = T.error?.type === "overloaded_error";
  return a || e || t
}

function F4R(T) {
  let R = ["image exceeds", "MB maximum"],
    a = R.every((t) => T.message?.includes(t)),
    e = Boolean(T.error?.type === "invalid_request_error" && T.error?.message && R.every((t) => T.error?.message?.includes(t)));
  return a || e
}

function IU(T) {
  let R = T.message?.toLowerCase() ?? "",
    a = T.error?.message?.toLowerCase() ?? "";
  return ["stream stalled", "no data received for"].some((e) => R.includes(e) || a.includes(e))
}

function $UT(T) {
  let R = T.message?.toLowerCase() ?? "",
    a = T.error?.message?.toLowerCase() ?? "";
  return ["fetch failed", "failed to fetch", "enotfound", "econnrefused", "econnreset", "etimedout", "network request failed", "network error", "dns lookup failed", "getaddrinfo", "socket hang up", "connection refused", "unable to connect", "terminated", "other side closed"].some((e) => R.includes(e) || a.includes(e))
}

function G4R(T) {
  return T.status !== void 0 && T.status >= 500
}

function K4R(T) {
  return T.message.startsWith("InvalidModelOutputError")
}

function V4R(T) {
  let R = T.message?.toLowerCase() ?? "",
    a = T.error?.message?.toLowerCase() ?? "";
  return ["response incomplete", "stream ended unexpectedly", "stream closed before"].some((e) => R.includes(e) || a.includes(e))
}

function vUT(T) {
  return fU(T) || IU(T) || $UT(T) || G4R(T) || T.error?.type === "rate_limit_error" || T.status === 429 || K4R(T) || V4R(T)
}

function ev(T) {
  if (T.error?.message) return T.error.message;
  let R = T.message || "",
    a = R.match(/^(?:API error \(\d+\):|HTTP \d+:|Request failed: \d+\s+[^\s]+)\s+/),
    e = (a ? R.replace(a[0], "") : R).replace(/^\d+\s+/, "");
  if (e.includes('{"type":"error"') || e.includes('{"error":')) try {
    let t = JSON.parse(e);
    if (t.error?.message) return t.error.message
  }
  catch {}
  return e
}

function X4R(T) {
  return ev(T).endsWith("mode has been disabled by your workspace admin.")
}

function jUT(T, R) {
  if (T === "baseten") {
    if (R === "none") return {};
    return {
      chat_template_args: {
        enable_thinking: !0
      }
    }
  }
  return {
    reasoning_effort: R
  }
}

function Y4R(T, R) {
  let a = Ur(R);
  a.debug("Fireworks: converting native thread to Fireworks messages", {
    threadId: T.id,
    totalMessages: T.messages.length
  });
  let e = [],
    {
      summaryBlock: t,
      index: r
    } = pm(T) ?? {
      summaryBlock: void 0,
      index: 0
    };
  if (t && t.summary.type === "message") e.push({
    role: "assistant",
    content: [{
      type: "text",
      text: t.summary.summary.trimEnd()
    }]
  });
  let h = 0,
    i = 0,
    c = 0;
  for (let s = r + (t ? 1 : 0); s < T.messages.length; s++) {
    let A = T.messages[s];
    if (!A) continue;
    switch (A.role) {
      case "user": {
        let l = [],
          o = [];
        if (A.fileMentions && A.fileMentions.files.length > 0) l.push({
          type: "text",
          text: $m(A.fileMentions)
        });
        if (A.userState) l.push({
          type: "text",
          text: Ox(A.userState)
        });
        for (let n of A.content) switch (n.type) {
          case "tool_result":
            o.push({
              role: "tool",
              content: B7(n.run),
              tool_call_id: n.toolUseID.replace(/^toolu_/, "")
            });
            break;
          case "image": {
            let p = ZN(n);
            if (p) {
              l.push({
                type: "text",
                text: p
              });
              break
            }
            if (l.push({
                type: "text",
                text: PO(n)
              }), n.source.type === "url") l.push({
              type: "image_url",
              image_url: {
                url: n.source.url
              }
            });
            else if (n.source.type === "base64") l.push({
              type: "image_url",
              image_url: {
                url: `data:${n.source.mediaType};
base64,${n.source.data}`
              }
            });
            break
          }
          case "text":
            if (n.text.trim()) l.push({
              type: "text",
              text: n.text
            });
            break
        }
        if (l.length > 0) e.push({
          role: "user",
          content: l
        });
        e.push(...o), h++;
        break
      }
      case "assistant": {
        let l = A.content.filter((p) => p.type === "text").map((p) => ({
            type: "text",
            text: p.text
          })),
          o = A.content.filter((p) => p.type === "thinking").map((p) => p.thinking).filter((p) => p.trim().length > 0).join(`

`),
          n = A.content.filter((p) => p.type === "tool_use" && Va(p)).map((p) => ({
            id: p.id.replace(/^toolu_/, ""),
            type: "function",
            function: {
              name: p.name,
              arguments: JSON.stringify(p.input)
            }
          }));
        if (l.length > 0 || n.length > 0 || o.length > 0) e.push({
          role: "assistant",
          content: l.length > 0 ? l : null,
          reasoning_content: o.length > 0 ? o : void 0,
          tool_calls: n.length > 0 ? n : void 0
        }), i++;
        break
      }
      case "info": {
        let l = [];
        for (let o of A.content)
          if (o.type === "manual_bash_invocation") {
            let n = dx(o);
            l.push(...n)
          }
        else if (o.type === "text" && o.text.trim().length > 0) l.push({
          type: "text",
          text: o.text
        });
        if (l.length > 0) e.push({
          role: "user",
          content: l
        }), c++;
        break
      }
    }
  }
  return a.debug("Fireworks: thread conversion complete", {
    threadId: T.id,
    totalOutputMessages: e.length,
    userMessagesConverted: h,
    assistantMessagesConverted: i,
    infoMessagesConverted: c,
    hasSummaryBlock: !!t
  }), JA(e)
}

function Q4R(T) {
  if (T.type) return T;
  if (T.items !== void 0) return {
    ...T,
    type: "array"
  };
  return {
    ...T,
    type: "object"
  }
}

function SUT(T) {
  let R = new Set;
  return T.filter((a) => {
    if (R.has(a.name)) return !1;
    return R.add(a.name), !0
  }).map((a) => {
    let e = a.inputSchema,
      t = e?.properties ?? {},
      r = {};
    for (let [i, c] of Object.entries(t)) r[i] = Q4R(c);
    let h = {
      type: e?.type ?? "object",
      properties: r,
      required: e?.required ?? [],
      additionalProperties: !0
    };
    return {
      type: "function",
      function: {
        name: a.name,
        description: a.description ?? "",
        parameters: h
      }
    }
  })
}

function Z4R(T, R) {
  let a = T.pipe(L9((e) => gh((async () => {
    let t = await e.secrets.getToken("apiKey", e.settings.url);
    return {
      url: e.settings.url,
      apiKey: t,
      directRouting: e.settings["internal.fireworks.directRouting"]
    }
  })())), E9((e, t) => e.url === t.url && e.apiKey === t.apiKey && e.directRouting === t.directRouting), JR(({
    url: e,
    apiKey: t,
    directRouting: r
  }) => {
    if (!t) throw Error("API key not found. You must provide an API key in settings.");
    let h = {
      ...R
    };
    if (r) h["x-fireworks-direct-routing"] = "true";
    return new _9({
      apiKey: t,
      baseURL: new URL("/api/provider/fireworks/v1", e).toString(),
      defaultHeaders: h
    })
  }));
  return R ? a : a.pipe(f3({
    shouldCountRefs: !0
  }))
}

function J4R(T, R, a) {
  return m0(Z4R(T.configService.config, a?.defaultHeaders), R)
}

function OUT(T, R) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...R != null ? {
      [zA]: String(R)
    } :
    {},
    ...Vs(T),
    "x-session-affinity": T.id
  }
}

function dUT(T) {
  let R = T?.message;
  if (typeof R === "string") {
    if (R.includes("maximum context length") || R.includes("prompt is too long") || R.includes("too many tokens")) return new rp("Token limit exceeded.")
  }
  return T
}

function IbT(T, R) {
  let a = Ur(R),
    e = T.content.length,
    t = {
      ...T,
      content: T.content.map((h) => {
        if (h.type === "thinking") return {
          ...h,
          thinking: h.thinking.trim()
        };
        if (h.type === "text") return {
          ...h,
          text: h.text.trim()
        };
        return h
      }).filter((h) => {
        if (h.type === "thinking") return h.thinking !== "";
        if (h.type === "text") return h.text !== "";
        return !0
      })
    },
    r = t.content.length;
  if (e !== r) a.debug("Fireworks: postProcessAssistantMessage filtered empty blocks", {
    inputBlockCount: e,
    outputBlockCount: r,
    filteredCount: e - r,
    messageId: T.messageId
  });
  return t
}

function TLR(T) {
  return ["<|tool_call", "<|tool_calls_section", "tool_call_begin|>", "tool_call_end|>", "tool_calls_section_begin|>", "tool_calls_section_end|>"].some((R) => T.includes(R))
}

function RLR(T, R, a, e) {
  let t = Ur(e);
  if (T.state.type === "complete" && (T.state.stopReason == "end_turn" || T.state.stopReason === "tool_use")) {
    if (T.content.length === 0 || T.content.every((r) => r.type === "thinking")) {
      if (T.content.length === 0) throw t.warn("Fireworks: model returned empty content array", {
        model: R,
        threadId: a,
        stopReason: T.state.stopReason
      }), new XV("Model returned empty content array");
      let r = T.content.map((h) => h.type === "thinking" ? h.thinking : "").join(`
`);
      if (TLR(r)) throw t.warn("Fireworks: model leaked tool call control tokens in thinking block", {
        model: R,
        threadId: a,
        stopReason: T.state.stopReason,
        thinkingLength: r.length
      }), new XV("Model emitted tool call control tokens in thinking block instead of proper tool_calls")
    }
  }
}
async function* EUT(T, R) {
  let a = Ur(R.logger),
    {
      model: e,
      thread: t,
      systemPrompt: r,
      tools: h,
      configService: i,
      signal: c,
      serviceAuthToken: s
    } = R,
    {
      provider: A,
      getClient: l
    } = T,
    o = A.charAt(0).toUpperCase() + A.slice(1);
  a.debug(`${o}Provider.stream: started`, {
    model: e,
    threadId: t.id,
    messageCount: t.messages.length,
    signalAborted: c?.aborted ?? !1
  }), a.debug(`${o}Provider.stream: system prompt built`, {
    model: e,
    threadId: t.id,
    systemPromptBlocks: r.length,
    enabledTools: h.length
  });
  let n = h,
    p = O8(Y4R(t, a));
  a.debug(`${o}Provider.stream: messages converted`, {
    model: e,
    threadId: t.id,
    convertedMessageCount: p.length
  });
  let _ = Js(s),
    m = await l({
        configService: i
      }, c, _ ? {
        defaultHeaders: _
      } :
      void 0);
  a.debug(`${o}Provider.stream: client obtained`, {
    model: e,
    threadId: t.id,
    clientReady: !!m
  });
  let b = [{
      role: "system",
      content: r.map((L) => L.text).join(`

`)
    }, ...p],
    y = QET(`${A}/${e}`),
    u = (await i.getLatest(c)).settings["internal.kimi.reasoning"] ?? "medium",
    P = u === "none",
    k = e.toLowerCase().includes("kimi"),
    x = k && P ? 0.6 : 1,
    f = _m(t)?.messageId,
    v = {
      model: e,
      messages: b,
      tools: SUT(n),
      temperature: x,
      top_p: 0.95,
      stream: !0,
      ...jUT(A, u),
      max_tokens: y
    },
    g = Ys(`${A}/${e}`),
    I, S = 0,
    O = Date.now(),
    j = Date.now(),
    d, C = Date.now();
  try {
    a.debug(`${o}: initiating streaming API call`, {
      model: e,
      messageCount: b.length,
      toolCount: n.length,
      temperature: x,
      maxOutputTokens: y,
      maxInputTokens: g,
      isKimiModel: k,
      threadId: t.id,
      messageId: f
    });
    let L = await m.chat.completions.create(v, {
      signal: c,
      headers: {
        ...OUT(t, f),
        ..._ ?? {}
      }
    });
    C = Date.now(), j = C, a.debug(`${o}: stream connection established`, {
      model: e,
      threadId: t.id
    });
    for await (let w of C4R(L, tLR)) {
      S++;
      let D = Date.now(),
        B = D - j;
      if (B > rLR) a.warn(`${o}: long gap between stream events`, {
        chunkCount: S,
        timeSinceLastEventMs: B,
        totalElapsedMs: D - C,
        model: e,
        threadId: t.id
      });
      if (j = D, I = SO(I, w), I) {
        let M = $k(I, g),
          V = IbT(M, a),
          Q = Date.now() - O;
        if (S % 200 === 0) a.debug(`${o}: yielding assistant message chunk`, {
          chunkCount: S,
          contentBlocks: V.content.length,
          textBlocks: V.content.filter((W) => W.type === "text").length,
          toolUseBlocks: V.content.filter((W) => W.type === "tool_use").length,
          thinkingBlocks: V.content.filter((W) => W.type === "thinking").length,
          timeSinceLastYieldMs: Q,
          chunkProcessingTimeMs: Date.now() - D,
          model: e,
          threadId: t.id
        });
        O = Date.now(), d = I.finish_reason, yield V
      } else if (S % 25 === 0) a.debug(`${o}: aggregated is undefined after chunk`, {
        chunkCount: S,
        eventChoices: w.choices?.length ?? 0,
        model: e,
        threadId: t.id
      })
    }
    if (I) {
      let w = $k(I, g),
        D = IbT(w, a);
      if (D.content.some((B) => B.type === "tool_use" && B.complete === !1)) a.warn(`${o}: stream ended with incomplete tool_use`, {
        model: e,
        threadId: t.id,
        chunkCount: S,
        finishReason: I.finish_reason,
        contentBlocks: D.content.map((B) => ({
          type: B.type,
          ...B.type === "tool_use" ? {
            name: B.name,
            complete: B.complete,
            inputKeys: Object.keys(B.input ?? {})
          } :
          {}
        }))
      });
      if (RLR(D, e, t.id, a), I.finish_reason && d !== I.finish_reason) a.debug(`${o}: yielding final assistant message`, {
        model: e,
        threadId: t.id,
        finishReason: I.finish_reason,
        chunkCount: S,
        contentBlocks: D.content.length
      }), yield D
    }
    a.debug(`${o}: stream loop completed normally`, {
      model: e,
      threadId: t.id,
      totalChunks: S,
      finalAggregatedExists: !!I,
      finalContentLength: I?.message?.content?.length ?? 0,
      finalToolCallsCount: I?.message?.tool_calls?.length ?? 0,
      finalReasoningLength: I?.message?.reasoning_content?.length ?? 0,
      finishReason: I?.finish_reason,
      totalElapsedMs: Date.now() - C
    })
  } catch (L) {
    if (L instanceof I3T) throw a.warn(`${o}: stream idle timeout`, {
      model: e,
      threadId: t.id,
      totalChunks: S,
      totalElapsedMs: Date.now() - C
    }), L;
    if (xr(L)) throw a.debug(`${o}: stream aborted`, {
      model: e,
      threadId: t.id,
      userAbortTriggered: c?.aborted,
      totalChunks: S,
      totalElapsedMs: Date.now() - C,
      lastEventTimeMs: j
    }), new DOMException("Aborted", "AbortError");
    throw a.error(`${o} streaming API call failed`, {
      model: e,
      threadId: t.id,
      error: L instanceof Error ? L.message : String(L),
      status: L?.status,
      code: L?.code,
      type: L?.type,
      errorStack: L instanceof Error ? L.stack : void 0,
      totalChunks: S,
      totalElapsedMs: Date.now() - C,
      lastEventTimeMs: j
    }), dUT(L)
  } finally {
    a.debug(`${o}: stream cleanup (finally block)`, {
      model: e,
      threadId: t.id
    })
  }
}
async function aLR(T, R, a, e, t, r, h, i, c, s, A, l) {
  let o = Ur(),
    {
      provider: n,
      getClient: p
    } = T,
    _ = n.charAt(0).toUpperCase() + n.slice(1),
    m = await p(h, i, l),
    b = [{
      role: "system",
      content: e
    }, ...R],
    y = (await m0(h.configService.config, i)).settings["internal.kimi.reasoning"] ?? "medium",
    u = y === "none",
    P = r.toLowerCase().includes("kimi"),
    k = P && u ? 0.6 : 1,
    x = A?.reasoning_effort ?? y,
    f = QET(`${n}/${r}`),
    v = {
      model: r,
      messages: b,
      tools: SUT(a),
      temperature: k,
      top_p: 0.95,
      stream: !1,
      ...jUT(n, x),
      max_tokens: f,
      ...s && {
        tool_choice: s
      }
    };
  try {
    o.debug(`${_}: initiating sync chat completion`, {
      model: r,
      threadId: t.id,
      messageId: c,
      messageCount: b.length,
      toolCount: a.length,
      temperature: k,
      maxOutputTokens: f,
      isKimiModel: P,
      reasoningEffort: x
    });
    let g = await m.chat.completions.create(v, {
      signal: i,
      headers: {
        ...OUT(t, c),
        ...l?.defaultHeaders ?? {}
      }
    });
    return o.debug(`${_}: sync completion received`, {
      model: r,
      threadId: t.id,
      messageId: c,
      responseId: g.id,
      choicesCount: g.choices?.length ?? 0,
      finishReason: g.choices?.[0]?.finish_reason,
      toolCallsCount: g.choices?.[0]?.message?.tool_calls?.length ?? 0,
      contentLength: g.choices?.[0]?.message?.content?.length ?? 0,
      usagePromptTokens: g.usage?.prompt_tokens,
      usageCompletionTokens: g.usage?.completion_tokens
    }), {
      message: g
    }
  } catch (g) {
    if (xr(g)) throw o.debug(`${_}: sync call aborted`, {
      model: r,
      threadId: t.id,
      messageId: c
    }), new DOMException("Aborted", "AbortError");
    throw o.error(`${_} API call failed`, {
      model: r,
      threadId: t.id,
      messageId: c,
      error: g instanceof Error ? g.message : String(g),
      status: g?.status,
      code: g?.code,
      type: g?.type,
      errorStack: g instanceof Error ? g.stack : void 0
    }), dUT(g)
  }
}
async function eLR(T, R, a, e, t, r, h, i, c, s, A) {
  return aLR(j3T, T, R, a, e, t, r, h, i, c, s, A)
}
class CUT {
  async * stream(T) {
    yield* EUT(j3T, T)
  }
}

function hLR(T, R) {
  let a = T.pipe(L9((e) => gh((async () => {
    let t = await e.secrets.getToken("apiKey", e.settings.url);
    return {
      url: e.settings.url,
      apiKey: t
    }
  })())), E9((e, t) => e.url === t.url && e.apiKey === t.apiKey), JR(({
    url: e,
    apiKey: t
  }) => {
    if (!t) throw Error("API key not found. You must provide an API key in settings.");
    return new _9({
      apiKey: t,
      baseURL: new URL("/api/provider/baseten/v1", e).toString(),
      defaultHeaders: R
    })
  }));
  return R ? a : a.pipe(f3({
    shouldCountRefs: !0
  }))
}

function iLR(T, R, a) {
  return m0(hLR(T.configService.config, a?.defaultHeaders), R)
}
class LUT {
  async * stream(T) {
    yield* EUT(MUT, T)
  }
}

function sLR(T, R = {
  auto: !1
}) {
  if (gbT) throw Error(`you must \`import '@cerebras/cerebras_cloud_sdk/shims/${T.kind}'\` before importing anything else from @cerebras/cerebras_cloud_sdk`);
  if (tv) throw Error(`can't \`import '@cerebras/cerebras_cloud_sdk/shims/${T.kind}'\` after \`import '@cerebras/cerebras_cloud_sdk/shims/${tv}'\``);
  gbT = R.auto, tv = T.kind, DUT = T.fetch, oLR = T.Request, nLR = T.Response, lLR = T.Headers, ALR = T.FormData, pLR = T.Blob, YV = T.File, wUT = T.ReadableStream, _LR = T.getMultipartRequestOptions, BUT = T.getDefaultAgent, NUT = T.fileFromPath, bLR = T.isFsReadStream
}

function HUT() {}

function At(T) {
  return typeof T == "object" && T !== null || typeof T == "function"
}

function f8(T, R) {
  try {
    Object.defineProperty(T, "name", {
      value: R,
      configurable: !0
    })
  } catch (a) {}
}

function zt(T) {
  return new RM(T)
}

function E8(T) {
  return vHT(T)
}

function m9(T) {
  return jHT(T)
}

function rn(T, R, a) {
  return $HT.call(T, R, a)
}

function ot(T, R, a) {
  rn(rn(T, R, a), void 0, q3T)
}

function jbT(T, R) {
  ot(T, R)
}

function SbT(T, R) {
  ot(T, void 0, R)
}

function hc(T, R, a) {
  return rn(T, R, a)
}

function vk(T) {
  rn(T, void 0, q3T)
}

function gU(T, R, a) {
  if (typeof T != "function") throw TypeError("Argument is not a function");
  return Function.prototype.apply.call(T, R, a)
}

function Em(T, R, a) {
  try {
    return E8(gU(T, R, a))
  } catch (e) {
    return m9(e)
  }
}
class Dh {
  constructor() {
    this._cursor = 0, this._size = 0, this._front = {
      _elements: [],
      _next: void 0
    }, this._back = this._front, this._cursor = 0, this._size = 0
  }
  get length() {
    return this._size
  }
  push(T) {
    let R = this._back,
      a = R;
    R._elements.length === 16383 && (a = {
      _elements: [],
      _next: void 0
    }), R._elements.push(T), a !== R && (this._back = a, R._next = a), ++this._size
  }
  shift() {
    let T = this._front,
      R = T,
      a = this._cursor,
      e = a + 1,
      t = T._elements,
      r = t[a];
    return e === 16384 && (R = T._next, e = 0), --this._size, this._cursor = e, T !== R && (this._front = R), t[a] = void 0, r
  }
  forEach(T) {
    let R = this._cursor,
      a = this._front,
      e = a._elements;
    for (; !(R === e.length && a._next === void 0 || R === e.length && (a = a._next, e = a._elements, R = 0, e.length === 0));) T(e[R]), ++R
  }
  peek() {
    let T = this._front,
      R = this._cursor;
    return T._elements[R]
  }
}

function WUT(T, R) {
  T._ownerReadableStream = R, R._reader = T, R._state === "readable" ? QV(T) : R._state === "closed" ? function(a) {
      QV(a), GUT(a)
    }
    (T) : FUT(T, R._storedError)
}

function qUT(T, R) {
  return uHT(T._ownerReadableStream, R)
}

function zUT(T) {
  let R = T._ownerReadableStream;
  R._state === "readable" ? O3T(T, TypeError("Reader was released and can no longer be used to monitor the stream's closedness")) : function(a, e) {
      FUT(a, e)
    }
    (T, TypeError("Reader was released and can no longer be used to monitor the stream's closedness")), R._readableStreamController[rM](), R._reader = void 0, T._ownerReadableStream = void 0
}

function jk(T) {
  return TypeError("Cannot " + T + " a stream using a released reader")
}

function QV(T) {
  T._closedPromise = zt((R, a) => {
    T._closedPromise_resolve = R, T._closedPromise_reject = a
  })
}

function FUT(T, R) {
  QV(T), O3T(T, R)
}

function O3T(T, R) {
  T._closedPromise_reject !== void 0 && (vk(T._closedPromise), T._closedPromise_reject(R), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0)
}

function GUT(T) {
  T._closedPromise_resolve !== void 0 && (T._closedPromise_resolve(void 0), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0)
}

function hn(T, R) {
  if (T !== void 0 && (typeof(a = T) != "object" && typeof a != "function")) throw TypeError(`${R} is not an object.`);
  var a
}

function Mc(T, R) {
  if (typeof T != "function") throw TypeError(`${R} is not a function.`)
}

function KUT(T, R) {
  if (! function(a) {
      return typeof a == "object" && a !== null || typeof a == "function"
    }
    (T)) throw TypeError(`${R} is not an object.`)
}

function mn(T, R, a) {
  if (T === void 0) throw TypeError(`Parameter ${R} is required in '${a}'.`)
}

function ZV(T, R, a) {
  if (T === void 0) throw TypeError(`${R} is required in '${a}'.`)
}

function d3T(T) {
  return Number(T)
}

function ObT(T) {
  return T === 0 ? 0 : T
}

function VUT(T, R) {
  let a = Number.MAX_SAFE_INTEGER,
    e = Number(T);
  if (e = ObT(e), !iX(e)) throw TypeError(`${R} is not a finite number`);
  if (e = function(t) {
      return ObT(SHT(t))
    }
    (e), e < 0 || e > a) throw TypeError(`${R} is outside the accepted range of 0 to ${a}, inclusive`);
  return iX(e) && e !== 0 ? e : 0
}

function i$(T) {
  if (!At(T)) return !1;
  if (typeof T.getReader != "function") return !1;
  try {
    return typeof T.locked == "boolean"
  } catch (R) {
    return !1
  }
}

function XUT(T) {
  if (!At(T)) return !1;
  if (typeof T.getWriter != "function") return !1;
  try {
    return typeof T.locked == "boolean"
  } catch (R) {
    return !1
  }
}

function YUT(T, R) {
  if (!ub(T)) throw TypeError(`${R} is not a ReadableStream.`)
}

function dbT(T, R) {
  T._reader._readRequests.push(R)
}

function JV(T, R, a) {
  let e = T._reader._readRequests.shift();
  a ? e._closeSteps() : e._chunkSteps(R)
}

function U7(T) {
  return T._reader._readRequests.length
}

function QUT(T) {
  let R = T._reader;
  return R !== void 0 && !!J_(R)
}
class Ml {
  constructor(T) {
    if (mn(T, 1, "ReadableStreamDefaultReader"), YUT(T, "First parameter"), Ok(T)) throw TypeError("This stream has already been locked for exclusive reading by another reader");
    WUT(this, T), this._readRequests = new Dh
  }
  get closed() {
    return J_(this) ? this._closedPromise : m9(MC("closed"))
  }
  cancel(T) {
    return J_(this) ? this._ownerReadableStream === void 0 ? m9(jk("cancel")) : qUT(this, T) : m9(MC("cancel"))
  }
  read() {
    if (!J_(this)) return m9(MC("read"));
    if (this._ownerReadableStream === void 0) return m9(jk("read from"));
    let T, R, a = zt((e, t) => {
      T = e, R = t
    });
    return function(e, t) {
        let r = e._ownerReadableStream;
        r._disturbed = !0, r._state === "closed" ? t._closeSteps() : r._state === "errored" ? t._errorSteps(r._storedError) : r._readableStreamController[tM](t)
      }
      (this, {
        _chunkSteps: (e) => T({
          value: e,
          done: !1
        }),
        _closeSteps: () => T({
          value: void 0,
          done: !0
        }),
        _errorSteps: (e) => R(e)
      }), a
  }
  releaseLock() {
    if (!J_(this)) throw MC("releaseLock");
    this._ownerReadableStream !== void 0 && function(T) {
        zUT(T);
        let R = TypeError("Reader was released");
        ZUT(T, R)
      }
      (this)
  }
}

function J_(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_readRequests") && T instanceof Ml)
}

function ZUT(T, R) {
  let a = T._readRequests;
  T._readRequests = new Dh, a.forEach((e) => {
    e._errorSteps(R)
  })
}

function MC(T) {
  return TypeError(`ReadableStreamDefaultReader.prototype.${T} can only be used on a ReadableStreamDefaultReader`)
}
class E3T {
  constructor(T, R) {
    this._ongoingPromise = void 0, this._isFinished = !1, this._reader = T, this._preventCancel = R
  }
  next() {
    let T = () => this._nextSteps();
    return this._ongoingPromise = this._ongoingPromise ? hc(this._ongoingPromise, T, T) : T(), this._ongoingPromise
  }
  return (T) {
    let R = () => this._returnSteps(T);
    return this._ongoingPromise ? hc(this._ongoingPromise, R, R) : R()
  }
  _nextSteps() {
    if (this._isFinished) return Promise.resolve({
      value: void 0,
      done: !0
    });
    let T = this._reader;
    return T === void 0 ? m9(jk("iterate")) : rn(T.read(), (R) => {
      var a;
      return this._ongoingPromise = void 0, R.done && (this._isFinished = !0, (a = this._reader) === null || a === void 0 || a.releaseLock(), this._reader = void 0), R
    }, (R) => {
      var a;
      throw this._ongoingPromise = void 0, this._isFinished = !0, (a = this._reader) === null || a === void 0 || a.releaseLock(), this._reader = void 0, R
    })
  }
  _returnSteps(T) {
    if (this._isFinished) return Promise.resolve({
      value: T,
      done: !0
    });
    this._isFinished = !0;
    let R = this._reader;
    if (R === void 0) return m9(jk("finish iterating"));
    if (this._reader = void 0, !this._preventCancel) {
      let a = R.cancel(T);
      return R.releaseLock(), hc(a, () => ({
        value: T,
        done: !0
      }))
    }
    return R.releaseLock(), E8({
      value: T,
      done: !0
    })
  }
}

function EbT(T) {
  if (!At(T)) return !1;
  if (!Object.prototype.hasOwnProperty.call(T, "_asyncIteratorImpl")) return !1;
  try {
    return T._asyncIteratorImpl instanceof E3T
  } catch (R) {
    return !1
  }
}

function CbT(T) {
  return TypeError(`ReadableStreamAsyncIterator.${T} can only be used on a ReadableSteamAsyncIterator`)
}

function JUT(T, R, a, e, t) {
  new Uint8Array(T).set(new Uint8Array(a, e, t), R)
}

function LbT(T) {
  let R = function(a, e, t) {
      if (a.slice) return a.slice(e, t);
      let r = t - e,
        h = new ArrayBuffer(r);
      return JUT(h, 0, a, e, r), h
    }
    (T.buffer, T.byteOffset, T.byteOffset + T.byteLength);
  return new Uint8Array(R)
}

function TX(T) {
  let R = T._queue.shift();
  return T._queueTotalSize -= R.size, T._queueTotalSize < 0 && (T._queueTotalSize = 0), R.value
}

function C3T(T, R, a) {
  if (typeof(e = a) != "number" || z3T(e) || e < 0 || a === 1 / 0) throw RangeError("Size must be a finite, non-NaN, non-negative number.");
  var e;
  T._queue.push({
    value: R,
    size: a
  }), T._queueTotalSize += a
}

function lA(T) {
  T._queue = new Dh, T._queueTotalSize = 0
}
class B_ {
  constructor() {
    throw TypeError("Illegal constructor")
  }
  get view() {
    if (!W5(this)) throw q5("view");
    return this._view
  }
  respond(T) {
    if (!W5(this)) throw q5("respond");
    if (mn(T, 1, "respond"), T = VUT(T, "First parameter"), this._associatedReadableByteStreamController === void 0) throw TypeError("This BYOB request has been invalidated");
    this._view.buffer,
      function(R, a) {
        let e = R._pendingPullIntos.peek();
        if (R._controlledReadableByteStream._state === "closed") {
          if (a !== 0) throw TypeError("bytesWritten must be 0 when calling respond() on a closed stream")
        } else {
          if (a === 0) throw TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
          if (e.bytesFilled + a > e.byteLength) throw RangeError("bytesWritten out of range")
        }
        e.buffer = e.buffer, MbT(R, a)
      }
      (this._associatedReadableByteStreamController, T)
  }
  respondWithNewView(T) {
    if (!W5(this)) throw q5("respondWithNewView");
    if (mn(T, 1, "respondWithNewView"), !ArrayBuffer.isView(T)) throw TypeError("You can only respond with array buffer views");
    if (this._associatedReadableByteStreamController === void 0) throw TypeError("This BYOB request has been invalidated");
    T.buffer,
      function(R, a) {
        let e = R._pendingPullIntos.peek();
        if (R._controlledReadableByteStream._state === "closed") {
          if (a.byteLength !== 0) throw TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream")
        } else if (a.byteLength === 0) throw TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
        if (e.byteOffset + e.bytesFilled !== a.byteOffset) throw RangeError("The region specified by view does not match byobRequest");
        if (e.bufferByteLength !== a.buffer.byteLength) throw RangeError("The buffer of view has different capacity than byobRequest");
        if (e.bytesFilled + a.byteLength > e.byteLength) throw RangeError("The region specified by view is larger than byobRequest");
        let t = a.byteLength;
        e.buffer = a.buffer, MbT(R, t)
      }
      (this._associatedReadableByteStreamController, T)
  }
}

function dy(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_controlledReadableByteStream") && T instanceof Il)
}

function W5(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_associatedReadableByteStreamController") && T instanceof B_)
}

function Hb(T) {
  if (! function(R) {
      let a = R._controlledReadableByteStream;
      if (a._state !== "readable") return !1;
      if (R._closeRequested) return !1;
      if (!R._started) return !1;
      if (QUT(a) && U7(a) > 0) return !0;
      if (M3T(a) && cHT(a) > 0) return !0;
      if (iHT(R) > 0) return !0;
      return !1
    }
    (T)) return;
  if (T._pulling) return void(T._pullAgain = !0);
  T._pulling = !0, ot(T._pullAlgorithm(), () => (T._pulling = !1, T._pullAgain && (T._pullAgain = !1, Hb(T)), null), (R) => (Sk(T, R), null))
}

function THT(T) {
  L3T(T), T._pendingPullIntos = new Dh
}

function RX(T, R) {
  let a = !1;
  T._state === "closed" && (a = !0);
  let e = RHT(R);
  R.readerType === "default" ? JV(T, e, a) : function(t, r, h) {
      let i = t._reader._readIntoRequests.shift();
      h ? i._closeSteps(r) : i._chunkSteps(r)
    }
    (T, e, a)
}

function RHT(T) {
  let {
    bytesFilled: R,
    elementSize: a
  } = T;
  return new T.viewConstructor(T.buffer, T.byteOffset, R / a)
}

function QL(T, R, a, e) {
  T._queue.push({
    buffer: R,
    byteOffset: a,
    byteLength: e
  }), T._queueTotalSize += e
}

function aHT(T, R, a, e) {
  let t;
  try {
    t = R.slice(a, a + e)
  } catch (r) {
    throw Sk(T, r), r
  }
  QL(T, t, 0, e)
}

function eHT(T, R) {
  R.bytesFilled > 0 && aHT(T, R.buffer, R.byteOffset, R.bytesFilled), BP(T)
}

function tHT(T, R) {
  let a = R.elementSize,
    e = R.bytesFilled - R.bytesFilled % a,
    t = Math.min(T._queueTotalSize, R.byteLength - R.bytesFilled),
    r = R.bytesFilled + t,
    h = r - r % a,
    i = t,
    c = !1;
  h > e && (i = h - R.bytesFilled, c = !0);
  let s = T._queue;
  for (; i > 0;) {
    let A = s.peek(),
      l = Math.min(i, A.byteLength),
      o = R.byteOffset + R.bytesFilled;
    JUT(R.buffer, o, A.buffer, A.byteOffset, l), A.byteLength === l ? s.shift() : (A.byteOffset += l, A.byteLength -= l), T._queueTotalSize -= l, rHT(T, l, R), i -= l
  }
  return c
}

function rHT(T, R, a) {
  a.bytesFilled += R
}

function hHT(T) {
  T._queueTotalSize === 0 && T._closeRequested ? (H7(T), iv(T._controlledReadableByteStream)) : Hb(T)
}

function L3T(T) {
  T._byobRequest !== null && (T._byobRequest._associatedReadableByteStreamController = void 0, T._byobRequest._view = null, T._byobRequest = null)
}

function aX(T) {
  for (; T._pendingPullIntos.length > 0;) {
    if (T._queueTotalSize === 0) return;
    let R = T._pendingPullIntos.peek();
    tHT(T, R) && (BP(T), RX(T._controlledReadableByteStream, R))
  }
}

function MbT(T, R) {
  let a = T._pendingPullIntos.peek();
  L3T(T), T._controlledReadableByteStream._state === "closed" ? function(e, t) {
      t.readerType === "none" && BP(e);
      let r = e._controlledReadableByteStream;
      if (M3T(r))
        for (; cHT(r) > 0;) RX(r, BP(e))
    }
    (T, a) : function(e, t, r) {
      if (rHT(0, t, r), r.readerType === "none") return eHT(e, r), void aX(e);
      if (r.bytesFilled < r.elementSize) return;
      BP(e);
      let h = r.bytesFilled % r.elementSize;
      if (h > 0) {
        let i = r.byteOffset + r.bytesFilled;
        aHT(e, r.buffer, i - h, h)
      }
      r.bytesFilled -= h, RX(e._controlledReadableByteStream, r), aX(e)
    }
    (T, R, a), Hb(T)
}

function BP(T) {
  return T._pendingPullIntos.shift()
}

function H7(T) {
  T._pullAlgorithm = void 0, T._cancelAlgorithm = void 0
}

function Sk(T, R) {
  let a = T._controlledReadableByteStream;
  a._state === "readable" && (THT(T), lA(T), H7(T), yHT(a, R))
}

function DbT(T, R) {
  let a = T._queue.shift();
  T._queueTotalSize -= a.byteLength, hHT(T);
  let e = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  R._chunkSteps(e)
}

function iHT(T) {
  let R = T._controlledReadableByteStream._state;
  return R === "errored" ? null : R === "closed" ? 0 : T._strategyHWM - T._queueTotalSize
}

function zLR(T, R, a) {
  let e = Object.create(Il.prototype),
    t, r, h;
  t = R.start !== void 0 ? () => R.start(e) : () => {}, r = R.pull !== void 0 ? () => R.pull(e) : () => E8(void 0), h = R.cancel !== void 0 ? (c) => R.cancel(c) : () => E8(void 0);
  let i = R.autoAllocateChunkSize;
  if (i === 0) throw TypeError("autoAllocateChunkSize must be greater than 0");
  (function(c, s, A, l, o, n, p) {
    s._controlledReadableByteStream = c, s._pullAgain = !1, s._pulling = !1, s._byobRequest = null, s._queue = s._queueTotalSize = void 0, lA(s), s._closeRequested = !1, s._started = !1, s._strategyHWM = n, s._pullAlgorithm = l, s._cancelAlgorithm = o, s._autoAllocateChunkSize = p, s._pendingPullIntos = new Dh, c._readableStreamController = s, ot(E8(A()), () => (s._started = !0, Hb(s), null), (_) => (Sk(s, _), null))
  })(T, e, t, r, h, a, i)
}

function q5(T) {
  return TypeError(`ReadableStreamBYOBRequest.prototype.${T} can only be used on a ReadableStreamBYOBRequest`)
}

function SI(T) {
  return TypeError(`ReadableByteStreamController.prototype.${T} can only be used on a ReadableByteStreamController`)
}

function wbT(T, R) {
  T._reader._readIntoRequests.push(R)
}

function cHT(T) {
  return T._reader._readIntoRequests.length
}

function M3T(T) {
  let R = T._reader;
  return R !== void 0 && !!tP(R)
}
class Dl {
  constructor(T) {
    if (mn(T, 1, "ReadableStreamBYOBReader"), YUT(T, "First parameter"), Ok(T)) throw TypeError("This stream has already been locked for exclusive reading by another reader");
    if (!dy(T._readableStreamController)) throw TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
    WUT(this, T), this._readIntoRequests = new Dh
  }
  get closed() {
    return tP(this) ? this._closedPromise : m9(DC("closed"))
  }
  cancel(T) {
    return tP(this) ? this._ownerReadableStream === void 0 ? m9(jk("cancel")) : qUT(this, T) : m9(DC("cancel"))
  }
  read(T) {
    if (!tP(this)) return m9(DC("read"));
    if (!ArrayBuffer.isView(T)) return m9(TypeError("view must be an array buffer view"));
    if (T.byteLength === 0) return m9(TypeError("view must have non-zero byteLength"));
    if (T.buffer.byteLength === 0) return m9(TypeError("view's buffer must have non-zero byteLength"));
    if (T.buffer, this._ownerReadableStream === void 0) return m9(jk("read from"));
    let R, a, e = zt((t, r) => {
      R = t, a = r
    });
    return function(t, r, h) {
        let i = t._ownerReadableStream;
        i._disturbed = !0, i._state === "errored" ? h._errorSteps(i._storedError) : function(c, s, A) {
            let l = c._controlledReadableByteStream,
              o = 1;
            s.constructor !== DataView && (o = s.constructor.BYTES_PER_ELEMENT);
            let {
              constructor: n,
              buffer: p
            } = s, _ = {
              buffer: p,
              bufferByteLength: p.byteLength,
              byteOffset: s.byteOffset,
              byteLength: s.byteLength,
              bytesFilled: 0,
              elementSize: o,
              viewConstructor: n,
              readerType: "byob"
            };
            if (c._pendingPullIntos.length > 0) return c._pendingPullIntos.push(_), void wbT(l, A);
            if (l._state !== "closed") {
              if (c._queueTotalSize > 0) {
                if (tHT(c, _)) {
                  let m = RHT(_);
                  return hHT(c), void A._chunkSteps(m)
                }
                if (c._closeRequested) {
                  let m = TypeError("Insufficient bytes to fill elements in the given buffer");
                  return Sk(c, m), void A._errorSteps(m)
                }
              }
              c._pendingPullIntos.push(_), wbT(l, A), Hb(c)
            } else {
              let m = new n(_.buffer, _.byteOffset, 0);
              A._closeSteps(m)
            }
          }
          (i._readableStreamController, r, h)
      }
      (this, T, {
        _chunkSteps: (t) => R({
          value: t,
          done: !1
        }),
        _closeSteps: (t) => R({
          value: t,
          done: !0
        }),
        _errorSteps: (t) => a(t)
      }), e
  }
  releaseLock() {
    if (!tP(this)) throw DC("releaseLock");
    this._ownerReadableStream !== void 0 && function(T) {
        zUT(T);
        let R = TypeError("Reader was released");
        sHT(T, R)
      }
      (this)
  }
}

function tP(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_readIntoRequests") && T instanceof Dl)
}

function sHT(T, R) {
  let a = T._readIntoRequests;
  T._readIntoRequests = new Dh, a.forEach((e) => {
    e._errorSteps(R)
  })
}

function DC(T) {
  return TypeError(`ReadableStreamBYOBReader.prototype.${T} can only be used on a ReadableStreamBYOBReader`)
}

function Yj(T, R) {
  let {
    highWaterMark: a
  } = T;
  if (a === void 0) return R;
  if (z3T(a) || a < 0) throw RangeError("Invalid highWaterMark");
  return a
}

function W7(T) {
  let {
    size: R
  } = T;
  return R || (() => 1)
}

function q7(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.highWaterMark,
    e = T == null ? void 0 : T.size;
  return {
    highWaterMark: a === void 0 ? void 0 : d3T(a),
    size: e === void 0 ? void 0 : FLR(e, `${R} has member 'size' that`)
  }
}

function FLR(T, R) {
  return Mc(T, R), (a) => d3T(T(a))
}

function GLR(T, R, a) {
  return Mc(T, a), (e) => Em(T, R, [e])
}

function KLR(T, R, a) {
  return Mc(T, a), () => Em(T, R, [])
}

function VLR(T, R, a) {
  return Mc(T, a), (e) => gU(T, R, [e])
}

function XLR(T, R, a) {
  return Mc(T, a), (e, t) => Em(T, R, [e, t])
}
class wl {
  constructor(T = {}, R = {}) {
    T === void 0 ? T = null : KUT(T, "First parameter");
    let a = q7(R, "Second parameter"),
      e = function(h, i) {
        hn(h, i);
        let c = h == null ? void 0 : h.abort,
          s = h == null ? void 0 : h.close,
          A = h == null ? void 0 : h.start,
          l = h == null ? void 0 : h.type,
          o = h == null ? void 0 : h.write;
        return {
          abort: c === void 0 ? void 0 : GLR(c, h, `${i} has member 'abort' that`),
          close: s === void 0 ? void 0 : KLR(s, h, `${i} has member 'close' that`),
          start: A === void 0 ? void 0 : VLR(A, h, `${i} has member 'start' that`),
          write: o === void 0 ? void 0 : XLR(o, h, `${i} has member 'write' that`),
          type: l
        }
      }
      (T, "First parameter");
    var t;
    if ((t = this)._state = "writable", t._storedError = void 0, t._writer = void 0, t._writableStreamController = void 0, t._writeRequests = new Dh, t._inFlightWriteRequest = void 0, t._closeRequest = void 0, t._inFlightCloseRequest = void 0, t._pendingAbortRequest = void 0, t._backpressure = !1, e.type !== void 0) throw RangeError("Invalid type is specified");
    let r = W7(a);
    (function(h, i, c, s) {
      let A = Object.create(cv.prototype),
        l, o, n, p;
      l = i.start !== void 0 ? () => i.start(A) : () => {}, o = i.write !== void 0 ? (_) => i.write(_, A) : () => E8(void 0), n = i.close !== void 0 ? () => i.close() : () => E8(void 0), p = i.abort !== void 0 ? (_) => i.abort(_) : () => E8(void 0),
        function(_, m, b, y, u, P, k, x) {
          m._controlledWritableStream = _, _._writableStreamController = m, m._queue = void 0, m._queueTotalSize = void 0, lA(m), m._abortReason = void 0, m._abortController = function() {
              if (OHT) return new AbortController
            }
            (), m._started = !1, m._strategySizeAlgorithm = x, m._strategyHWM = k, m._writeAlgorithm = y, m._closeAlgorithm = u, m._abortAlgorithm = P;
          let f = N3T(m);
          B3T(_, f);
          let v = b();
          ot(E8(v), () => (m._started = !0, $U(m), null), (g) => (m._started = !0, eX(_, g), null))
        }
        (h, A, l, o, n, p, c, s)
    })(this, e, Yj(a, 1), r)
  }
  get locked() {
    if (!Os(this)) throw BC("locked");
    return ZL(this)
  }
  abort(T) {
    return Os(this) ? ZL(this) ? m9(TypeError("Cannot abort a stream that already has a writer")) : oHT(this, T) : m9(BC("abort"))
  }
  close() {
    return Os(this) ? ZL(this) ? m9(TypeError("Cannot close a stream that already has a writer")) : Ql(this) ? m9(TypeError("Cannot close an already-closing stream")) : nHT(this) : m9(BC("close"))
  }
  getWriter() {
    if (!Os(this)) throw BC("getWriter");
    return new Uo(this)
  }
}

function Os(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_writableStreamController") && T instanceof wl)
}

function ZL(T) {
  return T._writer !== void 0
}

function oHT(T, R) {
  var a;
  if (T._state === "closed" || T._state === "errored") return E8(void 0);
  T._writableStreamController._abortReason = R, (a = T._writableStreamController._abortController) === null || a === void 0 || a.abort(R);
  let e = T._state;
  if (e === "closed" || e === "errored") return E8(void 0);
  if (T._pendingAbortRequest !== void 0) return T._pendingAbortRequest._promise;
  let t = !1;
  e === "erroring" && (t = !0, R = void 0);
  let r = zt((h, i) => {
    T._pendingAbortRequest = {
      _promise: void 0,
      _resolve: h,
      _reject: i,
      _reason: R,
      _wasAlreadyErroring: t
    }
  });
  return T._pendingAbortRequest._promise = r, t || D3T(T, R), r
}

function nHT(T) {
  let R = T._state;
  if (R === "closed" || R === "errored") return m9(TypeError(`The stream (in ${R} state) is not in the writable state and cannot be closed`));
  let a = zt((r, h) => {
      let i = {
        _resolve: r,
        _reject: h
      };
      T._closeRequest = i
    }),
    e = T._writer;
  var t;
  return e !== void 0 && T._backpressure && R === "writable" && H3T(e), C3T(t = T._writableStreamController, F3T, 0), $U(t), a
}

function eX(T, R) {
  T._state !== "writable" ? w3T(T) : D3T(T, R)
}

function D3T(T, R) {
  let a = T._writableStreamController;
  T._state = "erroring", T._storedError = R;
  let e = T._writer;
  e !== void 0 && lHT(e, R), ! function(t) {
      if (t._inFlightWriteRequest === void 0 && t._inFlightCloseRequest === void 0) return !1;
      return !0
    }
    (T) && a._started && w3T(T)
}

function w3T(T) {
  T._state = "errored", T._writableStreamController[hX]();
  let R = T._storedError;
  if (T._writeRequests.forEach((e) => {
      e._reject(R)
    }), T._writeRequests = new Dh, T._pendingAbortRequest === void 0) return void wC(T);
  let a = T._pendingAbortRequest;
  if (T._pendingAbortRequest = void 0, a._wasAlreadyErroring) return a._reject(R), void wC(T);
  ot(T._writableStreamController[rX](a._reason), () => (a._resolve(), wC(T), null), (e) => (a._reject(e), wC(T), null))
}

function Ql(T) {
  return T._closeRequest !== void 0 || T._inFlightCloseRequest !== void 0
}

function wC(T) {
  T._closeRequest !== void 0 && (T._closeRequest._reject(T._storedError), T._closeRequest = void 0);
  let R = T._writer;
  R !== void 0 && U3T(R, T._storedError)
}

function B3T(T, R) {
  let a = T._writer;
  a !== void 0 && R !== T._backpressure && (R ? function(e) {
      vU(e)
    }
    (a) : H3T(a)), T._backpressure = R
}
class Uo {
  constructor(T) {
    if (mn(T, 1, "WritableStreamDefaultWriter"), function(e, t) {
        if (!Os(e)) throw TypeError(`${t} is not a WritableStream.`)
      }
      (T, "First parameter"), ZL(T)) throw TypeError("This stream has already been locked for exclusive writing by another writer");
    this._ownerWritableStream = T, T._writer = this;
    let R = T._state;
    if (R === "writable") !Ql(T) && T._backpressure ? vU(this) : UbT(this), JL(this);
    else if (R === "erroring") tX(this, T._storedError), JL(this);
    else if (R === "closed") UbT(this), JL(a = this), _HT(a);
    else {
      let e = T._storedError;
      tX(this, e), NbT(this, e)
    }
    var a
  }
  get closed() {
    return Jp(this) ? this._closedPromise : m9(T_("closed"))
  }
  get desiredSize() {
    if (!Jp(this)) throw T_("desiredSize");
    if (this._ownerWritableStream === void 0) throw OI("desiredSize");
    return function(T) {
        let R = T._ownerWritableStream,
          a = R._state;
        if (a === "errored" || a === "erroring") return null;
        if (a === "closed") return 0;
        return AHT(R._writableStreamController)
      }
      (this)
  }
  get ready() {
    return Jp(this) ? this._readyPromise : m9(T_("ready"))
  }
  abort(T) {
    return Jp(this) ? this._ownerWritableStream === void 0 ? m9(OI("abort")) : function(R, a) {
        return oHT(R._ownerWritableStream, a)
      }
      (this, T) : m9(T_("abort"))
  }
  close() {
    if (!Jp(this)) return m9(T_("close"));
    let T = this._ownerWritableStream;
    return T === void 0 ? m9(OI("close")) : Ql(T) ? m9(TypeError("Cannot close an already-closing stream")) : nHT(this._ownerWritableStream)
  }
  releaseLock() {
    if (!Jp(this)) throw T_("releaseLock");
    this._ownerWritableStream !== void 0 && function(T) {
        let R = T._ownerWritableStream,
          a = TypeError("Writer was released and can no longer be used to monitor the stream's closedness");
        lHT(T, a),
          function(e, t) {
            e._closedPromiseState === "pending" ? U3T(e, t) : function(r, h) {
                NbT(r, h)
              }
              (e, t)
          }
          (T, a), R._writer = void 0, T._ownerWritableStream = void 0
      }
      (this)
  }
  write(T) {
    return Jp(this) ? this._ownerWritableStream === void 0 ? m9(OI("write to")) : function(R, a) {
        let e = R._ownerWritableStream,
          t = e._writableStreamController,
          r = function(c, s) {
            try {
              return c._strategySizeAlgorithm(s)
            } catch (A) {
              return BbT(c, A), 1
            }
          }
          (t, a);
        if (e !== R._ownerWritableStream) return m9(OI("write to"));
        let h = e._state;
        if (h === "errored") return m9(e._storedError);
        if (Ql(e) || h === "closed") return m9(TypeError("The stream is closing or closed and cannot be written to"));
        if (h === "erroring") return m9(e._storedError);
        let i = function(c) {
            return zt((s, A) => {
              let l = {
                _resolve: s,
                _reject: A
              };
              c._writeRequests.push(l)
            })
          }
          (e);
        return function(c, s, A) {
            try {
              C3T(c, s, A)
            } catch (o) {
              return void BbT(c, o)
            }
            let l = c._controlledWritableStream;
            if (!Ql(l) && l._state === "writable") B3T(l, N3T(c));
            $U(c)
          }
          (t, a, r), i
      }
      (this, T) : m9(T_("write"))
  }
}

function Jp(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_ownerWritableStream") && T instanceof Uo)
}

function lHT(T, R) {
  T._readyPromiseState === "pending" ? bHT(T, R) : function(a, e) {
      tX(a, e)
    }
    (T, R)
}

function z5(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_controlledWritableStream") && T instanceof cv)
}

function z7(T) {
  T._writeAlgorithm = void 0, T._closeAlgorithm = void 0, T._abortAlgorithm = void 0, T._strategySizeAlgorithm = void 0
}

function AHT(T) {
  return T._strategyHWM - T._queueTotalSize
}

function $U(T) {
  let R = T._controlledWritableStream;
  if (!T._started) return;
  if (R._inFlightWriteRequest !== void 0) return;
  if (R._state === "erroring") return void w3T(R);
  if (T._queue.length === 0) return;
  let a = T._queue.peek().value;
  a === F3T ? function(e) {
      let t = e._controlledWritableStream;
      (function(h) {
        h._inFlightCloseRequest = h._closeRequest, h._closeRequest = void 0
      })(t), TX(e);
      let r = e._closeAlgorithm();
      z7(e), ot(r, () => (function(h) {
          h._inFlightCloseRequest._resolve(void 0), h._inFlightCloseRequest = void 0, h._state === "erroring" && (h._storedError = void 0, h._pendingAbortRequest !== void 0 && (h._pendingAbortRequest._resolve(), h._pendingAbortRequest = void 0)), h._state = "closed";
          let i = h._writer;
          i !== void 0 && _HT(i)
        }
        (t), null), (h) => (function(i, c) {
          i._inFlightCloseRequest._reject(c), i._inFlightCloseRequest = void 0, i._pendingAbortRequest !== void 0 && (i._pendingAbortRequest._reject(c), i._pendingAbortRequest = void 0), eX(i, c)
        }
        (t, h), null))
    }
    (T) : function(e, t) {
      let r = e._controlledWritableStream;
      (function(h) {
        h._inFlightWriteRequest = h._writeRequests.shift()
      })(r), ot(e._writeAlgorithm(t), () => {
        (function(i) {
          i._inFlightWriteRequest._resolve(void 0), i._inFlightWriteRequest = void 0
        })(r);
        let h = r._state;
        if (TX(e), !Ql(r) && h === "writable") {
          let i = N3T(e);
          B3T(r, i)
        }
        return $U(e), null
      }, (h) => (r._state === "writable" && z7(e), function(i, c) {
          i._inFlightWriteRequest._reject(c), i._inFlightWriteRequest = void 0, eX(i, c)
        }
        (r, h), null))
    }
    (T, a)
}

function BbT(T, R) {
  T._controlledWritableStream._state === "writable" && pHT(T, R)
}

function N3T(T) {
  return AHT(T) <= 0
}

function pHT(T, R) {
  let a = T._controlledWritableStream;
  z7(T), D3T(a, R)
}

function BC(T) {
  return TypeError(`WritableStream.prototype.${T} can only be used on a WritableStream`)
}

function F5(T) {
  return TypeError(`WritableStreamDefaultController.prototype.${T} can only be used on a WritableStreamDefaultController`)
}

function T_(T) {
  return TypeError(`WritableStreamDefaultWriter.prototype.${T} can only be used on a WritableStreamDefaultWriter`)
}

function OI(T) {
  return TypeError("Cannot " + T + " a stream using a released writer")
}

function JL(T) {
  T._closedPromise = zt((R, a) => {
    T._closedPromise_resolve = R, T._closedPromise_reject = a, T._closedPromiseState = "pending"
  })
}

function NbT(T, R) {
  JL(T), U3T(T, R)
}

function U3T(T, R) {
  T._closedPromise_reject !== void 0 && (vk(T._closedPromise), T._closedPromise_reject(R), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0, T._closedPromiseState = "rejected")
}

function _HT(T) {
  T._closedPromise_resolve !== void 0 && (T._closedPromise_resolve(void 0), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0, T._closedPromiseState = "resolved")
}

function vU(T) {
  T._readyPromise = zt((R, a) => {
    T._readyPromise_resolve = R, T._readyPromise_reject = a
  }), T._readyPromiseState = "pending"
}

function tX(T, R) {
  vU(T), bHT(T, R)
}

function UbT(T) {
  vU(T), H3T(T)
}

function bHT(T, R) {
  T._readyPromise_reject !== void 0 && (vk(T._readyPromise), T._readyPromise_reject(R), T._readyPromise_resolve = void 0, T._readyPromise_reject = void 0, T._readyPromiseState = "rejected")
}

function H3T(T) {
  T._readyPromise_resolve !== void 0 && (T._readyPromise_resolve(void 0), T._readyPromise_resolve = void 0, T._readyPromise_reject = void 0, T._readyPromiseState = "fulfilled")
}

function HbT(T, R, a, e, t, r) {
  let h = T.getReader(),
    i = R.getWriter();
  ub(T) && (T._disturbed = !0);
  let c, s, A, l = !1,
    o = !1,
    n = "readable",
    p = "writable",
    _ = !1,
    m = !1,
    b = zt((u) => {
      A = u
    }),
    y = Promise.resolve(void 0);
  return zt((u, P) => {
    let k;

    function x() {
      if (l) return;
      let j = zt((d, C) => {
        (function L(w) {
          w ? d() : rn(function() {
              if (l) return E8(!0);
              return rn(i.ready, () => rn(h.read(), (D) => !!D.done || (y = i.write(D.value), vk(y), !1)))
            }
            (), L, C)
        })(!1)
      });
      vk(j)
    }

    function f() {
      return n = "closed", a ? S() : I(() => (Os(R) && (_ = Ql(R), p = R._state), _ || p === "closed" ? E8(void 0) : p === "erroring" || p === "errored" ? m9(s) : (_ = !0, i.close())), !1, void 0), null
    }

    function v(j) {
      return l || (n = "errored", c = j, e ? S(!0, j) : I(() => i.abort(j), !0, j)), null
    }

    function g(j) {
      return o || (p = "errored", s = j, t ? S(!0, j) : I(() => h.cancel(j), !0, j)), null
    }
    if (r !== void 0 && (k = () => {
        let j = r.reason !== void 0 ? r.reason : new dHT("Aborted", "AbortError"),
          d = [];
        e || d.push(() => p === "writable" ? i.abort(j) : E8(void 0)), t || d.push(() => n === "readable" ? h.cancel(j) : E8(void 0)), I(() => Promise.all(d.map((C) => C())), !0, j)
      }, r.aborted ? k() : r.addEventListener("abort", k)), ub(T) && (n = T._state, c = T._storedError), Os(R) && (p = R._state, s = R._storedError, _ = Ql(R)), ub(T) && Os(R) && (m = !0, A()), n === "errored") v(c);
    else if (p === "erroring" || p === "errored") g(s);
    else if (n === "closed") f();
    else if (_ || p === "closed") {
      let j = TypeError("the destination writable stream closed before all data could be piped to it");
      t ? S(!0, j) : I(() => h.cancel(j), !0, j)
    }

    function I(j, d, C) {
      function L() {
        return p !== "writable" || _ ? w() : jbT(function() {
            let D;
            return E8(function B() {
                if (D !== y) return D = y, hc(y, B, B)
              }
              ())
          }
          (), w), null
      }

      function w() {
        return j ? ot(j(), () => O(d, C), (D) => O(!0, D)) : O(d, C), null
      }
      l || (l = !0, m ? L() : jbT(b, L))
    }

    function S(j, d) {
      I(void 0, j, d)
    }

    function O(j, d) {
      return o = !0, i.releaseLock(), h.releaseLock(), r !== void 0 && r.removeEventListener("abort", k), j ? P(d) : u(void 0), null
    }
    l || (ot(h.closed, f, v), ot(i.closed, function() {
      return o || (p = "closed"), null
    }, g)), m ? x() : aM(() => {
      m = !0, A(), x()
    })
  })
}

function YLR(T, R) {
  return function(a) {
      try {
        return a.getReader({
          mode: "byob"
        }).releaseLock(), !0
      } catch (e) {
        return !1
      }
    }
    (T) ? function(a) {
      let e, t, r, h, i, c = a.getReader(),
        s = !1,
        A = !1,
        l = !1,
        o = !1,
        n = !1,
        p = !1,
        _ = zt((g) => {
          i = g
        });

      function m(g) {
        SbT(g.closed, (I) => (g !== c || (r.error(I), h.error(I), n && p || i(void 0)), null))
      }

      function b() {
        s && (c.releaseLock(), c = a.getReader(), m(c), s = !1), ot(c.read(), (g) => {
          var I, S;
          if (l = !1, o = !1, g.done) return n || r.close(), p || h.close(), (I = r.byobRequest) === null || I === void 0 || I.respond(0), (S = h.byobRequest) === null || S === void 0 || S.respond(0), n && p || i(void 0), null;
          let O = g.value,
            j = O,
            d = O;
          if (!n && !p) try {
            d = LbT(O)
          }
          catch (C) {
            return r.error(C), h.error(C), i(c.cancel(C)), null
          }
          return n || r.enqueue(j), p || h.enqueue(d), A = !1, l ? u() : o && P(), null
        }, () => (A = !1, null))
      }

      function y(g, I) {
        s || (c.releaseLock(), c = a.getReader({
          mode: "byob"
        }), m(c), s = !0);
        let S = I ? h : r,
          O = I ? r : h;
        ot(c.read(g), (j) => {
          var d;
          l = !1, o = !1;
          let C = I ? p : n,
            L = I ? n : p;
          if (j.done) {
            C || S.close(), L || O.close();
            let D = j.value;
            return D !== void 0 && (C || S.byobRequest.respondWithNewView(D), L || (d = O.byobRequest) === null || d === void 0 || d.respond(0)), C && L || i(void 0), null
          }
          let w = j.value;
          if (L) C || S.byobRequest.respondWithNewView(w);
          else {
            let D;
            try {
              D = LbT(w)
            } catch (B) {
              return S.error(B), O.error(B), i(c.cancel(B)), null
            }
            C || S.byobRequest.respondWithNewView(w), O.enqueue(D)
          }
          return A = !1, l ? u() : o && P(), null
        }, () => (A = !1, null))
      }

      function u() {
        if (A) return l = !0, E8(void 0);
        A = !0;
        let g = r.byobRequest;
        return g === null ? b() : y(g.view, !1), E8(void 0)
      }

      function P() {
        if (A) return o = !0, E8(void 0);
        A = !0;
        let g = h.byobRequest;
        return g === null ? b() : y(g.view, !0), E8(void 0)
      }

      function k(g) {
        if (n = !0, e = g, p) {
          let I = [e, t],
            S = c.cancel(I);
          i(S)
        }
        return _
      }

      function x(g) {
        if (p = !0, t = g, n) {
          let I = [e, t],
            S = c.cancel(I);
          i(S)
        }
        return _
      }
      let f = new me({
          type: "bytes",
          start(g) {
            r = g
          },
          pull: u,
          cancel: k
        }),
        v = new me({
          type: "bytes",
          start(g) {
            h = g
          },
          pull: P,
          cancel: x
        });
      return m(c), [f, v]
    }
    (T) : function(a, e) {
      let t = a.getReader(),
        r, h, i, c, s, A = !1,
        l = !1,
        o = !1,
        n = !1,
        p = zt((P) => {
          s = P
        });

      function _() {
        return A ? (l = !0, E8(void 0)) : (A = !0, ot(t.read(), (P) => {
          if (l = !1, P.done) return o || i.close(), n || c.close(), o && n || s(void 0), null;
          let k = P.value,
            x = k,
            f = k;
          return o || i.enqueue(x), n || c.enqueue(f), A = !1, l && _(), null
        }, () => (A = !1, null)), E8(void 0))
      }

      function m(P) {
        if (o = !0, r = P, n) {
          let k = [r, h],
            x = t.cancel(k);
          s(x)
        }
        return p
      }

      function b(P) {
        if (n = !0, h = P, o) {
          let k = [r, h],
            x = t.cancel(k);
          s(x)
        }
        return p
      }
      let y = new me({
          start(P) {
            i = P
          },
          pull: _,
          cancel: m
        }),
        u = new me({
          start(P) {
            c = P
          },
          pull: _,
          cancel: b
        });
      return SbT(t.closed, (P) => (i.error(P), c.error(P), o && n || s(void 0), null)), [y, u]
    }
    (T)
}

function NC(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_controlledReadableStream") && T instanceof gl)
}

function rv(T) {
  if (! function(R) {
      let a = R._controlledReadableStream;
      if (!c$(R)) return !1;
      if (!R._started) return !1;
      if (Ok(a) && U7(a) > 0) return !0;
      if (mHT(R) > 0) return !0;
      return !1
    }
    (T)) return;
  if (T._pulling) return void(T._pullAgain = !0);
  T._pulling = !0, ot(T._pullAlgorithm(), () => (T._pulling = !1, T._pullAgain && (T._pullAgain = !1, rv(T)), null), (R) => (hv(T, R), null))
}

function TM(T) {
  T._pullAlgorithm = void 0, T._cancelAlgorithm = void 0, T._strategySizeAlgorithm = void 0
}

function hv(T, R) {
  let a = T._controlledReadableStream;
  a._state === "readable" && (lA(T), TM(T), yHT(a, R))
}

function mHT(T) {
  let R = T._controlledReadableStream._state;
  return R === "errored" ? null : R === "closed" ? 0 : T._strategyHWM - T._queueTotalSize
}

function c$(T) {
  return !T._closeRequested && T._controlledReadableStream._state === "readable"
}

function QLR(T, R, a, e) {
  let t = Object.create(gl.prototype),
    r, h, i;
  r = R.start !== void 0 ? () => R.start(t) : () => {}, h = R.pull !== void 0 ? () => R.pull(t) : () => E8(void 0), i = R.cancel !== void 0 ? (c) => R.cancel(c) : () => E8(void 0),
    function(c, s, A, l, o, n, p) {
      s._controlledReadableStream = c, s._queue = void 0, s._queueTotalSize = void 0, lA(s), s._started = !1, s._closeRequested = !1, s._pullAgain = !1, s._pulling = !1, s._strategySizeAlgorithm = p, s._strategyHWM = n, s._pullAlgorithm = l, s._cancelAlgorithm = o, c._readableStreamController = s, ot(E8(A()), () => (s._started = !0, rv(s), null), (_) => (hv(s, _), null))
    }
    (T, t, r, h, i, a, e)
}

function UC(T) {
  return TypeError(`ReadableStreamDefaultController.prototype.${T} can only be used on a ReadableStreamDefaultController`)
}

function ZLR(T, R, a) {
  return Mc(T, a), (e) => Em(T, R, [e])
}

function JLR(T, R, a) {
  return Mc(T, a), (e) => Em(T, R, [e])
}

function TMR(T, R, a) {
  return Mc(T, a), (e) => gU(T, R, [e])
}

function RMR(T, R) {
  if ((T = `${T}`) !== "bytes") throw TypeError(`${R} '${T}' is not a valid enumeration value for ReadableStreamType`);
  return T
}

function aMR(T, R) {
  if ((T = `${T}`) !== "byob") throw TypeError(`${R} '${T}' is not a valid enumeration value for ReadableStreamReaderMode`);
  return T
}

function WbT(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.preventAbort,
    e = T == null ? void 0 : T.preventCancel,
    t = T == null ? void 0 : T.preventClose,
    r = T == null ? void 0 : T.signal;
  return r !== void 0 && function(h, i) {
      if (! function(c) {
          if (typeof c != "object" || c === null) return !1;
          try {
            return typeof c.aborted == "boolean"
          } catch (s) {
            return !1
          }
        }
        (h)) throw TypeError(`${i} is not an AbortSignal.`)
    }
    (r, `${R} has member 'signal' that`), {
      preventAbort: Boolean(a),
      preventCancel: Boolean(e),
      preventClose: Boolean(t),
      signal: r
    }
}

function eMR(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.readable;
  ZV(a, "readable", "ReadableWritablePair"),
    function(t, r) {
      if (!i$(t)) throw TypeError(`${r} is not a ReadableStream.`)
    }
    (a, `${R} has member 'readable' that`);
  let e = T == null ? void 0 : T.writable;
  return ZV(e, "writable", "ReadableWritablePair"),
    function(t, r) {
      if (!XUT(t)) throw TypeError(`${r} is not a WritableStream.`)
    }
    (e, `${R} has member 'writable' that`), {
      readable: a,
      writable: e
    }
}
class me {
  constructor(T = {}, R = {}) {
    T === void 0 ? T = null : KUT(T, "First parameter");
    let a = q7(R, "Second parameter"),
      e = function(r, h) {
        hn(r, h);
        let i = r,
          c = i == null ? void 0 : i.autoAllocateChunkSize,
          s = i == null ? void 0 : i.cancel,
          A = i == null ? void 0 : i.pull,
          l = i == null ? void 0 : i.start,
          o = i == null ? void 0 : i.type;
        return {
          autoAllocateChunkSize: c === void 0 ? void 0 : VUT(c, `${h} has member 'autoAllocateChunkSize' that`),
          cancel: s === void 0 ? void 0 : ZLR(s, i, `${h} has member 'cancel' that`),
          pull: A === void 0 ? void 0 : JLR(A, i, `${h} has member 'pull' that`),
          start: l === void 0 ? void 0 : TMR(l, i, `${h} has member 'start' that`),
          type: o === void 0 ? void 0 : RMR(o, `${h} has member 'type' that`)
        }
      }
      (T, "First parameter");
    var t;
    if ((t = this)._state = "readable", t._reader = void 0, t._storedError = void 0, t._disturbed = !1, e.type === "bytes") {
      if (a.size !== void 0) throw RangeError("The strategy for a byte stream cannot have a size function");
      zLR(this, e, Yj(a, 0))
    } else {
      let r = W7(a);
      QLR(this, e, Yj(a, 1), r)
    }
  }
  get locked() {
    if (!ub(this)) throw R_("locked");
    return Ok(this)
  }
  cancel(T) {
    return ub(this) ? Ok(this) ? m9(TypeError("Cannot cancel a stream that already has a reader")) : uHT(this, T) : m9(R_("cancel"))
  }
  getReader(T) {
    if (!ub(this)) throw R_("getReader");
    return function(R, a) {
        hn(R, a);
        let e = R == null ? void 0 : R.mode;
        return {
          mode: e === void 0 ? void 0 : aMR(e, `${a} has member 'mode' that`)
        }
      }
      (T, "First parameter").mode === void 0 ? new Ml(this) : function(R) {
        return new Dl(R)
      }
      (this)
  }
  pipeThrough(T, R = {}) {
    if (!i$(this)) throw R_("pipeThrough");
    mn(T, 1, "pipeThrough");
    let a = eMR(T, "First parameter"),
      e = WbT(R, "Second parameter");
    if (this.locked) throw TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
    if (a.writable.locked) throw TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
    return vk(HbT(this, a.writable, e.preventClose, e.preventAbort, e.preventCancel, e.signal)), a.readable
  }
  pipeTo(T, R = {}) {
    if (!i$(this)) return m9(R_("pipeTo"));
    if (T === void 0) return m9("Parameter 1 is required in 'pipeTo'.");
    if (!XUT(T)) return m9(TypeError("ReadableStream.prototype.pipeTo's first argument must be a WritableStream"));
    let a;
    try {
      a = WbT(R, "Second parameter")
    } catch (e) {
      return m9(e)
    }
    return this.locked ? m9(TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream")) : T.locked ? m9(TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream")) : HbT(this, T, a.preventClose, a.preventAbort, a.preventCancel, a.signal)
  }
  tee() {
    if (!i$(this)) throw R_("tee");
    if (this.locked) throw TypeError("Cannot tee a stream that already has a reader");
    return YLR(this)
  }
  values(T) {
    if (!i$(this)) throw R_("values");
    return function(R, a) {
        let e = R.getReader(),
          t = new E3T(e, a),
          r = Object.create(cX);
        return r._asyncIteratorImpl = t, r
      }
      (this, function(R, a) {
          hn(R, a);
          let e = R == null ? void 0 : R.preventCancel;
          return {
            preventCancel: Boolean(e)
          }
        }
        (T, "First parameter").preventCancel)
  }
}

function ub(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_readableStreamController") && T instanceof me)
}

function Ok(T) {
  return T._reader !== void 0
}

function uHT(T, R) {
  if (T._disturbed = !0, T._state === "closed") return E8(void 0);
  if (T._state === "errored") return m9(T._storedError);
  iv(T);
  let a = T._reader;
  if (a !== void 0 && tP(a)) {
    let e = a._readIntoRequests;
    a._readIntoRequests = new Dh, e.forEach((t) => {
      t._closeSteps(void 0)
    })
  }
  return hc(T._readableStreamController[eM](R), HUT)
}

function iv(T) {
  T._state = "closed";
  let R = T._reader;
  if (R !== void 0 && (GUT(R), J_(R))) {
    let a = R._readRequests;
    R._readRequests = new Dh, a.forEach((e) => {
      e._closeSteps()
    })
  }
}

function yHT(T, R) {
  T._state = "errored", T._storedError = R;
  let a = T._reader;
  a !== void 0 && (O3T(a, R), J_(a) ? ZUT(a, R) : sHT(a, R))
}

function R_(T) {
  return TypeError(`ReadableStream.prototype.${T} can only be used on a ReadableStream`)
}

function PHT(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.highWaterMark;
  return ZV(a, "highWaterMark", "QueuingStrategyInit"), {
    highWaterMark: d3T(a)
  }
}
class F7 {
  constructor(T) {
    mn(T, 1, "ByteLengthQueuingStrategy"), T = PHT(T, "First parameter"), this._byteLengthQueuingStrategyHighWaterMark = T.highWaterMark
  }
  get highWaterMark() {
    if (!zbT(this)) throw qbT("highWaterMark");
    return this._byteLengthQueuingStrategyHighWaterMark
  }
  get size() {
    if (!zbT(this)) throw qbT("size");
    return EHT
  }
}

function qbT(T) {
  return TypeError(`ByteLengthQueuingStrategy.prototype.${T} can only be used on a ByteLengthQueuingStrategy`)
}

function zbT(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_byteLengthQueuingStrategyHighWaterMark") && T instanceof F7)
}
class G7 {
  constructor(T) {
    mn(T, 1, "CountQueuingStrategy"), T = PHT(T, "First parameter"), this._countQueuingStrategyHighWaterMark = T.highWaterMark
  }
  get highWaterMark() {
    if (!GbT(this)) throw FbT("highWaterMark");
    return this._countQueuingStrategyHighWaterMark
  }
  get size() {
    if (!GbT(this)) throw FbT("size");
    return CHT
  }
}

function FbT(T) {
  return TypeError(`CountQueuingStrategy.prototype.${T} can only be used on a CountQueuingStrategy`)
}

function GbT(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_countQueuingStrategyHighWaterMark") && T instanceof G7)
}

function tMR(T, R, a) {
  return Mc(T, a), (e) => Em(T, R, [e])
}

function rMR(T, R, a) {
  return Mc(T, a), (e) => gU(T, R, [e])
}

function hMR(T, R, a) {
  return Mc(T, a), (e, t) => Em(T, R, [e, t])
}
class K7 {
  constructor(T = {}, R = {}, a = {}) {
    T === void 0 && (T = null);
    let e = q7(R, "Second parameter"),
      t = q7(a, "Third parameter"),
      r = function(l, o) {
        hn(l, o);
        let n = l == null ? void 0 : l.flush,
          p = l == null ? void 0 : l.readableType,
          _ = l == null ? void 0 : l.start,
          m = l == null ? void 0 : l.transform,
          b = l == null ? void 0 : l.writableType;
        return {
          flush: n === void 0 ? void 0 : tMR(n, l, `${o} has member 'flush' that`),
          readableType: p,
          start: _ === void 0 ? void 0 : rMR(_, l, `${o} has member 'start' that`),
          transform: m === void 0 ? void 0 : hMR(m, l, `${o} has member 'transform' that`),
          writableType: b
        }
      }
      (T, "First parameter");
    if (r.readableType !== void 0) throw RangeError("Invalid readableType specified");
    if (r.writableType !== void 0) throw RangeError("Invalid writableType specified");
    let h = Yj(t, 0),
      i = W7(t),
      c = Yj(e, 1),
      s = W7(e),
      A;
    (function(l, o, n, p, _, m) {
      function b() {
        return o
      }

      function y(f) {
        return function(v, g) {
            let I = v._transformStreamController;
            if (v._backpressure) return hc(v._backpressureChangePromise, () => {
              if ((Os(v._writable) ? v._writable._state : v._writableState) === "erroring") throw Os(v._writable) ? v._writable._storedError : v._writableStoredError;
              return VbT(I, g)
            });
            return VbT(I, g)
          }
          (l, f)
      }

      function u(f) {
        return function(v, g) {
            return V7(v, g), E8(void 0)
          }
          (l, f)
      }

      function P() {
        return function(f) {
            let v = f._transformStreamController,
              g = v._flushAlgorithm();
            return kHT(v), hc(g, () => {
              if (f._readableState === "errored") throw f._readableStoredError;
              Y7(f) && fHT(f)
            }, (I) => {
              throw V7(f, I), f._readableStoredError
            })
          }
          (l)
      }

      function k() {
        return function(f) {
            return X7(f, !1), f._backpressureChangePromise
          }
          (l)
      }

      function x(f) {
        return jU(l, f), E8(void 0)
      }
      l._writableState = "writable", l._writableStoredError = void 0, l._writableHasInFlightOperation = !1, l._writableStarted = !1, l._writable = function(f, v, g, I, S, O, j) {
          return new wl({
            start(d) {
              f._writableController = d;
              try {
                let C = d.signal;
                C !== void 0 && C.addEventListener("abort", () => {
                  f._writableState === "writable" && (f._writableState = "erroring", C.reason && (f._writableStoredError = C.reason))
                })
              } catch (C) {}
              return hc(v(), () => (f._writableStarted = !0, YbT(f), null), (C) => {
                throw f._writableStarted = !0, G5(f, C), C
              })
            },
            write: (d) => (function(C) {
                C._writableHasInFlightOperation = !0
              }
              (f), hc(g(d), () => (function(C) {
                  C._writableHasInFlightOperation = !1
                }
                (f), YbT(f), null), (C) => {
                throw function(L, w) {
                    L._writableHasInFlightOperation = !1, G5(L, w)
                  }
                  (f, C), C
              })),
            close: () => (function(d) {
                d._writableHasInFlightOperation = !0
              }
              (f), hc(I(), () => (function(d) {
                  d._writableHasInFlightOperation = !1, d._writableState === "erroring" && (d._writableStoredError = void 0), d._writableState = "closed"
                }
                (f), null), (d) => {
                throw function(C, L) {
                    C._writableHasInFlightOperation = !1, C._writableState, G5(C, L)
                  }
                  (f, d), d
              })),
            abort: (d) => (f._writableState = "errored", f._writableStoredError = d, S(d))
          }, {
            highWaterMark: O,
            size: j
          })
        }
        (l, b, y, P, u, n, p), l._readableState = "readable", l._readableStoredError = void 0, l._readableCloseRequested = !1, l._readablePulling = !1, l._readable = function(f, v, g, I, S, O) {
          return new me({
            start: (j) => (f._readableController = j, v().catch((d) => {
              Q7(f, d)
            })),
            pull: () => (f._readablePulling = !0, g().catch((j) => {
              Q7(f, j)
            })),
            cancel: (j) => (f._readableState = "closed", I(j))
          }, {
            highWaterMark: S,
            size: O
          })
        }
        (l, b, k, x, _, m), l._backpressure = void 0, l._backpressureChangePromise = void 0, l._backpressureChangePromise_resolve = void 0, X7(l, !0), l._transformStreamController = void 0
    })(this, zt((l) => {
      A = l
    }), c, s, h, i),
    function(l, o) {
      let n = Object.create(Bl.prototype),
        p, _;
      p = o.transform !== void 0 ? (m) => o.transform(m, n) : (m) => {
          try {
            return xHT(n, m), E8(void 0)
          } catch (b) {
            return m9(b)
          }
        }, _ = o.flush !== void 0 ? () => o.flush(n) : () => E8(void 0),
        function(m, b, y, u) {
          b._controlledTransformStream = m, m._transformStreamController = b, b._transformAlgorithm = y, b._flushAlgorithm = u
        }
        (l, n, p, _)
    }
    (this, r), r.start !== void 0 ? A(r.start(this._transformStreamController)) : A(void 0)
  }
  get readable() {
    if (!KbT(this)) throw XbT("readable");
    return this._readable
  }
  get writable() {
    if (!KbT(this)) throw XbT("writable");
    return this._writable
  }
}

function KbT(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_transformStreamController") && T instanceof K7)
}

function V7(T, R) {
  Q7(T, R), jU(T, R)
}

function jU(T, R) {
  kHT(T._transformStreamController),
    function(a, e) {
      a._writableController.error(e), a._writableState === "writable" && gHT(a, e)
    }
    (T, R), T._backpressure && X7(T, !1)
}

function X7(T, R) {
  T._backpressureChangePromise !== void 0 && T._backpressureChangePromise_resolve(), T._backpressureChangePromise = zt((a) => {
    T._backpressureChangePromise_resolve = a
  }), T._backpressure = R
}
class Bl {
  constructor() {
    throw TypeError("Illegal constructor")
  }
  get desiredSize() {
    if (!HC(this)) throw WC("desiredSize");
    return IHT(this._controlledTransformStream)
  }
  enqueue(T) {
    if (!HC(this)) throw WC("enqueue");
    xHT(this, T)
  }
  error(T) {
    if (!HC(this)) throw WC("error");
    var R;
    R = T, V7(this._controlledTransformStream, R)
  }
  terminate() {
    if (!HC(this)) throw WC("terminate");
    (function(T) {
      let R = T._controlledTransformStream;
      Y7(R) && fHT(R);
      let a = TypeError("TransformStream terminated");
      jU(R, a)
    })(this)
  }
}

function HC(T) {
  return !!At(T) && (!!Object.prototype.hasOwnProperty.call(T, "_controlledTransformStream") && T instanceof Bl)
}

function kHT(T) {
  T._transformAlgorithm = void 0, T._flushAlgorithm = void 0
}

function xHT(T, R) {
  let a = T._controlledTransformStream;
  if (!Y7(a)) throw TypeError("Readable side is not in a state that permits enqueue");
  try {
    (function(e, t) {
      e._readablePulling = !1;
      try {
        e._readableController.enqueue(t)
      } catch (r) {
        throw Q7(e, r), r
      }
    })(a, R)
  } catch (e) {
    throw jU(a, e), a._readableStoredError
  }
  (function(e) {
    return ! function(t) {
        if (!Y7(t)) return !1;
        if (t._readablePulling) return !0;
        if (IHT(t) > 0) return !0;
        return !1
      }
      (e)
  })(a) !== a._backpressure && X7(a, !0)
}

function VbT(T, R) {
  return hc(T._transformAlgorithm(R), void 0, (a) => {
    throw V7(T._controlledTransformStream, a), a
  })
}

function WC(T) {
  return TypeError(`TransformStreamDefaultController.prototype.${T} can only be used on a TransformStreamDefaultController`)
}

function XbT(T) {
  return TypeError(`TransformStream.prototype.${T} can only be used on a TransformStream`)
}

function Y7(T) {
  return !T._readableCloseRequested && T._readableState === "readable"
}

function fHT(T) {
  T._readableState = "closed", T._readableCloseRequested = !0, T._readableController.close()
}

function Q7(T, R) {
  T._readableState === "readable" && (T._readableState = "errored", T._readableStoredError = R), T._readableController.error(R)
}

function IHT(T) {
  return T._readableController.desiredSize
}

function G5(T, R) {
  T._writableState !== "writable" ? W3T(T) : gHT(T, R)
}

function gHT(T, R) {
  T._writableState = "erroring", T._writableStoredError = R, ! function(a) {
      return a._writableHasInFlightOperation
    }
    (T) && T._writableStarted && W3T(T)
}

function W3T(T) {
  T._writableState = "errored"
}

function YbT(T) {
  T._writableState === "erroring" && W3T(T)
}
async function* cMR(T) {
  let R = T.byteOffset + T.byteLength,
    a = T.byteOffset;
  while (a !== R) {
    let e = Math.min(R - a, LHT),
      t = T.buffer.slice(a, a + e);
    a += t.byteLength, yield new Uint8Array(t)
  }
}
async function* sMR(T) {
  let R = 0;
  while (R !== T.size) {
    let a = await T.slice(R, Math.min(T.size, R + LHT)).arrayBuffer();
    R += a.byteLength, yield new Uint8Array(a)
  }
}
async function* V5(T, R = !1) {
  for (let a of T)
    if (ArrayBuffer.isView(a))
      if (R) yield* cMR(a);
      else yield a;
  else if (pe(a.stream)) yield* a.stream();
  else yield* sMR(a)
}

function* oMR(T, R, a = 0, e) {
  e !== null && e !== void 0 || (e = R);
  let t = a < 0 ? Math.max(R + a, 0) : Math.min(a, R),
    r = e < 0 ? Math.max(R + e, 0) : Math.min(e, R),
    h = Math.max(r - t, 0),
    i = 0;
  for (let c of T) {
    if (i >= h) break;
    let s = ArrayBuffer.isView(c) ? c.byteLength : c.size;
    if (t && s <= t) t -= s, r -= s;
    else {
      let A;
      if (ArrayBuffer.isView(c)) A = c.subarray(t, Math.min(s, r)), i += A.byteLength;
      else A = c.slice(t, Math.min(s, r)), i += A.size;
      r -= s, t = 0, yield A
    }
  }
}

function IMR() {
  let T = 16,
    R = "";
  while (T--) R += "abcdefghijklmnopqrstuvwxyz0123456789" [Math.random() * 36 << 0];
  return R
}

function $MR(T) {
  if (vMR(T) !== "object") return !1;
  let R = Object.getPrototypeOf(T);
  if (R === null || R === void 0) return !0;
  return (R.constructor && R.constructor.toString()) === Object.toString()
}

function UMR(T) {
  if (HMR(T) !== "object") return !1;
  let R = Object.getPrototypeOf(T);
  if (R === null || R === void 0) return !0;
  return (R.constructor && R.constructor.toString()) === Object.toString()
}

function XHT(T, {
  mtimeMs: R,
  size: a
}, e, t = {}) {
  let r;
  if (GHT(e))[t, r] = [e, void 0];
  else r = e;
  let h = new YHT({
    path: T,
    size: a,
    lastModified: R
  });
  if (!r) r = h.name;
  return new Ek([h], r, {
    ...t,
    lastModified: h.lastModified
  })
}

function GMR(T, R, a = {}) {
  let e = qMR(T);
  return XHT(T, e, R, a)
}
async function KMR(T, R, a) {
  let e = await VHT.stat(T);
  return XHT(T, e, R, a)
}
async function JMR(T, ...R) {
  let {
    fileFromPath: a
  } = await Promise.resolve().then(() => (XMR(), KHT));
  if (!emT) console.warn(`fileFromPath is deprecated; use fs.createReadStream(${JSON.stringify(T)}) instead`), emT = !0;
  return await a(T, ...R)
}
async function TDR(T, R) {
  let a = new zHT(T),
    e = QMR.from(a),
    t = new FHT(e),
    r = {
      ...R.headers,
      ...a.headers,
      "Content-Length": a.contentLength
    };
  return {
    ...R,
    body: t,
    headers: r
  }
}

function RDR() {
  if (typeof AbortController > "u") globalThis.AbortController = QHT.AbortController;
  return {
    kind: "node",
    fetch: s$.default,
    Request: s$.Request,
    Response: s$.Response,
    Headers: s$.Headers,
    FormData: BHT,
    Blob: dk,
    File: Ek,
    ReadableStream: ZMR,
    getMultipartRequestOptions: TDR,
    getDefaultAgent: (T) => T.startsWith("https") ? JHT : ZHT,
    fileFromPath: JMR,
    isFsReadStream: (T) => T instanceof YMR
  }
}
async function* tDR(T, R) {
  if (!T.body) throw R.abort(), new yi("Attempted to iterate over a response with no body");
  let a = new RWT,
    e = new yb,
    t = aWT(T.body);
  for await (let r of rDR(t)) for (let h of e.decode(r)) {
    let i = a.decode(h);
    if (i) yield i
  }
  for (let r of e.flush()) {
    let h = a.decode(r);
    if (h) yield h
  }
}
async function* rDR(T) {
  let R = new Uint8Array;
  for await (let a of T) {
    if (a == null) continue;
    let e = a instanceof ArrayBuffer ? new Uint8Array(a) : typeof a === "string" ? new TextEncoder().encode(a) : a,
      t = new Uint8Array(R.length + e.length);
    t.set(R), t.set(e, R.length), R = t;
    let r;
    while ((r = hDR(R)) !== -1) yield R.slice(0, r), R = R.slice(r)
  }
  if (R.length > 0) yield R
}

function hDR(T) {
  for (let R = 0; R < T.length - 2; R++) {
    if (T[R] === 10 && T[R + 1] === 10) return R + 2;
    if (T[R] === 13 && T[R + 1] === 13) return R + 2;
    if (T[R] === 13 && T[R + 1] === 10 && R + 3 < T.length && T[R + 2] === 13 && T[R + 3] === 10) return R + 4
  }
  return -1
}
class RWT {
  constructor() {
    this.event = null, this.data = [], this.chunks = []
  }
  decode(T) {
    if (T.endsWith("\r")) T = T.substring(0, T.length - 1);
    if (!T) {
      if (!this.event && !this.data.length) return null;
      let t = {
        event: this.event,
        data: this.data.join(`
`),
        raw: this.chunks
      };
      return this.event = null, this.data = [], this.chunks = [], t
    }
    if (this.chunks.push(T), T.startsWith(":")) return null;
    let [R, a, e] = iDR(T, ":");
    if (e.startsWith(" ")) e = e.substring(1);
    if (R === "event") this.event = e;
    else if (R === "data") this.data.push(e);
    return null
  }
}
class yb {
  constructor() {
    this.buffer = [], this.trailingCR = !1
  }
  decode(T) {
    let R = this.decodeText(T);
    if (this.trailingCR) R = "\r" + R, this.trailingCR = !1;
    if (R.endsWith("\r")) this.trailingCR = !0, R = R.slice(0, -1);
    if (!R) return [];
    let a = yb.NEWLINE_CHARS.has(R[R.length - 1] || ""),
      e = R.split(yb.NEWLINE_REGEXP);
    if (a) e.pop();
    if (e.length === 1 && !a) return this.buffer.push(e[0]), [];
    if (this.buffer.length > 0) e = [this.buffer.join("") + e[0], ...e.slice(1)], this.buffer = [];
    if (!a) this.buffer = [e.pop() || ""];
    return e
  }
  decodeText(T) {
    if (T == null) return "";
    if (typeof T === "string") return T;
    if (typeof Buffer < "u") {
      if (T instanceof Buffer) return T.toString();
      if (T instanceof Uint8Array) return Buffer.from(T).toString();
      throw new yi(`Unexpected: received non-Uint8Array (${T.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`)
    }
    if (typeof TextDecoder < "u") {
      if (T instanceof Uint8Array || T instanceof ArrayBuffer) return this.textDecoder ?? (this.textDecoder = new TextDecoder("utf8")), this.textDecoder.decode(T);
      throw new yi(`Unexpected: received non-Uint8Array/ArrayBuffer (${T.constructor.name}) in a web platform. Please report this error.`)
    }
    throw new yi("Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.")
  }
  flush() {
    if (!this.buffer.length && !this.trailingCR) return [];
    let T = [this.buffer.join("")];
    return this.buffer = [], this.trailingCR = !1, T
  }
}

function iDR(T, R) {
  let a = T.indexOf(R);
  if (a !== -1) return [T.substring(0, a), R, T.substring(a + R.length)];
  return [T, "", ""]
}

function aWT(T) {
  if (T[Symbol.asyncIterator]) return T;
  let R = T.getReader();
  return {
    async next() {
      try {
        let a = await R.read();
        if (a?.done) R.releaseLock();
        return a
      } catch (a) {
        throw R.releaseLock(), a
      }
    },
    async return () {
      let a = R.cancel();
      return R.releaseLock(), await a, {
        done: !0,
        value: void 0
      }
    },
    [Symbol.asyncIterator]() {
      return this
    }
  }
}
async function sDR(T, R, a) {
  if (T = await T, pDR(T)) return T;
  if (ADR(T)) {
    let t = await T.blob();
    R || (R = new URL(T.url).pathname.split(/[\\/]/).pop() ?? "unknown_file");
    let r = OU(t) ? [await t.arrayBuffer()] : [t];
    return new YV(r, R, a)
  }
  let e = await oDR(T);
  if (R || (R = lDR(T) ?? "unknown_file"), !a?.type) {
    let t = e[0]?.type;
    if (typeof t === "string") a = {
      ...a,
      type: t
    }
  }
  return new YV(e, R, a)
}
async function oDR(T) {
  let R = [];
  if (typeof T === "string" || ArrayBuffer.isView(T) || T instanceof ArrayBuffer) R.push(T);
  else if (OU(T)) R.push(await T.arrayBuffer());
  else if (_DR(T))
    for await (let a of T) R.push(a);
  else throw Error(`Unexpected data type: ${typeof T}; constructor: ${T?.constructor?.name}; props: ${nDR(T)}`);
  return R
}

function nDR(T) {
  return `[${Object.getOwnPropertyNames(T).map((R)=>`"${R}"`).join(", ")}]`
}

function lDR(T) {
  return Z5(T.name) || Z5(T.filename) || Z5(T.path)?.split(/[\\/]/).pop()
}
async function rmT(T) {
    let {
      response: R
    } = T;
    if (T.options.stream) {
      if (Pb("response", R.status, R.url, R.headers, R.body), T.options.__streamClass) return T.options.__streamClass.fromSSEResponse(R, T.controller);
      return eWT.fromSSEResponse(R, T.controller)
    }
    if (R.status === 204) return null;
    if (T.options.__binaryResponse) return R;
    let a = R.headers.get("content-type")?.split(";
      ")[0]?.trim();
      if (a?.includes("application/json") || a?.endsWith("+json")) {
        let t = await R.json();
        return Pb("response", R.status, R.url, R.headers, t), t
      }
      let e = await R.text();
      return Pb("response", R.status, R.url, R.headers, e), e
    }
    class rWT {
      constructor({
        baseURL: T,
        baseURLOverridden: R,
        maxRetries: a = 2,
        timeout: e = 60000,
        httpAgent: t,
        fetch: r
      }) {
        hM.set(this, void 0), this.baseURL = T, cWT(this, hM, R, "f"), this.maxRetries = J5("maxRetries", a), this.timeout = J5("timeout", e), this.httpAgent = t, this.fetch = r ?? DUT
      }
      authHeaders(T) {
        return {}
      }
      defaultHeaders(T) {
        return {
          Accept: "application/json",
          ...["head", "get"].includes(T.method) ? {} :
          {
            "Content-Type": "application/json"
          },
          "User-Agent": this.getUserAgent(),
          ...PDR(),
          ...this.authHeaders(T)
        }
      }
      validateHeaders(T, R) {}
      defaultIdempotencyKey() {
        return `stainless-node-retry-${IDR()}`
      }
      get(T, R) {
        return this.methodRequest("get", T, R)
      }
      post(T, R) {
        return this.methodRequest("post", T, R)
      }
      patch(T, R) {
        return this.methodRequest("patch", T, R)
      }
      put(T, R) {
        return this.methodRequest("put", T, R)
      }
      delete(T, R) {
        return this.methodRequest("delete", T, R)
      }
      methodRequest(T, R, a) {
        return this.request(Promise.resolve(a).then(async (e) => {
          let t = e && OU(e?.body) ? new DataView(await e.body.arrayBuffer()) : e?.body instanceof DataView ? e.body : e?.body instanceof ArrayBuffer ? new DataView(e.body) : e && ArrayBuffer.isView(e?.body) ? new DataView(e.body.buffer) : e?.body;
          return {
            method: T,
            path: R,
            ...e,
            body: t
          }
        }))
      }
      getAPIList(T, R, a) {
        return this.requestAPIList(R, {
          method: "get",
          path: T,
          ...a
        })
      }
      calculateContentLength(T) {
        if (typeof T === "string") {
          if (typeof Buffer < "u") return Buffer.byteLength(T, "utf8").toString();
          if (typeof TextEncoder < "u") return new TextEncoder().encode(T).length.toString()
        } else if (ArrayBuffer.isView(T)) return T.byteLength.toString();
        return null
      }
      async buildRequest(T, {
          retryCount: R = 0
        } = {}) {
          let a = {
              ...T
            },
            {
              method: e,
              path: t,
              query: r,
              defaultBaseURL: h,
              headers: i = {}
            } = a,
            c = ArrayBuffer.isView(a.body) || a.__binaryRequest && typeof a.body === "string" ? a.body : tmT(a.body) ? a.body.body : a.body ? JSON.stringify(a.body, null, 2) : null,
            s = this.calculateContentLength(c),
            A = this.buildURL(t, r, h);
          if ("timeout" in a) J5("timeout
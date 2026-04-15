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
      ...(s && {
        tool_choice: s
      })
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
        ...(l?.defaultHeaders ?? {})
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
    };
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
    }), dUT(g);
  }
}
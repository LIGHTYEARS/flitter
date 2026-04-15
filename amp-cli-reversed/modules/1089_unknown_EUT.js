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
    } : void 0);
  a.debug(`${o}Provider.stream: client obtained`, {
    model: e,
    threadId: t.id,
    clientReady: !!m
  });
  let b = [{
      role: "system",
      content: r.map(L => L.text).join(`

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
    I,
    S = 0,
    O = Date.now(),
    j = Date.now(),
    d,
    C = Date.now();
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
        ...(_ ?? {})
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
          textBlocks: V.content.filter(W => W.type === "text").length,
          toolUseBlocks: V.content.filter(W => W.type === "tool_use").length,
          thinkingBlocks: V.content.filter(W => W.type === "thinking").length,
          timeSinceLastYieldMs: Q,
          chunkProcessingTimeMs: Date.now() - D,
          model: e,
          threadId: t.id
        });
        O = Date.now(), d = I.finish_reason, yield V;
      } else if (S % 25 === 0) a.debug(`${o}: aggregated is undefined after chunk`, {
        chunkCount: S,
        eventChoices: w.choices?.length ?? 0,
        model: e,
        threadId: t.id
      });
    }
    if (I) {
      let w = $k(I, g),
        D = IbT(w, a);
      if (D.content.some(B => B.type === "tool_use" && B.complete === !1)) a.warn(`${o}: stream ended with incomplete tool_use`, {
        model: e,
        threadId: t.id,
        chunkCount: S,
        finishReason: I.finish_reason,
        contentBlocks: D.content.map(B => ({
          type: B.type,
          ...(B.type === "tool_use" ? {
            name: B.name,
            complete: B.complete,
            inputKeys: Object.keys(B.input ?? {})
          } : {})
        }))
      });
      if (RLR(D, e, t.id, a), I.finish_reason && d !== I.finish_reason) a.debug(`${o}: yielding final assistant message`, {
        model: e,
        threadId: t.id,
        finishReason: I.finish_reason,
        chunkCount: S,
        contentBlocks: D.content.length
      }), yield D;
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
    });
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
    }), dUT(L);
  } finally {
    a.debug(`${o}: stream cleanup (finally block)`, {
      model: e,
      threadId: t.id
    });
  }
}
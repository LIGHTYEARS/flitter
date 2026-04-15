class _UT {
  async *stream(T) {
    let R = Ur(T.logger),
      a = Js(T.serviceAuthToken),
      e = await uU({
        configService: T.configService
      }, T.signal, a ? {
        defaultHeaders: a
      } : void 0),
      t = await T.configService.getLatest(T.signal),
      r = T.serverStatus && X9(T.serverStatus) ? T.serverStatus.features : void 0,
      h = AUT(T.thread.agentMode, t.settings["openai.speed"], r),
      i = await R4R({
        ...T,
        serviceTier: h
      }),
      c,
      s = Date.now();
    try {
      R.info("[openai-responses] Creating Responses stream", {
        model: i.model,
        threadId: T.thread.id
      }), c = await e.responses.create(i, {
        signal: T.signal,
        headers: {
          ...m3T(T.thread, void 0, T.requestHeaders),
          ...(a ?? {})
        }
      }), R.info("[openai-responses] Responses.create returned", {
        model: i.model,
        threadId: T.thread.id
      });
    } catch (y) {
      if (xr(y)) throw new DOMException("Aborted", "AbortError");
      throw y;
    }
    let A,
      l = 0,
      o = Date.now(),
      n = Date.now(),
      p,
      _;
    R.info("[openai-responses] Stream started", {
      model: i.model,
      threadId: T.thread.id
    });
    let m = 30000,
      b;
    try {
      for await (let y of c) {
        l++, b = y.type;
        let u = Date.now();
        if (p === void 0) p = u - s, R.info("[openai-responses] Time to first byte", {
          model: i.model,
          threadId: T.thread.id,
          firstEventType: y.type,
          timeToFirstByteMs: p
        });
        let P = u - o;
        if (P > m) R.warn("[openai-responses] Long gap between events", {
          eventType: y.type,
          eventCount: l,
          timeSinceLastEventMs: P,
          totalElapsedMs: u - n
        });
        if (o = u, A = e4R(A, y, R), A) {
          let k = a4R(A, R),
            x = k.content.find(f => f.type === "text" && f.text.length > 0 || f.type === "thinking" && f.thinking.length > 0 || f.type === "tool_use");
          if (_ === void 0 && x) _ = u - s, R.info("[openai-responses] Time to first token", {
            model: i.model,
            threadId: T.thread.id,
            eventType: y.type,
            firstContentType: x.type,
            timeToFirstTokenMs: _
          });
          yield k;
        }
      }
      if (A && A.status === "in_progress" && !T.signal.aborted) throw R.warn("[openai-responses] Stream ended without terminal event", {
        eventCount: l,
        totalElapsedMs: Date.now() - n,
        timeToFirstByteMs: p,
        timeToFirstTokenMs: _,
        responseStatus: A.status,
        outputCount: A.output.length
      }), Error("Response incomplete: stream ended unexpectedly");
      if (A && A.status === "incomplete") {
        let y = A.incomplete_details?.reason ?? "unknown reason";
        throw Error(`Response incomplete: ${y}`);
      }
      R.info("[openai-responses] Stream completed", {
        eventCount: l,
        totalElapsedMs: Date.now() - n,
        timeToFirstByteMs: p,
        timeToFirstTokenMs: _
      });
    } catch (y) {
      throw R.error("[openai-responses] Stream error", {
        threadId: T.thread.id,
        eventCount: l,
        lastEventType: b,
        durationMs: Date.now() - n,
        timeToFirstByteMs: p,
        timeToFirstTokenMs: _,
        error: y instanceof Error ? y.message : String(y),
        errorName: y instanceof Error ? y.name : void 0
      }), y;
    }
  }
}
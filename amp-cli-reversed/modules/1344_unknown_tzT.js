async function tzT(T, R, a, e, t) {
  let r = kr(T.content);
  if (!r) return J.info("No text to generate title for thread", {
    threadId: R,
    firstMessage: _ET(JSON.stringify(T.content), 200)
  }), {
    title: void 0,
    usage: void 0
  };
  let h = P8T(t?.serviceAuthToken),
    i = await (await ep({
      configService: a
    }, e, h ? {
      defaultHeaders: h
    } : void 0)).messages.create({
      model: mb,
      max_tokens: 60,
      temperature: 0.7,
      system: `You are an assistant that generates short, descriptive titles (maximum 5 words, "Sentence case" with the first word capitalized not "Title Case") based on user's message to an agentic coding tool. Your titles should be concise (max 5 words) and capture the essence of the query or topic. DO NOT ASSUME OR GUESS the user's intent beyond what is in their message. Omit generic words like "question", "request", etc. Be professional and precise. Use common software engineering terms and acronyms if they are helpful. Use the set_title tool to provide your answer.`,
      messages: [{
        role: "user",
        content: `<message>${r}</message>`
      }],
      tools: [{
        name: "set_title",
        input_schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: 'The short thread title (maximum 5 words, "Sentence case" with the first word capitalized not "Title Case") that you generated for the message'
            }
          },
          required: ["title"]
        }
      }],
      tool_choice: {
        type: "tool",
        name: "set_title",
        disable_parallel_tool_use: !0
      }
    }, {
      stream: !1,
      signal: e,
      headers: {
        ...Vs({
          id: R
        })
      }
    }),
    c = `anthropic/${mb.replace(/^[^/]+\//, "")}`,
    s = dn(c),
    A = {
      model: mb,
      maxInputTokens: s.contextWindow - s.maxOutputTokens,
      inputTokens: i.usage.input_tokens,
      outputTokens: i.usage.output_tokens,
      cacheCreationInputTokens: i.usage.cache_creation_input_tokens,
      cacheReadInputTokens: i.usage.cache_read_input_tokens,
      totalInputTokens: i.usage.input_tokens + (i.usage.cache_creation_input_tokens ?? 0) + (i.usage.cache_read_input_tokens ?? 0),
      timestamp: new Date().toISOString()
    },
    l = i.content.at(0);
  if (!l) throw Error("no content in generateThreadTitle response");
  if (l.type !== "tool_use" || l.name !== "set_title") throw Error("missing or invalid tool_use in generateThreadTitle response");
  return {
    title: l.input && typeof l.input === "object" && "title" in l.input && typeof l.input.title === "string" ? l.input.title : void 0,
    usage: A
  };
}
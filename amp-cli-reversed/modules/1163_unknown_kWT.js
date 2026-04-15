function CDR(T, R, a) {
  return m0(EDR(T.configService.config, a?.defaultHeaders), R);
}
function LDR(T) {
  let R = dn(`cerebras/${T}`);
  return R.contextWindow - R.maxOutputTokens;
}
class kWT {
  async *stream({
    model: T,
    thread: R,
    systemPrompt: a,
    tools: e,
    configService: t,
    signal: r,
    serviceAuthToken: h,
    logger: i
  }) {
    let c = Ur(i),
      s = a.map(n => n.text).join(`
`),
      A = R.id,
      l = MDR(R),
      o = e;
    c.debug("Starting Cerebras inference", {
      model: T,
      threadID: A,
      messageCount: l.length,
      toolCount: o.length
    });
    try {
      let n = Js(h),
        p = await yWT(l, o, s, R, T, 0.7, {
          configService: t
        }, r, void 0, n ? {
          defaultHeaders: n
        } : void 0, n).catch(f => {
          throw BDR(f);
        }),
        _ = p.message,
        m = mWT(_),
        b = uWT(_)?.content || null;
      c.debug("Cerebras response parsed", {
        threadID: A,
        assistantContent: b ? b.slice(0, 200) + "..." : null,
        toolUsesCount: m.length,
        toolUses: m.map(f => ({
          name: f.name,
          id: f.id
        }))
      });
      let y = [];
      if (b) y.push({
        type: "text",
        text: b
      });
      if (m.length > 0) {
        c.debug("Processing tool uses", {
          threadId: A,
          toolUseCount: m.length
        });
        for (let f of m) c.debug("Adding tool_use block to message content", {
          threadId: A,
          toolUseId: f.id,
          toolName: f.name,
          parsedArgs: typeof f.input === "object" && f.input ? Object.keys(f.input) : []
        }), y.push(iN(f.name, f.input, f.id));
      } else c.debug("No tool uses to process", {
        threadId: A
      });
      let u = p.message.usage || {},
        P = u?.prompt_tokens ?? 0,
        k = u?.completion_tokens ?? 0,
        x = {
          inputTokens: P,
          outputTokens: k,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
          maxInputTokens: LDR(T),
          totalInputTokens: P,
          timestamp: new Date().toISOString()
        };
      return yield {
        role: "assistant",
        messageId: 0,
        content: y,
        state: {
          type: "complete",
          stopReason: m.length > 0 ? "tool_use" : null
        },
        usage: x
      }, {
        model: T,
        "~debugUsage": x
      };
    } catch (n) {
      throw c.error("Cerebras inference error", {
        error: n,
        model: T,
        threadId: A
      }), n;
    }
  }
}
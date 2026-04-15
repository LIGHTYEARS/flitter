function jER(T) {
  function R() {
    let t = [];
    for (let r of T.candidates?.at(0)?.content?.parts ?? []) if (r.text && r.thought) {
      let h = t.at(-1);
      if (h?.type === "thinking") t[t.length - 1] = {
        type: "thinking",
        thinking: h.thinking + r.text,
        signature: "",
        provider: "vertexai"
      };else t.push({
        type: "thinking",
        thinking: r.text,
        signature: "",
        provider: "vertexai"
      });
    } else if (r.text) {
      let h = t.at(-1);
      if (h?.type === "text") t[t.length - 1] = {
        type: "text",
        text: h.text + r.text
      };else t.push({
        type: "text",
        text: r.text
      });
    } else if (r.functionCall) t.push({
      type: "tool_use",
      complete: !0,
      id: r.functionCall.id ?? fx(),
      name: r.functionCall.name ?? "",
      input: r.functionCall.args ?? {},
      ...(r.thoughtSignature ? {
        metadata: {
          thoughtSignature: r.thoughtSignature
        }
      } : {})
    });
    return t;
  }
  function a() {
    if (!T.usageMetadata) return;
    let t = sU(T.modelVersion ?? "");
    return {
      model: t.name,
      maxInputTokens: t.contextWindow - t.maxOutputTokens,
      inputTokens: 0,
      cacheReadInputTokens: T.usageMetadata?.cachedContentTokenCount ?? 0,
      cacheCreationInputTokens: (T.usageMetadata?.promptTokenCount ?? 0) - (T.usageMetadata?.cachedContentTokenCount ?? 0),
      outputTokens: (T.usageMetadata?.totalTokenCount ?? 0) - (T.usageMetadata?.promptTokenCount ?? 0),
      totalInputTokens: T.usageMetadata?.promptTokenCount ?? 0,
      timestamp: new Date().toISOString()
    };
  }
  function e() {
    let t = T.candidates?.at(0)?.finishReason,
      r = T.candidates?.at(0)?.finishMessage;
    switch (t) {
      case Me.STOP:
        {
          if (T.candidates?.at(0)?.content?.parts?.some(h => h.functionCall !== void 0)) return {
            type: "complete",
            stopReason: "tool_use"
          };
          return {
            type: "complete",
            stopReason: "end_turn"
          };
        }
      case Me.MAX_TOKENS:
        return {
          type: "complete",
          stopReason: "max_tokens"
        };
      case Me.BLOCKLIST:
      case Me.SAFETY:
      case Me.RECITATION:
      case Me.LANGUAGE:
      case Me.PROHIBITED_CONTENT:
      case Me.IMAGE_PROHIBITED_CONTENT:
      case Me.IMAGE_SAFETY:
      case Me.SPII:
      case Me.OTHER:
      case Me.FINISH_REASON_UNSPECIFIED:
      case Me.NO_IMAGE:
        return {
          type: "error",
          error: {
            message: `provider refused to continue with code '${t}': ${r}`
          }
        };
      case Me.UNEXPECTED_TOOL_CALL:
      case Me.MALFORMED_FUNCTION_CALL:
        return {
          type: "error",
          error: {
            message: `provider failed with code '${t}': ${r}`
          }
        };
      case void 0:
        return {
          type: "streaming"
        };
      default:
        return {
          type: "error",
          error: {
            message: `provider refused to continue with code '${t}': ${r}`
          }
        };
    }
  }
  return {
    role: "assistant",
    messageId: 0,
    content: R(),
    state: e(),
    usage: a(),
    nativeMessage: {
      type: "vertexai",
      message: T
    }
  };
}
function a4R(T, R) {
  function a(h) {
    if (h.incomplete_details?.reason === "max_output_tokens") return "max_tokens";
    if (h.incomplete_details?.reason === "content_filter") return "refusal";
    if (h.output.some(i => i.type === "function_call")) return "tool_use";
    return "end_turn";
  }
  function e(h) {
    return JCR({
      model: T.model,
      status: T.status,
      usage: h,
      logger: R
    });
  }
  function t(h, i) {
    let c = [];
    for (let [s, A] of h.entries()) {
      let l = i?.[s],
        o = {
          ...(l?.startTime !== void 0 ? {
            startTime: l.startTime
          } : {}),
          ...(l?.finalTime !== void 0 ? {
            finalTime: l.finalTime
          } : {})
        };
      switch (A.type) {
        case "message":
          for (let n of A.content) if (n.type === "refusal") c.push({
            type: "text",
            text: n.refusal,
            ...o
          });else c.push({
            type: "text",
            text: n.text,
            ...o
          });
          break;
        case "function_call":
          try {
            let n = JSON.parse(A.arguments);
            c.push({
              type: "tool_use",
              complete: !0,
              id: A.call_id,
              name: A.name,
              input: n,
              ...o
            });
          } catch {
            c.push({
              type: "tool_use",
              complete: !1,
              id: A.call_id,
              name: A.name,
              inputPartialJSON: {
                json: A.arguments
              },
              input: YN(A.arguments || "{}"),
              inputIncomplete: u8T(A.arguments || "{}"),
              ...o
            });
          }
          break;
        case "reasoning":
          {
            let n = A.summary && A.summary.length > 0 ? A.summary.map(p => p.text) : (A.content ?? []).filter(p => p.type === "reasoning_text").map(p => p.text);
            if (n.length === 0 && A.encrypted_content && A.id) {
              c.push({
                type: "thinking",
                thinking: "",
                signature: A.encrypted_content,
                provider: "openai",
                openAIReasoning: {
                  id: A.id,
                  encryptedContent: A.encrypted_content
                },
                ...o
              });
              break;
            }
            for (let p of n) c.push({
              type: "thinking",
              thinking: p,
              signature: A.encrypted_content ?? "",
              provider: "openai",
              ...(A.encrypted_content && A.id ? {
                openAIReasoning: {
                  id: A.id,
                  encryptedContent: A.encrypted_content
                }
              } : {}),
              ...o
            });
            break;
          }
        case "file_search_call":
        case "web_search_call":
        case "computer_call":
        case "image_generation_call":
        case "code_interpreter_call":
        case "local_shell_call":
        case "mcp_call":
        case "mcp_list_tools":
        case "mcp_approval_request":
        case "custom_tool_call":
          throw Error(`unsupported content block type ${A.type}`);
      }
    }
    return c;
  }
  function r(h) {
    switch (h.status) {
      case "completed":
        return {
          type: "complete",
          stopReason: a(h)
        };
      case "in_progress":
        return {
          type: "streaming"
        };
      case "failed":
        return {
          type: "error",
          error: h.error ?? {
            message: "unknown"
          }
        };
      case "incomplete":
        return {
          type: "error",
          error: {
            message: `Response incomplete: ${h.incomplete_details?.reason ?? "unknown reason"}`
          }
        };
      case "cancelled":
        return {
          type: "cancelled"
        };
      default:
        return {
          type: "streaming"
        };
    }
  }
  return {
    role: "assistant",
    messageId: 0,
    content: t(T.output, T[Mo]),
    meta: (() => {
      let h = [...T.output].reverse().map(FCR).find(i => i !== void 0);
      if (!h) return;
      return {
        openAIResponsePhase: h
      };
    })(),
    state: r(T),
    usage: e(T.usage)
  };
}
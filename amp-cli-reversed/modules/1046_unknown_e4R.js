function e4R(T, R, a) {
  let e = Ur(a);
  return Lt(T, t => {
    if (!t) {
      if (R.type !== "response.created") throw Error(`When snapshot hasn't been set yet, expected 'response.created' event, got ${R.type}`);
      return e.info("[openai-responses] response.created", {
        responseId: R.response.id,
        model: R.response.model,
        status: R.response.status
      }), R.response;
    }
    if (R.type === "keepalive") {
      e.info("[openai-responses] got keep alive event");
      return;
    }
    switch (R.type) {
      case "response.output_item.added":
        {
          let r = Date.now(),
            h = t[Mo] ??= [],
            i = h[R.output_index];
          if (R.item.type === "function_call") e.debug("[openai-responses] function_call item added", {
            name: R.item.name,
            hasName: !!R.item.name,
            callId: R.item.call_id,
            outputIndex: R.output_index
          });
          h[R.output_index] = {
            startTime: i?.startTime ?? r,
            ...(i?.finalTime !== void 0 ? {
              finalTime: i.finalTime
            } : {})
          }, t.output[R.output_index] = R.item;
          break;
        }
      case "response.output_item.done":
        {
          let r = Date.now(),
            h = t[Mo] ??= [],
            i = h[R.output_index];
          if (!t.output[R.output_index]) throw Error(`missing output at index ${R.output_index}`);
          h[R.output_index] = {
            startTime: i?.startTime ?? r,
            finalTime: r
          }, t.output[R.output_index] = R.item;
          break;
        }
      case "response.function_call_arguments.delta":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type !== "function_call") throw Error(`expected output to be 'function_call', got ${r.type}`);
          r.arguments += R.delta;
          break;
        }
      case "response.function_call_arguments.done":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type !== "function_call") throw Error(`expected output to be 'function_call', got ${r.type}`);
          e.debug("[openai-responses] function_call arguments done", {
            eventName: R.name,
            existingName: r.name,
            nameChanged: r.name !== R.name,
            outputIndex: R.output_index
          }), r.arguments = R.arguments, r.name = R.name;
          break;
        }
      case "response.content_part.added":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "message" && (R.part.type === "output_text" || R.part.type === "refusal")) r.content[R.content_index] = R.part;else if (r.type === "reasoning" && R.part.type === "reasoning_text") {
            if (!r.content) r.content = [];
            r.content[R.content_index] = R.part;
          } else throw Error(`unexpected content_part.added for output ${r.type}: ${R.part.type}`);
          break;
        }
      case "response.content_part.done":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "message") {
            if (!r.content[R.content_index]) throw Error(`missing content at index ${R.content_index}`);
            if (R.part.type === "output_text" || R.part.type === "refusal") r.content[R.content_index] = R.part;else throw Error(`unexpected content_part.done for message: ${R.part.type}`);
          } else if (r.type === "reasoning" && R.part.type === "reasoning_text") {
            if (!r.content) r.content = [];
            r.content[R.content_index] = R.part;
          } else throw Error(`unexpected content_part.done for output ${r.type}: ${R.part.type}`);
          break;
        }
      case "response.output_text.delta":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "message") {
            let h = r.content[R.content_index];
            if (!h) throw Error(`missing content at index ${R.content_index}`);
            if (h.type !== "output_text") throw Error(`expected content to be 'output_text', got ${h.type}`);
            h.text += R.delta;
          } else throw Error(`unexpected output for output_text.delta: ${r.type}`);
          break;
        }
      case "response.output_text.done":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "message") {
            let h = r.content[R.content_index];
            if (!h) throw Error(`missing content at index ${R.content_index}`);
            if (h.type !== "output_text") throw Error(`expected content to be 'output_text', got ${h.type}`);
            h.text = R.text;
          } else throw Error(`unexpected output for output_text.done: ${r.type}`);
          break;
        }
      case "response.reasoning_text.delta":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "reasoning") {
            let h = r.content?.[R.content_index];
            if (!h) throw Error(`missing content at index ${R.content_index}`);
            if (h.type !== "reasoning_text") throw Error(`expected content to be 'reasoning_text', got ${h.type}`);
            h.text += R.delta;
          } else throw Error(`unexpected output for reasoning_text.delta: ${r.type}`);
          break;
        }
      case "response.reasoning_text.done":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "reasoning") {
            if (!r.content) r.content = [];
            let h = r.content[R.content_index];
            if (!h) throw Error(`missing content at index ${R.content_index}`);
            if (h.type !== "reasoning_text") throw Error(`expected content to be 'reasoning_text', got ${h.type}`);
            h.text = R.text;
          } else throw Error(`unexpected output for reasoning_text.done: ${r.type}`);
          break;
        }
      case "response.reasoning_summary_text.delta":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "reasoning") {
            let h = r.summary[R.summary_index];
            if (!h) throw Error(`missing summary at index ${R.summary_index}`);
            if (h.type !== "summary_text") throw Error(`expected summary to be 'summary_text', got ${h.type}`);
            h.text += R.delta;
          } else throw Error(`unexpected output for reasoning_summary_text.delta: ${r.type}`);
          break;
        }
      case "response.reasoning_summary_part.added":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "reasoning") r.summary[R.summary_index] = R.part;else throw Error(`unexpected output for reasoning_summary_part.added: ${r.type}`);
          break;
        }
      case "response.reasoning_summary_part.done":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "reasoning") r.summary[R.summary_index] = R.part;else throw Error(`unexpected output for reasoning_summary_part.done: ${r.type}`);
          break;
        }
      case "response.reasoning_summary_text.done":
        {
          let r = t.output[R.output_index];
          if (!r) throw Error(`missing output at index ${R.output_index}`);
          if (r.type === "reasoning") {
            let h = r.summary[R.summary_index];
            if (!h) throw Error(`missing summary at index ${R.summary_index}`);
            h.text = R.text;
          } else throw Error(`unexpected output for reasoning_summary_text.done: ${r.type}`);
          break;
        }
      case "response.completed":
        {
          e.info("[openai-responses] response.completed", {
            responseId: R.response.id,
            model: R.response.model,
            status: R.response.status,
            outputCount: R.response.output.length
          });
          let r = t[Mo];
          return r ? Object.assign({}, R.response, {
            [Mo]: r.map(h => h ? {
              ...h
            } : h)
          }) : R.response;
        }
      case "response.failed":
        {
          e.error("[openai-responses] response.failed", {
            responseId: R.response.id,
            model: R.response.model,
            status: R.response.status
          });
          let r = t[Mo];
          return r ? Object.assign({}, R.response, {
            [Mo]: r.map(h => h ? {
              ...h
            } : h)
          }) : R.response;
        }
      case "response.incomplete":
        {
          e.warn("[openai-responses] response.incomplete", {
            responseId: R.response.id,
            model: R.response.model,
            status: R.response.status,
            reason: R.response.incomplete_details?.reason
          });
          let r = t[Mo];
          return r ? Object.assign({}, R.response, {
            [Mo]: r.map(h => h ? {
              ...h
            } : h)
          }) : R.response;
        }
      case "error":
        {
          let r = R;
          throw Error(`OpenAI stream error (${r.code}): ${r.message}`);
        }
      case "response.in_progress":
      case "response.refusal.delta":
      case "response.refusal.done":
        break;
      default:
        e.info("[openai-responses] Unhandled stream event type", {
          eventType: R.type
        });
    }
  });
}
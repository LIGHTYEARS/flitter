function P3T(T) {
  let R = [],
    {
      summaryBlock: a,
      index: e
    } = pm(T) ?? {
      summaryBlock: void 0,
      index: -1
    },
    t = e + 1;
  if (a && a.summary.type === "message") R.push({
    type: "message",
    role: "assistant",
    content: a.summary.summary.trimEnd()
  });
  for (let r = t; r < T.messages.length; r++) {
    let h = T.messages[r];
    if (!h) continue;
    switch (h.role) {
      case "user":
        {
          let i = [],
            c = [],
            s = [];
          if (h.fileMentions && h.fileMentions.files.length > 0) i.push({
            type: "input_text",
            text: $m(h.fileMentions)
          });
          if (h.userState) i.push({
            type: "input_text",
            text: Ox(h.userState)
          });
          for (let A of h.content) switch (A.type) {
            case "tool_result":
              {
                if (A.run?.status === "done") {
                  let l = A.run.result;
                  if (typeof l === "object" && l !== null && "discoveredGuidanceFiles" in l && Array.isArray(l.discoveredGuidanceFiles)) s.push(...l.discoveredGuidanceFiles);
                }
                c.push({
                  type: "function_call_output",
                  call_id: A.toolUseID,
                  output: GCR(A.run, !0)
                });
                break;
              }
            case "image":
              {
                let l = ZN(A);
                if (l) {
                  i.push({
                    type: "input_text",
                    text: l
                  });
                  break;
                }
                if (i.push({
                  type: "input_text",
                  text: PO(A)
                }), A.source.type === "url") i.push({
                  type: "input_image",
                  detail: "auto",
                  image_url: A.source.url
                });else if (A.source.type === "base64") i.push({
                  type: "input_image",
                  detail: "auto",
                  image_url: `data:${A.source.mediaType};base64,${A.source.data}`
                });
                break;
              }
            case "text":
              if (A.text.trim()) i.push({
                type: "input_text",
                text: A.text
              });
              break;
          }
          if (h.discoveredGuidanceFiles) s.push(...h.discoveredGuidanceFiles);
          if (s.length > 0) i.unshift({
            type: "input_text",
            text: Z9T(s, "deep")
          });
          if (i.length > 0) R.push({
            type: "message",
            role: "user",
            content: i
          });
          R.push(...c);
          break;
        }
      case "assistant":
        {
          let i = h.meta?.openAIResponsePhase,
            c = new Set();
          for (let s of h.content) if (s.type === "text") {
            let A = {
              type: "message",
              role: "assistant",
              content: s.text
            };
            if (i) A.phase = i;
            R.push(A);
          } else if (s.type === "thinking") {
            let A = s.thinking.match(/<ENCRYPTED>([\s\S]*?)<\/ENCRYPTED><ID>([\s\S]*?)<\/ID>/),
              l = s.openAIReasoning?.encryptedContent ?? A?.[1] ?? "",
              o = s.openAIReasoning?.id ?? A?.[2] ?? "",
              n = s.openAIReasoning ? s.thinking : s.thinking.replace(/<ENCRYPTED>[\s\S]*?<\/ENCRYPTED><ID>[\s\S]*?<\/ID>/g, "");
            if (o.length > 0 && l.length > 0 && !c.has(o)) {
              c.add(o);
              let p = n.length > 0 ? [{
                text: n,
                type: "summary_text"
              }] : [];
              R.push({
                type: "reasoning",
                summary: p,
                encrypted_content: l,
                id: o
              });
            }
          } else if (s.type === "tool_use") R.push({
            type: "function_call",
            name: s.name,
            call_id: s.id,
            arguments: JSON.stringify(s.input)
          });
          break;
        }
      case "info":
        {
          let i = [];
          for (let c of h.content) if (c.type === "manual_bash_invocation") {
            let s = dx(c);
            for (let A of s) i.push({
              type: "input_text",
              text: A.text
            });
          } else if (c.type === "text" && c.text.trim().length > 0) i.push({
            type: "input_text",
            text: c.text
          });
          if (i.length > 0) R.push({
            type: "message",
            role: "user",
            content: i
          });
          break;
        }
    }
  }
  return JA(R);
}
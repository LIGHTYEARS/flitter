function y3T(T) {
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
      case "user":
        {
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
                content: B7(c.run),
                tool_call_id: c.toolUseID.replace(/^toolu_/, "")
              });
              break;
            case "image":
              {
                let s = ZN(c);
                if (s) {
                  h.push({
                    type: "text",
                    text: s
                  });
                  break;
                }
                if (h.push({
                  type: "text",
                  text: PO(c)
                }), c.source.type === "url") h.push({
                  type: "image_url",
                  image_url: {
                    url: c.source.url
                  }
                });else if (c.source.type === "base64") h.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${c.source.mediaType};base64,${c.source.data}`
                  }
                });
                break;
              }
            case "text":
              if (c.text.trim()) h.push({
                type: "text",
                text: c.text
              });
              break;
          }
          if (h.length > 0) R.push({
            role: "user",
            content: h
          });
          R.push(...i);
          break;
        }
      case "assistant":
        {
          let h = r.content.filter(c => {
              if (c.type !== "thinking" && c.type !== "redacted_thinking") return !0;
              let s = "provider" in c ? c.provider : void 0;
              return !s || s === "openai";
            }).filter(c => c.type === "text" || c.type === "thinking").map(c => {
              if (c.type === "text") return {
                type: "text",
                text: c.text
              };else return {
                type: "text",
                text: `Thoughts: ${c.thinking}`
              };
            }),
            i = r.content.filter(c => c.type === "tool_use" && Va(c)).map(c => ({
              id: c.id.replace(/^toolu_/, ""),
              type: "function",
              function: {
                name: c.name,
                arguments: JSON.stringify(c.input)
              }
            }));
          R.push({
            role: "assistant",
            content: h.length > 0 ? h : null,
            tool_calls: i.length > 0 ? i : void 0
          });
          break;
        }
      case "info":
        {
          let h = [];
          for (let i of r.content) if (i.type === "manual_bash_invocation") {
            let c = dx(i);
            h.push(...c);
          } else if (i.type === "text" && i.text.trim().length > 0) h.push({
            type: "text",
            text: i.text
          });
          if (h.length > 0) R.push({
            role: "user",
            content: h
          });
          break;
        }
    }
  }
  return JA(R);
}
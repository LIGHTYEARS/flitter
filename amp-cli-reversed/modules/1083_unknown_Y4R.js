function Y4R(T, R) {
  let a = Ur(R);
  a.debug("Fireworks: converting native thread to Fireworks messages", {
    threadId: T.id,
    totalMessages: T.messages.length
  });
  let e = [],
    {
      summaryBlock: t,
      index: r
    } = pm(T) ?? {
      summaryBlock: void 0,
      index: 0
    };
  if (t && t.summary.type === "message") e.push({
    role: "assistant",
    content: [{
      type: "text",
      text: t.summary.summary.trimEnd()
    }]
  });
  let h = 0,
    i = 0,
    c = 0;
  for (let s = r + (t ? 1 : 0); s < T.messages.length; s++) {
    let A = T.messages[s];
    if (!A) continue;
    switch (A.role) {
      case "user":
        {
          let l = [],
            o = [];
          if (A.fileMentions && A.fileMentions.files.length > 0) l.push({
            type: "text",
            text: $m(A.fileMentions)
          });
          if (A.userState) l.push({
            type: "text",
            text: Ox(A.userState)
          });
          for (let n of A.content) switch (n.type) {
            case "tool_result":
              o.push({
                role: "tool",
                content: B7(n.run),
                tool_call_id: n.toolUseID.replace(/^toolu_/, "")
              });
              break;
            case "image":
              {
                let p = ZN(n);
                if (p) {
                  l.push({
                    type: "text",
                    text: p
                  });
                  break;
                }
                if (l.push({
                  type: "text",
                  text: PO(n)
                }), n.source.type === "url") l.push({
                  type: "image_url",
                  image_url: {
                    url: n.source.url
                  }
                });else if (n.source.type === "base64") l.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${n.source.mediaType};base64,${n.source.data}`
                  }
                });
                break;
              }
            case "text":
              if (n.text.trim()) l.push({
                type: "text",
                text: n.text
              });
              break;
          }
          if (l.length > 0) e.push({
            role: "user",
            content: l
          });
          e.push(...o), h++;
          break;
        }
      case "assistant":
        {
          let l = A.content.filter(p => p.type === "text").map(p => ({
              type: "text",
              text: p.text
            })),
            o = A.content.filter(p => p.type === "thinking").map(p => p.thinking).filter(p => p.trim().length > 0).join(`

`),
            n = A.content.filter(p => p.type === "tool_use" && Va(p)).map(p => ({
              id: p.id.replace(/^toolu_/, ""),
              type: "function",
              function: {
                name: p.name,
                arguments: JSON.stringify(p.input)
              }
            }));
          if (l.length > 0 || n.length > 0 || o.length > 0) e.push({
            role: "assistant",
            content: l.length > 0 ? l : null,
            reasoning_content: o.length > 0 ? o : void 0,
            tool_calls: n.length > 0 ? n : void 0
          }), i++;
          break;
        }
      case "info":
        {
          let l = [];
          for (let o of A.content) if (o.type === "manual_bash_invocation") {
            let n = dx(o);
            l.push(...n);
          } else if (o.type === "text" && o.text.trim().length > 0) l.push({
            type: "text",
            text: o.text
          });
          if (l.length > 0) e.push({
            role: "user",
            content: l
          }), c++;
          break;
        }
    }
  }
  return a.debug("Fireworks: thread conversion complete", {
    threadId: T.id,
    totalOutputMessages: e.length,
    userMessagesConverted: h,
    assistantMessagesConverted: i,
    infoMessagesConverted: c,
    hasSummaryBlock: !!t
  }), JA(e);
}
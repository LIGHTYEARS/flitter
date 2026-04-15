function rNT(T) {
  let {
      summaryBlock: R,
      index: a
    } = pm(T) ?? {
      summaryBlock: void 0,
      index: 0
    },
    e = [];
  if (R && R.summary.type === "message") e.push({
    role: "model",
    parts: [{
      text: R.summary.summary.trimEnd()
    }]
  });
  for (let t = a + (R ? 1 : 0); t < T.messages.length; t++) {
    let r = T.messages[t];
    if (!r) continue;
    switch (r.role) {
      case "user":
        {
          let h = gER(r, T);
          if (h.length === 0) continue;
          e.push({
            role: "user",
            parts: h
          });
          break;
        }
      case "assistant":
        {
          let h = r.content.filter(s => {
              if (s.type === "tool_use" && !s.complete) return !1;
              if (s.type === "server_tool_use") return !1;
              return !0;
            }),
            i = sA(T);
          for (let s of h) if (s.type === "tool_use") {
            if (!i.get(s.id)?.run) throw Error(`(bug) corresponding tool_result not found for tool_use (id=${s.id}, name=${s.name})`);
          }
          if (r.nativeMessage?.type === "vertexai") {
            let s = r.nativeMessage.message.candidates?.[0]?.content,
              A = {
                role: s?.role ?? "model",
                parts: s?.parts ?? []
              };
            e.push(O8(A));
            break;
          }
          if (h.length === 0) break;
          let c = $ER(h);
          if (c.length > 0) e.push({
            role: "model",
            parts: c
          });
          break;
        }
      case "info":
        {
          let h = [];
          for (let i of r.content) if (i.type === "manual_bash_invocation") {
            let c = dx(i);
            h.push(...c.map(s => ({
              text: s.text
            })));
          } else if (i.type === "text" && i.text.trim().length > 0) h.push({
            text: i.text
          });
          if (h.length > 0) e.push({
            role: "user",
            parts: h
          });
          break;
        }
    }
  }
  return e;
}
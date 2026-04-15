function k8T(T, R) {
  let {
      summaryBlock: a,
      index: e
    } = pm(T) ?? {
      summaryBlock: void 0,
      index: 0
    },
    t = [];
  if (a && a.summary.type === "message") t.push({
    role: "assistant",
    content: [{
      type: "text",
      text: a.summary.summary.trimEnd()
    }]
  });
  for (let r = e + (a ? 1 : 0); r < T.messages.length; r++) {
    let h = T.messages[r];
    if (!h) continue;
    switch (h.role) {
      case "user":
        {
          let i = ZfR(h, R);
          if (i.length === 0) continue;
          t.push({
            role: "user",
            content: i
          });
          break;
        }
      case "assistant":
        {
          let i = h.content.filter(l => {
              if (l.type === "tool_use" && !Va(l)) return !1;
              if (l.type === "server_tool_use") return !1;
              if (l.type === "thinking" || l.type === "redacted_thinking") {
                let o = "provider" in l ? l.provider : void 0;
                return !o || o === "anthropic";
              }
              return !0;
            }).map(l => {
              if (l.type === "thinking") return {
                type: "thinking",
                thinking: l.thinking,
                signature: l.signature
              };
              if (l.type === "redacted_thinking") return {
                type: "redacted_thinking",
                data: l.data
              };
              if (l.type === "tool_use") return {
                type: "tool_use",
                id: l.id,
                name: l.name,
                input: l.input
              };
              return {
                type: "text",
                text: l.text
              };
            }),
            c = sA(T);
          for (let l of i) if (l.type === "tool_use") {
            if (!c.get(l.id)?.run) throw Error(`(bug) corresponding tool_result not found for tool_use (id=${l.id}, name=${l.name})`);
          }
          if (i.length === 0) break;
          let s = QfR(i),
            A = s.length - 1;
          while (A >= 0) {
            let l = s[A];
            if (!l || l.type !== "thinking" && l.type !== "redacted_thinking") break;
            A--;
          }
          if (A < s.length - 1) s = s.slice(0, A + 1);
          if (s.length > 0) t.push({
            role: "assistant",
            content: O8(s)
          });
          break;
        }
      case "info":
        {
          let i = [];
          for (let c of h.content) if (c.type === "manual_bash_invocation") {
            let s = dx(c);
            i.push(...s);
          } else if (c.type === "text" && c.text.trim().length > 0) i.push({
            type: "text",
            text: c.text
          });
          if (i.length > 0) t.push({
            role: "user",
            content: i
          });
          break;
        }
    }
  }
  return t;
}
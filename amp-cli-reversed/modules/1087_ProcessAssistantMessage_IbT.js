function IbT(T, R) {
  let a = Ur(R),
    e = T.content.length,
    t = {
      ...T,
      content: T.content.map(h => {
        if (h.type === "thinking") return {
          ...h,
          thinking: h.thinking.trim()
        };
        if (h.type === "text") return {
          ...h,
          text: h.text.trim()
        };
        return h;
      }).filter(h => {
        if (h.type === "thinking") return h.thinking !== "";
        if (h.type === "text") return h.text !== "";
        return !0;
      })
    },
    r = t.content.length;
  if (e !== r) a.debug("Fireworks: postProcessAssistantMessage filtered empty blocks", {
    inputBlockCount: e,
    outputBlockCount: r,
    filteredCount: e - r,
    messageId: T.messageId
  });
  return t;
}
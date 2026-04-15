function Q50(T) {
  let R = 0,
    a = 0,
    e = 0,
    t = "";
  for (let h of T.content) {
    if (h.type === "text") {
      R += 1, a += h.text.length;
      continue;
    }
    if (h.type === "thinking") e += 1, t += `|${tf(h.thinking).length}:${Xm(h) ? "1" : "0"}:${h.signature.length}`;
  }
  let r = T.state.type === "complete" ? T.state.stopReason ?? "null" : "none";
  return `${T.dtwMessageID ?? `${T.messageId}`}|${T.state.type}|${r}|${T.content.length}|${R}:${a}|${e}${t}`;
}
function eIR(T) {
  return Array.isArray(T);
}
function tIR(T) {
  let R = [];
  for (let a of T) {
    if (!eIR(a.content) || a.role !== "assistant") {
      R.push(a);
      continue;
    }
    let e = a.content.filter(t => {
      if (t.type !== "thinking" && t.type !== "redacted_thinking") return !0;
      let r = "provider" in t ? t.provider : void 0;
      return !r || r === "anthropic";
    });
    if (e.length === 0) continue;
    R.push({
      ...a,
      content: e
    });
  }
  return R;
}
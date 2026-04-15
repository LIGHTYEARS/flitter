function rIR(T, R) {
  let a = Ur(R);
  if (T.type === "web_search_tool_result") return a.warn("Ignored web search tool result block"), !1;
  if (T.type === "tool_search_tool_result") return !1;
  return !0;
}
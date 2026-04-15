function zlT(T) {
  return T.type === "tool_use" || T.type === "server_tool_use" || T.type === "mcp_tool_use";
}
function FlT(T) {}
function XlT() {
  let T, R;
  return {
    promise: new Promise((a, e) => {
      T = a, R = e;
    }),
    resolve: T,
    reject: R
  };
}
async function lfR(T, R = T.messages.at(-1)) {
  if (!R || R.role !== "assistant" || !R.content || typeof R.content === "string") return null;
  let a = R.content.filter(e => e.type === "tool_use");
  if (a.length === 0) return null;
  return {
    role: "user",
    content: await Promise.all(a.map(async e => {
      let t = T.tools.find(r => ("name" in r ? r.name : r.mcp_server_name) === e.name);
      if (!t || !("run" in t)) return {
        type: "tool_result",
        tool_use_id: e.id,
        content: `Error: Tool '${e.name}' not found`,
        is_error: !0
      };
      try {
        let r = e.input;
        if ("parse" in t && t.parse) r = t.parse(r);
        let h = await t.run(r);
        return {
          type: "tool_result",
          tool_use_id: e.id,
          content: h
        };
      } catch (r) {
        return {
          type: "tool_result",
          tool_use_id: e.id,
          content: r instanceof b8T ? r.content : `Error: ${r instanceof Error ? r.message : String(r)}`,
          is_error: !0
        };
      }
    }))
  };
}
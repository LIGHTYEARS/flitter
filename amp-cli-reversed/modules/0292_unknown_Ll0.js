function Ll0(T, R, a) {
  let e = [];
  for (let t of T.content) if (t.type === "text") e.push(UKT(t));else if (t.type === "tool_result") e.push(Ol0(t));
  return {
    type: "user",
    message: {
      role: "user",
      content: e
    },
    parent_tool_use_id: a ?? null,
    session_id: R
  };
}
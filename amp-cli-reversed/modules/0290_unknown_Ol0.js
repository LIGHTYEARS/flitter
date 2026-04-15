async function NKT(T, R, a) {
  if (R.length === 0) return;
  try {
    await BKT(T, R, a);
  } catch (e) {
    J.error("Failed to label thread", {
      error: e
    });
  }
}
function UKT(T) {
  return {
    type: "text",
    text: T.text
  };
}
function Sl0(T) {
  return {
    type: "tool_use",
    id: T.id,
    name: T.name,
    input: T.input
  };
}
function Ol0(T) {
  let R = "",
    a = !1;
  switch (T.run.status) {
    case "done":
      R = typeof T.run.result === "string" ? T.run.result : JSON.stringify(T.run.result), a = !1;
      break;
    case "error":
      R = typeof T.run.error === "string" ? T.run.error : T.run.error?.message || "Tool execution error", a = !0;
      break;
    case "cancelled":
      R = `Tool execution cancelled: ${T.run.reason || "Unknown reason"}`, a = !0;
      break;
    case "rejected-by-user":
      R = `Tool execution rejected by user: ${T.run.reason || "User declined permission"}`, a = !0;
      break;
    default:
      R = `Tool status: ${T.run.status}`, a = !1;
  }
  return {
    type: "tool_result",
    tool_use_id: T.toolUseID,
    content: R,
    is_error: a
  };
}
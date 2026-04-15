function B7(T, R) {
  if (T.status === "done") {
    let a = T.result;
    if (R && typeof a === "object" && a !== null) {
      if ("discoveredGuidanceFiles" in a) {
        let {
          discoveredGuidanceFiles: e,
          ...t
        } = a;
        a = t;
      }
    }
    return typeof a === "string" ? a : JSON.stringify(a);
  } else if (T.status === "error") return `<tool_execution_error>${T.error?.message || "Unknown error"}</tool_execution_error>`;else if (T.status === "cancelled") return "<tool_call_cancelled>Tool call was cancelled by the user</tool_call_cancelled>";else if (T.status === "rejected-by-user") return "<tool_rejection>User rejected the tool call, disallowing it from running</tool_rejection>";else return `<tool_status>${T.status}</tool_status>`;
}
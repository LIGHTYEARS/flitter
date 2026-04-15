function SM0(T, R, a) {
  if (typeof T.id === "string" && T.id.length > 0) return T.id;
  return `${R}:progress:${a}`;
}
function OM0(T) {
  if (T.status === "done" && T.result !== void 0) return {
    status: "done",
    result: T.result
  };
  if (T.status === "error") return {
    status: "error",
    error: {
      message: typeof T.error === "string" && T.error.length > 0 ? T.error : "Subagent tool failed"
    }
  };
  return {
    status: T.status
  };
}
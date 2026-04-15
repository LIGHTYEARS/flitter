function $PR(T) {
  if ("command" in T) return {
    type: "command",
    command: T.command,
    args: T.args || [],
    env: ylT(T.env || {})
  };
  return {
    type: "url",
    url: T.url,
    headers: ylT(T.headers || {}),
    transport: T.transport || "http"
  };
}
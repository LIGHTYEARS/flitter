function GWR(T, R) {
  return FWR(["run", ...T], R);
}
function luT() {
  return !0;
}
function AuT(T) {
  return T instanceof Error ? T : Error(String(T));
}
function ZWR(T) {
  switch (T.method) {
    case "event":
      return {
        event: T.event,
        data: T.data,
        span: T.span
      };
    case "configuration.change":
      return {
        config: T.config
      };
    case "tool.call":
    case "tool.result":
    case "agent.start":
    case "agent.end":
      return {
        ...T.event,
        span: T.span
      };
    case "command.list":
    case "tool.list":
    case "events.list":
      return {};
    case "command.execute":
      return {
        name: T.name,
        threadID: T.threadID
      };
    case "tool.execute":
      return {
        name: T.name,
        input: T.input
      };
  }
}
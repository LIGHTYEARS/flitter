function ONT(T) {
  return T.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
function P7(T) {
  return T !== void 0 && "function" in T && T.function !== void 0;
}
function a3T(T) {
  return T?.$brand === "auto-parseable-response-format";
}
function jO(T) {
  return T?.$brand === "auto-parseable-tool";
}
function nCR(T, R) {
  if (!R || !dNT(R)) return {
    ...T,
    choices: T.choices.map(a => {
      return ENT(a.message.tool_calls), {
        ...a,
        message: {
          ...a.message,
          parsed: null,
          ...(a.message.tool_calls ? {
            tool_calls: a.message.tool_calls
          } : void 0)
        }
      };
    })
  };
  return e3T(T, R);
}
function JWR(T) {
  return T.replace(/^#!.*\n/, "");
}
function TqR() {
  return JWR(UWR);
}
function h_(T) {
  let R = typeof T === "string" ? T : T.toString(),
    a = R.startsWith("file://") ? R.slice(7) : R;
  return cWR(a, H5T(a));
}
function eqR(T) {
  return zR.parse(`internal://plugin/${T}.ts`);
}
function puT(T) {
  let R = {
    uri: T.uri,
    process: null,
    status: "loading",
    registeredEvents: new Set(),
    registeredCommands: new Map(),
    registeredTools: new Map(),
    startedSessionStartThreadIDs: new Set()
  };
  return R.process = T.createProcess({
    onRequest: T.onRequest,
    onEvent: T.onEvent,
    onStateChange: T.onStateChange
  }), R;
}
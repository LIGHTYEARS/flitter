function cY(T) {
  let R = {};
  if (T.default && typeof T.default === "object") for (let [a, e] of Object.entries(T.default)) R[a] = {
    ...e,
    _target: "default"
  };else if (T.default !== void 0) J.warn("Expected object for mcpServers default", {
    value: T.default
  });
  if (T.global && typeof T.global === "object") for (let [a, e] of Object.entries(T.global)) R[a] = {
    ...e,
    _target: "global"
  };else if (T.global !== void 0) J.warn("Expected object for mcpServers global", {
    value: T.global
  });
  if (T.workspace && typeof T.workspace === "object") for (let [a, e] of Object.entries(T.workspace)) R[a] = {
    ...e,
    _target: "workspace"
  };else if (T.workspace !== void 0) J.warn("Expected object for mcpServers workspace", {
    value: T.workspace
  });
  if (T.override && typeof T.override === "object") for (let [a, e] of Object.entries(T.override)) R[a] = {
    ...e
  };else if (T.override !== void 0) J.warn("Expected object for mcpServers override", {
    value: T.override
  });
  return Object.keys(R).length > 0 ? R : void 0;
}
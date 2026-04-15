function dNT(T) {
  if (a3T(T.response_format)) return !0;
  return T.tools?.some(R => jO(R) || R.type === "function" && R.function.strict === !0) ?? !1;
}
function ENT(T) {
  for (let R of T || []) if (R.type !== "function") throw new Y0(`Currently only \`function\` tool calls are supported; Received \`${R.type}\``);
}
function _CR(T) {
  for (let R of T ?? []) {
    if (R.type !== "function") throw new Y0(`Currently only \`function\` tool types support auto-parsing; Received \`${R.type}\``);
    if (R.function.strict !== !0) throw new Y0(`The \`${R.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
  }
}
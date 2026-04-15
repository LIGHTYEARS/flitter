function X4R(T) {
  return ev(T).endsWith("mode has been disabled by your workspace admin.");
}
function jUT(T, R) {
  if (T === "baseten") {
    if (R === "none") return {};
    return {
      chat_template_args: {
        enable_thinking: !0
      }
    };
  }
  return {
    reasoning_effort: R
  };
}
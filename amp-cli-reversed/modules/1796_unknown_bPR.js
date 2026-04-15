function z$(T, R) {
  return T.replace(/\$\{([^}]+)\}/g, (a, e) => {
    let t = R[e];
    if (t === void 0) return a;
    return t;
  });
}
function _PR(T) {
  let {
    AMP_API_KEY: R,
    ...a
  } = T;
  return a;
}
function bPR(T) {
  return T.map(R => {
    if (R.type === "text") {
      let a = Mb.bufferByteLengthCompat(R.text);
      if (a > ML) {
        let e = Mb.utf8Clamp(R.text, ML),
          t = Math.round(a / 1024);
        return {
          type: "text",
          text: `${e}

... [Tool result truncated - showing first ${Math.round(ML / 1024)}KB of ${t}KB total. The tool result was too long and has been shortened. Consider using more specific queries or parameters to get focused results.]`
        };
      }
    }
    if (R.type === "image") {
      let a = uPR(R.data);
      if (a) return {
        type: "text",
        text: `[MCP image error: ${a}]`
      };
    }
    return R;
  });
}
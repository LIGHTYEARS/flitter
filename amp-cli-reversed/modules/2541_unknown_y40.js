function y40(T) {
  try {
    let R = T instanceof Uint8Array ? T : new Uint8Array(T),
      a = new TextDecoder().decode(R);
    return {
      contentLength: T.length,
      contentPreview: a.slice(0, 128)
    };
  } catch {
    let R = T instanceof Uint8Array ? T : new Uint8Array(T),
      a = Array.from(R.slice(0, 64)).map(e => {
        if (e >= 32 && e <= 126) return String.fromCharCode(e);
        return `\\x${e.toString(16).padStart(2, "0")}`;
      }).join("");
    return {
      contentLength: T.length,
      contentPreview: `${a}${T.length > 64 ? "..." : ""}`
    };
  }
}
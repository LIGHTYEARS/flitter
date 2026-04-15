function SuT(T) {
  let R = String(T),
    a = iw(T),
    e = R.match(/\{[\s\S]*"type"\s*:\s*"error"[\s\S]*\}/);
  if (e) try {
    let t = JSON.parse(e[0]),
      r = iw(t);
    if (typeof t === "object" && t !== null && "error" in t && typeof t.error === "object" && t.error !== null) return {
      message: R,
      status: r ?? a,
      error: {
        type: "type" in t.error && typeof t.error.type === "string" ? t.error.type : void 0,
        message: "message" in t.error && typeof t.error.message === "string" ? t.error.message : void 0
      }
    };
    return {
      message: R,
      status: r ?? a
    };
  } catch {}
  return {
    message: R,
    status: a
  };
}
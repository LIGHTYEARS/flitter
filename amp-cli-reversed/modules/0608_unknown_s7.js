function s7(T, R = "5m") {
  if (!Array.isArray(T)) return T;
  if (T.length === 0) return T;
  return Lt(T, a => {
    for (let e = a.length - 1; e >= 0; e--) {
      let t = a[e];
      if (t.type === "text" && t.text.trim() !== "" || t.type === "image" || t.type === "tool_result") {
        t.cache_control = {
          type: "ephemeral",
          ttl: R
        };
        return;
      }
    }
  });
}
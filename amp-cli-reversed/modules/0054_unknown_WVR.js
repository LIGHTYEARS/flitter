function WVR(T) {
  try {
    return JSON.parse(T);
  } catch (R) {
    let a = T.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (a) try {
      return JSON.parse(a[1] ?? "");
    } catch (r) {}
    let e = T.indexOf("{"),
      t = T.lastIndexOf("}");
    if (e !== -1 && t !== -1 && t > e) {
      let r = T.substring(e, t + 1);
      try {
        return JSON.parse(r);
      } catch (h) {}
    }
    throw J.error("Failed to parse JSON from thread extraction result", {
      error: R,
      text: T
    }), R;
  }
}
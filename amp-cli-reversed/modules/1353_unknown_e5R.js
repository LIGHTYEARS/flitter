function e5R(T) {
  try {
    return JSON.parse(T);
  } catch (R) {
    let a = T.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (a) try {
      return JSON.parse(a[1] ?? "");
    } catch {}
    let e = T.indexOf("{"),
      t = T.lastIndexOf("}");
    if (e !== -1 && t !== -1 && t > e) try {
      return JSON.parse(T.substring(e, t + 1));
    } catch {}
    throw R;
  }
}
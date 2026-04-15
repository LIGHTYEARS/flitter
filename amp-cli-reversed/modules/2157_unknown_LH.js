function LH(T) {
  if (!T || typeof T !== "object" || !("type" in T)) return T;
  let R = T;
  if (R.type === "snapshot" && "value" in R) return R.value;
  if (R.type === "delta" && Array.isArray(R.blocks)) {
    let a = R.blocks.find(e => e.type === "text");
    if (a && typeof a.text === "string") try {
      return JSON.parse(a.text);
    } catch {
      return a.text;
    }
    return;
  }
  return T;
}
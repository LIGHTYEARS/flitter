function aa(T) {
  if (T.status !== "error" || !T.error) return;
  if (typeof T.error === "object" && "message" in T.error) {
    let R = T.error.message;
    if (typeof R === "string" && R.trim()) return R;
  }
  return String(T.error);
}
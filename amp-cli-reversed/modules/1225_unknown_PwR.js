function PwR(T) {
  let R = T.trim().replace(/\.git$/i, "");
  try {
    let a = new URL(R),
      e = a.pathname.replace(/^\/+/, "");
    return e.length > 0 ? e : a.host;
  } catch {
    return R;
  }
}
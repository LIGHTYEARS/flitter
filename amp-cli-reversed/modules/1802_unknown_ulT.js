function ulT(T) {
  try {
    let R = new URL(T);
    if (R.hash = "", R.protocol === "http:" && R.port === "80" || R.protocol === "https:" && R.port === "443") R.port = "";
    let a = `${R.protocol}//${R.host}${R.pathname}`;
    if (a.endsWith("/") && R.pathname !== "/") a = a.slice(0, -1);
    return a;
  } catch {
    return T;
  }
}
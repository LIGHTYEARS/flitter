function ZCR(T) {
  if (T === void 0 || T === null) return "done";
  if (typeof T === "string") return T.length > 200 ? T.slice(0, 200) + "..." : T;
  if (typeof T === "object") {
    let R = T;
    if ("exitCode" in R) {
      let e = typeof R.output === "string" ? R.output : "",
        t = e.length > 200 ? e.slice(0, 200) + "..." : e;
      return t ? `exit ${R.exitCode}: ${t}` : `exit ${R.exitCode}`;
    }
    let a = JSON.stringify(T);
    return a.length > 200 ? a.slice(0, 200) + "..." : a;
  }
  return String(T);
}
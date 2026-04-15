function OzR(T) {
  return /(^|[^|])\|([^|]|$)/.test(T);
}
function xzT(T, R) {
  return Promise.race([T, new Promise((a, e) => setTimeout(() => e(Error("Git operation timed out")), R))]);
}
function qU(T) {
  if (R4.has(T)) return R4.get(T);
  try {
    let R = EzR("git", ["rev-parse", "--show-toplevel"], {
      cwd: T,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return R4.set(T, R), R;
  } catch {
    R4.set(T, void 0);
    return;
  }
}
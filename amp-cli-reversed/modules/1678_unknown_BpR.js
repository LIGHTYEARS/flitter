function hcT(T) {
  t9T(T), js.delete(T);
}
function wpR(T) {
  js.add(T);
}
function BpR(T) {
  let R = {
    ...T,
    detached: !0,
    env: {
      ...process.env,
      ...(T?.env || {}),
      NONINTERACTIVE: "1",
      DEBIAN_FRONTEND: "noninteractive"
    }
  };
  if (!R.stdio) R.stdio = ["pipe", "pipe", "pipe"];
  return R;
}
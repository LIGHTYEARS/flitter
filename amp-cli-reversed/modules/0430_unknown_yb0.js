function rxT(T) {
  return T.replace(/\\/g, "/");
}
function LVT() {
  return "which amp";
}
async function yb0(T, R) {
  let a = await CVT(),
    [e] = a;
  if (!e) return {
    status: "missing",
    warning: "[WARN] amp not accessible via PATH"
  };
  if (rxT(e) === rxT(R)) return {
    status: "same"
  };
  let t = `[WARN] Found amp at ${yA(e)} in PATH, but expected version ${T} from ${yA(R)}. Another version may be installed.`;
  if (a.length > 0) {
    t += `
[WARN] Found amp executables at these locations:`;
    for (let r of a) t += `
  ${yA(r)}`;
  }
  return t += `
[WARN] To resolve this, ensure the correct amp is at the front of your PATH.`, t += `
[WARN] Run "${LVT()}" in your shell to see which amp executable is currently being used.`, {
    status: "different",
    warning: t
  };
}
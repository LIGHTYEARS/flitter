function nuT(T) {
  return JSON.stringify(T) + `
`;
}
function NWR(T) {
  let R = T.trim();
  if (!R) return null;
  try {
    return JSON.parse(R);
  } catch {
    return null;
  }
}
function qWR() {
  if (zWR()) return {
    command: process.execPath,
    env: {
      BUN_BE_BUN: "1"
    }
  };
  try {
    let T = HWR("which bun", {
      encoding: "utf-8"
    }).trim();
    if (T) return {
      command: T,
      env: {}
    };
  } catch {}
  return null;
}
function im0(T, R) {
  for (let a = 0; a < T.length; a++) {
    if (T[a] < R[a]) return -1;
    if (T[a] > R[a]) return 1;
  }
  return 0;
}
function cm0(T, R) {
  return im0(T, R) < 0;
}
async function sm0(T, R = 300000) {
  J.info("Running bun upgrade", {
    bunPath: T
  });
  let {
    reason: a,
    output: e
  } = await fb(T, ["upgrade"], R);
  if (a === "success") {
    J.info("Bun upgrade completed successfully");
    return;
  }
  throw J.error("Failed to upgrade Bun", {
    reason: a,
    output: e
  }), Error(`Failed to upgrade Bun: ${a}`);
}
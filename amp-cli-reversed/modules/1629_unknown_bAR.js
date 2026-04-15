function bAR(T) {
  if (!T) return;
  try {
    let R = JSON.parse(T),
      a = R.resourceJSON?.external;
    if (a) return d0(zR.parse(a));
    if (R.resourceJSON?.scheme === "file" && R.resourceJSON.path) return d0(zR.file(R.resourceJSON.path));
  } catch (R) {
    J.debug("Failed to parse VS Code editor URI", {
      error: R instanceof Error ? R.message : String(R)
    });
  }
  return;
}
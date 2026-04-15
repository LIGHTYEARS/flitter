function AE0(T) {
  return 1 - (1 - T) ** 3;
}
function IE0(T) {
  let R = T.trim().replace(/^["']|["']$/g, "");
  if (R = R.replace(/\\(.)/g, "$1"), R = R.replace(/u\{([0-9a-fA-F]+)\}/g, (a, e) => String.fromCodePoint(parseInt(e, 16))), !/\.(png|jpe?g|gif|webp)$/i.test(R)) return null;
  if (!rB.isAbsolute(R)) return null;
  return J.debug("Extracted image path", {
    original: T,
    extracted: R
  }), R;
}
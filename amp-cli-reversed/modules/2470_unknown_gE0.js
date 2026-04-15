function gE0(T) {
  let R = T.trim().replace(/^["']|["']$/g, ""),
    a = R.split(`
`).filter(Boolean);
  if (a.length === 1) a = R.split(/(?<=\.(?:png|jpe?g|gif|webp))\s+(?=["']?\/)/i);
  return a.map(e => IE0(e)).filter(e => e !== null);
}
function pF(T) {
  if (T = T.replace(/\/$/, ""), !T.startsWith("http://") && !T.startsWith("https://")) T = `https://${T}`;
  try {
    return new URL(T), T;
  } catch {
    return J.warn(`Invalid registry URL: ${T}, falling back to npmjs.org`), "https://registry.npmjs.org";
  }
}
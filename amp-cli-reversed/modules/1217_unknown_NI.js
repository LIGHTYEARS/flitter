async function NI(T) {
  let R = new TextEncoder().encode(T),
    a = await crypto.subtle.digest("SHA-256", R);
  return Array.from(new Uint8Array(a)).map(e => e.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
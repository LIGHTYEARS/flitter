function Cy(T) {
  return T?.trim().toLowerCase() || "unknown";
}
function $HR(T) {
  let R = Cy(T),
    [a] = R.split(/[._-]/);
  return a || "unknown";
}
async function vHR(T) {
  let R = new TextEncoder().encode(T),
    a = await crypto.subtle.digest("SHA-256", R);
  return Array.from(new Uint8Array(a)).map(e => e.toString(16).padStart(2, "0")).join("");
}
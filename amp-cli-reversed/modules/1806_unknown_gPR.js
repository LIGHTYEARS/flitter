async function gPR(T) {
  let R = $PR(T),
    a = JSON.stringify(R);
  if (typeof globalThis.crypto < "u" && globalThis.crypto.subtle) {
    let t = new TextEncoder().encode(a),
      r = await globalThis.crypto.subtle.digest("SHA-256", t);
    return Array.from(new Uint8Array(r)).map(h => h.toString(16).padStart(2, "0")).join("");
  }
  let {
    createHash: e
  } = await import("crypto");
  return e("sha256").update(a).digest("hex");
}
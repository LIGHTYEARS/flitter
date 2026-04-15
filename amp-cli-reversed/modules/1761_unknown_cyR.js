async function iyR(T) {
  return await hyR(T);
}
async function cyR(T) {
  let R = await (await w9T).subtle.digest("SHA-256", new TextEncoder().encode(T));
  return btoa(String.fromCharCode(...new Uint8Array(R))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}
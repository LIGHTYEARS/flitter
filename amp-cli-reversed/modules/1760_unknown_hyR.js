async function ryR(T) {
  return (await w9T).getRandomValues(new Uint8Array(T));
}
async function hyR(T) {
  let R = Math.pow(2, 8) - Math.pow(2, 8) % 66,
    a = "";
  while (a.length < T) {
    let e = await ryR(T - a.length);
    for (let t of e) if (t < R) a += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"[t % 66];
  }
  return a;
}
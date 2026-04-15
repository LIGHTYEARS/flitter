function HeT(T) {
  let R = T.replace(/-/g, "");
  if (R.length !== 32) throw Error(`Invalid UUID hex length: ${R.length}`);
  let a = BigInt("0x" + R),
    e = "";
  while (a > 0n) e = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Number(a % 62n)] + e, a = a / 62n;
  return e.padStart(22, "0");
}
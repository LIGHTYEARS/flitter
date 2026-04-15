function am0(T) {
  if (!T) return null;
  let R = T.match(/sha256-([A-Za-z0-9+/=]+)/);
  if (R?.[1]) {
    let e = R[1];
    return {
      algorithm: "sha256",
      hash: Buffer.from(e, "base64").toString("hex")
    };
  }
  let a = T.match(/sha512-([A-Za-z0-9+/=]+)/);
  if (a?.[1]) {
    let e = a[1];
    return {
      algorithm: "sha512",
      hash: Buffer.from(e, "base64").toString("hex")
    };
  }
  return null;
}
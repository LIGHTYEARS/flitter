function p6T(T, R) {
  let a = {},
    e = H(T, ["mimeType"]);
  if (R !== void 0 && e != null) Y(R, ["mimeType"], e);
  let t = H(T, ["displayName"]);
  if (R !== void 0 && t != null) Y(R, ["displayName"], t);
  let r = H(T, ["customMetadata"]);
  if (R !== void 0 && r != null) {
    let i = r;
    if (Array.isArray(i)) i = i.map(c => {
      return c;
    });
    Y(R, ["customMetadata"], i);
  }
  let h = H(T, ["chunkingConfig"]);
  if (R !== void 0 && h != null) Y(R, ["chunkingConfig"], h);
  return a;
}
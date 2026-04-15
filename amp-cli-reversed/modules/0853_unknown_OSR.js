function OSR(T, R) {
  let a = {},
    e = H(T, ["aspectRatio"]);
  if (e != null) Y(a, ["aspectRatio"], e);
  let t = H(T, ["imageSize"]);
  if (t != null) Y(a, ["imageSize"], t);
  let r = H(T, ["personGeneration"]);
  if (r != null) Y(a, ["personGeneration"], r);
  let h = H(T, ["outputMimeType"]);
  if (h != null) Y(a, ["imageOutputOptions", "mimeType"], h);
  let i = H(T, ["outputCompressionQuality"]);
  if (i != null) Y(a, ["imageOutputOptions", "compressionQuality"], i);
  return a;
}
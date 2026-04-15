function Xl0(T, R) {
  let a = 0;
  return T.map(e => {
    if (e.type === "text") return {
      type: "text",
      text: e.text
    };
    if (a++, a > pb) throw new GR(`Too many images on stdin line ${R}: ${a} (max ${pb})`, 1);
    let t = e.source_path ?? `stream-json://stdin/line-${R}/image-${a}`,
      r = Buffer.from(e.source.data, "base64"),
      h = x9T(r);
    if (!h) throw new GR(`Invalid image on stdin line ${R}: could not decode image bytes`, 1);
    if (h !== e.source.media_type) throw new GR(`Invalid image on stdin line ${R}: declared media type ${e.source.media_type} does not match detected type ${h}`, 1);
    let i = XA({
      source: {
        type: "base64",
        data: e.source.data
      }
    });
    if (i) throw new GR(`Invalid image on stdin line ${R}: ${i}`, 1);
    return {
      type: "image",
      sourcePath: t,
      source: {
        type: "base64",
        mediaType: e.source.media_type,
        data: e.source.data
      }
    };
  });
}
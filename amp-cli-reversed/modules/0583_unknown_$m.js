function $m(T) {
  let R = T.files,
    a = [];
  if (R.length > 0) {
    let e = `# Attached Files

${R.map(({
      content: t,
      isImage: r,
      imageInfo: h,
      uri: i
    }) => {
      if (r && h) return bAT(i, `This is an image file (${h.mimeType}, ${Math.round(h.size / 1024)} KB)
Image files are handled as attachments and displayed in the UI.`);
      let c = t.split(`
`),
        s = (c[c.length - 1] === "" ? c.slice(0, -1) : c).map((A, l) => `${l + 1}: ${A}`).join(`
`);
      return bAT(i, s);
    }).join(`
`)}

`;
    a.push(e);
  }
  return a.join("");
}
function r8T(T, R = !1) {
  if (!R) return T.text;
  return T.text.replace(/^(#{1,5}) /gm, "#$1 ");
}
function uxR(T) {
  if (T.source.type === "url") return `![Image](${T.source.url})`;
  return `![Image](data:${T.source.mediaType};base64,${T.source.data.slice(0, 50)}...)`;
}
function yxR(T) {
  let R = [];
  for (let a of T.files) R.push(PxR(a));
  return `<attached_files>
${R.join(`
`)}
</attached_files>`;
}
function PxR(T) {
  if (T.isImage && T.imageInfo) return `\`\`\`${T.uri}
This is an image file (${T.imageInfo.mimeType}, ${Math.round(T.imageInfo.size / 1024)} KB)
\`\`\``;
  let R = T.content.split(`
`),
    a = R[R.length - 1] === "" ? R.slice(0, -1) : R;
  if (a.length <= Gq) {
    let r = a.map((h, i) => `${i + 1}: ${h}`).join(`
`);
    return `\`\`\`${T.uri}
${r}
\`\`\``;
  }
  let e = a.slice(0, Gq).map((r, h) => `${h + 1}: ${r}`).join(`
`),
    t = a.length - Gq;
  return `\`\`\`${T.uri}
${e}
... (${t} more lines)
\`\`\``;
}
async function UkT(T, R, a, e, t = Qx) {
  let r = e !== void 0 ? [`--unified=${e}`] : [];
  if (a) return qP(T, [...SM, ...r, "HEAD", "--", R], {
    maxBufferBytes: t
  });
  let [h, i] = await Promise.all([qP(T, [...SM, ...r, "--cached", "--", R], {
    maxBufferBytes: t
  }).catch(() => ""), qP(T, [...SM, ...r, "--", R], {
    maxBufferBytes: t
  }).catch(() => "")]);
  return [jw(h), jw(i)].filter(Boolean).join(`
`);
}
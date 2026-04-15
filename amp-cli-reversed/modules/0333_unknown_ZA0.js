function ZA0(T, R) {
  let a = {
      ...T,
      aheadCommits: [...T.aheadCommits],
      files: T.files.map(h => ({
        ...h
      }))
    },
    e = sy(a);
  if (e.messageSizeBytes <= R) return e.contentBase64;
  let t = a.files.map((h, i) => ({
    index: i,
    weight: VA0(h)
  })).filter(h => h.weight > 0).sort((h, i) => i.weight - h.weight);
  for (let {
    index: h
  } of t) {
    let i = a.files[h];
    if (!i || !XA0(i)) continue;
    if (e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  for (let {
    index: h
  } of t) {
    let i = a.files[h];
    if (!i || !YA0(i)) continue;
    if (e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  let r = a.files.map((h, i) => ({
    index: i,
    weight: h.diff.length + (h.fullFileDiff?.length ?? 0)
  })).filter(h => h.weight > 0).sort((h, i) => i.weight - h.weight);
  for (let {
    index: h
  } of r) {
    let i = a.files[h];
    if (!i || !QA0(i)) continue;
    if (e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  if (a.aheadCommits.length > 0) {
    if (a.aheadCommits = [], e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  }
  while (a.files.length > 0) if (a.files.pop(), e = sy(a), e.messageSizeBytes <= R) return e.contentBase64;
  return e.contentBase64;
}
function KW0(T) {
  if (T.status !== "done" || !Array.isArray(T.result)) return;
  let R = [];
  for (let a of T.result) {
    let e = a.title?.trim(),
      t = a.url?.trim(),
      r = "excerpts" in a ? a.excerpts : void 0;
    if (e) R.push(`- ${e}`);
    if (t) R.push(`  ${t}`);
    if (r && r.length > 0) {
      let h = r[0]?.trim();
      if (h) R.push(`  ${h}`);
    }
  }
  return ihT(R);
}
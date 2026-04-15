function jIT(T) {
  let R = [];
  for (let a of Object.values(T)) {
    if (a.status !== "done") continue;
    for (let e of a.result.issues) R.push({
      filename: e.file,
      startLine: e.line ?? 0,
      endLine: e.endLine ?? e.line ?? 0,
      text: e.problem,
      severity: e.severity,
      source: e.source ?? e.check,
      why: e.why,
      fix: e.fix
    });
  }
  return R;
}
async function JQT(T) {
  let R = zR.parse(T).fsPath;
  try {
    return await VO0(R, XO0.F_OK), !0;
  } catch {
    return !1;
  }
}
async function TE0(T, R) {
  let a = ZQT(T);
  if (a) {
    if (!(await JQT(a.fileURI))) return `File does not exist:
${zmT(a.openURI)}`;
  }
  let e = R instanceof Error ? R.message : String(R);
  return `Failed to open:
${zmT(T)}

${e}`;
}
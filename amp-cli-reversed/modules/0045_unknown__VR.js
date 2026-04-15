async function QuT(T, R) {
  return new rFT(R).fromFile(T, R);
}
function _VR(T) {
  let R = [],
    a = T.threadEnvironment.platform;
  if (a?.os) {
    let t = a.osVersion ? `${a.os} (${a.osVersion})` : a.os;
    R.push(`Operating system: ${t}`);
  }
  if (T.dir) R.push(`Working directory: ${T.dir.fsPath}`);
  let e = T.threadEnvironment.trees?.[0];
  if (e?.repository?.url) R.push(`Repository: ${e.repository.url}`);
  if (R.length === 0) return "";
  return `
# Environment

${R.join(`
`)}
`;
}
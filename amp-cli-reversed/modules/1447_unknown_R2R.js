function T2R(T, R) {
  let a = CzT(T);
  return UFR(a, CO, R);
}
function CzT(T) {
  return EzT(T);
}
async function LzT(T, R, a) {
  await ZFR(T, {
    key: R,
    dataType: JFR,
    content: `${JSON.stringify(a, null, 2)}
`
  });
}
function R2R(T) {
  let R = T.baseRevision.trim(),
    a = T.focus?.trim(),
    e = `Create a code tour for changes from base revision ${R} to the current working changes.`;
  if (a) e += `

Focus areas:
${a}`;
  return e += `

First call eval_git_diff with a bash command that computes this diff (for example: git diff --no-color ${R}).`, e += " After retrieving the raw diff, inspect relevant files and then use post_explanation to emit the walkthrough in ordered sections. Start each section with a short sentence that states what the new code does, then use concise bullets. If relevant, explain what the old code did before. When one explanation references multiple non-contiguous line ranges, pass them in lineRanges.", e;
}
function L7R(T) {
  return JSON.stringify(T);
}
function D7R(T, R) {
  return {
    ...T,
    description: T.description?.replace(B7R, R)
  };
}
async function w7R(T, R) {
  if (T.name !== oc) return T;
  let a = await R.getSkills(),
    e = k7T(a) ?? "No skills available. Skills can be added to `.agents/skills/` in your workspace.";
  return D7R(T, e);
}
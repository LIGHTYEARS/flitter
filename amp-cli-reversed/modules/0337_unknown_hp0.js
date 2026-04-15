async function Qo(T, R) {
  try {
    return await qP(T, R);
  } catch {
    return null;
  }
}
function hp0(T) {
  if (T === "??") return "untracked";
  let R = T[0] ?? " ",
    a = T[1] ?? " ";
  if (R === "U" || a === "U" || T === "AA" || T === "DD") return "unmerged";
  if (R === "R" || a === "R") return "renamed";
  if (R === "C" || a === "C") return "copied";
  if (R === "A" || a === "A") return "added";
  if (R === "D" || a === "D") return "deleted";
  if (R === "T" || a === "T") return "type_changed";
  return "modified";
}
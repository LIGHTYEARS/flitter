async function YzR(T) {
  try {
    let R = await azR(T);
    return await RzR(R), R;
  } catch (R) {
    let a = R instanceof Error && "code" in R ? R.code : void 0;
    if (a === "ENOENT") throw Error(`Directory does not exist: ${T}`);
    if (a === "EACCES") throw Error(`Permission denied accessing directory: ${T}`);
    throw Error(`Cannot access directory ${T}: ${R instanceof Error ? R.message : String(R)}`);
  }
}
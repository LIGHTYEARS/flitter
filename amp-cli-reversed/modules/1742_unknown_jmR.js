function rG(T) {
  return `Invalid tool name ${JSON.stringify(T)}. Tool names must match the pattern ${IN.toString()}. Try again with a valid tool name.`;
}
function jmR(T, R, a) {
  if ((T === ke || T === Wt) && typeof R === "object" && R !== null && "path" in R && typeof R.path === "string") return [R.path];
  if (T === sk && typeof R === "object" && R !== null && "patchText" in R && typeof R.patchText === "string") try {
    return XS(R.patchText).hunks.flatMap(e => {
      if (e.type === "update" && e.movePath) return [e.path, e.movePath];
      return [e.path];
    }).map(e => joT.isAbsolute(e) ? e : joT.resolve(a, e));
  } catch {
    return [];
  }
  return [];
}
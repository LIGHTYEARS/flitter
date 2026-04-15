function Er(T) {
  return T instanceof ur || T instanceof Error && T.name === "FileNotExistError" || typeof T === "object" && T !== null && "code" in T && typeof T.code === "string" && ["ENOENT", "FileNotFound"].includes(T.code);
}
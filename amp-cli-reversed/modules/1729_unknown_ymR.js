function umR(T) {
  return typeof T === "object" && T !== null && "base" in T && "pattern" in T && typeof T.pattern === "string";
}
function ymR(T) {
  return {
    ...T,
    writeFile: () => Promise.reject(Error("Write operations not implemented")),
    delete: () => Promise.reject(Error("Write operations not implemented")),
    mkdirp: () => Promise.reject(Error("Write operations not implemented")),
    rename: () => Promise.reject(Error("Write operations not implemented")),
    isExclusiveWriterFor: () => Promise.resolve(!1)
  };
}
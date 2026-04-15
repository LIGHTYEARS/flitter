function RVT(T, R) {
  if (T instanceof U_) return {
    code: T.code,
    message: T.message
  };
  if (Er(T)) return {
    code: "NOT_FOUND",
    message: "File or directory not found"
  };
  if (E4(T, "EISDIR")) return {
    code: "IS_DIRECTORY",
    message: "Expected a file but found a directory"
  };
  if (E4(T, "ENOTDIR")) return {
    code: R === "read_directory" ? "NOT_DIRECTORY" : "INTERNAL_ERROR",
    message: R === "read_directory" ? "Expected a directory" : DkT(T)
  };
  if (E4(T, "EACCES") || E4(T, "EPERM")) return {
    code: "ACCESS_DENIED",
    message: "Permission denied"
  };
  return {
    code: "INTERNAL_ERROR",
    message: DkT(T)
  };
}
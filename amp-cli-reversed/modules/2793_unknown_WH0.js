function WH0(T) {
  if (T.indexOf("\\") !== -1) return "invalid characters in fileName: " + T;
  if (/^[a-zA-Z]:/.test(T) || /^\//.test(T)) return "absolute path: " + T;
  if (T.split("/").indexOf("..") !== -1) return "invalid relative path: " + T;
  return null;
}
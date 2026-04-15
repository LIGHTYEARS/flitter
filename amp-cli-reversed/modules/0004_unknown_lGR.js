function LaT(T) {
  if (!T || T === "." || T === "/") return "";
  let R = T.replace(/^\/+|\/+$/g, "");
  if (!R) return "";
  return R.split("/").map(a => encodeURIComponent(a)).join("/");
}
function lGR(T) {
  switch (T) {
    case "ADD":
      return "added";
    case "DELETE":
      return "removed";
    case "MOVE":
    case "COPY":
      return "renamed";
    default:
      return "modified";
  }
}
function nhT(T) {
  let R = T.normalizedName ?? T.name;
  return typeof R === "string" && R.length > 0 ? R : z50;
}
function F50(T) {
  switch (T) {
    case "Task":
      return "Subagent";
    case ja:
      return "Search";
    case rN:
      return "List";
    case uc:
      return "Librarian";
    case tt:
      return "Oracle";
    default:
      return T;
  }
}
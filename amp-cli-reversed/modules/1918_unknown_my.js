function A50(T, R) {
  return {
    type: T,
    markerAt: R,
    dashed: T === "dependency" || T === "realization"
  };
}
function my(T, R, a) {
  switch (T) {
    case "inheritance":
    case "realization":
      if (a === "down") return R ? "^" : "\u25B3";else if (a === "up") return R ? "v" : "\u25BD";else if (a === "left") return R ? ">" : "\u25C1";else return R ? "<" : "\u25B7";
    case "composition":
      return R ? "*" : "\u25C6";
    case "aggregation":
      return R ? "o" : "\u25C7";
    case "association":
    case "dependency":
      if (a === "down") return R ? "v" : "\u25BC";else if (a === "up") return R ? "^" : "\u25B2";else if (a === "left") return R ? "<" : "\u25C0";else return R ? ">" : "\u25B6";
  }
}
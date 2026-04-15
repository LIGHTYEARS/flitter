function n50(T) {
  switch (T) {
    case "<|--":
      return {
        type: "inheritance",
        markerAt: "from"
      };
    case "<|..":
      return {
        type: "realization",
        markerAt: "from"
      };
    case "*--":
      return {
        type: "composition",
        markerAt: "from"
      };
    case "--*":
      return {
        type: "composition",
        markerAt: "to"
      };
    case "o--":
      return {
        type: "aggregation",
        markerAt: "from"
      };
    case "--o":
      return {
        type: "aggregation",
        markerAt: "to"
      };
    case "-->":
      return {
        type: "association",
        markerAt: "to"
      };
    case "..>":
      return {
        type: "dependency",
        markerAt: "to"
      };
    case "..|>":
      return {
        type: "realization",
        markerAt: "to"
      };
    case "--":
      return {
        type: "association",
        markerAt: "to"
      };
    default:
      return null;
  }
}
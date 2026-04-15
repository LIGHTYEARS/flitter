function u50(T) {
  return `${T.keys.length > 0 ? T.keys.join(",") + " " : "   "}${T.type} ${T.name}`;
}
function y50(T) {
  let R = [T.label],
    a = T.attributes.map(u50);
  if (a.length === 0) return [R];
  return [R, a];
}
function iL(T, R) {
  if (R) switch (T) {
    case "one":
      return "||";
    case "zero-one":
      return "o|";
    case "many":
      return "}|";
    case "zero-many":
      return "o{";
  } else switch (T) {
    case "one":
      return "\u2551";
    case "zero-one":
      return "o\u2551";
    case "many":
      return "\u255F";
    case "zero-many":
      return "o\u255F";
  }
}
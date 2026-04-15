function zgT(T) {
  let R = T.split("").sort().join("");
  if (R === "||") return "one";
  if (R === "o|") return "zero-one";
  if (R === "|}" || R === "{|") return "many";
  if (R === "{o" || R === "o{") return "zero-many";
  return null;
}
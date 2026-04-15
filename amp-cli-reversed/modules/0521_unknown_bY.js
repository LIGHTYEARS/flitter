function bY(T) {
  return Array.from(T, R => {
    if (R >= 32 && R <= 126 && R !== 92) return String.fromCharCode(R);
    if (R === 92) return "\\\\";
    return `\\x${R.toString(16).padStart(2, "0")}`;
  }).join("");
}
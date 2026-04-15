function XXR() {
  if ("FORCE_COLOR" in ea) {
    if (ea.FORCE_COLOR === "true") return 1;
    if (ea.FORCE_COLOR === "false") return 0;
    return ea.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(ea.FORCE_COLOR, 10), 3);
  }
}
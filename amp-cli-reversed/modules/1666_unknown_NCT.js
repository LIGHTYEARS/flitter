function NCT(T) {
  try {
    let R = Sj.readFileSync(T, "utf-8"),
      a = LCT.safeParse(JSON.parse(R));
    if (a.success) return a.data;else J.debug("Invalid IDE config file", {
      file: T,
      errors: a.error.issues
    });
  } catch (R) {
    J.debug("Unreadable IDE config file", {
      file: T,
      error: R instanceof Error ? R.message : String(R)
    });
  }
  return;
}
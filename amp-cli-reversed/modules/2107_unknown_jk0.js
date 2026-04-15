function jk0() {
  try {
    if (process.stdout.isTTY && process.stdout.columns && process.stdout.rows) return {
      columns: process.stdout.columns,
      rows: process.stdout.rows
    };
    let T = process.stdin;
    if (process.stdin.isTTY && T.columns && T.rows) return {
      columns: T.columns,
      rows: T.rows
    };
    let R = process.stdout;
    if (typeof R.getWindowSize === "function") {
      let a = R.getWindowSize();
      if (a[0] > 0 && a[1] > 0) return {
        columns: a[0],
        rows: a[1]
      };
    }
    return null;
  } catch (T) {
    return null;
  }
}
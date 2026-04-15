async function BC0(T) {
  try {
    let R = T.args.map(a => {
      if (/[\s/\\*?[\]{}()"]/.test(a)) return `"${a}"`;
      return a;
    }).join(" ");
    await wC0(R, T.settings, T.scope), T.exit(0);
  } catch (R) {
    let a = R instanceof Error ? R.message : "Unknown error";
    T.stderr.write(`Error: ${a}
`), T.exit(1);
  }
}
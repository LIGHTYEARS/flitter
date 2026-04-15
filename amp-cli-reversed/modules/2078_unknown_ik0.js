async function ik0(T, R) {
  let a = process.stdin.isTTY,
    e = t => {
      process.stderr.write(`
${t}

`);
    };
  while (!0) {
    let t = (await MXT("When prompted, paste your code here: ", R)).trim();
    J.info("Received terminal auth code input", {
      length: t.length,
      isTTY: process.stdin.isTTY
    });
    try {
      return {
        source: "terminal",
        accessToken: CXT(t, T).accessToken
      };
    } catch (r) {
      let h = r instanceof Error ? r.message : "Invalid login code.";
      if (!a) throw Error(h);
      e(h);
    }
  }
}
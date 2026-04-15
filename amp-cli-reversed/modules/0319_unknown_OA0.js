async function OA0(T, R) {
  let a = await R.get("apiKey", T);
  if (!a) {
    J.error("No API key found. Run `amp login` first."), process.exitCode = 1;
    return;
  }
  let e = [];
  for await (let h of process.stdin) e.push(h);
  let t = Buffer.concat(e).toString("utf-8"),
    r = await SA0(T, a, t);
  if (!r) {
    process.exitCode = 1;
    return;
  }
  process.stdout.write(r), process.stdout.write(`
`), process.stderr.write(`
[GNUPG:] SIG_CREATED 
`);
}
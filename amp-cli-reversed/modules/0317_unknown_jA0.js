async function jA0(T, R, a) {
  if (T !== "get") return;
  let e = await $A0();
  if (e.protocol !== "https" || e.host !== "github.com") return;
  let t = await a.get("apiKey", R);
  if (!t) {
    J.error("No API key found. Run `amp login` first."), process.exitCode = 1;
    return;
  }
  let r = await vA0(R, t);
  if (!r) {
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`protocol=https
host=github.com
username=x-access-token
password=${r}

`);
}
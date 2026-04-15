async function Tm0() {
  let T = process.env.AMP_VERSION;
  if (T) return T;
  let R = fH(),
    a = await btT(`${R}/@sourcegraph%2Famp`);
  if (!a.ok) throw Error("Failed to fetch package metadata from npm registry");
  let e = (await a.json())["dist-tags"]?.latest;
  if (!e) throw Error("Failed to find latest version in npm registry");
  return e;
}
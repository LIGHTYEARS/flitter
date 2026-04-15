async function Rm0(T) {
  let R = fH(),
    a = await btT(`${R}/@sourcegraph%2Famp/${T}`);
  if (!a.ok) throw Error(`Failed to fetch metadata for version ${T}`);
  let e = await a.json(),
    t = e.dist?.tarball,
    r = e.dist?.integrity;
  if (!t) throw Error(`Failed to find tarball URL for version ${T}`);
  return {
    tarballUrl: t,
    integrity: r
  };
}
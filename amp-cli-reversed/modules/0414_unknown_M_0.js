async function M_0(T, R) {
  let a = new Sb(J).scoped("secrets.file.migrate"),
    e = fVT(T);
  if (!O_0.existsSync(e)) return;
  let t = await Ow.readFile(e, "utf-8"),
    r = JSON.parse(t);
  if (Object.keys(r).length === 0) return;
  if (!T.quiet) E_0.write(`Migrating secrets from file storage to native secret storage...
`);
  let h = [];
  for (let [i, c] of Object.entries(r)) if (typeof c === "string") {
    let s = i.match(/^(.+)@(.+)$/);
    if (s) {
      let [, A, l] = s;
      if (A && l) try {
        await R.set(A, c, l), h.push(i), a.debug(`Successfully migrated secret: ${i}`);
      } catch (o) {
        throw QkT.write(`Failed to migrate secret ${i} to native secret storage
`), o;
      }
    }
  }
  if (h.length > 0) try {
    await Ow.rm(e), a.info("Successfully migrated secrets and removed file storage", {
      migratedKeys: h,
      removed: e
    });
  } catch (i) {
    throw QkT.write(`Failed to remove file storage after migration
`), i;
  }
}
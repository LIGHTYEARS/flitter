async function gXT(T) {
  let R = vtT(T.repoRoot, T.relativePath);
  await fP0(R, T.repoRoot);
  try {
    let a = await ly0(R);
    if (Buffer.compare(a, Buffer.from(T.content)) === 0) return "unchanged";
  } catch (a) {
    if (!StT(a) && !qxT(a)) throw a;
    if (qxT(a)) await ftT(R, {
      recursive: !0,
      force: !0
    });
  }
  return await Ay0(R, T.content), "written";
}
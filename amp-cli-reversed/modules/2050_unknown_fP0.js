async function fP0(T, R) {
  let a = yh.relative(R, yh.dirname(T));
  if (a.length === 0) return;
  let e = R;
  for (let t of a.split(yh.sep)) {
    e = yh.join(e, t);
    try {
      if (!(await tXT(e)).isDirectory()) await ftT(e, {
        recursive: !0,
        force: !0
      });
    } catch (r) {
      if (!StT(r)) throw r;
    }
  }
  await ny0(yh.dirname(T), {
    recursive: !0
  });
}
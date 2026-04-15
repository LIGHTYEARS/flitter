function tq0(T) {
  if (!T.oldText || !T.newText) return;
  let R = kx(T.oldText, T.newText),
    a = [];
  if (R.added > 0) a.push(`+${R.added}`);
  if (R.changed > 0) a.push(`~${R.changed}`);
  if (R.deleted > 0) a.push(`-${R.deleted}`);
  return a.length > 0 ? a.join(" ") : void 0;
}
function L3(T, R) {
  if (!process.stdout.writable || process.stdout.destroyed) {
    R?.();
    return;
  }
  let a = `${JSON.stringify(T)}
`;
  try {
    if (R) {
      if (!process.stdout.write(a)) {
        process.stdout.once("drain", R);
        return;
      }
      R();
      return;
    }
    process.stdout.write(a);
  } catch {
    R?.();
  }
}
function hHR(T) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(T)) throw Error(`Invalid compatibility date format "${T}". Expected format: YYYY-MM-DD (e.g., "2024-01-15")`);
  let R = new Date(T + "T00:00:00.000Z");
  if (Number.isNaN(R.getTime())) throw Error(`Invalid compatibility date "${T}". Date could not be parsed.`);
  let a = T.split("-").map(Number),
    [e, t, r] = a;
  if (a.length !== 3 || e === void 0 || t === void 0 || r === void 0) throw Error(`Invalid compatibility date "${T}". Could not parse date components.`);
  if (R.getUTCFullYear() !== e || R.getUTCMonth() !== t - 1 || R.getUTCDate() !== r) throw Error(`Invalid compatibility date "${T}". Date components are invalid.`);
  return R;
}
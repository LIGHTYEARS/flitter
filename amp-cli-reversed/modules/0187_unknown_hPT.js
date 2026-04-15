function hPT(T) {
  return JSON.parse(T, (R, a) => {
    if (Array.isArray(a) && a.length === 2 && typeof a[0] === "string" && a[0].startsWith("$")) {
      if (a[0] === "$BigInt") return BigInt(a[1]);else if (a[0] === "$ArrayBuffer") return C90(a[1]);else if (a[0] === "$Uint8Array") return Y2T(a[1]);
      if (a[0].startsWith("$$")) return [a[0].substring(1), a[1]];
      throw Error(`Unknown JSON encoding type: ${a[0]}. This may indicate corrupted data or a version mismatch.`);
    }
    return a;
  });
}
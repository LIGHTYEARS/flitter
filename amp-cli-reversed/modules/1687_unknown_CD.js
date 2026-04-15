async function CD(T, R, a, e, t, r, h, i) {
  let c = 0;
  for (let s of a) try {
    if (!NpR(s, T, R, e)) {
      c = c + 1;
      continue;
    }
    let A = await UpR(s, R, t, r, T, i);
    if (A.matchIndex = c, h) A.source = h;
    return A;
  } catch (A) {
    return {
      action: null,
      error: A instanceof Error ? A.message : "Unknown error"
    };
  }
  return {
    action: null
  };
}
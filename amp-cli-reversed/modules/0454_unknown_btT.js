async function btT(T, R = 300000) {
  let a = new AbortController(),
    e = setTimeout(() => a.abort(), R);
  try {
    let t = await fetch(T, {
      signal: a.signal
    });
    return clearTimeout(e), t;
  } catch (t) {
    if (clearTimeout(e), t instanceof Error && t.name === "AbortError") throw Error(`Network timeout after ${R}ms while fetching: ${T}`);
    throw t;
  }
}
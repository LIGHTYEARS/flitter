function ZE0(T, R, a = Date.now()) {
  return Math.floor(T) * 73856093 ^ Math.floor(R) * 19349663 ^ a;
}
function JE0(T, R, a = {}) {
  let {
      burstParticleCount: e = 72,
      burstSpeedMin: t = 10,
      burstSpeedRange: r = 16,
      rainSpeedMin: h = 4,
      rainSpeedRange: i = 9,
      burstDelayMax: c = 0.18,
      rainDelayMax: s = 1,
      burstLifetimeMin: A = 1.4,
      burstLifetimeRange: l = 1.2,
      rainLifetimeMin: o = 2.8,
      rainLifetimeRange: n = 1.8,
      burstDriftMin: p = 0.3,
      burstDriftRange: _ = 0.9,
      rainDriftMin: m = 0.8,
      rainDriftRange: b = 1.8,
      rainAngleCenter: y = Math.PI / 2,
      rainAngleSpread: u = 1.4,
      colorIndexCount: P = 6,
      sparkleGlyphs: k = QE0
    } = a,
    x = RC0(T),
    f = [];
  for (let v = 0; v < R; v++) {
    let g = v < e,
      I = g ? x() * Math.PI * 2 : y + (x() - 0.5) * u,
      S = g ? t + x() * r : h + x() * i,
      O = g ? x() * c : x() * s,
      j = g ? A + x() * l : o + x() * n,
      d = g ? p + x() * _ : m + x() * b,
      C = x() * Math.PI * 2,
      L = k[Math.floor(x() * k.length)] ?? "*";
    f.push({
      kind: g ? "burst" : "rain",
      angle: I,
      speed: S,
      delay: O,
      lifetime: j,
      drift: d,
      phase: C,
      glyph: L,
      colorIndex: Math.floor(x() * P)
    });
  }
  return f;
}
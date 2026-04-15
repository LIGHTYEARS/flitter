function TC0(T, R) {
  let {
      elapsedSeconds: a,
      originX: e,
      originY: t,
      unitScale: r = 1
    } = R,
    h = a - T.delay;
  if (h < 0 || h > T.lifetime) return null;
  let i = T.kind === "burst" ? 9 : 12,
    c = T.speed * r,
    s = Math.cos(T.angle) * c,
    A = Math.sin(T.angle) * c,
    l = Math.sin((h + T.phase) * 8) * T.drift * r;
  return {
    x: e + s * h + l,
    y: t + A * h + i * r * h * h,
    progress: h / T.lifetime
  };
}
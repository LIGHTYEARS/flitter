function Oz0({
  version: T,
  buildTimestamp: R,
  buildType: a
}) {
  let e = a === "dev" ? "dev" : "released",
    t = R ? new Date(R) : null,
    r = t && !Number.isNaN(t.getTime()) ? `, ${OO(t)} ago` : "";
  return `${T} (${e}${R ? ` ${R}` : ""}${r})`;
}
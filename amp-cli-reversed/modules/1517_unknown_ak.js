function ak(T) {
  let R = T?.target ?? "draft-2020-12";
  if (R === "draft-4") R = "draft-04";
  if (R === "draft-7") R = "draft-07";
  return {
    processors: T.processors ?? {},
    metadataRegistry: T?.metadata ?? Ph,
    target: R,
    unrepresentable: T?.unrepresentable ?? "throw",
    override: T?.override ?? (() => {}),
    io: T?.io ?? "output",
    counter: 0,
    seen: new Map(),
    cycles: T?.cycles ?? "ref",
    reused: T?.reused ?? "inline",
    external: T?.external ?? void 0
  };
}
function ozT({
  toolService: T,
  providers: R
}) {
  let a = new Map();
  for (let e of R) try {
    let t = e.registerToolsWithToolService(T);
    a.set(e.name, t), J.debug(`Started continuous registration for ${e.name}`);
  } catch (t) {
    J.error(`Failed to start registration for ${e.name}:`, t);
  }
  return a;
}
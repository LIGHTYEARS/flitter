async function pAR(T) {
  let R = await gAR(T, "select key, value from ItemTable where key in ('memento/workbench.parts.editor', 'memento/workbench.editors.files.textFileEditor')");
  if (R.length === 0) return null;
  let a = _AR(R.find(c => c.key === "memento/workbench.parts.editor")?.value);
  if (!a) return null;
  let e = a.leaves.flatMap(c => c.editors),
    t = a.leaves.find(c => c.id === a.activeGroup) ?? a.leaves[0],
    r = t ? mAR(t) : void 0,
    h = uAR(R.find(c => c.key === "memento/workbench.editors.files.textFileEditor")?.value),
    i = r ? await yAR(r, a.activeGroup, h) : void 0;
  return {
    openFile: r,
    openFiles: e,
    selection: i
  };
}
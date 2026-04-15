async function GAR(T, R) {
  let a = (await w0T(T, `select e.item_id, e.buffer_path, s.start, s.end from editors e join items i on e.item_id=i.item_id join panes p on i.pane_id=p.pane_id left join editor_selections s on s.editor_id=e.item_id where e.workspace_id=${R} and i.active=1 order by p.active desc limit 1`))[0];
  if (!a) return null;
  let [e, t = "", r, h] = a.split(q0T),
    i = Number.parseInt(e ?? "", 10);
  if (!t || !Number.isFinite(i)) return null;
  let c = r ? Number.parseInt(r, 10) : null,
    s = h ? Number.parseInt(h, 10) : null;
  return {
    itemId: i,
    bufferPath: t,
    startOffset: Number.isFinite(c) ? c : null,
    endOffset: Number.isFinite(s) ? s : null
  };
}
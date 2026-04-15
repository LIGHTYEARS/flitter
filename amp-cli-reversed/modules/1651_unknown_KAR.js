async function KAR(T, R) {
  return (await w0T(T, `select distinct e.buffer_path from editors e join items i on e.item_id=i.item_id where e.workspace_id=${R} and e.buffer_path!=''`)).filter(Boolean);
}
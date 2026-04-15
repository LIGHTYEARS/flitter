async function kmT(T, R, a, e, t) {
  let r = {
    basePrompt: await NI(T)
  };
  for (let [h, i] of R.entries()) r[`contextBlock_${h}`] = await NI(i.text);
  for (let [h, i] of a.entries()) r[`additionalBlock_${h}`] = await NI(i.text);
  for (let [h, i] of e.entries()) r[`finalBlock_${h}`] = await NI(i.text);
  return r.tools = await NI(JSON.stringify(t.map(h => h.name))), r;
}
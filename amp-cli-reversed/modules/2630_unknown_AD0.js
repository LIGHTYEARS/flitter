function lD0(T) {
  if (!T.draft) return null;
  let R = S0T(T.draft);
  if (!R.text && R.images.length === 0) return null;
  return R;
}
function AD0(T) {
  if (!T || !T.text && T.images.length === 0) return "";
  let R = [];
  if (T.text) R.push({
    type: "text",
    text: T.text
  });
  if (T.images.length > 0) R.push(...T.images);
  return R;
}
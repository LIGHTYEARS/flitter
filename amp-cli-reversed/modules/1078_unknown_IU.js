function IU(T) {
  let R = T.message?.toLowerCase() ?? "",
    a = T.error?.message?.toLowerCase() ?? "";
  return ["stream stalled", "no data received for"].some(e => R.includes(e) || a.includes(e));
}
async function YHR() {
  if (WI !== void 0) return WI;
  try {
    return WI = (await qHR.promisify(CHR)(`${HU} --version`)).stdout.includes("ripgrep"), WI;
  } catch {
    return WI = !1, !1;
  }
}
function ZHR(T, R, a, e) {
  return v3(...T.map(t => JHR(t, R, a, e))).pipe(JR(t => {
    let r = [];
    for (let i of t) if (i.status === "in-progress") r.push(...(i?.progress ?? []));else if (i.status === "done") r.push(...i.result);else if (i.status === "error") r.push(...(i.progress ?? []));else if (i.status === "cancelled") r.push(...(i.progress ?? []));
    let h = t.filter(i => i.status === "error");
    if (h.length > 0) return {
      status: "error",
      progress: r,
      error: {
        message: h.map(i => i?.error?.message ?? "").join(`
`)
      }
    };
    return {
      status: t.every(i => i.status === "done") ? "done" : t.some(i => i.status === "cancelled") ? "cancelled" : "in-progress",
      progress: r,
      result: r
    };
  }));
}
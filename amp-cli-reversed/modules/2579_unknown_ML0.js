function ML0(T) {
  let R = T.spec.inputSchema,
    a = R.properties ?? {},
    e = new Set(R.required ?? []),
    t = Object.entries(a).map(([r, h]) => ({
      name: r,
      type: bQ(h),
      required: e.has(r),
      description: h.description
    })).sort((r, h) => r.name.localeCompare(h.name));
  return {
    name: T.spec.name,
    description: T.spec.description,
    arguments: t
  };
}
function CD0(T, R) {
  if (R === null || R === void 0) return R;
  if (R && typeof R === "object" && "widget" in R && "children" in R) {
    let a = R;
    return {
      _type: "Element",
      widgetType: a.widget?.constructor?.name,
      mounted: a.mounted,
      dirty: a.dirty,
      childCount: a.children?.length ?? 0
    };
  }
  if (R && typeof R === "object" && "_mounted" in R && "_element" in R) {
    let a = R;
    return {
      _type: "State",
      mounted: a._mounted,
      widgetType: a.widget?.constructor?.name
    };
  }
  if (typeof R === "function") return "[Function]";
  return R;
}
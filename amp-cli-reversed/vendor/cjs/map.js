// Module: map
// Original: nO
// Type: CJS (RT wrapper)
// Exports: map
// Category: util

// Module: nO (CJS)
(T) => {
  var R = x8(),
    a = km(),
    e = {
      collection: "map",
      default: !0,
      nodeClass: a.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(t, r) {
        if (!R.isMap(t)) r("Expected a mapping for this tag");
        return t;
      },
      createNode: (t, r, h) => a.YAMLMap.from(t, r, h),
    };
  T.map = e;
};

function yXR(T) {
  try {
    let R = i3(T, "walkthroughPlan");
    if (R) {
      let r = PXR(R);
      if (r) return {
        diagram: r
      };
    }
    let a = T.match(/```json\s*([\s\S]*?)```/i);
    if (a?.[1]) {
      let r = mz(a[1]);
      if (r) {
        let h = JSON.parse(r);
        if (h.diagram?.code && h.diagram?.nodes) return h;
      }
    }
    let e = T.match(/```\s*(\{[\s\S]*?)```/i);
    if (e?.[1]) {
      let r = mz(e[1]);
      if (r) {
        let h = JSON.parse(r);
        if (h.diagram?.code && h.diagram?.nodes) return h;
      }
    }
    let t = T.indexOf('"diagram"');
    if (t !== -1) {
      let r = t;
      while (r > 0 && T[r] !== "{") r--;
      if (T[r] === "{") {
        let h = mz(T.substring(r));
        if (h) {
          let i = JSON.parse(h);
          if (i.diagram?.code && i.diagram?.nodes) return i;
        }
      }
    }
    return null;
  } catch (R) {
    return J.error("Failed to parse walkthrough plan:", R), null;
  }
}
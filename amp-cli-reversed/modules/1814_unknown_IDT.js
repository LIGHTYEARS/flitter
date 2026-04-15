function fDT() {
  let T = "";
  for (let R = 0; R < 5; R++) T += "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 62)];
  return T;
}
function IDT(T, R) {
  return {
    startActiveSpan: async (a, e, t) => {
      let r = fDT();
      T.startTrace({
        name: a,
        label: e.label,
        id: r,
        parent: R,
        startTime: new Date().toISOString(),
        context: e.context ?? {},
        attributes: e.attributes
      });
      let h = {
        id: r,
        addEvent: i => {
          T.recordTraceEvent(r, {
            message: i,
            timestamp: new Date().toISOString()
          });
        },
        setAttributes: i => {
          T.recordTraceAttributes(r, i);
        }
      };
      try {
        return await t(h, IDT(T, r));
      } finally {
        T.endTrace({
          name: a,
          id: r,
          endTime: new Date().toISOString()
        });
      }
    }
  };
}